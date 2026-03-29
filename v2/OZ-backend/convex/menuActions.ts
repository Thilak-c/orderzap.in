"use node";

/**
 * menuActions.ts — Menu Actions (Node.js Runtime)
 * ───────────────────────────────────────────────
 * Actions that write to PostgreSQL first, then mirror into Convex.
 */

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { query } from "./pgClient";

/**
 * toggleStock — Toggle the in_stock flag for a menu item.
 *
 * Step 1: Read current state from Postgres
 * Step 2: Flip the value in Postgres
 * Step 3: Mirror the change into Convex
 */
export const toggleStock = action({
  args: {
    pg_id: v.number(),
  },
  handler: async (ctx, args) => {
    // Step 1 — Flip in_stock in Postgres and return the new value
    const rows = await query<{ in_stock: boolean }>(
      `UPDATE menu_items
       SET in_stock = NOT in_stock, updated_at = NOW()
       WHERE id = $1
       RETURNING in_stock`,
      [args.pg_id]
    );

    if (rows.length === 0) {
      throw new Error(`Menu item with id ${args.pg_id} not found in Postgres`);
    }

    const newStockStatus = rows[0].in_stock;

    // Step 2 — Mirror into Convex
    await ctx.runMutation(internal.menu.updateStockMirror, {
      pg_id: args.pg_id,
      in_stock: newStockStatus,
    });

    return { pg_id: args.pg_id, in_stock: newStockStatus };
  },
});

/**
 * syncMenuFromPostgres — Pull all menu items from Postgres into Convex.
 * Useful for initial setup or recovery after data drift.
 */
export const syncMenuFromPostgres = action({
  args: {},
  handler: async (ctx) => {
    const rows = await query<{
      id: number;
      name: string;
      price: number;
      category: string;
      in_stock: boolean;
    }>(`SELECT id, name, price::float, category, in_stock FROM menu_items ORDER BY id`);

    let synced = 0;
    for (const row of rows) {
      await ctx.runMutation(internal.menu.upsertMenuItemMirror, {
        pg_id: row.id,
        name: row.name,
        price: row.price,
        category: row.category,
        in_stock: row.in_stock,
      });
      synced++;
    }

    console.log(`✅ Synced ${synced} menu items from Postgres → Convex`);
    return { synced };
  },
});
