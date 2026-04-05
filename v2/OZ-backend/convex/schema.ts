import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * V2 Convex Schema - Real-Time Tables
 * ────────────────────────────────────
 * This schema contains tables classified as real-time data requiring reactive updates.
 * These tables are synchronized with PostgreSQL for persistent storage.
 * 
 * Real-time tables: orders, staffCalls, zoneRequests, notifications, staffNotifications, attendance
 * 
 * Sync Fields:
 * - postgresId: Maps to PostgreSQL UUID (source of truth)
 * - lastSyncedAt: Timestamp of last successful sync
 * - syncPending: Flag indicating sync failure requiring retry
 */

export default defineSchema({
  // ============================================================================
  // MIRROR TABLES - PostgreSQL Source-of-Truth Sync
  // ============================================================================

  restaurants: defineTable({
    pgId: v.string(), // PostgreSQL UUID
    shortId: v.string(),
    name: v.string(),
    active: v.boolean(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_short_id", ["shortId"]),

  staff: defineTable({
    pgId: v.string(),
    restaurantId: v.string(),
    name: v.string(),
    role: v.string(),
    pin: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_restaurant", ["restaurantId"]),

  menus: defineTable({
    pgId: v.string(),
    restaurantId: v.string(), // PostgreSQL short_id
    name: v.string(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_restaurant", ["restaurantId"]),

  categories: defineTable({
    pgId: v.string(),
    restaurantId: v.string(),
    menuId: v.optional(v.string()),
    name: v.string(),
    isActive: v.boolean(),
    displayOrder: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_restaurant", ["restaurantId"]),

  menu_items: defineTable({
    pgId: v.string(),
    restaurantId: v.string(),
    categoryId: v.string(),
    name: v.string(),
    price: v.number(),
    description: v.optional(v.string()),
    isAvailable: v.boolean(),
    isHidden: v.boolean(),
    shortcode: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_restaurant", ["restaurantId"]).index("by_category", ["categoryId"]),

  item_variants: defineTable({
    pgId: v.string(),
    menuItemId: v.string(),
    name: v.string(),
    extraPrice: v.number(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_menu_item", ["menuItemId"]),

  add_ons: defineTable({
    pgId: v.string(),
    menuItemId: v.string(),
    name: v.string(),
    price: v.number(),
    isAvailable: v.boolean(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_menu_item", ["menuItemId"]),

  zones: defineTable({
    pgId: v.string(),
    restaurantId: v.string(),
    name: v.string(),
    shortcode: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_restaurant", ["restaurantId"]),

  shortcodes: defineTable({
    pgId: v.string(),
    restaurantId: v.string(),
    code: v.string(),
    type: v.string(), // 'table' | 'zone' | 'item'
    referenceId: v.string(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_pg_id", ["pgId"]).index("by_restaurant", ["restaurantId"]).index("by_code", ["code"]),

  // ============================================================================
  // ORDERS - Real-time order tracking with waiter assignment
  // Syncs with PostgreSQL orders table for historical data
  // ============================================================================
  orders: defineTable({
    restaurantId: v.optional(v.union(v.id("restaurants"), v.string())),
    tableId: v.optional(v.string()),
    orderNumber: v.string(),
    items: v.optional(v.array(
      v.object({
        menuItemId: v.union(v.id("menu_items"), v.string()),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        image: v.optional(v.string()),
      })
    )),
    total: v.optional(v.number()),
    totalAmount: v.optional(v.number()),
    status: v.string(), // 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
    paymentMethod: v.string(),
    paymentStatus: v.string(),
    notes: v.optional(v.string()),
    customerSessionId: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()),
    depositUsed: v.optional(v.number()),
    // Waiter assignment
    assignedWaiterId: v.optional(v.id("staff")),
    assignedAt: v.optional(v.number()),
    assignmentStatus: v.optional(v.string()), // 'pending' | 'accepted' | 'rejected' | 'timeout'
    assignmentAcceptedAt: v.optional(v.number()),
    assignmentTimeoutAt: v.optional(v.number()),
    // Backend sync fields
    subtotal: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    tipAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    // PostgreSQL sync fields
    postgresId: v.optional(v.string()), // PostgreSQL UUID
    lastSyncedAt: v.optional(v.number()), // Last successful sync timestamp
    syncPending: v.optional(v.boolean()), // True if sync failed and needs retry
    syncError: v.optional(v.string()),
    lastSyncAttempt: v.optional(v.number()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"])
    .index("by_customerSession", ["customerSessionId"])
    .index("by_table", ["tableId"])
    .index("by_phone", ["customerPhone"])
    .index("by_postgres_id", ["postgresId"])
    .index("by_sync_pending", ["syncPending"])
    .index("by_assigned_waiter", ["assignedWaiterId"]),

  // ============================================================================
  // STAFF CALLS - Real-time staff call requests from tables
  // Pure Convex table (no PostgreSQL sync needed)
  // ============================================================================
  staffCalls: defineTable({
    restaurantId: v.optional(v.id("restaurants")),
    tableId: v.string(),
    tableNumber: v.number(),
    zoneName: v.optional(v.string()),
    reason: v.optional(v.string()),
    status: v.string(), // 'pending' | 'acknowledged' | 'resolved'
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    originalStaffId: v.optional(v.id("staff")),
    reassignedTo: v.optional(v.id("staff")),
    reassignReason: v.optional(v.string()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"]),

  // ============================================================================
  // ZONE REQUESTS - Real-time zone change requests
  // Pure Convex table (no PostgreSQL sync needed)
  // ============================================================================
  zoneRequests: defineTable({
    restaurantId: v.optional(v.id("restaurants")),
    tableId: v.string(),
    tableNumber: v.number(),
    currentZone: v.optional(v.string()),
    requestedZone: v.string(),
    status: v.string(), // 'pending' | 'approved' | 'denied'
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"]),

  // ============================================================================
  // NOTIFICATIONS - Multi-channel notifications for restaurants
  // Real-time notification delivery with reactive status updates
  // ============================================================================
  notifications: defineTable({
    restaurantId: v.union(v.id("restaurants"), v.string()),
    type: v.string(), // 'trial_expiring' | 'trial_expired' | 'payment_due' | etc.
    title: v.string(),
    message: v.string(),
    status: v.string(), // 'pending' | 'sent' | 'failed'
    read: v.boolean(),
    channels: v.array(v.string()), // ['in_app', 'email', 'sms', 'whatsapp']
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"])
    .index("by_read", ["read"]),

  // ============================================================================
  // STAFF NOTIFICATIONS - Notifications for managers about staff events
  // Real-time notifications requiring immediate delivery
  // ============================================================================
  staffNotifications: defineTable({
    type: v.string(), // 'offline_redirect', 'staff_offline', etc.
    message: v.string(),
    staffId: v.optional(v.id("staff")),
    relatedCallId: v.optional(v.id("staffCalls")),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_read", ["read"]),

  // ============================================================================
  // ATTENDANCE - Staff attendance tracking with live check-in/check-out
  // Syncs with PostgreSQL attendance table for payroll calculations
  // ============================================================================
  attendance: defineTable({
    restaurantId: v.id("restaurants"),
    staffId: v.id("staff"),
    date: v.string(), // YYYY-MM-DD
    checkIn: v.optional(v.number()),
    checkOut: v.optional(v.number()),
    checkInLocation: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      accuracy: v.optional(v.number()),
    })),
    checkOutLocation: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      accuracy: v.optional(v.number()),
    })),
    status: v.string(), // 'present' | 'absent' | 'half-day' | 'leave'
    workHours: v.optional(v.number()),
    notes: v.optional(v.string()),
    // PostgreSQL sync fields
    postgresId: v.optional(v.string()), // PostgreSQL UUID
    lastSyncedAt: v.optional(v.number()), // Last successful sync timestamp
    syncPending: v.optional(v.boolean()), // True if sync failed and needs retry
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_staff", ["staffId"])
    .index("by_date", ["date"])
    .index("by_staff_date", ["staffId", "date"])
    .index("by_postgres_id", ["postgresId"])
    .index("by_sync_pending", ["syncPending"]),

});
