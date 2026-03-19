import { z } from "zod";
import { getCreators, addCreator, removeCreator } from "@/lib/creator-store";
import { getNotifications } from "@/lib/notification-store";
import { fetchChannelFeedWithMeta } from "@/lib/youtube-rss";

export const listCreators = {
  name: "content_list_creators",
  description: "List all tracked YouTube creators with channel name, URL, and auto-process setting.",
  inputSchema: z.object({}),
  execute: async () => {
    const creators = await getCreators();
    return creators.map((c) => ({ id: c.id, channelName: c.channelName, channelUrl: c.channelUrl, autoProcess: c.autoProcess, lastCheckedAt: c.lastCheckedAt ?? null }));
  },
};

export const addCreatorTool = {
  name: "content_add_creator",
  description: "Add a YouTube creator to track for new videos.",
  inputSchema: z.object({
    channelName: z.string().describe("YouTube channel name"),
    channelUrl: z.string().describe("YouTube channel URL (e.g. https://youtube.com/@channelname)"),
    channelId: z.string().optional().describe("YouTube channel ID (optional)"),
    autoProcess: z.boolean().optional().describe("Automatically process new videos (default false)"),
  }),
  execute: async ({ channelName, channelUrl, channelId, autoProcess }: { channelName: string; channelUrl: string; channelId?: string; autoProcess?: boolean }) => {
    const creator = { id: crypto.randomUUID(), channelId: channelId || "", channelName, channelUrl, autoProcess: autoProcess ?? false, defaultOptions: {}, createdAt: new Date().toISOString() };
    await addCreator(creator);
    return { success: true, id: creator.id, channelName: creator.channelName };
  },
};

export const removeCreatorTool = {
  name: "content_remove_creator",
  description: "Stop tracking a YouTube creator.",
  inputSchema: z.object({
    creatorId: z.string().describe("The creator ID to remove"),
  }),
  execute: async ({ creatorId }: { creatorId: string }) => {
    const removed = await removeCreator(creatorId);
    if (!removed) return { error: "Creator not found" };
    return { success: true, message: "Creator removed" };
  },
};

export const checkCreatorVideos = {
  name: "content_check_creator_videos",
  description: "Fetch a tracked creator's latest YouTube videos via RSS feed. Returns up to 10 recent videos.",
  inputSchema: z.object({
    creatorId: z.string().describe("The creator ID to check"),
  }),
  execute: async ({ creatorId }: { creatorId: string }) => {
    const creators = await getCreators();
    const creator = creators.find((c) => c.id === creatorId);
    if (!creator) return { error: "Creator not found" };
    if (!creator.channelId) return { error: "Creator has no channel ID — re-add with a channel ID" };
    const feed = await fetchChannelFeedWithMeta(creator.channelId);
    return { channelName: feed.channelName || creator.channelName, videos: feed.videos.slice(0, 10).map((v) => ({ videoId: v.videoId, title: v.title, url: v.url, publishedAt: v.publishedAt })) };
  },
};

export const getNotificationsTool = {
  name: "content_get_notifications",
  description: "View new video alerts from tracked YouTube creators.",
  inputSchema: z.object({
    status: z.string().optional().describe("Filter: 'pending', 'processing', 'dismissed'"),
    limit: z.number().optional().describe("Max notifications to return (default 20)"),
  }),
  execute: async ({ status, limit }: { status?: string; limit?: number }) => {
    let notifications = await getNotifications();
    if (status) notifications = notifications.filter((n) => n.status === status);
    return notifications.slice(0, limit || 20).map((n) => ({ id: n.id, videoTitle: n.videoTitle, videoUrl: n.videoUrl, creatorName: n.creatorName, publishedAt: n.publishedAt, status: n.status, runId: n.runId ?? null }));
  },
};
