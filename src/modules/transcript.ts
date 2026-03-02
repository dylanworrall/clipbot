import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { TranscriptEntry, TranscriptSegment, WordTimestamp } from "../types/clip.js";
import { extractVideoId } from "../utils/url.js";
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
  /** Word-level timestamps extracted from YouTube auto-caption json3 data */
  wordTimestamps: WordTimestamp[];
}

export async function fetchTranscript(
  videoUrl: string,
  options?: { cookiesFile?: string }
): Promise<TranscriptResult> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error(`Could not extract video ID from: ${videoUrl}`);
  }

  log.debug(`Fetching transcript for video: ${videoId}`);

  const outPath = path.join(tmpdir(), `clipbot-sub-${videoId}`);

  try {
    // Use yt-dlp to download subtitles as json3
    // Build cookies args if a cookies file is available
    const cookiesArgs: string[] = [];
    if (options?.cookiesFile) {
      cookiesArgs.push("--cookies", options.cookiesFile);
    } else {
      // Auto-detect cookies.txt in project root
      const autoPath = path.join(process.cwd(), "cookies.txt");
      try {
        const { access } = await import("node:fs/promises");
        await access(autoPath);
        cookiesArgs.push("--cookies", autoPath);
      } catch {
        // no cookies file
      }
    }

    await execFileAsync("python", [
      "-m", "yt_dlp",
      ...cookiesArgs,
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", "en",
      "--sub-format", "json3",
      "--skip-download",
      "-o", outPath,
      `https://www.youtube.com/watch?v=${videoId}`,
    ], { timeout: 60000 });

    // Read the json3 file
    const json3Path = `${outPath}.en.json3`;
    const raw = await readFile(json3Path, "utf-8");
    const data = JSON.parse(raw) as { events: Json3Event[] };

    // Clean up temp file
    await rm(json3Path, { force: true });

    // Filter events that have text segments
    const events = data.events.filter(
      (e) => e.segs && e.segs.length > 0 && e.segs.some((s) => s.utf8?.trim())
    );

    if (events.length === 0) {
      throw new Error(
        "No transcript available for this video. The video may not have captions."
      );
    }

    // Convert to TranscriptEntry format
    const entries: TranscriptEntry[] = events.map((e) => ({
      text: e.segs!.map((s) => s.utf8).join("").trim(),
      offset: e.tStartMs,
      duration: e.dDurationMs,
    }));

    // Extract word-level timestamps from json3 seg data
    const wordTimestamps = extractWordTimestamps(events);
    log.debug(`Word timestamps: ${wordTimestamps.length} words with exact timing`);

    // Group into ~30 second segments for Claude analysis
    const segments = groupIntoSegments(entries, 30000);
    return { segments, entries, wordTimestamps };
  } catch (err) {
    // Clean up on error
    await rm(`${outPath}.en.json3`, { force: true }).catch(() => {});

    if (err instanceof Error && err.message.includes("No transcript")) {
      throw err;
    }
    throw new Error(
      `Failed to fetch transcript: ${err instanceof Error ? err.message : String(err)}`
    );
  }
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
