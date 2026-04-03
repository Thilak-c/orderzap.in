import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * getRecentLogs — Used by oz-monitor to fetch new sync events.
 */
export const getRecentLogs = query({
  args: {
    lastTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sync_logs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", args.lastTimestamp))
      .order("asc")
      .take(50);
  },
});

/**
 * logEvent — Internal mutation called by actions to record sync milestones.
 */
export const logEvent = internalMutation({
  args: {
    event: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sync_logs", {
      event: args.event,
      details: args.details,
      timestamp: Date.now(),
    });

    // Optional: Prune old logs (keep last 1000 or older than 24h)
    // For now, let's just insert.
  },
});
