import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Mirror Schema
 * ────────────────────
 * These tables MIRROR the PostgreSQL source-of-truth.
 * Convex is the reactive event layer — data is written to Postgres first,
 * then mirrored here for real-time subscriptions.
 *
 * `pg_id` maps each document back to its Postgres row (PK).
 */
export default defineSchema({
  menu_items: defineTable({
    pg_id: v.number(),
    name: v.string(),
    price: v.number(),
    category: v.string(),
    in_stock: v.boolean(),
  }).index("by_pg_id", ["pg_id"]),

  orders: defineTable({
    pg_id: v.number(),
    table_no: v.number(),
    items: v.array(v.string()),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("cooking"),
      v.literal("served")
    ),
  })
    .index("by_pg_id", ["pg_id"])
    .index("by_status", ["status"]),
});
