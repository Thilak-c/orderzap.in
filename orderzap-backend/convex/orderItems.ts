import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Upsert order item (create or update)
export const upsertOrderItem = mutation({
  args: {
    postgresId: v.string(),
    restaurantId: v.string(),
    postgresOrderId: v.string(),
    menuItemId: v.optional(v.string()),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    subtotal: v.number(),
    specialInstructions: v.optional(v.string()),
    customizations: v.array(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if order item exists
    const existing = await ctx.db
      .query("orderItems")
      .withIndex("by_postgres_id", (q) => q.eq("postgresId", args.postgresId))
      .first();

    // Only include fields that are actually defined (not undefined)
    const dataWithSync: any = {
      lastSyncedAt: Date.now(),
    };
    
    // Add all args that are not undefined
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        dataWithSync[key] = value;
      }
    }

    if (existing) {
      // Update existing order item
      await ctx.db.patch(existing._id, dataWithSync);
      return existing._id;
    } else {
      // Create new order item
      return await ctx.db.insert("orderItems", dataWithSync);
    }
  },
});

// Get order items by order ID
export const getOrderItems = query({
  args: { postgresOrderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("postgresOrderId", args.postgresOrderId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

// Delete order item (soft delete)
export const deleteOrderItem = mutation({
  args: { postgresId: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("orderItems")
      .withIndex("by_postgres_id", (q) => q.eq("postgresId", args.postgresId))
      .first();

    if (item) {
      await ctx.db.patch(item._id, {
        deletedAt: Date.now(),
      });
    }
  },
});
