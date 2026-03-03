import { NextRequest, NextResponse } from "next/server";
import { getRun, getManifest } from "@/lib/run-store";
import { getCliRoot, getRerenderScript } from "@/lib/paths";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const isProduction = process.env.CLIPBOT_PRODUCTION === "1";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const manifest = await getManifest(run.outputDir);
  if (!manifest?.clips?.length) {
    return NextResponse.json({ error: "No clips to re-render" }, { status: 400 });
  }
  if (!manifest.download?.filePath) {
    return NextResponse.json({ error: "Source video not found in manifest" }, { status: 400 });
  }

  const body = await req.json();
  const { clipIndex, backgroundFillStyle, captionStyle, trimStart, trimEnd } = body;

  const clip = manifest.clips.find((c) => c.momentIndex === clipIndex);
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const moment = manifest.moments?.find((m) => m.index === clipIndex);
  if (!moment) {
    return NextResponse.json({ error: "Moment data not found" }, { status: 404 });
  }

  try {
    const clipbotRoot = getCliRoot();
    const scriptPath = getRerenderScript();

    // Write a re-render job file that a small script will pick up
    // This avoids re-running the entire pipeline
    const jobDir = path.join(run.outputDir, "rerender");
    await mkdir(jobDir, { recursive: true });

    const job = {
      sourceVideo: manifest.download.filePath,
      outputDir: run.outputDir,
      moment: {
        index: moment.index,
        title: moment.title,
        startSeconds: moment.startSeconds,
        endSeconds: moment.endSeconds,
        durationSeconds: moment.durationSeconds,
        hookText: moment.hookText,
      },
      wordTimestamps: manifest.wordTimestamps ?? [],
      backgroundFillStyle: backgroundFillStyle ?? "blurred-zoom",
      captionStyle: captionStyle ?? null,
      trimStart: trimStart ?? 0,
      trimEnd: trimEnd ?? clip.durationSeconds,
      padBefore: 1.5,
      padAfter: 0.5,
    };

    const jobPath = path.join(jobDir, `job_${clipIndex}.json`);
    await writeFile(jobPath, JSON.stringify(job, null, 2), "utf-8");

    const logPath = path.join(jobDir, `clip_${clipIndex}.log`);

    const fullCommand = isProduction
      ? `node "${scriptPath}" "${jobPath}" >"${logPath}" 2>&1`
      : `npx tsx --tsconfig "${path.join(clipbotRoot, "tsconfig.json")}" "${scriptPath}" "${jobPath}" >"${logPath}" 2>&1`;

    const child = spawn(fullCommand, [], {
      cwd: clipbotRoot,
      stdio: "ignore",
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: "Re-render started (clip only, no re-download)",
      pid: child.pid,
      clipIndex,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
