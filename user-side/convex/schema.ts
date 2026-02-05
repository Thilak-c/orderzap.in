import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  restaurants: defineTable({
    id: v.string(), // Short ID (under 4 chars): "bts", "mgc", etc.
    name: v.string(),
    logo: v.optional(v.string()),
    logo_url: v.optional(v.string()), // File system logo URL
    brandName: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    active: v.boolean(),
    isOpen: v.optional(v.boolean()), // Restaurant open/closed status (toggle by owner)
    // Business hours for automatic open/close
    businessHours: v.optional(v.object({
      monday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      tuesday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      wednesday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      thursday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      friday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      saturday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
      sunday: v.object({ isOpen: v.boolean(), openTime: v.string(), closeTime: v.string() }),
    })),
    createdAt: v.number(),
    // Owner details
    ownerName: v.optional(v.string()),
    ownerPhone: v.optional(v.string()),
    managerName: v.optional(v.string()),
    managerPhone: v.optional(v.string()),
    // Social media links
    instagramLink: v.optional(v.string()),
    youtubeLink: v.optional(v.string()),
    googleMapsLink: v.optional(v.string()),
    // Onboarding tracking
    onboardingFilledBy: v.optional(v.string()), // 'owner' | 'manager'
    onboardingFilledByName: v.optional(v.string()), // Name of person who filled the form
    mapLink: v.optional(v.string()), // Google Maps link (deprecated, use googleMapsLink)
    onboardingStatus: v.optional(v.number()), // 0 = just created, 100 = fully setup
    // Theme customization
    themeColors: v.optional(v.object({
      dominant: v.string(),
      muted: v.string(),
      darkVibrant: v.string(),
      lightVibrant: v.string(),
    })),
    // Subscription fields
    status: v.optional(v.string()), // 'trial' | 'active' | 'expired' | 'blocked'
    trialStartDate: v.optional(v.number()),
    trialEndDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
    blockedReason: v.optional(v.string()),
  }).index("by_short_id", ["id"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  zones: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    name: v.string(), // "Smoking Zone", "Main Dining", "VIP", etc.
    description: v.string(),
  }).index("by_restaurant", ["restaurantId"]),

  menuItems: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    name: v.string(),
    price: v.number(),
    category: v.string(),
    image: v.string(),
    description: v.string(),
    available: v.boolean(),
    // Zones where this item is available. Empty array = "All Zones" (available everywhere)
    allowedZones: v.optional(v.array(v.id("zones"))),
  }).index("by_restaurant", ["restaurantId"]),

  orders: defineTable({
    restaurantId: v.optional(v.union(v.id("restaurants"), v.string())), // Can be Convex ID or PostgreSQL UUID
    tableId: v.optional(v.string()),
    orderNumber: v.string(),
    items: v.optional(v.array(
      v.object({
        menuItemId: v.union(v.id("menuItems"), v.string()), // Can be Convex ID or UUID
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        image: v.optional(v.string()),
      })
    )),
    total: v.optional(v.number()),
    totalAmount: v.optional(v.number()), // Backend uses totalAmount instead of total
    status: v.string(),
    paymentMethod: v.string(),
    paymentStatus: v.string(),
    notes: v.optional(v.string()),
    customerSessionId: v.optional(v.string()), // Made optional for backend sync
    customerPhone: v.optional(v.string()),
    customerName: v.optional(v.string()), // Added for backend sync
    depositUsed: v.optional(v.number()),
    // Backend sync fields
    postgresId: v.optional(v.string()), // PostgreSQL order ID
    subtotal: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    tipAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    specialInstructions: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()), // When last synced from backend
    // Retry safety fields
    syncPending: v.optional(v.boolean()), // True if sync failed and needs retry
    syncError: v.optional(v.string()), // Error message from last sync attempt
    lastSyncAttempt: v.optional(v.number()), // Timestamp of last sync attempt
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"])
    .index("by_customerSession", ["customerSessionId"])
    .index("by_table", ["tableId"])
    .index("by_phone", ["customerPhone"])
    .index("by_postgres_id", ["postgresId"])
    .index("by_sync_pending", ["syncPending"]),

  tables: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    name: v.string(),
    number: v.number(),
    capacity: v.optional(v.number()), // Max number of guests this table can seat
    zoneId: v.optional(v.id("zones")), // Which zone this table belongs to
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_zone", ["zoneId"]),

  staff: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    name: v.string(),
    role: v.string(), // "Waiter", "Manager", "Host", etc.
    phone: v.optional(v.string()),
    assignedTables: v.array(v.number()), // Array of table numbers [1, 2, 3, 4]
    active: v.boolean(),
    isOnline: v.optional(v.boolean()), // true when logged in, false when logged out
    lastSeen: v.optional(v.number()), // timestamp of last activity
  }).index("by_restaurant", ["restaurantId"]),

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
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
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
    .index("by_restaurant", ["restaurantId"])
    .index("by_table", ["tableId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"]),

  staffCalls: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
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
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"]),

  zoneRequests: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    tableId: v.string(),
    tableNumber: v.number(),
    currentZone: v.optional(v.string()),
    requestedZone: v.string(),
    status: v.string(), // 'pending' | 'approved' | 'denied'
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"]),

  // Inventory & Stock Control tables
  inventory: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    name: v.string(),
    unit: v.string(),
    quantity: v.number(),
    minStock: v.number(),
    costPerUnit: v.number(),
    category: v.string(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_category", ["category"]),

  wastage: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    itemId: v.id("inventory"),
    itemName: v.string(),
    quantity: v.number(),
    reason: v.string(),
    date: v.string(),
    costLoss: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_date", ["date"]),

  deductions: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    itemId: v.id("inventory"),
    itemName: v.string(),
    quantity: v.number(),
    orderId: v.string(),
  }).index("by_restaurant", ["restaurantId"]),

  alertSettings: defineTable({
    restaurantId: v.optional(v.id("restaurants")), // Link to restaurant
    whatsappNumber: v.string(),
    alertsEnabled: v.boolean(),
  }).index("by_restaurant", ["restaurantId"]),

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

  // Subscription Management
  subscriptions: defineTable({
    restaurantId: v.id("restaurants"),
    planType: v.string(), // 'monthly' | 'custom' | 'trial_extension'
    days: v.number(),
    pricePerDay: v.number(),
    totalPrice: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    paymentStatus: v.string(), // 'pending' | 'completed' | 'failed' | 'refunded'
    paymentId: v.optional(v.id("payments")),
    status: v.string(), // 'active' | 'expired' | 'cancelled'
    autoRenew: v.optional(v.boolean()),
    createdAt: v.number(),
    createdBy: v.string(), // 'system' | 'admin' | 'user'
    notes: v.optional(v.string()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"])
    .index("by_end_date", ["endDate"]),

  // Payment Records
  payments: defineTable({
    restaurantId: v.id("restaurants"),
    subscriptionId: v.optional(v.id("subscriptions")),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.optional(v.string()), // 'razorpay' | 'stripe' | 'manual'
    gatewayName: v.optional(v.string()),
    gatewayOrderId: v.optional(v.string()),
    gatewayPaymentId: v.optional(v.string()),
    gatewaySignature: v.optional(v.string()),
    gatewayResponse: v.optional(v.any()),
    status: v.string(), // 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    failedReason: v.optional(v.string()),
    refundAmount: v.optional(v.number()),
    refundReason: v.optional(v.string()),
    refundedAt: v.optional(v.number()),
    processedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_status", ["status"])
    .index("by_gateway_order_id", ["gatewayOrderId"]),

  // Admin Users
  adminUsers: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: v.string(), // 'super_admin' | 'admin' | 'support'
    permissions: v.object({
      view: v.boolean(),
      edit: v.boolean(),
      delete: v.boolean(),
      refund: v.boolean(),
      manageAdmins: v.optional(v.boolean()),
    }),
    active: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Activity Logs
  activityLogs: defineTable({
    actorType: v.string(), // 'admin' | 'system' | 'restaurant'
    actorId: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(), // 'restaurant' | 'subscription' | 'payment'
    entityId: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_actor", ["actorType", "actorId"])
    .index("by_created_at", ["createdAt"]),

  // Notifications
  notifications: defineTable({
    restaurantId: v.id("restaurants"),
    type: v.string(), // 'trial_expiring' | 'trial_expired' | 'payment_due' | 'subscription_expired' | 'payment_success'
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
});
