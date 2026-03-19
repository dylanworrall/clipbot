import { z } from "zod";
import { listRuns, getRun, getManifest } from "@/lib/run-store";

export const processVideo = {
  name: "content_process_video",
  description: "Start the clipping pipeline on a YouTube video URL. Returns a run ID immediately — the pipeline runs asynchronously. Use content_get_run_detail to check progress.",
  inputSchema: z.object({
    url: z.string().describe("YouTube video URL to process"),
    spaceId: z.string().optional().describe("Space ID to use for settings (optional)"),
    force: z.boolean().optional().describe("Force re-processing even if already processed (default false)"),
  }),
  execute: async ({ url, spaceId, force }: { url: string; spaceId?: string; force?: boolean }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, spaceId, force: force ?? false }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error, ...(data.existingRunId && { existingRunId: data.existingRunId }), ...(data.alreadyComplete && { alreadyComplete: true }) };
    }
    return { success: true, runId: data.runId, message: "Pipeline started — use content_get_run_detail to check progress" };
  },
};

export const getRuns = {
  name: "content_get_runs",
  description: "Get recent video processing runs. Returns run ID, source URL, status, and started time. Optionally filter by status.",
  inputSchema: z.object({
    status: z.string().optional().describe("Filter by status: 'complete', 'failed', 'downloading', 'transcribing', 'analyzing', 'clipping'. Omit for all."),
    limit: z.number().optional().describe("Max number of runs to return (default 10)"),
  }),
  execute: async ({ status, limit }: { status?: string; limit?: number }) => {
    let runs = await listRuns();
    if (status) runs = runs.filter((r) => r.status === status);
    return runs.slice(0, limit || 10).map((r) => ({
      runId: r.runId, sourceUrl: r.sourceUrl, status: r.status, startedAt: r.startedAt,
      completedAt: r.completedAt ?? null, spaceId: r.spaceId ?? null,
    }));
  },
};

export const getRunDetail = {
  name: "content_get_run_detail",
  description: "Get full details for a single run including moments (with virality scores) and clips.",
  inputSchema: z.object({
    runId: z.string().describe("The run ID to get details for"),
  }),
  execute: async ({ runId }: { runId: string }) => {
    const run = await getRun(runId);
    if (!run) return { error: "Run not found" };
    const manifest = await getManifest(run.outputDir);
    return {
      runId: run.runId, sourceUrl: run.sourceUrl, status: run.status,
      startedAt: run.startedAt, completedAt: run.completedAt ?? null,
      spaceId: run.spaceId ?? null, options: run.options,
      moments: manifest?.moments?.map((m) => ({
        index: m.index, title: m.title, description: m.description, hookText: m.hookText,
        startSeconds: m.startSeconds, endSeconds: m.endSeconds, durationSeconds: m.durationSeconds,
        viralityScore: m.viralityScore, hashtags: m.hashtags, category: m.category,
      })) ?? null,
      clips: manifest?.clips?.map((c) => ({
        momentIndex: c.momentIndex, title: c.title, durationSeconds: c.durationSeconds,
        fileSizeBytes: c.fileSizeBytes, resolution: c.resolution,
      })) ?? null,
      posts: manifest?.posts ?? null, error: manifest?.error ?? null,
    };
  },
};

export const getClips = {
  name: "content_get_clips",
  description: "List generated clips across runs. Optionally filter by run ID or minimum virality score.",
  inputSchema: z.object({
    runId: z.string().optional().describe("Filter to a specific run ID (optional)"),
    minScore: z.number().optional().describe("Minimum virality score (1-10) to include (optional)"),
    limit: z.number().optional().describe("Max number of clips to return (default 20)"),
  }),
  execute: async ({ runId, minScore, limit }: { runId?: string; minScore?: number; limit?: number }) => {
    const allRuns = await listRuns();
    const targetRuns = runId ? allRuns.filter((r) => r.runId === runId) : allRuns.filter((r) => r.status === "complete");
    const clips: Array<{ runId: string; sourceUrl: string; momentIndex: number; title: string; viralityScore: number; durationSeconds: number; hashtags: string[]; category: string }> = [];
    for (const run of targetRuns) {
      const manifest = await getManifest(run.outputDir);
      if (!manifest?.clips || !manifest.moments) continue;
      for (const clip of manifest.clips) {
        const moment = manifest.moments.find((m) => m.index === clip.momentIndex);
        if (!moment || moment.viralityScore < (minScore ?? 0)) continue;
        clips.push({ runId: run.runId, sourceUrl: run.sourceUrl, momentIndex: clip.momentIndex, title: clip.title, viralityScore: moment.viralityScore, durationSeconds: clip.durationSeconds, hashtags: moment.hashtags, category: moment.category });
      }
    }
    clips.sort((a, b) => b.viralityScore - a.viralityScore);
    return clips.slice(0, limit || 20);
  },
};

export const cancelRun = {
  name: "content_cancel_run",
  description: "Cancel an in-progress pipeline run. Kills the background process and marks the run as failed.",
  inputSchema: z.object({
    runId: z.string().describe("The run ID to cancel"),
  }),
  execute: async ({ runId }: { runId: string }) => {
    const run = await getRun(runId);
    if (!run) return { error: "Run not found" };
    if (!["downloading", "transcribing", "analyzing", "clipping"].includes(run.status)) {
      return { error: `Run is not active (status: ${run.status})` };
    }
    if (run.pid) { try { process.kill(run.pid); } catch {} }
    const { updateRun } = await import("@/lib/run-store");
    await updateRun(run.runId, { status: "failed", completedAt: new Date().toISOString() });
    return { success: true, message: "Run cancelled" };
  },
};
