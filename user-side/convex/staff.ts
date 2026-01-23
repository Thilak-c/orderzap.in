import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("staff").collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const staff = await ctx.db.query("staff").collect();
    return staff.filter(s => s.active);
  },
});

export const listOnline = query({
  args: {},
  handler: async (ctx) => {
    const staff = await ctx.db.query("staff").collect();
    return staff.filter(s => s.active && s.isOnline === true);
  },
});

export const getByTable = query({
  args: { tableNumber: v.number() },
  handler: async (ctx, args) => {
    const staff = await ctx.db.query("staff").collect();
    return staff.find(s => s.active && s.assignedTables.includes(args.tableNumber)) || null;
  },
});

export const getOnlineByTable = query({
  args: { tableNumber: v.number() },
  handler: async (ctx, args) => {
    const staff = await ctx.db.query("staff").collect();
    // First try to find online staff for this table
    const onlineStaff = staff.find(s => s.active && s.isOnline === true && s.assignedTables.includes(args.tableNumber));
    if (onlineStaff) return { staff: onlineStaff, isOnline: true };
    
    // If not online, return the assigned staff anyway
    const assignedStaff = staff.find(s => s.active && s.assignedTables.includes(args.tableNumber));
    return assignedStaff ? { staff: assignedStaff, isOnline: false } : null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    phone: v.optional(v.string()),
    assignedTables: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staff", {
      ...args,
      active: true,
      isOnline: false,
      lastSeen: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("staff"),
    name: v.string(),
    role: v.string(),
    phone: v.optional(v.string()),
    assignedTables: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.id);
    if (staff) {
      await ctx.db.patch(args.id, { active: !staff.active });
    }
  },
});

export const setOnline = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { 
      isOnline: true, 
      lastSeen: Date.now() 
    });
  },
});

export const setOffline = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.id);
    if (staff) {
      await ctx.db.patch(args.id, { 
        isOnline: false, 
        lastSeen: Date.now() 
      });
      
      // Notify managers that staff went offline
      await ctx.db.insert("staffNotifications", {
        type: "staff_offline",
        message: `${staff.name} has gone offline`,
        staffId: args.id,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const updateLastSeen = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastSeen: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
