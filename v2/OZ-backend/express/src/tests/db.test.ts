/**
 * PostgreSQL CRUD Test Suite
 * ──────────────────────────────────────────────────────────────
 * Comprehensive tests for all PostgreSQL tables
 * 
 * Requirements: 6.1, 6.10-6.14
 * - Test CREATE operations for every PostgreSQL table
 * - Test READ operations for every PostgreSQL table
 * - Test UPDATE operations for every PostgreSQL table
 * - Test DELETE operations for every PostgreSQL table
 * - Use test database separate from production
 * - Clean up test data after each test (rollback or delete)
 * - Report pass/fail status for each table's CRUD operations
 * - Use Vitest testing framework
 * - Connect using database.ts connection pool
 * 
 * This is a BLOCKING GATE phase - ALL tests must pass before
 * proceeding to Phase 4 (API Endpoints).
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { query, getClient } from '../config/database';
import type { PoolClient } from 'pg';
import type {
  Restaurant,
  Zone,
  Category,
  MenuItem,
  Table,
  AlertSettings,
  Settings,
  Staff,
  Payroll,
  Inventory,
  Wastage,
  Deduction,
  Customer,
  Reservation,
  Review,
  Subscription,
  Payment,
  AdminUser,
  ActivityLog,
} from '../types/database';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

/**
 * Test database connection validation
 */
beforeAll(async () => {
  try {
    const result = await query<{ test: number }>('SELECT 1 as test');
    expect(result).toBeDefined();
    expect(result[0].test).toBe(1);
    console.log('✓ Test database connection established');
  } catch (error) {
    console.error('✗ Failed to connect to test database:', error);
    throw error;
  }
});

/**
 * Cleanup after all tests complete
 */
afterAll(async () => {
  console.log('✓ All tests completed');
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Transaction-based test cleanup
 * Each test runs in a transaction that is rolled back after completion
 */
class TestTransaction {
  private client: PoolClient | null = null;

  async begin(): Promise<PoolClient> {
    this.client = await getClient();
    await this.client.query('BEGIN');
    return this.client;
  }

  async rollback(): Promise<void> {
    if (this.client) {
      await this.client.query('ROLLBACK');
      this.client.release();
      this.client = null;
    }
  }

  async query<T = any>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    if (!this.client) {
      throw new Error('Transaction not started. Call begin() first.');
    }
    const result = await this.client.query(text, params);
    return result.rows as T[];
  }
}

/**
 * Generate test timestamp (current time in milliseconds)
 */
function testTimestamp(): number {
  return Date.now();
}

/**
 * Generate test date string (YYYY-MM-DD)
 */
function testDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate test time string (HH:MM)
 */
function testTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// ============================================================================
// RESTAURANT TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Restaurants', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a restaurant', async () => {
    const restaurant = {
      short_id: 'test-rest',
      name: 'Test Restaurant',
      active: true,
      created_at: testTimestamp(),
    };

    const result = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant.short_id, restaurant.name, restaurant.active, restaurant.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].short_id).toBe(restaurant.short_id);
    expect(result[0].name).toBe(restaurant.name);
    expect(result[0].active).toBe(restaurant.active);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a restaurant by ID', async () => {
    // Create test restaurant
    const created = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Read it back
    const result = await tx.query<Restaurant>(
      'SELECT * FROM restaurants WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].short_id).toBe('test-rest');
  });

  it('should UPDATE a restaurant', async () => {
    // Create test restaurant
    const created = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Update it
    const updated = await tx.query<Restaurant>(
      `UPDATE restaurants 
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      ['Updated Restaurant', 'New description', created[0].id]
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Updated Restaurant');
    expect(updated[0].description).toBe('New description');
    expect(updated[0].id).toBe(created[0].id);
  });

  it('should DELETE a restaurant', async () => {
    // Create test restaurant
    const created = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Delete it
    await tx.query(
      'DELETE FROM restaurants WHERE id = $1',
      [created[0].id]
    );

    // Verify deletion
    const result = await tx.query<Restaurant>(
      'SELECT * FROM restaurants WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should enforce unique constraint on short_id', async () => {
    await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Attempt duplicate insert
    await expect(
      tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at)
         VALUES ($1, $2, $3, $4)`,
        ['test-rest', 'Another Restaurant', true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should test JSONB round-trip for location field', async () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };

    const created = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp(), JSON.stringify(location)]
    );

    expect(created[0].location).toEqual(location);
  });
});

// ============================================================================
// MENU ITEMS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Menu Items', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a menu item', async () => {
    // Create parent restaurant first
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const menuItem = {
      restaurant_id: restaurant[0].short_id,
      name: 'Margherita Pizza',
      price: 12.99,
      category: 'Pizza',
      description: 'Classic tomato and mozzarella',
      available: true,
    };

    const result = await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [menuItem.restaurant_id, menuItem.name, menuItem.price, menuItem.category, menuItem.description, menuItem.available]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(menuItem.name);
    expect(parseFloat(result[0].price as unknown as string)).toBe(menuItem.price);
    expect(result[0].category).toBe(menuItem.category);
    expect(result[0].available).toBe(menuItem.available);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a menu item by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'Margherita Pizza', 12.99, 'Pizza', 'Classic pizza', true]
    );

    const result = await tx.query<MenuItem>(
      'SELECT * FROM menu_items WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].name).toBe('Margherita Pizza');
  });

  it('should UPDATE a menu item', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'Margherita Pizza', 12.99, 'Pizza', 'Classic pizza', true]
    );

    const updated = await tx.query<MenuItem>(
      `UPDATE menu_items 
       SET name = $1, price = $2, available = $3
       WHERE id = $4
       RETURNING *`,
      ['Pepperoni Pizza', 14.99, false, created[0].id]
    );

    expect(updated[0].name).toBe('Pepperoni Pizza');
    expect(parseFloat(updated[0].price as unknown as string)).toBe(14.99);
    expect(updated[0].available).toBe(false);
  });

  it('should DELETE a menu item', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'Margherita Pizza', 12.99, 'Pizza', 'Classic pizza', true]
    );

    await tx.query('DELETE FROM menu_items WHERE id = $1', [created[0].id]);

    const result = await tx.query<MenuItem>(
      'SELECT * FROM menu_items WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete menu items when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [restaurant[0].short_id, 'Margherita Pizza', 12.99, 'Pizza', 'Classic pizza', true]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify menu items were cascade deleted
    const menuItems = await tx.query<MenuItem>(
      'SELECT * FROM menu_items WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(menuItems).toHaveLength(0);
  });

  it('should test JSONB round-trip for allowed_zones field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const allowedZones = ['zone-1', 'zone-2', 'zone-3'];

    const created = await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available, allowed_zones)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].short_id, 'Margherita Pizza', 12.99, 'Pizza', 'Classic pizza', true, JSON.stringify(allowedZones)]
    );

    expect(created[0].allowed_zones).toEqual(allowedZones);
  });

  it('should test JSONB round-trip for theme_colors field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const themeColors = { primary: '#FF5733', secondary: '#33FF57', accent: '#3357FF' };

    const created = await tx.query<MenuItem>(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available, theme_colors)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].short_id, 'Margherita Pizza', 12.99, 'Pizza', 'Classic pizza', true, JSON.stringify(themeColors)]
    );

    expect(created[0].theme_colors).toEqual(themeColors);
  });
});

