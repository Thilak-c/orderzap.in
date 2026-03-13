import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Smart Waiter Assignment System
 * 
 * Algorithm:
 * 1. Find all active waiters who are online
 * 2. Filter waiters who are assigned to the table (if table assignments exist)
 * 3. Calculate workload score for each waiter based on:
 *    - Current active orders assigned to them
 *    - Orders served today
 *    - Time since last order assignment
 * 4. Assign to waiter with lowest workload score
 */

// Get the best available waiter for an order
export const findBestWaiter = query({
  args: {
    restaurantId: v.id("restaurants"),
    tableNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { restaurantId, tableNumber } = args;

    // Get all active waiters for this restaurant
    const allStaff = await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    // Filter for active waiters who are online AND inside the restaurant
    let availableWaiters = allStaff.filter(
      (staff) =>
        staff.role === "Waiter" &&
        staff.active === true &&
        staff.isOnline === true &&
        staff.isInRestaurant === true // Must be inside restaurant
    );

    if (availableWaiters.length === 0) {
      return null; // No waiters available
    }

    // If table number is provided, prefer waiters assigned to that table
    if (tableNumber) {
      const assignedWaiters = availableWaiters.filter((waiter) =>
        waiter.assignedTables.includes(tableNumber)
      );
      if (assignedWaiters.length > 0) {
        availableWaiters = assignedWaiters;
      }
    }

    // Get current active orders for workload calculation
    const activeOrders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "preparing")
        )
      )
      .collect();

    // Calculate workload score for each waiter
    const waiterScores = availableWaiters.map((waiter) => {
      // Count current active orders assigned to this waiter
      const currentActiveOrders = activeOrders.filter(
        (order) => order.assignedWaiterId === waiter._id
      ).length;

      // Get orders served today (lower is better for balancing)
      const ordersServedToday = waiter.ordersServedToday || 0;

      // Time since last assignment (longer time = lower score = higher priority)
      const timeSinceLastAssignment = waiter.lastOrderAssignedAt
        ? Date.now() - waiter.lastOrderAssignedAt
        : Infinity;

      // Calculate workload score (lower is better)
      // Weight: current orders (50%), daily orders (30%), time factor (20%)
      const workloadScore =
        currentActiveOrders * 50 +
        ordersServedToday * 30 -
        Math.min(timeSinceLastAssignment / 60000, 20); // Max 20 points for time (1 point per minute)

      return {
        waiter,
        workloadScore,
        currentActiveOrders,
        ordersServedToday,
        timeSinceLastAssignment,
      };
    });

    // Sort by workload score (ascending - lowest score first)
    waiterScores.sort((a, b) => a.workloadScore - b.workloadScore);

    // Return the best waiter (lowest workload)
    return waiterScores[0];
  },
});

// Assign a waiter to an order
export const assignWaiterToOrder = mutation({
  args: {
    orderId: v.id("orders"),
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { orderId, waiterId } = args;

    // Update order with assigned waiter
    await ctx.db.patch(orderId, {
      assignedWaiterId: waiterId,
      assignedAt: Date.now(),
    });

    // Update waiter's last assignment time
    await ctx.db.patch(waiterId, {
      lastOrderAssignedAt: Date.now(),
    });

    return { success: true };
  },
});

