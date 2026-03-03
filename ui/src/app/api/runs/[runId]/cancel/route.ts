import { NextRequest, NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { getRun, updateRun } from "@/lib/run-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status === "complete" || run.status === "failed") {
    return NextResponse.json({ error: "Run already finished" }, { status: 400 });
  }

  // Kill the process tree if we have a PID
  if (run.pid) {
    try {
      if (process.platform === "win32") {
        // Windows: kill process tree
        execSync(`taskkill /PID ${run.pid} /T /F`, { stdio: "ignore" });
      } else {
        // Unix: kill process group
        process.kill(-run.pid, "SIGTERM");
      }
    } catch {
      // Process may already be dead
    }
  }

  await updateRun(runId, {
    status: "failed",
  });

  return NextResponse.json({ success: true, runId });
}
