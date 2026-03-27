import { readFile, writeFile } from "node:fs/promises";
import { AUTOSCORE_FILE } from "./paths";
import { listRuns, getManifest } from "./run-store";
import { getPost, listPosts } from "./late-client";
import { getSettings, saveSettings, getEffectiveConfig } from "./settings-store";
import type { ScoringWeights } from "./types";
import { DEFAULT_SCORING_WEIGHTS } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FeedbackEntry {
  id: string;
  runId: string;
  clipIndex: number;
  title: string;
  category: string;
  predictedScore: number;
  actualMetrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  actualScore: number;
  engagementRate: number;
  weightsUsed: ScoringWeights;
  collectedAt: string;
}

export interface WeightUpdate {
  id: string;
  timestamp: string;
  oldWeights: ScoringWeights;
  newWeights: ScoringWeights;
  sampleSize: number;
  meanError: number;
  correlation: number;
  adjustments: Record<string, number>;
  accepted: boolean;
}

export interface AutoScoreConfig {
  enabled: boolean;
  learningRate: number;
  minSamples: number;
  decayFactor: number;
}

export interface AutoScoreData {
  config: AutoScoreConfig;
  feedback: FeedbackEntry[];
  updates: WeightUpdate[];
}

export const DEFAULT_AUTOSCORE_CONFIG: AutoScoreConfig = {
  enabled: false,
  learningRate: 0.15,
  minSamples: 5,
  decayFactor: 0.85,
};

/* ------------------------------------------------------------------ */
/*  Category → Weight mapping                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_WEIGHT_MAP: Record<string, (keyof ScoringWeights)[]> = {
  education: ["education", "standalone"],
  entertainment: ["hook", "emotion"],
  controversy: ["controversy"],
  storytelling: ["twist", "emotion"],
  howto: ["education", "visual"],
  motivation: ["quotable", "emotion"],
  news: ["hook", "standalone"],
  review: ["standalone", "education"],
  comedy: ["hook", "twist"],
  lifestyle: ["nicheBonus", "education"],
  science: ["education", "twist"],
  fitness: ["visual", "hook"],
  tech: ["education", "standalone"],
  gaming: ["emotion", "hook"],
  music: ["emotion", "visual"],
};

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

async function loadData(): Promise<AutoScoreData> {
  try {
    const raw = await readFile(AUTOSCORE_FILE, "utf-8");
    return JSON.parse(raw) as AutoScoreData;
  } catch {
    return {
      config: { ...DEFAULT_AUTOSCORE_CONFIG },
      feedback: [],
      updates: [],
    };
  }
}

async function saveData(data: AutoScoreData): Promise<void> {
  await writeFile(AUTOSCORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function getAutoScoreConfig(): Promise<AutoScoreConfig> {
  const data = await loadData();
  return data.config;
}

export async function updateAutoScoreConfig(
  patch: Partial<AutoScoreConfig>
): Promise<AutoScoreConfig> {
  const data = await loadData();
  data.config = { ...data.config, ...patch };
  await saveData(data);
  return data.config;
}

export async function getFeedback(): Promise<FeedbackEntry[]> {
  const data = await loadData();
  return data.feedback;
}

export async function getUpdates(): Promise<WeightUpdate[]> {
  const data = await loadData();
  return data.updates;
}

/* ------------------------------------------------------------------ */
/*  Collect: gather analytics from Zernio + local pipeline             */
/* ------------------------------------------------------------------ */

