-- OrderZap Test Data
-- Run this to create sample data for testing

-- Clean up existing test data (optional)
-- DELETE FROM order_items WHERE restaurant_id IN (SELECT id FROM restaurants WHERE slug = 'test-restaurant');
-- DELETE FROM orders WHERE restaurant_id IN (SELECT id FROM restaurants WHERE slug = 'test-restaurant');
-- DELETE FROM menu_items WHERE restaurant_id IN (SELECT id FROM restaurants WHERE slug = 'test-restaurant');
-- DELETE FROM users WHERE restaurant_id IN (SELECT id FROM restaurants WHERE slug = 'test-restaurant');
-- DELETE FROM restaurants WHERE slug = 'test-restaurant';

-- Create Test Restaurant
INSERT INTO restaurants (id, name, slug, email, phone, currency, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Restaurant',
  'test-restaurant',
  'test@restaurant.com',
  '+919876543210',
  'INR',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Create Test Admin User
-- Password: "password123" (bcrypt hash)
INSERT INTO users (id, restaurant_id, email, password_hash, full_name, role, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'admin@test.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWYgmmK6',
  'Test Admin',
  'admin',
  true
)
ON CONFLICT (restaurant_id, email) DO NOTHING;

-- Create Test Menu Categories
INSERT INTO menu_categories (id, restaurant_id, name, display_order)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Starters', 1),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Main Course', 2),
  ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Desserts', 3),
  ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Beverages', 4)
ON CONFLICT DO NOTHING;

-- Create Test Menu Items
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, is_available, is_vegetarian, display_order)
VALUES 
  -- Starters
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 
   'Spring Rolls', 'Crispy vegetable spring rolls', 149.00, true, true, 1),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 
   'Chicken Wings', 'Spicy buffalo wings', 249.00, true, false, 2),
  
  -- Main Course
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 
   'Margherita Pizza', 'Classic cheese pizza', 399.00, true, true, 1),
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 
   'Chicken Burger', 'Grilled chicken burger with fries', 299.00, true, false, 2),
  ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 
   'Pasta Alfredo', 'Creamy pasta with mushrooms', 349.00, true, true, 3),
  
  -- Desserts
  ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440012', 
   'Chocolate Brownie', 'Warm brownie with ice cream', 179.00, true, true, 1),
  ('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440012', 
   'Cheesecake', 'New York style cheesecake', 199.00, true, true, 2),
  
  -- Beverages
  ('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440013', 
   'Coca Cola', 'Chilled soft drink', 49.00, true, true, 1),
  ('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440013', 
   'Fresh Lime Soda', 'Refreshing lime drink', 79.00, true, true, 2)
ON CONFLICT DO NOTHING;

-- Create Test Tables
INSERT INTO tables (id, restaurant_id, table_number, zone_name, capacity, is_active)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'T1', 'Main Hall', 4, true),
  ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', 'T2', 'Main Hall', 4, true),
  ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', 'T3', 'Outdoor', 6, true)
ON CONFLICT DO NOTHING;

-- Display created data
SELECT 'Restaurant Created:' as info;
SELECT id, name, email FROM restaurants WHERE slug = 'test-restaurant';

SELECT '' as info;
SELECT 'User Created (Password: password123):' as info;
SELECT id, email, role FROM users WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

SELECT '' as info;
SELECT 'Menu Items Created:' as info;
SELECT id, name, price FROM menu_items WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY display_order;

SELECT '' as info;
SELECT 'Tables Created:' as info;
SELECT id, table_number, zone_name FROM tables WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

SELECT '' as info;
SELECT '✅ Test data created successfully!' as info;
SELECT 'Use these IDs for testing:' as info;
SELECT 'Restaurant ID: 550e8400-e29b-41d4-a716-446655440000' as info;
SELECT 'User ID: 550e8400-e29b-41d4-a716-446655440001' as info;
SELECT 'Sample Menu Item ID: 550e8400-e29b-41d4-a716-446655440023 (Chicken Burger)' as info;
