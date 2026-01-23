import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get a setting by key
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting?.value || null;
  },
});

// Get all settings
export const getAll = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return settingsMap;
  },
});

// Update or create a setting
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
      return existing._id;
    } else {
      return await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
      });
    }
  },
});

// Initialize default settings
export const initDefaults = mutation({
  handler: async (ctx) => {
    const brandName = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "brandName"))
      .first();

    if (!brandName) {
      await ctx.db.insert("settings", {
        key: "brandName",
        value: "BTS DISC",
      });
    }

    const brandLogo = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "brandLogo"))
      .first();

    if (!brandLogo) {
      await ctx.db.insert("settings", {
        key: "brandLogo",
        value: "/logo.png",
      });
    }

    return { success: true };
  },
});
