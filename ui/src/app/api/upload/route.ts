import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, appendFile, stat } from "node:fs/promises";
import { getOutputDir } from "@/lib/paths";
import { createRun, updateRun } from "@/lib/run-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { spawnPipeline } from "@/lib/pipeline-worker";

const ALLOWED_EXTENSIONS = [".mov", ".mp4", ".mkv", ".avi", ".webm", ".m4v", ".flv", ".wmv"];

// POST with action=init — create upload session
// POST with action=chunk — append chunk to file
// POST with action=complete — finalize and start pipeline
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // JSON actions for chunked upload
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { action } = body;

      if (action === "init") {
        const { fileName, fileSize, spaceId } = body;
        const ext = path.extname(fileName || "").toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext) && ext !== "") {
          return NextResponse.json({ error: `Unsupported format "${ext}"` }, { status: 400 });
        }

        const runId = randomUUID().slice(0, 8);
        const outputDir = path.join(getOutputDir(), runId);
        await mkdir(outputDir, { recursive: true });

        const safeName = (fileName || "video.mov").replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = path.join(outputDir, safeName);
        await writeFile(filePath, Buffer.alloc(0)); // create empty file

        return NextResponse.json({ uploadId: runId, filePath: safeName, outputDir });
      }

      if (action === "complete") {
        const { uploadId, fileName, spaceId } = body;
        const outputDir = path.join(getOutputDir(), uploadId);
        const safeName = (fileName || "video.mov").replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = path.join(outputDir, safeName);

        // Verify file exists and has content
        const fileStat = await stat(filePath).catch(() => null);
        if (!fileStat || fileStat.size === 0) {
          return NextResponse.json({ error: "Upload incomplete — no data received" }, { status: 400 });
        }

        const localUrl = `file://${filePath.replace(/\\/g, "/")}`;
        const config = await getEffectiveConfig();

        const run = {
          runId: uploadId,
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
        if (config.captionStyle) captionStyleB64 = Buffer.from(JSON.stringify(config.captionStyle)).toString("base64");
        let scoringWeightsB64: string | undefined;
        if (config.scoringWeights) scoringWeightsB64 = Buffer.from(JSON.stringify(config.scoringWeights)).toString("base64");

        const { pid } = await spawnPipeline({
          url: localUrl,
          runId: uploadId,
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

        if (pid) await updateRun(uploadId, { pid });

        return NextResponse.json({ runId: uploadId, outputDir, fileSize: fileStat.size }, { status: 201 });
      }

      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Binary chunk upload: PUT-style with headers
    const uploadId = req.headers.get("x-upload-id");
    const fileName = req.headers.get("x-file-name") || "video.mov";

    if (!uploadId) {
      return NextResponse.json({ error: "x-upload-id header required" }, { status: 400 });
    }

    const outputDir = path.join(getOutputDir(), uploadId);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(outputDir, safeName);

    // Stream the body to disk
    const body = req.body;
    if (!body) {
      return NextResponse.json({ error: "No body" }, { status: 400 });
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) chunks.push(result.value);
      done = result.done;
    }

    const buffer = Buffer.concat(chunks);
    await appendFile(filePath, buffer);

    const fileStat = await stat(filePath);
    return NextResponse.json({ received: buffer.length, totalSize: fileStat.size });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
