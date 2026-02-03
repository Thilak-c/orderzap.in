import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { restaurantId: v.optional(v.id("restaurants")) },
  handler: async (ctx, args) => {
    if (args.restaurantId) {
      return await ctx.db
        .query("zoneRequests")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("zoneRequests")
      .order("desc")
      .collect();
  },
});

export const listPending = query({
  args: { restaurantId: v.optional(v.id("restaurants")) },
  handler: async (ctx, args) => {
    if (args.restaurantId) {
      const allRequests = await ctx.db
        .query("zoneRequests")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .order("desc")
        .collect();
      return allRequests.filter(r => r.status === "pending");
    }
    return await ctx.db
      .query("zoneRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
    tableId: v.string(),
    tableNumber: v.number(),
    currentZone: v.optional(v.string()),
    requestedZone: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("zoneRequests", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("zoneRequests"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
