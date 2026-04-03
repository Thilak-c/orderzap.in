-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OrderZap — Seed Menu Data
-- Database: OZ-T (PostgreSQL 16)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO menu_items (name, price, category, description, photo_url, in_stock) VALUES
    -- Burgers
    ('Cheese Burger',       149.00, 'Burgers',   'Classic burger with melted cheese.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800', true),
    ('Classic Burger',      129.00, 'Burgers',   'Our traditional house burger.', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800', true),
    ('Double Patty Burger', 199.00, 'Burgers',   'Two juicy beef patties.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=800', true),
    ('Veggie Burger',       119.00, 'Burgers',   'Delicious plant-based patty.', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=80&w=800', true),

    -- Sides
    ('French Fries',         79.00, 'Sides',     'Crispy golden fries.', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=800', true),
    ('Onion Rings',          89.00, 'Sides',     'Battered and fried onion rings.', 'https://images.unsplash.com/photo-1639024470081-ce39b22db7f6?auto=format&fit=crop&q=80&w=800', true),
    ('Coleslaw',             59.00, 'Sides',     'Fresh cabbage salad.', 'https://images.unsplash.com/photo-1628198642738-f1092e0984ee?auto=format&fit=crop&q=80&w=800', true),

    -- Beverages
    ('Cola',                 49.00, 'Beverages', 'Cold generic cola.', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800', true),
    ('Lemonade',             59.00, 'Beverages', 'Freshly squeezed lemonade.', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800', true),
    ('Iced Tea',             59.00, 'Beverages', 'Brewed tea with ice.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=800', true),
    ('Water',                29.00, 'Beverages', 'Bottled mineral water.', 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&q=80&w=800', true),

    -- Desserts
    ('Chocolate Brownie',    99.00, 'Desserts',  'Decadent chocolate fudge brownie.', 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&q=80&w=800', true),
    ('Ice Cream Sundae',    109.00, 'Desserts',  true)
ON CONFLICT DO NOTHING;
