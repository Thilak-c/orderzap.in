-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OrderZap — Seed Menu Data
-- Database: OZ-T (PostgreSQL 16)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO menu_items (name, price, category, in_stock) VALUES
    -- Burgers
    ('Cheese Burger',       149.00, 'Burgers',   true),
    ('Classic Burger',      129.00, 'Burgers',   true),
    ('Double Patty Burger', 199.00, 'Burgers',   true),
    ('Veggie Burger',       119.00, 'Burgers',   true),

    -- Sides
    ('French Fries',         79.00, 'Sides',     true),
    ('Onion Rings',          89.00, 'Sides',     true),
    ('Coleslaw',             59.00, 'Sides',     true),

    -- Beverages
    ('Cola',                 49.00, 'Beverages', true),
    ('Lemonade',             59.00, 'Beverages', true),
    ('Iced Tea',             59.00, 'Beverages', true),
    ('Water',                29.00, 'Beverages', true),

    -- Desserts
    ('Chocolate Brownie',    99.00, 'Desserts',  true),
    ('Ice Cream Sundae',    109.00, 'Desserts',  true)
ON CONFLICT DO NOTHING;
