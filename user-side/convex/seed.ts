import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed initial restaurant
export const seedRestaurant = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if restaurant already exists
    const existing = await ctx.db
      .query("restaurants")
      .withIndex("by_short_id", (q) => q.eq("id", "bts"))
      .first();

    if (existing) {
      return { success: false, message: "Restaurant 'bts' already exists" };
    }

    // Create restaurant
    const restaurantId = await ctx.db.insert("restaurants", {
      id: "bts",
      name: "BTS Disc Cafe & Restro",
      brandName: "BTS DISC",
      logo: "/assets/logos/favicon_io/android-chrome-192x192.png",
      description: "Premium dining experience in Patna",
      address: "Patna, Bihar",
      phone: "+91 1234567890",
      email: "contact@btsdisc.com",
      active: true,
      createdAt: Date.now(),
    });

    return { 
      success: true, 
      message: "Restaurant seeded successfully",
      restaurantId 
    };
  },
});

// Update existing data to link to restaurant
export const linkExistingDataToRestaurant = mutation({
  args: {
    restaurantShortId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_short_id", (q) => q.eq("id", args.restaurantShortId))
      .first();

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    let updated = {
      zones: 0,
      tables: 0,
      menuItems: 0,
      staff: 0,
      orders: 0,
      reservations: 0,
      inventory: 0,
      wastage: 0,
      deductions: 0,
      staffCalls: 0,
      zoneRequests: 0,
      alertSettings: 0,
    };

    // Update zones
    const zones = await ctx.db.query("zones").collect();
    for (const zone of zones) {
      if (!zone.restaurantId) {
        await ctx.db.patch(zone._id, { restaurantId: restaurant._id });
        updated.zones++;
      }
    }

    // Update tables
    const tables = await ctx.db.query("tables").collect();
    for (const table of tables) {
      if (!table.restaurantId) {
        await ctx.db.patch(table._id, { restaurantId: restaurant._id });
        updated.tables++;
      }
    }

    // Update menu items
    const menuItems = await ctx.db.query("menuItems").collect();
    for (const item of menuItems) {
      if (!item.restaurantId) {
        await ctx.db.patch(item._id, { restaurantId: restaurant._id });
        updated.menuItems++;
      }
    }

    // Update staff
    const staff = await ctx.db.query("staff").collect();
    for (const member of staff) {
      if (!member.restaurantId) {
        await ctx.db.patch(member._id, { restaurantId: restaurant._id });
        updated.staff++;
      }
    }

    // Update orders
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      if (!order.restaurantId) {
        await ctx.db.patch(order._id, { restaurantId: restaurant._id });
        updated.orders++;
      }
    }

    // Update reservations
    const reservations = await ctx.db.query("reservations").collect();
    for (const reservation of reservations) {
      if (!reservation.restaurantId) {
        await ctx.db.patch(reservation._id, { restaurantId: restaurant._id });
        updated.reservations++;
      }
    }

    // Update inventory
    const inventory = await ctx.db.query("inventory").collect();
    for (const item of inventory) {
      if (!item.restaurantId) {
        await ctx.db.patch(item._id, { restaurantId: restaurant._id });
        updated.inventory++;
      }
    }

    // Update wastage
    const wastage = await ctx.db.query("wastage").collect();
    for (const item of wastage) {
      if (!item.restaurantId) {
        await ctx.db.patch(item._id, { restaurantId: restaurant._id });
        updated.wastage++;
      }
    }

    // Update deductions
    const deductions = await ctx.db.query("deductions").collect();
    for (const item of deductions) {
      if (!item.restaurantId) {
        await ctx.db.patch(item._id, { restaurantId: restaurant._id });
        updated.deductions++;
      }
    }

    // Update staff calls
    const staffCalls = await ctx.db.query("staffCalls").collect();
    for (const call of staffCalls) {
      if (!call.restaurantId) {
        await ctx.db.patch(call._id, { restaurantId: restaurant._id });
        updated.staffCalls++;
      }
    }

    // Update zone requests
    const zoneRequests = await ctx.db.query("zoneRequests").collect();
    for (const request of zoneRequests) {
      if (!request.restaurantId) {
        await ctx.db.patch(request._id, { restaurantId: restaurant._id });
        updated.zoneRequests++;
      }
    }

    // Update alert settings
    const alertSettings = await ctx.db.query("alertSettings").collect();
    for (const setting of alertSettings) {
      if (!setting.restaurantId) {
        await ctx.db.patch(setting._id, { restaurantId: restaurant._id });
        updated.alertSettings++;
      }
    }

    return {
      success: true,
      message: "Existing data linked to restaurant",
      updated,
    };
  },
});
