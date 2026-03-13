import { tool } from "ai";
import { z } from "zod";
import { getSpaces, createSpace } from "@/lib/space-store";
import { listRuns, getRun, getManifest } from "@/lib/run-store";
import {
  getScheduledPosts,
  addScheduledPost,
  updateScheduledPost,
} from "@/lib/schedule-store";
import { getCreators, addCreator, removeCreator } from "@/lib/creator-store";
import { getNotifications } from "@/lib/notification-store";
import { getEffectiveConfig } from "@/lib/settings-store";
import { fetchChannelFeedWithMeta } from "@/lib/youtube-rss";
import {
  getReport as getAutoScoreReport,
  collectFeedback,
  runLearningCycle,
} from "@/lib/autoscore-store";
import {
  listPosts,
  getPost,
  updatePost,
  deletePost,
  listLateAccounts,
} from "@/lib/late-client";
import type { Space } from "@/lib/types";

export const allTools = {
  // ── Workspace & Config ─────────────────────────────────────────

  list_spaces: tool({
    description:
      "List all spaces (workspaces). Returns each space's id, name, icon, description, and account/creator counts.",
    inputSchema: z.object({}),
    execute: async () => {
      const spaces = await getSpaces();
      return spaces.map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        description: s.description,
        accountCount: s.accounts?.length ?? 0,
        creatorCount: s.creators?.length ?? 0,
      }));
    },
  }),

  create_space: tool({
    description:
      "Create a new space (workspace) with a name, optional icon emoji, and optional description.",
    inputSchema: z.object({
      name: z.string().describe("Name of the space"),
      icon: z
        .string()
        .optional()
        .describe("Emoji icon for the space (e.g. '🎮'). Defaults to '📁'"),
      description: z
        .string()
        .optional()
        .describe("Short description of the space"),
    }),
    execute: async ({ name, icon, description }) => {
      const now = new Date().toISOString();
      const space: Space = {
        id: crypto.randomUUID(),
        name,
        icon: icon || "📁",
        description: description || "",
        settings: {},
        accounts: [],
        creators: [],
        createdAt: now,
        updatedAt: now,
      };
      await createSpace(space);
      return { success: true, id: space.id, name: space.name, icon: space.icon };
    },
  }),

  get_runs: tool({
    description:
      "Get recent video processing runs. Returns run ID, source URL, status, started time, and clip count for each run. Optionally filter by status.",
    inputSchema: z.object({
      status: z
        .string()
        .optional()
        .describe(
          "Filter by status: 'complete', 'failed', 'downloading', 'transcribing', 'analyzing', 'clipping'. Omit for all."
        ),
      limit: z
        .number()
        .optional()
        .describe("Max number of runs to return (default 10)"),
    }),
    execute: async ({ status, limit }) => {
      let runs = await listRuns();
      if (status) {
        runs = runs.filter((r) => r.status === status);
      }
      const max = limit || 10;
      return runs.slice(0, max).map((r) => ({
        runId: r.runId,
        sourceUrl: r.sourceUrl,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt ?? null,
        spaceId: r.spaceId ?? null,
      }));
    },
  }),

  schedule_clip: tool({
    description:
      "Schedule a clip for posting. Requires a run ID, clip index, platform(s), and a date/time to post.",
    inputSchema: z.object({
      runId: z.string().describe("The run ID containing the clip"),
      clipIndex: z
        .number()
        .describe("Index of the clip within the run (0-based)"),
      clipTitle: z.string().describe("Title/name for the clip"),
      platforms: z
        .array(z.string())
        .describe(
          "Platforms to post to (e.g. ['tiktok', 'youtube', 'instagram'])"
        ),
      scheduledFor: z
        .string()
        .describe("ISO 8601 date-time string for when to post"),
    }),
    execute: async ({ runId, clipIndex, clipTitle, platforms, scheduledFor }) => {
      const post = {
        id: crypto.randomUUID(),
        runId,
        clipIndex,
        clipTitle,
        platforms,
        scheduledFor,
        status: "scheduled" as const,
        createdAt: new Date().toISOString(),
      };
      await addScheduledPost(post);
      return { success: true, id: post.id, scheduledFor: post.scheduledFor };
    },
  }),

  list_scheduled: tool({
    description:
      "List all scheduled posts. Returns clip title, platforms, scheduled time, and status for each.",
    inputSchema: z.object({}),
    execute: async () => {
      const posts = await getScheduledPosts();
      return posts.map((p) => ({
        id: p.id,
        clipTitle: p.clipTitle,
        platforms: p.platforms,
        scheduledFor: p.scheduledFor,
        status: p.status,
        runId: p.runId,
      }));
    },
  }),

  list_creators: tool({
    description:
      "List all tracked YouTube creators. Returns channel name, URL, auto-process setting, and default options.",
    inputSchema: z.object({}),
    execute: async () => {
      const creators = await getCreators();
      return creators.map((c) => ({
        id: c.id,
        channelName: c.channelName,
        channelUrl: c.channelUrl,
        autoProcess: c.autoProcess,
        defaultOptions: c.defaultOptions,
        lastCheckedAt: c.lastCheckedAt ?? null,
      }));
    },
  }),

  add_creator: tool({
    description:
      "Add a YouTube creator to track. Provide channel name and URL at minimum.",
    inputSchema: z.object({
      channelName: z.string().describe("YouTube channel name"),
      channelUrl: z
        .string()
        .describe(
          "YouTube channel URL (e.g. https://youtube.com/@channelname)"
        ),
      channelId: z
        .string()
        .optional()
        .describe(
          "YouTube channel ID (optional, derived from URL if omitted)"
        ),
      autoProcess: z
        .boolean()
        .optional()
        .describe("Automatically process new videos (default false)"),
    }),
    execute: async ({ channelName, channelUrl, channelId, autoProcess }) => {
      const creator = {
        id: crypto.randomUUID(),
        channelId: channelId || "",
        channelName,
        channelUrl,
        autoProcess: autoProcess ?? false,
        defaultOptions: {},
        createdAt: new Date().toISOString(),
      };
      await addCreator(creator);
      return {
        success: true,
        id: creator.id,
        channelName: creator.channelName,
      };
    },
  }),

  get_settings: tool({
    description:
      "Get the current app settings including Claude model, default quality, platforms, niche, and more.",
    inputSchema: z.object({}),
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
        captionMode: config.captionMode,
      };
    },
  }),

  // ── Pipeline Tools ─────────────────────────────────────────────

  process_video: tool({
    description:
      "Start the clipping pipeline on a YouTube video URL. Returns a run ID immediately — the pipeline runs asynchronously in the background. Use get_runs or get_run_detail to check progress.",
    inputSchema: z.object({
      url: z.string().describe("YouTube video URL to process"),
      spaceId: z
        .string()
        .optional()
        .describe(
          "Space ID to use for settings (optional, uses global defaults if omitted)"
        ),
      force: z
        .boolean()
        .optional()
        .describe(
          "Force re-processing even if this URL was already processed (default false)"
        ),
    }),
    execute: async ({ url, spaceId, force }) => {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, spaceId, force: force ?? false }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          error: data.error,
          ...(data.existingRunId && { existingRunId: data.existingRunId }),
          ...(data.alreadyComplete && { alreadyComplete: true }),
        };
      }
      return {
        success: true,
        runId: data.runId,
        message:
          "Pipeline started — use get_run_detail to check progress",
      };
    },
  }),

  get_run_detail: tool({
    description:
      "Get full details for a single run including moments (with virality scores) and clips. Omits transcript/wordTimestamps to save tokens.",
    inputSchema: z.object({
      runId: z.string().describe("The run ID to get details for"),
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
        moments:
          manifest?.moments?.map((m) => ({
            index: m.index,
            title: m.title,
            description: m.description,
            hookText: m.hookText,
            startSeconds: m.startSeconds,
            endSeconds: m.endSeconds,
            durationSeconds: m.durationSeconds,
            viralityScore: m.viralityScore,
            hashtags: m.hashtags,
            category: m.category,
          })) ?? null,
        clips:
          manifest?.clips?.map((c) => ({
            momentIndex: c.momentIndex,
            title: c.title,
            durationSeconds: c.durationSeconds,
            fileSizeBytes: c.fileSizeBytes,
            resolution: c.resolution,
          })) ?? null,
        posts: manifest?.posts ?? null,
        error: manifest?.error ?? null,
      };
    },
  }),

  get_clips: tool({
    description:
      "List generated clips across runs. Optionally filter by run ID or minimum virality score.",
    inputSchema: z.object({
      runId: z
        .string()
        .optional()
        .describe("Filter to a specific run ID (optional)"),
      minScore: z
        .number()
        .optional()
        .describe("Minimum virality score (1-10) to include (optional)"),
      limit: z
        .number()
        .optional()
        .describe("Max number of clips to return (default 20)"),
    }),
    execute: async ({ runId, minScore, limit }) => {
      const allRuns = await listRuns();
      const targetRuns = runId
        ? allRuns.filter((r) => r.runId === runId)
        : allRuns.filter((r) => r.status === "complete");

      const min = minScore ?? 0;
      const max = limit || 20;

      const clips: Array<{
        runId: string;
        sourceUrl: string;
        momentIndex: number;
        title: string;
        viralityScore: number;
        durationSeconds: number;
        hashtags: string[];
        category: string;
      }> = [];

      for (const run of targetRuns) {
        const manifest = await getManifest(run.outputDir);
        if (!manifest?.clips || !manifest.moments) continue;
        for (const clip of manifest.clips) {
          const moment = manifest.moments.find(
            (m) => m.index === clip.momentIndex
          );
          if (!moment || moment.viralityScore < min) continue;
          clips.push({
            runId: run.runId,
            sourceUrl: run.sourceUrl,
            momentIndex: clip.momentIndex,
            title: clip.title,
            viralityScore: moment.viralityScore,
            durationSeconds: clip.durationSeconds,
            hashtags: moment.hashtags,
            category: moment.category,
          });
        }
      }

      clips.sort((a, b) => b.viralityScore - a.viralityScore);
      return clips.slice(0, max);
    },
  }),

  check_creator_videos: tool({
    description:
      "Fetch a tracked creator's latest YouTube videos via RSS feed. Returns up to 10 recent videos with title, URL, and publish date.",
    inputSchema: z.object({
      creatorId: z
        .string()
        .describe("The creator ID (from list_creators) to check"),
    }),
    execute: async ({ creatorId }) => {
      const creators = await getCreators();
      const creator = creators.find((c) => c.id === creatorId);
      if (!creator) return { error: "Creator not found" };
      if (!creator.channelId) {
        return {
          error:
            "Creator has no channel ID — try removing and re-adding with a channel ID",
        };
      }
      const feed = await fetchChannelFeedWithMeta(creator.channelId);
      return {
        channelName: feed.channelName || creator.channelName,
        videos: feed.videos.slice(0, 10).map((v) => ({
          videoId: v.videoId,
          title: v.title,
          url: v.url,
          publishedAt: v.publishedAt,
        })),
      };
    },
  }),

  // ── Late/Social Tools ──────────────────────────────────────────

  publish_clip: tool({
    description:
      "Publish a clip to social platforms via getLate.dev. Burns captions if needed, uploads the video, and creates the post. Supports scheduling for later.",
    inputSchema: z.object({
      runId: z.string().describe("The run ID containing the clip"),
      clipIndex: z
        .number()
        .describe(
          "Index of the clip within the run (0-based, matches moment index)"
        ),
      platforms: z
        .array(z.string())
        .describe(
          "Platforms to publish to (e.g. ['tiktok', 'youtube', 'instagram'])"
        ),
      scheduledFor: z
        .string()
        .optional()
        .describe(
          "ISO 8601 date-time to schedule the post for (optional, publishes immediately if omitted)"
        ),
    }),
    execute: async ({ runId, clipIndex, platforms, scheduledFor }) => {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/runs/${runId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipIndices: [clipIndex],
          platforms,
          scheduledFor,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error };
      return { success: true, results: data.results };
    },
  }),

  list_posts: tool({
    description:
      "List posts from getLate.dev. Optionally filter by status (draft, scheduled, published) or platform.",
    inputSchema: z.object({
      status: z
        .string()
        .optional()
        .describe(
          "Filter by post status: 'draft', 'scheduled', 'published' (optional)"
        ),
      platform: z
        .string()
        .optional()
        .describe(
          "Filter by platform: 'tiktok', 'youtube', 'instagram', 'facebook' (optional)"
        ),
      limit: z
        .number()
        .optional()
        .describe("Max number of posts to return (default 20)"),
    }),
    execute: async ({ status, platform, limit }) => {
      const posts = await listPosts({ status, platform, limit: limit || 20 });
      return posts.map((p) => ({
        id: p._id,
        content: p.content,
        status: p.status,
        platforms: p.platforms.map((pl) => pl.platform),
        scheduledFor: p.scheduledFor ?? null,
        publishedAt: p.publishedAt ?? null,
        createdAt: p.createdAt ?? null,
      }));
    },
  }),

  get_post_analytics: tool({
    description:
      "Get performance metrics for a specific post from getLate.dev. Returns impressions, views, likes, comments, shares, and engagement rate.",
    inputSchema: z.object({
      postId: z
        .string()
        .describe("The Late.dev post ID to get analytics for"),
    }),
    execute: async ({ postId }) => {
      const post = await getPost(postId);
      return {
        id: post._id,
        content: post.content,
        status: post.status,
        platforms: post.platforms.map((pl) => pl.platform),
        publishedAt: post.publishedAt ?? null,
        analytics: post.analytics ?? {
          impressions: 0,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          engagement: 0,
        },
      };
    },
  }),

  update_post: tool({
    description:
      "Update a draft or scheduled post on getLate.dev. Can change content text or reschedule the post.",
    inputSchema: z.object({
      postId: z.string().describe("The Late.dev post ID to update"),
      content: z
        .string()
        .optional()
        .describe("New content/caption text for the post (optional)"),
      scheduledFor: z
        .string()
        .optional()
        .describe(
          "New ISO 8601 date-time to schedule the post for (optional)"
        ),
    }),
    execute: async ({ postId, content, scheduledFor }) => {
      const updates: { content?: string; scheduledFor?: string } = {};
      if (content) updates.content = content;
      if (scheduledFor) updates.scheduledFor = scheduledFor;
      const updated = await updatePost(postId, updates);
      return {
        success: true,
        id: updated._id,
        content: updated.content,
        status: updated.status,
        scheduledFor: updated.scheduledFor ?? null,
      };
    },
  }),

  delete_post: tool({
    description:
      "Delete a draft or scheduled post from getLate.dev. Cannot delete already-published posts.",
    inputSchema: z.object({
      postId: z.string().describe("The Late.dev post ID to delete"),
    }),
    execute: async ({ postId }) => {
      await deletePost(postId);
      return { success: true, message: "Post deleted" };
    },
  }),

  list_accounts: tool({
    description:
      "List connected social media accounts from getLate.dev. Shows platform and account name for each.",
    inputSchema: z.object({}),
    execute: async () => {
      const accounts = await listLateAccounts();
      return accounts.map((a) => ({
        id: a._id,
        platform: a.platform,
        name: a.name,
      }));
    },
  }),

  // ── Management Tools ───────────────────────────────────────────

  get_notifications: tool({
    description:
      "View new video alerts from tracked YouTube creators. Optionally filter by status (pending, processing, dismissed).",
    inputSchema: z.object({
      status: z
        .string()
        .optional()
        .describe(
          "Filter by status: 'pending', 'processing', 'dismissed' (optional)"
        ),
      limit: z
        .number()
        .optional()
        .describe("Max number of notifications to return (default 20)"),
    }),
    execute: async ({ status, limit }) => {
      let notifications = await getNotifications();
      if (status) {
        notifications = notifications.filter((n) => n.status === status);
      }
      const max = limit || 20;
      return notifications.slice(0, max).map((n) => ({
        id: n.id,
        videoTitle: n.videoTitle,
        videoUrl: n.videoUrl,
        creatorName: n.creatorName,
        publishedAt: n.publishedAt,
        status: n.status,
        runId: n.runId ?? null,
      }));
    },
  }),

  remove_creator: tool({
    description:
      "Stop tracking a YouTube creator. Removes them from the creator list.",
    inputSchema: z.object({
      creatorId: z
        .string()
        .describe("The creator ID to remove (from list_creators)"),
    }),
    execute: async ({ creatorId }) => {
      const removed = await removeCreator(creatorId);
      if (!removed) return { error: "Creator not found" };
      return { success: true, message: "Creator removed" };
    },
  }),

  cancel_run: tool({
    description:
      "Cancel an in-progress pipeline run. Kills the background process and marks the run as failed.",
    inputSchema: z.object({
      runId: z.string().describe("The run ID to cancel"),
    }),
    execute: async ({ runId }) => {
      const run = await getRun(runId);
      if (!run) return { error: "Run not found" };
      const activeStatuses = [
        "downloading",
        "transcribing",
        "analyzing",
        "clipping",
      ];
      if (!activeStatuses.includes(run.status)) {
        return { error: `Run is not active (status: ${run.status})` };
      }
      if (run.pid) {
        try {
          process.kill(run.pid);
        } catch {
          // Process may have already exited
        }
      }
      const { updateRun } = await import("@/lib/run-store");
      await updateRun(run.runId, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
      return { success: true, message: "Run cancelled" };
    },
  }),

  cancel_scheduled: tool({
    description:
      "Cancel a scheduled post. Marks it as cancelled so it won't be published.",
    inputSchema: z.object({
      postId: z
        .string()
        .describe("The scheduled post ID to cancel (from list_scheduled)"),
    }),
    execute: async ({ postId }) => {
      const updated = await updateScheduledPost(postId, {
        status: "cancelled",
      });
      if (!updated) return { error: "Scheduled post not found" };
      return { success: true, id: updated.id, status: "cancelled" };
    },
  }),

  // ── AutoScore (Self-Improving Feedback Loop) ────────────────────

  autoscore_status: tool({
    description:
      "View AutoScore learning status: prediction accuracy, correlation between predicted viralityScore and actual engagement, category breakdown, and recent weight adjustments. Shows how well the scoring weights predict real performance.",
    inputSchema: z.object({}),
    execute: async () => {
      const report = await getAutoScoreReport();
      return {
        enabled: report.config.enabled,
        learningRate: report.config.learningRate,
        totalFeedback: report.totalFeedback,
        correlation: report.correlation,
        meanError: report.meanError,
        categoryBreakdown: report.categoryBreakdown,
        recentUpdates: report.updates.slice(0, 5).map((u) => ({
          timestamp: u.timestamp,
          accepted: u.accepted,
          correlation: u.correlation,
          sampleSize: u.sampleSize,
          adjustments: u.adjustments,
        })),
      };
    },
  }),

  autoscore_learn: tool({
    description:
      "Run an AutoScore learning cycle: collects analytics from published clips, compares predicted viralityScore against actual engagement, and adjusts scoring weights to improve future predictions. Returns what changed and whether the update was accepted.",
    inputSchema: z.object({}),
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
        update: update
          ? {
              accepted: update.accepted,
              correlation: update.correlation,
              meanError: update.meanError,
              sampleSize: update.sampleSize,
              adjustments: update.adjustments,
            }
          : null,
        learnError,
      };
    },
  }),
};
