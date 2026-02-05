import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get restaurant by short ID
export const getByShortId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_short_id", (q) => q.eq("id", args.id))
      .first();
    return restaurant;
  },
});

// Get all restaurants
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("restaurants").collect();
  },
});

// Get active restaurants
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("restaurants")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

// Create restaurant
export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    logo: v.optional(v.string()),
    brandName: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    themeColors: v.optional(v.union(
      v.object({
        dominant: v.string(),
        muted: v.string(),
        darkVibrant: v.string(),
        lightVibrant: v.string(),
      }),
      v.null()
    )),
  },
  handler: async (ctx, args) => {
    // Check if ID already exists
    const existing = await ctx.db
      .query("restaurants")
      .withIndex("by_short_id", (q) => q.eq("id", args.id))
      .first();
    
    if (existing) {
      throw new Error("Restaurant ID already exists");
    }

    const { themeColors, ...restArgs } = args;
    
    return await ctx.db.insert("restaurants", {
      ...restArgs,
      active: true,
      createdAt: Date.now(),
      themeColors: themeColors === null ? undefined : themeColors,
    });
  },
});

// Update restaurant
export const update = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.optional(v.string()),
    logo: v.optional(v.string()),
    brandName: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    active: v.optional(v.boolean()),
    themeColors: v.optional(v.object({
      dominant: v.string(),
      muted: v.string(),
      darkVibrant: v.string(),
      lightVibrant: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { restaurantId, ...updates } = args;
    await ctx.db.patch(restaurantId, updates);
  },
});

// Save theme colors for a restaurant
export const saveTheme = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    themeColors: v.object({
      dominant: v.string(),
      muted: v.string(),
      darkVibrant: v.string(),
      lightVibrant: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restaurantId, {
      themeColors: args.themeColors,
    });
  },
});

// Get theme colors for a restaurant
export const getTheme = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    return restaurant?.themeColors || null;
  },
});
