import { query } from "./_generated/server";
import { v } from "convex/values";

function getDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function getHour(timestamp: number): number {
  return new Date(timestamp).getHours();
}

function getDayOfWeek(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' });
}

// Sales Overview
export const salesOverview = query({
  args: { 
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("orders").collect();
    
    const now = Date.now();
    const today = getDateString(now);
    const yesterday = getDateString(now - 86400000);
    const thisWeekStart = now - (new Date().getDay() * 86400000);
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Filter by date range if provided
    let filteredOrders = orders;
    if (args.startDate) {
      filteredOrders = filteredOrders.filter(o => getDateString(o._creationTime) >= args.startDate!);
    }
    if (args.endDate) {
      filteredOrders = filteredOrders.filter(o => getDateString(o._creationTime) <= args.endDate!);
    }

    const todayOrders = orders.filter(o => getDateString(o._creationTime) === today);
    const yesterdayOrders = orders.filter(o => getDateString(o._creationTime) === yesterday);
    const weekOrders = orders.filter(o => o._creationTime >= thisWeekStart);
    const monthOrders = orders.filter(o => o._creationTime >= thisMonthStart);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : 0;

    return {
      today: { orders: todayOrders.length, revenue: todayRevenue },
      yesterday: { orders: yesterdayOrders.length, revenue: yesterdayRevenue },
      thisWeek: { orders: weekOrders.length, revenue: weekRevenue },
      thisMonth: { orders: monthOrders.length, revenue: monthRevenue },
      revenueChange,
      avgOrderValue: filteredOrders.length > 0 
        ? filteredOrders.reduce((sum, o) => sum + o.total, 0) / filteredOrders.length 
        : 0,
      totalOrders: filteredOrders.length,
      totalRevenue: filteredOrders.reduce((sum, o) => sum + o.total, 0),
    };
  },
});

// Daily Revenue Trend (last 30 days)
export const dailyRevenueTrend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const orders = await ctx.db.query("orders").collect();
    
    const trend: Record<string, { date: string; revenue: number; orders: number }> = {};
    
    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = getDateString(Date.now() - i * 86400000);
      trend[date] = { date, revenue: 0, orders: 0 };
    }

    // Fill in actual data
    orders.forEach(order => {
      const date = getDateString(order._creationTime);
      if (trend[date]) {
        trend[date].revenue += order.total;
        trend[date].orders += 1;
      }
    });

    return Object.values(trend);
  },
});

// Best Selling Items
export const bestSellingItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const orders = await ctx.db.query("orders").collect();
    
    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.menuItemId;
        if (!itemSales[key]) {
          itemSales[key] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemSales[key].quantity += item.quantity;
        itemSales[key].revenue += item.price * item.quantity;
      });
    });

    return Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  },
});

// Category Performance
export const categoryPerformance = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const menuItems = await ctx.db.query("menuItems").collect();
    
    const menuMap = new Map(menuItems.map(m => [m._id, m.category]));
    const categoryStats: Record<string, { category: string; quantity: number; revenue: number }> = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const category = menuMap.get(item.menuItemId) || "Other";
        if (!categoryStats[category]) {
          categoryStats[category] = { category, quantity: 0, revenue: 0 };
        }
        categoryStats[category].quantity += item.quantity;
        categoryStats[category].revenue += item.price * item.quantity;
      });
    });

    return Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue);
  },
});

// Peak Hours Analysis
export const peakHoursAnalysis = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    const hourlyStats: Record<number, { hour: number; orders: number; revenue: number }> = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { hour: i, orders: 0, revenue: 0 };
    }

    orders.forEach(order => {
      const hour = getHour(order._creationTime);
      hourlyStats[hour].orders += 1;
      hourlyStats[hour].revenue += order.total;
    });

    return Object.values(hourlyStats);
  },
});

// Day of Week Analysis
export const dayOfWeekAnalysis = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats: Record<string, { day: string; orders: number; revenue: number }> = {};
    
    days.forEach(day => {
      dayStats[day] = { day, orders: 0, revenue: 0 };
    });

    orders.forEach(order => {
      const day = getDayOfWeek(order._creationTime);
      dayStats[day].orders += 1;
      dayStats[day].revenue += order.total;
    });

    return days.map(day => dayStats[day]);
  },
});

// Table Performance
export const tablePerformance = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const tables = await ctx.db.query("tables").collect();
    
    const tableMap = new Map(tables.map(t => [t.number.toString(), t.name]));
    const tableStats: Record<string, { tableId: string; tableName: string; orders: number; revenue: number }> = {};

    orders.forEach(order => {
      const tableId = order.tableId;
      if (!tableStats[tableId]) {
        tableStats[tableId] = { 
          tableId, 
          tableName: tableMap.get(tableId) || `Table ${tableId}`,
          orders: 0, 
          revenue: 0 
        };
      }
      tableStats[tableId].orders += 1;
      tableStats[tableId].revenue += order.total;
    });

    return Object.values(tableStats).sort((a, b) => b.revenue - a.revenue);
  },
});

