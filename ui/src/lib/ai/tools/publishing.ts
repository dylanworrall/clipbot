import { z } from "zod";
import { getScheduledPosts, addScheduledPost, updateScheduledPost } from "@/lib/schedule-store";
import { listPosts, getPost, updatePost, deletePost, listLateAccounts, createPost } from "@/lib/late-client";
import { getEffectiveConfig } from "@/lib/settings-store";
import { getCreators } from "@/lib/creator-store";
import { fetchChannelFeedWithMeta } from "@/lib/youtube-rss";

export const publishClip = {
  name: "content_publish_clip",
  description: "Publish a clip to social platforms via Zernio. Supports scheduling for later.",
  inputSchema: z.object({
    runId: z.string().describe("The run ID containing the clip"),
    clipIndex: z.number().describe("Index of the clip within the run (0-based)"),
    platforms: z.array(z.string()).describe("Platforms to publish to (e.g. ['tiktok', 'youtube', 'instagram'])"),
    scheduledFor: z.string().optional().describe("ISO 8601 date-time to schedule the post for (optional, publishes immediately if omitted)"),
  }),
  execute: async ({ runId, clipIndex, platforms, scheduledFor }: { runId: string; clipIndex: number; platforms: string[]; scheduledFor?: string }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/runs/${runId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipIndices: [clipIndex], platforms, scheduledFor }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true, results: data.results };
  },
};

export const scheduleClip = {
  name: "content_schedule_clip",
  description: "Schedule a clip for posting at a specific date/time.",
  inputSchema: z.object({
    runId: z.string().describe("The run ID containing the clip"),
    clipIndex: z.number().describe("Index of the clip within the run (0-based)"),
    clipTitle: z.string().describe("Title/name for the clip"),
    platforms: z.array(z.string()).describe("Platforms to post to"),
    scheduledFor: z.string().describe("ISO 8601 date-time string for when to post"),
  }),
  execute: async ({ runId, clipIndex, clipTitle, platforms, scheduledFor }: { runId: string; clipIndex: number; clipTitle: string; platforms: string[]; scheduledFor: string }) => {
    const post = { id: crypto.randomUUID(), runId, clipIndex, clipTitle, platforms, scheduledFor, status: "scheduled" as const, createdAt: new Date().toISOString() };
    await addScheduledPost(post);
    return { success: true, id: post.id, scheduledFor: post.scheduledFor };
  },
};

export const listScheduled = {
  name: "content_list_scheduled",
  description: "List all scheduled posts with clip title, platforms, scheduled time, and status.",
  inputSchema: z.object({}),
  execute: async () => {
    const posts = await getScheduledPosts();
    return posts.map((p) => ({ id: p.id, clipTitle: p.clipTitle, platforms: p.platforms, scheduledFor: p.scheduledFor, status: p.status, runId: p.runId }));
  },
};

export const cancelScheduled = {
  name: "content_cancel_scheduled",
  description: "Cancel a scheduled post so it won't be published.",
  inputSchema: z.object({
    postId: z.string().describe("The scheduled post ID to cancel"),
  }),
  execute: async ({ postId }: { postId: string }) => {
    const updated = await updateScheduledPost(postId, { status: "cancelled" });
    if (!updated) return { error: "Scheduled post not found" };
    return { success: true, id: updated.id, status: "cancelled" };
  },
};

export const listPostsTool = {
  name: "content_list_posts",
  description: "List posts from Zernio. Optionally filter by status or platform.",
  inputSchema: z.object({
    status: z.string().optional().describe("Filter: 'draft', 'scheduled', 'published'"),
    platform: z.string().optional().describe("Filter: 'tiktok', 'youtube', 'instagram', 'facebook'"),
    limit: z.number().optional().describe("Max posts to return (default 20)"),
  }),
  execute: async ({ status, platform, limit }: { status?: string; platform?: string; limit?: number }) => {
    const posts = await listPosts({ status, platform, limit: limit || 20 });
    return posts.map((p) => ({ id: p._id, content: p.content, status: p.status, platforms: p.platforms.map((pl) => pl.platform), scheduledFor: p.scheduledFor ?? null, publishedAt: p.publishedAt ?? null }));
  },
};

export const getPostAnalytics = {
  name: "content_get_post_analytics",
  description: "Get performance metrics for a post: impressions, views, likes, comments, shares, engagement rate.",
  inputSchema: z.object({
    postId: z.string().describe("The Zernio post ID"),
  }),
  execute: async ({ postId }: { postId: string }) => {
    const post = await getPost(postId);
    return { id: post._id, content: post.content, status: post.status, publishedAt: post.publishedAt ?? null, analytics: post.analytics ?? { impressions: 0, views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 } };
  },
};

export const updatePostTool = {
  name: "content_update_post",
  description: "Update a draft or scheduled post. Can change content text or reschedule.",
  inputSchema: z.object({
    postId: z.string().describe("The Zernio post ID to update"),
    content: z.string().optional().describe("New content/caption text"),
    scheduledFor: z.string().optional().describe("New ISO 8601 schedule time"),
  }),
  execute: async ({ postId, content, scheduledFor }: { postId: string; content?: string; scheduledFor?: string }) => {
    const updates: { content?: string; scheduledFor?: string } = {};
    if (content) updates.content = content;
    if (scheduledFor) updates.scheduledFor = scheduledFor;
    const updated = await updatePost(postId, updates);
    return { success: true, id: updated._id, content: updated.content, status: updated.status, scheduledFor: updated.scheduledFor ?? null };
  },
};