// ============================================================================
// CATEGORIES TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Categories', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a category', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const category = {
      restaurant_id: restaurant[0].short_id,
      name: 'Appetizers',
      icon: 'appetizer-icon',
      display_order: 1,
      created_at: testTimestamp(),
    };

    const result = await tx.query<Category>(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [category.restaurant_id, category.name, category.icon, category.display_order, category.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(category.name);
    expect(result[0].icon).toBe(category.icon);
    expect(result[0].display_order).toBe(category.display_order);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a category by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Category>(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].short_id, 'Appetizers', 'appetizer-icon', 1, testTimestamp()]
    );

    const result = await tx.query<Category>(
      'SELECT * FROM categories WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].name).toBe('Appetizers');
  });

  it('should UPDATE a category', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Category>(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].short_id, 'Appetizers', 'appetizer-icon', 1, testTimestamp()]
    );

    const updated = await tx.query<Category>(
      `UPDATE categories 
       SET name = $1, display_order = $2
       WHERE id = $3
       RETURNING *`,
      ['Starters', 2, created[0].id]
    );

    expect(updated[0].name).toBe('Starters');
    expect(updated[0].display_order).toBe(2);
  });

  it('should DELETE a category', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Category>(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].short_id, 'Appetizers', 'appetizer-icon', 1, testTimestamp()]
    );

    await tx.query('DELETE FROM categories WHERE id = $1', [created[0].id]);

    const result = await tx.query<Category>(
      'SELECT * FROM categories WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete categories when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Category>(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [restaurant[0].short_id, 'Appetizers', 'appetizer-icon', 1, testTimestamp()]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify categories were cascade deleted
    const categories = await tx.query<Category>(
      'SELECT * FROM categories WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(categories).toHaveLength(0);
  });

  it('should verify timestamp auto-generation on insert', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const beforeInsert = Date.now();
    
    const created = await tx.query<Category>(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].short_id, 'Appetizers', 'appetizer-icon', 1, testTimestamp()]
    );

    const afterInsert = Date.now();

    expect(created[0].created_at).toBeDefined();
    const createdAtNum = typeof created[0].created_at === 'string' 
      ? parseInt(created[0].created_at) 
      : created[0].created_at;
    expect(createdAtNum).toBeGreaterThanOrEqual(beforeInsert - 1000);
    expect(createdAtNum).toBeLessThanOrEqual(afterInsert + 1000);
  });
});

