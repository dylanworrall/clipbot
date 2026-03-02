import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { log } from "../utils/logger.js";
import type { WordTimestamp } from "../types/clip.js";
import { DEFAULT_CAPTION_STYLE, type CaptionStyle } from "../types/captions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execFileAsync = promisify(execFile);

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

/**
 * Slice word-level timestamps to a clip's time range.
 * Uses exact timestamps from YouTube auto-captions (tOffsetMs per word).
 * Returns timings relative to clip start (0 = first frame of clip).
 */
export function sliceWordTimings(
  wordTimestamps: WordTimestamp[],
  clipStartMs: number,
  clipEndMs: number
): WordTiming[] {
  const timings: WordTiming[] = [];

  for (const wt of wordTimestamps) {
    if (wt.endMs <= clipStartMs || wt.startMs >= clipEndMs) continue;

    timings.push({
      word: wt.word,
      startMs: Math.round(Math.max(wt.startMs, clipStartMs) - clipStartMs),
      endMs: Math.round(Math.min(wt.endMs, clipEndMs) - clipStartMs),
    });
  }

  return timings;
}

/**
 * Convert a hex color (#RRGGBB or #RRGGBBAA) to ASS color format (&HAABBGGRR).
 * ASS uses BGR order with alpha at the start.
 */
