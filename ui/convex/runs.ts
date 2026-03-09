import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("runs").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("runs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
    return await ctx.db.insert("runs", {
      ...args,
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
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});
