import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("runs")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("runs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const run = await ctx.db.get(args.id);
    if (!run || run.userId !== identity.subject) return null;
    return run;
  },
});

export const create = mutation({
  args: {
    sourceUrl: v.string(),
    status: v.string(),
    spaceId: v.optional(v.string()),
    options: v.any(),
    outputDir: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("runs", {
      ...args,
      userId: identity.subject,
      startedAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("runs"),
    status: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    pid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const run = await ctx.db.get(args.id);
    if (!run || run.userId !== identity.subject) throw new Error("Not found");
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});
