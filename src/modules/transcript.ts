import { execFile } from "node:child_process";
import { readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { TranscriptEntry, TranscriptSegment, WordTimestamp } from "../types/clip.js";
import { extractYouTubeId, extractVideoSlug, detectPlatform } from "../utils/url.js";
import { getCookiesPath } from "../config/paths.js";
import { log } from "../utils/logger.js";

const execFileAsync = promisify(execFile);

interface Json3Seg {
  utf8: string;
  tOffsetMs?: number;
}

interface Json3Event {
  tStartMs: number;
  dDurationMs: number;
  segs?: Json3Seg[];
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  entries: TranscriptEntry[];
  /** Word-level timestamps extracted from subtitle data */
  wordTimestamps: WordTimestamp[];
}

/**
 * Build cookies args for yt-dlp from explicit path or auto-detected locations.
 */
async function buildCookiesArgs(cookiesFile?: string): Promise<string[]> {
  if (cookiesFile) {
    return ["--cookies", cookiesFile];
  }

  // Auto-detect cookies.txt in project root, then ~/.clipbot/cookies.txt
  const autoPath = path.join(process.cwd(), "cookies.txt");
  try {
    await access(autoPath);
    return ["--cookies", autoPath];
  } catch {
    // no cookies in cwd
  }

  const homeCookies = getCookiesPath();
  try {
    await access(homeCookies);
    return ["--cookies", homeCookies];
  } catch {
    return [];
  }
}

export async function fetchTranscript(
  videoUrl: string,
  options?: { cookiesFile?: string }
): Promise<TranscriptResult> {
  const platform = detectPlatform(videoUrl);
  const slug = extractVideoSlug(videoUrl);

  log.debug(`Fetching transcript for: ${slug} (platform: ${platform})`);

  // YouTube: try json3 first (has word-level timestamps)
  if (platform === "youtube") {
    try {
      return await fetchJson3Transcript(videoUrl, slug, options);
    } catch (err) {
      log.debug(`json3 transcript failed, falling back to VTT: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Local files: skip yt-dlp entirely, go straight to Whisper
  if (videoUrl.startsWith("file://")) {
    log.debug("Local file — using Whisper transcription via Gemini");
    return await whisperFallback(videoUrl, slug, options);
  }

  // Universal fallback: VTT via yt-dlp (works for any platform)
  try {
    return await fetchVttTranscript(videoUrl, slug, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Final fallback: extract audio and transcribe with Whisper via Gemini
    log.debug(`VTT failed (${message.slice(0, 80)}) — falling back to Whisper transcription`);
    return await whisperFallback(videoUrl, slug, options);
  }
}

/**
 * Fetch YouTube json3 transcript (word-level timestamps).
 */
async function fetchJson3Transcript(
  videoUrl: string,
  slug: string,
  options?: { cookiesFile?: string }
): Promise<TranscriptResult> {
  const outPath = path.join(tmpdir(), `clipbot-sub-${slug}`);
  const cookiesArgs = await buildCookiesArgs(options?.cookiesFile);

  try {
    await execFileAsync("yt-dlp", [
      ...cookiesArgs,
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", "en",
      "--sub-format", "json3",
      "--skip-download",
      "--extractor-args", "youtube:player_client=android,web",
      "-o", outPath,
      videoUrl,
    ], { timeout: 60000 });

    const json3Path = `${outPath}.en.json3`;
    const raw = await readFile(json3Path, "utf-8");
    const data = JSON.parse(raw) as { events: Json3Event[] };

    await rm(json3Path, { force: true });

    const events = data.events.filter(
      (e) => e.segs && e.segs.length > 0 && e.segs.some((s) => s.utf8?.trim())
    );

    if (events.length === 0) {
      throw new Error(
        "No subtitles available for this video. The video may not have captions."
      );
    }

    const entries: TranscriptEntry[] = events.map((e) => ({
      text: e.segs!.map((s) => s.utf8).join("").trim(),
      offset: e.tStartMs,
      duration: e.dDurationMs,
    }));

    const wordTimestamps = extractWordTimestamps(events);
    log.debug(`Word timestamps: ${wordTimestamps.length} words with exact timing`);

    const segments = groupIntoSegments(entries, 30000);
    return { segments, entries, wordTimestamps };
  } catch (err) {
    await rm(`${outPath}.en.json3`, { force: true }).catch(() => {});
    throw err;
  }
}

/**
 * Fetch VTT transcript via yt-dlp (universal, works for any platform).
 */
async function fetchVttTranscript(
  videoUrl: string,
  slug: string,
  options?: { cookiesFile?: string }
): Promise<TranscriptResult> {
  const outPath = path.join(tmpdir(), `clipbot-sub-${slug}`);
  const cookiesArgs = await buildCookiesArgs(options?.cookiesFile);

  try {
    await execFileAsync("yt-dlp", [
      ...cookiesArgs,
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", "en",
      "--sub-format", "vtt",
      "--skip-download",
      "--extractor-args", "youtube:player_client=android,web",
      "-o", outPath,
      videoUrl,
    ], { timeout: 60000 });

    const vttPath = `${outPath}.en.vtt`;
    const raw = await readFile(vttPath, "utf-8");

    await rm(vttPath, { force: true });

    const entries = parseVtt(raw);

    if (entries.length === 0) {
      throw new Error(
        "No subtitles available for this video. The video may not have captions."
      );
    }

    // Approximate word-level timestamps from VTT cues
    const wordTimestamps = approximateWordTimestamps(entries);
    log.debug(`Word timestamps: ${wordTimestamps.length} words (approximated from VTT)`);

    const segments = groupIntoSegments(entries, 30000);
    return { segments, entries, wordTimestamps };
  } catch (err) {
    await rm(`${outPath}.en.vtt`, { force: true }).catch(() => {});

    if (err instanceof Error && err.message.includes("No subtitles")) {
      throw err;
    }
    throw new Error(
      `Failed to fetch transcript: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Parse WebVTT into TranscriptEntry[].
 * Handles standard VTT format with timestamps like 00:01:23.456 --> 00:01:26.789
 */
function parseVtt(raw: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const lines = raw.split(/\r?\n/);
  let i = 0;

  // Skip WEBVTT header and any metadata
  while (i < lines.length && !lines[i]!.includes("-->")) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i]!;
    const tsMatch = line.match(
      /(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})/
    );

    if (tsMatch) {
      const startMs = vttTimestampToMs(tsMatch[1], tsMatch[2]!, tsMatch[3]!, tsMatch[4]!);
      const endMs = vttTimestampToMs(tsMatch[5], tsMatch[6]!, tsMatch[7]!, tsMatch[8]!);

      // Collect text lines until blank line or next timestamp
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i]!.trim() !== "" && !lines[i]!.includes("-->")) {
        // Skip numeric cue identifiers
        if (/^\d+$/.test(lines[i]!.trim())) {
          i++;
          continue;
        }
        // Strip VTT tags like <c>, </c>, <00:01:23.456>, etc.
        const cleaned = lines[i]!.replace(/<[^>]+>/g, "").trim();
        if (cleaned) textLines.push(cleaned);
        i++;
      }

      const text = textLines.join(" ").trim();
      if (text) {
        entries.push({
          text,
          offset: startMs,
          duration: endMs - startMs,
        });
      }
    } else {
      i++;
    }
  }

  // Deduplicate entries with identical text (common in auto-generated VTT)
  const deduped: TranscriptEntry[] = [];
  for (const entry of entries) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.text === entry.text) continue;
    deduped.push(entry);
  }

  return deduped;
}