// Payment Method Stats
export const paymentMethodStats = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    const stats: Record<string, { method: string; count: number; revenue: number }> = {};

    orders.forEach(order => {
      const method = order.paymentMethod || "unknown";
      if (!stats[method]) {
        stats[method] = { method, count: 0, revenue: 0 };
      }
      stats[method].count += 1;
      stats[method].revenue += order.total;
    });

    return Object.values(stats);
  },
});

// Order Status Distribution
export const orderStatusDistribution = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    const stats: Record<string, number> = {};

    orders.forEach(order => {
      const status = order.status || "unknown";
      stats[status] = (stats[status] || 0) + 1;
    });

    return Object.entries(stats).map(([status, count]) => ({ status, count }));
  },
});

// Inventory Report
export const inventoryReport = query({
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);
    const outOfStock = inventory.filter(item => item.quantity === 0);
    
    const byCategory: Record<string, { category: string; items: number; value: number }> = {};
    inventory.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { category: item.category, items: 0, value: 0 };
      }
      byCategory[item.category].items += 1;
      byCategory[item.category].value += item.quantity * item.costPerUnit;
    });

    return {
      totalItems: inventory.length,
      totalValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStock.length,
      lowStockItems,
      byCategory: Object.values(byCategory),
    };
  },
});

// Wastage Report
export const wastageReport = query({
  args: { 
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let wastage = await ctx.db.query("wastage").collect();
    
    if (args.startDate) {
      wastage = wastage.filter(w => w.date >= args.startDate!);
    }
    if (args.endDate) {
      wastage = wastage.filter(w => w.date <= args.endDate!);
    }

    const totalLoss = wastage.reduce((sum, w) => sum + w.costLoss, 0);
    
    // By reason
    const byReason: Record<string, { reason: string; count: number; loss: number }> = {};
    wastage.forEach(w => {
      if (!byReason[w.reason]) {
        byReason[w.reason] = { reason: w.reason, count: 0, loss: 0 };
      }
      byReason[w.reason].count += 1;
      byReason[w.reason].loss += w.costLoss;
    });

    // By item
    const byItem: Record<string, { item: string; count: number; loss: number }> = {};
    wastage.forEach(w => {
      if (!byItem[w.itemName]) {
        byItem[w.itemName] = { item: w.itemName, count: 0, loss: 0 };
      }
      byItem[w.itemName].count += 1;
      byItem[w.itemName].loss += w.costLoss;
    });

    // Daily trend
    const dailyTrend: Record<string, { date: string; loss: number }> = {};
    wastage.forEach(w => {
      if (!dailyTrend[w.date]) {
        dailyTrend[w.date] = { date: w.date, loss: 0 };
      }
      dailyTrend[w.date].loss += w.costLoss;
    });

    return {
      totalEntries: wastage.length,
      totalLoss,
      byReason: Object.values(byReason).sort((a, b) => b.loss - a.loss),
      byItem: Object.values(byItem).sort((a, b) => b.loss - a.loss),
      dailyTrend: Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
});

// Staff Performance (based on staff calls)
export const staffCallsReport = query({
  handler: async (ctx) => {
    const calls = await ctx.db.query("staffCalls").collect();
    
    const total = calls.length;
    const pending = calls.filter(c => c.status === "pending").length;
    const resolved = calls.filter(c => c.status === "resolved").length;
    
    // By reason
    const byReason: Record<string, number> = {};
    calls.forEach(c => {
      const reason = c.reason || "General";
      byReason[reason] = (byReason[reason] || 0) + 1;
    });

    // By table
    const byTable: Record<string, number> = {};
    calls.forEach(c => {
      const table = `Table ${c.tableNumber}`;
      byTable[table] = (byTable[table] || 0) + 1;
    });

    return {
      total,
      pending,
      resolved,
      acknowledged: calls.filter(c => c.status === "acknowledged").length,
      byReason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })),
      byTable: Object.entries(byTable).map(([table, count]) => ({ table, count })).sort((a, b) => b.count - a.count),
    };
  },
});

// Comprehensive Dashboard Stats
export const dashboardStats = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const inventory = await ctx.db.query("inventory").collect();
    const wastage = await ctx.db.query("wastage").collect();
    const staffCalls = await ctx.db.query("staffCalls").collect();

    const today = getDateString(Date.now());
    const todayOrders = orders.filter(o => getDateString(o._creationTime) === today);
    const todayWastage = wastage.filter(w => w.date === today);

    return {
      sales: {
        todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
        todayOrders: todayOrders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        totalOrders: orders.length,
      },
      inventory: {
        totalItems: inventory.length,
        totalValue: inventory.reduce((sum, i) => sum + (i.quantity * i.costPerUnit), 0),
        lowStock: inventory.filter(i => i.quantity <= i.minStock).length,
        outOfStock: inventory.filter(i => i.quantity === 0).length,
      },
      wastage: {
        todayLoss: todayWastage.reduce((sum, w) => sum + w.costLoss, 0),
        totalLoss: wastage.reduce((sum, w) => sum + w.costLoss, 0),
        todayEntries: todayWastage.length,
      },
      staffCalls: {
        pending: staffCalls.filter(c => c.status === "pending").length,
        total: staffCalls.length,
      },
      pendingOrders: orders.filter(o => o.status === "pending").length,
      preparingOrders: orders.filter(o => o.status === "preparing").length,
    };
  },
});