function hexToASS(hex: string): string {
  // Remove # prefix and handle various formats
  let clean = hex.replace("#", "");

  // Handle rgba() format by converting to a default
  if (hex.startsWith("rgba")) return "&HAA000000";

  let r: string, g: string, b: string, a: string;
  if (clean.length === 8) {
    r = clean.slice(0, 2);
    g = clean.slice(2, 4);
    b = clean.slice(4, 6);
    a = clean.slice(6, 8);
  } else if (clean.length === 6) {
    r = clean.slice(0, 2);
    g = clean.slice(2, 4);
    b = clean.slice(4, 6);
    a = "00";
  } else {
    return "&H00FFFFFF";
  }

  return `&H${a.toUpperCase()}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
}

/**
 * Map caption position to ASS MarginV value.
 */
function positionToMarginV(position: string, height: number): number {
  switch (position) {
    case "top": return Math.round(height * 0.12);
    case "center": return Math.round(height * 0.4);
    case "bottom":
    default: return Math.round(height * 0.22);
  }
}

/**
 * Map caption position to ASS Alignment value.
 * ASS alignment: 1-3 bottom, 4-6 middle, 7-9 top (numpad layout).
 * 2 = bottom-center, 5 = middle-center, 8 = top-center.
 */
function positionToAlignment(position: string): number {
  switch (position) {
    case "top": return 8;
    case "center": return 5;
    case "bottom":
    default: return 2;
  }
}

/**
 * Build the karaoke tag for a word based on animation preset.
 */
function buildKaraokeTag(preset: string, durCs: number): string {
  switch (preset) {
    case "word-pop":
      return `{\\kf${durCs}\\fscx120\\fscy120\\t(0,${durCs * 10},\\fscx100\\fscy100)}`;
    case "typewriter":
      return `{\\k${durCs}}`;
    case "simple-fade":
      return `{\\fad(100,100)\\k${durCs}}`;
    case "karaoke-highlight":
    default:
      return `{\\kf${durCs}}`;
  }
}

/**
 * Generate an ASS subtitle file with styled, highlighted captions and hook text.
 * Now supports full CaptionStyle configuration.
 */
function generateASS(opts: {
  words: WordTiming[];
  hookText?: string;
  hookDuration?: number;
  width: number;
  height: number;
  captionStyle?: CaptionStyle;
}): string {
  const { words, hookText, hookDuration = 3, width, height } = opts;
  const style = opts.captionStyle ?? DEFAULT_CAPTION_STYLE;

  const captionColor = hexToASS(style.inactiveColor);
  const highlightColor = hexToASS(style.activeColor);
  const outlineColor = hexToASS(style.outlineColor);
  const hookColor = hexToASS(style.hookColor);

  const captionMarginV = positionToMarginV(style.position, height);
  const captionAlignment = positionToAlignment(style.position);
  const hookMarginV = positionToMarginV(style.hookPosition, height);
  const hookAlignment = positionToAlignment(style.hookPosition);

  let ass = `[Script Info]
Title: ClipBot Captions
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${style.fontFamily},${style.fontSize},${captionColor},${highlightColor},${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,${captionAlignment},60,60,${captionMarginV},1
Style: CaptionHighlight,${style.fontFamily},${style.fontSize},${highlightColor},${highlightColor},${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,${captionAlignment},60,60,${captionMarginV},1
Style: Hook,${style.fontFamily},${style.hookFontSize},${hookColor},${hookColor},${outlineColor},&HAA000000,-1,0,0,0,100,100,0,0,3,5,3,${hookAlignment},60,60,${hookMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Add hook text (first few seconds)
  if (hookText) {
    const hookEnd = formatASSTime(hookDuration * 1000);
    ass += `Dialogue: 1,0:00:00.00,${hookEnd},Hook,,0,0,0,,{\\fad(300,300)}${escapeASS(hookText)}\n`;
  }

  // Group words into lines
  const wordsPerLine = style.maxWordsPerLine;
  for (let i = 0; i < words.length; i += wordsPerLine) {
    const lineWords = words.slice(i, i + wordsPerLine);
    const lineStart = lineWords[0]!.startMs;
    const lineEnd = lineWords[lineWords.length - 1]!.endMs;

    const startTime = formatASSTime(lineStart);
    const endTime = formatASSTime(lineEnd + 300);

    let lineText = "";
    for (const w of lineWords) {
      const durCs = Math.round((w.endMs - w.startMs) / 10);
      lineText += `${buildKaraokeTag(style.animationPreset, durCs)}${escapeASS(w.word)} `;
    }

    ass += `Dialogue: 0,${startTime},${endTime},Caption,,0,0,0,,${lineText.trim()}\n`;
  }

  return ass;
}

function formatASSTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeASS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

/**
 * Check if the logo file exists in the assets directory
 */
async function findLogo(): Promise<string | null> {
  const logoPath = path.resolve(__dirname, "../../assets/logo.png");
  try {
    await access(logoPath);
    return logoPath;
  } catch {
    return null;
  }
}

/**
 * Burn captions, hook text, and logo watermark onto a video clip using ffmpeg + ASS subtitles.
 * Now accepts optional CaptionStyle for full customization.
 */
export async function renderWithCaptions(opts: {
  inputVideoPath: string;
  outputPath: string;
  words: WordTiming[];
  hookText?: string;
  hookDuration?: number;
  durationInSeconds: number;
  captionStyle?: CaptionStyle;
}): Promise<void> {
  const assContent = generateASS({
    words: opts.words,
    hookText: opts.hookText,
    hookDuration: opts.hookDuration,
    width: 1080,
    height: 1920,
    captionStyle: opts.captionStyle,
  });

  const assPath = opts.outputPath.replace(".mp4", ".ass");
  await writeFile(assPath, assContent, "utf-8");

  log.debug(`Generated ASS subtitles: ${opts.words.length} words`);

  const ffmpegBin = typeof ffmpegPath === "string" ? ffmpegPath : "ffmpeg";
  const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");

  const logoPath = await findLogo();

  let args: string[];

  if (logoPath) {
    const escapedLogoPath = logoPath.replace(/\\/g, "/");
    args = [
      "-i", opts.inputVideoPath,
      "-i", escapedLogoPath,
      "-filter_complex",
      `[1:v]colorkey=0xFFFFFF:0.3:0.15,scale=80:-1,format=rgba,colorchannelmixer=aa=0.6[logo];` +
      `[0:v][logo]overlay=W-w-60:30[bg];` +
      `[bg]ass='${escapedAssPath}'`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "28",
      "-maxrate", "4M",
      "-bufsize", "8M",
      "-c:a", "copy",
      "-movflags", "+faststart",
      "-y",
      opts.outputPath,
    ];
    log.debug("Adding MELT logo watermark (top-right)");
  } else {
    args = [
      "-i", opts.inputVideoPath,
      "-vf", `ass='${escapedAssPath}'`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "28",
      "-maxrate", "4M",
      "-bufsize", "8M",
      "-c:a", "copy",
      "-movflags", "+faststart",
      "-y",
      opts.outputPath,
    ];
  }

  await execFileAsync(ffmpegBin, args, { timeout: 300000 });

  await rm(assPath, { force: true }).catch(() => {});

  log.success(`Rendered with captions: ${path.basename(opts.outputPath)}`);
}