export const deletePostTool = {
  name: "content_delete_post",
  description: "Delete a draft or scheduled post from Zernio.",
  inputSchema: z.object({
    postId: z.string().describe("The Zernio post ID to delete"),
  }),
  execute: async ({ postId }: { postId: string }) => {
    await deletePost(postId);
    return { success: true, message: "Post deleted" };
  },
};

export const listAccountsTool = {
  name: "content_list_accounts",
  description: "List all connected social media accounts from Zernio. Multiple accounts per platform are supported.",
  inputSchema: z.object({}),
  execute: async () => {
    const accounts = await listLateAccounts();
    return accounts.map((a) => ({ id: a._id, platform: a.platform, name: a.name }));
  },
};

export const createDraftTool = {
  name: "content_create_draft",
  description: "Create a text-only draft post for social media. No video needed. Saves to Zernio and adds to the calendar.",
  inputSchema: z.object({
    content: z.string().describe("The post text (tweet, caption, LinkedIn post, etc.)"),
    platforms: z.array(z.string()).describe("Target platforms (e.g. ['twitter', 'instagram'])"),
    scheduledFor: z.string().optional().describe("ISO 8601 date-time to schedule for (optional)"),
    title: z.string().optional().describe("Short title for calendar display (optional)"),
  }),
  execute: async ({ content, platforms, scheduledFor, title }: { content: string; platforms: string[]; scheduledFor?: string; title?: string }) => {
    const accounts = await listLateAccounts();
    const platformTargets = platforms
      .map((p) => {
        const match = accounts.find((a) => a.platform === p);
        return match ? { platform: p, accountId: match._id } : null;
      })
      .filter(Boolean) as Array<{ platform: string; accountId: string }>;

    let postId: string | undefined;
    if (platformTargets.length > 0) {
      try {
        const post = await createPost({ content, platforms: platformTargets, scheduledFor });
        postId = post._id;
      } catch { /* Zernio may fail — still save locally */ }
    }

    const displayTitle = title || content.slice(0, 50) + (content.length > 50 ? "..." : "");
    const calendarPost = {
      id: crypto.randomUUID(),
      type: "draft" as const,
      clipTitle: displayTitle,
      content,
      platforms,
      scheduledFor: scheduledFor || new Date(Date.now() + 86400000).toISOString(),
      status: (scheduledFor ? "scheduled" : "draft") as "scheduled" | "draft",
      createdAt: new Date().toISOString(),
      postId,
    };
    await addScheduledPost(calendarPost);

    return { success: true, id: calendarPost.id, postId: postId ?? null, title: displayTitle, platforms, scheduledFor: calendarPost.scheduledFor, status: calendarPost.status };
  },
};

export const generatePostsTool = {
  name: "content_generate_posts",
  description: "Gather context for generating social media post drafts. Fetches niche, analytics, and trending topics.",
  inputSchema: z.object({
    topic: z.string().optional().describe("Topic focus (defaults to settings niche)"),
    count: z.number().optional().describe("Number of posts to generate (default 3)"),
    style: z.enum(["tweet", "linkedin", "caption", "thread"]).optional().describe("Post style/format"),
  }),
  execute: async ({ topic, count, style }: { topic?: string; count?: number; style?: "tweet" | "linkedin" | "caption" | "thread" }) => {
    const config = await getEffectiveConfig();
    const niche = topic || config.niche || "general";

    let topPosts: Array<{ content: string; analytics: unknown }> = [];
    try {
      const recentPosts = await listPosts({ status: "published", limit: 5 });
      for (const p of recentPosts.slice(0, 3)) {
        const full = await getPost(p._id);
        topPosts.push({ content: full.content, analytics: full.analytics });
      }
    } catch { /* no posts yet */ }

    const creators = await getCreators();
    const trendingTopics: string[] = [];
    for (const c of creators.slice(0, 3)) {
      if (!c.channelId) continue;
      try {
        const feed = await fetchChannelFeedWithMeta(c.channelId);
        trendingTopics.push(...feed.videos.slice(0, 3).map((v) => v.title));
      } catch { /* skip */ }
    }

    return {
      niche,
      requestedCount: count || 3,
      style: style || "tweet",
      recentTopPosts: topPosts,
      trendingCreatorTopics: trendingTopics.slice(0, 10),
      instruction: `Generate ${count || 3} ${style || "tweet"}-style post drafts about "${niche}". Use the analytics and trending topics to inform what content performs well. After writing each post, call create_draft for each one with the appropriate platforms.`,
    };
  },
};

const SUPPORTED_PLATFORMS = [
  "twitter", "instagram", "facebook", "linkedin", "tiktok", "youtube",
  "pinterest", "reddit", "bluesky", "threads", "googlebusiness", "telegram",
  "snapchat", "whatsapp",
];

export const connectAccountTool = {
  name: "content_connect_account",
  description: "Connect a social media account via Zernio OAuth. Returns an authorization URL the creator should visit to complete the connection. Supported platforms: twitter, instagram, facebook, linkedin, tiktok, youtube, pinterest, reddit, bluesky, threads, googlebusiness, telegram, snapchat, whatsapp.",
  inputSchema: z.object({
    platform: z.string().describe("Platform to connect (e.g. 'twitter', 'instagram', 'tiktok')"),
    profileId: z.string().optional().describe("Optional Zernio profile ID to associate the account with"),
  }),
  execute: async ({ platform }: { platform: string; profileId?: string }) => {
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return { error: `Unsupported platform "${platform}". Supported: ${SUPPORTED_PLATFORMS.join(", ")}` };
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/accounts/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true, platform, authUrl: data.authUrl, message: `Send the user this link to connect their ${platform} account: ${data.authUrl}` };
  },
};
