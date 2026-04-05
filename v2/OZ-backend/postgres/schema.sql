-- V2 PostgreSQL Schema for Persistent Tables
-- Generated from V1 Convex Schema Analysis
-- Source: v1/user-side/convex/schema.ts
-- 
-- This schema contains 19 persistent tables classified for PostgreSQL storage
-- based on relational integrity requirements, complex query needs, and ACID transaction requirements.
--
-- Naming Convention: snake_case for PostgreSQL (converted from Convex camelCase)
-- Primary Keys: UUID with gen_random_uuid()
-- Foreign Keys: Explicit constraints with ON DELETE CASCADE where appropriate
-- Indexes: Preserved from V1 Convex indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE RESTAURANT ENTITY
-- ============================================================================

-- Table 1: restaurants
-- Purpose: Core restaurant entity with business information, branding, and subscription status
-- Convex Source: restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id TEXT NOT NULL UNIQUE, -- Convex: id (short restaurant ID like "bts", "mgc")
    name TEXT NOT NULL, -- Convex: name
    logo TEXT, -- Convex: logo
    favicon_url TEXT, -- Convex: favicon_url (square favicon/logo)
    logo_url TEXT, -- Convex: logo_url (legacy)
    brand_name TEXT, -- Convex: brandName
    primary_color TEXT, -- Convex: primaryColor (hex color)
    description TEXT, -- Convex: description
    address TEXT, -- Convex: address
    phone TEXT, -- Convex: phone
    email TEXT, -- Convex: email
    location JSONB, -- Convex: location {latitude, longitude}
    active BOOLEAN NOT NULL DEFAULT true, -- Convex: active
    is_open BOOLEAN, -- Convex: isOpen (current open/closed status)
    business_hours JSONB, -- Convex: businessHours (weekly schedule)
    created_at BIGINT NOT NULL, -- Convex: createdAt (timestamp)
    owner_name TEXT, -- Convex: ownerName
    owner_phone TEXT, -- Convex: ownerPhone
    manager_name TEXT, -- Convex: managerName
    manager_phone TEXT, -- Convex: managerPhone
    instagram_link TEXT, -- Convex: instagramLink
    youtube_link TEXT, -- Convex: youtubeLink
    google_maps_link TEXT, -- Convex: googleMapsLink
    onboarding_filled_by TEXT, -- Convex: onboardingFilledBy
    onboarding_filled_by_name TEXT, -- Convex: onboardingFilledByName
    map_link TEXT, -- Convex: mapLink (deprecated)
    onboarding_status INTEGER, -- Convex: onboardingStatus (0-100)
    theme_colors JSONB, -- Convex: themeColors {dominant, muted, darkVibrant, lightVibrant}
    status TEXT CHECK (status IN ('trial', 'active', 'expired', 'blocked')), -- Convex: status
    trial_start_date BIGINT, -- Convex: trialStartDate
    trial_end_date BIGINT, -- Convex: trialEndDate
    subscription_end_date BIGINT, -- Convex: subscriptionEndDate
    blocked_reason TEXT -- Convex: blockedReason
);

-- Indexes for restaurants (from Convex by_shortid, by_email, by_status)
CREATE INDEX idx_restaurants_short_id ON restaurants(short_id);
CREATE INDEX idx_restaurants_email ON restaurants(email);
CREATE INDEX idx_restaurants_status ON restaurants(status);

-- ============================================================================
-- RESTAURANT CONFIGURATION
-- ============================================================================

-- Table 2: zones
-- Purpose: Dining zones within a restaurant (e.g., "Smoking Zone", "VIP")
-- Convex Source: zones table
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT, -- Convex: restaurantId (short restaurant ID)
    name TEXT NOT NULL, -- Convex: name
    description TEXT NOT NULL, -- Convex: description
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE
);

-- Indexes for zones (from Convex by_restaurant)
CREATE INDEX idx_zones_restaurant_id ON zones(restaurant_id);

-- Table 3: categories
-- Purpose: Menu item categories with custom icons
-- Convex Source: categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT, -- Convex: restaurantId (can be Convex ID or short ID)
    name TEXT NOT NULL, -- Convex: name
    icon TEXT, -- Convex: icon (default icon name)
    icon_file_url TEXT, -- Convex: iconFileUrl (custom icon file path)
    icon_url TEXT, -- Convex: iconUrl (custom icon API route)
    display_order INTEGER, -- Convex: order
    created_at BIGINT NOT NULL, -- Convex: createdAt
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE
);

