import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("creators").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    channelId: v.string(),
    channelName: v.string(),
    channelUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    autoProcess: v.boolean(),
    defaultOptions: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("creators", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("creators").first();
    if (existing) return "already seeded";

    await ctx.db.insert("creators", {
      channelId: "demo-channel",
      channelName: "Demo Creator",
      channelUrl: "https://youtube.com/@demo",
      autoProcess: false,
      defaultOptions: {},
      createdAt: new Date().toISOString(),
    });
    return "seeded";
  },
});
