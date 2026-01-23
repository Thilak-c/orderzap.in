import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("menuItems").collect();
  },
});

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("menuItems").collect();
    return items.filter((item) => item.available);
  },
});

// Get menu items with zone availability info
export const listForZone = query({
  args: { zoneId: v.optional(v.id("zones")) },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("menuItems").collect();
    const availableItems = items.filter((item) => item.available);
    
    // Get all zones to map IDs to names
    const zones = await ctx.db.query("zones").collect();
    const zoneMap = new Map(zones.map(z => [z._id, z.name]));

    return availableItems.map((item) => {
      let isAvailableInZone = true;
      let restrictionMessage = "";
      let allowedZoneNames: string[] = [];

      // If item has specific zones set (not empty), get their names
      if (item.allowedZones && item.allowedZones.length > 0) {
        allowedZoneNames = item.allowedZones
          .map(zoneId => zoneMap.get(zoneId))
          .filter((name): name is string => !!name);
      }

      // If table has a zone assigned, check if item is allowed in that zone
      if (args.zoneId) {
        // If item has specific zones set (not empty), check if current zone is in the list
        if (item.allowedZones && item.allowedZones.length > 0) {
          if (!item.allowedZones.includes(args.zoneId)) {
            isAvailableInZone = false;
            restrictionMessage = "Not available in this zone";
          }
        }
        // If allowedZones is empty or undefined = "All Zones" = available everywhere
      }

      return {
        ...item,
        isAvailableInZone,
        restrictionMessage,
        allowedZoneNames,
      };
    });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    category: v.string(),
    image: v.string(),
    description: v.string(),
    allowedZones: v.optional(v.array(v.id("zones"))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("menuItems", {
      ...args,
      available: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.string(),
    price: v.number(),
    category: v.string(),
    image: v.string(),
    description: v.string(),
    available: v.boolean(),
    allowedZones: v.optional(v.array(v.id("zones"))),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Seed initial menu items with zone restrictions
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("menuItems").first();
    if (existing) return "Already seeded";

    const zones = await ctx.db.query("zones").collect();
    const smokingZone = zones.find((z) => z.name === "Smoking Zone");

    // All-zone items (empty allowedZones = available everywhere)
    const allZoneItems = [
      { name: "Classic Burger", price: 12.99, category: "Mains", image: "🍔", description: "Juicy beef patty with fresh veggies" },
      { name: "Margherita Pizza", price: 14.99, category: "Mains", image: "🍕", description: "Fresh tomato, mozzarella, basil" },
      { name: "Caesar Salad", price: 9.99, category: "Starters", image: "🥗", description: "Crisp romaine, parmesan, croutons" },
      { name: "French Fries", price: 4.99, category: "Sides", image: "🍟", description: "Crispy golden fries" },
      { name: "Chicken Wings", price: 11.99, category: "Starters", image: "🍗", description: "Spicy buffalo wings" },
      { name: "Coca Cola", price: 2.99, category: "Drinks", image: "🥤", description: "Ice cold refreshment" },
      { name: "Lemonade", price: 3.49, category: "Drinks", image: "🍋", description: "Fresh squeezed lemonade" },
      { name: "Chocolate Cake", price: 6.99, category: "Desserts", image: "🍰", description: "Rich chocolate layer cake" },
      { name: "Butter Naan", price: 3.99, category: "Mains", image: "🫓", description: "Fresh baked Indian bread" },
      { name: "Biryani", price: 15.99, category: "Mains", image: "🍚", description: "Aromatic rice with spices" },
    ];

    for (const item of allZoneItems) {
      await ctx.db.insert("menuItems", { ...item, available: true, allowedZones: [] });
    }

    // Smoking zone only items
    if (smokingZone) {
      const hookahItems = [
        { name: "Classic Hookah", price: 24.99, category: "Hookah", image: "💨", description: "Traditional hookah experience" },
        { name: "Fruit Hookah", price: 29.99, category: "Hookah", image: "🍇", description: "Mixed fruit flavors" },
        { name: "Premium Shisha", price: 34.99, category: "Hookah", image: "✨", description: "Premium tobacco blend" },
      ];
      for (const item of hookahItems) {
        await ctx.db.insert("menuItems", { ...item, available: true, allowedZones: [smokingZone._id] });
      }
    }

    return "Seeded!";
  },
});
