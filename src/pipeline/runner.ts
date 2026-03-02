import { randomUUID } from "node:crypto";
import path from "node:path";
import type { ClipBotConfig, Platform } from "../types/config.js";
import type {
  PipelineState,
  ClipResult,
  PostResult,
  PlatformTarget,
} from "../types/pipeline.js";
import { downloadVideo } from "../modules/downloader.js";
import { fetchTranscript, formatTranscriptForPrompt } from "../modules/transcript.js";
import { analyzeTranscript } from "../modules/analyzer.js";
import { createAllClips, getVideoDuration } from "../modules/clipper.js";
import { sliceWordTimings, renderWithCaptions } from "../modules/captions.js";
import { uploadAndPost } from "../modules/publisher.js";
import { createInitialState, saveState } from "./state.js";
import { ensureDir } from "../utils/fs.js";
import { normalizeYouTubeUrl } from "../utils/url.js";
import { log } from "../utils/logger.js";
import type { ViralMoment } from "../types/clip.js";

export interface RunOptions {
  url: string;
  runId?: string;
  quality?: string;
  maxClips?: number;
  minScore?: number;
  maxDuration?: number;
  platforms?: Platform[];
  previewOnly?: boolean;
  skipPublish?: boolean;
  outputDir?: string;
  backgroundFillStyle?: string;
  captionStyle?: import("../types/captions.js").CaptionStyle;
  scoringWeights?: import("../types/config.js").ScoringWeights;
  onStep?: (step: string) => void;
}

export interface RunResult {
  state: PipelineState;
  moments: ViralMoment[];
  clips: ClipResult[];
  posts: PostResult[];
}

