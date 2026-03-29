import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * menu.ts — Queries & Internal Mutations (Standard Convex Runtime)
 * ────────────────────────────────────────────────────────────────
 * Read menu data from the Convex mirror for real-time reactivity.
 * Internal mutations are called by menuActions.ts after Postgres writes.
 */

// ── Queries ───────────────────────────────────────────────────────

/**
 * getMenu — Read all menu items from the Convex mirror.
 * Used by the React Native ordering screen.
 */
export const getMenu = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("menu_items").collect();
  },
});

// ── Internal Mutations ────────────────────────────────────────────

/**
 * updateStockMirror — Update in_stock flag in the Convex mirror.
 * Called by menuActions.toggleStock AFTER successful Postgres UPDATE.
 */
export const updateStockMirror = internalMutation({
  args: {
    pg_id: v.number(),
    in_stock: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("menu_items")
      .withIndex("by_pg_id", (q) => q.eq("pg_id", args.pg_id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { in_stock: args.in_stock });
    }
  },
});

/**
 * upsertMenuItemMirror — Insert or update a menu item in the Convex mirror.
 * Useful for initial sync from Postgres → Convex.
 */
export const upsertMenuItemMirror = internalMutation({
  args: {
    pg_id: v.number(),
    name: v.string(),
    price: v.number(),
    category: v.string(),
    in_stock: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("menu_items")
      .withIndex("by_pg_id", (q) => q.eq("pg_id", args.pg_id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        price: args.price,
        category: args.category,
        in_stock: args.in_stock,
      });
    } else {
      await ctx.db.insert("menu_items", {
        pg_id: args.pg_id,
        name: args.name,
        price: args.price,
        category: args.category,
        in_stock: args.in_stock,
      });
    }
  },
});