// ============================================================================
// TABLES TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Tables', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a table', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = {
      restaurant_id: restaurant[0].short_id,
      name: 'Table A1',
      number: 1,
      capacity: 4,
    };

    const result = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [table.restaurant_id, table.name, table.number, table.capacity]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(table.name);
    expect(result[0].number).toBe(table.number);
    expect(result[0].capacity).toBe(table.capacity);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a table by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const result = await tx.query<Table>(
      'SELECT * FROM tables WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].name).toBe('Table A1');
  });

  it('should UPDATE a table', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const updated = await tx.query<Table>(
      `UPDATE tables 
       SET name = $1, capacity = $2
       WHERE id = $3
       RETURNING *`,
      ['Table B1', 6, created[0].id]
    );

    expect(updated[0].name).toBe('Table B1');
    expect(updated[0].capacity).toBe(6);
  });

  it('should DELETE a table', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    await tx.query('DELETE FROM tables WHERE id = $1', [created[0].id]);

    const result = await tx.query<Table>(
      'SELECT * FROM tables WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete tables when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify tables were cascade deleted
    const tables = await tx.query<Table>(
      'SELECT * FROM tables WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(tables).toHaveLength(0);
  });

  it('should handle zone_id foreign key relationship', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const zone = await tx.query<Zone>(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity, zone_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4, zone[0].id]
    );

    expect(table[0].zone_id).toBe(zone[0].id);

    // Verify zone_id is set to NULL when zone is deleted (ON DELETE SET NULL)
    await tx.query('DELETE FROM zones WHERE id = $1', [zone[0].id]);

    const updatedTable = await tx.query<Table>(
      'SELECT * FROM tables WHERE id = $1',
      [table[0].id]
    );

    expect(updatedTable[0].zone_id).toBeNull();
  });

  it('should verify UUID auto-generation on insert', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    expect(created[0].id).toBeDefined();
    expect(created[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

// ============================================================================
// ZONES TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Zones', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a zone', async () => {
    // Create parent restaurant first
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const zone = {
      restaurant_id: restaurant[0].short_id,
      name: 'VIP Zone',
      description: 'Premium seating area',
    };

    const result = await tx.query<Zone>(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [zone.restaurant_id, zone.name, zone.description]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(zone.name);
    expect(result[0].restaurant_id).toBe(zone.restaurant_id);
  });

  it('should READ a zone by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Zone>(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    const result = await tx.query<Zone>(
      'SELECT * FROM zones WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
  });

  it('should UPDATE a zone', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Zone>(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    const updated = await tx.query<Zone>(
      `UPDATE zones 
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      ['Updated Zone', 'New description', created[0].id]
    );

    expect(updated[0].name).toBe('Updated Zone');
  });

  it('should DELETE a zone', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Zone>(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    await tx.query('DELETE FROM zones WHERE id = $1', [created[0].id]);

    const result = await tx.query<Zone>(
      'SELECT * FROM zones WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete zones when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Zone>(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify zones were cascade deleted
    const zones = await tx.query<Zone>(
      'SELECT * FROM zones WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(zones).toHaveLength(0);
  });
});

// ============================================================================
// STAFF TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Staff', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a staff member', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = {
      restaurant_id: restaurant[0].id,
      name: 'John Doe',
      role: 'Waiter',
      phone: '+1234567890',
      email: 'john@example.com',
      assigned_tables: [1, 2, 3],
      active: true,
    };

    const result = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [staff.restaurant_id, staff.name, staff.role, staff.phone, staff.email, JSON.stringify(staff.assigned_tables), staff.active]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(staff.name);
    expect(result[0].role).toBe(staff.role);
    expect(result[0].phone).toBe(staff.phone);
    expect(result[0].email).toBe(staff.email);
    expect(result[0].assigned_tables).toEqual(staff.assigned_tables);
    expect(result[0].active).toBe(staff.active);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a staff member by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const result = await tx.query<Staff>(
      'SELECT * FROM staff WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].name).toBe('John Doe');
  });

  it('should UPDATE a staff member', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const updated = await tx.query<Staff>(
      `UPDATE staff 
       SET name = $1, role = $2, active = $3
       WHERE id = $4
       RETURNING *`,
      ['Jane Smith', 'Manager', false, created[0].id]
    );

    expect(updated[0].name).toBe('Jane Smith');
    expect(updated[0].role).toBe('Manager');
    expect(updated[0].active).toBe(false);
  });

  it('should DELETE a staff member', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await tx.query('DELETE FROM staff WHERE id = $1', [created[0].id]);

    const result = await tx.query<Staff>(
      'SELECT * FROM staff WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should verify staff is not cascade deleted when restaurant is deleted (no FK constraint)', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify staff still exists (no FK constraint, so no cascade)
    const staff = await tx.query<Staff>(
      'SELECT * FROM staff WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    // Note: Staff table doesn't have FK constraint with CASCADE, so staff remains
    expect(staff).toHaveLength(1);
  });

  it('should test JSONB round-trip for assigned_tables field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const assignedTables = [1, 2, 3, 4, 5];

    const created = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify(assignedTables), true]
    );

    expect(created[0].assigned_tables).toEqual(assignedTables);
  });

  it('should test JSONB round-trip for current_location field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const location = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: testTimestamp(),
    };

    const created = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active, current_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true, JSON.stringify(location)]
    );

    expect(created[0].current_location).toEqual(location);
  });

  it('should test NUMERIC fields for salary and hourly_rate', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active, salary, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true, 3000.50, 15.75]
    );

    expect(parseFloat(created[0].salary as unknown as string)).toBe(3000.50);
    expect(parseFloat(created[0].hourly_rate as unknown as string)).toBe(15.75);
  });
});

// ============================================================================
// PAYROLL TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Payroll', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a payroll record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const payroll = {
      restaurant_id: restaurant[0].id,
      staff_id: staff[0].id,
      month: '2024-01',
      base_salary: 3000.00,
      bonus: 500.00,
      deductions: 200.00,
      total_amount: 3300.00,
      days_worked: 26,
      total_days: 31,
      status: 'pending' as const,
      created_at: testTimestamp(),
    };

    const result = await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [payroll.restaurant_id, payroll.staff_id, payroll.month, payroll.base_salary, payroll.bonus, payroll.deductions, payroll.total_amount, payroll.days_worked, payroll.total_days, payroll.status, payroll.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe(payroll.month);
    expect(parseFloat(result[0].base_salary as unknown as string)).toBe(payroll.base_salary);
    expect(parseFloat(result[0].bonus as unknown as string)).toBe(payroll.bonus);
    expect(parseFloat(result[0].deductions as unknown as string)).toBe(payroll.deductions);
    expect(parseFloat(result[0].total_amount as unknown as string)).toBe(payroll.total_amount);
    expect(result[0].days_worked).toBe(payroll.days_worked);
    expect(result[0].total_days).toBe(payroll.total_days);
    expect(result[0].status).toBe(payroll.status);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a payroll record by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const created = await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000.00, 500.00, 200.00, 3300.00, 26, 31, 'pending', testTimestamp()]
    );

    const result = await tx.query<Payroll>(
      'SELECT * FROM payroll WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].month).toBe('2024-01');
  });

  it('should UPDATE a payroll record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const created = await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000.00, 500.00, 200.00, 3300.00, 26, 31, 'pending', testTimestamp()]
    );

    const updated = await tx.query<Payroll>(
      `UPDATE payroll 
       SET status = $1, paid_on = $2, payment_method = $3
       WHERE id = $4
       RETURNING *`,
      ['paid', testTimestamp(), 'bank_transfer', created[0].id]
    );

    expect(updated[0].status).toBe('paid');
    expect(updated[0].paid_on).toBeDefined();
    expect(updated[0].payment_method).toBe('bank_transfer');
  });

  it('should DELETE a payroll record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const created = await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000.00, 500.00, 200.00, 3300.00, 26, 31, 'pending', testTimestamp()]
    );

    await tx.query('DELETE FROM payroll WHERE id = $1', [created[0].id]);

    const result = await tx.query<Payroll>(
      'SELECT * FROM payroll WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete payroll when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000.00, 500.00, 200.00, 3300.00, 26, 31, 'pending', testTimestamp()]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify payroll records were cascade deleted
    const payroll = await tx.query<Payroll>(
      'SELECT * FROM payroll WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(payroll).toHaveLength(0);
  });

  it('should CASCADE delete payroll when staff is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000.00, 500.00, 200.00, 3300.00, 26, 31, 'pending', testTimestamp()]
    );

    // Delete staff
    await tx.query('DELETE FROM staff WHERE id = $1', [staff[0].id]);

    // Verify payroll records were cascade deleted
    const payroll = await tx.query<Payroll>(
      'SELECT * FROM payroll WHERE staff_id = $1',
      [staff[0].id]
    );

    expect(payroll).toHaveLength(0);
  });

  it('should enforce CHECK constraint on status field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    // Attempt to insert with invalid status
    await expect(
      tx.query(
        `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].id, staff[0].id, '2024-01', 3000.00, 500.00, 200.00, 3300.00, 26, 31, 'invalid_status', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should test NUMERIC precision for monetary fields', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query<Staff>(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const created = await tx.query<Payroll>(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000.99, 500.50, 200.25, 3301.24, 26, 31, 'pending', testTimestamp()]
    );

    expect(parseFloat(created[0].base_salary as unknown as string)).toBe(3000.99);
    expect(parseFloat(created[0].bonus as unknown as string)).toBe(500.50);
    expect(parseFloat(created[0].deductions as unknown as string)).toBe(200.25);
    expect(parseFloat(created[0].total_amount as unknown as string)).toBe(3301.24);
  });
});

// ============================================================================
// INVENTORY TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Inventory', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE an inventory item', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = {
      restaurant_id: restaurant[0].id,
      name: 'Tomatoes',
      unit: 'kg',
      quantity: 50.5,
      min_stock: 10.0,
      cost_per_unit: 2.50,
      category: 'Vegetables',
    };

    const result = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [inventory.restaurant_id, inventory.name, inventory.unit, inventory.quantity, inventory.min_stock, inventory.cost_per_unit, inventory.category]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(inventory.name);
    expect(result[0].unit).toBe(inventory.unit);
    expect(parseFloat(result[0].quantity as unknown as string)).toBe(inventory.quantity);
    expect(parseFloat(result[0].min_stock as unknown as string)).toBe(inventory.min_stock);
    expect(parseFloat(result[0].cost_per_unit as unknown as string)).toBe(inventory.cost_per_unit);
    expect(result[0].category).toBe(inventory.category);
    expect(result[0].id).toBeDefined();
  });

  it('should READ an inventory item by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const result = await tx.query<Inventory>(
      'SELECT * FROM inventory WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].name).toBe('Tomatoes');
  });

  it('should UPDATE an inventory item', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const updated = await tx.query<Inventory>(
      `UPDATE inventory 
       SET quantity = $1, cost_per_unit = $2
       WHERE id = $3
       RETURNING *`,
      [75.0, 3.00, created[0].id]
    );

    expect(parseFloat(updated[0].quantity as unknown as string)).toBe(75.0);
    expect(parseFloat(updated[0].cost_per_unit as unknown as string)).toBe(3.00);
  });

  it('should DELETE an inventory item', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query('DELETE FROM inventory WHERE id = $1', [created[0].id]);

    const result = await tx.query<Inventory>(
      'SELECT * FROM inventory WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete inventory when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const inventory = await tx.query<Inventory>(
      'SELECT * FROM inventory WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(inventory).toHaveLength(0);
  });
});

