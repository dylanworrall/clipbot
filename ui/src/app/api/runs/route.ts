import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getOutputDir } from "@/lib/paths";
import {
  listRuns,
  createRun,
  updateRun,
  syncRunsFromOutput,
  markStaleRunsFailed,
  findExistingRun,
} from "@/lib/run-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { getSpaceEffectiveSettings } from "@/lib/space-store";
import { spawnPipeline } from "@/lib/pipeline-worker";

export async function GET() {
  await syncRunsFromOutput();
  await markStaleRunsFailed();
  const runs = await listRuns();
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, spaceId, force } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Check for duplicate/in-progress runs of the same URL
  if (!force) {
    const existing = await findExistingRun(url);
    if (existing) {
      const isActive = ["downloading", "transcribing", "analyzing", "clipping", "publishing"].includes(existing.status);
      if (isActive) {
        return NextResponse.json(
          { error: "This video is already being processed", existingRunId: existing.runId },
          { status: 409 }
        );
      }
      // Completed run exists — return it with a hint
      return NextResponse.json(
        { error: "This video was already processed", existingRunId: existing.runId, alreadyComplete: true },
        { status: 409 }
      );
    }
  }

  // Resolve all settings server-side from space or global config
  const config = spaceId
    ? (await getSpaceEffectiveSettings(spaceId)) ?? (await getEffectiveConfig())
    : await getEffectiveConfig();
  const runId = randomUUID().slice(0, 8);
  const outputDir = path.join(getOutputDir(), runId);

  const run = {
    runId,
    sourceUrl: url,
    status: "downloading",
    ...(spaceId && { spaceId }),
    options: {
      quality: config.defaultQuality ?? "1080",
      maxClips: config.defaultMaxClips ?? 5,
      minScore: config.defaultMinScore ?? 7,
      maxDuration: config.defaultMaxDuration ?? 59,
      platforms: config.defaultPlatforms ?? ["tiktok", "youtube", "instagram"],
      subtitles: config.subtitles ?? true,
      niche: config.niche ?? "cannabis",
      backgroundFillStyle: config.backgroundFillStyle ?? "blurred-zoom",
    },
    startedAt: new Date().toISOString(),
    outputDir,
  };

  await createRun(run);

  const effectiveCaptionStyle = config.captionStyle;
  let captionStyleB64: string | undefined;
  if (effectiveCaptionStyle) {
    captionStyleB64 = Buffer.from(JSON.stringify(effectiveCaptionStyle)).toString("base64");
  }

  // Pass scoring weights from saved settings
  let scoringWeightsB64: string | undefined;
  if (config.scoringWeights) {
    scoringWeightsB64 = Buffer.from(JSON.stringify(config.scoringWeights)).toString("base64");
  }

  const { pid } = await spawnPipeline({
    url,
    runId,
    quality: run.options.quality,
    maxClips: run.options.maxClips,
    minScore: run.options.minScore,
    maxDuration: run.options.maxDuration,
    niche: run.options.niche,
    subtitles: run.options.subtitles,
    skipPublish: true,
    backgroundFillStyle: run.options.backgroundFillStyle,
    captionStyle: captionStyleB64,
    captionMode: config.captionMode ?? "overlay",
    scoringWeights: scoringWeightsB64,
  });

  // Store PID for cancel support
  if (pid) {
    await updateRun(runId, { pid });
  }

  return NextResponse.json({ runId, outputDir }, { status: 201 });
}
