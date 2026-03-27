import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { getOutputDir } from "@/lib/paths";
import { createRun, updateRun } from "@/lib/run-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { spawnPipeline } from "@/lib/pipeline-worker";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_EXTENSIONS = [".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v", ".flv", ".wmv"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const spaceId = formData.get("spaceId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported format "${ext}". Supported: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(0)}MB). Max 2GB.` },
        { status: 400 }
      );
    }

    const runId = randomUUID().slice(0, 8);
    const outputDir = path.join(getOutputDir(), runId);
    await mkdir(outputDir, { recursive: true });

    // Save uploaded file to the run output directory
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(outputDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create the run record — use file:// URL so pipeline knows it's local
    const localUrl = `file://${filePath.replace(/\\/g, "/")}`;

    const config = spaceId
      ? await getEffectiveConfig()
      : await getEffectiveConfig();

    const run = {
      runId,
      sourceUrl: localUrl,
      status: "downloading",
      ...(spaceId && { spaceId }),
      options: {
        quality: config.defaultQuality ?? "1080",
        maxClips: config.defaultMaxClips ?? 5,
        minScore: config.defaultMinScore ?? 7,
        maxDuration: config.defaultMaxDuration ?? 59,
        platforms: config.defaultPlatforms ?? ["tiktok", "youtube", "instagram"],
        subtitles: config.subtitles ?? true,
        niche: config.niche ?? "general",
        backgroundFillStyle: config.backgroundFillStyle ?? "blurred-zoom",
      },
      startedAt: new Date().toISOString(),
      outputDir,
    };

    await createRun(run);

    // Build pipeline args
    let captionStyleB64: string | undefined;
    if (config.captionStyle) {
      captionStyleB64 = Buffer.from(JSON.stringify(config.captionStyle)).toString("base64");
    }
    let scoringWeightsB64: string | undefined;
    if (config.scoringWeights) {
      scoringWeightsB64 = Buffer.from(JSON.stringify(config.scoringWeights)).toString("base64");
    }

    // Spawn pipeline with the local file path as the "URL"
    // The CLI's downloader will detect file:// and skip download
    const { pid } = await spawnPipeline({
      url: localUrl,
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

    return NextResponse.json(
      { runId, outputDir, fileName: safeName, fileSize: file.size },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
