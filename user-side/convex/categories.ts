import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all categories for a restaurant
export const list = query({
  args: { restaurantId: v.union(v.id("restaurants"), v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("asc")
      .collect();
  },
});

// Create a new category
export const create = mutation({
  args: {
    restaurantId: v.union(v.id("restaurants"), v.string()),
    name: v.string(),
    icon: v.optional(v.string()),
    iconFileUrl: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if category already exists
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    
    const existingCategory = existing.find(c => c.name.toLowerCase() === args.name.toLowerCase());
    if (existingCategory) {
      throw new Error("Category already exists");
    }

    return await ctx.db.insert("categories", {
      restaurantId: args.restaurantId,
      name: args.name,
      icon: args.icon,
      iconFileUrl: args.iconFileUrl,
      iconUrl: args.iconUrl,
      order: existing.length,
      createdAt: Date.now(),
    });
  },
});

// Delete a category
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update category name
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    icon: v.optional(v.string()),
    iconFileUrl: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      icon: args.icon,
      iconFileUrl: args.iconFileUrl,
      iconUrl: args.iconUrl,
    });
  },
});
