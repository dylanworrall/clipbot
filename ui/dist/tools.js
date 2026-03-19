"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/paths.ts
function getClipbotHome() {
  return process.env.CLIPBOT_HOME || import_node_path.default.join((0, import_node_os.homedir)(), ".clipbot");
}
function resolveDataDir() {
  const homeDataDir = import_node_path.default.join(getClipbotHome(), "data");
  if (isProduction || (0, import_node_fs.existsSync)(homeDataDir)) {
    return homeDataDir;
  }
  return import_node_path.default.join(process.cwd(), "data");
}
function getOutputDir() {
  if (process.env.CLIPBOT_OUTPUT_DIR) return process.env.CLIPBOT_OUTPUT_DIR;
  if (isProduction) return import_node_path.default.join(getClipbotHome(), "output");
  return import_node_path.default.resolve(process.cwd(), "..", "clipbot-output");
}
var import_node_path, import_node_os, import_node_fs, isProduction, DATA_DIR, RUNS_FILE, CHAT_FILE, CREATORS_FILE, NOTIFICATIONS_FILE, SETTINGS_FILE, SCHEDULE_FILE, SPACES_FILE, AUTOSCORE_FILE, CONFIG_PATH, ENV_PATH;
var init_paths = __esm({
  "src/lib/paths.ts"() {
    "use strict";
    import_node_path = __toESM(require("node:path"));
    import_node_os = require("node:os");
    import_node_fs = require("node:fs");
    isProduction = process.env.CLIPBOT_PRODUCTION === "1";
    DATA_DIR = resolveDataDir();
    RUNS_FILE = import_node_path.default.join(DATA_DIR, "runs.json");
    CHAT_FILE = import_node_path.default.join(DATA_DIR, "chat-messages.json");
    CREATORS_FILE = import_node_path.default.join(DATA_DIR, "creators.json");
    NOTIFICATIONS_FILE = import_node_path.default.join(DATA_DIR, "notifications.json");
    SETTINGS_FILE = import_node_path.default.join(DATA_DIR, "settings.json");
    SCHEDULE_FILE = import_node_path.default.join(DATA_DIR, "scheduled.json");
    SPACES_FILE = import_node_path.default.join(DATA_DIR, "spaces.json");
    AUTOSCORE_FILE = import_node_path.default.join(DATA_DIR, "autoscore.json");
    CONFIG_PATH = isProduction ? import_node_path.default.join(getClipbotHome(), "config.json") : import_node_path.default.resolve(process.cwd(), "..", "clipbot.config.json");
    ENV_PATH = isProduction ? import_node_path.default.join(getClipbotHome(), ".env") : import_node_path.default.resolve(process.cwd(), "..", ".env");
  }
});

