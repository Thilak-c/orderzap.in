import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create payment record
export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    subscriptionId: v.optional(v.id("subscriptions")),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.optional(v.string()),
    gatewayName: v.optional(v.string()),
    gatewayOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      restaurantId: args.restaurantId,
      subscriptionId: args.subscriptionId,
      amount: args.amount,
      currency: args.currency,
      paymentMethod: args.paymentMethod,
      gatewayName: args.gatewayName,
      gatewayOrderId: args.gatewayOrderId,
      status: "pending",
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "restaurant",
      actorId: args.restaurantId,
      action: "payment_initiated",
      entityType: "payment",
      entityId: paymentId,
      description: `Payment initiated for ₹${args.amount}`,
      createdAt: Date.now(),
    });

    return paymentId;
  },
});

// Update payment status
export const updateStatus = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.string(),
    gatewayPaymentId: v.optional(v.string()),
    gatewaySignature: v.optional(v.string()),
    gatewayResponse: v.optional(v.any()),
    failedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const updates: any = {
      status: args.status,
      gatewayPaymentId: args.gatewayPaymentId,
      gatewaySignature: args.gatewaySignature,
      gatewayResponse: args.gatewayResponse,
      failedReason: args.failedReason,
    };

    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.paymentId, updates);

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "system",
      action: args.status === "completed" ? "payment_completed" : "payment_failed",
      entityType: "payment",
      entityId: args.paymentId,
      description: `Payment ${args.status}: ₹${payment.amount}`,
      createdAt: Date.now(),
    });

    return args.paymentId;
  },
});

// Get payments by restaurant
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

// Get payment by gateway order ID
export const getByGatewayOrderId = query({
  args: { gatewayOrderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_gateway_order_id", (q) => q.eq("gatewayOrderId", args.gatewayOrderId))
      .first();
  },
});

// Refund payment (admin only)
export const refund = mutation({
  args: {
    paymentId: v.id("payments"),
    refundAmount: v.number(),
    refundReason: v.string(),
    processedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    if (payment.status !== "completed") {
      throw new Error("Can only refund completed payments");
    }

    await ctx.db.patch(args.paymentId, {
      status: "refunded",
      refundAmount: args.refundAmount,
      refundReason: args.refundReason,
      refundedAt: Date.now(),
      processedBy: args.processedBy,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "admin",
      actorEmail: args.processedBy,
      action: "payment_refunded",
      entityType: "payment",
      entityId: args.paymentId,
      description: `Refund of ₹${args.refundAmount} processed. Reason: ${args.refundReason}`,
      createdAt: Date.now(),
    });
  },
});

// Get revenue stats
export const getRevenueStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const start = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000; // Last 30 days
    const end = args.endDate || Date.now();

    const payments = await ctx.db
      .query("payments")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), start),
          q.lte(q.field("createdAt"), end)
        )
      )
      .collect();

    const totalRevenue = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    const completedPayments = payments.filter((p) => p.status === "completed").length;
    const failedPayments = payments.filter((p) => p.status === "failed").length;
    const refundedAmount = payments
      .filter((p) => p.status === "refunded")
      .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

    return {
      totalRevenue,
      completedPayments,
      failedPayments,
      refundedAmount,
      totalTransactions: payments.length,
    };
  },
});
