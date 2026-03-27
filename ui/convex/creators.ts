import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("creators")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("creators", {
      ...args,
      userId: identity.subject,
      createdAt: new Date().toISOString(),
    });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("creators")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    if (existing) return "already seeded";

    await ctx.db.insert("creators", {
      userId: identity.subject,
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
