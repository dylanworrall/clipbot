import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    credits: v.number(),
    createdAt: v.string(),
  }).index("by_email", ["email"]),


  spaces: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    settings: v.any(),
    accounts: v.array(v.string()),
    creators: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),

  creators: defineTable({
    channelId: v.string(),
    channelName: v.string(),
    channelUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    autoProcess: v.boolean(),
    defaultOptions: v.any(),
    lastCheckedAt: v.optional(v.string()),
    lastVideoId: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_channelId", ["channelId"]),

  runs: defineTable({
    sourceUrl: v.string(),
    status: v.string(),
    pid: v.optional(v.number()),
    spaceId: v.optional(v.string()),
    options: v.any(),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    outputDir: v.string(),
  }).index("by_status", ["status"]),

  scheduledPosts: defineTable({
    runId: v.string(),
    clipIndex: v.number(),
    clipTitle: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("published"), v.literal("cancelled")),
    createdAt: v.string(),
    postId: v.optional(v.string()),
  }).index("by_status", ["status"]),

  notifications: defineTable({
    videoId: v.string(),
    videoTitle: v.string(),
    videoUrl: v.string(),
    creatorId: v.string(),
    creatorName: v.string(),
    publishedAt: v.string(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("dismissed")),
    runId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_videoId", ["videoId"]),

  chatMessages: defineTable({
    threadId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    toolCalls: v.optional(v.array(v.any())),
    toolResults: v.optional(v.array(v.any())),
    timestamp: v.string(),
  }).index("by_thread", ["threadId"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
