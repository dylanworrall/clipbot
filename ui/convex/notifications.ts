import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notifications").order("desc").collect();
  },
});

export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return all.length;
  },
});

export const update = mutation({
  args: {
    id: v.id("notifications"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return await ctx.db.get(args.id);
  },
});
