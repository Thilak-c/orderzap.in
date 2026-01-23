import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getSettings = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("alertSettings").first();
    return settings || { whatsappNumber: "", alertsEnabled: false };
  },
});

export const updateSettings = mutation({
  args: {
    whatsappNumber: v.string(),
    alertsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("alertSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("alertSettings", args);
    }
  },
});
