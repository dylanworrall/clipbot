import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { RUNS_FILE, getOutputDir } from "./paths";

export interface RunRecord {
  runId: string;
  sourceUrl: string;
  status: string;
  pid?: number;
  spaceId?: string;
  options: {
    quality: string;
    maxClips: number;
    minScore: number;
    maxDuration: number;
    platforms: string[];
    subtitles: boolean;
    niche: string;
    backgroundFillStyle?: string;
  };
  startedAt: string;
  completedAt?: string;
  outputDir: string;
}

/** Mark runs stuck in active states for >10 minutes as failed */
export async function markStaleRunsFailed(): Promise<void> {
  const runs = await listRuns();
  const staleThreshold = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();
  let changed = false;

  for (const run of runs) {
    if (
      ["downloading", "transcribing", "analyzing", "clipping"].includes(run.status) &&
      now - new Date(run.startedAt).getTime() > staleThreshold
    ) {
      // Check if manifest exists with a real status
      const manifest = await getManifest(run.outputDir);
      if (manifest && !["downloading", "transcribing", "analyzing", "clipping"].includes(manifest.status)) {
        run.status = manifest.status;
        if (manifest.completedAt) run.completedAt = manifest.completedAt;
      } else {
        run.status = "failed";
      }
      changed = true;
    }
  }

  if (changed) {
    await writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  }
}

/** Find an existing run for the same video URL that is completed or actively running */
export async function findExistingRun(
  sourceUrl: string
): Promise<RunRecord | null> {
  const runs = await listRuns();
  // Return completed run for this URL (most recent first — list is already sorted)
  return (
    runs.find(
      (r) =>
        r.sourceUrl === sourceUrl &&
        (r.status === "complete" ||
          ["downloading", "transcribing", "analyzing", "clipping", "publishing"].includes(r.status))
    ) ?? null
  );
}

export async function listRuns(): Promise<RunRecord[]> {
  try {
    const raw = await readFile(RUNS_FILE, "utf-8");
    return JSON.parse(raw) as RunRecord[];
  } catch {
    return [];
  }
}

export async function getRun(runId: string): Promise<RunRecord | null> {
  const runs = await listRuns();
  return runs.find((r) => r.runId === runId) ?? null;
}

export async function createRun(run: RunRecord): Promise<void> {
  const runs = await listRuns();
  runs.unshift(run);
  await writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
}

export async function updateRun(
  runId: string,
  updates: Partial<RunRecord>
): Promise<void> {
  const runs = await listRuns();
  const idx = runs.findIndex((r) => r.runId === runId);
  if (idx !== -1) {
    runs[idx] = { ...runs[idx], ...updates };
    await writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  }
}

export interface PipelineManifest {
  id: string;
  sourceUrl: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  download?: {
    filePath: string;
    filename: string;
    fileSize: number;
    quality: string;
    durationSeconds: number;
  };
  transcript?: Array<{
    startMs: number;
    endMs: number;
    startFormatted: string;
    endFormatted: string;
    text: string;
  }>;
  wordTimestamps?: Array<{
    word: string;
    startMs: number;
    endMs: number;
  }>;
  moments?: Array<{
    index: number;
    title: string;
    description: string;
    hookText: string;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    viralityScore: number;
    reasoning: string;
    hashtags: string[];
    category: string;
  }>;
  clips?: Array<{
    momentIndex: number;
    title: string;
    filePath: string;
    rawFilePath?: string;
    thumbnailPath: string;
    durationSeconds: number;
    fileSizeBytes: number;
    resolution: { width: number; height: number };
  }>;
  posts?: Array<{
    clipIndex: number;
    postId: string;
    platforms: Array<{
      platform: string;
      status: string;
      url?: string;
      error?: string;
    }>;
  }>;
  error?: { step: string; message: string };
}

export async function getManifest(
  outputDir: string
): Promise<PipelineManifest | null> {
  try {
    const filePath = path.join(outputDir, "manifest.json");
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as PipelineManifest;
  } catch {
    return null;
  }
}

/** Scan clipbot-output directories for any manifests not tracked in runs.json */
export async function syncRunsFromOutput(): Promise<void> {
  const outputBase = getOutputDir();
  try {
    const dirs = await readdir(outputBase, { withFileTypes: true });
    const runs = await listRuns();
    const knownIds = new Set(runs.map((r) => r.runId));

    for (const dir of dirs) {
      if (!dir.isDirectory() || knownIds.has(dir.name)) continue;
      const manifest = await getManifest(path.join(outputBase, dir.name));
      if (!manifest) continue;

      runs.push({
        runId: manifest.id,
        sourceUrl: manifest.sourceUrl,
        status: manifest.status,
        options: {
          quality: manifest.download?.quality ?? "1080",
          maxClips: 5,
          minScore: 7,
          maxDuration: 59,
          platforms: [],
          subtitles: true,
          niche: "cannabis",
        },
        startedAt: manifest.startedAt,
        completedAt: manifest.completedAt,
        outputDir: path.join(outputBase, dir.name),
      });
    }

    runs.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    await writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  } catch {
    // Output dir may not exist yet
  }
}