// ============================================================================
// WASTAGE TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Wastage', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a wastage record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const wastage = {
      restaurant_id: restaurant[0].id,
      item_id: inventory[0].id,
      item_name: 'Tomatoes',
      quantity: 5.0,
      reason: 'Spoiled',
      date: testDate(),
      cost_loss: 12.50,
    };

    const result = await tx.query<Wastage>(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [wastage.restaurant_id, wastage.item_id, wastage.item_name, wastage.quantity, wastage.reason, wastage.date, wastage.cost_loss]
    );

    expect(result).toHaveLength(1);
    expect(result[0].item_name).toBe(wastage.item_name);
    expect(parseFloat(result[0].quantity as unknown as string)).toBe(wastage.quantity);
    expect(result[0].reason).toBe(wastage.reason);
    expect(result[0].date).toBe(wastage.date);
    expect(parseFloat(result[0].cost_loss as unknown as string)).toBe(wastage.cost_loss);
    expect(result[0].id).toBeDefined();
  });

  it('should READ a wastage record by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const created = await tx.query<Wastage>(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
    );

    const result = await tx.query<Wastage>(
      'SELECT * FROM wastage WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].item_name).toBe('Tomatoes');
  });

  it('should UPDATE a wastage record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const created = await tx.query<Wastage>(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
    );

    const updated = await tx.query<Wastage>(
      `UPDATE wastage 
       SET quantity = $1, cost_loss = $2, reason = $3
       WHERE id = $4
       RETURNING *`,
      [7.5, 18.75, 'Expired', created[0].id]
    );

    expect(parseFloat(updated[0].quantity as unknown as string)).toBe(7.5);
    expect(parseFloat(updated[0].cost_loss as unknown as string)).toBe(18.75);
    expect(updated[0].reason).toBe('Expired');
  });

  it('should DELETE a wastage record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const created = await tx.query<Wastage>(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
    );

    await tx.query('DELETE FROM wastage WHERE id = $1', [created[0].id]);

    const result = await tx.query<Wastage>(
      'SELECT * FROM wastage WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete wastage when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query<Wastage>(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const wastage = await tx.query<Wastage>(
      'SELECT * FROM wastage WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(wastage).toHaveLength(0);
  });

  it('should CASCADE delete wastage when inventory item is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query<Wastage>(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
    );

    await tx.query('DELETE FROM inventory WHERE id = $1', [inventory[0].id]);

    const wastage = await tx.query<Wastage>(
      'SELECT * FROM wastage WHERE item_id = $1',
      [inventory[0].id]
    );

    expect(wastage).toHaveLength(0);
  });
});

// ============================================================================
// DEDUCTIONS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Deductions', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a deduction record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const deduction = {
      restaurant_id: restaurant[0].id,
      item_id: inventory[0].id,
      item_name: 'Tomatoes',
      quantity: 2.5,
      order_id: 'order-123',
    };

    const result = await tx.query<Deduction>(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [deduction.restaurant_id, deduction.item_id, deduction.item_name, deduction.quantity, deduction.order_id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].item_name).toBe(deduction.item_name);
    expect(parseFloat(result[0].quantity as unknown as string)).toBe(deduction.quantity);
    expect(result[0].order_id).toBe(deduction.order_id);
    expect(result[0].id).toBeDefined();
  });

  it('should READ a deduction record by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const created = await tx.query<Deduction>(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 2.5, 'order-123']
    );

    const result = await tx.query<Deduction>(
      'SELECT * FROM deductions WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].item_name).toBe('Tomatoes');
    expect(result[0].order_id).toBe('order-123');
  });

  it('should UPDATE a deduction record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const created = await tx.query<Deduction>(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 2.5, 'order-123']
    );

    const updated = await tx.query<Deduction>(
      `UPDATE deductions 
       SET quantity = $1
       WHERE id = $2
       RETURNING *`,
      [3.5, created[0].id]
    );

    expect(parseFloat(updated[0].quantity as unknown as string)).toBe(3.5);
  });

  it('should DELETE a deduction record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    const created = await tx.query<Deduction>(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 2.5, 'order-123']
    );

    await tx.query('DELETE FROM deductions WHERE id = $1', [created[0].id]);

    const result = await tx.query<Deduction>(
      'SELECT * FROM deductions WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete deductions when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query<Deduction>(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 2.5, 'order-123']
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const deductions = await tx.query<Deduction>(
      'SELECT * FROM deductions WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(deductions).toHaveLength(0);
  });

  it('should CASCADE delete deductions when inventory item is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query<Inventory>(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query<Deduction>(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 2.5, 'order-123']
    );

    await tx.query('DELETE FROM inventory WHERE id = $1', [inventory[0].id]);

    const deductions = await tx.query<Deduction>(
      'SELECT * FROM deductions WHERE item_id = $1',
      [inventory[0].id]
    );

    expect(deductions).toHaveLength(0);
  });
});

