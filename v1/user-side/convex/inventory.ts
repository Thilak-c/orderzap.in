import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("inventory").collect();
    const lowStockItems = items.filter(item => item.quantity <= item.minStock);
    return {
      items,
      lowStockCount: lowStockItems.length,
      totalItems: items.length,
    };
  },
});

export const getLowStock = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("inventory").collect();
    return items.filter(item => item.quantity <= item.minStock);
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    unit: v.string(),
    quantity: v.number(),
    minStock: v.number(),
    costPerUnit: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventory", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    quantity: v.optional(v.number()),
    minStock: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const restock = mutation({
  args: {
    id: v.id("inventory"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    await ctx.db.patch(args.id, { quantity: item.quantity + args.quantity });
  },
});

export const deductStock = mutation({
  args: {
    deductions: v.array(v.object({
      itemId: v.id("inventory"),
      quantity: v.number(),
    })),
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    const results = [];
    const lowStockAlerts = [];

    for (const deduction of args.deductions) {
      const item = await ctx.db.get(deduction.itemId);
      if (!item) {
        results.push({ success: false, itemId: deduction.itemId, reason: "Item not found" });
        continue;
      }

      if (item.quantity < deduction.quantity) {
        results.push({ success: false, itemId: deduction.itemId, reason: "Insufficient stock" });
        continue;
      }

      const newQuantity = item.quantity - deduction.quantity;
      await ctx.db.patch(deduction.itemId, { quantity: newQuantity });

      await ctx.db.insert("deductions", {
        itemId: deduction.itemId,
        itemName: item.name,
        quantity: deduction.quantity,
        orderId: args.orderId,
      });

      results.push({ success: true, itemId: deduction.itemId });

      if (newQuantity <= item.minStock) {
        lowStockAlerts.push({ ...item, quantity: newQuantity });
      }
    }

    return { success: true, results, lowStockAlerts: lowStockAlerts.length };
  },
});

export const seed = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("inventory").first();
    if (existing) return "Already seeded";

    const items = [
      { name: "Cooking Oil", unit: "liters", quantity: 25, minStock: 10, costPerUnit: 150, category: "oils" },
      { name: "Paneer", unit: "kg", quantity: 8, minStock: 5, costPerUnit: 320, category: "dairy" },
      { name: "Chicken", unit: "kg", quantity: 12, minStock: 8, costPerUnit: 280, category: "meat" },
      { name: "Cheese", unit: "kg", quantity: 3, minStock: 4, costPerUnit: 450, category: "dairy" },
      { name: "Rice", unit: "kg", quantity: 50, minStock: 20, costPerUnit: 60, category: "grains" },
      { name: "Onions", unit: "kg", quantity: 15, minStock: 10, costPerUnit: 40, category: "vegetables" },
      { name: "Tomatoes", unit: "kg", quantity: 10, minStock: 8, costPerUnit: 50, category: "vegetables" },
      { name: "Garlic", unit: "kg", quantity: 2, minStock: 2, costPerUnit: 200, category: "vegetables" },
    ];

    for (const item of items) {
      await ctx.db.insert("inventory", item);
    }

    return "Seeded successfully";
  },
});
