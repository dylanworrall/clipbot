import { v } from "convex/values";
import { mutation } from "./_generated/server";

// One-time migration: stamp userId on all existing records that lack it.
export const backfillUserId = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const tables = ["spaces", "creators", "runs", "scheduledPosts", "notifications", "chatMessages", "settings"] as const;
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      let patched = 0;
      for (const row of rows) {
        if (!(row as any).userId) {
          await ctx.db.patch(row._id, { userId } as any);
          patched++;
        }
      }
      counts[table] = patched;
    }

    return counts;
  },
});

// Wipe all content tables for a fresh start.
export const wipeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["spaces", "creators", "runs", "scheduledPosts", "notifications", "chatMessages", "settings"] as const;
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      counts[table] = rows.length;
    }

    return counts;
  },
});
