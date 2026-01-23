import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("staffNotifications")
      .order("desc")
      .collect();
  },
});

export const listUnread = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("staffNotifications")
      .withIndex("by_read", (q) => q.eq("read", false))
      .order("desc")
      .collect();
  },
});

export const listForStaff = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("staffNotifications").order("desc").collect();
    return all.filter(n => n.staffId === args.staffId);
  },
});

export const listUnreadForStaff = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("staffNotifications")
      .withIndex("by_read", (q) => q.eq("read", false))
      .order("desc")
      .collect();
    return all.filter(n => n.staffId === args.staffId);
  },
});

export const markRead = mutation({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const unread = await ctx.db
      .query("staffNotifications")
      .withIndex("by_read", (q) => q.eq("read", false))
      .collect();
    
    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const markAllReadForStaff = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("staffNotifications")
      .withIndex("by_read", (q) => q.eq("read", false))
      .collect();
    
    for (const n of all.filter(n => n.staffId === args.staffId)) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});


// Create a notification (for customer arrival, etc.)
export const create = mutation({
  args: {
    type: v.string(),
    message: v.string(),
    staffId: v.optional(v.id("staff")),
    relatedCallId: v.optional(v.id("staffCalls")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staffNotifications", {
      type: args.type,
      message: args.message,
      staffId: args.staffId,
      relatedCallId: args.relatedCallId,
      read: false,
      createdAt: Date.now(),
    });
  },
});