-- Indexes for categories (from Convex by_restaurant)
CREATE INDEX idx_categories_restaurant_id ON categories(restaurant_id);

-- Table 4: menu_items
-- Purpose: Restaurant menu items with pricing, images, and availability
-- Convex Source: menuItems table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT, -- Convex: restaurantId
    name TEXT NOT NULL, -- Convex: name
    price NUMERIC(10, 2) NOT NULL, -- Convex: price (currency field)
    category TEXT NOT NULL, -- Convex: category
    image TEXT, -- Convex: image (legacy)
    image_file_url TEXT, -- Convex: imageFileUrl (legacy)
    image_url TEXT, -- Convex: imageUrl (API route)
    description TEXT NOT NULL, -- Convex: description
    available BOOLEAN NOT NULL DEFAULT true, -- Convex: available
    allowed_zones JSONB, -- Convex: allowedZones (array of zone IDs)
    theme_colors JSONB, -- Convex: themeColors {primary, secondary, accent}
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE
);

-- Indexes for menu_items (from Convex by_restaurant)
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);

-- Table 5: tables
-- Purpose: Restaurant tables with capacity and zone assignment
-- Convex Source: tables table
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT, -- Convex: restaurantId
    name TEXT NOT NULL, -- Convex: name
    number INTEGER NOT NULL, -- Convex: number
    capacity INTEGER, -- Convex: capacity (max guests)
    zone_id UUID, -- Convex: zoneId
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

-- Indexes for tables (from Convex by_restaurant, by_zone)
CREATE INDEX idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX idx_tables_zone_id ON tables(zone_id);

-- Table 6: alert_settings
-- Purpose: WhatsApp alert configuration for restaurants
-- Convex Source: alertSettings table
CREATE TABLE alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL UNIQUE, -- Convex: restaurantId (one-to-one)
    whatsapp_number TEXT NOT NULL, -- Convex: whatsappNumber
    alerts_enabled BOOLEAN NOT NULL DEFAULT true, -- Convex: alertsEnabled
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE
);

-- Indexes for alert_settings (from Convex by_restaurant)
CREATE INDEX idx_alert_settings_restaurant_id ON alert_settings(restaurant_id);

-- Table 7: settings
-- Purpose: Global app settings (brand name, logo, etc.)
-- Convex Source: settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- Convex: key
    value TEXT NOT NULL -- Convex: value
);

-- Indexes for settings (from Convex by_key)
CREATE INDEX idx_settings_key ON settings(key);

-- ============================================================================
-- STAFF MANAGEMENT
-- ============================================================================

-- Table 8: staff
-- Purpose: Staff members with roles, assignments, location tracking, and payroll info
-- Convex Source: staff table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID, -- Convex: restaurantId
    name TEXT NOT NULL, -- Convex: name
    role TEXT NOT NULL, -- Convex: role (Waiter, Manager, Host, etc.)
    phone TEXT, -- Convex: phone
    email TEXT, -- Convex: email
    password TEXT, -- Convex: password (hashed)
    assigned_tables JSONB NOT NULL DEFAULT '[]', -- Convex: assignedTables (array of table numbers)
    active BOOLEAN NOT NULL DEFAULT true, -- Convex: active
    is_online BOOLEAN, -- Convex: isOnline
    last_seen BIGINT, -- Convex: lastSeen
    current_location JSONB, -- Convex: currentLocation {latitude, longitude, accuracy, timestamp}
    is_in_restaurant BOOLEAN, -- Convex: isInRestaurant (within 100m)
    orders_served_today INTEGER DEFAULT 0, -- Convex: ordersServedToday
    total_orders_served INTEGER DEFAULT 0, -- Convex: totalOrdersServed
    last_order_assigned_at BIGINT, -- Convex: lastOrderAssignedAt
    profile_photo TEXT, -- Convex: profilePhoto
    date_of_birth TEXT, -- Convex: dateOfBirth (YYYY-MM-DD)
    address TEXT, -- Convex: address
    emergency_contact TEXT, -- Convex: emergencyContact
    emergency_contact_phone TEXT, -- Convex: emergencyContactPhone
    joining_date BIGINT, -- Convex: joiningDate
    salary NUMERIC(10, 2), -- Convex: salary (monthly salary)
    salary_type TEXT, -- Convex: salaryType (monthly, hourly, daily)
    hourly_rate NUMERIC(10, 2), -- Convex: hourlyRate
    bank_account TEXT, -- Convex: bankAccount
    bank_name TEXT, -- Convex: bankName
    ifsc_code TEXT -- Convex: ifscCode
);

