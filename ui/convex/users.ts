import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// Get or create user (called after auth)
export const getOrCreate = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) return existing;

    // New users get 50 free credits
    const id = await ctx.db.insert("users", {
      email,
      name,
      credits: 50,
      createdAt: new Date().toISOString(),
    });
    return ctx.db.get(id);
  },
});

// Check credit balance
export const getCredits = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return user?.credits ?? 0;
  },
});

// Deduct credits (returns false if insufficient)
export const deductCredits = mutation({
  args: { email: v.string(), amount: v.number() },
  handler: async (ctx, { email, amount }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user || user.credits < amount) return false;

    await ctx.db.patch(user._id, { credits: user.credits - amount });
    return true;
  },
});

// Add credits (after purchase)
export const addCredits = mutation({
  args: { email: v.string(), amount: v.number() },
  handler: async (ctx, { email, amount }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) return false;

    await ctx.db.patch(user._id, { credits: user.credits + amount });
    return true;
  },
});
