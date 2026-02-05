import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PRICE_PER_DAY = 83;
const TRIAL_DAYS = 7;

// Create subscription
export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    planType: v.string(),
    days: v.number(),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const totalPrice = args.days * PRICE_PER_DAY;
    const startDate = Date.now();
    const endDate = startDate + args.days * 24 * 60 * 60 * 1000;

    const subscriptionId = await ctx.db.insert("subscriptions", {
      restaurantId: args.restaurantId,
      planType: args.planType,
      days: args.days,
      pricePerDay: PRICE_PER_DAY,
      totalPrice,
      startDate,
      endDate,
      paymentStatus: "pending",
      status: "active",
      autoRenew: false,
      createdAt: Date.now(),
      createdBy: "user",
      notes: args.notes,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "restaurant",
      actorId: args.restaurantId,
      action: "subscription_created",
      entityType: "subscription",
      entityId: subscriptionId,
      description: `Subscription created for ${args.days} days (₹${totalPrice})`,
      createdAt: Date.now(),
    });

    return subscriptionId;
  },
});

// Activate subscription after payment
export const activate = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    // Update subscription
    await ctx.db.patch(args.subscriptionId, {
      paymentStatus: "completed",
      paymentId: args.paymentId,
    });

    // Update restaurant status
    await ctx.db.patch(subscription.restaurantId, {
      status: "active",
      subscriptionEndDate: subscription.endDate,
    });

    // Create notification
    await ctx.db.insert("notifications", {
      restaurantId: subscription.restaurantId,
      type: "payment_success",
      title: "Payment Successful!",
      message: `Your subscription for ${subscription.days} days has been activated.`,
      status: "pending",
      read: false,
      channels: ["in_app"],
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "system",
      action: "subscription_activated",
      entityType: "subscription",
      entityId: args.subscriptionId,
      description: `Subscription activated for ${subscription.days} days`,
      createdAt: Date.now(),
    });
  },
});

// Get subscriptions by restaurant
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

// Get active subscription
export const getActive = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.gt(q.field("endDate"), Date.now())
        )
      )
      .order("desc")
      .first();

    return subscriptions;
  },
});

// Calculate price
export const calculatePrice = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    return {
      days: args.days,
      pricePerDay: PRICE_PER_DAY,
      totalPrice: args.days * PRICE_PER_DAY,
      currency: "INR",
    };
  },
});

// Extend subscription (admin only)
export const extend = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    days: v.number(),
    extendedBy: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const currentEndDate = restaurant.subscriptionEndDate || Date.now();
    const newEndDate = currentEndDate + args.days * 24 * 60 * 60 * 1000;

    // Update restaurant
    await ctx.db.patch(args.restaurantId, {
      subscriptionEndDate: newEndDate,
      status: "active",
    });

    // Create extension record
    const subscriptionId = await ctx.db.insert("subscriptions", {
      restaurantId: args.restaurantId,
      planType: "trial_extension",
      days: args.days,
      pricePerDay: 0,
      totalPrice: 0,
      startDate: currentEndDate,
      endDate: newEndDate,
      paymentStatus: "completed",
      status: "active",
      createdAt: Date.now(),
      createdBy: "admin",
      notes: args.reason,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "admin",
      actorEmail: args.extendedBy,
      action: "subscription_extended",
      entityType: "restaurant",
      entityId: args.restaurantId,
      description: `Subscription extended by ${args.days} days. Reason: ${args.reason || "N/A"}`,
      createdAt: Date.now(),
    });

    return subscriptionId;
  },
});

// Cancel subscription
export const cancel = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    cancelledBy: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      notes: args.reason,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "admin",
      actorEmail: args.cancelledBy,
      action: "subscription_cancelled",
      entityType: "subscription",
      entityId: args.subscriptionId,
      description: `Subscription cancelled. Reason: ${args.reason || "N/A"}`,
      createdAt: Date.now(),
    });
  },
});

// Check access
export const checkAccess = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const now = Date.now();
    const endDate = restaurant.subscriptionEndDate || restaurant.trialEndDate || 0;
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    if (restaurant.status === "blocked") {
      return {
        hasAccess: false,
        status: restaurant.status,
        daysRemaining: 0,
        message: restaurant.blockedReason || "Your account has been blocked",
      };
    }

    if (restaurant.status === "expired" || daysRemaining <= 0) {
      return {
        hasAccess: false,
        status: "expired",
        daysRemaining: 0,
        message: "Your subscription has expired. Please renew to continue.",
      };
    }

    return {
      hasAccess: true,
      status: restaurant.status || "trial",
      daysRemaining,
      message: `You have ${daysRemaining} days remaining`,
    };
  },
});

// Get expiring subscriptions (for cron)
export const getExpiringSoon = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const futureDate = now + args.days * 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) =>
        q.and(
          q.gt(q.field("endDate"), now),
          q.lte(q.field("endDate"), futureDate)
        )
      )
      .collect();
  },
});

// Expire subscriptions (cron job)
export const expireSubscriptions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get expired subscriptions
    const expiredSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("endDate"), now))
      .collect();

    let count = 0;
    for (const sub of expiredSubs) {
      // Mark subscription as expired
      await ctx.db.patch(sub._id, { status: "expired" });

      // Update restaurant status
      await ctx.db.patch(sub.restaurantId, { status: "expired" });

      // Create notification
      await ctx.db.insert("notifications", {
        restaurantId: sub.restaurantId,
        type: "subscription_expired",
        title: "Subscription Expired",
        message: "Your subscription has expired. Please renew to continue using OrderZap.",
        status: "pending",
        read: false,
        channels: ["in_app", "email"],
        createdAt: Date.now(),
      });

      count++;
    }

    return { expired: count };
  },
});
