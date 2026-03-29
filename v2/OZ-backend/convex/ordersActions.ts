"use node";

/**
 * ordersActions.ts — Order Actions (Node.js Runtime)
 * ──────────────────────────────────────────────────
 * These actions run in the Node.js environment so they can
 * use the 'pg' library to write to PostgreSQL first,
 * then mirror the data into Convex via internal mutations.
 *
 * Write flow:
 *   React Native → Convex Action → PostgreSQL (via pg) → Convex Mirror
 */

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { query } from "./pgClient";

/**
 * placeOrder — Create a new order.
 *
 * Step 1: INSERT into Postgres (source of truth)
 * Step 2: Mirror into Convex for real-time reactivity
 * Step 3: If Postgres fails → throw error, Convex stays clean
 */
export const placeOrder = action({
  args: {
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
    // Step 1 — Write to PostgreSQL
    const rows = await query<{ id: number }>(
      `INSERT INTO orders (table_no, items, total, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [args.table_no, args.items, args.total, args.status]
    );

    const pgId = rows[0].id;

    // Step 2 — Mirror into Convex (only if Postgres succeeded)
    await ctx.runMutation(internal.orders.insertOrderMirror, {
      pg_id: pgId,
      table_no: args.table_no,
      items: args.items,
      total: args.total,
      status: args.status,
    });

    return { pg_id: pgId, status: "created" };
  },
});

/**
 * updateStatus — Change an order's status (e.g. pending → cooking → served).
 *
 * Step 1: UPDATE in Postgres
 * Step 2: Mirror the change into Convex
 */
export const updateStatus = action({
  args: {
    pg_id: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("cooking"),
      v.literal("served")
    ),
  },
  handler: async (ctx, args) => {
    // Step 1 — Update PostgreSQL
    await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [args.status, args.pg_id]
    );

    // Step 2 — Mirror into Convex
    await ctx.runMutation(internal.orders.updateOrderStatusMirror, {
      pg_id: args.pg_id,
      status: args.status,
    });

    return { pg_id: args.pg_id, status: args.status };
  },
});
