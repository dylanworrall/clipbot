import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getOutputDir } from "@/lib/paths";
import { createRun, updateRun } from "@/lib/run-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { spawnPipeline } from "@/lib/pipeline-worker";

const ALLOWED_EXTENSIONS = [".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v", ".flv", ".wmv"];
const VIDEO_MIMES = ["video/", "application/octet-stream"];

export async function POST(req: NextRequest) {
  try {
    // Try formData first (works for smaller files)
    let file: File | null = null;
    let spaceId: string | null = null;

    try {
      const formData = await req.formData();
      file = formData.get("file") as File | null;
      spaceId = formData.get("spaceId") as string | null;
    } catch {
      return NextResponse.json(
        { error: "File too large or invalid. Max ~4MB via browser upload. For larger files, use the CLI or place in the output directory." },
        { status: 413 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate by extension or MIME type
    const ext = path.extname(file.name).toLowerCase();
    const mime = file.type?.toLowerCase() || "";
    const isVideoExt = ALLOWED_EXTENSIONS.includes(ext);
    const isVideoMime = VIDEO_MIMES.some((m) => mime.startsWith(m));

    if (!isVideoExt && !isVideoMime) {
      return NextResponse.json(
        { error: `"${file.name}" (${mime || "unknown type"}) is not a supported video format. Supported: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const runId = randomUUID().slice(0, 8);
    const outputDir = path.join(getOutputDir(), runId);
    await mkdir(outputDir, { recursive: true });

    // Save uploaded file — stream to disk to handle large files
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(outputDir, safeName);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    // Create the run record
    const localUrl = `file://${filePath.replace(/\\/g, "/")}`;

    const config = await getEffectiveConfig();

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

    let captionStyleB64: string | undefined;
    if (config.captionStyle) {
      captionStyleB64 = Buffer.from(JSON.stringify(config.captionStyle)).toString("base64");
    }
    let scoringWeightsB64: string | undefined;
    if (config.scoringWeights) {
      scoringWeightsB64 = Buffer.from(JSON.stringify(config.scoringWeights)).toString("base64");
    }

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
