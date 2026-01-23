import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all reservations (optionally filter by date)
export const list = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let reservations;
    if (args.date) {
      reservations = await ctx.db
        .query("reservations")
        .withIndex("by_date", (q) => q.eq("date", args.date))
        .collect();
    } else {
      reservations = await ctx.db.query("reservations").collect();
    }
    
    // Get table info for each reservation
    const withTables = await Promise.all(
      reservations.map(async (res) => {
        const table = await ctx.db.get(res.tableId);
        return { ...res, table };
      })
    );
    
    return withTables.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get reservations for a specific table
export const getByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.gte(q.field("date"), today))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    return reservations.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get current/upcoming reservation for a table number (for customer view)
export const getCurrentForTable = query({
  args: { tableNumber: v.number() },
  handler: async (ctx, args) => {
    // Find the table by number
    const tables = await ctx.db.query("tables").collect();
    const table = tables.find(t => t.number === args.tableNumber);
    if (!table) {
      console.log('DEBUG: Table not found for number:', args.tableNumber);
      return null;
    }

    // Get today's date - use simple local date calculation
    // The booking page uses: new Date().toISOString().split('T')[0] which is UTC
    // So we should match that format
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Also check IST date in case booking was made with IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayIST = istNow.toISOString().split('T')[0];
    
    // Current time in HH:MM format (IST for comparison)
    const currentTime = istNow.toISOString().split('T')[1].substring(0, 5);
    
    console.log('DEBUG: Looking for reservations - UTC date:', today, 'IST date:', todayIST, 'Current time:', currentTime, 'Table ID:', table._id);

    // Get today's confirmed reservations for this table (check both UTC and IST dates)
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_table", (q) => q.eq("tableId", table._id))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();
    
    console.log('DEBUG: All confirmed reservations for table:', reservations.map(r => ({ date: r.date, start: r.startTime, end: r.endTime, name: r.customerName })));
    
    // Filter for today's reservations (either UTC or IST date)
    const todayReservations = reservations.filter(r => 
      r.date === today || r.date === todayIST
    );
    
    console.log('DEBUG: Today reservations:', todayReservations.length);

    if (todayReservations.length === 0) return null;

    // Sort by start time
    todayReservations.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Find current or upcoming reservation
    for (const res of todayReservations) {
      // If current time is within reservation window
      if (currentTime >= res.startTime && currentTime <= res.endTime) {
        return { ...res, isCurrent: true };
      }
      // If reservation is upcoming today
      if (currentTime < res.startTime) {
        return { ...res, isCurrent: false };
      }
    }
    
    return null;
  },
});

// Create a reservation
export const create = mutation({
  args: {
    tableId: v.id("tables"),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    partySize: v.number(),
    depositAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    // Check for conflicts
    const existing = await ctx.db
      .query("reservations")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    for (const res of existing) {
      // Check time overlap
      if (
        (args.startTime >= res.startTime && args.startTime < res.endTime) ||
        (args.endTime > res.startTime && args.endTime <= res.endTime) ||
        (args.startTime <= res.startTime && args.endTime >= res.endTime)
      ) {
        throw new Error(`Table already reserved from ${res.startTime} to ${res.endTime}`);
      }
    }

    // Auto-create customer account if phone provided
    let customerId = undefined;
    if (args.customerPhone) {
      // Check if customer exists
      const existingCustomer = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", args.customerPhone))
        .first();

      if (existingCustomer) {
        customerId = existingCustomer._id;
        // Update name if different
        if (existingCustomer.name !== args.customerName) {
          await ctx.db.patch(existingCustomer._id, { name: args.customerName });
        }
        // Add deposit to balance
        if (args.depositAmount) {
          await ctx.db.patch(existingCustomer._id, {
            depositBalance: existingCustomer.depositBalance + args.depositAmount,
          });
        }
      } else {
        // Create new customer
        customerId = await ctx.db.insert("customers", {
          name: args.customerName,
          phone: args.customerPhone,
          totalVisits: 0,
          totalSpent: 0,
          depositBalance: args.depositAmount || 0,
          createdAt: Date.now(),
        });
      }
    }

    return await ctx.db.insert("reservations", {
      tableId: args.tableId,
      tableNumber: table.number,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerId: customerId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      partySize: args.partySize,
      depositAmount: args.depositAmount,
      status: "confirmed",
      notes: args.notes,
    });
  },
});

// Update reservation status
export const updateStatus = mutation({
  args: {
    id: v.id("reservations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// Cancel reservation
export const cancel = mutation({
  args: { id: v.id("reservations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "cancelled" });
  },
});

// Get today's reservations count
export const getTodayStats = query({
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_date", (q) => q.eq("date", today))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();
    
    return {
      total: reservations.length,
      upcoming: reservations.filter(r => {
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return r.startTime > now;
      }).length,
    };
  },
});


// Mark reservation as arrived (customer verified)
export const markArrived = mutation({
  args: { id: v.id("reservations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { arrived: true });
  },
});
