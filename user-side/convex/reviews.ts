import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Submit a review
export const create = mutation({
  args: {
    restaurantId: v.string(),
    tableId: v.string(),
    tableNumber: v.number(),
    enjoyed: v.boolean(),
    issueWith: v.optional(v.string()),
    issueCategory: v.optional(v.string()),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewId = await ctx.db.insert("reviews", {
      restaurantId: args.restaurantId,
      tableId: args.tableId,
      tableNumber: args.tableNumber,
      enjoyed: args.enjoyed,
      issueWith: args.issueWith,
      issueCategory: args.issueCategory,
      feedback: args.feedback,
      createdAt: Date.now(),
    });
    return reviewId;
  },
});

// Update review with issue type and feedback
export const updateFeedback = mutation({
  args: {
    reviewId: v.id("reviews"),
    issueWith: v.optional(v.string()),
    issueCategory: v.optional(v.string()),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.issueWith) updates.issueWith = args.issueWith;
    if (args.issueCategory) updates.issueCategory = args.issueCategory;
    if (args.feedback) updates.feedback = args.feedback;
    
    await ctx.db.patch(args.reviewId, updates);
  },
});

// Get all reviews for a restaurant
export const listByRestaurant = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

// Get review stats for a restaurant
export const getStats = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    
    const total = reviews.length;
    const positive = reviews.filter(r => r.enjoyed).length;
    const negative = reviews.filter(r => !r.enjoyed).length;
    const withFeedback = reviews.filter(r => r.feedback).length;
    
    return {
      total,
      positive,
      negative,
      withFeedback,
      positiveRate: total > 0 ? (positive / total) * 100 : 0,
    };
  },
});
