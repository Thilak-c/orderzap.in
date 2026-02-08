import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get restaurant by short ID
export const getByShortId = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_short_id", (q) => q.eq("id", args.id))
      .first();
    return restaurant;
  },
});

// Get all restaurants
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("restaurants").collect();
  },
});

// Get active restaurants
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("restaurants")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

// Create restaurant
export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    logo: v.optional(v.string()),
    logo_url: v.optional(v.string()),
    brandName: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    themeColors: v.optional(v.union(
      v.object({
        dominant: v.string(),
        muted: v.string(),
        darkVibrant: v.string(),
        lightVibrant: v.string(),
      }),
      v.null()
    )),
  },
  handler: async (ctx, args) => {
    // Check if ID already exists
    const existing = await ctx.db
      .query("restaurants")
      .withIndex("by_short_id", (q) => q.eq("id", args.id))
      .first();
    
    if (existing) {
      throw new Error("Restaurant ID already exists");
    }

    const { themeColors, ...restArgs } = args;
    
    // Set up 7-day trial period
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const trialEndDate = now + sevenDaysInMs;
    
    return await ctx.db.insert("restaurants", {
      ...restArgs,
      active: true,
      isOpen: true, // Default to open when created
      createdAt: now,
      themeColors: themeColors === null ? undefined : themeColors,
      // Trial period setup
      status: 'trial',
      trialStartDate: now,
      trialEndDate: trialEndDate,
      // Onboarding starts at 0%
      onboardingStatus: 0,
    });
  },
});

// Update restaurant
export const update = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.optional(v.string()),
    logo: v.optional(v.string()),
    logo_url: v.optional(v.string()),
    brandName: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    active: v.optional(v.boolean()),
    isOpen: v.optional(v.boolean()),
    businessHours: v.optional(v.object({
      monday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      tuesday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      wednesday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      thursday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      friday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      saturday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      sunday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
    })),
    ownerName: v.optional(v.string()),
    ownerPhone: v.optional(v.string()),
    managerName: v.optional(v.string()),
    managerPhone: v.optional(v.string()),
    instagramLink: v.optional(v.string()),
    youtubeLink: v.optional(v.string()),
    googleMapsLink: v.optional(v.string()),
    onboardingFilledBy: v.optional(v.string()),
    onboardingFilledByName: v.optional(v.string()),
    mapLink: v.optional(v.string()),
    onboardingStatus: v.optional(v.number()),
    themeColors: v.optional(v.object({
      dominant: v.string(),
      muted: v.string(),
      darkVibrant: v.string(),
      lightVibrant: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { restaurantId, ...updates } = args;
    await ctx.db.patch(restaurantId, updates);
  },
});

// Save theme colors for a restaurant
export const saveTheme = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    themeColors: v.object({
      dominant: v.string(),
      muted: v.string(),
      darkVibrant: v.string(),
      lightVibrant: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restaurantId, {
      themeColors: args.themeColors,
    });
  },
});

// Get theme colors for a restaurant
export const getTheme = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    return restaurant?.themeColors || null;
  },
});

// Expire trial - called when 7-day trial ends
export const expireTrial = mutation({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restaurantId, {
      status: 'expired',
      active: false, // Deactivate restaurant
    });
  },
});

// Activate restaurant after payment
export const activateAfterPayment = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    subscriptionEndDate: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.restaurantId, {
      status: 'active',
      active: true, // Reactivate restaurant
      subscriptionEndDate: args.subscriptionEndDate,
    });
  },
});

// Check and expire trials (to be called by cron job)
export const checkExpiredTrials = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all restaurants in trial status
    const trialRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_status", (q) => q.eq("status", "trial"))
      .collect();
    
    let expiredCount = 0;
    
    for (const restaurant of trialRestaurants) {
      // Check if trial has ended
      if (restaurant.trialEndDate && restaurant.trialEndDate <= now) {
        await ctx.db.patch(restaurant._id, {
          status: 'expired',
          active: false, // Deactivate
        });
        expiredCount++;
      }
    }
    
    return { expiredCount, message: `Expired ${expiredCount} trial(s)` };
  },
});

// Auto update isOpen status based on business hours (to be called by cron job)
export const autoUpdateOpenStatus = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all active restaurants with business hours configured
    const restaurants = await ctx.db
      .query("restaurants")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
    
    let updatedCount = 0;
    const now = new Date();
    
    // Get current day and time in IST (Indian Standard Time)
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[istTime.getUTCDay()];
    const currentTime = `${String(istTime.getUTCHours()).padStart(2, '0')}:${String(istTime.getUTCMinutes()).padStart(2, '0')}`;
    
    for (const restaurant of restaurants) {
      // Skip if no business hours configured
      if (!restaurant.businessHours) continue;
      
      const daySchedule = restaurant.businessHours[currentDay as keyof typeof restaurant.businessHours];
      
      // Skip if day schedule doesn't exist
      if (!daySchedule) continue;
      
      let shouldBeOpen = false;
      
      // Check if restaurant should be open today
      if (daySchedule.isOpen) {
        const openTime = daySchedule.openTime;
        const closeTime = daySchedule.closeTime;
        
        // Compare times (HH:MM format)
        if (currentTime >= openTime && currentTime < closeTime) {
          shouldBeOpen = true;
        }
      }
      
      // Update only if status needs to change
      if (restaurant.isOpen !== shouldBeOpen) {
        await ctx.db.patch(restaurant._id, {
          isOpen: shouldBeOpen,
        });
        updatedCount++;
      }
    }
    
    return { 
      updatedCount, 
      currentDay,
      currentTime,
      message: `Updated ${updatedCount} restaurant(s) open status` 
    };
  },
});
