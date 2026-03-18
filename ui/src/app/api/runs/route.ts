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
  getManifest,
} from "@/lib/run-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { getSpaceEffectiveSettings } from "@/lib/space-store";
import { spawnPipeline } from "@/lib/pipeline-worker";

const WORKER_URL = process.env.WORKER_URL; // e.g. https://your-tunnel.trycloudflare.com
const WORKER_AUTH = process.env.WORKER_AUTH_TOKEN;
const isServerless = !!process.env.VERCEL;

function workerHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (WORKER_AUTH) h["Authorization"] = `Bearer ${WORKER_AUTH}`;
  return h;
}

export async function GET(req: NextRequest) {
  // Proxy to worker if serverless + worker configured
  if (isServerless && WORKER_URL) {
    try {
      const res = await fetch(`${WORKER_URL}/jobs`, { headers: workerHeaders() });
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json([]);
    }
  }
  if (isServerless) return NextResponse.json([]);

  await syncRunsFromOutput();
  await markStaleRunsFailed();
  const runs = await listRuns();

  const includeManifests = new URL(req.url).searchParams.get("include") === "manifests";
  if (!includeManifests) {
    return NextResponse.json(runs);
  }

  const runsWithManifests = await Promise.all(
    runs.slice(0, 30).map(async (run) => {
      if (["complete", "failed"].includes(run.status)) {
        const manifest = await getManifest(run.outputDir);
        return { ...run, manifest };
      }
      return { ...run, manifest: null };
    })
  );
  const rest = runs.slice(30).map((run) => ({ ...run, manifest: null }));
  return NextResponse.json([...runsWithManifests, ...rest]);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, spaceId } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // ── Proxy to worker if serverless ──────────────────────────────────
  if (isServerless) {
    if (!WORKER_URL) {
      return NextResponse.json(
        { error: "Video processing requires a pipeline worker. Set WORKER_URL." },
        { status: 501 }
      );
    }

    // Resolve settings server-side so worker doesn't need them
    let config;
    try {
      config = spaceId
        ? (await getSpaceEffectiveSettings(spaceId)) ?? (await getEffectiveConfig())
        : await getEffectiveConfig();
    } catch {
      config = {
        defaultQuality: "1080", defaultMaxClips: 5, defaultMinScore: 7,
        defaultMaxDuration: 59, niche: "cannabis", subtitles: true,
        backgroundFillStyle: "blurred-zoom", captionMode: "overlay",
      };
    }

    const runId = randomUUID().slice(0, 8);

    let captionStyleB64: string | undefined;
    if ((config as Record<string, unknown>).captionStyle) {
      captionStyleB64 = Buffer.from(JSON.stringify((config as Record<string, unknown>).captionStyle)).toString("base64");
    }
    let scoringWeightsB64: string | undefined;
    if ((config as Record<string, unknown>).scoringWeights) {
      scoringWeightsB64 = Buffer.from(JSON.stringify((config as Record<string, unknown>).scoringWeights)).toString("base64");
    }

    try {
      const workerRes = await fetch(`${WORKER_URL}/jobs`, {
        method: "POST",
        headers: workerHeaders(),
        body: JSON.stringify({
          url,
          runId,
          options: {
            quality: (config as Record<string, unknown>).defaultQuality ?? "1080",
            maxClips: (config as Record<string, unknown>).defaultMaxClips ?? 5,
            minScore: (config as Record<string, unknown>).defaultMinScore ?? 7,
            maxDuration: (config as Record<string, unknown>).defaultMaxDuration ?? 59,
            niche: (config as Record<string, unknown>).niche ?? "cannabis",
            subtitles: (config as Record<string, unknown>).subtitles ?? true,
            backgroundFillStyle: (config as Record<string, unknown>).backgroundFillStyle ?? "blurred-zoom",
            captionStyle: captionStyleB64,
            captionMode: (config as Record<string, unknown>).captionMode ?? "overlay",
            scoringWeights: scoringWeightsB64,
          },
        }),
      });

      const data = await workerRes.json();
      if (!workerRes.ok) {
        return NextResponse.json(data, { status: workerRes.status });
      }
      return NextResponse.json(data, { status: 201 });
    } catch (e) {
      return NextResponse.json(
        { error: `Worker unreachable: ${e instanceof Error ? e.message : "connection failed"}` },
        { status: 502 }
      );
    }
  }

  // ── Local mode (existing behavior) ─────────────────────────────────
  const { force } = body;

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
      // Only block if completed successfully — failed runs can be retried
      if (existing.status === "complete") {
        return NextResponse.json(
          { error: "This video was already processed", existingRunId: existing.runId, alreadyComplete: true },
          { status: 409 }
        );
      }
    }
  }

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

  let captionStyleB64: string | undefined;
  if (config.captionStyle) {
    captionStyleB64 = Buffer.from(JSON.stringify(config.captionStyle)).toString("base64");
  }
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

  if (pid) {
    await updateRun(runId, { pid });
  }

  return NextResponse.json({ runId, outputDir }, { status: 201 });
}