function vttTimestampToMs(
  hours: string | undefined,
  minutes: string,
  seconds: string,
  millis: string
): number {
  const h = hours ? parseInt(hours.replace(":", ""), 10) : 0;
  return h * 3600000 + parseInt(minutes, 10) * 60000 + parseInt(seconds, 10) * 1000 + parseInt(millis, 10);
}

/**
 * Approximate word-level timestamps by splitting cue text evenly across cue duration.
 */
function approximateWordTimestamps(entries: TranscriptEntry[]): WordTimestamp[] {
  const words: WordTimestamp[] = [];

  for (const entry of entries) {
    const entryWords = entry.text.split(/\s+/).filter(Boolean);
    if (entryWords.length === 0) continue;

    const perWord = entry.duration / entryWords.length;
    for (let i = 0; i < entryWords.length; i++) {
      words.push({
        word: entryWords[i]!,
        startMs: Math.round(entry.offset + i * perWord),
        endMs: Math.round(entry.offset + (i + 1) * perWord),
      });
    }
  }

  return words;
}

/**
 * Extract word-level timestamps from YouTube json3 auto-caption events.
 * Each event's segs array contains individual words with tOffsetMs relative
 * to the event's tStartMs. The first seg in an event has no tOffsetMs (starts at 0).
 */
