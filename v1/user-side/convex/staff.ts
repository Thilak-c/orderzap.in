import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { restaurantId: v.optional(v.union(v.id("restaurants"), v.string())) },
  handler: async (ctx, args) => {
    let rid = args.restaurantId as any;
    if (rid && typeof rid === 'string' && !rid.match(/^[0-9a-fA-F]{24}$/)) {
      const rest = await ctx.db
        .query("restaurants")
        .withIndex("by_shortid", (q) => q.eq("id", rid))
        .first();
      if (rest) rid = rest._id;
    }
    if (rid) {
      return await ctx.db
        .query("staff")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", rid))
        .collect();
    }
    return await ctx.db.query("staff").collect();
  },
});

export const listActive = query({
  args: { restaurantId: v.optional(v.union(v.id("restaurants"), v.string())) },
  handler: async (ctx, args) => {
    let rid = args.restaurantId as any;
    if (rid && typeof rid === 'string' && !rid.match(/^[0-9a-fA-F]{24}$/)) {
      const rest = await ctx.db
        .query("restaurants")
        .withIndex("by_shortid", (q) => q.eq("id", rid))
        .first();
      if (rest) rid = rest._id;
    }
    let staff;
    if (rid) {
      staff = await ctx.db
        .query("staff")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", rid))
        .collect();
    } else {
      staff = await ctx.db.query("staff").collect();
    }
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
    restaurantId: v.optional(v.union(v.id("restaurants"), v.string())),
    name: v.string(),
    role: v.string(),
    phone: v.optional(v.string()),
    assignedTables: v.array(v.number()),
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
    return await ctx.db.insert("staff", {
      ...args,
      restaurantId: rid,
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