// src/lib/run-store.ts
var run_store_exports = {};
__export(run_store_exports, {
  createRun: () => createRun,
  findExistingRun: () => findExistingRun,
  getManifest: () => getManifest,
  getRun: () => getRun,
  listRuns: () => listRuns,
  markStaleRunsFailed: () => markStaleRunsFailed,
  syncRunsFromOutput: () => syncRunsFromOutput,
  updateRun: () => updateRun
});
async function markStaleRunsFailed() {
  const now = Date.now();
  if (now - lastStaleCheckTime < 6e4) return;
  lastStaleCheckTime = now;
  const runs = await listRuns();
  const staleThreshold = 10 * 60 * 1e3;
  let changed = false;
  for (const run of runs) {
    if (["downloading", "transcribing", "analyzing", "clipping"].includes(run.status) && now - new Date(run.startedAt).getTime() > staleThreshold) {
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
    await (0, import_promises3.writeFile)(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  }
}
async function findExistingRun(sourceUrl) {
  const runs = await listRuns();
  return runs.find(
    (r) => r.sourceUrl === sourceUrl && (r.status === "complete" || ["downloading", "transcribing", "analyzing", "clipping", "publishing"].includes(r.status))
  ) ?? null;
}
async function listRuns() {
  try {
    const raw = await (0, import_promises3.readFile)(RUNS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function getRun(runId) {
  const runs = await listRuns();
  return runs.find((r) => r.runId === runId) ?? null;
}
async function createRun(run) {
  const runs = await listRuns();
  runs.unshift(run);
  await (0, import_promises3.writeFile)(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
}
async function updateRun(runId, updates) {
  const runs = await listRuns();
  const idx = runs.findIndex((r) => r.runId === runId);
  if (idx !== -1) {
    runs[idx] = { ...runs[idx], ...updates };
    await (0, import_promises3.writeFile)(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  }
}
async function getManifest(outputDir) {
  try {
    const filePath = import_node_path2.default.join(outputDir, "manifest.json");
    const raw = await (0, import_promises3.readFile)(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function syncRunsFromOutput() {
  const now = Date.now();
  if (now - lastSyncTime < 3e4) return;
  lastSyncTime = now;
  const outputBase = getOutputDir();
  try {
    const dirs = await (0, import_promises3.readdir)(outputBase, { withFileTypes: true });
    const runs = await listRuns();
    const knownIds = new Set(runs.map((r) => r.runId));
    for (const dir of dirs) {
      if (!dir.isDirectory() || knownIds.has(dir.name)) continue;
      const manifest = await getManifest(import_node_path2.default.join(outputBase, dir.name));
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
          niche: "cannabis"
        },
        startedAt: manifest.startedAt,
        completedAt: manifest.completedAt,
        outputDir: import_node_path2.default.join(outputBase, dir.name)
      });
    }
    runs.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    await (0, import_promises3.writeFile)(RUNS_FILE, JSON.stringify(runs, null, 2), "utf-8");
  } catch {
  }
}
var import_promises3, import_node_path2, lastSyncTime, lastStaleCheckTime;
var init_run_store = __esm({
  "src/lib/run-store.ts"() {
    "use strict";
    import_promises3 = require("node:fs/promises");
    import_node_path2 = __toESM(require("node:path"));
    init_paths();
    lastSyncTime = 0;
    lastStaleCheckTime = 0;
  }
});

// src/lib/ai/tools/index.ts
var index_exports = {};
__export(index_exports, {
  tools: () => tools
});
module.exports = __toCommonJS(index_exports);

// src/lib/ai/tools/workspace.ts
var import_zod = require("zod");

// src/lib/space-store.ts
var import_promises2 = require("node:fs/promises");

// src/lib/settings-store.ts
var import_promises = require("node:fs/promises");

// src/lib/types.ts
var DEFAULT_CAPTION_STYLE = {
  fontFamily: "Arial",
  fontSize: 72,
  activeColor: "#FFD700",
  inactiveColor: "#FFFFFF99",
  outlineColor: "#000000",
  position: "bottom",
  maxWordsPerLine: 5,
  animationPreset: "typewriter",
  hookFontSize: 56,
  hookColor: "#FFFFFF",
  hookBgColor: "rgba(0,0,0,0.7)",
  hookPosition: "top"
};
var DEFAULT_SCORING_WEIGHTS = {
  hook: 3,
  standalone: 3,
  controversy: 3,
  education: 3,
  emotion: 1.5,
  twist: 1.5,
  quotable: 1,
  visual: 1,
  nicheBonus: 1
};

// src/lib/settings-store.ts
init_paths();
async function getSettings() {
  try {
    const raw = await (0, import_promises.readFile)(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function saveSettings(settings) {
  const existing = await getSettings();
  const merged = { ...existing, ...settings };
  await (0, import_promises.writeFile)(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
}
function parseEnvFile(content) {
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}
async function getEffectiveConfig() {
  const uiSettings = await getSettings();
  let parentEnv = {};
  try {
    const envRaw = await (0, import_promises.readFile)(ENV_PATH, "utf-8");
    parentEnv = parseEnvFile(envRaw);
  } catch {
  }
  const claudeApiKey = process.env.ANTHROPIC_API_KEY || parentEnv.ANTHROPIC_API_KEY;
  const lateApiKey = process.env.LATE_API_KEY || parentEnv.LATE_API_KEY;
  try {
    const raw = await (0, import_promises.readFile)(CONFIG_PATH, "utf-8");
    const parentConfig = JSON.parse(raw);
    return {
      accounts: parentConfig.accounts,
      claudeModel: parentConfig.claudeModel,
      claudeTemperature: parentConfig.claudeTemperature,
      defaultQuality: parentConfig.defaultQuality,
      defaultMaxClips: parentConfig.defaultMaxClips,
      defaultMinScore: parentConfig.defaultMinScore,
      defaultMaxDuration: parentConfig.defaultMaxDuration,
      defaultPlatforms: parentConfig.defaultPlatforms,
      niche: parentConfig.niche,
      subtitles: parentConfig.subtitles,
      padBefore: parentConfig.padBefore,
      padAfter: parentConfig.padAfter,
      backgroundFillStyle: parentConfig.backgroundFillStyle ?? "blurred-zoom",
      captionMode: parentConfig.captionMode ?? "overlay",
      captionStyle: DEFAULT_CAPTION_STYLE,
      scoringWeights: DEFAULT_SCORING_WEIGHTS,
      claudeApiKey,
      lateApiKey,
      ...uiSettings
    };
  } catch {
    return {
      claudeApiKey,
      lateApiKey,
      claudeModel: "claude-sonnet-4-20250514",
      defaultQuality: "1080",
      defaultMaxClips: 5,
      defaultMinScore: 7,
      defaultMaxDuration: 59,
      defaultPlatforms: ["tiktok", "youtube", "instagram"],
      niche: "cannabis",
      subtitles: true,
      padBefore: 1.5,
      padAfter: 0.5,
      backgroundFillStyle: "blurred-zoom",
      captionMode: "overlay",
      captionStyle: DEFAULT_CAPTION_STYLE,
      scoringWeights: DEFAULT_SCORING_WEIGHTS,
      ...uiSettings
    };
  }
}

// src/lib/space-store.ts
init_paths();
async function getSpaces() {
  try {
    const raw = await (0, import_promises2.readFile)(SPACES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function createSpace(space) {
  const spaces = await getSpaces();
  spaces.unshift(space);
  await (0, import_promises2.writeFile)(SPACES_FILE, JSON.stringify(spaces, null, 2), "utf-8");
}

// src/lib/ai/tools/workspace.ts
var listSpaces = {
  name: "content_list_spaces",
  description: "List all spaces (workspaces). Returns each space's id, name, icon, description, and account/creator counts.",
  inputSchema: import_zod.z.object({}),
  execute: async () => {
    const spaces = await getSpaces();
    return spaces.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      description: s.description,
      accountCount: s.accounts?.length ?? 0,
      creatorCount: s.creators?.length ?? 0
    }));
  }
};
var createSpaceTool = {
  name: "content_create_space",
  description: "Create a new space (workspace) with a name, optional icon emoji, and optional description.",
  inputSchema: import_zod.z.object({
    name: import_zod.z.string().describe("Name of the space"),
    icon: import_zod.z.string().optional().describe("Emoji icon for the space (e.g. '\u{1F3AE}'). Defaults to '\u{1F4C1}'"),
    description: import_zod.z.string().optional().describe("Short description of the space")
  }),
  execute: async ({ name, icon, description }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const space = {
      id: crypto.randomUUID(),
      name,
      icon: icon || "\u{1F4C1}",
      description: description || "",
      settings: {},
      accounts: [],
      creators: [],
      createdAt: now,
      updatedAt: now
    };
    await createSpace(space);
    return { success: true, id: space.id, name: space.name, icon: space.icon };
  }
};
var getSettings2 = {
  name: "content_get_settings",
  description: "Get the current app settings including model, default quality, platforms, niche, and more.",
  inputSchema: import_zod.z.object({}),
  execute: async () => {
    const config = await getEffectiveConfig();
    return {
      claudeModel: config.claudeModel,
      defaultQuality: config.defaultQuality,
      defaultMaxClips: config.defaultMaxClips,
      defaultMinScore: config.defaultMinScore,
      defaultMaxDuration: config.defaultMaxDuration,
      defaultPlatforms: config.defaultPlatforms,
      niche: config.niche,
      subtitles: config.subtitles,
      backgroundFillStyle: config.backgroundFillStyle,
      captionMode: config.captionMode
    };
  }
};

// src/lib/ai/tools/pipeline.ts
var import_zod2 = require("zod");
init_run_store();
var processVideo = {
  name: "content_process_video",
  description: "Start the clipping pipeline on a YouTube video URL. Returns a run ID immediately \u2014 the pipeline runs asynchronously. Use content_get_run_detail to check progress.",
  inputSchema: import_zod2.z.object({
    url: import_zod2.z.string().describe("YouTube video URL to process"),
    spaceId: import_zod2.z.string().optional().describe("Space ID to use for settings (optional)"),
    force: import_zod2.z.boolean().optional().describe("Force re-processing even if already processed (default false)")
  }),
  execute: async ({ url, spaceId, force }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, spaceId, force: force ?? false })
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error, ...data.existingRunId && { existingRunId: data.existingRunId }, ...data.alreadyComplete && { alreadyComplete: true } };
    }
    return { success: true, runId: data.runId, message: "Pipeline started \u2014 use content_get_run_detail to check progress" };
  }
};
var getRuns = {
  name: "content_get_runs",
  description: "Get recent video processing runs. Returns run ID, source URL, status, and started time. Optionally filter by status.",
  inputSchema: import_zod2.z.object({
    status: import_zod2.z.string().optional().describe("Filter by status: 'complete', 'failed', 'downloading', 'transcribing', 'analyzing', 'clipping'. Omit for all."),
    limit: import_zod2.z.number().optional().describe("Max number of runs to return (default 10)")
  }),
  execute: async ({ status, limit }) => {
    let runs = await listRuns();
    if (status) runs = runs.filter((r) => r.status === status);
    return runs.slice(0, limit || 10).map((r) => ({
      runId: r.runId,
      sourceUrl: r.sourceUrl,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt ?? null,
      spaceId: r.spaceId ?? null
    }));
  }
};
var getRunDetail = {
  name: "content_get_run_detail",
  description: "Get full details for a single run including moments (with virality scores) and clips.",
  inputSchema: import_zod2.z.object({
    runId: import_zod2.z.string().describe("The run ID to get details for")
  }),
  execute: async ({ runId }) => {
    const run = await getRun(runId);
    if (!run) return { error: "Run not found" };
    const manifest = await getManifest(run.outputDir);
    return {
      runId: run.runId,
      sourceUrl: run.sourceUrl,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt ?? null,
      spaceId: run.spaceId ?? null,
      options: run.options,
      moments: manifest?.moments?.map((m) => ({
        index: m.index,
        title: m.title,
        description: m.description,
        hookText: m.hookText,
        startSeconds: m.startSeconds,
        endSeconds: m.endSeconds,
        durationSeconds: m.durationSeconds,
        viralityScore: m.viralityScore,
        hashtags: m.hashtags,
        category: m.category
      })) ?? null,
      clips: manifest?.clips?.map((c) => ({
        momentIndex: c.momentIndex,
        title: c.title,
        durationSeconds: c.durationSeconds,
        fileSizeBytes: c.fileSizeBytes,
        resolution: c.resolution
      })) ?? null,
      posts: manifest?.posts ?? null,
      error: manifest?.error ?? null
    };
  }
};
var getClips = {
  name: "content_get_clips",
  description: "List generated clips across runs. Optionally filter by run ID or minimum virality score.",
  inputSchema: import_zod2.z.object({
    runId: import_zod2.z.string().optional().describe("Filter to a specific run ID (optional)"),
    minScore: import_zod2.z.number().optional().describe("Minimum virality score (1-10) to include (optional)"),
    limit: import_zod2.z.number().optional().describe("Max number of clips to return (default 20)")
  }),
  execute: async ({ runId, minScore, limit }) => {
    const allRuns = await listRuns();
    const targetRuns = runId ? allRuns.filter((r) => r.runId === runId) : allRuns.filter((r) => r.status === "complete");
    const clips = [];
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
  }
};
var cancelRun = {
  name: "content_cancel_run",
  description: "Cancel an in-progress pipeline run. Kills the background process and marks the run as failed.",
  inputSchema: import_zod2.z.object({
    runId: import_zod2.z.string().describe("The run ID to cancel")
  }),
  execute: async ({ runId }) => {
    const run = await getRun(runId);
    if (!run) return { error: "Run not found" };
    if (!["downloading", "transcribing", "analyzing", "clipping"].includes(run.status)) {
      return { error: `Run is not active (status: ${run.status})` };
    }
    if (run.pid) {
      try {
        process.kill(run.pid);
      } catch {
      }
    }
    const { updateRun: updateRun2 } = await Promise.resolve().then(() => (init_run_store(), run_store_exports));
    await updateRun2(run.runId, { status: "failed", completedAt: (/* @__PURE__ */ new Date()).toISOString() });
    return { success: true, message: "Run cancelled" };
  }
};

// src/lib/ai/tools/publishing.ts
var import_zod3 = require("zod");

// src/lib/schedule-store.ts
var import_promises4 = require("node:fs/promises");
init_paths();
async function getScheduledPosts() {
  try {
    const raw = await (0, import_promises4.readFile)(SCHEDULE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function saveScheduledPosts(posts) {
  await (0, import_promises4.writeFile)(SCHEDULE_FILE, JSON.stringify(posts, null, 2), "utf-8");
}
async function addScheduledPost(post) {
  const posts = await getScheduledPosts();
  posts.push(post);
  await saveScheduledPosts(posts);
}
async function updateScheduledPost(id, updates) {
  const posts = await getScheduledPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates };
  await saveScheduledPosts(posts);
  return posts[idx];
}

// src/lib/late-client.ts
var LATE_BASE = "https://getlate.dev/api/v1";
async function lateApiFetch(path3, options) {
  const config = await getEffectiveConfig();
  if (!config.lateApiKey) {
    throw new Error("Late API key not configured");
  }
  const res = await fetch(`${LATE_BASE}${path3}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.lateApiKey}`,
      "Content-Type": "application/json",
      ...options?.headers
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Late API error ${res.status}: ${body}`);
  }
  return res;
}
async function listPosts(filters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.platform) params.set("platform", filters.platform);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const res = await lateApiFetch(`/posts${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  return data.posts ?? [];
}
async function getPost(postId) {
  const res = await lateApiFetch(`/posts/${postId}`);
  const data = await res.json();
  return data.post ?? data;
}
async function updatePost(postId, updates) {
  const res = await lateApiFetch(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
  const data = await res.json();
  return data.post ?? data;
}
async function deletePost(postId) {
  await lateApiFetch(`/posts/${postId}`, { method: "DELETE" });
}
async function listLateAccounts() {
  const res = await lateApiFetch("/accounts");
  const data = await res.json();
  return (data.accounts ?? []).map((a) => ({
    _id: a._id,
    platform: a.platform,
    name: a.displayName ?? a.name ?? a.username ?? a._id
  }));
}

// src/lib/ai/tools/publishing.ts
var publishClip = {
  name: "content_publish_clip",
  description: "Publish a clip to social platforms via getLate.dev. Supports scheduling for later.",
  inputSchema: import_zod3.z.object({
    runId: import_zod3.z.string().describe("The run ID containing the clip"),
    clipIndex: import_zod3.z.number().describe("Index of the clip within the run (0-based)"),
    platforms: import_zod3.z.array(import_zod3.z.string()).describe("Platforms to publish to (e.g. ['tiktok', 'youtube', 'instagram'])"),
    scheduledFor: import_zod3.z.string().optional().describe("ISO 8601 date-time to schedule the post for (optional, publishes immediately if omitted)")
  }),
  execute: async ({ runId, clipIndex, platforms, scheduledFor }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs/${runId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipIndices: [clipIndex], platforms, scheduledFor })
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true, results: data.results };
  }
};
var scheduleClip = {
  name: "content_schedule_clip",
  description: "Schedule a clip for posting at a specific date/time.",
  inputSchema: import_zod3.z.object({
    runId: import_zod3.z.string().describe("The run ID containing the clip"),
    clipIndex: import_zod3.z.number().describe("Index of the clip within the run (0-based)"),
    clipTitle: import_zod3.z.string().describe("Title/name for the clip"),
    platforms: import_zod3.z.array(import_zod3.z.string()).describe("Platforms to post to"),
    scheduledFor: import_zod3.z.string().describe("ISO 8601 date-time string for when to post")
  }),
  execute: async ({ runId, clipIndex, clipTitle, platforms, scheduledFor }) => {
    const post = { id: crypto.randomUUID(), runId, clipIndex, clipTitle, platforms, scheduledFor, status: "scheduled", createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    await addScheduledPost(post);
    return { success: true, id: post.id, scheduledFor: post.scheduledFor };
  }
};
var listScheduled = {
  name: "content_list_scheduled",
  description: "List all scheduled posts with clip title, platforms, scheduled time, and status.",
  inputSchema: import_zod3.z.object({}),
  execute: async () => {
    const posts = await getScheduledPosts();
    return posts.map((p) => ({ id: p.id, clipTitle: p.clipTitle, platforms: p.platforms, scheduledFor: p.scheduledFor, status: p.status, runId: p.runId }));
  }
};
var cancelScheduled = {
  name: "content_cancel_scheduled",
  description: "Cancel a scheduled post so it won't be published.",
  inputSchema: import_zod3.z.object({
    postId: import_zod3.z.string().describe("The scheduled post ID to cancel")
  }),
  execute: async ({ postId }) => {
    const updated = await updateScheduledPost(postId, { status: "cancelled" });
    if (!updated) return { error: "Scheduled post not found" };
    return { success: true, id: updated.id, status: "cancelled" };
  }
};
var listPostsTool = {
  name: "content_list_posts",
  description: "List posts from getLate.dev. Optionally filter by status or platform.",
  inputSchema: import_zod3.z.object({
    status: import_zod3.z.string().optional().describe("Filter: 'draft', 'scheduled', 'published'"),
    platform: import_zod3.z.string().optional().describe("Filter: 'tiktok', 'youtube', 'instagram', 'facebook'"),
    limit: import_zod3.z.number().optional().describe("Max posts to return (default 20)")
  }),
  execute: async ({ status, platform, limit }) => {
    const posts = await listPosts({ status, platform, limit: limit || 20 });
    return posts.map((p) => ({ id: p._id, content: p.content, status: p.status, platforms: p.platforms.map((pl) => pl.platform), scheduledFor: p.scheduledFor ?? null, publishedAt: p.publishedAt ?? null }));
  }
};
var getPostAnalytics = {
  name: "content_get_post_analytics",
  description: "Get performance metrics for a post: impressions, views, likes, comments, shares, engagement rate.",
  inputSchema: import_zod3.z.object({
    postId: import_zod3.z.string().describe("The Late.dev post ID")
  }),
  execute: async ({ postId }) => {
    const post = await getPost(postId);
    return { id: post._id, content: post.content, status: post.status, publishedAt: post.publishedAt ?? null, analytics: post.analytics ?? { impressions: 0, views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 } };
  }
};
var updatePostTool = {
  name: "content_update_post",
  description: "Update a draft or scheduled post. Can change content text or reschedule.",
  inputSchema: import_zod3.z.object({
    postId: import_zod3.z.string().describe("The Late.dev post ID to update"),
    content: import_zod3.z.string().optional().describe("New content/caption text"),
    scheduledFor: import_zod3.z.string().optional().describe("New ISO 8601 schedule time")
  }),
  execute: async ({ postId, content, scheduledFor }) => {
    const updates = {};
    if (content) updates.content = content;
    if (scheduledFor) updates.scheduledFor = scheduledFor;
    const updated = await updatePost(postId, updates);
    return { success: true, id: updated._id, content: updated.content, status: updated.status, scheduledFor: updated.scheduledFor ?? null };
  }
};
var deletePostTool = {
  name: "content_delete_post",
  description: "Delete a draft or scheduled post from getLate.dev.",
  inputSchema: import_zod3.z.object({
    postId: import_zod3.z.string().describe("The Late.dev post ID to delete")
  }),
  execute: async ({ postId }) => {
    await deletePost(postId);
    return { success: true, message: "Post deleted" };
  }
};
var listAccountsTool = {
  name: "content_list_accounts",
  description: "List connected social media accounts from getLate.dev.",
  inputSchema: import_zod3.z.object({}),
  execute: async () => {
    const accounts = await listLateAccounts();
    return accounts.map((a) => ({ id: a._id, platform: a.platform, name: a.name }));
  }
};

// src/lib/ai/tools/creators.ts
var import_zod4 = require("zod");

// src/lib/creator-store.ts
var import_promises5 = require("node:fs/promises");
init_paths();
async function getCreators() {
  try {
    const raw = await (0, import_promises5.readFile)(CREATORS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function saveCreators(creators) {
  await (0, import_promises5.writeFile)(CREATORS_FILE, JSON.stringify(creators, null, 2), "utf-8");
}
async function addCreator(creator) {
  const creators = await getCreators();
  creators.push(creator);
  await saveCreators(creators);
}
async function removeCreator(id) {
  const creators = await getCreators();
  const filtered = creators.filter((c) => c.id !== id);
  if (filtered.length === creators.length) return false;
  await saveCreators(filtered);
  return true;
}

// src/lib/notification-store.ts
var import_promises6 = require("node:fs/promises");
init_paths();
async function getNotifications() {
  try {
    const raw = await (0, import_promises6.readFile)(NOTIFICATIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// src/lib/youtube-rss.ts
async function fetchChannelFeedWithMeta(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Failed to fetch RSS feed: ${res.status}`);
  const xml = await res.text();
  const videos = [];
  const headerXml = xml.split("<entry>")[0] ?? "";
  const channelName = extractTag(headerXml, "name") ?? "";
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const videoId = extractTag(entry, "yt:videoId");
    const title = extractTag(entry, "title");
    const published = extractTag(entry, "published");
    if (videoId && title) {
      videos.push({
        videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: published ?? (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  return { channelName, videos };
}
function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return match?.[1] ?? null;
}

// src/lib/ai/tools/creators.ts
var listCreators = {
  name: "content_list_creators",
  description: "List all tracked YouTube creators with channel name, URL, and auto-process setting.",
  inputSchema: import_zod4.z.object({}),
  execute: async () => {
    const creators = await getCreators();
    return creators.map((c) => ({ id: c.id, channelName: c.channelName, channelUrl: c.channelUrl, autoProcess: c.autoProcess, lastCheckedAt: c.lastCheckedAt ?? null }));
  }
};
var addCreatorTool = {
  name: "content_add_creator",
  description: "Add a YouTube creator to track for new videos.",
  inputSchema: import_zod4.z.object({
    channelName: import_zod4.z.string().describe("YouTube channel name"),
    channelUrl: import_zod4.z.string().describe("YouTube channel URL (e.g. https://youtube.com/@channelname)"),
    channelId: import_zod4.z.string().optional().describe("YouTube channel ID (optional)"),
    autoProcess: import_zod4.z.boolean().optional().describe("Automatically process new videos (default false)")
  }),
  execute: async ({ channelName, channelUrl, channelId, autoProcess }) => {
    const creator = { id: crypto.randomUUID(), channelId: channelId || "", channelName, channelUrl, autoProcess: autoProcess ?? false, defaultOptions: {}, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    await addCreator(creator);
    return { success: true, id: creator.id, channelName: creator.channelName };
  }
};
var removeCreatorTool = {
  name: "content_remove_creator",
  description: "Stop tracking a YouTube creator.",
  inputSchema: import_zod4.z.object({
    creatorId: import_zod4.z.string().describe("The creator ID to remove")
  }),
  execute: async ({ creatorId }) => {
    const removed = await removeCreator(creatorId);
    if (!removed) return { error: "Creator not found" };
    return { success: true, message: "Creator removed" };
  }
};
var checkCreatorVideos = {
  name: "content_check_creator_videos",
  description: "Fetch a tracked creator's latest YouTube videos via RSS feed. Returns up to 10 recent videos.",
  inputSchema: import_zod4.z.object({
    creatorId: import_zod4.z.string().describe("The creator ID to check")
  }),
  execute: async ({ creatorId }) => {
    const creators = await getCreators();
    const creator = creators.find((c) => c.id === creatorId);
    if (!creator) return { error: "Creator not found" };
    if (!creator.channelId) return { error: "Creator has no channel ID \u2014 re-add with a channel ID" };
    const feed = await fetchChannelFeedWithMeta(creator.channelId);
    return { channelName: feed.channelName || creator.channelName, videos: feed.videos.slice(0, 10).map((v) => ({ videoId: v.videoId, title: v.title, url: v.url, publishedAt: v.publishedAt })) };
  }
};
var getNotificationsTool = {
  name: "content_get_notifications",
  description: "View new video alerts from tracked YouTube creators.",
  inputSchema: import_zod4.z.object({
    status: import_zod4.z.string().optional().describe("Filter: 'pending', 'processing', 'dismissed'"),
    limit: import_zod4.z.number().optional().describe("Max notifications to return (default 20)")
  }),
  execute: async ({ status, limit }) => {
    let notifications = await getNotifications();
    if (status) notifications = notifications.filter((n) => n.status === status);
    return notifications.slice(0, limit || 20).map((n) => ({ id: n.id, videoTitle: n.videoTitle, videoUrl: n.videoUrl, creatorName: n.creatorName, publishedAt: n.publishedAt, status: n.status, runId: n.runId ?? null }));
  }
};

// src/lib/ai/tools/autoscore.ts
var import_zod5 = require("zod");

// src/lib/autoscore-store.ts
var import_promises7 = require("node:fs/promises");
init_paths();
init_run_store();
var DEFAULT_AUTOSCORE_CONFIG = {
  enabled: false,
  learningRate: 0.15,
  minSamples: 5,
  decayFactor: 0.85
};
var CATEGORY_WEIGHT_MAP = {
  education: ["education", "standalone"],
  entertainment: ["hook", "emotion"],
  controversy: ["controversy"],
  storytelling: ["twist", "emotion"],
  howto: ["education", "visual"],
  motivation: ["quotable", "emotion"],
  news: ["hook", "standalone"],
  review: ["standalone", "education"],
  comedy: ["hook", "twist"],
  cannabis: ["nicheBonus", "education"],
  science: ["education", "twist"],
  fitness: ["visual", "hook"],
  tech: ["education", "standalone"],
  gaming: ["emotion", "hook"],
  music: ["emotion", "visual"]
};
async function loadData() {
  try {
    const raw = await (0, import_promises7.readFile)(AUTOSCORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      config: { ...DEFAULT_AUTOSCORE_CONFIG },
      feedback: [],
      updates: []
    };
  }
}
async function saveData(data) {
  await (0, import_promises7.writeFile)(AUTOSCORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}
async function collectFeedback() {
  const data = await loadData();
  const settings = await getSettings();
  const currentWeights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...settings.scoringWeights
  };
  const knownIds = new Set(data.feedback.map((f) => `${f.runId}:${f.clipIndex}`));
  const runs = await listRuns();
  const completedRuns = runs.filter((r) => r.status === "complete");
  let collected = 0;
  let skipped = 0;
  const errors = [];
  for (const run of completedRuns) {
    const manifest = await getManifest(run.outputDir);
    if (!manifest?.clips || !manifest.moments || !manifest.posts) continue;
    for (const post of manifest.posts) {
      const key = `${run.runId}:${post.clipIndex}`;
      if (knownIds.has(key)) {
        skipped++;
        continue;
      }
      const isPublished = post.platforms.some((p) => p.status === "published");
      if (!isPublished) continue;
      const clip = manifest.clips.find((c) => c.momentIndex === post.clipIndex);
      const moment = manifest.moments.find((m) => m.index === post.clipIndex);
      if (!clip || !moment) continue;
      try {
        const latePost = await getPost(post.postId);
        const analytics = latePost.analytics;
        if (!analytics || !analytics.views && !analytics.likes) {
          skipped++;
          continue;
        }
        const views = analytics.views ?? 0;
        const likes = analytics.likes ?? 0;
        const comments = analytics.comments ?? 0;
        const shares = analytics.shares ?? 0;
        const engagementRate = views > 0 ? (likes + comments) / views * 100 : 0;
        data.feedback.push({
          id: `fb-${Date.now()}-${collected}`,
          runId: run.runId,
          clipIndex: post.clipIndex,
          title: clip.title,
          category: moment.category.toLowerCase(),
          predictedScore: moment.viralityScore,
          actualMetrics: { views, likes, comments, shares },
          actualScore: 0,
          // normalized later
          engagementRate,
          weightsUsed: currentWeights,
          collectedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        knownIds.add(key);
        collected++;
      } catch (err) {
        errors.push(
          `${clip.title}: ${err instanceof Error ? err.message : "fetch failed"}`
        );
      }
    }
  }
  normalizeScores(data.feedback);
  await saveData(data);
  return { collected, skipped, errors };
}
function normalizeScores(feedback) {
  if (feedback.length === 0) return;
  const sorted = [...feedback].sort(
    (a, b) => a.engagementRate - b.engagementRate
  );
  for (let i = 0; i < sorted.length; i++) {
    const percentile = (i + 1) / sorted.length;
    sorted[i].actualScore = Math.round(percentile * 9 + 1);
  }
}
async function runLearningCycle() {
  const data = await loadData();
  const { config, feedback } = data;
  if (feedback.length < config.minSamples) {
    throw new Error(
      `Need at least ${config.minSamples} feedback entries (have ${feedback.length}). Collect more analytics first.`
    );
  }
  const settings = await getSettings();
  const oldWeights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...settings.scoringWeights
  };
  const now = Date.now();
  const weighted = feedback.map((f) => {
    const ageMs = now - new Date(f.collectedAt).getTime();
    const ageDays = ageMs / (1e3 * 60 * 60 * 24);
    const weight = Math.pow(config.decayFactor, ageDays / 7);
    return { ...f, decayWeight: weight };
  });
  const categoryErrors = {};
  for (const entry of weighted) {
    const cat = entry.category;
    if (!categoryErrors[cat]) {
      categoryErrors[cat] = { totalError: 0, totalWeight: 0 };
    }
    const error = entry.actualScore - entry.predictedScore;
    categoryErrors[cat].totalError += error * entry.decayWeight;
    categoryErrors[cat].totalWeight += entry.decayWeight;
  }
  const adjustments = {};
  const newWeights = { ...oldWeights };
  for (const [category, { totalError, totalWeight }] of Object.entries(categoryErrors)) {
    if (totalWeight === 0) continue;
    const meanError2 = totalError / totalWeight;
    const relevantWeights = CATEGORY_WEIGHT_MAP[category] ?? [];
    for (const weightKey of relevantWeights) {
      const current = oldWeights[weightKey];
      const adjustment = config.learningRate * meanError2 * 0.1;
      const adjustKey = weightKey;
      if (!adjustments[adjustKey]) adjustments[adjustKey] = 0;
      adjustments[adjustKey] += adjustment;
      newWeights[weightKey] = clamp(current + adjustment, 0.5, 5);
    }
  }
  const correlation = pearsonCorrelation(
    feedback.map((f) => f.predictedScore),
    feedback.map((f) => f.actualScore)
  );
  const meanError = feedback.reduce((sum, f) => sum + (f.actualScore - f.predictedScore), 0) / feedback.length;
  const lastUpdate = data.updates[data.updates.length - 1];
  const accepted = !lastUpdate || correlation >= lastUpdate.correlation || Math.abs(meanError) < Math.abs(lastUpdate.meanError);
  const update = {
    id: `wu-${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    oldWeights,
    newWeights: accepted ? newWeights : oldWeights,
    sampleSize: feedback.length,
    meanError: round2(meanError),
    correlation: round2(correlation),
    adjustments: Object.fromEntries(
      Object.entries(adjustments).map(([k, v]) => [k, round2(v)])
    ),
    accepted
  };
  data.updates.push(update);
  if (accepted) {
    const roundedWeights = { ...newWeights };
    for (const key of Object.keys(roundedWeights)) {
      roundedWeights[key] = round1(roundedWeights[key]);
    }
    await saveSettings({ scoringWeights: roundedWeights });
    update.newWeights = roundedWeights;
  }
  await saveData(data);
  return update;
}
async function getReport() {
  const data = await loadData();
  const { config, feedback, updates } = data;
  const catMap = {};
  for (const f of feedback) {
    if (!catMap[f.category]) {
      catMap[f.category] = { count: 0, predSum: 0, actSum: 0, engSum: 0 };
    }
    catMap[f.category].count++;
    catMap[f.category].predSum += f.predictedScore;
    catMap[f.category].actSum += f.actualScore;
    catMap[f.category].engSum += f.engagementRate;
  }
  const categoryBreakdown = Object.entries(catMap).map(([category, stats]) => ({
    category,
    count: stats.count,
    avgPredicted: round2(stats.predSum / stats.count),
    avgActual: round2(stats.actSum / stats.count),
    avgEngagement: round2(stats.engSum / stats.count)
  })).sort((a, b) => b.count - a.count);
  const correlation = feedback.length >= 2 ? round2(
    pearsonCorrelation(
      feedback.map((f) => f.predictedScore),
      feedback.map((f) => f.actualScore)
    )
  ) : 0;
  const meanError = feedback.length > 0 ? round2(
    feedback.reduce((s, f) => s + (f.actualScore - f.predictedScore), 0) / feedback.length
  ) : 0;
  return {
    config,
    totalFeedback: feedback.length,
    correlation,
    meanError,
    categoryBreakdown,
    recentFeedback: feedback.slice(-20).reverse(),
    updates: updates.slice(-10).reverse()
  };
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function round1(v) {
  return Math.round(v * 10) / 10;
}
function round2(v) {
  return Math.round(v * 100) / 100;
}
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

// src/lib/ai/tools/autoscore.ts
var autoscoreStatus = {
  name: "content_autoscore_status",
  description: "View AutoScore learning status: prediction accuracy, correlation, category breakdown, and recent weight adjustments.",
  inputSchema: import_zod5.z.object({}),
  execute: async () => {
    const report = await getReport();
    return {
      enabled: report.config.enabled,
      learningRate: report.config.learningRate,
      totalFeedback: report.totalFeedback,
      correlation: report.correlation,
      meanError: report.meanError,
      categoryBreakdown: report.categoryBreakdown,
      recentUpdates: report.updates.slice(0, 5).map((u) => ({ timestamp: u.timestamp, accepted: u.accepted, correlation: u.correlation, sampleSize: u.sampleSize, adjustments: u.adjustments }))
    };
  }
};
var autoscoreLearn = {
  name: "content_autoscore_learn",
  description: "Run an AutoScore learning cycle: collects analytics, compares predicted vs actual engagement, and adjusts scoring weights.",
  inputSchema: import_zod5.z.object({}),
  execute: async () => {
    const collectResult = await collectFeedback();
    let update = null;
    let learnError = null;
    try {
      update = await runLearningCycle();
    } catch (err) {
      learnError = err instanceof Error ? err.message : "Learning failed";
    }
    return {
      collected: collectResult.collected,
      skipped: collectResult.skipped,
      errors: collectResult.errors.slice(0, 5),
      update: update ? { accepted: update.accepted, correlation: update.correlation, meanError: update.meanError, sampleSize: update.sampleSize, adjustments: update.adjustments } : null,
      learnError
    };
  }
};

// src/lib/ai/tools/index.ts
var tools = [
  // Workspace & Config
  listSpaces,
  createSpaceTool,
  getSettings2,
  // Pipeline
  processVideo,
  getRuns,
  getRunDetail,
  getClips,
  cancelRun,
  // Publishing & Scheduling
  publishClip,
  scheduleClip,
  listScheduled,
  cancelScheduled,
  listPostsTool,
  getPostAnalytics,
  updatePostTool,
  deletePostTool,
  listAccountsTool,
  // Creators & Notifications
  listCreators,
  addCreatorTool,
  removeCreatorTool,
  checkCreatorVideos,
  getNotificationsTool,
  // AutoScore
  autoscoreStatus,
  autoscoreLearn
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  tools
});
//# sourceMappingURL=tools.js.map
