import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("spaces")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("spaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const space = await ctx.db.get(args.id);
    if (!space || space.userId !== identity.subject) return null;
    return space;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const now = new Date().toISOString();
    return await ctx.db.insert("spaces", {
      userId: identity.subject,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("spaces")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    if (existing) return "already seeded";

    const now = new Date().toISOString();
    await ctx.db.insert("spaces", {
      userId: identity.subject,
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
