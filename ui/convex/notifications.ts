import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
    return all.filter((n) => n.status === "pending").length;
  },
});

export const update = mutation({
  args: {
    id: v.id("notifications"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== identity.subject) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: args.status });
    return await ctx.db.get(args.id);
  },
});