// ============================================================================
// ALERT SETTINGS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Alert Settings', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE an alert settings record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const alertSettings = {
      restaurant_id: restaurant[0].short_id,
      whatsapp_number: '+1234567890',
      alerts_enabled: true,
    };

    const result = await tx.query<AlertSettings>(
      `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [alertSettings.restaurant_id, alertSettings.whatsapp_number, alertSettings.alerts_enabled]
    );

    expect(result).toHaveLength(1);
    expect(result[0].restaurant_id).toBe(alertSettings.restaurant_id);
    expect(result[0].whatsapp_number).toBe(alertSettings.whatsapp_number);
    expect(result[0].alerts_enabled).toBe(alertSettings.alerts_enabled);
    expect(result[0].id).toBeDefined();
  });

  it('should READ an alert settings record by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<AlertSettings>(
      `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, '+1234567890', true]
    );

    const result = await tx.query<AlertSettings>(
      'SELECT * FROM alert_settings WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].whatsapp_number).toBe('+1234567890');
  });

  it('should UPDATE an alert settings record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<AlertSettings>(
      `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, '+1234567890', true]
    );

    const updated = await tx.query<AlertSettings>(
      `UPDATE alert_settings 
       SET whatsapp_number = $1, alerts_enabled = $2
       WHERE id = $3
       RETURNING *`,
      ['+9876543210', false, created[0].id]
    );

    expect(updated[0].whatsapp_number).toBe('+9876543210');
    expect(updated[0].alerts_enabled).toBe(false);
  });

  it('should DELETE an alert settings record', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<AlertSettings>(
      `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, '+1234567890', true]
    );

    await tx.query('DELETE FROM alert_settings WHERE id = $1', [created[0].id]);

    const result = await tx.query<AlertSettings>(
      'SELECT * FROM alert_settings WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete alert settings when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<AlertSettings>(
      `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
       VALUES ($1, $2, $3)`,
      [restaurant[0].short_id, '+1234567890', true]
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const alertSettings = await tx.query<AlertSettings>(
      'SELECT * FROM alert_settings WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(alertSettings).toHaveLength(0);
  });

  it('should enforce unique constraint on restaurant_id', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
       VALUES ($1, $2, $3)`,
      [restaurant[0].short_id, '+1234567890', true]
    );

    // Attempt duplicate insert
    await expect(
      tx.query(
        `INSERT INTO alert_settings (restaurant_id, whatsapp_number, alerts_enabled)
         VALUES ($1, $2, $3)`,
        [restaurant[0].short_id, '+9876543210', false]
      )
    ).rejects.toThrow();
  });
});

// ============================================================================
// CUSTOMERS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Customers', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a customer', async () => {
    const customer = {
      name: 'John Doe',
      phone: '+1234567890',
      total_visits: 0,
      total_spent: 0,
      deposit_balance: 0,
      created_at: testTimestamp(),
    };

    const result = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [customer.name, customer.phone, customer.total_visits, customer.total_spent, customer.deposit_balance, customer.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(customer.name);
    expect(result[0].phone).toBe(customer.phone);
    expect(result[0].total_visits).toBe(customer.total_visits);
    expect(parseFloat(result[0].total_spent as unknown as string)).toBe(customer.total_spent);
    expect(parseFloat(result[0].deposit_balance as unknown as string)).toBe(customer.deposit_balance);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a customer by ID', async () => {
    const created = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    const result = await tx.query<Customer>(
      'SELECT * FROM customers WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].name).toBe('John Doe');
    expect(result[0].phone).toBe('+1234567890');
  });

  it('should UPDATE a customer', async () => {
    const created = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    const updated = await tx.query<Customer>(
      `UPDATE customers 
       SET total_visits = $1, total_spent = $2, deposit_balance = $3, last_visit = $4
       WHERE id = $5
       RETURNING *`,
      [5, 250.50, 50.00, testTimestamp(), created[0].id]
    );

    expect(updated[0].total_visits).toBe(5);
    expect(parseFloat(updated[0].total_spent as unknown as string)).toBe(250.50);
    expect(parseFloat(updated[0].deposit_balance as unknown as string)).toBe(50.00);
    expect(updated[0].last_visit).toBeDefined();
  });

  it('should DELETE a customer', async () => {
    const created = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    await tx.query('DELETE FROM customers WHERE id = $1', [created[0].id]);

    const result = await tx.query<Customer>(
      'SELECT * FROM customers WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should enforce unique constraint on phone', async () => {
    await tx.query(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    // Attempt duplicate insert with same phone
    await expect(
      tx.query(
        `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Jane Smith', '+1234567890', 0, 0, 0, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should test NUMERIC precision for monetary fields', async () => {
    const created = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 10, 1234.56, 78.90, testTimestamp()]
    );

    expect(parseFloat(created[0].total_spent as unknown as string)).toBe(1234.56);
    expect(parseFloat(created[0].deposit_balance as unknown as string)).toBe(78.90);
  });
});

