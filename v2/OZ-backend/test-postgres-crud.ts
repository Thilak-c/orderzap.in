import "dotenv/config";
import { Pool } from "pg";

/**
 * PostgreSQL CRUD Test Suite
 * ──────────────────────────
 * Tests all CRUD operations on menu_items and orders tables
 * to verify PostgreSQL is working correctly.
 */

const pool = new Pool({
  connectionString: process.env.PG_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ── Test Helpers ──────────────────────────────────

async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW() as current_time, version() as pg_version");
    log("✓ PostgreSQL Connection Successful", "green");
    log(`  Time: ${result.rows[0].current_time}`, "cyan");
    log(`  Version: ${result.rows[0].pg_version.split(",")[0]}`, "cyan");
    return true;
  } catch (err) {
    log("✗ PostgreSQL Connection Failed", "red");
    log(`  Error: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

// ── Menu Items CRUD Tests ─────────────────────────

async function testMenuItemCreate(): Promise<number | null> {
  try {
    log("\n→ Testing Menu Item CREATE...", "blue");
    
    const result = await pool.query(
      `INSERT INTO menu_items (name, price, category, description, in_stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, price, category, in_stock`,
      ["Test Burger", 12.99, "Mains", "A delicious test burger", true]
    );

    const item = result.rows[0];
    log(`✓ Menu Item Created: ID=${item.id}, Name="${item.name}", Price=$${item.price}`, "green");
    return item.id;
  } catch (err) {
    log(`✗ Menu Item CREATE Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return null;
  }
}

async function testMenuItemRead(id: number): Promise<boolean> {
  try {
    log("\n→ Testing Menu Item READ...", "blue");
    
    const result = await pool.query(
      `SELECT id, name, price::float, category, description, in_stock, created_at, updated_at
       FROM menu_items
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      log(`✗ Menu Item READ Failed: Item with ID=${id} not found`, "red");
      return false;
    }

    const item = result.rows[0];
    log(`✓ Menu Item Read: ID=${item.id}, Name="${item.name}", Price=$${item.price}, Stock=${item.in_stock}`, "green");
    log(`  Created: ${item.created_at}`, "cyan");
    log(`  Updated: ${item.updated_at}`, "cyan");
    return true;
  } catch (err) {
    log(`✗ Menu Item READ Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

async function testMenuItemUpdate(id: number): Promise<boolean> {
  try {
    log("\n→ Testing Menu Item UPDATE...", "blue");
    
    const result = await pool.query(
      `UPDATE menu_items
       SET price = $1, in_stock = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, price::float, in_stock, updated_at`,
      [15.99, false, id]
    );

    if (result.rows.length === 0) {
      log(`✗ Menu Item UPDATE Failed: Item with ID=${id} not found`, "red");
      return false;
    }

    const item = result.rows[0];
    log(`✓ Menu Item Updated: ID=${item.id}, New Price=$${item.price}, Stock=${item.in_stock}`, "green");
    log(`  Updated At: ${item.updated_at}`, "cyan");
    return true;
  } catch (err) {
    log(`✗ Menu Item UPDATE Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

async function testMenuItemDelete(id: number): Promise<boolean> {
  try {
    log("\n→ Testing Menu Item DELETE...", "blue");
    
    const result = await pool.query(
      `DELETE FROM menu_items WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      log(`✗ Menu Item DELETE Failed: Item with ID=${id} not found`, "red");
      return false;
    }

    const item = result.rows[0];
    log(`✓ Menu Item Deleted: ID=${item.id}, Name="${item.name}"`, "green");
    return true;
  } catch (err) {
    log(`✗ Menu Item DELETE Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

// ── Orders CRUD Tests ─────────────────────────────

async function testOrderCreate(): Promise<number | null> {
  try {
    log("\n→ Testing Order CREATE...", "blue");
    
    const result = await pool.query(
      `INSERT INTO orders (table_no, items, total, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, table_no, items, total::float, status`,
      [5, ["Test Burger", "Fries", "Coke"], 25.50, "pending"]
    );

    const order = result.rows[0];
    log(`✓ Order Created: ID=${order.id}, Table=${order.table_no}, Total=$${order.total}, Status=${order.status}`, "green");
    log(`  Items: ${order.items.join(", ")}`, "cyan");
    return order.id;
  } catch (err) {
    log(`✗ Order CREATE Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return null;
  }
}

async function testOrderRead(id: number): Promise<boolean> {
  try {
    log("\n→ Testing Order READ...", "blue");
    
    const result = await pool.query(
      `SELECT id, table_no, items, total::float, status, created_at, updated_at
       FROM orders
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      log(`✗ Order READ Failed: Order with ID=${id} not found`, "red");
      return false;
    }

    const order = result.rows[0];
    log(`✓ Order Read: ID=${order.id}, Table=${order.table_no}, Total=$${order.total}, Status=${order.status}`, "green");
    log(`  Items: ${order.items.join(", ")}`, "cyan");
    log(`  Created: ${order.created_at}`, "cyan");
    log(`  Updated: ${order.updated_at}`, "cyan");
    return true;
  } catch (err) {
    log(`✗ Order READ Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

async function testOrderUpdate(id: number): Promise<boolean> {
  try {
    log("\n→ Testing Order UPDATE...", "blue");
    
    const result = await pool.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, table_no, status, updated_at`,
      ["cooking", id]
    );

    if (result.rows.length === 0) {
      log(`✗ Order UPDATE Failed: Order with ID=${id} not found`, "red");
      return false;
    }

    const order = result.rows[0];
    log(`✓ Order Updated: ID=${order.id}, New Status=${order.status}`, "green");
    log(`  Updated At: ${order.updated_at}`, "cyan");
    return true;
  } catch (err) {
    log(`✗ Order UPDATE Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

async function testOrderDelete(id: number): Promise<boolean> {
  try {
    log("\n→ Testing Order DELETE...", "blue");
    
    const result = await pool.query(
      `DELETE FROM orders WHERE id = $1 RETURNING id, table_no, status`,
      [id]
    );

    if (result.rows.length === 0) {
      log(`✗ Order DELETE Failed: Order with ID=${id} not found`, "red");
      return false;
    }

    const order = result.rows[0];
    log(`✓ Order Deleted: ID=${order.id}, Table=${order.table_no}`, "green");
    return true;
  } catch (err) {
    log(`✗ Order DELETE Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

// ── Additional Tests ──────────────────────────────

async function testBulkRead(): Promise<boolean> {
  try {
    log("\n→ Testing Bulk READ (all menu items)...", "blue");
    
    const result = await pool.query(
      `SELECT id, name, price::float, category, in_stock
       FROM menu_items
       ORDER BY category, name
       LIMIT 10`
    );

    log(`✓ Bulk Read Successful: Found ${result.rows.length} menu items`, "green");
    result.rows.forEach((item, idx) => {
      log(`  ${idx + 1}. ${item.name} ($${item.price}) - ${item.category} [${item.in_stock ? "In Stock" : "Out of Stock"}]`, "cyan");
    });
    return true;
  } catch (err) {
    log(`✗ Bulk READ Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

async function testFilteredRead(): Promise<boolean> {
  try {
    log("\n→ Testing Filtered READ (pending orders)...", "blue");
    
    const result = await pool.query(
      `SELECT id, table_no, status, total::float, created_at
       FROM orders
       WHERE status IN ('pending', 'cooking')
       ORDER BY created_at ASC
       LIMIT 10`
    );

    log(`✓ Filtered Read Successful: Found ${result.rows.length} active orders`, "green");
    result.rows.forEach((order, idx) => {
      log(`  ${idx + 1}. Order #${order.id} - Table ${order.table_no} - ${order.status} ($${order.total})`, "cyan");
    });
    return true;
  } catch (err) {
    log(`✗ Filtered READ Failed: ${err instanceof Error ? err.message : String(err)}`, "red");
    return false;
  }
}

// ── Main Test Runner ──────────────────────────────

async function runTests() {
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow");
  log("  PostgreSQL CRUD Test Suite", "yellow");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "yellow");

  const results = {
    passed: 0,
    failed: 0,
  };

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    log("\n✗ Cannot proceed without database connection", "red");
    await pool.end();
    process.exit(1);
  }

  // Menu Items CRUD
  log("\n" + "─".repeat(50), "yellow");
  log("MENU ITEMS CRUD TESTS", "yellow");
  log("─".repeat(50), "yellow");

  const menuItemId = await testMenuItemCreate();
  if (menuItemId) {
    results.passed++;
    
    if (await testMenuItemRead(menuItemId)) results.passed++;
    else results.failed++;
    
    if (await testMenuItemUpdate(menuItemId)) results.passed++;
    else results.failed++;
    
    if (await testMenuItemDelete(menuItemId)) results.passed++;
    else results.failed++;
  } else {
    results.failed += 4;
  }

  // Orders CRUD
  log("\n" + "─".repeat(50), "yellow");
  log("ORDERS CRUD TESTS", "yellow");
  log("─".repeat(50), "yellow");

  const orderId = await testOrderCreate();
  if (orderId) {
    results.passed++;
    
    if (await testOrderRead(orderId)) results.passed++;
    else results.failed++;
    
    if (await testOrderUpdate(orderId)) results.passed++;
    else results.failed++;
    
    if (await testOrderDelete(orderId)) results.passed++;
    else results.failed++;
  } else {
    results.failed += 4;
  }

  // Additional Tests
  log("\n" + "─".repeat(50), "yellow");
  log("ADDITIONAL TESTS", "yellow");
  log("─".repeat(50), "yellow");

  if (await testBulkRead()) results.passed++;
  else results.failed++;

  if (await testFilteredRead()) results.passed++;
  else results.failed++;

  // Summary
  log("\n" + "━".repeat(50), "yellow");
  log("TEST SUMMARY", "yellow");
  log("━".repeat(50), "yellow");
  log(`Total Tests: ${results.passed + results.failed}`, "cyan");
  log(`Passed: ${results.passed}`, "green");
  log(`Failed: ${results.failed}`, results.failed > 0 ? "red" : "green");
  
  if (results.failed === 0) {
    log("\n🎉 All tests passed! PostgreSQL is working correctly.", "green");
  } else {
    log(`\n⚠️  ${results.failed} test(s) failed. Please check the errors above.`, "red");
  }

  await pool.end();
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((err) => {
  log(`\n✗ Unexpected error: ${err instanceof Error ? err.message : String(err)}`, "red");
  pool.end();
  process.exit(1);
});
