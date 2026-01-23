import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create customer by phone number
export const getOrCreate = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if customer exists
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) {
      // Update name if different and return existing customer
      if (existing.name !== args.name) {
        await ctx.db.patch(existing._id, { name: args.name });
      }
      return existing._id;
    }

    // Create new customer
    const customerId = await ctx.db.insert("customers", {
      name: args.name,
      phone: args.phone,
      totalVisits: 0,
      totalSpent: 0,
      depositBalance: 0,
      createdAt: Date.now(),
    });

    return customerId;
  },
});

// Add deposit to customer balance
export const addDeposit = mutation({
  args: {
    phone: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!customer) {
      throw new Error("Customer not found");
    }

    await ctx.db.patch(customer._id, {
      depositBalance: customer.depositBalance + args.amount,
    });

    return customer._id;
  },
});

// Get customer by phone
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

// Use deposit (deduct from balance)
export const useDeposit = mutation({
  args: {
    phone: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!customer) {
      throw new Error("Customer not found");
    }

    const amountToUse = Math.min(args.amount, customer.depositBalance);
    
    await ctx.db.patch(customer._id, {
      depositBalance: customer.depositBalance - amountToUse,
      totalSpent: customer.totalSpent + args.amount,
      totalVisits: customer.totalVisits + 1,
      lastVisit: Date.now(),
    });

    return amountToUse;
  },
});

// List all customers (for admin)
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("customers").order("desc").collect();
  },
});