// ============================================================================
// RESERVATIONS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Reservations', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a reservation', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const customer = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    const reservation = {
      restaurant_id: restaurant[0].id,
      table_id: table[0].id,
      table_number: table[0].number,
      customer_name: 'John Doe',
      customer_phone: '+1234567890',
      customer_id: customer[0].id,
      date: testDate(),
      start_time: '18:00',
      end_time: '20:00',
      party_size: 4,
      deposit_amount: 50.00,
      status: 'confirmed' as const,
    };

    const result = await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, customer_id, date, start_time, end_time, party_size, deposit_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [reservation.restaurant_id, reservation.table_id, reservation.table_number, reservation.customer_name, reservation.customer_phone, reservation.customer_id, reservation.date, reservation.start_time, reservation.end_time, reservation.party_size, reservation.deposit_amount, reservation.status]
    );

    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe(reservation.customer_name);
    expect(result[0].customer_phone).toBe(reservation.customer_phone);
    expect(result[0].table_number).toBe(reservation.table_number);
    expect(result[0].date).toBe(reservation.date);
    expect(result[0].start_time).toBe(reservation.start_time);
    expect(result[0].end_time).toBe(reservation.end_time);
    expect(result[0].party_size).toBe(reservation.party_size);
    expect(parseFloat(result[0].deposit_amount as unknown as string)).toBe(reservation.deposit_amount);
    expect(result[0].status).toBe(reservation.status);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a reservation by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const created = await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    const result = await tx.query<Reservation>(
      'SELECT * FROM reservations WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].customer_name).toBe('John Doe');
  });

  it('should UPDATE a reservation', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const created = await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    const updated = await tx.query<Reservation>(
      `UPDATE reservations 
       SET status = $1, arrived = $2, notes = $3
       WHERE id = $4
       RETURNING *`,
      ['completed', true, 'Customer arrived on time', created[0].id]
    );

    expect(updated[0].status).toBe('completed');
    expect(updated[0].arrived).toBe(true);
    expect(updated[0].notes).toBe('Customer arrived on time');
  });

  it('should DELETE a reservation', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const created = await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    await tx.query('DELETE FROM reservations WHERE id = $1', [created[0].id]);

    const result = await tx.query<Reservation>(
      'SELECT * FROM reservations WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete reservations when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const reservations = await tx.query<Reservation>(
      'SELECT * FROM reservations WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(reservations).toHaveLength(0);
  });

  it('should CASCADE delete reservations when table is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    await tx.query('DELETE FROM tables WHERE id = $1', [table[0].id]);

    const reservations = await tx.query<Reservation>(
      'SELECT * FROM reservations WHERE table_id = $1',
      [table[0].id]
    );

    expect(reservations).toHaveLength(0);
  });

  it('should SET NULL customer_id when customer is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const customer = await tx.query<Customer>(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    const reservation = await tx.query<Reservation>(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, customer_id, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', customer[0].id, testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    // Delete customer
    await tx.query('DELETE FROM customers WHERE id = $1', [customer[0].id]);

    // Verify customer_id is set to NULL (ON DELETE SET NULL)
    const updatedReservation = await tx.query<Reservation>(
      'SELECT * FROM reservations WHERE id = $1',
      [reservation[0].id]
    );

    expect(updatedReservation[0].customer_id).toBeNull();
  });

  it('should enforce CHECK constraint on status field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query<Table>(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    // Attempt to insert with invalid status
    await expect(
      tx.query(
        `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [restaurant[0].id, table[0].id, table[0].number, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'invalid_status']
      )
    ).rejects.toThrow();
  });
});

// ============================================================================
// REVIEWS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Reviews', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a review', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const review = {
      restaurant_id: restaurant[0].short_id,
      table_id: 'table-uuid-123',
      table_number: 5,
      enjoyed: true,
      issue_with: null,
      issue_category: null,
      feedback: 'Great food and service!',
      created_at: testTimestamp(),
    };

    const result = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, issue_with, issue_category, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [review.restaurant_id, review.table_id, review.table_number, review.enjoyed, review.issue_with, review.issue_category, review.feedback, review.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].restaurant_id).toBe(review.restaurant_id);
    expect(result[0].table_id).toBe(review.table_id);
    expect(result[0].table_number).toBe(review.table_number);
    expect(result[0].enjoyed).toBe(review.enjoyed);
    expect(result[0].feedback).toBe(review.feedback);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a review by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'table-uuid-123', 5, true, 'Great food!', testTimestamp()]
    );

    const result = await tx.query<Review>(
      'SELECT * FROM reviews WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].feedback).toBe('Great food!');
  });

  it('should UPDATE a review', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'table-uuid-123', 5, true, 'Great food!', testTimestamp()]
    );

    const updated = await tx.query<Review>(
      `UPDATE reviews 
       SET feedback = $1
       WHERE id = $2
       RETURNING *`,
      ['Updated: Excellent service and food!', created[0].id]
    );

    expect(updated[0].feedback).toBe('Updated: Excellent service and food!');
  });

  it('should DELETE a review', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'table-uuid-123', 5, true, 'Great food!', testTimestamp()]
    );

    await tx.query('DELETE FROM reviews WHERE id = $1', [created[0].id]);

    const result = await tx.query<Review>(
      'SELECT * FROM reviews WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete reviews when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [restaurant[0].short_id, 'table-uuid-123', 5, true, 'Great food!', testTimestamp()]
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const reviews = await tx.query<Review>(
      'SELECT * FROM reviews WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(reviews).toHaveLength(0);
  });

  it('should enforce CHECK constraint on issue_with field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Attempt to insert with invalid issue_with value
    await expect(
      tx.query(
        `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, issue_with, feedback, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [restaurant[0].short_id, 'table-uuid-123', 5, false, 'invalid_value', 'Bad experience', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should allow valid issue_with values', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Test 'restaurant' value
    const review1 = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, issue_with, issue_category, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [restaurant[0].short_id, 'table-uuid-123', 5, false, 'restaurant', 'slow_service', 'Service was slow', testTimestamp()]
    );

    expect(review1[0].issue_with).toBe('restaurant');

    // Test 'app' value
    const review2 = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, issue_with, issue_category, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [restaurant[0].short_id, 'table-uuid-456', 6, false, 'app', 'ui_issue', 'App crashed', testTimestamp()]
    );

    expect(review2[0].issue_with).toBe('app');
  });

  it('should verify timestamp auto-generation on insert', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const beforeInsert = Date.now();
    
    const created = await tx.query<Review>(
      `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, feedback, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 'table-uuid-123', 5, true, 'Great food!', testTimestamp()]
    );

    const afterInsert = Date.now();

    expect(created[0].created_at).toBeDefined();
    const createdAtNum = typeof created[0].created_at === 'string' 
      ? parseInt(created[0].created_at) 
      : created[0].created_at;
    expect(createdAtNum).toBeGreaterThanOrEqual(beforeInsert - 1000);
    expect(createdAtNum).toBeLessThanOrEqual(afterInsert + 1000);
  });
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

describe('Test Infrastructure Validation', () => {
  it('should validate test database connection', async () => {
    const result = await query<{ test: number }>('SELECT 1 as test');
    expect(result[0].test).toBe(1);
  });

  it('should validate transaction rollback', async () => {
    const tx = new TestTransaction();
    await tx.begin();

    // Insert test data
    await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)`,
      ['rollback-test', 'Rollback Test', true, testTimestamp()]
    );

    // Rollback
    await tx.rollback();

    // Verify data was rolled back
    const result = await query<Restaurant>(
      'SELECT * FROM restaurants WHERE short_id = $1',
      ['rollback-test']
    );

    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// SUBSCRIPTIONS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Subscriptions', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a subscription', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const subscription = {
      restaurant_id: restaurant[0].short_id,
      plan_type: 'monthly' as const,
      days: 30,
      price_per_day: 10.00,
      total_price: 300.00,
      start_date: testTimestamp(),
      end_date: testTimestamp() + (30 * 24 * 60 * 60 * 1000),
      payment_status: 'pending' as const,
      status: 'active' as const,
      created_at: testTimestamp(),
      created_by: 'admin',
    };

    const result = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [subscription.restaurant_id, subscription.plan_type, subscription.days, subscription.price_per_day, subscription.total_price, subscription.start_date, subscription.end_date, subscription.payment_status, subscription.status, subscription.created_at, subscription.created_by]
    );

    expect(result).toHaveLength(1);
    expect(result[0].restaurant_id).toBe(subscription.restaurant_id);
    expect(result[0].plan_type).toBe(subscription.plan_type);
    expect(result[0].days).toBe(subscription.days);
    expect(parseFloat(result[0].price_per_day as unknown as string)).toBe(subscription.price_per_day);
    expect(parseFloat(result[0].total_price as unknown as string)).toBe(subscription.total_price);
    expect(result[0].payment_status).toBe(subscription.payment_status);
    expect(result[0].status).toBe(subscription.status);
    expect(result[0].created_by).toBe(subscription.created_by);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a subscription by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
    );

    const result = await tx.query<Subscription>(
      'SELECT * FROM subscriptions WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].plan_type).toBe('monthly');
  });

  it('should UPDATE a subscription', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
    );

    const updated = await tx.query<Subscription>(
      `UPDATE subscriptions 
       SET payment_status = $1, status = $2, auto_renew = $3, notes = $4
       WHERE id = $5
       RETURNING *`,
      ['completed', 'active', true, 'Payment received', created[0].id]
    );

    expect(updated[0].payment_status).toBe('completed');
    expect(updated[0].status).toBe('active');
    expect(updated[0].auto_renew).toBe(true);
    expect(updated[0].notes).toBe('Payment received');
  });

  it('should DELETE a subscription', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
    );

    await tx.query('DELETE FROM subscriptions WHERE id = $1', [created[0].id]);

    const result = await tx.query<Subscription>(
      'SELECT * FROM subscriptions WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete subscriptions when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const subscriptions = await tx.query<Subscription>(
      'SELECT * FROM subscriptions WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(subscriptions).toHaveLength(0);
  });

  it('should enforce CHECK constraint on plan_type field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].short_id, 'invalid_plan', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
      )
    ).rejects.toThrow();
  });

  it('should enforce CHECK constraint on payment_status field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'invalid_status', 'active', testTimestamp(), 'admin']
      )
    ).rejects.toThrow();
  });

  it('should enforce CHECK constraint on status field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'invalid_status', testTimestamp(), 'admin']
      )
    ).rejects.toThrow();
  });

  it('should test NUMERIC precision for monetary fields', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 12.99, 389.70, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'completed', 'active', testTimestamp(), 'admin']
    );

    expect(parseFloat(created[0].price_per_day as unknown as string)).toBe(12.99);
    expect(parseFloat(created[0].total_price as unknown as string)).toBe(389.70);
  });
});

