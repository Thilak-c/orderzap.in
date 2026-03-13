import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Set restaurant location (for admin to configure)
export const setRestaurantLocation = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const { restaurantId, latitude, longitude } = args;

    await ctx.db.patch(restaurantId, {
      location: {
        latitude,
        longitude,
      },
    });

    return { success: true };
  },
});

// Get restaurant location
export const getRestaurantLocation = query({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    return restaurant?.location || null;
  },
});

// Auto-detect and set restaurant location (can be called from admin panel)
export const autoDetectLocation = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const { restaurantId, latitude, longitude } = args;

    // Update restaurant location
    await ctx.db.patch(restaurantId, {
      location: {
        latitude,
        longitude,
      },
    });

    return { 
      success: true,
      message: "Restaurant location updated successfully",
      location: { latitude, longitude }
    };
  },
});