function extractWordTimestamps(events: Json3Event[]): WordTimestamp[] {
  const words: WordTimestamp[] = [];

  for (const event of events) {
    if (!event.segs || event.segs.length === 0) continue;

    // Collect word positions within this event
    const eventWords: { word: string; offsetMs: number }[] = [];
    for (const seg of event.segs) {
      const text = seg.utf8?.trim();
      if (!text || text === "\n") continue;
      const offsetMs = seg.tOffsetMs ?? 0;
      // A seg can contain multiple words (rare but possible), split them
      const segWords = text.split(/\s+/).filter(Boolean);
      if (segWords.length === 1) {
        eventWords.push({ word: segWords[0]!, offsetMs });
      } else {
        // Distribute sub-words evenly within this seg's slot
        const nextSeg = event.segs[event.segs.indexOf(seg) + 1];
        const segDuration = nextSeg?.tOffsetMs != null
          ? nextSeg.tOffsetMs - offsetMs
          : event.dDurationMs - offsetMs;
        const perWord = segDuration / segWords.length;
        for (let i = 0; i < segWords.length; i++) {
          eventWords.push({
            word: segWords[i]!,
            offsetMs: Math.round(offsetMs + i * perWord),
          });
        }
      }
    }

    // Convert to absolute timestamps
    for (let i = 0; i < eventWords.length; i++) {
      const startMs = event.tStartMs + eventWords[i]!.offsetMs;
      // End time = start of next word, or end of event for the last word
      const endMs = i < eventWords.length - 1
        ? event.tStartMs + eventWords[i + 1]!.offsetMs
        : event.tStartMs + event.dDurationMs;

      words.push({
        word: eventWords[i]!.word,
        startMs,
        endMs,
      });
    }
  }

  return words;
}

/**
 * Whisper fallback: extract audio via yt-dlp, transcribe with Groq Whisper API (free).
 * Falls back to Gemini audio transcription if Groq unavailable.
 */