// Auto-assign waiter when order becomes ready
export const autoAssignWaiter = internalMutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const { orderId } = args;

    // Get the order
    const order = await ctx.db.get(orderId);
    if (!order) return { success: false, error: "Order not found" };

    // Don't reassign if already assigned
    if (order.assignedWaiterId) {
      return { success: true, alreadyAssigned: true };
    }

    // Get restaurant ID
    const restaurantId =
      typeof order.restaurantId === "string"
        ? (order.restaurantId as Id<"restaurants">)
        : order.restaurantId;

    if (!restaurantId) {
      return { success: false, error: "Restaurant ID not found" };
    }

    // Get table number
    const tableNumber = order.tableId ? parseInt(order.tableId) : undefined;

    // Find best waiter using the query logic
    const allStaff = await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    let availableWaiters = allStaff.filter(
      (staff) =>
        staff.role === "Waiter" &&
        staff.active === true &&
        staff.isOnline === true &&
        staff.isInRestaurant === true // Must be inside restaurant
    );

    if (availableWaiters.length === 0) {
      // No waiters available - create notification for manager
      await ctx.db.insert("staffNotifications", {
        type: "no_waiter_available",
        message: `Order #${order.orderNumber} is ready but no waiters are available (online & in restaurant). Please assign manually.`,
        read: false,
        createdAt: Date.now(),
      });
      
      return { 
        success: false, 
        error: "No waiters available (must be online and inside restaurant)",
        notificationCreated: true 
      };
    }

    // Prefer waiters assigned to this table
    if (tableNumber) {
      const assignedWaiters = availableWaiters.filter((waiter) =>
        waiter.assignedTables.includes(tableNumber)
      );
      if (assignedWaiters.length > 0) {
        availableWaiters = assignedWaiters;
      }
    }

    // Get active orders for workload calculation
    const activeOrders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "preparing")
        )
      )
      .collect();

    // Calculate workload scores
    const waiterScores = availableWaiters.map((waiter) => {
      const currentActiveOrders = activeOrders.filter(
        (o) => o.assignedWaiterId === waiter._id
      ).length;
      const ordersServedToday = waiter.ordersServedToday || 0;
      const timeSinceLastAssignment = waiter.lastOrderAssignedAt
        ? Date.now() - waiter.lastOrderAssignedAt
        : Infinity;

      const workloadScore =
        currentActiveOrders * 50 +
        ordersServedToday * 30 -
        Math.min(timeSinceLastAssignment / 60000, 20);

      return { waiter, workloadScore };
    });

    // Sort and get best waiter
    waiterScores.sort((a, b) => a.workloadScore - b.workloadScore);
    const bestWaiter = waiterScores[0].waiter;

    // Assign waiter to order
    await ctx.db.patch(orderId, {
      assignedWaiterId: bestWaiter._id,
      assignedAt: Date.now(),
      assignmentStatus: "pending",
      assignmentTimeoutAt: Date.now() + 60000, // 1 minute timeout
    });

    // Update waiter's last assignment time
    await ctx.db.patch(bestWaiter._id, {
      lastOrderAssignedAt: Date.now(),
    });

    return {
      success: true,
      waiterId: bestWaiter._id,
      waiterName: bestWaiter.name,
    };
  },
});

// Increment waiter's served count when order is completed
export const incrementWaiterServedCount = internalMutation({
  args: {
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { waiterId } = args;

    const waiter = await ctx.db.get(waiterId);
    if (!waiter) return { success: false };

    await ctx.db.patch(waiterId, {
      ordersServedToday: (waiter.ordersServedToday || 0) + 1,
      totalOrdersServed: (waiter.totalOrdersServed || 0) + 1,
    });

    return { success: true };
  },
});

// Reset daily counts (should be called by a cron job at midnight)
export const resetDailyCounts = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const { restaurantId } = args;

    const allStaff = await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    for (const staff of allStaff) {
      await ctx.db.patch(staff._id, {
        ordersServedToday: 0,
      });
    }

    return { success: true, resetCount: allStaff.length };
  },
});

// Get waiter statistics
export const getWaiterStats = query({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const { restaurantId } = args;

    const allStaff = await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) => q.eq(q.field("role"), "Waiter"))
      .collect();

    // Get active orders
    const activeOrders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "preparing")
        )
      )
      .collect();

    const stats = allStaff.map((waiter) => {
      const currentActiveOrders = activeOrders.filter(
        (order) => order.assignedWaiterId === waiter._id
      ).length;

      return {
        id: waiter._id,
        name: waiter.name,
        active: waiter.active,
        isOnline: waiter.isOnline || false,
        currentActiveOrders,
        ordersServedToday: waiter.ordersServedToday || 0,
        totalOrdersServed: waiter.totalOrdersServed || 0,
        assignedTables: waiter.assignedTables,
        lastOrderAssignedAt: waiter.lastOrderAssignedAt,
      };
    });

    return stats;
  },
});

