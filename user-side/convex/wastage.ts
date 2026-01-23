import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let entries;
    if (args.date) {
      entries = await ctx.db
        .query("wastage")
        .withIndex("by_date", (q) => q.eq("date", args.date))
        .collect();
    } else {
      entries = await ctx.db.query("wastage").collect();
    }

    const totalLoss = entries.reduce((sum, w) => sum + w.costLoss, 0);
    return { entries, totalLoss, count: entries.length };
  },
});

export const add = mutation({
  args: {
    itemId: v.id("inventory"),
    quantity: v.number(),
    reason: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const costLoss = args.quantity * item.costPerUnit;
    const newQuantity = Math.max(0, item.quantity - args.quantity);
    await ctx.db.patch(args.itemId, { quantity: newQuantity });

    return await ctx.db.insert("wastage", {
      itemId: args.itemId,
      itemName: item.name,
      quantity: args.quantity,
      reason: args.reason,
      date: args.date,
      costLoss,
    });
  },
});
