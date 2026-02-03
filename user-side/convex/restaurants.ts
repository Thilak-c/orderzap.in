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

    return await ctx.db.insert("restaurants", {
      ...args,
      active: true,
      createdAt: Date.now(),
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
  },
  handler: async (ctx, args) => {
    const { restaurantId, ...updates } = args;
    await ctx.db.patch(restaurantId, updates);
  },
});
