import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Tier limits (messages per month)
const TIER_LIMITS: Record<string, number> = {
  free: 50,
  pro: 1000,
  business: 5000,
};

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

    const id = await ctx.db.insert("users", {
      email,
      name,
      tier: "free",
      messageCount: 0,
      periodStart: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    return ctx.db.get(id);
  },
});

// Get subscription info (tier, usage, limit)
export const getSubscription = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { tier: "free", messageCount: 0, limit: TIER_LIMITS.free, periodStart: new Date().toISOString() };

    const tier = user.tier ?? "free";
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
    const msgCount = user.messageCount ?? 0;
    const pStart = user.periodStart ?? new Date().toISOString();

    // Check if period needs reset (30 days)
    const periodStart = new Date(pStart);
    const now = new Date();
    const daysSincePeriodStart = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

    return {
      tier,
      messageCount: daysSincePeriodStart >= 30 ? 0 : msgCount,
      limit,
      periodStart: pStart,
    };
  },
});

// Check if user can send a message + deduct (returns { allowed, remaining })
export const useMessage = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) return { allowed: false, remaining: 0 };

    const tier = user.tier ?? "free";
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
    const pStart = user.periodStart ?? new Date().toISOString();

    // Reset period if 30+ days have passed
    const periodStart = new Date(pStart);
    const now = new Date();
    const daysSincePeriodStart = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

    let currentCount = user.messageCount ?? 0;
    if (daysSincePeriodStart >= 30) {
      currentCount = 0;
      await ctx.db.patch(user._id, {
        messageCount: 0,
        periodStart: now.toISOString(),
      });
    }

    if (currentCount >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await ctx.db.patch(user._id, { messageCount: currentCount + 1 });
    return { allowed: true, remaining: limit - currentCount - 1 };
  },
});

// Set tier (called from webhook)
export const setTier = mutation({
  args: {
    email: v.string(),
    tier: v.string(),
    whopMembershipId: v.optional(v.string()),
  },
  handler: async (ctx, { email, tier, whopMembershipId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) return false;

    const patch: Record<string, unknown> = { tier };
    if (whopMembershipId !== undefined) {
      patch.whopMembershipId = whopMembershipId;
    }
    // Reset usage on upgrade
    if (tier !== user.tier) {
      patch.messageCount = 0;
      patch.periodStart = new Date().toISOString();
    }
    await ctx.db.patch(user._id, patch);
    return true;
  },
});

// Keep old name as alias for backwards compat with credits API
export const getCredits = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return 0;
    const tier = user.tier ?? "free";
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
    const pStart = user.periodStart ?? new Date().toISOString();
    const periodStart = new Date(pStart);
    const now = new Date();
    const daysSincePeriodStart = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const currentCount = daysSincePeriodStart >= 30 ? 0 : (user.messageCount ?? 0);
    return limit - currentCount;
  },
});
