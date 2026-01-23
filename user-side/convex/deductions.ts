import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const deductions = await ctx.db.query("deductions").collect();
    const inventory = await ctx.db.query("inventory").collect();
    
    const inventoryMap = new Map(inventory.map(i => [i._id, i]));
    
    return deductions.map(d => {
      const item = inventoryMap.get(d.itemId);
      return {
        ...d,
        costPerUnit: item?.costPerUnit || 0,
        totalCost: (item?.costPerUnit || 0) * d.quantity,
        unit: item?.unit || '',
        category: item?.category || '',
      };
    });
  },
});

export const listByDate = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const deductions = await ctx.db.query("deductions").collect();
    const inventory = await ctx.db.query("inventory").collect();
    
    const inventoryMap = new Map(inventory.map(i => [i._id, i]));
    
    const enriched = deductions.map(d => {
      const item = inventoryMap.get(d.itemId);
      const date = new Date(d._creationTime).toISOString().split('T')[0];
      return {
        ...d,
        date,
        time: new Date(d._creationTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        costPerUnit: item?.costPerUnit || 0,
        totalCost: (item?.costPerUnit || 0) * d.quantity,
        unit: item?.unit || '',
        category: item?.category || '',
      };
    });
    
    if (args.date) {
      return enriched.filter(d => d.date === args.date);
    }
    return enriched;
  },
});

export const getDailyUsageSummary = query({
  handler: async (ctx) => {
    const deductions = await ctx.db.query("deductions").collect();
    const inventory = await ctx.db.query("inventory").collect();
    
    const inventoryMap = new Map(inventory.map(i => [i._id, i]));
    
    // Group by date
    const byDate: Record<string, { date: string; items: number; totalCost: number; orders: Set<string> }> = {};
    
    deductions.forEach(d => {
      const date = new Date(d._creationTime).toISOString().split('T')[0];
      const item = inventoryMap.get(d.itemId);
      const cost = (item?.costPerUnit || 0) * d.quantity;
      
      if (!byDate[date]) {
        byDate[date] = { date, items: 0, totalCost: 0, orders: new Set() };
      }
      byDate[date].items += 1;
      byDate[date].totalCost += cost;
      byDate[date].orders.add(d.orderId);
    });
    
    return Object.values(byDate)
      .map(d => ({ ...d, orders: d.orders.size }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const getItemUsageSummary = query({
  handler: async (ctx) => {
    const deductions = await ctx.db.query("deductions").collect();
    const inventory = await ctx.db.query("inventory").collect();
    
    const inventoryMap = new Map(inventory.map(i => [i._id, i]));
    
    // Group by item
    const byItem: Record<string, { itemName: string; category: string; unit: string; totalQuantity: number; totalCost: number; usageCount: number }> = {};
    
    deductions.forEach(d => {
      const item = inventoryMap.get(d.itemId);
      const key = d.itemId;
      
      if (!byItem[key]) {
        byItem[key] = {
          itemName: d.itemName,
          category: item?.category || '',
          unit: item?.unit || '',
          totalQuantity: 0,
          totalCost: 0,
          usageCount: 0,
        };
      }
      byItem[key].totalQuantity += d.quantity;
      byItem[key].totalCost += (item?.costPerUnit || 0) * d.quantity;
      byItem[key].usageCount += 1;
    });
    
    return Object.values(byItem).sort((a, b) => b.totalCost - a.totalCost);
  },
});
