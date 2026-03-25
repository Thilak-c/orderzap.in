import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
  args: { restaurantId: v.optional(v.union(v.id("restaurants"), v.string())) },
  handler: async (ctx, args) => {
    let rid: any = args.restaurantId;
    if (rid && typeof rid === 'string' && !rid.match(/^[0-9a-fA-F]{24}$/)) {
      const rest = await ctx.db
        .query("restaurants")
        .withIndex("by_shortid", (q) => q.eq("id", rid))
        .first();
      if (rest) rid = rest._id;
    }
    
    let orders;
    if (rid) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", rid))
        .order("desc")
        .collect();
    } else {
      orders = await ctx.db.query("orders").order("desc").collect();
    }
    
    // Enrich orders with waiter information
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        if (order.assignedWaiterId) {
          const waiter = await ctx.db.get(order.assignedWaiterId);
          return {
            ...order,
            assignedWaiter: waiter ? { name: waiter.name, phone: waiter.phone } : null,
          };
        }
        return order;
      })
    );
    
    return enrichedOrders;
  },
});

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_customerSession", (q) => q.eq("customerSessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_phone", (q) => q.eq("customerPhone", args.phone))
      .order("desc")
      .collect();
  },
});

export const getActiveBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerSession", (q) => q.eq("customerSessionId", args.sessionId))
      .order("desc")
      .collect();
    
    // Return if there are any non-completed orders
    const activeOrders = orders.filter(o => o.status !== "completed");
    if (activeOrders.length > 0) {
      return activeOrders[0];
    }
    return null;
  },
});

export const getActiveByTable = query({
  args: { tableId: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .order("desc")
      .collect();
    
    // Return the most recent non-completed order for this table
    const activeOrders = orders.filter(o => o.status !== "completed");
    if (activeOrders.length > 0) {
      return activeOrders[0];
    }
    return null;
  },
});

export const hasOrders = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_customerSession", (q) => q.eq("customerSessionId", args.sessionId))
      .first();
    return !!order;
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    restaurantId: v.optional(v.union(v.id("restaurants"), v.string())),
    tableId: v.string(),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        image: v.optional(v.string()),
      })
    ),
    total: v.number(),
    paymentMethod: v.string(),
    notes: v.string(),
    customerSessionId: v.string(),
    customerPhone: v.optional(v.string()),
    depositUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let rid = args.restaurantId as any;
    if (rid && typeof rid === 'string' && !rid.match(/^[0-9a-fA-F]{24}$/)) {
      const rest = await ctx.db
        .query("restaurants")
        .withIndex("by_shortid", (q) => q.eq("id", rid))
        .first();
      if (rest) {
        rid = rest._id;
      }
    }
    // Count existing orders for this table to generate order number
    const tableOrders = await ctx.db
      .query("orders")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();
    
    const orderCount = tableOrders.length + 1;
    
    // Generate order number: TTOO (TT = table, OO = order count)
    const tableNum = args.tableId.padStart(2, '0');
    const orderNum = orderCount.toString().padStart(2, '0');
    const orderNumber = `${tableNum}${orderNum}`;

    // If deposit was used, deduct from customer's balance immediately
    if (args.depositUsed && args.depositUsed > 0 && args.customerPhone) {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", args.customerPhone!))
        .first();
      
      if (customer) {
        const newBalance = Math.max(0, customer.depositBalance - args.depositUsed);
        await ctx.db.patch(customer._id, { 
          depositBalance: newBalance,
          lastVisit: Date.now(),
          totalVisits: customer.totalVisits + 1,
          totalSpent: customer.totalSpent + args.total,
        });
      }
    }

    // Create order in Convex
    const orderId = await ctx.db.insert("orders", {
      ...args,
      orderNumber,
      status: "pending",
      paymentStatus: args.paymentMethod === "pay-now" ? "paid" : "pending",
      syncPending: false, // Initialize sync status
    });

    // Schedule PostgreSQL sync (async, non-blocking)
    // This will happen in the background
    // Commented out until syncToPostgres is implemented
    // ctx.scheduler.runAfter(0, internal.syncToPostgres.syncOrderToPostgres, {
    //   orderId,
    // });

    return orderId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    const oldStatus = order?.status;
    
    // Update order status
    await ctx.db.patch(args.id, { status: args.status });
    
    // Auto-assign waiter when order becomes ready
    if (args.status === "ready" && oldStatus !== "ready") {
      // Schedule waiter assignment (async, non-blocking)
      await ctx.scheduler.runAfter(0, internal.waiterAssignment.autoAssignWaiter, {
        orderId: args.id,
      });
    }
    
    // Increment waiter's served count when order is completed
    if (args.status === "completed" && oldStatus !== "completed" && order?.assignedWaiterId) {
      await ctx.scheduler.runAfter(0, internal.waiterAssignment.incrementWaiterServedCount, {
        waiterId: order.assignedWaiterId,
      });
    }
  },
});

export const updatePaymentStatus = mutation({
  args: {
    id: v.id("orders"),
    paymentStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { paymentStatus: args.paymentStatus });
  },
});

// Get stats for admin dashboard
export const getStats = query({
  args: { restaurantId: v.optional(v.id("restaurants")) },
  handler: async (ctx, args) => {
    let orders;
    if (args.restaurantId) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .collect();
    } else {
      orders = await ctx.db.query("orders").collect();
    }
    
    const today = new Date().toDateString();
    
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const preparingOrders = orders.filter((o) => o.status === "preparing").length;
    const todayRevenue = orders
      .filter((o) => new Date(o._creationTime).toDateString() === today)
      .reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);

    return { pendingOrders, preparingOrders, todayRevenue };
  },
});
