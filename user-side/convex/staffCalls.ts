import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("staffCalls")
      .order("desc")
      .collect();
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("staffCalls")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    tableId: v.string(),
    tableNumber: v.number(),
    zoneName: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the staff assigned to this table
    const allStaff = await ctx.db.query("staff").collect();
    const assignedStaff = allStaff.find(s => s.active && s.assignedTables.includes(args.tableNumber));
    
    let reassignedTo = null;
    let reassignReason = null;
    
    // Check if assigned staff is offline (isOnline is false or undefined)
    if (assignedStaff && assignedStaff.isOnline !== true) {
      // Find an online staff member to reassign to
      const onlineStaff = allStaff.filter(s => s.active && s.isOnline === true && s._id !== assignedStaff._id);
      
      if (onlineStaff.length > 0) {
        // Pick the one with least tables or random
        const selectedStaff = onlineStaff.sort((a, b) => a.assignedTables.length - b.assignedTables.length)[0];
        reassignedTo = selectedStaff._id;
        reassignReason = `${assignedStaff.name} is offline, reassigned to ${selectedStaff.name}`;
        
        // Create notification for the reassigned staff
        await ctx.db.insert("staffNotifications", {
          type: "offline_redirect",
          message: `${assignedStaff.name} is offline. You're in charge of Table ${args.tableNumber} call: "${args.reason || 'Assistance needed'}"`,
          staffId: selectedStaff._id,
          read: false,
          createdAt: Date.now(),
        });
        
        // Notify managers
        await ctx.db.insert("staffNotifications", {
          type: "staff_offline_redirect",
          message: `Table ${args.tableNumber} call redirected from ${assignedStaff.name} (offline) to ${selectedStaff.name}`,
          staffId: assignedStaff._id,
          read: false,
          createdAt: Date.now(),
        });
      }
    }
    
    // Build the insert object, only including reassign fields if they have values
    const insertData: any = {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    };
    
    if (assignedStaff?._id) {
      insertData.originalStaffId = assignedStaff._id;
    }
    if (reassignedTo) {
      insertData.reassignedTo = reassignedTo;
    }
    if (reassignReason) {
      insertData.reassignReason = reassignReason;
    }
    
    return await ctx.db.insert("staffCalls", insertData);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("staffCalls"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.id);
    if (!call) return;
    
    // If resolving a water request that wasn't acknowledged yet, acknowledge it first
    if (args.status === 'resolved' && call.reason === 'Asking for water' && !call.acknowledgedAt) {
      await ctx.db.patch(args.id, { 
        status: args.status,
        acknowledgedAt: Date.now(),
      });
    }
    // If acknowledging a water request, store the timestamp
    else if (args.status === 'acknowledged' && call.reason === 'Asking for water') {
      await ctx.db.patch(args.id, { 
        status: args.status,
        acknowledgedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.id, { status: args.status });
    }
  },
});


// Get recent acknowledged water request for a table (for customer notification)
export const getWaterAcknowledged = query({
  args: { tableNumber: v.number() },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("staffCalls")
      .collect();
    
    // Find water request for this table with acknowledgedAt in last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const waterCall = calls.find(c => 
      c.tableNumber === args.tableNumber && 
      c.reason === 'Asking for water' &&
      c.acknowledgedAt &&
      c.acknowledgedAt > fiveMinutesAgo &&
      (c.status === 'acknowledged' || c.status === 'resolved')
    );
    
    return waterCall || null;
  },
});
