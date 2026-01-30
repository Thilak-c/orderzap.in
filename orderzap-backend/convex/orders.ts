import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Upsert order (create or update)
export const upsertOrder = mutation({
  args: {
    postgresId: v.string(),
    restaurantId: v.string(),
    tableId: v.optional(v.string()),
    orderNumber: v.string(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerSessionId: v.optional(v.string()),
    status: v.string(),
    subtotal: v.number(),
    taxAmount: v.number(),
    tipAmount: v.number(),
    discountAmount: v.number(),
    depositUsed: v.number(),
    totalAmount: v.number(),
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.string(),
    paymentTransactionId: v.optional(v.string()),
    notes: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    estimatedReadyTime: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  },

  
  handler: async (ctx, args) => {
    // PROOF LOGGING: Capture exact args received by Convex
    console.log('🔍 CONVEX MUTATION RECEIVED ARGS:', {
      postgresId: args.postgresId,
      hasCancellationReason: 'cancellationReason' in args,
      cancellationReasonValue: args.cancellationReason,
      cancellationReasonType: typeof args.cancellationReason,
      allKeys: Object.keys(args),
    });
    
    // Check if order exists
    const existing = await ctx.db
      .query("orders")
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
      // Update existing order
      await ctx.db.patch(existing._id, dataWithSync);
      return existing._id;
    } else {
      // Create new order
      return await ctx.db.insert("orders", dataWithSync);
    }
  },
});

// Get order by PostgreSQL ID
export const getOrder = query({
  args: { postgresId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_postgres_id", (q) => q.eq("postgresId", args.postgresId))
      .first();
  },
});

// List orders for a restaurant
export const listOrders = query({
  args: {
    restaurantId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const orders = await query.collect();
    
    if (args.limit) {
      return orders.slice(0, args.limit);
    }
    
    return orders;
  },
});

// Delete order (soft delete)
export const deleteOrder = mutation({
  args: { postgresId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_postgres_id", (q) => q.eq("postgresId", args.postgresId))
      .first();

    if (order) {
      await ctx.db.patch(order._id, {
        deletedAt: Date.now(),
      });
    }
  },
});
