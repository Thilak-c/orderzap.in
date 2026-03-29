import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * orders.ts — Queries & Internal Mutations (Standard Convex Runtime)
 * ──────────────────────────────────────────────────────────────────
 * These run in the default Convex runtime (NOT Node.js).
 * They read/write the Convex mirror tables only.
 *
 * The actual Postgres writes happen in ordersActions.ts (Node.js runtime).
 */

// ── Queries ───────────────────────────────────────────────────────

/**
 * getLiveOrders — Reactive query for the Chef screen.
 * Returns all orders that are NOT "served", sorted by creation time.
 */
export const getLiveOrders = query({
  args: {},
  handler: async (ctx) => {
    const pendingOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const cookingOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "cooking"))
      .collect();

    // Combine and sort by creation time (oldest first)
    return [...pendingOrders, ...cookingOrders].sort(
      (a, b) => a._creationTime - b._creationTime
    );
  },
});

// ── Internal Mutations (called by Actions after Postgres write) ───

/**
 * insertOrderMirror — Mirror a newly created Postgres order into Convex.
 * Called by ordersActions.placeOrder AFTER successful Postgres INSERT.
 */
export const insertOrderMirror = internalMutation({
  args: {
    pg_id: v.number(),
    table_no: v.number(),
    items: v.array(v.string()),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("cooking"),
      v.literal("served")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("orders", {
      pg_id: args.pg_id,
      table_no: args.table_no,
      items: args.items,
      total: args.total,
      status: args.status,
    });
  },
});

/**
 * updateOrderStatusMirror — Update order status in the Convex mirror.
 * Called by ordersActions.updateStatus AFTER successful Postgres UPDATE.
 */
export const updateOrderStatusMirror = internalMutation({
  args: {
    pg_id: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("cooking"),
      v.literal("served")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_pg_id", (q) => q.eq("pg_id", args.pg_id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
    }
  },
});