export async function collectFeedback(): Promise<{
  collected: number;
  skipped: number;
  errors: string[];
}> {
  const data = await loadData();
  const settings = await getSettings();
  const currentWeights: ScoringWeights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...settings.scoringWeights,
  };

  const knownIds = new Set(data.feedback.map((f) => f.id));
  // Also track by postId to avoid duplicates across sources
  const knownPostIds = new Set(
    data.feedback.map((f) => f.runId).filter((id) => id.startsWith("zernio:"))
  );

  let collected = 0;
  let skipped = 0;
  const errors: string[] = [];

  // ── Source 1: Zernio analytics (all published posts) ──────────────
  try {
    const config = await getEffectiveConfig();
    if (config.lateApiKey) {
      const fromDate = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const toDate = new Date().toISOString().split("T")[0];

      const res = await fetch(
        `https://zernio.com/api/v1/analytics?fromDate=${fromDate}&toDate=${toDate}&limit=100&sortBy=date&order=desc`,
        { headers: { Authorization: `Bearer ${config.lateApiKey}` } }
      );

      if (res.ok) {
        const zData = await res.json();
        const zPosts = zData.posts ?? [];

        for (const post of zPosts) {
          const postId = post._id ?? post.postId ?? post.latePostId;
          const zKey = `zernio:${postId}`;
          if (knownPostIds.has(zKey)) { skipped++; continue; }

          const analytics = post.analytics;
          if (!analytics || (!analytics.views && !analytics.likes && !analytics.impressions)) {
            skipped++;
            continue;
          }

          const views = analytics.views ?? analytics.impressions ?? 0;
          const likes = analytics.likes ?? 0;
          const comments = analytics.comments ?? 0;
          const shares = analytics.shares ?? 0;
          const engagementRate = analytics.engagementRate ?? (views > 0 ? ((likes + comments) / views) * 100 : 0);

          // Infer category from content
          const content = (post.content ?? "").toLowerCase();
          const category = inferCategory(content, config.niche);
          const platform = post.platform ?? post.platforms?.[0]?.platform ?? "unknown";

          // For pipeline clips we have a predicted score; for external posts estimate from engagement
          const predictedScore = estimatePredictedScore(engagementRate);

          const title = (post.content ?? "").split("\n")[0]?.slice(0, 60) || "Untitled";

          data.feedback.push({
            id: `fb-z-${Date.now()}-${collected}`,
            runId: zKey,
            clipIndex: 0,
            title,
            category,
            predictedScore,
            actualMetrics: { views, likes, comments, shares },
            actualScore: 0,
            engagementRate: Math.round(engagementRate * 100) / 100,
            weightsUsed: currentWeights,
            collectedAt: new Date().toISOString(),
          });

          knownPostIds.add(zKey);
          collected++;
        }
      }
    }
  } catch (err) {
    errors.push(`Zernio analytics: ${err instanceof Error ? err.message : "fetch failed"}`);
  }

  // ── Source 2: Local pipeline runs (clips with virality scores) ────
  try {
    const knownRunKeys = new Set(
      data.feedback.filter((f) => !f.runId.startsWith("zernio:")).map((f) => `${f.runId}:${f.clipIndex}`)
    );
    const runs = await listRuns();
    const completedRuns = runs.filter((r) => r.status === "complete");

    for (const run of completedRuns) {
      const manifest = await getManifest(run.outputDir);
      if (!manifest?.clips || !manifest.moments || !manifest.posts) continue;

      for (const post of manifest.posts) {
        const key = `${run.runId}:${post.clipIndex}`;
        if (knownRunKeys.has(key)) { skipped++; continue; }

        const isPublished = post.platforms.some((p: { status?: string }) => p.status === "published");
        if (!isPublished) continue;

        const clip = manifest.clips.find((c) => c.momentIndex === post.clipIndex);
        const moment = manifest.moments!.find((m) => m.index === post.clipIndex);
        if (!clip || !moment) continue;

        try {
          const latePost = await getPost(post.postId);
          const analytics = latePost.analytics;
          if (!analytics || (!analytics.views && !analytics.likes)) { skipped++; continue; }

          const views = analytics.views ?? 0;
          const likes = analytics.likes ?? 0;
          const comments = analytics.comments ?? 0;
          const shares = analytics.shares ?? 0;
          const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

          data.feedback.push({
            id: `fb-r-${Date.now()}-${collected}`,
            runId: run.runId,
            clipIndex: post.clipIndex,
            title: clip.title,
            category: moment.category.toLowerCase(),
            predictedScore: moment.viralityScore,
            actualMetrics: { views, likes, comments, shares },
            actualScore: 0,
            engagementRate,
            weightsUsed: currentWeights,
            collectedAt: new Date().toISOString(),
          });

          knownRunKeys.add(key);
          collected++;
        } catch (err) {
          errors.push(`${clip.title}: ${err instanceof Error ? err.message : "fetch failed"}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Pipeline runs: ${err instanceof Error ? err.message : "scan failed"}`);
  }

  // Normalize actualScore using percentile ranking across ALL feedback
  normalizeScores(data.feedback);
  await saveData(data);

  return { collected, skipped, errors };
}

/* ------------------------------------------------------------------ */
/*  Helpers: infer category + estimate predicted score                  */
/* ------------------------------------------------------------------ */

function inferCategory(content: string, niche?: string): string {
  const keywords: Record<string, string[]> = {
    education: ["learn", "how to", "tutorial", "guide", "tip", "lesson", "explained"],
    entertainment: ["funny", "lol", "haha", "comedy", "prank", "meme"],
    controversy: ["debate", "opinion", "unpopular", "hot take", "controversial"],
    motivation: ["motivat", "inspir", "grind", "hustle", "mindset", "success"],
    news: ["breaking", "announce", "update", "just in", "report"],
    storytelling: ["story", "journey", "experience", "happened"],
    howto: ["how to", "step by step", "diy", "recipe"],
    tech: ["tech", "ai", "software", "code", "developer", "startup"],
    lifestyle: ["lifestyle", "daily", "routine", "habit", "morning", "vlog", "day in"],
    fitness: ["workout", "gym", "exercise", "gains", "diet", "nutrition"],
  };

  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some((w) => content.includes(w))) return cat;
  }
  return niche?.toLowerCase() ?? "general";
}

