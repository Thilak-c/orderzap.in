-- OrderZap PostgreSQL Schema (Source of Truth)
-- Multi-tenant restaurant ordering system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RESTAURANTS TABLE
-- ============================================
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    logo_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_restaurants_slug ON restaurants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_restaurants_active ON restaurants(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(restaurant_id, email)
);

CREATE INDEX idx_users_restaurant ON users(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(restaurant_id, role) WHERE deleted_at IS NULL;

-- ============================================
-- MENU CATEGORIES TABLE
-- ============================================
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_categories_order ON menu_categories(restaurant_id, display_order) WHERE deleted_at IS NULL;

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    allergens TEXT[],
    preparation_time_minutes INTEGER,
    calories INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_category ON menu_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, is_available) WHERE deleted_at IS NULL;

-- ============================================
-- TABLES TABLE
-- ============================================
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    zone_name VARCHAR(100),
    capacity INTEGER DEFAULT 4,
    qr_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(restaurant_id, table_number)
);

CREATE INDEX idx_tables_restaurant ON tables(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tables_zone ON tables(restaurant_id, zone_name) WHERE deleted_at IS NULL;

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    order_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_session_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),
    tip_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tip_amount >= 0),
    discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    deposit_used DECIMAL(10, 2) DEFAULT 0 CHECK (deposit_used >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) CHECK (payment_method IN ('pay-now', 'pay-counter', 'pay-table')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_transaction_id VARCHAR(255),
    notes TEXT,
    special_instructions TEXT,
    estimated_ready_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(restaurant_id, order_number)
);

CREATE INDEX idx_orders_restaurant ON orders(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(restaurant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_table ON orders(table_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_session ON orders(customer_session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created ON orders(restaurant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_payment ON orders(restaurant_id, payment_status) WHERE deleted_at IS NULL;

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    special_instructions TEXT,
    customizations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_order_items_restaurant ON order_items(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_items_order ON order_items(order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id) WHERE deleted_at IS NULL;

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    gateway_response JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_restaurant ON payments(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_order ON payments(order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(restaurant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_transaction ON payments(transaction_id) WHERE deleted_at IS NULL;

-- ============================================
-- SYNC LOGS TABLE
-- ============================================
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    postgres_data JSONB,
    convex_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (convex_sync_status IN ('pending', 'success', 'failed', 'retrying')),
    convex_sync_attempts INTEGER DEFAULT 0,
    convex_error TEXT,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_logs_status ON sync_logs(convex_sync_status, created_at);
CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX idx_sync_logs_restaurant ON sync_logs(restaurant_id, created_at DESC);

-- ============================================
-- SYNC METADATA TABLE
-- ============================================
CREATE TABLE sync_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) UNIQUE NOT NULL,
    last_full_sync_at TIMESTAMP WITH TIME ZONE,
    last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
    total_records_synced BIGINT DEFAULT 0,
    failed_sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_metadata_updated_at BEFORE UPDATE ON sync_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER FOR SYNC LOGGING
-- ============================================
CREATE OR REPLACE FUNCTION log_entity_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO sync_logs (restaurant_id, entity_type, entity_id, operation, postgres_data)
        VALUES (OLD.restaurant_id, TG_TABLE_NAME, OLD.id, 'delete', row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO sync_logs (restaurant_id, entity_type, entity_id, operation, postgres_data)
        VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'update', row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO sync_logs (restaurant_id, entity_type, entity_id, operation, postgres_data)
        VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'create', row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Apply sync triggers to relevant tables
CREATE TRIGGER sync_orders_changes AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION log_entity_change();
CREATE TRIGGER sync_order_items_changes AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION log_entity_change();
CREATE TRIGGER sync_menu_items_changes AFTER INSERT OR UPDATE OR DELETE ON menu_items FOR EACH ROW EXECUTE FUNCTION log_entity_change();
CREATE TRIGGER sync_tables_changes AFTER INSERT OR UPDATE OR DELETE ON tables FOR EACH ROW EXECUTE FUNCTION log_entity_change();

-- ============================================
-- INITIAL DATA
-- ============================================
INSERT INTO sync_metadata (entity_type) VALUES 
    ('orders'),
    ('order_items'),
    ('menu_items'),
    ('tables'),
    ('payments');
