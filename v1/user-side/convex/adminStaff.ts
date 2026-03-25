import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Create owner account for existing restaurant
export const createOwnerAccount = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    ownerName: v.string(),
    ownerPhone: v.string(),
    ownerPassword: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if owner already exists
    const existingOwner = await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("role"), "Owner"))
      .first();

    if (existingOwner) {
      throw new Error("Owner account already exists for this restaurant");
    }

    // Create owner staff account
    const staffId = await ctx.db.insert("staff", {
      restaurantId: args.restaurantId,
      name: args.ownerName,
      role: "Owner",
      phone: args.ownerPhone,
      email: args.email,
      password: args.ownerPassword, // In production, this should be hashed
      assignedTables: [], // Owner has access to all tables
      active: true,
      isOnline: false,
      ordersServedToday: 0,
      totalOrdersServed: 0,
      joiningDate: Date.now(),
    });

    // Update restaurant with owner info
    await ctx.db.patch(args.restaurantId, {
      ownerName: args.ownerName,
      ownerPhone: args.ownerPhone,
    });

    return staffId;
  },
});
