/**
 * PostgreSQL Constraint Validation Test Suite
 * ──────────────────────────────────────────────────────────────
 * Tests for database constraints: foreign keys, CHECK, unique, NOT NULL
 * 
 * Requirements: 6.6-6.9
 * - Test foreign key constraints by attempting invalid inserts
 * - Test CHECK constraints by attempting invalid enum values
 * - Test unique constraints by attempting duplicate inserts
 * - Test NOT NULL constraints by attempting null inserts
 * - Test cascade deletes for parent-child relationships
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { query, getClient } from '../config/database';
import type { PoolClient } from 'pg';

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
    console.log('✓ Test database connection established for constraint tests');
  } catch (error) {
    console.error('✗ Failed to connect to test database:', error);
    throw error;
  }
});

/**
 * Cleanup after all tests complete
 */
afterAll(async () => {
  console.log('✓ All constraint validation tests completed');
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

// ============================================================================
// FOREIGN KEY CONSTRAINT TESTS
// ============================================================================

describe('Constraint Validation - Foreign Key Constraints', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should reject menu_item insert with non-existent restaurant_id', async () => {
    // Attempt to insert menu item with invalid restaurant_id
    await expect(
      tx.query(
        `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['non-existent-restaurant', 'Pizza', 12.99, 'Main', 'Delicious pizza', true]
      )
    ).rejects.toThrow();
  });

  it('should reject category insert with non-existent restaurant_id', async () => {
    await expect(
      tx.query(
        `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        ['non-existent-restaurant', 'Appetizers', 'icon', 1, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject table insert with non-existent zone_id', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    // Attempt to insert table with invalid zone_id
    await expect(
      tx.query(
        `INSERT INTO tables (restaurant_id, name, number, capacity, zone_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [restaurant[0].short_id, 'Table A1', 1, 4, '00000000-0000-0000-0000-000000000000']
      )
    ).rejects.toThrow();
  });

  it('should reject payroll insert with non-existent staff_id', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].id, '00000000-0000-0000-0000-000000000000', '2024-01', 3000, 500, 200, 3300, 26, 31, 'pending', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject wastage insert with non-existent item_id', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [restaurant[0].id, '00000000-0000-0000-0000-000000000000', 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
      )
    ).rejects.toThrow();
  });

  it('should reject reservation insert with non-existent table_id', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [restaurant[0].id, '00000000-0000-0000-0000-000000000000', 1, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
      )
    ).rejects.toThrow();
  });

  it('should reject payment insert with non-existent subscription_id', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO payments (restaurant_id, subscription_id, amount, currency, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [restaurant[0].short_id, '00000000-0000-0000-0000-000000000000', 300.00, 'USD', 'pending', testTimestamp()]
      )
    ).rejects.toThrow();
  });
});

// ============================================================================
// CHECK CONSTRAINT TESTS
// ============================================================================

describe('Constraint Validation - CHECK Constraints', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should reject restaurant insert with invalid status', async () => {
    await expect(
      tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['test-rest', 'Test Restaurant', true, testTimestamp(), 'invalid_status']
      )
    ).rejects.toThrow();
  });

  it('should accept restaurant insert with valid status values', async () => {
    const validStatuses = ['trial', 'active', 'expired', 'blocked'];
    
    for (const status of validStatuses) {
      const result = await tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [`test-rest-${status}`, 'Test Restaurant', true, testTimestamp(), status]
      );
      expect(result[0].status).toBe(status);
    }
  });

  it('should reject payroll insert with invalid status', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await expect(
      tx.query(
        `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].id, staff[0].id, '2024-01', 3000, 500, 200, 3300, 26, 31, 'invalid_status', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should accept payroll insert with valid status values', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    const validStatuses = ['pending', 'paid', 'cancelled'];
    
    for (const status of validStatuses) {
      const result = await tx.query(
        `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [restaurant[0].id, staff[0].id, `2024-${status}`, 3000, 500, 200, 3300, 26, 31, status, testTimestamp()]
      );
      expect(result[0].status).toBe(status);
    }
  });

  it('should reject reservation insert with invalid status', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    await expect(
      tx.query(
        `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [restaurant[0].id, table[0].id, 1, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'invalid_status']
      )
    ).rejects.toThrow();
  });

  it('should accept reservation insert with valid status values', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const validStatuses = ['confirmed', 'cancelled', 'completed'];
    
    for (const status of validStatuses) {
      const table = await tx.query(
        `INSERT INTO tables (restaurant_id, name, number, capacity)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [restaurant[0].short_id, `Table ${status}`, Math.floor(Math.random() * 1000), 4]
      );

      const result = await tx.query(
        `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [restaurant[0].id, table[0].id, 1, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, status]
      );
      expect(result[0].status).toBe(status);
    }
  });

  it('should reject review insert with invalid issue_with', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, issue_with, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [restaurant[0].short_id, 'table-123', 1, false, 'invalid_value', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should accept review insert with valid issue_with values', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const validValues = ['restaurant', 'app'];
    
    for (const value of validValues) {
      const result = await tx.query(
        `INSERT INTO reviews (restaurant_id, table_id, table_number, enjoyed, issue_with, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [restaurant[0].short_id, `table-${value}`, 1, false, value, testTimestamp()]
      );
      expect(result[0].issue_with).toBe(value);
    }
  });

  it('should reject subscription insert with invalid plan_type', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].short_id, 'invalid_plan', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + 30 * 24 * 60 * 60 * 1000, 'pending', 'active', testTimestamp(), 'system']
      )
    ).rejects.toThrow();
  });

  it('should reject subscription insert with invalid payment_status', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + 30 * 24 * 60 * 60 * 1000, 'invalid_payment_status', 'active', testTimestamp(), 'system']
      )
    ).rejects.toThrow();
  });

  it('should reject subscription insert with invalid status', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + 30 * 24 * 60 * 60 * 1000, 'pending', 'invalid_status', testTimestamp(), 'system']
      )
    ).rejects.toThrow();
  });

  it('should reject payment insert with invalid status', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO payments (restaurant_id, amount, currency, status, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [restaurant[0].short_id, 300.00, 'USD', 'invalid_status', testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should accept payment insert with valid status values', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    
    for (const status of validStatuses) {
      const result = await tx.query(
        `INSERT INTO payments (restaurant_id, amount, currency, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [restaurant[0].short_id, 300.00, 'USD', status, testTimestamp()]
      );
      expect(result[0].status).toBe(status);
    }
  });

  it('should reject admin_users insert with invalid role', async () => {
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@example.com', 'hashed_password', 'Admin User', 'invalid_role', JSON.stringify({view: true}), true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should accept admin_users insert with valid role values', async () => {
    const validRoles = ['super_admin', 'admin', 'support'];
    
    for (const role of validRoles) {
      const result = await tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [`${role}@example.com`, 'hashed_password', 'Admin User', role, JSON.stringify({view: true}), true, testTimestamp()]
      );
      expect(result[0].role).toBe(role);
    }
  });
});

// ============================================================================
// UNIQUE CONSTRAINT TESTS
// ============================================================================

describe('Constraint Validation - Unique Constraints', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should reject duplicate restaurant short_id', async () => {
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

  it('should reject duplicate customer phone', async () => {
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

  it('should reject duplicate alert_settings restaurant_id', async () => {
    const restaurant = await tx.query(
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

  it('should reject duplicate admin_users email', async () => {
    await tx.query(
      `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['admin@example.com', 'hashed_password', 'Admin User', 'admin', JSON.stringify({view: true}), true, testTimestamp()]
    );

    // Attempt duplicate insert with same email
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@example.com', 'another_password', 'Another Admin', 'support', JSON.stringify({view: true}), true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject duplicate settings key', async () => {
    await tx.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)`,
      ['app_name', 'OrderZap']
    );

    // Attempt duplicate insert with same key
    await expect(
      tx.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)`,
        ['app_name', 'Different Name']
      )
    ).rejects.toThrow();
  });
});

// ============================================================================
// NOT NULL CONSTRAINT TESTS
// ============================================================================

describe('Constraint Validation - NOT NULL Constraints', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should reject restaurant insert with null short_id', async () => {
    await expect(
      tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at)
         VALUES ($1, $2, $3, $4)`,
        [null, 'Test Restaurant', true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject restaurant insert with null name', async () => {
    await expect(
      tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at)
         VALUES ($1, $2, $3, $4)`,
        ['test-rest', null, true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject restaurant insert with null active', async () => {
    await expect(
      tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at)
         VALUES ($1, $2, $3, $4)`,
        ['test-rest', 'Test Restaurant', null, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject restaurant insert with null created_at', async () => {
    await expect(
      tx.query(
        `INSERT INTO restaurants (short_id, name, active, created_at)
         VALUES ($1, $2, $3, $4)`,
        ['test-rest', 'Test Restaurant', true, null]
      )
    ).rejects.toThrow();
  });

  it('should reject menu_item insert with null name', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [restaurant[0].short_id, null, 12.99, 'Main', 'Description', true]
      )
    ).rejects.toThrow();
  });

  it('should reject menu_item insert with null price', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await expect(
      tx.query(
        `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [restaurant[0].short_id, 'Pizza', null, 'Main', 'Description', true]
      )
    ).rejects.toThrow();
  });

  it('should reject customer insert with null name', async () => {
    await expect(
      tx.query(
        `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [null, '+1234567890', 0, 0, 0, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject customer insert with null phone', async () => {
    await expect(
      tx.query(
        `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['John Doe', null, 0, 0, 0, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject payroll insert with null status', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await expect(
      tx.query(
        `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [restaurant[0].id, staff[0].id, '2024-01', 3000, 500, 200, 3300, 26, 31, null, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject admin_users insert with null email', async () => {
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [null, 'hashed_password', 'Admin User', 'admin', JSON.stringify({view: true}), true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject admin_users insert with null password_hash', async () => {
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@example.com', null, 'Admin User', 'admin', JSON.stringify({view: true}), true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should reject admin_users insert with null permissions', async () => {
    await expect(
      tx.query(
        `INSERT INTO admin_users (email, password_hash, name, role, permissions, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@example.com', 'hashed_password', 'Admin User', 'admin', null, true, testTimestamp()]
      )
    ).rejects.toThrow();
  });

  it('should accept restaurant insert with null optional fields', async () => {
    const result = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at, description, address, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp(), null, null, null, null]
    );

    expect(result[0].description).toBeNull();
    expect(result[0].address).toBeNull();
    expect(result[0].phone).toBeNull();
    expect(result[0].email).toBeNull();
  });
});

// ============================================================================
// CASCADE DELETE TESTS
// ============================================================================

describe('Constraint Validation - Cascade Deletes', () => {
  let tx: TestTransaction;

  beforeEach(async () => {
    tx = new TestTransaction();
    await tx.begin();
  });

  afterEach(async () => {
    await tx.rollback();
  });

  it('should cascade delete menu_items when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO menu_items (restaurant_id, name, price, category, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [restaurant[0].short_id, 'Pizza', 12.99, 'Main', 'Delicious pizza', true]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify menu items were cascade deleted
    const menuItems = await tx.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(menuItems).toHaveLength(0);
  });

  it('should cascade delete categories when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO categories (restaurant_id, name, icon, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [restaurant[0].short_id, 'Appetizers', 'icon', 1, testTimestamp()]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify categories were cascade deleted
    const categories = await tx.query(
      'SELECT * FROM categories WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(categories).toHaveLength(0);
  });

  it('should cascade delete tables when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify tables were cascade deleted
    const tables = await tx.query(
      'SELECT * FROM tables WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(tables).toHaveLength(0);
  });

  it('should cascade delete zones when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify zones were cascade deleted
    const zones = await tx.query(
      'SELECT * FROM zones WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(zones).toHaveLength(0);
  });

  it('should cascade delete payroll when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await tx.query(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000, 500, 200, 3300, 26, 31, 'pending', testTimestamp()]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify payroll records were cascade deleted
    const payroll = await tx.query(
      'SELECT * FROM payroll WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(payroll).toHaveLength(0);
  });

  it('should cascade delete payroll when staff is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const staff = await tx.query(
      `INSERT INTO staff (restaurant_id, name, role, phone, email, assigned_tables, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'John Doe', 'Waiter', '+1234567890', 'john@example.com', JSON.stringify([1, 2, 3]), true]
    );

    await tx.query(
      `INSERT INTO payroll (restaurant_id, staff_id, month, base_salary, bonus, deductions, total_amount, days_worked, total_days, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [restaurant[0].id, staff[0].id, '2024-01', 3000, 500, 200, 3300, 26, 31, 'pending', testTimestamp()]
    );

    // Delete staff
    await tx.query('DELETE FROM staff WHERE id = $1', [staff[0].id]);

    // Verify payroll records were cascade deleted
    const payroll = await tx.query(
      'SELECT * FROM payroll WHERE staff_id = $1',
      [staff[0].id]
    );

    expect(payroll).toHaveLength(0);
  });

  it('should cascade delete inventory when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify inventory was cascade deleted
    const inventory = await tx.query(
      'SELECT * FROM inventory WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(inventory).toHaveLength(0);
  });

  it('should cascade delete wastage when inventory item is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query(
      `INSERT INTO wastage (restaurant_id, item_id, item_name, quantity, reason, date, cost_loss)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 5.0, 'Spoiled', testDate(), 12.50]
    );

    // Delete inventory item
    await tx.query('DELETE FROM inventory WHERE id = $1', [inventory[0].id]);

    // Verify wastage was cascade deleted
    const wastage = await tx.query(
      'SELECT * FROM wastage WHERE item_id = $1',
      [inventory[0].id]
    );

    expect(wastage).toHaveLength(0);
  });

  it('should cascade delete deductions when inventory item is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const inventory = await tx.query(
      `INSERT INTO inventory (restaurant_id, name, unit, quantity, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [restaurant[0].id, 'Tomatoes', 'kg', 50.5, 10.0, 2.50, 'Vegetables']
    );

    await tx.query(
      `INSERT INTO deductions (restaurant_id, item_id, item_name, quantity, order_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [restaurant[0].id, inventory[0].id, 'Tomatoes', 2.5, 'order-123']
    );

    // Delete inventory item
    await tx.query('DELETE FROM inventory WHERE id = $1', [inventory[0].id]);

    // Verify deductions were cascade deleted
    const deductions = await tx.query(
      'SELECT * FROM deductions WHERE item_id = $1',
      [inventory[0].id]
    );

    expect(deductions).toHaveLength(0);
  });

  it('should cascade delete reservations when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    await tx.query(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [restaurant[0].id, table[0].id, 1, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify reservations were cascade deleted
    const reservations = await tx.query(
      'SELECT * FROM reservations WHERE restaurant_id = $1',
      [restaurant[0].id]
    );

    expect(reservations).toHaveLength(0);
  });

  it('should cascade delete reservations when table is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    await tx.query(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [restaurant[0].id, table[0].id, 1, 'John Doe', '+1234567890', testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    // Delete table
    await tx.query('DELETE FROM tables WHERE id = $1', [table[0].id]);

    // Verify reservations were cascade deleted
    const reservations = await tx.query(
      'SELECT * FROM reservations WHERE table_id = $1',
      [table[0].id]
    );

    expect(reservations).toHaveLength(0);
  });

  it('should set customer_id to NULL when customer is deleted (SET NULL)', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const table = await tx.query(
      `INSERT INTO tables (restaurant_id, name, number, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4]
    );

    const customer = await tx.query(
      `INSERT INTO customers (name, phone, total_visits, total_spent, deposit_balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['John Doe', '+1234567890', 0, 0, 0, testTimestamp()]
    );

    const reservation = await tx.query(
      `INSERT INTO reservations (restaurant_id, table_id, table_number, customer_name, customer_phone, customer_id, date, start_time, end_time, party_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].id, table[0].id, 1, 'John Doe', '+1234567890', customer[0].id, testDate(), '18:00', '20:00', 4, 'confirmed']
    );

    // Delete customer
    await tx.query('DELETE FROM customers WHERE id = $1', [customer[0].id]);

    // Verify reservation still exists but customer_id is NULL
    const updatedReservation = await tx.query(
      'SELECT * FROM reservations WHERE id = $1',
      [reservation[0].id]
    );

    expect(updatedReservation).toHaveLength(1);
    expect(updatedReservation[0].customer_id).toBeNull();
  });

  it('should set zone_id to NULL when zone is deleted (SET NULL)', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const zone = await tx.query(
      `INSERT INTO zones (restaurant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [restaurant[0].short_id, 'VIP Zone', 'Premium seating']
    );

    const table = await tx.query(
      `INSERT INTO tables (restaurant_id, name, number, capacity, zone_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [restaurant[0].short_id, 'Table A1', 1, 4, zone[0].id]
    );

    // Delete zone
    await tx.query('DELETE FROM zones WHERE id = $1', [zone[0].id]);

    // Verify table still exists but zone_id is NULL
    const updatedTable = await tx.query(
      'SELECT * FROM tables WHERE id = $1',
      [table[0].id]
    );

    expect(updatedTable).toHaveLength(1);
    expect(updatedTable[0].zone_id).toBeNull();
  });

  it('should cascade delete subscriptions when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + 30 * 24 * 60 * 60 * 1000, 'pending', 'active', testTimestamp(), 'system']
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify subscriptions were cascade deleted
    const subscriptions = await tx.query(
      'SELECT * FROM subscriptions WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(subscriptions).toHaveLength(0);
  });

  it('should cascade delete payments when restaurant is deleted', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    await tx.query(
      `INSERT INTO payments (restaurant_id, amount, currency, status, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [restaurant[0].short_id, 300.00, 'USD', 'pending', testTimestamp()]
    );

    // Delete restaurant
    await tx.query('DELETE FROM restaurants WHERE id = $1', [restaurant[0].id]);

    // Verify payments were cascade deleted
    const payments = await tx.query(
      'SELECT * FROM payments WHERE restaurant_id = $1',
      [restaurant[0].short_id]
    );

    expect(payments).toHaveLength(0);
  });

  it('should set subscription_id to NULL when subscription is deleted (SET NULL)', async () => {
    const restaurant = await tx.query(
      `INSERT INTO restaurants (short_id, name, active, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test-rest', 'Test Restaurant', true, testTimestamp()]
    );

    const subscription = await tx.query(
      `INSERT INTO subscriptions (restaurant_id, plan_type, days, price_per_day, total_price, start_date, end_date, payment_status, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [restaurant[0].short_id, 'monthly', 30, 10.00, 300.00, testTimestamp(), testTimestamp() + 30 * 24 * 60 * 60 * 1000, 'pending', 'active', testTimestamp(), 'system']
    );

    const payment = await tx.query(
      `INSERT INTO payments (restaurant_id, subscription_id, amount, currency, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [restaurant[0].short_id, subscription[0].id, 300.00, 'USD', 'pending', testTimestamp()]
    );

    // Delete subscription
    await tx.query('DELETE FROM subscriptions WHERE id = $1', [subscription[0].id]);

    // Verify payment still exists but subscription_id is NULL
    const updatedPayment = await tx.query(
      'SELECT * FROM payments WHERE id = $1',
      [payment[0].id]
    );

    expect(updatedPayment).toHaveLength(1);
    expect(updatedPayment[0].subscription_id).toBeNull();
  });
});