function estimatePredictedScore(engagementRate: number): number {
  // Map engagement rate to a rough 1-10 predicted score
  // This is used for external posts that don't have pipeline virality scores
  if (engagementRate >= 15) return 10;
  if (engagementRate >= 10) return 9;
  if (engagementRate >= 7) return 8;
  if (engagementRate >= 5) return 7;
  if (engagementRate >= 3) return 6;
  if (engagementRate >= 2) return 5;
  if (engagementRate >= 1) return 4;
  if (engagementRate >= 0.5) return 3;
  return 2;
}

/* ------------------------------------------------------------------ */
/*  Normalize: map engagement percentile → 1-10 score                  */
/* ------------------------------------------------------------------ */

function normalizeScores(feedback: FeedbackEntry[]): void {
  if (feedback.length === 0) return;

  const sorted = [...feedback].sort(
    (a, b) => a.engagementRate - b.engagementRate
  );

  for (let i = 0; i < sorted.length; i++) {
    const percentile = (i + 1) / sorted.length;
    sorted[i].actualScore = Math.round(percentile * 9 + 1); // 1-10
  }
}

/* ------------------------------------------------------------------ */
/*  Learn: adjust weights based on feedback                            */
/* ------------------------------------------------------------------ */

export async function runLearningCycle(): Promise<WeightUpdate> {
  const data = await loadData();
  const { config, feedback } = data;

  if (feedback.length < config.minSamples) {
    throw new Error(
      `Need at least ${config.minSamples} feedback entries (have ${feedback.length}). Collect more analytics first.`
    );
  }

  const settings = await getSettings();
  const oldWeights: ScoringWeights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...settings.scoringWeights,
  };

  // Apply decay: weight recent entries more heavily
  const now = Date.now();
  const weighted = feedback.map((f) => {
    const ageMs = now - new Date(f.collectedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const weight = Math.pow(config.decayFactor, ageDays / 7); // decay per week
    return { ...f, decayWeight: weight };
  });

  // Compute per-category error (actual - predicted)
  const categoryErrors: Record<string, { totalError: number; totalWeight: number }> = {};

  for (const entry of weighted) {
    const cat = entry.category;
    if (!categoryErrors[cat]) {
      categoryErrors[cat] = { totalError: 0, totalWeight: 0 };
    }
    const error = entry.actualScore - entry.predictedScore;
    categoryErrors[cat].totalError += error * entry.decayWeight;
    categoryErrors[cat].totalWeight += entry.decayWeight;
  }

  // Compute adjustments per weight dimension
  const adjustments: Record<string, number> = {};
  const newWeights = { ...oldWeights };

  for (const [category, { totalError, totalWeight }] of Object.entries(categoryErrors)) {
    if (totalWeight === 0) continue;
    const meanError = totalError / totalWeight;
    const relevantWeights = CATEGORY_WEIGHT_MAP[category] ?? [];

    for (const weightKey of relevantWeights) {
      const current = oldWeights[weightKey];
      const adjustment = config.learningRate * meanError * 0.1;
      const adjustKey = weightKey as string;

      if (!adjustments[adjustKey]) adjustments[adjustKey] = 0;
      adjustments[adjustKey] += adjustment;

      newWeights[weightKey] = clamp(current + adjustment, 0.5, 5);
    }
  }

  // Compute correlation between predicted and actual
  const correlation = pearsonCorrelation(
    feedback.map((f) => f.predictedScore),
    feedback.map((f) => f.actualScore)
  );

  // Compute overall mean error
  const meanError =
    feedback.reduce((sum, f) => sum + (f.actualScore - f.predictedScore), 0) /
    feedback.length;

  // Check if we should accept the update
  // Accept if: first update, or correlation improves, or mean error decreases
  const lastUpdate = data.updates[data.updates.length - 1];
  const accepted =
    !lastUpdate ||
    correlation >= lastUpdate.correlation ||
    Math.abs(meanError) < Math.abs(lastUpdate.meanError);

  const update: WeightUpdate = {
    id: `wu-${Date.now()}`,
    timestamp: new Date().toISOString(),
    oldWeights,
    newWeights: accepted ? newWeights : oldWeights,
    sampleSize: feedback.length,
    meanError: round2(meanError),
    correlation: round2(correlation),
    adjustments: Object.fromEntries(
      Object.entries(adjustments).map(([k, v]) => [k, round2(v)])
    ),
    accepted,
  };

  data.updates.push(update);

  // Apply new weights to settings if accepted
  if (accepted) {
    // Round weights to 1 decimal
    const roundedWeights: ScoringWeights = { ...newWeights };
    for (const key of Object.keys(roundedWeights) as (keyof ScoringWeights)[]) {
      roundedWeights[key] = round1(roundedWeights[key]);
    }
    await saveSettings({ scoringWeights: roundedWeights });
    update.newWeights = roundedWeights;
  }

  await saveData(data);
  return update;
}

