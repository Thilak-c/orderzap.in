import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").order("desc").collect();
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
    tableId: v.string(),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        image: v.string(),
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
      console.log("Deducting deposit:", args.depositUsed, "from phone:", args.customerPhone);
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", args.customerPhone))
        .first();
      
      console.log("Found customer:", customer);
      
      if (customer) {
        const newBalance = Math.max(0, customer.depositBalance - args.depositUsed);
        console.log("Old balance:", customer.depositBalance, "New balance:", newBalance);
        await ctx.db.patch(customer._id, { 
          depositBalance: newBalance,
          lastVisit: Date.now(),
          totalVisits: customer.totalVisits + 1,
          totalSpent: customer.totalSpent + args.total,
        });
      }
    } else {
      console.log("No deposit to deduct. depositUsed:", args.depositUsed, "customerPhone:", args.customerPhone);
    }

    return await ctx.db.insert("orders", {
      ...args,
      orderNumber,
      status: "pending",
      paymentStatus: args.paymentMethod === "pay-now" ? "paid" : "pending",
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
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
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const today = new Date().toDateString();
    
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const preparingOrders = orders.filter((o) => o.status === "preparing").length;
    const todayRevenue = orders
      .filter((o) => new Date(o._creationTime).toDateString() === today)
      .reduce((sum, o) => sum + o.total, 0);

    return { pendingOrders, preparingOrders, todayRevenue };
  },
});
