import { z } from "zod";
import { getScheduledPosts, addScheduledPost, updateScheduledPost } from "@/lib/schedule-store";
import { listPosts, getPost, updatePost, deletePost, listLateAccounts } from "@/lib/late-client";

export const publishClip = {
  name: "content_publish_clip",
  description: "Publish a clip to social platforms via getLate.dev. Supports scheduling for later.",
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
  description: "List posts from getLate.dev. Optionally filter by status or platform.",
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
    postId: z.string().describe("The Late.dev post ID"),
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
    postId: z.string().describe("The Late.dev post ID to update"),
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
  description: "Delete a draft or scheduled post from getLate.dev.",
  inputSchema: z.object({
    postId: z.string().describe("The Late.dev post ID to delete"),
  }),
  execute: async ({ postId }: { postId: string }) => {
    await deletePost(postId);
    return { success: true, message: "Post deleted" };
  },
};

export const listAccountsTool = {
  name: "content_list_accounts",
  description: "List connected social media accounts from getLate.dev.",
  inputSchema: z.object({}),
  execute: async () => {
    const accounts = await listLateAccounts();
    return accounts.map((a) => ({ id: a._id, platform: a.platform, name: a.name }));
  },
};
