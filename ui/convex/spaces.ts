import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("spaces").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("spaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    niche: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("spaces", {
      name: args.name,
      description: args.description ?? "",
      icon: args.icon ?? "",
      settings: args.niche ? { niche: args.niche } : {},
      accounts: [],
      creators: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("spaces").first();
    if (existing) return "already seeded";

    const now = new Date().toISOString();
    await ctx.db.insert("spaces", {
      name: "Default",
      description: "Default content space",
      icon: "",
      settings: { niche: "cannabis" },
      accounts: [],
      creators: [],
      createdAt: now,
      updatedAt: now,
    });
    return "seeded";
  },
});
