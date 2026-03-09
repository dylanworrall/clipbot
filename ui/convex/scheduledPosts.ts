import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scheduledPosts").order("desc").collect();
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
    return await ctx.db.insert("scheduledPosts", {
      ...args,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    });
  },
});
