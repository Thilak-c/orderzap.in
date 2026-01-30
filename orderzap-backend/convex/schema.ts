import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  orders: defineTable({
    // PostgreSQL reference
    postgresId: v.string(),
    
    // Restaurant isolation
    restaurantId: v.string(),
    
    // Order details
    tableId: v.optional(v.string()),
    orderNumber: v.string(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerSessionId: v.optional(v.string()),
    
    // Status
    status: v.string(), // received | preparing | ready | completed | cancelled
    
    // Amounts
    subtotal: v.number(),
    taxAmount: v.number(),
    tipAmount: v.number(),
    discountAmount: v.number(),
    depositUsed: v.number(),
    totalAmount: v.number(),
    
    // Payment
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.string(),
    paymentTransactionId: v.optional(v.string()),
    
    // Notes
    notes: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    
    // Timestamps
    estimatedReadyTime: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    lastSyncedAt: v.number(),
  })
    .index("by_postgres_id", ["postgresId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"])
    .index("by_table", ["tableId"]),

  orderItems: defineTable({
    // PostgreSQL reference
    postgresId: v.string(),
    
    // Restaurant isolation
    restaurantId: v.string(),
    
    // Relations
    postgresOrderId: v.string(),
    menuItemId: v.optional(v.string()),
    
    // Item details
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    subtotal: v.number(),
    specialInstructions: v.optional(v.string()),
    customizations: v.array(v.any()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    lastSyncedAt: v.number(),
  })
    .index("by_postgres_id", ["postgresId"])
    .index("by_order", ["postgresOrderId"])
    .index("by_restaurant", ["restaurantId"]),
});
