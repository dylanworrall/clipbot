import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("scheduledPosts")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    runId: v.string(),
    clipIndex: v.number(),
    clipTitle: v.string(),
    platforms: v.array(v.string()),
    scheduledFor: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("scheduledPosts", {
      ...args,
      userId: identity.subject,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    });
  },
});