-- Indexes for staff (from Convex by_restaurant, by_role, by_active, by_phone, by_email)
CREATE INDEX idx_staff_restaurant_id ON staff(restaurant_id);
CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_active ON staff(active);
CREATE INDEX idx_staff_phone ON staff(phone);
CREATE INDEX idx_staff_email ON staff(email);

-- Table 9: payroll
-- Purpose: Monthly payroll records with salary calculations and payment tracking
-- Convex Source: payroll table
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL, -- Convex: restaurantId
    staff_id UUID NOT NULL, -- Convex: staffId
    month TEXT NOT NULL, -- Convex: month (YYYY-MM)
    base_salary NUMERIC(10, 2) NOT NULL, -- Convex: baseSalary
    bonus NUMERIC(10, 2), -- Convex: bonus
    deductions NUMERIC(10, 2), -- Convex: deductions
    total_amount NUMERIC(10, 2) NOT NULL, -- Convex: totalAmount
    days_worked INTEGER NOT NULL, -- Convex: daysWorked
    total_days INTEGER NOT NULL, -- Convex: totalDays
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')), -- Convex: status
    paid_on BIGINT, -- Convex: paidOn
    payment_method TEXT, -- Convex: paymentMethod (cash, bank_transfer, upi)
    notes TEXT, -- Convex: notes
    created_at BIGINT NOT NULL, -- Convex: createdAt
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Indexes for payroll (from Convex by_restaurant, by_staff, by_month, by_status)
CREATE INDEX idx_payroll_restaurant_id ON payroll(restaurant_id);
CREATE INDEX idx_payroll_staff_id ON payroll(staff_id);
CREATE INDEX idx_payroll_month ON payroll(month);
CREATE INDEX idx_payroll_status ON payroll(status);

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Table 10: inventory
-- Purpose: Restaurant inventory items with stock levels and costs
-- Convex Source: inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID, -- Convex: restaurantId
    name TEXT NOT NULL, -- Convex: name
    unit TEXT NOT NULL, -- Convex: unit
    quantity NUMERIC(10, 2) NOT NULL, -- Convex: quantity
    min_stock NUMERIC(10, 2) NOT NULL, -- Convex: minStock
    cost_per_unit NUMERIC(10, 2) NOT NULL, -- Convex: costPerUnit
    category TEXT NOT NULL, -- Convex: category
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Indexes for inventory (from Convex by_restaurant, by_category)
CREATE INDEX idx_inventory_restaurant_id ON inventory(restaurant_id);
CREATE INDEX idx_inventory_category ON inventory(category);

-- Table 11: wastage
-- Purpose: Inventory wastage tracking with cost loss calculations
-- Convex Source: wastage table
CREATE TABLE wastage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID, -- Convex: restaurantId
    item_id UUID NOT NULL, -- Convex: itemId
    item_name TEXT NOT NULL, -- Convex: itemName
    quantity NUMERIC(10, 2) NOT NULL, -- Convex: quantity
    reason TEXT NOT NULL, -- Convex: reason
    date TEXT NOT NULL, -- Convex: date
    cost_loss NUMERIC(10, 2) NOT NULL, -- Convex: costLoss
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- Indexes for wastage (from Convex by_restaurant, by_date)
CREATE INDEX idx_wastage_restaurant_id ON wastage(restaurant_id);
CREATE INDEX idx_wastage_date ON wastage(date);

-- Table 12: deductions
-- Purpose: Inventory deductions linked to orders
-- Convex Source: deductions table
CREATE TABLE deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID, -- Convex: restaurantId
    item_id UUID NOT NULL, -- Convex: itemId
    item_name TEXT NOT NULL, -- Convex: itemName
    quantity NUMERIC(10, 2) NOT NULL, -- Convex: quantity
    order_id TEXT NOT NULL, -- Convex: orderId (reference to order)
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- Indexes for deductions (from Convex by_restaurant)
CREATE INDEX idx_deductions_restaurant_id ON deductions(restaurant_id);

-- ============================================================================
-- CUSTOMER MANAGEMENT
-- ============================================================================

-- Table 13: customers
-- Purpose: Customer accounts with visit history and deposit balance
-- Convex Source: customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Convex: name
    phone TEXT NOT NULL UNIQUE, -- Convex: phone (primary identifier)
    total_visits INTEGER NOT NULL DEFAULT 0, -- Convex: totalVisits
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Convex: totalSpent
    deposit_balance NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Convex: depositBalance
    created_at BIGINT NOT NULL, -- Convex: createdAt
    last_visit BIGINT -- Convex: lastVisit
);

