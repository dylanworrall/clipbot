/**
 * Lightweight re-render script for the editor.
 * Takes a job JSON file, re-clips from the existing source video,
 * and re-burns captions. No download, no transcript, no analysis.
 *
 * Usage: npx tsx src/cli/rerender-clip.ts <job.json>
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { createClip } from "../modules/clipper.js";
import { sliceWordTimings, renderWithCaptions } from "../modules/captions.js";
import { log } from "../utils/logger.js";
import type { ViralMoment } from "../types/clip.js";
import type { CaptionStyle } from "../types/captions.js";
import type { BackgroundFillStyle } from "../types/config.js";

interface RerenderJob {
  sourceVideo: string;
  outputDir: string;
  moment: {
    index: number;
    title: string;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    hookText: string;
  };
  wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
  backgroundFillStyle: string;
  captionStyle: CaptionStyle | null;
  trimStart: number;
  trimEnd: number;
  padBefore: number;
  padAfter: number;
}

async function main() {
  const jobPath = process.argv[2];
  if (!jobPath) {
    console.error("Usage: rerender-clip <job.json>");
    process.exit(1);
  }

  const raw = await readFile(jobPath, "utf-8");
  const job: RerenderJob = JSON.parse(raw);

  log.success(`Re-rendering clip #${job.moment.index}: "${job.moment.title}"`);

  // Build a ViralMoment from the job data, applying trim offsets
  const originalStart = Math.max(0, job.moment.startSeconds - job.padBefore);
  const trimmedStartSeconds = job.moment.startSeconds - job.padBefore + job.trimStart;
  const trimmedEndSeconds = job.moment.startSeconds - job.padBefore + job.trimEnd;

  const moment: ViralMoment = {
    index: job.moment.index,
    title: job.moment.title,
    description: "",
    hookText: job.moment.hookText,
    startSeconds: Math.max(0, trimmedStartSeconds),
    endSeconds: trimmedEndSeconds,
    durationSeconds: job.trimEnd - job.trimStart,
    viralityScore: 10,
    reasoning: "",
    hashtags: [],
    category: "humor",
  };

  // Step 1: Re-clip from source video
  log.success("Step 1: Re-clipping from source video...");
  const clip = await createClip(job.sourceVideo, moment, {
    outputDir: job.outputDir,
    maxDuration: 180,
    padBefore: 0, // Trim is already applied above
    padAfter: 0,
    burnSubtitles: false,
    transcript: [],
    backgroundFillStyle: job.backgroundFillStyle as BackgroundFillStyle,
  });

  log.success(`Clipped: ${path.basename(clip.filePath)} (${clip.durationSeconds.toFixed(1)}s)`);

  // Step 2: Burn captions
  if (job.wordTimestamps.length > 0) {
    log.success("Step 2: Burning captions...");

    // Slice word timings to the trimmed clip range
    const clipStartMs = Math.max(0, trimmedStartSeconds) * 1000;
    const clipEndMs = clipStartMs + clip.durationSeconds * 1000;
    const words = sliceWordTimings(job.wordTimestamps, clipStartMs, clipEndMs);

    if (words.length > 0) {
      const captionedPath = clip.filePath.replace(".mp4", "_captioned.mp4");
      await renderWithCaptions({
        inputVideoPath: clip.filePath,
        outputPath: captionedPath,
        words,
        hookText: job.moment.hookText,
        hookDuration: 3,
        durationInSeconds: clip.durationSeconds,
        captionStyle: job.captionStyle ?? undefined,
      });

      log.success(`Captioned: ${path.basename(captionedPath)}`);

      // Update the manifest with the new clip path
      try {
        const manifestPath = path.join(job.outputDir, "manifest.json");
        const mRaw = await readFile(manifestPath, "utf-8");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manifest = JSON.parse(mRaw) as any;
        const clips = manifest?.clips as Array<{
          momentIndex: number;
          filePath: string;
          thumbnailPath: string;
          fileSizeBytes: number;
          durationSeconds: number;
        }> | undefined;

        const clipEntry = clips?.find((c: { momentIndex: number }) => c.momentIndex === job.moment.index);
        if (clipEntry) {
          clipEntry.filePath = captionedPath;
          clipEntry.thumbnailPath = clip.thumbnailPath;
          const fileStats = await stat(captionedPath);
          clipEntry.fileSizeBytes = fileStats.size;
          clipEntry.durationSeconds = clip.durationSeconds;
          await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
          log.success("Updated manifest.json with new clip + thumbnail");
        }
      } catch {
        log.warn("Could not update manifest.json");
      }
    } else {
      log.warn("No word timings in trim range, skipping captions");
    }
  } else {
    log.success("No word timestamps available, skipping captions");
  }

  log.success("Re-render complete!");
}

main().catch((err) => {
  console.error("Re-render failed:", err);
  process.exit(1);
});
