-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OrderZap — Core Tables
-- Database: OZ-T (PostgreSQL 18)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Menu Items: the restaurant's catalog
CREATE TABLE IF NOT EXISTS menu_items (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    price       NUMERIC(10, 2)  NOT NULL,
    category    VARCHAR(100)    NOT NULL,
    description TEXT,
    photo_url   VARCHAR(1000),
    in_stock    BOOLEAN         NOT NULL DEFAULT true,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Orders: each customer order
CREATE TABLE IF NOT EXISTS orders (
    id          SERIAL PRIMARY KEY,
    table_no    INTEGER         NOT NULL,
    items       TEXT[]          NOT NULL,
    total       NUMERIC(10, 2)  NOT NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'cooking', 'served')),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Index for the Chef screen: quickly get non-served orders
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)
    WHERE status <> 'served';

-- Index for menu by category
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);

COMMENT ON TABLE menu_items IS 'Restaurant menu catalog — source of truth';
COMMENT ON TABLE orders     IS 'Customer orders — source of truth, mirrored to Convex for reactivity';