export async function runPipeline(
  config: ClipBotConfig,
  options: RunOptions
): Promise<RunResult> {
  const runId = options.runId ?? randomUUID().slice(0, 8);
  const outputDir = path.resolve(options.outputDir ?? config.outputDir, runId);
  await ensureDir(outputDir);

  const youtubeUrl = normalizeYouTubeUrl(options.url);
  const state = createInitialState(runId, youtubeUrl);

  const quality = options.quality ?? config.defaultQuality;
  const maxClips = options.maxClips ?? config.defaultMaxClips;
  const minScore = options.minScore ?? config.defaultMinScore;
  const maxDuration = options.maxDuration ?? config.defaultMaxDuration;
  const platforms = options.platforms ?? config.defaultPlatforms;

  try {
    // Step 1: Download
    options.onStep?.("Downloading video...");
    state.status = "downloading";
    await saveState(state, outputDir);

    const download = await downloadVideo(youtubeUrl, {
      quality,
      outputDir,
      cookiesFile: config.cookiesFile,
    });

    // Get actual video duration via ffprobe
    download.durationSeconds = await getVideoDuration(download.filePath);
    state.download = download;
    log.success(
      `Downloaded: ${download.filename} (${Math.round(download.durationSeconds)}s)`
    );

    // Step 2: Transcript
    options.onStep?.("Fetching transcript...");
    state.status = "transcribing";
    await saveState(state, outputDir);

    const { segments, wordTimestamps } = await fetchTranscript(youtubeUrl, {
      cookiesFile: config.cookiesFile,
    });
    state.transcript = segments;
    state.wordTimestamps = wordTimestamps;
    log.success(`Transcript: ${segments.length} segments, ${wordTimestamps.length} word timestamps`);

    // Step 3: Analyze
    options.onStep?.("Analyzing for viral moments...");
    state.status = "analyzing";
    await saveState(state, outputDir);

    const formattedTranscript = formatTranscriptForPrompt(segments);
    const moments = await analyzeTranscript(
      formattedTranscript,
      download.filename,
      config.claudeApiKey,
      {
        model: config.claudeModel,
        temperature: config.claudeTemperature,
        maxClips,
        minScore,
        maxDuration,
        niche: config.niche || undefined,
        scoringWeights: options.scoringWeights ?? config.scoringWeights,
      }
    );

    state.moments = moments;
    log.success(`Found ${moments.length} viral moments`);
    await saveState(state, outputDir);

    // If preview only, stop here
    if (options.previewOnly) {
      state.status = "complete";
      state.completedAt = new Date().toISOString();
      await saveState(state, outputDir);
      return { state, moments, clips: [], posts: [] };
    }

    // Step 4: Clip
    options.onStep?.("Creating clips...");
    state.status = "clipping";
    await saveState(state, outputDir);

    const bgStyle = (options.backgroundFillStyle ?? config.backgroundFillStyle) as import("../types/config.js").BackgroundFillStyle;

    const clips = await createAllClips(download.filePath, moments, {
      outputDir,
      maxDuration,
      padBefore: config.padBefore,
      padAfter: config.padAfter,
      burnSubtitles: config.subtitles,
      transcript: segments,
      backgroundFillStyle: bgStyle,
    });

    // Preserve raw file paths on every clip
    for (const clip of clips) {
      clip.rawFilePath = clip.filePath;
    }

    state.clips = clips;
    log.success(`Created ${clips.length} clips`);
    await saveState(state, outputDir);

    // Step 4b: Add captions overlay via Remotion (skip in overlay mode — captions render live in editor)
    if (config.subtitles && config.captionMode !== "overlay" && clips.length > 0) {
      options.onStep?.("Adding captions and hook text...");

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]!;
        const moment = moments.find((m) => m.index === clip.momentIndex);
        if (!moment) continue;

        try {
          // Calculate clip's actual time range in original video (ms)
          const clipStartMs = Math.max(0, moment.startSeconds - config.padBefore) * 1000;
          const clipEndMs = clipStartMs + clip.durationSeconds * 1000;

          // Slice exact word-level timestamps to this clip's range
          const words = sliceWordTimings(wordTimestamps, clipStartMs, clipEndMs);

          if (words.length > 0) {
            const captionedPath = clip.filePath.replace(".mp4", "_captioned.mp4");
            await renderWithCaptions({
              inputVideoPath: clip.filePath,
              outputPath: captionedPath,
              words,
              hookText: moment.hookText,
              hookDuration: 3,
              durationInSeconds: clip.durationSeconds,
              captionStyle: options.captionStyle,
            });
            clip.filePath = captionedPath;
            log.success(`Added captions to clip ${clip.momentIndex}`);
          }
        } catch (err) {
          log.warn(
            `Caption rendering failed for clip ${clip.momentIndex}: ${err instanceof Error ? err.message : String(err)}. Using plain clip.`
          );
        }
      }
      await saveState(state, outputDir);
    }

    // Step 5: Publish
    if (options.skipPublish) {
      log.success("Skipping publishing (--no-post)");
      state.status = "complete";
      state.completedAt = new Date().toISOString();
      await saveState(state, outputDir);
      return { state, moments, clips, posts: [] };
    }

    if (!config.lateApiKey) {
      log.warn("No Late API key configured. Skipping publishing.");
      state.status = "complete";
      state.completedAt = new Date().toISOString();
      await saveState(state, outputDir);
      return { state, moments, clips, posts: [] };
    }

    const platformTargets: PlatformTarget[] = platforms
      .filter((p) => config.accounts[p])
      .map((p) => ({ platform: p, accountId: config.accounts[p]! }));

    if (platformTargets.length === 0) {
      log.warn(
        "No platform accounts configured. Run `clipbot accounts` to set up."
      );
      state.status = "complete";
      state.completedAt = new Date().toISOString();
      await saveState(state, outputDir);
      return { state, moments, clips, posts: [] };
    }

    options.onStep?.("Publishing clips...");
    state.status = "publishing";
    await saveState(state, outputDir);

    const posts: PostResult[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]!;
      const moment = moments.find((m) => m.index === clip.momentIndex);
      if (!moment) continue;

      try {
        const post = await uploadAndPost(clip, moment, config.lateApiKey, {
          platforms: platformTargets,
          publishNow: true,
        });
        posts.push(post);
        log.success(`Posted clip ${clip.momentIndex}: "${clip.title}"`);
      } catch (err) {
        log.error(
          `Failed to post clip ${clip.momentIndex}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    state.posts = posts;
    state.status = "complete";
    state.completedAt = new Date().toISOString();
    await saveState(state, outputDir);

    return { state, moments, clips, posts };
  } catch (err) {
    state.status = "failed";
    state.error = {
      step: state.status,
      message: err instanceof Error ? err.message : String(err),
    };
    await saveState(state, outputDir).catch(() => {});
    throw err;
  }
}
