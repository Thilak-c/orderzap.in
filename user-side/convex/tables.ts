import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tables = await ctx.db.query("tables").collect();
    const zones = await ctx.db.query("zones").collect();
    
    // Attach zone info to each table
    return tables.map((table) => ({
      ...table,
      zone: table.zoneId ? zones.find((z) => z._id === table.zoneId) : null,
    }));
  },
});

export const getByNumber = query({
  args: { number: v.number() },
  handler: async (ctx, args) => {
    const tables = await ctx.db.query("tables").collect();
    const table = tables.find((t) => t.number === args.number);
    
    if (!table) return null;
    
    const zone = table.zoneId ? await ctx.db.get(table.zoneId) : null;
    return { ...table, zone };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    number: v.number(),
    capacity: v.optional(v.number()),
    zoneId: v.optional(v.id("zones")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tables", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("tables"),
    name: v.string(),
    number: v.number(),
    capacity: v.optional(v.number()),
    zoneId: v.optional(v.id("zones")),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Seed initial tables with zones
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("tables").first();
    if (existing) return "Already seeded";

    // Get zones
    const zones = await ctx.db.query("zones").collect();
    const mainDining = zones.find((z) => z.name === "Main Dining");
    const smokingZone = zones.find((z) => z.name === "Smoking Zone");
    const vipLounge = zones.find((z) => z.name === "VIP Lounge");

    const tables = [
      { name: "Table 1", number: 1, zoneId: smokingZone?._id },
      { name: "Table 2", number: 2, zoneId: smokingZone?._id },
      { name: "Table 3", number: 3, zoneId: smokingZone?._id },
      { name: "Table 4", number: 4, zoneId: mainDining?._id },
      { name: "Table 5", number: 5, zoneId: mainDining?._id },
      { name: "Table 6", number: 6, zoneId: mainDining?._id },
      { name: "Table 7", number: 7, zoneId: mainDining?._id },
      { name: "Table 8", number: 8, zoneId: vipLounge?._id },
      { name: "Table 9", number: 9, zoneId: vipLounge?._id },
      { name: "Table 10", number: 10, zoneId: vipLounge?._id },
    ];

    for (const table of tables) {
      await ctx.db.insert("tables", table);
    }
    return "Seeded!";
  },
});
