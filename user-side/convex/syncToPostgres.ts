// /**
//  * Convex → PostgreSQL Sync
//  * Syncs Convex data to PostgreSQL for analytics and backup
//  * With retry safety for production
//  */

// import { action, internalMutation } from "./_generated/server";
// import { v } from "convex/values";
// import { internal } from "./_generated/api";

// const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";

// /**
//  * Sync order to PostgreSQL
//  * Called automatically after order creation
//  */
// export const syncOrderToPostgres = action({
//   args: {
//     orderId: v.id("orders"),
//   },
//   handler: async (ctx, args) => {
//     // Get order from Convex
//     const order = await ctx.runQuery(internal.syncToPostgres.getOrderForSync, {
//       orderId: args.orderId,
//     });

//     if (!order) {
//       console.error("Order not found:", args.orderId);
//       return { success: false, error: "Order not found" };
//     }

//     // Transform to PostgreSQL format
//     const postgresOrder = {
//       convex_id: args.orderId,
//       order_number: order.orderNumber,
//       restaurant_id: order.restaurantId || null,
//       table_id: order.tableId,
//       customer_name: "Guest",
//       customer_phone: order.customerPhone || null,
//       customer_session_id: order.customerSessionId || null,
//       status: order.status,
//       payment_method: order.paymentMethod,
//       payment_status: order.paymentStatus,
//       subtotal: order.total || 0,
//       tax_amount: (order.total || 0) * 0.05, // 5% tax
//       tip_amount: 0,
//       discount_amount: 0,
//       deposit_used: order.depositUsed || 0,
//       total_amount: order.total || 0,
//       notes: order.notes || null,
//       special_instructions: order.notes || null,
//       items: order.items.map((item: any) => ({
//         menu_item_id: item.menuItemId,
//         name: item.name,
//         price: item.price,
//         quantity: item.quantity,
//         subtotal: item.price * item.quantity,
//       })),
//     };

//     try {
//       // Send to PostgreSQL backend
//       const response = await fetch(`${BACKEND_URL}/api/sync/order`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Sync-Token": process.env.SYNC_TOKEN || "dev-sync-token",
//         },
//         body: JSON.stringify(postgresOrder),
//       });

//       if (!response.ok) {
//         const error = await response.text();
//         console.error("PostgreSQL sync failed:", error);
        
//         // Mark as pending sync for retry
//         await ctx.runMutation(internal.syncToPostgres.markSyncPending, {
//           orderId: args.orderId,
//           error: error,
//         });
        
//         return { success: false, error };
//       }

//       const result = await response.json();
//       console.log("✅ Order synced to PostgreSQL:", result);

//       // Mark as synced successfully
//       await ctx.runMutation(internal.syncToPostgres.markSyncComplete, {
//         orderId: args.orderId,
//         postgresId: result.id,
//       });

//       return { success: true, postgresId: result.id };
//     } catch (error: any) {
//       console.error("❌ PostgreSQL sync error:", error);
      
//       // Mark as pending sync for retry
//       await ctx.runMutation(internal.syncToPostgres.markSyncPending, {
//         orderId: args.orderId,
//         error: error.message,
//       });
      
//       return { success: false, error: error.message };
//     }
//   },
// });

// /**
//  * Internal query to get order data for sync
//  */
// export const getOrderForSync = internalMutation({
//   args: { orderId: v.id("orders") },
//   handler: async (ctx, args) => {
//     return await ctx.db.get(args.orderId);
//   },
// });

// /**
//  * Mark order as pending sync (for retry)
//  */
// export const markSyncPending = internalMutation({
//   args: {
//     orderId: v.id("orders"),
//     error: v.string(),
//   },
//   handler: async (ctx, args) => {
//     await ctx.db.patch(args.orderId, {
//       syncPending: true,
//       syncError: args.error,
//       lastSyncAttempt: Date.now(),
//     });
//   },
// });

// /**
//  * Mark order as synced successfully
//  */
// export const markSyncComplete = internalMutation({
//   args: {
//     orderId: v.id("orders"),
//     postgresId: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     await ctx.db.patch(args.orderId, {
//       syncPending: false,
//       syncError: undefined,
//       postgresId: args.postgresId,
//       lastSyncedAt: Date.now(),
//     });
//   },
// });

