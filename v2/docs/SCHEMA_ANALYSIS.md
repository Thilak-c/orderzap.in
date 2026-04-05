# V1 Convex Schema Analysis

## Overview

This document provides a comprehensive analysis of the V1 Convex schema located at `v1/user-side/convex/schema.ts`. The schema contains **27 tables** with various data types, indexes, and relationships. This analysis serves as the foundation for the V2 dual-database architecture migration.

**Analysis Date:** 2024
**Source File:** v1/user-side/convex/schema.ts
**Total Tables:** 27

## Table of Contents

1. [Convex Type System](#convex-type-system)
2. [Complete Table Inventory](#complete-table-inventory)
3. [Foreign Key Relationships](#foreign-key-relationships)
4. [Database Classification Matrix](#database-classification-matrix)
5. [Cross-Database Synchronization Requirements](#cross-database-synchronization-requirements)

---

## Convex Type System

### Identified Convex Types

The V1 schema uses the following Convex type primitives:

- **v.id(tableName)**: Reference to another table's document ID
- **v.string()**: Text data
- **v.number()**: Numeric data (integers, floats, timestamps)
- **v.boolean()**: True/false values
- **v.object({...})**: Nested object structures
- **v.array(type)**: Arrays of a specific type
- **v.union(type1, type2, ...)**: Union types (multiple possible types)
- **v.optional(type)**: Optional fields (can be undefined)
- **v.any()**: Any type (used for flexible JSON data)

---

## Complete Table Inventory


### Table 1: restaurants

**Purpose:** Core restaurant entity with business information, branding, and subscription status

**Fields:**
- `id` (v.string): Short restaurant ID (e.g., "bts", "mgc")
- `name` (v.string): Restaurant name
- `logo` (v.optional(v.string)): Logo reference
- `favicon_url` (v.optional(v.string)): Square favicon URL
- `logo_url` (v.optional(v.string)): Legacy logo URL
- `brandName` (v.optional(v.string)): Brand name
- `primaryColor` (v.optional(v.string)): Brand color (hex)
- `description` (v.optional(v.string)): Restaurant description
- `address` (v.optional(v.string)): Physical address
- `phone` (v.optional(v.string)): Contact phone
- `email` (v.optional(v.string)): Contact email
- `location` (v.optional(v.object)): GPS coordinates {latitude, longitude}
- `active` (v.boolean): Active status
- `isOpen` (v.optional(v.boolean)): Current open/closed status
- `businessHours` (v.optional(v.object)): Weekly schedule with open/close times
- `createdAt` (v.number): Creation timestamp
- `ownerName` (v.optional(v.string)): Owner name
- `ownerPhone` (v.optional(v.string)): Owner phone
- `managerName` (v.optional(v.string)): Manager name
- `managerPhone` (v.optional(v.string)): Manager phone
- `instagramLink` (v.optional(v.string)): Instagram URL
- `youtubeLink` (v.optional(v.string)): YouTube URL
- `googleMapsLink` (v.optional(v.string)): Google Maps URL
- `onboardingFilledBy` (v.optional(v.string)): Who filled onboarding
- `onboardingFilledByName` (v.optional(v.string)): Name of onboarding person
- `mapLink` (v.optional(v.string)): Deprecated maps link
- `onboardingStatus` (v.optional(v.number)): Onboarding progress (0-100)
- `themeColors` (v.optional(v.object)): Theme color palette
- `status` (v.optional(v.string)): Subscription status ('trial' | 'active' | 'expired' | 'blocked')
- `trialStartDate` (v.optional(v.number)): Trial start timestamp
- `trialEndDate` (v.optional(v.number)): Trial end timestamp
- `subscriptionEndDate` (v.optional(v.number)): Subscription end timestamp
- `blockedReason` (v.optional(v.string)): Reason for blocking

**Indexes:**
- `by_shortid` on [id]
- `by_email` on [email]
- `by_status` on [status]

**Relationships:**
- Parent to: zones, categories, menuItems, orders, tables, staff, attendance, payroll, reservations, staffCalls, zoneRequests, inventory, wastage, deductions, alertSettings, subscriptions, payments, notifications, reviews


### Table 2: zones

**Purpose:** Dining zones within a restaurant (e.g., "Smoking Zone", "VIP")

**Fields:**
- `restaurantId` (v.optional(v.string)): Short restaurant ID
- `name` (v.string): Zone name
- `description` (v.string): Zone description

**Indexes:**
- `by_restaurant` on [restaurantId]

**Relationships:**
- Parent: restaurants (via restaurantId)
- Child to: tables (via zoneId), menuItems (via allowedZones array)

---

### Table 3: categories

**Purpose:** Menu item categories with custom icons

**Fields:**
- `restaurantId` (v.optional(v.union(v.id("restaurants"), v.string))): Restaurant reference
- `name` (v.string): Category name
- `icon` (v.optional(v.string)): Default icon name
- `iconFileUrl` (v.optional(v.string)): Custom icon file path
- `iconUrl` (v.optional(v.string)): Custom icon API route
- `order` (v.optional(v.number)): Display order
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_restaurant` on [restaurantId]

**Relationships:**
- Parent: restaurants (via restaurantId)
- Referenced by: menuItems (via category field)

---

### Table 4: menuItems

**Purpose:** Restaurant menu items with pricing, images, and availability

**Fields:**
- `restaurantId` (v.optional(v.union(v.id("restaurants"), v.string))): Restaurant reference
- `name` (v.string): Item name
- `price` (v.number): Item price
- `category` (v.string): Category name
- `image` (v.optional(v.string)): Legacy image field
- `imageFileUrl` (v.optional(v.string)): Legacy image file URL
- `imageUrl` (v.optional(v.string)): Image API route
- `description` (v.string): Item description
- `available` (v.boolean): Availability status
- `allowedZones` (v.optional(v.array(v.id("zones")))): Zones where available
- `themeColors` (v.optional(v.object)): Theme colors from image

**Indexes:**
- `by_restaurant` on [restaurantId]

**Relationships:**
- Parent: restaurants (via restaurantId), zones (via allowedZones)
- Referenced by: orders (via items array)


### Table 5: orders

**Purpose:** Customer orders with real-time status tracking and waiter assignment

**Fields:**
- `restaurantId` (v.optional(v.union(v.id("restaurants"), v.string))): Restaurant reference
- `tableId` (v.optional(v.string)): Table reference
- `orderNumber` (v.string): Order number
- `items` (v.optional(v.array(v.object))): Order items with menuItemId, name, price, quantity, image
- `total` (v.optional(v.number)): Total amount (legacy)
- `totalAmount` (v.optional(v.number)): Total amount (backend)
- `status` (v.string): Order status ('pending' | 'preparing' | 'ready' | 'completed' | 'cancelled')
- `paymentMethod` (v.string): Payment method
- `paymentStatus` (v.string): Payment status
- `notes` (v.optional(v.string)): Order notes
- `customerSessionId` (v.optional(v.string)): Customer session ID
- `customerPhone` (v.optional(v.string)): Customer phone
- `customerName` (v.optional(v.string)): Customer name
- `depositUsed` (v.optional(v.number)): Deposit amount used
- `assignedWaiterId` (v.optional(v.id("staff"))): Assigned waiter
- `assignedAt` (v.optional(v.number)): Assignment timestamp
- `assignmentStatus` (v.optional(v.string)): Assignment status
- `assignmentAcceptedAt` (v.optional(v.number)): Acceptance timestamp
- `assignmentTimeoutAt` (v.optional(v.number)): Timeout timestamp
- `postgresId` (v.optional(v.string)): PostgreSQL order ID
- `subtotal` (v.optional(v.number)): Subtotal
- `taxAmount` (v.optional(v.number)): Tax amount
- `tipAmount` (v.optional(v.number)): Tip amount
- `discountAmount` (v.optional(v.number)): Discount amount
- `specialInstructions` (v.optional(v.string)): Special instructions
- `createdAt` (v.optional(v.number)): Creation timestamp
- `updatedAt` (v.optional(v.number)): Update timestamp
- `lastSyncedAt` (v.optional(v.number)): Last sync timestamp
- `syncPending` (v.optional(v.boolean)): Sync pending flag
- `syncError` (v.optional(v.string)): Sync error message
- `lastSyncAttempt` (v.optional(v.number)): Last sync attempt timestamp

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_status` on [status]
- `by_customerSession` on [customerSessionId]
- `by_table` on [tableId]
- `by_phone` on [customerPhone]
- `by_postgres_id` on [postgresId]
- `by_sync_pending` on [syncPending]
- `by_assigned_waiter` on [assignedWaiterId]

**Relationships:**
- Parent: restaurants (via restaurantId), tables (via tableId), staff (via assignedWaiterId)
- References: menuItems (via items array)


### Table 6: tables

**Purpose:** Restaurant tables with capacity and zone assignment

**Fields:**
- `restaurantId` (v.optional(v.union(v.id("restaurants"), v.string))): Restaurant reference
- `name` (v.string): Table name
- `number` (v.number): Table number
- `capacity` (v.optional(v.number)): Max guests
- `zoneId` (v.optional(v.id("zones"))): Zone reference

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_zone` on [zoneId]

**Relationships:**
- Parent: restaurants (via restaurantId), zones (via zoneId)
- Referenced by: orders, reservations, staffCalls, zoneRequests

---

### Table 7: staff

**Purpose:** Staff members with roles, assignments, location tracking, and payroll info

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `name` (v.string): Staff name
- `role` (v.string): Role (Waiter, Manager, Host, etc.)
- `phone` (v.optional(v.string)): Phone number
- `email` (v.optional(v.string)): Email address
- `password` (v.optional(v.string)): Hashed password
- `assignedTables` (v.array(v.number)): Assigned table numbers
- `active` (v.boolean): Active status
- `isOnline` (v.optional(v.boolean)): Online status
- `lastSeen` (v.optional(v.number)): Last activity timestamp
- `currentLocation` (v.optional(v.object)): GPS location with accuracy
- `isInRestaurant` (v.optional(v.boolean)): Within 100m of restaurant
- `ordersServedToday` (v.optional(v.number)): Daily order count
- `totalOrdersServed` (v.optional(v.number)): Lifetime order count
- `lastOrderAssignedAt` (v.optional(v.number)): Last assignment timestamp
- `profilePhoto` (v.optional(v.string)): Profile photo URL
- `dateOfBirth` (v.optional(v.string)): DOB (YYYY-MM-DD)
- `address` (v.optional(v.string)): Address
- `emergencyContact` (v.optional(v.string)): Emergency contact name
- `emergencyContactPhone` (v.optional(v.string)): Emergency contact phone
- `joiningDate` (v.optional(v.number)): Joining timestamp
- `salary` (v.optional(v.number)): Monthly salary
- `salaryType` (v.optional(v.string)): Salary type
- `hourlyRate` (v.optional(v.number)): Hourly rate
- `bankAccount` (v.optional(v.string)): Bank account number
- `bankName` (v.optional(v.string)): Bank name
- `ifscCode` (v.optional(v.string)): IFSC code

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_role` on [role]
- `by_active` on [active]
- `by_phone` on [phone]
- `by_email` on [email]

**Relationships:**
- Parent: restaurants (via restaurantId)
- Referenced by: orders (via assignedWaiterId), attendance, payroll, staffNotifications, staffCalls


### Table 8: attendance

**Purpose:** Staff attendance tracking with check-in/check-out and location verification

**Fields:**
- `restaurantId` (v.id("restaurants")): Restaurant reference
- `staffId` (v.id("staff")): Staff reference
- `date` (v.string): Date (YYYY-MM-DD)
- `checkIn` (v.optional(v.number)): Check-in timestamp
- `checkOut` (v.optional(v.number)): Check-out timestamp
- `checkInLocation` (v.optional(v.object)): Check-in GPS location
- `checkOutLocation` (v.optional(v.object)): Check-out GPS location
- `status` (v.string): Status ('present' | 'absent' | 'half-day' | 'leave')
- `workHours` (v.optional(v.number)): Total work hours
- `notes` (v.optional(v.string)): Notes

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_staff` on [staffId]
- `by_date` on [date]
- `by_staff_date` on [staffId, date]

**Relationships:**
- Parent: restaurants (via restaurantId), staff (via staffId)

---

### Table 9: payroll

**Purpose:** Monthly payroll records with salary calculations and payment tracking

**Fields:**
- `restaurantId` (v.id("restaurants")): Restaurant reference
- `staffId` (v.id("staff")): Staff reference
- `month` (v.string): Month (YYYY-MM)
- `baseSalary` (v.number): Base salary
- `bonus` (v.optional(v.number)): Bonus amount
- `deductions` (v.optional(v.number)): Deductions
- `totalAmount` (v.number): Total amount
- `daysWorked` (v.number): Days worked
- `totalDays` (v.number): Total days in month
- `status` (v.string): Status ('pending' | 'paid' | 'cancelled')
- `paidOn` (v.optional(v.number)): Payment timestamp
- `paymentMethod` (v.optional(v.string)): Payment method
- `notes` (v.optional(v.string)): Notes
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_staff` on [staffId]
- `by_month` on [month]
- `by_status` on [status]

**Relationships:**
- Parent: restaurants (via restaurantId), staff (via staffId)

---

### Table 10: staffNotifications

**Purpose:** Notifications for managers about staff events

**Fields:**
- `type` (v.string): Notification type
- `message` (v.string): Notification message
- `staffId` (v.optional(v.id("staff"))): Related staff
- `relatedCallId` (v.optional(v.id("staffCalls"))): Related call
- `read` (v.boolean): Read status
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_read` on [read]

**Relationships:**
- References: staff (via staffId), staffCalls (via relatedCallId)


### Table 11: reservations

**Purpose:** Table reservations with customer info and deposit tracking

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `tableId` (v.id("tables")): Table reference
- `tableNumber` (v.number): Table number
- `customerName` (v.string): Customer name
- `customerPhone` (v.optional(v.string)): Customer phone
- `customerId` (v.optional(v.id("customers"))): Customer account reference
- `date` (v.string): Reservation date (YYYY-MM-DD)
- `startTime` (v.string): Start time (HH:MM)
- `endTime` (v.string): End time (HH:MM)
- `partySize` (v.number): Party size
- `depositAmount` (v.optional(v.number)): Deposit paid
- `status` (v.string): Status ('confirmed' | 'cancelled' | 'completed')
- `arrived` (v.optional(v.boolean)): Customer arrived flag
- `notes` (v.optional(v.string)): Notes

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_table` on [tableId]
- `by_date` on [date]
- `by_status` on [status]
- `by_customer` on [customerId]

**Relationships:**
- Parent: restaurants (via restaurantId), tables (via tableId), customers (via customerId)

---

### Table 12: staffCalls

**Purpose:** Real-time staff call requests from tables

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `tableId` (v.string): Table ID
- `tableNumber` (v.number): Table number
- `zoneName` (v.optional(v.string)): Zone name
- `reason` (v.optional(v.string)): Call reason
- `status` (v.string): Status ('pending' | 'acknowledged' | 'resolved')
- `createdAt` (v.number): Creation timestamp
- `acknowledgedAt` (v.optional(v.number)): Acknowledgment timestamp
- `originalStaffId` (v.optional(v.id("staff"))): Original assigned staff
- `reassignedTo` (v.optional(v.id("staff"))): Reassigned staff
- `reassignReason` (v.optional(v.string)): Reassignment reason

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_status` on [status]

**Relationships:**
- Parent: restaurants (via restaurantId)
- References: staff (via originalStaffId, reassignedTo)
- Referenced by: staffNotifications (via relatedCallId)

---

### Table 13: zoneRequests

**Purpose:** Customer requests to change dining zones

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `tableId` (v.string): Table ID
- `tableNumber` (v.number): Table number
- `currentZone` (v.optional(v.string)): Current zone
- `requestedZone` (v.string): Requested zone
- `status` (v.string): Status ('pending' | 'approved' | 'denied')
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_status` on [status]

**Relationships:**
- Parent: restaurants (via restaurantId)


### Table 14: inventory

**Purpose:** Restaurant inventory items with stock levels and costs

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `name` (v.string): Item name
- `unit` (v.string): Unit of measurement
- `quantity` (v.number): Current quantity
- `minStock` (v.number): Minimum stock level
- `costPerUnit` (v.number): Cost per unit
- `category` (v.string): Item category

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_category` on [category]

**Relationships:**
- Parent: restaurants (via restaurantId)
- Referenced by: wastage (via itemId), deductions (via itemId)

---

### Table 15: wastage

**Purpose:** Inventory wastage tracking with cost loss calculations

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `itemId` (v.id("inventory")): Inventory item reference
- `itemName` (v.string): Item name
- `quantity` (v.number): Wasted quantity
- `reason` (v.string): Wastage reason
- `date` (v.string): Date
- `costLoss` (v.number): Cost loss amount

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_date` on [date]

**Relationships:**
- Parent: restaurants (via restaurantId), inventory (via itemId)

---

### Table 16: deductions

**Purpose:** Inventory deductions linked to orders

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `itemId` (v.id("inventory")): Inventory item reference
- `itemName` (v.string): Item name
- `quantity` (v.number): Deducted quantity
- `orderId` (v.string): Order reference

**Indexes:**
- `by_restaurant` on [restaurantId]

**Relationships:**
- Parent: restaurants (via restaurantId), inventory (via itemId)
- References: orders (via orderId)

---

### Table 17: alertSettings

**Purpose:** WhatsApp alert configuration for restaurants

**Fields:**
- `restaurantId` (v.optional(v.id("restaurants"))): Restaurant reference
- `whatsappNumber` (v.string): WhatsApp number
- `alertsEnabled` (v.boolean): Alerts enabled flag

**Indexes:**
- `by_restaurant` on [restaurantId]

**Relationships:**
- Parent: restaurants (via restaurantId)


### Table 18: customers

**Purpose:** Customer accounts with visit history and deposit balance

**Fields:**
- `name` (v.string): Customer name
- `phone` (v.string): Phone number (primary identifier)
- `totalVisits` (v.number): Total visit count
- `totalSpent` (v.number): Total amount spent
- `depositBalance` (v.number): Redeemable deposit balance
- `createdAt` (v.number): Creation timestamp
- `lastVisit` (v.optional(v.number)): Last visit timestamp

**Indexes:**
- `by_phone` on [phone]

**Relationships:**
- Referenced by: reservations (via customerId)

---

### Table 19: settings

**Purpose:** Global app settings (brand name, logo, etc.)

**Fields:**
- `key` (v.string): Setting key
- `value` (v.string): Setting value

**Indexes:**
- `by_key` on [key]

**Relationships:**
- None (global settings)

---

### Table 20: subscriptions

**Purpose:** Restaurant subscription plans with pricing and status

**Fields:**
- `restaurantId` (v.union(v.id("restaurants"), v.string)): Restaurant reference
- `planType` (v.string): Plan type ('monthly' | 'custom' | 'trial_extension')
- `days` (v.number): Subscription days
- `pricePerDay` (v.number): Price per day
- `totalPrice` (v.number): Total price
- `startDate` (v.number): Start timestamp
- `endDate` (v.number): End timestamp
- `paymentStatus` (v.string): Payment status ('pending' | 'completed' | 'failed' | 'refunded')
- `paymentId` (v.optional(v.id("payments"))): Payment reference
- `status` (v.string): Status ('active' | 'expired' | 'cancelled')
- `autoRenew` (v.optional(v.boolean)): Auto-renew flag
- `createdAt` (v.number): Creation timestamp
- `createdBy` (v.string): Creator ('system' | 'admin' | 'user')
- `notes` (v.optional(v.string)): Notes

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_status` on [status]
- `by_end_date` on [endDate]

**Relationships:**
- Parent: restaurants (via restaurantId)
- References: payments (via paymentId)
- Referenced by: payments (via subscriptionId)


### Table 21: payments

**Purpose:** Payment records with gateway integration details

**Fields:**
- `restaurantId` (v.union(v.id("restaurants"), v.string)): Restaurant reference
- `subscriptionId` (v.optional(v.id("subscriptions"))): Subscription reference
- `amount` (v.number): Payment amount
- `currency` (v.string): Currency code
- `paymentMethod` (v.optional(v.string)): Payment method
- `gatewayName` (v.optional(v.string)): Gateway name
- `gatewayOrderId` (v.optional(v.string)): Gateway order ID
- `gatewayPaymentId` (v.optional(v.string)): Gateway payment ID
- `gatewaySignature` (v.optional(v.string)): Gateway signature
- `gatewayResponse` (v.optional(v.any)): Gateway response data
- `status` (v.string): Status ('pending' | 'processing' | 'completed' | 'failed' | 'refunded')
- `createdAt` (v.number): Creation timestamp
- `completedAt` (v.optional(v.number)): Completion timestamp
- `failedReason` (v.optional(v.string)): Failure reason
- `refundAmount` (v.optional(v.number)): Refund amount
- `refundReason` (v.optional(v.string)): Refund reason
- `refundedAt` (v.optional(v.number)): Refund timestamp
- `processedBy` (v.optional(v.string)): Processor
- `notes` (v.optional(v.string)): Notes

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_subscription` on [subscriptionId]
- `by_status` on [status]
- `by_gateway_order_id` on [gatewayOrderId]

**Relationships:**
- Parent: restaurants (via restaurantId), subscriptions (via subscriptionId)
- Referenced by: subscriptions (via paymentId)

---

### Table 22: adminUsers

**Purpose:** Admin user accounts with roles and permissions

**Fields:**
- `email` (v.string): Email address
- `passwordHash` (v.string): Hashed password
- `name` (v.string): Admin name
- `role` (v.string): Role ('super_admin' | 'admin' | 'support')
- `permissions` (v.object): Permission flags
- `active` (v.boolean): Active status
- `lastLoginAt` (v.optional(v.number)): Last login timestamp
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_email` on [email]

**Relationships:**
- Referenced by: activityLogs (via actorId)

---

### Table 23: activityLogs

**Purpose:** Audit trail for system activities

**Fields:**
- `actorType` (v.string): Actor type ('admin' | 'system' | 'restaurant')
- `actorId` (v.optional(v.string)): Actor ID
- `actorEmail` (v.optional(v.string)): Actor email
- `action` (v.string): Action performed
- `entityType` (v.string): Entity type
- `entityId` (v.string): Entity ID
- `description` (v.string): Action description
- `metadata` (v.optional(v.any)): Additional metadata
- `ipAddress` (v.optional(v.string)): IP address
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_entity` on [entityType, entityId]
- `by_actor` on [actorType, actorId]
- `by_created_at` on [createdAt]

**Relationships:**
- References: adminUsers, restaurants (via actorId/entityId)


### Table 24: notifications

**Purpose:** Multi-channel notifications for restaurants

**Fields:**
- `restaurantId` (v.union(v.id("restaurants"), v.string)): Restaurant reference
- `type` (v.string): Notification type
- `title` (v.string): Notification title
- `message` (v.string): Notification message
- `status` (v.string): Status ('pending' | 'sent' | 'failed')
- `read` (v.boolean): Read status
- `channels` (v.array(v.string)): Delivery channels
- `sentAt` (v.optional(v.number)): Sent timestamp
- `readAt` (v.optional(v.number)): Read timestamp
- `createdAt` (v.number): Creation timestamp
- `metadata` (v.optional(v.any)): Additional metadata

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_status` on [status]
- `by_read` on [read]

**Relationships:**
- Parent: restaurants (via restaurantId)

---

### Table 25: reviews

**Purpose:** Customer feedback and reviews

**Fields:**
- `restaurantId` (v.union(v.id("restaurants"), v.string)): Restaurant reference
- `tableId` (v.string): Table ID
- `tableNumber` (v.number): Table number
- `enjoyed` (v.boolean): Enjoyed flag
- `issueWith` (v.optional(v.string)): Issue category ('restaurant' | 'app')
- `issueCategory` (v.optional(v.string)): Specific issue type
- `feedback` (v.optional(v.string)): Additional feedback
- `createdAt` (v.number): Creation timestamp

**Indexes:**
- `by_restaurant` on [restaurantId]
- `by_enjoyed` on [enjoyed]

**Relationships:**
- Parent: restaurants (via restaurantId)

---

## Foreign Key Relationships

### Identified Relationships

Based on field naming patterns (fields ending in "Id" or containing "Id"), the following foreign key relationships were identified:


| Child Table | Foreign Key Field | Parent Table | Relationship Type |
|-------------|-------------------|--------------|-------------------|
| zones | restaurantId | restaurants | Many-to-One |
| categories | restaurantId | restaurants | Many-to-One |
| menuItems | restaurantId | restaurants | Many-to-One |
| menuItems | allowedZones | zones | Many-to-Many (array) |
| orders | restaurantId | restaurants | Many-to-One |
| orders | tableId | tables | Many-to-One |
| orders | assignedWaiterId | staff | Many-to-One |
| orders | items[].menuItemId | menuItems | Many-to-Many (array) |
| tables | restaurantId | restaurants | Many-to-One |
| tables | zoneId | zones | Many-to-One |
| staff | restaurantId | restaurants | Many-to-One |
| attendance | restaurantId | restaurants | Many-to-One |
| attendance | staffId | staff | Many-to-One |
| payroll | restaurantId | restaurants | Many-to-One |
| payroll | staffId | staff | Many-to-One |
| staffNotifications | staffId | staff | Many-to-One |
| staffNotifications | relatedCallId | staffCalls | Many-to-One |
| reservations | restaurantId | restaurants | Many-to-One |
| reservations | tableId | tables | Many-to-One |
| reservations | customerId | customers | Many-to-One |
| staffCalls | restaurantId | restaurants | Many-to-One |
| staffCalls | originalStaffId | staff | Many-to-One |
| staffCalls | reassignedTo | staff | Many-to-One |
| zoneRequests | restaurantId | restaurants | Many-to-One |
| inventory | restaurantId | restaurants | Many-to-One |
| wastage | restaurantId | restaurants | Many-to-One |
| wastage | itemId | inventory | Many-to-One |
| deductions | restaurantId | restaurants | Many-to-One |
| deductions | itemId | inventory | Many-to-One |
| alertSettings | restaurantId | restaurants | One-to-One |
| subscriptions | restaurantId | restaurants | Many-to-One |
| subscriptions | paymentId | payments | Many-to-One |
| payments | restaurantId | restaurants | Many-to-One |
| payments | subscriptionId | subscriptions | Many-to-One |
| notifications | restaurantId | restaurants | Many-to-One |
| reviews | restaurantId | restaurants | Many-to-One |

**Total Relationships:** 35 foreign key relationships identified

---

## Database Classification Matrix

### Classification Criteria

**Real-Time Data (Convex):**
- High-frequency updates (multiple times per minute)
- Requires reactive/live updates to connected clients
- Temporary/transient data with short lifecycle
- Simple queries without complex joins

**Persistent Data (PostgreSQL):**
- Infrequent updates (daily, weekly, or less)
- Requires complex queries with joins
- Requires ACID transactions
- Long-term storage with relational integrity
- Historical/analytical queries


### Classification Results

| # | Table Name | Target Database | Rationale |
|---|------------|-----------------|-----------|
| 1 | restaurants | **PostgreSQL** | Core entity with relational integrity requirements, infrequent updates, complex joins with all other tables |
| 2 | zones | **PostgreSQL** | Configuration data, rarely changes, referenced by tables and menuItems |
| 3 | categories | **PostgreSQL** | Menu structure data, infrequent updates, referenced by menuItems |
| 4 | menuItems | **PostgreSQL** | Core menu data with pricing, requires complex queries, joins with categories and zones |
| 5 | orders | **Convex** | High-frequency status updates, real-time tracking, reactive UI requirements. Sync to PostgreSQL for historical data |
| 6 | tables | **PostgreSQL** | Configuration data, rarely changes, referenced by orders and reservations |
| 7 | staff | **PostgreSQL** | Employee master data, infrequent updates, complex joins with attendance and payroll |
| 8 | attendance | **Convex** | Real-time check-in/check-out tracking with live status updates. Sync to PostgreSQL for payroll calculations |
| 9 | payroll | **PostgreSQL** | Financial data requiring ACID transactions, complex calculations from attendance data |
| 10 | staffNotifications | **Convex** | Real-time notifications requiring immediate delivery and reactive updates |
| 11 | reservations | **PostgreSQL** | Booking data with complex queries (date ranges, availability), joins with tables and customers |
| 12 | staffCalls | **Convex** | Real-time call requests requiring immediate notification and status updates |
| 13 | zoneRequests | **Convex** | Real-time zone change requests requiring immediate manager notification |
| 14 | inventory | **PostgreSQL** | Stock management with complex queries, joins with wastage and deductions |
| 15 | wastage | **PostgreSQL** | Historical tracking for analytics, joins with inventory for cost calculations |
| 16 | deductions | **PostgreSQL** | Inventory tracking linked to orders, requires joins for reporting |
| 17 | alertSettings | **PostgreSQL** | Configuration data, rarely changes, one-to-one with restaurant |
| 18 | customers | **PostgreSQL** | Customer master data with visit history, requires complex queries for loyalty programs |
| 19 | settings | **PostgreSQL** | Global configuration, rarely changes, no real-time requirements |
| 20 | subscriptions | **PostgreSQL** | Financial data requiring ACID transactions, complex queries for billing |
| 21 | payments | **PostgreSQL** | Financial transactions requiring ACID guarantees, audit trail requirements |
| 22 | adminUsers | **PostgreSQL** | User authentication data, security requirements, infrequent updates |
| 23 | activityLogs | **PostgreSQL** | Audit trail requiring long-term storage and complex queries for compliance |
| 24 | notifications | **Convex** | Real-time notification delivery with reactive status updates |
| 25 | reviews | **PostgreSQL** | Feedback data for analytics, complex queries for reporting |

**Summary:**
- **PostgreSQL Tables:** 19 (persistent, relational data)
- **Convex Tables:** 6 (real-time, reactive data)
- **Dual-Database Tables:** 2 (orders, attendance - Convex primary with PostgreSQL sync)


---

## Cross-Database Synchronization Requirements

### Dual-Database Tables

These tables exist in both databases with different purposes:

#### 1. Orders (Convex ↔ PostgreSQL)

**Convex (Primary for Real-Time):**
- Real-time order status updates ('pending' → 'preparing' → 'ready' → 'completed')
- Live waiter assignment and acceptance tracking
- Customer-facing reactive UI updates
- Staff app real-time notifications

**PostgreSQL (Primary for Historical):**
- Source of truth for completed orders
- Historical order data for analytics
- Financial reporting and reconciliation
- Complex queries (revenue by date, popular items, etc.)

**Synchronization Flow:**
1. Order created → Write to PostgreSQL first (source of truth)
2. PostgreSQL order synced to Convex with `postgresId` reference
3. Status updates → Update Convex immediately (real-time)
4. Status updates → Async sync to PostgreSQL (eventual consistency)
5. Order completion → Final sync from Convex to PostgreSQL

**Sync Fields:**
- `postgresId`: PostgreSQL UUID reference in Convex
- `lastSyncedAt`: Last successful sync timestamp
- `syncPending`: Flag for failed syncs requiring retry
- `syncError`: Error message from last sync attempt
- `lastSyncAttempt`: Timestamp of last sync attempt

---

#### 2. Attendance (Convex ↔ PostgreSQL)

**Convex (Primary for Real-Time):**
- Live check-in/check-out status
- Real-time location tracking
- Staff online/offline status
- Manager dashboard live updates

**PostgreSQL (Primary for Payroll):**
- Historical attendance records
- Payroll calculation source data
- Attendance reports and analytics
- Leave management

**Synchronization Flow:**
1. Check-in → Write to Convex immediately (real-time status)
2. Check-in → Async sync to PostgreSQL
3. Check-out → Update Convex immediately
4. Check-out → Async sync to PostgreSQL with calculated work hours
5. End of day → Final sync ensures PostgreSQL has complete records

**Sync Fields:**
- Similar to orders: `postgresId`, `lastSyncedAt`, `syncPending`

---

### Cross-Database Relationships

These relationships span both databases and require careful handling:

#### Orders → MenuItems
- **Challenge:** Orders (Convex) reference menuItems (PostgreSQL)
- **Solution:** Store menuItem snapshot in order (name, price, image) to avoid cross-database joins
- **Sync:** When creating order, fetch menuItem from PostgreSQL and embed in Convex order

#### Orders → Staff (Waiter Assignment)
- **Challenge:** Orders (Convex) reference staff (PostgreSQL)
- **Solution:** Store staff ID and name in order for display, query PostgreSQL for full staff details when needed
- **Sync:** Real-time assignment updates in Convex, periodic sync to PostgreSQL

#### Orders → Tables
- **Challenge:** Orders (Convex) reference tables (PostgreSQL)
- **Solution:** Store table number in order, query PostgreSQL for full table details when needed

#### Attendance → Staff
- **Challenge:** Attendance (Convex) references staff (PostgreSQL)
- **Solution:** Store staff ID in attendance, query PostgreSQL for staff details
- **Sync:** Attendance records synced to PostgreSQL with staff ID preserved

---

### Synchronization Mechanisms

#### 1. Write-Through Pattern (Orders Creation)
```
Client → API → PostgreSQL (write) → Convex (sync) → Response
```
- Ensures PostgreSQL is source of truth
- Convex updated immediately after PostgreSQL write
- Client receives response only after both writes succeed

#### 2. Write-Behind Pattern (Status Updates)
```
Client → API → Convex (write) → Response
                ↓
         PostgreSQL (async sync)
```
- Optimizes for real-time responsiveness
- Convex updated immediately
- PostgreSQL synced asynchronously with retry logic

#### 3. Retry Mechanism
- Failed syncs set `syncPending = true`
- Background job retries every 60 seconds
- Exponential backoff for repeated failures
- Alert after 5 consecutive failures

#### 4. Conflict Resolution
- PostgreSQL is always source of truth for persistent data
- Convex timestamps used to detect stale data
- Last-write-wins for status updates
- Manual intervention for payment/financial conflicts

---

## Implementation Notes

### Type Conversions

**Convex → PostgreSQL:**
- `v.id("table")` → `UUID` (generate new UUID, store mapping)
- `v.string()` → `TEXT`
- `v.number()` → `NUMERIC` (currency), `INTEGER` (counts), `BIGINT` (timestamps)
- `v.boolean()` → `BOOLEAN`
- `v.object()` → `JSONB`
- `v.array()` → `JSONB` or `ARRAY` type
- `v.optional()` → `NULL` constraint
- Required fields → `NOT NULL` constraint

### Index Preservation

All Convex indexes must be recreated in PostgreSQL:
- Single-column indexes → `CREATE INDEX idx_name ON table(column)`
- Multi-column indexes → `CREATE INDEX idx_name ON table(col1, col2)`
- Unique constraints → `CREATE UNIQUE INDEX`

### Naming Conventions

**PostgreSQL:**
- Table names: `snake_case` (e.g., `menu_items`, `staff_calls`)
- Column names: `snake_case` (e.g., `restaurant_id`, `created_at`)
- Index names: `idx_tablename_columnname`
- Foreign key names: `fk_childtable_parenttable`

**Convex:**
- Preserve V1 naming: `camelCase` for consistency
- Table names: `camelCase` (e.g., `menuItems`, `staffCalls`)
- Field names: `camelCase` (e.g., `restaurantId`, `createdAt`)

---

## Next Steps

1. **Create V2 Convex Schema** (v2/convex/schema.ts)
   - Include 6 real-time tables: orders, attendance, staffNotifications, staffCalls, zoneRequests, notifications
   - Add sync fields: postgresId, lastSyncedAt, syncPending

2. **Create V2 PostgreSQL Schema** (v2/postgres/schema.sql)
   - Include 19 persistent tables with proper types and constraints
   - Add foreign key relationships
   - Create indexes matching V1

3. **Implement CRUD Tests** (v2/tests/db.test.ts)
   - Test all PostgreSQL tables
   - Verify constraints and relationships
   - Must pass before API development

4. **Build REST API** (v2/OZ-backend/express/src/routes/)
   - Create endpoints for all resources
   - Implement dual-database routing logic
   - Add authentication and authorization

5. **Document API** (v2/docs/BACKEND_API.md)
   - Complete endpoint documentation
   - Request/response examples
   - Integration guide

---

**Document Version:** 1.0
**Last Updated:** 2024
**Status:** Complete - Ready for V2 Schema Creation
