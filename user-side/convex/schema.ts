import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  zones: defineTable({
    name: v.string(), // "Smoking Zone", "Main Dining", "VIP", etc.
    description: v.string(),
  }),

  menuItems: defineTable({
    name: v.string(),
    price: v.number(),
    category: v.string(),
    image: v.string(),
    description: v.string(),
    available: v.boolean(),
    // Zones where this item is available. Empty array = "All Zones" (available everywhere)
    allowedZones: v.optional(v.array(v.id("zones"))),
  }),

  orders: defineTable({
    tableId: v.string(),
    orderNumber: v.string(),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        image: v.string(),
      })
    ),
    total: v.number(),
    status: v.string(),
    paymentMethod: v.string(),
    paymentStatus: v.string(),
    notes: v.string(),
    customerSessionId: v.string(),
    customerPhone: v.optional(v.string()),
    depositUsed: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_customerSession", ["customerSessionId"])
    .index("by_table", ["tableId"])
    .index("by_phone", ["customerPhone"]),

  tables: defineTable({
    name: v.string(),
    number: v.number(),
    capacity: v.optional(v.number()), // Max number of guests this table can seat
    zoneId: v.optional(v.id("zones")), // Which zone this table belongs to
  }).index("by_zone", ["zoneId"]),

  staff: defineTable({
    name: v.string(),
    role: v.string(), // "Waiter", "Manager", "Host", etc.
    phone: v.optional(v.string()),
    assignedTables: v.array(v.number()), // Array of table numbers [1, 2, 3, 4]
    active: v.boolean(),
    isOnline: v.optional(v.boolean()), // true when logged in, false when logged out
    lastSeen: v.optional(v.number()), // timestamp of last activity
  }),

  // Notifications for managers
  staffNotifications: defineTable({
    type: v.string(), // 'offline_redirect', 'staff_offline', etc.
    message: v.string(),
    staffId: v.optional(v.id("staff")),
    relatedCallId: v.optional(v.id("staffCalls")),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_read", ["read"]),

  reservations: defineTable({
    tableId: v.id("tables"),
    tableNumber: v.number(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    customerId: v.optional(v.id("customers")), // Link to customer account
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:MM
    endTime: v.string(), // HH:MM
    partySize: v.number(),
    depositAmount: v.optional(v.number()), // Deposit paid for this reservation
    status: v.string(), // 'confirmed' | 'cancelled' | 'completed'
    arrived: v.optional(v.boolean()), // true when customer has verified and arrived
    notes: v.optional(v.string()),
  })
    .index("by_table", ["tableId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"]),

  staffCalls: defineTable({
    tableId: v.string(),
    tableNumber: v.number(),
    zoneName: v.optional(v.string()),
    reason: v.optional(v.string()),
    status: v.string(), // 'pending' | 'acknowledged' | 'resolved'
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()), // When staff acknowledged
    originalStaffId: v.optional(v.id("staff")), // Original assigned staff
    reassignedTo: v.optional(v.id("staff")), // If redirected to another staff
    reassignReason: v.optional(v.string()), // Why it was reassigned
  }).index("by_status", ["status"]),

  zoneRequests: defineTable({
    tableId: v.string(),
    tableNumber: v.number(),
    currentZone: v.optional(v.string()),
    requestedZone: v.string(),
    status: v.string(), // 'pending' | 'approved' | 'denied'
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Inventory & Stock Control tables
  inventory: defineTable({
    name: v.string(),
    unit: v.string(),
    quantity: v.number(),
    minStock: v.number(),
    costPerUnit: v.number(),
    category: v.string(),
  }).index("by_category", ["category"]),

  wastage: defineTable({
    itemId: v.id("inventory"),
    itemName: v.string(),
    quantity: v.number(),
    reason: v.string(),
    date: v.string(),
    costLoss: v.number(),
  }).index("by_date", ["date"]),

  deductions: defineTable({
    itemId: v.id("inventory"),
    itemName: v.string(),
    quantity: v.number(),
    orderId: v.string(),
  }),

  alertSettings: defineTable({
    whatsappNumber: v.string(),
    alertsEnabled: v.boolean(),
  }),

  // Customer accounts (auto-created on booking)
  customers: defineTable({
    name: v.string(),
    phone: v.string(), // Primary identifier
    totalVisits: v.number(),
    totalSpent: v.number(),
    depositBalance: v.number(), // Redeemable deposit from reservations
    createdAt: v.number(),
    lastVisit: v.optional(v.number()),
  }).index("by_phone", ["phone"]),

  // App settings (brand name, logo, etc.)
  settings: defineTable({
    key: v.string(), // 'brandName', 'brandLogo'
    value: v.string(),
  }).index("by_key", ["key"]),
});