async function whisperFallback(
  videoUrl: string,
  slug: string,
  options?: { cookiesFile?: string }
): Promise<TranscriptResult> {
  const audioPath = path.join(tmpdir(), `clipbot-audio-${slug}.m4a`);
  const cookiesArgs = await buildCookiesArgs(options?.cookiesFile);

  // Step 1: Extract audio
  if (videoUrl.startsWith("file://")) {
    // Local file: use FFmpeg directly to extract audio
    const localPath = decodeURIComponent(videoUrl.replace("file://", ""));
    await execFileAsync("ffmpeg", [
      "-i", localPath,
      "-vn", "-acodec", "aac", "-b:a", "128k",
      "-y", audioPath,
    ], { timeout: 300000 });
  } else {
    try {
      await execFileAsync("yt-dlp", [
        ...cookiesArgs,
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "--extractor-args", "youtube:player_client=android,web",
        "-o", audioPath,
        "--no-playlist",
        videoUrl,
      ], { timeout: 300000 });
    } catch {
      await execFileAsync("python3", [
        "-m", "yt_dlp",
        ...cookiesArgs,
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "--extractor-args", "youtube:player_client=android,web",
        "-o", audioPath,
        "--no-playlist",
        videoUrl,
      ], { timeout: 300000 });
    }
  }

  log.debug(`Audio extracted: ${audioPath}`);

  // Step 2: Transcribe with Groq Whisper (free, fast) or Gemini
  const audioBuffer = await readFile(audioPath);
  let transcriptText: string;

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (groqKey) {
    transcriptText = await transcribeWithGroq(audioBuffer, groqKey);
  } else if (geminiKey) {
    transcriptText = await transcribeWithGemini(audioBuffer, geminiKey);
  } else {
    await rm(audioPath, { force: true }).catch(() => {});
    throw new Error("No subtitles and no Whisper API key (GROQ_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY) for fallback transcription.");
  }

  await rm(audioPath, { force: true }).catch(() => {});

  if (!transcriptText.trim()) {
    throw new Error("Whisper transcription returned empty result.");
  }

  log.success(`Whisper transcription: ${transcriptText.length} chars`);

  // Convert plain text to segments (approximate 30s windows based on word count)
  const words = transcriptText.split(/\s+/).filter(Boolean);
  const entries: TranscriptEntry[] = [];
  const wordsPerChunk = 50; // ~30s of speech
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(" ");
    const approxMs = (i / words.length) * 6000000; // rough estimate
    entries.push({
      text: chunk,
      offset: Math.round(approxMs),
      duration: 30000,
    });
  }

  const wordTimestamps = approximateWordTimestamps(entries);
  const segments = groupIntoSegments(entries, 30000);
  return { segments, entries, wordTimestamps };
}

async function transcribeWithGroq(audio: Buffer, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audio)], { type: "audio/m4a" }), "audio.m4a");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "text");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Groq Whisper failed: ${res.status} ${await res.text()}`);
  return await res.text();
}

async function transcribeWithGemini(audio: Buffer, apiKey: string): Promise<string> {
  const base64Audio = audio.toString("base64");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: "audio/mp4", data: base64Audio } },
            { text: "Transcribe this audio verbatim. Output only the transcription text, nothing else. Include all spoken words exactly as said." },
          ],
        }],
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini transcription failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function groupIntoSegments(
  entries: TranscriptEntry[],
  windowMs: number
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let currentStart = entries[0]?.offset ?? 0;
  let currentTexts: string[] = [];

  for (const entry of entries) {
    if (entry.offset - currentStart >= windowMs && currentTexts.length > 0) {
      const endMs = entry.offset;
      segments.push({
        startMs: currentStart,
        endMs,
        startFormatted: formatTime(currentStart),
        endFormatted: formatTime(endMs),
        text: currentTexts.join(" ").trim(),
      });
      currentStart = entry.offset;
      currentTexts = [];
    }
    currentTexts.push(entry.text.trim());
  }

  // Push remaining
  if (currentTexts.length > 0) {
    const lastEntry = entries[entries.length - 1]!;
    const endMs = lastEntry.offset + lastEntry.duration;
    segments.push({
      startMs: currentStart,
      endMs,
      startFormatted: formatTime(currentStart),
      endFormatted: formatTime(endMs),
      text: currentTexts.join(" ").trim(),
    });
  }

  log.debug(`Transcript: ${entries.length} entries → ${segments.length} segments`);
  return segments;
}

export function formatTranscriptForPrompt(
  segments: TranscriptSegment[]
): string {
  return segments
    .map((s) => `[${s.startFormatted} - ${s.endFormatted}] ${s.text}`)
    .join("\n");
}
