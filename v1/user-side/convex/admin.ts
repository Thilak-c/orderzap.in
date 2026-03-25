import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get dashboard statistics
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();
    const payments = await ctx.db.query("payments").collect();
    const subscriptions = await ctx.db.query("subscriptions").collect();

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const stats = {
      totalRestaurants: restaurants.length,
      trialRestaurants: restaurants.filter(r => r.status === 'trial').length,
      activeRestaurants: restaurants.filter(r => r.status === 'active').length,
      expiredRestaurants: restaurants.filter(r => r.status === 'expired').length,
      blockedRestaurants: restaurants.filter(r => r.status === 'blocked').length,
      
      totalRevenue: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      
      monthlyRevenue: payments
        .filter(p => p.status === 'completed' && p.createdAt >= thirtyDaysAgo)
        .reduce((sum, p) => sum + p.amount, 0),
      
      activeSubscriptions: subscriptions.filter(s => 
        s.status === 'active' && s.endDate > now
      ).length,
      
      expiringSoon: subscriptions.filter(s => 
        s.status === 'active' && 
        s.endDate > now && 
        s.endDate <= now + 7 * 24 * 60 * 60 * 1000
      ).length,
    };

    // Recent payments
    const recentPayments = await ctx.db
      .query("payments")
      .order("desc")
      .take(10);

    // Recent signups
    const recentSignups = await ctx.db
      .query("restaurants")
      .order("desc")
      .take(10);

    return {
      ...stats,
      recentPayments,
      recentSignups,
    };
  },
});

// Get all restaurants with filters
export const getRestaurants = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let restaurants = await ctx.db.query("restaurants").collect();

    // Filter by status
    if (args.status) {
      restaurants = restaurants.filter(r => r.status === args.status);
    }

    // Search
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      restaurants = restaurants.filter(r => 
        r.name.toLowerCase().includes(searchLower) ||
        r.email?.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower)
      );
    }

    // Get subscription info for each restaurant
    const restaurantsWithSubs = await Promise.all(
      restaurants.map(async (restaurant) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .order("desc")
          .first();

        const now = Date.now();
        const endDate = restaurant.subscriptionEndDate || restaurant.trialEndDate || 0;
        const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

        return {
          ...restaurant,
          subscription,
          daysRemaining,
        };
      })
    );

    return restaurantsWithSubs;
  },
});

// Get restaurant details with full history
export const getRestaurantDetails = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();

    const activityLogs = await ctx.db
      .query("activityLogs")
      .filter((q) => 
        q.and(
          q.eq(q.field("entityType"), "restaurant"),
          q.eq(q.field("entityId"), args.restaurantId)
        )
      )
      .order("desc")
      .take(50);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .take(20);

    const now = Date.now();
    const endDate = restaurant.subscriptionEndDate || restaurant.trialEndDate || 0;
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    return {
      restaurant,
      subscriptions,
      payments,
      activityLogs,
      notifications,
      daysRemaining,
    };
  },
});

// Update restaurant status (block/unblock)
export const updateRestaurantStatus = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    status: v.string(),
    reason: v.optional(v.string()),
    adminEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restaurantId, {
      status: args.status,
      blockedReason: args.reason,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "admin",
      actorEmail: args.adminEmail,
      action: args.status === 'blocked' ? 'restaurant_blocked' : 'restaurant_unblocked',
      entityType: "restaurant",
      entityId: args.restaurantId,
      description: `Status changed to ${args.status}${args.reason ? `: ${args.reason}` : ''}`,
      createdAt: Date.now(),
    });

    // Create notification
    await ctx.db.insert("notifications", {
      restaurantId: args.restaurantId,
      type: args.status === 'blocked' ? 'account_blocked' : 'account_unblocked',
      title: args.status === 'blocked' ? 'Account Blocked' : 'Account Unblocked',
      message: args.reason || `Your account status has been changed to ${args.status}`,
      status: "pending",
      read: false,
      channels: ["in_app", "email"],
      createdAt: Date.now(),
    });
  },
});

// Get all payments with filters
export const getAllPayments = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payments = await ctx.db.query("payments").order("desc").collect();

    if (args.status) {
      payments = payments.filter(p => p.status === args.status);
    }

    // Get restaurant info for each payment
    const paymentsWithRestaurant = await Promise.all(
      payments.map(async (payment) => {
        const restaurant = await ctx.db.get(payment.restaurantId);
        return {
          ...payment,
          restaurantName: restaurant?.name,
          restaurantEmail: restaurant?.email,
          restaurantShortId: restaurant?.id,
        };
      })
    );

    return paymentsWithRestaurant;
  },
});

// Get revenue analytics
export const getRevenueAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect();

    // Group by day
    const revenueByDay: Record<string, number> = {};
    
    payments.forEach(payment => {
      if (payment.status === 'completed') {
        const date = new Date(payment.createdAt).toISOString().split('T')[0];
        revenueByDay[date] = (revenueByDay[date] || 0) + payment.amount;
      }
    });

    const chartData = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      chartData,
      totalRevenue: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      totalTransactions: payments.length,
      completedTransactions: payments.filter(p => p.status === 'completed').length,
      failedTransactions: payments.filter(p => p.status === 'failed').length,
    };
  },
});

// Get activity logs
export const getActivityLogs = query({
  args: {
    entityType: v.optional(v.string()),
    action: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("activityLogs").order("desc");

    let logs = await query.collect();

    if (args.entityType) {
      logs = logs.filter(log => log.entityType === args.entityType);
    }

    if (args.action) {
      logs = logs.filter(log => log.action === args.action);
    }

    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }

    return logs;
  },
});

// Create admin user
export const createAdminUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Admin user with this email already exists");
    }

    const adminId = await ctx.db.insert("adminUsers", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      role: args.role,
      permissions: {
        view: true,
        edit: args.role === 'super_admin' || args.role === 'admin',
        delete: args.role === 'super_admin',
        refund: args.role === 'super_admin' || args.role === 'admin',
        manageAdmins: args.role === 'super_admin',
      },
      active: true,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      actorType: "admin",
      actorEmail: args.createdBy,
      action: "admin_user_created",
      entityType: "admin",
      entityId: adminId,
      description: `Admin user ${args.email} created with role ${args.role}`,
      createdAt: Date.now(),
    });

    return adminId;
  },
});

// Get admin user by email
export const getAdminByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});
