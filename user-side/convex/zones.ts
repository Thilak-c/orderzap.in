import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("zones").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("zones", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("zones"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("zones") },
  handler: async (ctx, args) => {
    // Remove zone reference from tables
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_zone", (q) => q.eq("zoneId", args.id))
      .collect();
    
    for (const table of tables) {
      await ctx.db.patch(table._id, { zoneId: undefined });
    }
    
    await ctx.db.delete(args.id);
  },
});

// Seed default zones
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("zones").first();
    if (existing) return "Already seeded";

    const zones = [
      { name: "Main Dining", description: "Regular dining area" },
      { name: "Smoking Zone", description: "Hookah and smoking allowed" },
      { name: "VIP Lounge", description: "Premium seating area" },
      { name: "Outdoor", description: "Patio and outdoor seating" },
    ];

    for (const zone of zones) {
      await ctx.db.insert("zones", zone);
    }
    return "Seeded!";
  },
});
