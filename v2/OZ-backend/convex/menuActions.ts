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
      description: string | null;
      photo_url: string | null;
      in_stock: boolean;
    }>(`SELECT id, name, price::float, category, description, photo_url, in_stock FROM menu_items ORDER BY id`);

    let synced = 0;
    for (const row of rows) {
      await ctx.runMutation(internal.menu.upsertMenuItemMirror, {
        pg_id: row.id,
        name: row.name,
        price: row.price,
        category: row.category,
        description: row.description || undefined,
        photo_url: row.photo_url || undefined,
        in_stock: row.in_stock,
      });
      synced++;
    }

    console.log(`✅ Synced ${synced} menu items from Postgres → Convex`);
    return { synced };
  },
});

export const createMenuItem = action({
  args: {
    name: v.string(),
    price: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
    photo_url: v.optional(v.string()),
    in_stock: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.monitoring.logEvent, {
      event: "PG_CREATE_START",
      details: `Initiating PG create for item: ${args.name}`,
    });

    try {
      const rows = await query<{ id: number }>(
        `INSERT INTO menu_items (name, price, category, description, photo_url, in_stock) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          args.name,
          args.price,
          args.category,
          args.description || null,
          args.photo_url || null,
          args.in_stock,
        ]
      );

      const pg_id = rows[0].id;
      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "PG_CREATE_OK",
        details: `Postgres row created (ID: ${pg_id})`,
      });

      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "CONVEX_SYNC_START",
        details: `Mirroring PG ID ${pg_id} to Convex...`,
      });

      await ctx.runMutation(internal.menu.upsertMenuItemMirror, {
        pg_id,
        name: args.name,
        price: args.price,
        category: args.category,
        description: args.description,
        photo_url: args.photo_url,
        in_stock: args.in_stock,
      });

      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "CONVEX_SYNC_OK",
        details: `Convex mirror ready for PG ID ${pg_id}`,
      });

      return { pg_id };
    } catch (error: any) {
      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "SYNC_ERROR",
        details: `PG Create failed: ${error.message || String(error)}`,
      });
      throw error;
    }
  },
});

export const updateMenuItem = action({
  args: {
    pg_id: v.number(),
    name: v.string(),
    price: v.number(),
    category: v.string(),
    description: v.optional(v.string()),
    photo_url: v.optional(v.string()),
    in_stock: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.monitoring.logEvent, {
      event: "PG_UPDATE_START",
      details: `Updating PG ID ${args.pg_id}: ${args.name}`,
    });

    try {
      const rows = await query<{ id: number }>(
        `UPDATE menu_items 
         SET name=$1, price=$2, category=$3, description=$4, photo_url=$5, in_stock=$6, updated_at=NOW() 
         WHERE id=$7 RETURNING id`,
        [
          args.name,
          args.price,
          args.category,
          args.description || null,
          args.photo_url || null,
          args.in_stock,
          args.pg_id,
        ]
      );

      if (rows.length === 0) {
        const errMsg = `Menu item with id ${args.pg_id} not found in Postgres`;
        await ctx.runMutation(internal.monitoring.logEvent, {
          event: "SYNC_ERROR",
          details: errMsg,
        });
        throw new Error(errMsg);
      }

      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "PG_UPDATE_OK",
        details: `Postgres updated (ID: ${args.pg_id})`,
      });

      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "CONVEX_SYNC_START",
        details: `Mirroring PG ID ${args.pg_id} update to Convex...`,
      });

      await ctx.runMutation(internal.menu.upsertMenuItemMirror, {
        pg_id: args.pg_id,
        name: args.name,
        price: args.price,
        category: args.category,
        description: args.description,
        photo_url: args.photo_url,
        in_stock: args.in_stock,
      });

      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "CONVEX_SYNC_OK",
        details: `Convex mirror updated for PG ID ${args.pg_id}`,
      });

      return { pg_id: args.pg_id };
    } catch (error: any) {
      await ctx.runMutation(internal.monitoring.logEvent, {
        event: "SYNC_ERROR",
        details: `Sync failed for PG ID ${args.pg_id}: ${error.message || String(error)}`,
      });
      throw error;
    }
  },
});
