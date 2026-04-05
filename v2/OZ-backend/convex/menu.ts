import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * menu.ts — Mirroring Mutations & Queries
 * ───────────────────────────────────────
 * These internal mutations are called by the Express backend 
 * immediately after successful writes to PostgreSQL. 
 * Indices on 'by_pg_id' ensure no duplicates and easy updates.
 */

// ── Generic Upsert Helper ──────────────────────────────────────────

const updateOrInsert = async (ctx: any, table: string, pgId: string, data: any) => {
  console.log(`[SYNC] Upserting to ${table} for pgId: ${pgId}`);
  
  const existing = await ctx.db
    .query(table)
    .withIndex("by_pg_id", (q: any) => q.eq("pgId", pgId))
    .unique();

  const record = { ...data, updatedAt: Date.now() };

  if (existing) {
    console.log(`[SYNC] Updating existing record ${existing._id}`);
    await ctx.db.patch(existing._id, record);
    return existing._id;
  } else {
    console.log(`[SYNC] Inserting new record`);
    const id = await ctx.db.insert(table, record);
    return id;
  }
};

const deleteByPgId = async (ctx: any, table: string, pgId: string) => {
  console.log(`[SYNC] Deleting from ${table} for pgId: ${pgId}`);
  const existing = await ctx.db
    .query(table)
    .withIndex("by_pg_id", (q: any) => q.eq("pgId", pgId))
    .unique();

  if (existing) {
    console.log(`[SYNC] Deleting record ${existing._id}`);
    await ctx.db.delete(existing._id);
    return true;
  }
  console.log(`[SYNC] Record not found for deletion`);
  return false;
};

// ── Mirroring Mutations ───────────────────────────────────────────

export const upsertRestaurantMirror = mutation({
  args: { pgId: v.string(), shortId: v.string(), name: v.string(), active: v.boolean() },
  handler: async (ctx, args) => await updateOrInsert(ctx, "restaurants", args.pgId, args),
});

export const upsertMenuMirror = mutation({
  args: { pgId: v.string(), restaurantId: v.string(), name: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => await updateOrInsert(ctx, "menus", args.pgId, args),
});

export const upsertCategoryMirror = mutation({
  args: { 
    pgId: v.string(), restaurantId: v.string(), menuId: v.optional(v.string()), 
    name: v.string(), isActive: v.boolean(), displayOrder: v.optional(v.number()) 
  },
  handler: async (ctx, args) => await updateOrInsert(ctx, "categories", args.pgId, args),
});

export const upsertItemMirror = mutation({
  args: {
    pgId: v.string(), restaurantId: v.string(), categoryId: v.string(),
    name: v.string(), price: v.number(), description: v.optional(v.string()),
    isAvailable: v.boolean(), isHidden: v.boolean(), shortcode: v.optional(v.string())
  },
  handler: async (ctx, args) => await updateOrInsert(ctx, "menu_items", args.pgId, args),
});

export const upsertVariantMirror = mutation({
  args: { pgId: v.string(), menuItemId: v.string(), name: v.string(), extraPrice: v.number() },
  handler: async (ctx, args) => await updateOrInsert(ctx, "item_variants", args.pgId, args),
});

export const upsertAddOnMirror = mutation({
  args: { pgId: v.string(), menuItemId: v.string(), name: v.string(), price: v.number(), isAvailable: v.boolean() },
  handler: async (ctx, args) => await updateOrInsert(ctx, "add_ons", args.pgId, args),
});

export const upsertZoneMirror = mutation({
  args: { pgId: v.string(), restaurantId: v.string(), name: v.string(), shortcode: v.optional(v.string()), isActive: v.boolean() },
  handler: async (ctx, args) => await updateOrInsert(ctx, "zones", args.pgId, args),
});

export const upsertShortcodeMirror = mutation({
  args: { 
    pgId: v.string(), restaurantId: v.string(), code: v.string(), 
    type: v.string(), referenceId: v.string(), isActive: v.boolean() 
  },
  handler: async (ctx, args) => await updateOrInsert(ctx, "shortcodes", args.pgId, args),
});

// ── Deletion Sync ──────────────────────────────────────────────────

export const deleteMirrorRecord = mutation({
  args: { table: v.string(), pgId: v.string() },
  handler: async (ctx, args) => await deleteByPgId(ctx, args.table, args.pgId),
});

// ── Maintenance ────────────────────────────────────────────────────

export const wipeAllMirrors = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["restaurants", "staff", "menus", "categories", "menu_items", "item_variants", "add_ons", "zones", "shortcodes"];
    for (const table of tables) {
      const records = await ctx.db.query(table as any).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }
    return { success: true, message: "All mirror tables wiped" };
  },
});

// ── Queries ───────────────────────────────────────────────────────

export const getRestaurantByPgId = query({
  args: { pgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_pg_id", (q) => q.eq("pgId", args.pgId))
      .unique();
  },
});

export const getCategoryByPgId = query({
  args: { pgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_pg_id", (q) => q.eq("pgId", args.pgId))
      .unique();
  },
});

export const getItemByPgId = query({
  args: { pgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menu_items")
      .withIndex("by_pg_id", (q) => q.eq("pgId", args.pgId))
      .unique();
  },
});

export const getRestaurantMenu = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menu_items")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});