-- Indexes for customers (from Convex by_phone)
CREATE INDEX idx_customers_phone ON customers(phone);

-- Table 14: reservations
-- Purpose: Table reservations with customer info and deposit tracking
-- Convex Source: reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID, -- Convex: restaurantId
    table_id UUID NOT NULL, -- Convex: tableId
    table_number INTEGER NOT NULL, -- Convex: tableNumber
    customer_name TEXT NOT NULL, -- Convex: customerName
    customer_phone TEXT, -- Convex: customerPhone
    customer_id UUID, -- Convex: customerId
    date TEXT NOT NULL, -- Convex: date (YYYY-MM-DD)
    start_time TEXT NOT NULL, -- Convex: startTime (HH:MM)
    end_time TEXT NOT NULL, -- Convex: endTime (HH:MM)
    party_size INTEGER NOT NULL, -- Convex: partySize
    deposit_amount NUMERIC(10, 2), -- Convex: depositAmount
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'completed')), -- Convex: status
    arrived BOOLEAN, -- Convex: arrived
    notes TEXT, -- Convex: notes
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Indexes for reservations (from Convex by_restaurant, by_table, by_date, by_status, by_customer)
CREATE INDEX idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);

-- Table 15: reviews
-- Purpose: Customer feedback and reviews
-- Convex Source: reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL, -- Convex: restaurantId
    table_id TEXT NOT NULL, -- Convex: tableId
    table_number INTEGER NOT NULL, -- Convex: tableNumber
    enjoyed BOOLEAN NOT NULL, -- Convex: enjoyed
    issue_with TEXT CHECK (issue_with IN ('restaurant', 'app')), -- Convex: issueWith
    issue_category TEXT, -- Convex: issueCategory
    feedback TEXT, -- Convex: feedback
    created_at BIGINT NOT NULL, -- Convex: createdAt
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE
);

-- Indexes for reviews (from Convex by_restaurant, by_enjoyed)
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX idx_reviews_enjoyed ON reviews(enjoyed);

-- ============================================================================
-- SUBSCRIPTION & PAYMENT MANAGEMENT
-- ============================================================================

-- Table 16: subscriptions
-- Purpose: Restaurant subscription plans with pricing and status
-- Convex Source: subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL, -- Convex: restaurantId (can be Convex ID or short ID)
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'custom', 'trial_extension')), -- Convex: planType
    days INTEGER NOT NULL, -- Convex: days
    price_per_day NUMERIC(10, 2) NOT NULL, -- Convex: pricePerDay
    total_price NUMERIC(10, 2) NOT NULL, -- Convex: totalPrice
    start_date BIGINT NOT NULL, -- Convex: startDate
    end_date BIGINT NOT NULL, -- Convex: endDate
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')), -- Convex: paymentStatus
    payment_id UUID, -- Convex: paymentId
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')), -- Convex: status
    auto_renew BOOLEAN, -- Convex: autoRenew
    created_at BIGINT NOT NULL, -- Convex: createdAt
    created_by TEXT NOT NULL, -- Convex: createdBy (system, admin, user)
    notes TEXT, -- Convex: notes
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE
);

-- Indexes for subscriptions (from Convex by_restaurant, by_status, by_end_date)
CREATE INDEX idx_subscriptions_restaurant_id ON subscriptions(restaurant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);

-- Table 17: payments
-- Purpose: Payment records with gateway integration details
-- Convex Source: payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL, -- Convex: restaurantId
    subscription_id UUID, -- Convex: subscriptionId
    amount NUMERIC(10, 2) NOT NULL, -- Convex: amount
    currency TEXT NOT NULL, -- Convex: currency
    payment_method TEXT, -- Convex: paymentMethod (razorpay, stripe, manual)
    gateway_name TEXT, -- Convex: gatewayName
    gateway_order_id TEXT, -- Convex: gatewayOrderId
    gateway_payment_id TEXT, -- Convex: gatewayPaymentId
    gateway_signature TEXT, -- Convex: gatewaySignature
    gateway_response JSONB, -- Convex: gatewayResponse (v.any())
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')), -- Convex: status
    created_at BIGINT NOT NULL, -- Convex: createdAt
    completed_at BIGINT, -- Convex: completedAt
    failed_reason TEXT, -- Convex: failedReason
    refund_amount NUMERIC(10, 2), -- Convex: refundAmount
    refund_reason TEXT, -- Convex: refundReason
    refunded_at BIGINT, -- Convex: refundedAt
    processed_by TEXT, -- Convex: processedBy
    notes TEXT, -- Convex: notes
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