// /**
//  * Retry failed syncs (called by cron)
//  */
// export const retryFailedSyncs = action({
//   handler: async (ctx) => {
//     // Get all orders with pending sync
//     const pendingOrders = await ctx.runQuery(internal.syncToPostgres.getPendingSyncs);
    
//     console.log(`🔄 Retrying ${pendingOrders.length} failed syncs...`);
    
//     let successCount = 0;
//     let failCount = 0;
    
//     for (const order of pendingOrders) {
//       try {
//         const result = await ctx.runAction(internal.syncToPostgres.syncOrderToPostgres, {
//           orderId: order._id,
//         });
        
//         if (result.success) {
//           successCount++;
//         } else {
//           failCount++;
//         }
//       } catch (error) {
//         console.error(`Failed to retry sync for order ${order._id}:`, error);
//         failCount++;
//       }
//     }
    
//     console.log(`✅ Retry complete: ${successCount} succeeded, ${failCount} failed`);
    
//     return { successCount, failCount, total: pendingOrders.length };
//   },
// });

// /**
//  * Get orders with pending sync
//  */
// export const getPendingSyncs = internalMutation({
//   handler: async (ctx) => {
//     const allOrders = await ctx.db.query("orders").collect();
//     return allOrders.filter((order: any) => order.syncPending === true);
//   },
// });

// /**
//  * Sync restaurant to PostgreSQL
//  */
// export const syncRestaurantToPostgres = action({
//   args: {
//     restaurantId: v.id("restaurants"),
//   },
//   handler: async (ctx, args) => {
//     const restaurant = await ctx.runQuery(async (ctx) => {
//       return await ctx.db.get(args.restaurantId);
//     });

//     if (!restaurant) {
//       return { success: false, error: "Restaurant not found" };
//     }

//     const postgresRestaurant = {
//       convex_id: args.restaurantId,
//       short_id: restaurant.id,
//       name: restaurant.name,
//       slug: restaurant.id,
//       email: restaurant.email || `${restaurant.id}@orderzap.in`,
//       phone: restaurant.phone || null,
//       address: restaurant.address || null,
//       logo_url: restaurant.logo || null,
//       is_active: restaurant.active,
//     };

//     try {
//       const response = await fetch(`${BACKEND_URL}/api/sync/restaurant`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Sync-Token": process.env.SYNC_TOKEN || "dev-sync-token",
//         },
//         body: JSON.stringify(postgresRestaurant),
//       });

//       if (!response.ok) {
//         const error = await response.text();
//         console.error("Restaurant sync failed:", error);
//         return { success: false, error };
//       }

//       const result = await response.json();
//       return { success: true, postgresId: result.id };
//     } catch (error: any) {
//       console.error("Restaurant sync error:", error);
//       return { success: false, error: error.message };
//     }
//   },
// });

// /**
//  * Sync menu item to PostgreSQL
//  */
// export const syncMenuItemToPostgres = action({
//   args: {
//     menuItemId: v.id("menuItems"),
//   },
//   handler: async (ctx, args) => {
//     const menuItem = await ctx.runQuery(async (ctx) => {
//       return await ctx.db.get(args.menuItemId);
//     });

//     if (!menuItem) {
//       return { success: false, error: "Menu item not found" };
//     }

//     const postgresMenuItem = {
//       convex_id: args.menuItemId,
//       restaurant_id: menuItem.restaurantId || null,
//       name: menuItem.name,
//       description: menuItem.description || null,
//       price: menuItem.price,
//       category: menuItem.category || "Uncategorized",
//       image_url: menuItem.image || null,
//       is_available: menuItem.available,
//       is_vegetarian: false, // Default, can be enhanced
//     };

//     try {
//       const response = await fetch(`${BACKEND_URL}/api/sync/menu-item`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Sync-Token": process.env.SYNC_TOKEN || "dev-sync-token",
//         },
//         body: JSON.stringify(postgresMenuItem),
//       });

//       if (!response.ok) {
//         const error = await response.text();
//         console.error("Menu item sync failed:", error);
//         return { success: false, error };
//       }

//       const result = await response.json();
//       return { success: true, postgresId: result.id };
//     } catch (error: any) {
//       console.error("Menu item sync error:", error);
//       return { success: false, error: error.message };
//     }
//   },
// });
