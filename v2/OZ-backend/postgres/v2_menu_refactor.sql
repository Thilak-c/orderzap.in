-- OrderZap V2 Menu & Zone Refactor Migration
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Create Menus Table
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(short_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON menus(restaurant_id);

-- 2. Refactor Categories Table
-- Add menu_id and is_active, maintain restaurant_id temporarily for migration
ALTER TABLE categories ADD COLUMN IF NOT EXISTS menu_id UUID REFERENCES menus(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Refactor Menu Items Table
-- Add category_id (FK), is_hidden, shortcode, created_at, updated_at
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT; -- Aligning with user request
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true; -- Sync with 'available'
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS shortcode TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 4. Create Item Variants Table
CREATE TABLE IF NOT EXISTS item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    extra_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_item_variants_item_id ON item_variants(item_id);

-- 5. Create Add-ons Table
CREATE TABLE IF NOT EXISTS add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_add_ons_item_id ON add_ons(item_id);

-- 6. Refactor Zones Table
-- Add shortcode, qr_code_url, is_active
ALTER TABLE zones ADD COLUMN IF NOT EXISTS shortcode TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 7. Create Zone-Menu Mapping Table
CREATE TABLE IF NOT EXISTS zone_menu_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(zone_id, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_zone_menu_mapping_zone_id ON zone_menu_mapping(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_menu_mapping_menu_id ON zone_menu_mapping(menu_id);

-- 8. Create Shortcodes Table
CREATE TABLE IF NOT EXISTS shortcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(short_id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('table', 'zone', 'item')),
    reference_id UUID NOT NULL, -- Points to tables.id, zones.id, or menu_items.id
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(restaurant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shortcodes_restaurant_code ON shortcodes(restaurant_id, code);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DATA MIGRATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create a Default Menu for each restaurant that doesn't have one
INSERT INTO menus (restaurant_id, name)
SELECT DISTINCT restaurant_id, 'Main Menu'
FROM categories
WHERE restaurant_id IS NOT NULL;

-- Link existing categories to the new default menu
UPDATE categories c
SET menu_id = m.id
FROM menus m
WHERE c.restaurant_id = m.restaurant_id
AND c.menu_id IS NULL;

-- Link menu_items to categories by matching name (since existing system used text category)
UPDATE menu_items mi
SET category_id = c.id
FROM categories c
WHERE mi.restaurant_id = c.restaurant_id
AND mi.category = c.name
AND mi.category_id IS NULL;

-- Sync 'available' to 'is_available' for menu_items
UPDATE menu_items SET is_available = available;

-- Clean up: Categories no longer need restaurant_id directly if they have menu_id
-- but we'll keep it for now to avoid breaking existing legacy queries until routes are updated.

-- Index for new FKs
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