// Get unassigned ready orders (for manual assignment)
export const getUnassignedReadyOrders = query({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const { restaurantId } = args;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) => q.eq(q.field("status"), "ready"))
      .collect();

    // Filter orders without assigned waiter
    const unassignedOrders = orders.filter((order) => !order.assignedWaiterId);

    return unassignedOrders;
  },
});

// Manually assign waiter to order (for manager override)
export const manuallyAssignWaiter = mutation({
  args: {
    orderId: v.id("orders"),
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { orderId, waiterId } = args;

    // Verify waiter exists and is active
    const waiter = await ctx.db.get(waiterId);
    if (!waiter || !waiter.active) {
      throw new Error("Waiter not found or inactive");
    }

    // Update order with assigned waiter
    await ctx.db.patch(orderId, {
      assignedWaiterId: waiterId,
      assignedAt: Date.now(),
    });

    // Update waiter's last assignment time
    await ctx.db.patch(waiterId, {
      lastOrderAssignedAt: Date.now(),
    });

    return { success: true, waiterName: waiter.name };
  },
});

// Retry auto-assignment for unassigned orders (can be called manually or via cron)
export const retryUnassignedOrders = mutation({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    const { restaurantId } = args;

    // Get all ready orders without assigned waiter
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) => q.eq(q.field("status"), "ready"))
      .collect();

    const unassignedOrders = orders.filter((order) => !order.assignedWaiterId);

    let successCount = 0;
    let failCount = 0;

    // Try to assign each unassigned order
    for (const order of unassignedOrders) {
      const result = await ctx.scheduler.runAfter(
        0,
        internal.waiterAssignment.autoAssignWaiter,
        {
          orderId: order._id,
        }
      );
      
      // Note: We can't await scheduler results, so we just trigger them
      successCount++;
    }

    return {
      success: true,
      attempted: unassignedOrders.length,
      message: `Attempted to assign ${unassignedOrders.length} unassigned orders`,
    };
  },
});


// Check for timed-out assignments and reassign
export const checkAssignmentTimeouts = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all orders with pending assignments that have timed out
    const allOrders = await ctx.db.query("orders").collect();
    
    const timedOutOrders = allOrders.filter(
      (order) =>
        order.assignmentStatus === "pending" &&
        order.assignmentTimeoutAt &&
        now > order.assignmentTimeoutAt
    );

    let reassignedCount = 0;
    let failedCount = 0;

    for (const order of timedOutOrders) {
      // Mark as timeout
      await ctx.db.patch(order._id, {
        assignmentStatus: "timeout",
        assignedWaiterId: undefined,
        assignedAt: undefined,
        assignmentTimeoutAt: undefined,
      });

      // Try to reassign to another waiter
      try {
        await ctx.scheduler.runAfter(
          0,
          internal.waiterAssignment.autoAssignWaiter,
          {
            orderId: order._id,
          }
        );
        reassignedCount++;
      } catch (error) {
        failedCount++;
        
        // Create notification for manager
        await ctx.db.insert("staffNotifications", {
          type: "assignment_timeout",
          message: `Order #${order.orderNumber} assignment timed out. Unable to reassign.`,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      timedOutCount: timedOutOrders.length,
      reassignedCount,
      failedCount,
    };
  },
});

// Reset all daily counts for all restaurants
export const resetAllDailyCounts = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const allRestaurants = await ctx.db.query("restaurants").collect();
    
    let totalReset = 0;

    for (const restaurant of allRestaurants) {
      const allStaff = await ctx.db
        .query("staff")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
        .collect();

      for (const staff of allStaff) {
        await ctx.db.patch(staff._id, {
          ordersServedToday: 0,
        });
        totalReset++;
      }
    }

    return { success: true, totalReset };
  },
});