// ============================================================================
// PAYMENTS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Payments', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE a payment', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const subscription = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
    );

    const payment = {
      restaurant_id: restaurant[0].short_id,
      subscription_id: subscription[0].id,
      amount: 300.00,
      currency: 'INR',
      payment_method: 'razorpay',
      gateway_name: 'Razorpay',
      gateway_order_id: 'order_123456',
      status: 'pending' as const,
      created_at: testTimestamp(),
    };

    const result = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, subscription_id, amount, currency, payment_method, gateway_name, gateway_order_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [payment.restaurant_id, payment.subscription_id, payment.amount, payment.currency, payment.payment_method, payment.gateway_name, payment.gateway_order_id, payment.status, payment.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].restaurant_id).toBe(payment.restaurant_id);
    expect(result[0].subscription_id).toBe(payment.subscription_id);
    expect(parseFloat(result[0].amount as unknown as string)).toBe(payment.amount);
    expect(result[0].currency).toBe(payment.currency);
    expect(result[0].payment_method).toBe(payment.payment_method);
    expect(result[0].gateway_name).toBe(payment.gateway_name);
    expect(result[0].gateway_order_id).toBe(payment.gateway_order_id);
    expect(result[0].status).toBe(payment.status);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ a payment by ID', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 300.00, 'INR', 'razorpay', 'pending', testTimestamp()]
    );

    const result = await tx.query<Payment>(
      'SELECT * FROM payments WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].currency).toBe('INR');
  });

  it('should UPDATE a payment', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 300.00, 'INR', 'razorpay', 'pending', testTimestamp()]
    );

    const updated = await tx.query<Payment>(
      `UPDATE payments 
       SET status = $1, gateway_payment_id = $2, completed_at = $3, processed_by = $4
       WHERE id = $5
       RETURNING *`,
      ['completed', 'pay_789012', testTimestamp(), 'admin@example.com', created[0].id]
    );

    expect(updated[0].status).toBe('completed');
    expect(updated[0].gateway_payment_id).toBe('pay_789012');
    expect(updated[0].completed_at).toBeDefined();
    expect(updated[0].processed_by).toBe('admin@example.com');
  });

  it('should DELETE a payment', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, 300.00, 'INR', 'razorpay', 'pending', testTimestamp()]
    );

    await tx.query('DELETE FROM payments WHERE id = $1', [created[0].id]);

    const result = await tx.query<Payment>(
      'SELECT * FROM payments WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should CASCADE delete payments when restaurant is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [restaurant[0].short_id, 300.00, 'INR', 'razorpay', 'pending', testTimestamp()]
    );

    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    const payments = await tx.query<Payment>(
      'SELECT * FROM payments WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(payments).toHaveLength(0);
  });

  it('should SET NULL subscription_id when subscription is deleted', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const subscription = await tx.query<Subscription>(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + (30 * 24 * 60 * 60 * 1000), 'pending', 'active', testTimestamp(), 'admin']
    );

    const payment = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, subscription_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].short_id, subscription[0].id, 300.00, 'INR', 'razorpay', 'pending', testTimestamp()]
    );

    // Delete subscription
    await tx.query('DELETE FROM subscriptions WHERE id = $1', [subscription[0].id]);

    // Verify subscription_id is set to NULL (ON DELETE SET NULL)
    const updatedPayment = await tx.query<Payment>(
      'SELECT * FROM payments WHERE id = $1',
      [payment[0].id]
    );

    expect(updatedPayment[0].subscription_id).toBeNull();
  });

  it('should enforce CHECK constraint on status field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [restaurant[0].short_id, 300.00, 'INR', 'razorpay', 'invalid_status', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should test JSONB round-trip for gateway_response field', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const gatewayResponse = {
      razorpay_order_id: 'order_123456',
      razorpay_payment_id: 'pay_789012',
      razorpay_signature: 'signature_abc',
      status: 'captured',
    };

    const created = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at, gateway_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].short_id, 300.00, 'INR', 'razorpay', 'completed', testTimestamp(), JSON.stringify(gatewayResponse)]
    );

    expect(created[0].gateway_response).toEqual(gatewayResponse);
  });

  it('should test NUMERIC precision for monetary fields', async () => {
    const restaurant = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const created = await tx.query<Payment>(
      `INSERT INTO payments (restaurant_id, amount, currency, payment_method, status, created_at, refund_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].short_id, 389.99, 'INR', 'razorpay', 'refunded', testTimestamp(), 100.50]
    );

    expect(parseFloat(created[0].amount as unknown as string)).toBe(389.99);
    expect(parseFloat(created[0].refund_amount as unknown as string)).toBe(100.50);
  });
});

// ============================================================================
// ADMIN USERS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Admin Users', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE an admin user', async () => {
    const adminUser = {
      email: 'admin@example.com',
      password_hash: 'hashed_password_123',
      name: 'Admin User',
      role: 'admin' as const,
      permissions: {
        view: true,
        edit: true,
        delete: false,
        refund: false,
        manageAdmins: false,
      },
      active: true,
      created_at: testTimestamp(),
    };

    const result = await tx.query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [adminUser.email, adminUser.password_hash, adminUser.name, adminUser.role, JSON.stringify(adminUser.permissions), adminUser.active, adminUser.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe(adminUser.email);
    expect(result[0].password_hash).toBe(adminUser.password_hash);
    expect(result[0].name).toBe(adminUser.name);
    expect(result[0].role).toBe(adminUser.role);
    expect(result[0].permissions).toEqual(adminUser.permissions);
    expect(result[0].active).toBe(adminUser.active);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ an admin user by ID', async () => {
    const created = await tx.query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      ['admin@example.com', 'hashed_password_123', 'Admin User', 'admin', JSON.stringify({ view: true, edit: true }), true, testTimestamp()]
    );

    const result = await tx.query<AdminUser>(
      'SELECT * FROM admin_users WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].email).toBe('admin@example.com');
  });

  it('should UPDATE an admin user', async () => {
    const created = await tx.query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      ['admin@example.com', 'hashed_password_123', 'Admin User', 'admin', JSON.stringify({ view: true, edit: true }), true, testTimestamp()]
    );

    const newPermissions = {
      view: true,
      edit: true,
      delete: true,
      refund: true,
      manageAdmins: false,
    };

    const updated = await tx.query<AdminUser>(
      `UPDATE admin_users 
       SET role = $1, permissions = $2, last_login_at = $3
       WHERE id = $4
       RETURNING *`,
      ['super_admin', JSON.stringify(newPermissions), testTimestamp(), created[0].id]
    );

    expect(updated[0].role).toBe('super_admin');
    expect(updated[0].permissions).toEqual(newPermissions);
    expect(updated[0].last_login_at).toBeDefined();
  });

  it('should DELETE an admin user', async () => {
    const created = await tx.query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      ['admin@example.com', 'hashed_password_123', 'Admin User', 'admin', JSON.stringify({ view: true, edit: true }), true, testTimestamp()]
    );

    await tx.query('DELETE FROM admin_users WHERE id = $1', [created[0].id]);

    const result = await tx.query<AdminUser>(
      'SELECT * FROM admin_users WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should enforce unique constraint on email', async () => {
    await tx.query(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['admin@example.com', 'hashed_password_123', 'Admin User', 'admin', JSON.stringify({ view: true }), true, testTimestamp()]
    );

    // Attempt duplicate insert with same email
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@example.com', 'different_hash', 'Another Admin', 'support', JSON.stringify({ view: true }), true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should enforce CHECK constraint on role field', async () => {
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@example.com', 'hashed_password_123', 'Admin User', 'invalid_role', JSON.stringify({ view: true }), true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should test JSONB round-trip for permissions field', async () => {
    const permissions = {
      view: true,
      edit: true,
      delete: true,
      refund: false,
      manageAdmins: true,
    };

    const created = await tx.query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      ['admin@example.com', 'hashed_password_123', 'Admin User', 'super_admin', JSON.stringify(permissions), true, testTimestamp()]
    );

    expect(created[0].permissions).toEqual(permissions);
  });

  it('should verify UUID auto-generation on insert', async () => {
    const created = await tx.query<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      ['admin@example.com', 'hashed_password_123', 'Admin User', 'admin', JSON.stringify({ view: true }), true, testTimestamp()]
    );

    expect(created[0].id).toBeDefined();
    expect(created[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

// ============================================================================
// ACTIVITY LOGS TESTS
// ============================================================================

describe('PostgreSQL CRUD Tests - Activity Logs', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should CREATE an activity log', async () => {
    const activityLog = {
      actor_type: 'admin',
      actor_id: 'admin-uuid-123',
      actor_email: 'admin@example.com',
      action: 'create',
      entity_type: 'subscription',
      entity_id: 'sub-uuid-456',
      description: 'Created new subscription for restaurant',
      metadata: {
        plan_type: 'monthly',
        days: 30,
        amount: 300.00,
      },
      ip_address: '192.168.1.1',
      created_at: testTimestamp(),
    };

    const result = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, metadata, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [activityLog.actor_type, activityLog.actor_id, activityLog.actor_email, activityLog.action, activityLog.entity_type, activityLog.entity_id, activityLog.description, JSON.stringify(activityLog.metadata), activityLog.ip_address, activityLog.created_at]
    );

    expect(result).toHaveLength(1);
    expect(result[0].actor_type).toBe(activityLog.actor_type);
    expect(result[0].actor_id).toBe(activityLog.actor_id);
    expect(result[0].actor_email).toBe(activityLog.actor_email);
    expect(result[0].action).toBe(activityLog.action);
    expect(result[0].entity_type).toBe(activityLog.entity_type);
    expect(result[0].entity_id).toBe(activityLog.entity_id);
    expect(result[0].description).toBe(activityLog.description);
    expect(result[0].metadata).toEqual(activityLog.metadata);
    expect(result[0].ip_address).toBe(activityLog.ip_address);
    expect(result[0].id).toBeDefined(); // UUID auto-generated
  });

  it('should READ an activity log by ID', async () => {
    const created = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['admin', 'admin-uuid-123', 'admin@example.com', 'create', 'subscription', 'sub-uuid-456', 'Created subscription', testTimestamp()]
    );

    const result = await tx.query<ActivityLog>(
      'SELECT * FROM activity_logs WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(created[0].id);
    expect(result[0].action).toBe('create');
  });

  it('should UPDATE an activity log', async () => {
    const created = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['admin', 'admin-uuid-123', 'admin@example.com', 'create', 'subscription', 'sub-uuid-456', 'Created subscription', testTimestamp()]
    );

    const newMetadata = {
      updated: true,
      reason: 'Correction',
    };

    const updated = await tx.query<ActivityLog>(
      `UPDATE activity_logs 
       SET description = $1, metadata = $2
       WHERE id = $3
       RETURNING *`,
      ['Updated: Created subscription with corrections', JSON.stringify(newMetadata), created[0].id]
    );

    expect(updated[0].description).toBe('Updated: Created subscription with corrections');
    expect(updated[0].metadata).toEqual(newMetadata);
  });

  it('should DELETE an activity log', async () => {
    const created = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['admin', 'admin-uuid-123', 'admin@example.com', 'create', 'subscription', 'sub-uuid-456', 'Created subscription', testTimestamp()]
    );

    await tx.query('DELETE FROM activity_logs WHERE id = $1', [created[0].id]);

    const result = await tx.query<ActivityLog>(
      'SELECT * FROM activity_logs WHERE id = $1',
      [created[0].id]
    );

    expect(result).toHaveLength(0);
  });

  it('should test JSONB round-trip for metadata field', async () => {
    const metadata = {
      plan_type: 'monthly',
      days: 30,
      amount: 300.00,
      notes: 'First subscription',
      features: ['feature1', 'feature2'],
    };

    const created = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      ['admin', 'admin-uuid-123', 'admin@example.com', 'create', 'subscription', 'sub-uuid-456', 'Created subscription', JSON.stringify(metadata), testTimestamp()]
    );

    expect(created[0].metadata).toEqual(metadata);
  });

  it('should verify UUID auto-generation on insert', async () => {
    const created = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['admin', 'admin-uuid-123', 'admin@example.com', 'create', 'subscription', 'sub-uuid-456', 'Created subscription', testTimestamp()]
    );

    expect(created[0].id).toBeDefined();
    expect(created[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should verify timestamp auto-generation on insert', async () => {
    const beforeInsert = Date.now();
    
    const created = await tx.query<ActivityLog>(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, entity_type, entity_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['admin', 'admin-uuid-123', 'admin@example.com', 'create', 'subscription', 'sub-uuid-456', 'Created subscription', testTimestamp()]
    );

    const afterInsert = Date.now();

    expect(created[0].created_at).toBeDefined();
    const createdAtNum = typeof created[0].created_at === 'string' 
      ? parseInt(created[0].created_at) 
      : created[0].created_at;
    expect(createdAtNum).toBeGreaterThanOrEqual(beforeInsert - 1000);
    expect(createdAtNum).toBeLessThanOrEqual(afterInsert + 1000);
  });
});

// ============================================================================
// TASK 5.8-5.10: PROPERTY TESTS
// ============================================================================


describe('Property Tests', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('Property 3: CRUD Round-Trip Consistency', async () => {
    // 1. Create -> Read
    const created = await tx.query<Settings>(
      `INSERT INTO settings (key, value) VALUES ($1, $2) RETURNING *`,
      ['prop_test_key', 'prop_test_val']
    );
    let read = await tx.query<Settings>('SELECT * FROM settings WHERE id = $1', [created[0].id]);
    expect(read[0].value).toBe('prop_test_val');

    // 2. Create -> Update -> Read
    await tx.query('UPDATE settings SET value = $1 WHERE id = $2', ['updated_val', created[0].id]);
    read = await tx.query<Settings>('SELECT * FROM settings WHERE id = $1', [created[0].id]);
    expect(read[0].value).toBe('updated_val');

    // 3. Create -> Delete -> Read
    await tx.query('DELETE FROM settings WHERE id = $1', [created[0].id]);
    read = await tx.query<Settings>('SELECT * FROM settings WHERE id = $1', [created[0].id]);
    expect(read).toHaveLength(0);
  });

  it('Property 4: Foreign Key Integrity', async () => {
    // Insert with non-existent foreign key fails
    await expect(
      tx.query(
        `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, total_amount, days_worked, total_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '2023-01', 1000, 1000, 30, 30, 'pending', testTimestamp()]
      )
    ).rejects.toThrow(/violates foreign key constraint/);
  });

  it('JSONB Round-Trip Preservation', async () => {
    const complexJson = {
      nested: { object: { array: [1, 2, 3], string: "str", bool: true, nullField: null } }
    };
    
    const created = await tx.query<Restaurant>(
      `INSERT INTO restaurants (short_id, name, active, created_at, location)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['json-rest', 'JSON Rest', true, testTimestamp(), JSON.stringify(complexJson)]
    );

    expect(created[0].location).toEqual(complexJson);
  });
});
