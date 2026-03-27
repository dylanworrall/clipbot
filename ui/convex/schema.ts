import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    tier: v.optional(v.string()), // "free" | "pro" | "business"
    messageCount: v.optional(v.number()), // messages used this period
    periodStart: v.optional(v.string()), // ISO timestamp, resets monthly
    whopMembershipId: v.optional(v.string()),
    credits: v.optional(v.number()), // legacy field
    createdAt: v.string(),
  }).index("by_email", ["email"]),

  spaces: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    settings: v.any(),
    accounts: v.array(v.string()),
    creators: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  creators: defineTable({
    userId: v.optional(v.string()),
    channelId: v.string(),
    channelName: v.string(),
    channelUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    autoProcess: v.boolean(),
    defaultOptions: v.any(),
    lastCheckedAt: v.optional(v.string()),
    lastVideoId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_userId", ["userId"]),

  runs: defineTable({
    userId: v.optional(v.string()),
    sourceUrl: v.string(),
    status: v.string(),
    pid: v.optional(v.number()),
    spaceId: v.optional(v.string()),
    options: v.any(),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
    outputDir: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  scheduledPosts: defineTable({
    userId: v.optional(v.string()),
    runId: v.string(),
    clipIndex: v.number(),
    clipTitle: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("published"), v.literal("cancelled")),
    createdAt: v.string(),
    postId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"]),

  notifications: defineTable({
    userId: v.optional(v.string()),
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
    .index("by_videoId", ["videoId"])
    .index("by_userId", ["userId"]),

  chatMessages: defineTable({
    userId: v.optional(v.string()),
    threadId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    toolCalls: v.optional(v.array(v.any())),
    toolResults: v.optional(v.array(v.any())),
    timestamp: v.string(),
  })
    .index("by_thread", ["threadId"])
    .index("by_userId", ["userId"]),

  settings: defineTable({
    userId: v.optional(v.string()),
    key: v.string(),
    value: v.any(),
  })
    .index("by_key", ["key"])
    .index("by_userId_key", ["userId", "key"]),
});