/* ------------------------------------------------------------------ */
/*  Report: summary stats for the UI                                   */
/* ------------------------------------------------------------------ */

export interface AutoScoreReport {
  config: AutoScoreConfig;
  totalFeedback: number;
  correlation: number;
  meanError: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    avgPredicted: number;
    avgActual: number;
    avgEngagement: number;
  }>;
  recentFeedback: FeedbackEntry[];
  updates: WeightUpdate[];
}

export async function getReport(): Promise<AutoScoreReport> {
  const data = await loadData();
  const { config, feedback, updates } = data;

  // Category breakdown
  const catMap: Record<
    string,
    { count: number; predSum: number; actSum: number; engSum: number }
  > = {};

  for (const f of feedback) {
    if (!catMap[f.category]) {
      catMap[f.category] = { count: 0, predSum: 0, actSum: 0, engSum: 0 };
    }
    catMap[f.category].count++;
    catMap[f.category].predSum += f.predictedScore;
    catMap[f.category].actSum += f.actualScore;
    catMap[f.category].engSum += f.engagementRate;
  }

  const categoryBreakdown = Object.entries(catMap)
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      avgPredicted: round2(stats.predSum / stats.count),
      avgActual: round2(stats.actSum / stats.count),
      avgEngagement: round2(stats.engSum / stats.count),
    }))
    .sort((a, b) => b.count - a.count);

  const correlation =
    feedback.length >= 2
      ? round2(
          pearsonCorrelation(
            feedback.map((f) => f.predictedScore),
            feedback.map((f) => f.actualScore)
          )
        )
      : 0;

  const meanError =
    feedback.length > 0
      ? round2(
          feedback.reduce((s, f) => s + (f.actualScore - f.predictedScore), 0) /
            feedback.length
        )
      : 0;

  return {
    config,
    totalFeedback: feedback.length,
    correlation,
    meanError,
    categoryBreakdown,
    recentFeedback: feedback.slice(-20).reverse(),
    updates: updates.slice(-10).reverse(),
  };
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function pearsonCorrelation(x: number[], y: number[]): number {
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