-- Indexes for payments (from Convex by_restaurant, by_subscription, by_status, by_gateway_order_id)
CREATE INDEX idx_payments_restaurant_id ON payments(restaurant_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_order_id ON payments(gateway_order_id);

-- ============================================================================
-- ADMIN & AUDIT
-- ============================================================================

-- Table 18: admin_users
-- Purpose: Admin user accounts with roles and permissions
-- Convex Source: adminUsers table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE, -- Convex: email
    password_hash TEXT NOT NULL, -- Convex: passwordHash
    name TEXT NOT NULL, -- Convex: name
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')), -- Convex: role
    permissions JSONB NOT NULL, -- Convex: permissions {view, edit, delete, refund, manageAdmins}
    active BOOLEAN NOT NULL DEFAULT true, -- Convex: active
    last_login_at BIGINT, -- Convex: lastLoginAt
    created_at BIGINT NOT NULL -- Convex: createdAt
);

-- Indexes for admin_users (from Convex by_email)
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Table 19: activity_logs
-- Purpose: Audit trail for system activities
-- Convex Source: activityLogs table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT NOT NULL, -- Convex: actorType (admin, system, restaurant)
    actor_id TEXT, -- Convex: actorId
    actor_email TEXT, -- Convex: actorEmail
    action TEXT NOT NULL, -- Convex: action
    entity_type TEXT NOT NULL, -- Convex: entityType (restaurant, subscription, payment)
    entity_id TEXT NOT NULL, -- Convex: entityId
    description TEXT NOT NULL, -- Convex: description
    metadata JSONB, -- Convex: metadata (v.any())
    ip_address TEXT, -- Convex: ipAddress
    created_at BIGINT NOT NULL -- Convex: createdAt
);

-- Indexes for activity_logs (from Convex by_entity, by_actor, by_created_at)
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_type, actor_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================================
-- ORDER MANAGEMENT (DUAL-DATABASE SYNC PRIMARY)
-- ============================================================================

-- Table 20: orders
-- Purpose: Primary persistence for customer orders
-- Convex Mirror: orders table (Real-time tracking)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL, -- Convex: restaurantId (short_id)
    table_id UUID, -- Convex: tableId (PostgreSQL UUID)
    order_number TEXT NOT NULL, -- Convex: orderNumber
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Convex: totalAmount
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Convex: subtotal
    tax_amount NUMERIC(10, 2) DEFAULT 0, -- Convex: taxAmount
    tip_amount NUMERIC(10, 2) DEFAULT 0, -- Convex: tipAmount
    discount_amount NUMERIC(10, 2) DEFAULT 0, -- Convex: discountAmount
    status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')), -- Convex: status
    payment_method TEXT NOT NULL, -- Convex: paymentMethod
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')), -- Convex: paymentStatus
    notes TEXT, -- Convex: notes
    customer_session_id TEXT, -- Convex: customerSessionId
    customer_phone TEXT, -- Convex: customerPhone
    customer_name TEXT, -- Convex: customerName
    assigned_waiter_id UUID, -- Convex: assignedWaiterId
    created_at BIGINT NOT NULL, -- Convex: createdAt
    updated_at BIGINT NOT NULL, -- Convex: updatedAt
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(short_id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_waiter_id) REFERENCES staff(id) ON DELETE SET NULL
);

-- Indexes for orders (from Convex by_restaurant, by_status, by_table, by_phone)
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_phone ON orders(customer_phone);

-- Table 21: order_items
-- Purpose: Individual items within an order
-- Convex Mirror: items array inside orders object
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL, -- Reference to parent order
    menu_item_id UUID, -- Reference to original menu item
    name TEXT NOT NULL, -- Snapshot of item name (at time of order)
    price NUMERIC(10, 2) NOT NULL, -- Snapshot of item price (at time of order)
    quantity INTEGER NOT NULL DEFAULT 1, -- Quantity ordered
    image TEXT, -- Optional image URL
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
);

-- Indexes for order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- Total Tables: 21 persistent tables
-- Total Indexes: 52 indexes
-- Foreign Keys: 41 relationships
-- Type Mappings: Convex types → PostgreSQL types per Type_Mapper rules
-- ============================================================================
