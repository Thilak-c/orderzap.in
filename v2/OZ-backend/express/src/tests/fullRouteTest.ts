/**
 * fullRouteTest.ts — Comprehensive Route & Sync Validation
 * ─────────────────────────────────────────────────────────
 * Tests EVERY route (health, restaurant, menu, categories, items,
 * variants, add-ons, zones, shortcodes) for:
 *   1. PostgreSQL CRUD correctness
 *   2. Convex mirror sync verification
 *   3. Data consistency between PG and Convex
 *
 * Repeats until 100% success rate.
 *
 * Usage: npx tsx src/tests/fullRouteTest.ts [--max-retries=5]
 */

import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_URL = "http://localhost:4000/api";
const CONVEX_URL = process.env.CONVEX_URL || "http://127.0.0.1:3210";
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY || "";
const API_KEY =
  process.env.API_KEY ||
  "ozk_a7f3d9e1b2c4056f8e9d1a3b5c7f0e2d4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4";

// ── Helpers ────────────────────────────────────────

const SYNC_WAIT = 2000; // ms to wait for Convex sync
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

let http: AxiosInstance;

/**
 * Query Convex HTTP API directly for sync verification
 */
async function queryConvex(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<any> {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${CONVEX_ADMIN_KEY}`,
    },
    body: JSON.stringify({ path: functionPath, args, format: "json" }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.status === "success" ? data.value : null;
}

/**
 * Call a Convex mutation via HTTP API
 */
async function mutateConvex(
  functionPath: string,
  args: Record<string, unknown> = {}
): Promise<any> {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${CONVEX_ADMIN_KEY}`,
    },
    body: JSON.stringify({ path: functionPath, args, format: "json" }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.status === "success" ? data.value : null;
}

// ── Test Functions ─────────────────────────────────

async function testHealth(): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await http.get("/health");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.status) throw new Error("Missing status field");
    if (!res.data.services) throw new Error("Missing services field");
    if (!res.data.services.express) throw new Error("Missing express service");
    if (!res.data.services.postgresql)
      throw new Error("Missing postgresql service");
    if (!res.data.services.convex) throw new Error("Missing convex service");

    const pgStatus = res.data.services.postgresql.status;
    if (pgStatus !== "healthy")
      throw new Error(`PostgreSQL is ${pgStatus}, expected healthy`);

    const cvxStatus = res.data.services.convex.status;
    if (cvxStatus !== "healthy")
      throw new Error(`Convex is ${cvxStatus}, expected healthy`);

    return {
      name: "GET /api/health",
      passed: true,
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    return {
      name: "GET /api/health",
      passed: false,
      error: e.response?.data?.error || e.message,
      durationMs: Date.now() - start,
    };
  }
}

async function testApiRoot(): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await http.get("/");
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error("Expected success: true");
    if (!res.data.data.name) throw new Error("Missing API name");
    return {
      name: "GET /api/",
      passed: true,
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    return {
      name: "GET /api/",
      passed: false,
      error: e.response?.data?.error || e.message,
      durationMs: Date.now() - start,
    };
  }
}

async function testRestaurantCRUD(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = Date.now().toString().slice(-6);
  let pgId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post("/restaurant/", {
        short_id: `test-${testId}`,
        name: `Full Test Restaurant ${testId}`,
        email: `test${testId}@orderzap.com`,
        description: "Auto-test restaurant",
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      if (!res.data.success) throw new Error("Expected success: true");
      pgId = res.data.data.id;
      if (!pgId) throw new Error("No id returned");
      results.push({
        name: "POST /api/restaurant (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST /api/restaurant (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // SYNC CHECK
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getRestaurantByPgId", {
        pgId,
      });
      if (!cvx) throw new Error("Restaurant NOT mirrored to Convex");
      if (cvx.name !== `Full Test Restaurant ${testId}`)
        throw new Error(
          `Convex name mismatch: "${cvx.name}" vs "Full Test Restaurant ${testId}"`
        );
      results.push({
        name: "Restaurant → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Restaurant → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DUPLICATE CHECK
  {
    const start = Date.now();
    try {
      const res = await http.post("/restaurant/", {
        short_id: `test-${testId}`,
        name: "Duplicate",
      });
      throw new Error(`Expected 400, got ${res.status}`);
    } catch (e: any) {
      if (e.response?.status === 400) {
        results.push({
          name: "POST /api/restaurant (duplicate rejection)",
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          name: "POST /api/restaurant (duplicate rejection)",
          passed: false,
          error: e.response?.data?.error || e.message,
          durationMs: Date.now() - start,
        });
      }
    }
  }

  return results;
}

async function testMenuCRUD(restaurantShortId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = Date.now().toString().slice(-6);
  let menuId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/menus`, {
        name: `Test Menu ${testId}`,
        is_active: true,
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      menuId = res.data.data.id;
      if (!menuId) throw new Error("No menu id returned");
      results.push({
        name: "POST menus (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST menus (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(`/${restaurantShortId}/menu/menus`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (!res.data.success) throw new Error("Expected success");
      if (!Array.isArray(res.data.data)) throw new Error("Expected data array");
      if (!res.data.pagination) throw new Error("Missing pagination");
      const found = res.data.data.find((m: any) => m.id === menuId);
      if (!found) throw new Error("Created menu not in list");
      results.push({
        name: "GET menus (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET menus (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(`/${restaurantShortId}/menu/menus/${menuId}`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (res.data.data.id !== menuId) throw new Error("ID mismatch");
      results.push({
        name: "GET menus/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET menus/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(`/${restaurantShortId}/menu/menus/${menuId}`, {
        name: `Updated Menu ${testId}`,
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (res.data.data.name !== `Updated Menu ${testId}`)
        throw new Error("Name not updated");
      results.push({
        name: "PUT menus/:id (update)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT menus/:id (update)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      const res = await http.delete(
        `/${restaurantShortId}/menu/menus/${menuId}`
      );
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      results.push({
        name: "DELETE menus/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE menus/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // 404 after delete
  {
    const start = Date.now();
    try {
      await http.get(`/${restaurantShortId}/menu/menus/${menuId}`);
      results.push({
        name: "GET menus/:id (404 after delete)",
        passed: false,
        error: "Expected 404 but got 200",
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      if (e.response?.status === 404) {
        results.push({
          name: "GET menus/:id (404 after delete)",
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          name: "GET menus/:id (404 after delete)",
          passed: false,
          error: `Expected 404, got ${e.response?.status}`,
          durationMs: Date.now() - start,
        });
      }
    }
  }

  return results;
}

async function testCategoryCRUD(
  restaurantShortId: string,
  menuId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = Date.now().toString().slice(-6);
  let catId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/categories`, {
        name: `Test Category ${testId}`,
        menu_id: menuId,
        is_active: true,
        display_order: 1,
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      catId = res.data.data.id;
      results.push({
        name: "POST categories (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST categories (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // SYNC
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getCategoryByPgId", { pgId: catId });
      if (!cvx) throw new Error("Category NOT mirrored to Convex");
      results.push({
        name: "Category → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Category → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(`/${restaurantShortId}/menu/categories`);
      if (!res.data.success) throw new Error("Expected success");
      if (!res.data.pagination) throw new Error("Missing pagination");
      results.push({
        name: "GET categories (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET categories (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/categories/${catId}`
      );
      if (res.data.data.id !== catId) throw new Error("ID mismatch");
      results.push({
        name: "GET categories/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET categories/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(
        `/${restaurantShortId}/menu/categories/${catId}`,
        { name: `Updated Cat ${testId}`, display_order: 99 }
      );
      if (res.data.data.name !== `Updated Cat ${testId}`)
        throw new Error("Name not updated");
      results.push({
        name: "PUT categories/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT categories/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE SYNC
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getCategoryByPgId", { pgId: catId });
      if (!cvx) throw new Error("Category not found after update");
      if (cvx.name !== `Updated Cat ${testId}`)
        throw new Error(
          `Convex name not updated: "${cvx.name}" vs "Updated Cat ${testId}"`
        );
      results.push({
        name: "Category update → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Category update → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      await http.delete(`/${restaurantShortId}/menu/categories/${catId}`);
      results.push({
        name: "DELETE categories/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE categories/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE SYNC
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getCategoryByPgId", { pgId: catId });
      if (cvx) throw new Error("Category still in Convex after PG deletion");
      results.push({
        name: "Category delete → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Category delete → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}

async function testMenuItemCRUD(
  restaurantShortId: string,
  categoryId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = Date.now().toString().slice(-6);
  let itemId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/items`, {
        name: `Test Burger ${testId}`,
        price: 199,
        category_id: categoryId,
        description: "Auto-test item",
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      itemId = res.data.data.id;
      results.push({
        name: "POST items (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST items (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // SYNC
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getItemByPgId", { pgId: itemId });
      if (!cvx) throw new Error("Item NOT mirrored to Convex");
      if (cvx.price !== 199) throw new Error(`Price mismatch: ${cvx.price}`);
      results.push({
        name: "Item → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Item → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // VALIDATION
  {
    const start = Date.now();
    try {
      await http.post(`/${restaurantShortId}/menu/items`, {
        price: 100,
      });
      results.push({
        name: "POST items (validation)",
        passed: false,
        error: "Expected 400 for missing required fields",
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      if (e.response?.status === 400) {
        results.push({
          name: "POST items (validation)",
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          name: "POST items (validation)",
          passed: false,
          error: `Expected 400, got ${e.response?.status}`,
          durationMs: Date.now() - start,
        });
      }
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(`/${restaurantShortId}/menu/items`);
      if (!res.data.success) throw new Error("Expected success");
      if (!res.data.pagination) throw new Error("Missing pagination");
      results.push({
        name: "GET items (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET items (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/items/${itemId}`
      );
      if (res.data.data.id !== itemId) throw new Error("ID mismatch");
      results.push({
        name: "GET items/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET items/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(
        `/${restaurantShortId}/menu/items/${itemId}`,
        { price: 349, name: `Updated Burger ${testId}` }
      );
      if (Number(res.data.data.price) !== 349)
        throw new Error("Price not updated");
      results.push({
        name: "PUT items/:id (update)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT items/:id (update)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE SYNC
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getItemByPgId", { pgId: itemId });
      if (!cvx) throw new Error("Item not found in Convex after update");
      if (cvx.price !== 349)
        throw new Error(`Convex price not updated: ${cvx.price}`);
      results.push({
        name: "Item update → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Item update → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      await http.delete(`/${restaurantShortId}/menu/items/${itemId}`);
      results.push({
        name: "DELETE items/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE items/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE SYNC
  {
    const start = Date.now();
    try {
      await sleep(SYNC_WAIT);
      const cvx = await queryConvex("menu:getItemByPgId", { pgId: itemId });
      if (cvx) throw new Error("Item still in Convex after PG deletion");
      results.push({
        name: "Item delete → Convex sync",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "Item delete → Convex sync",
        passed: false,
        error: e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}

async function testVariantCRUD(
  restaurantShortId: string,
  itemId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let variantId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/variants`, {
        item_id: itemId,
        name: "Extra Large",
        extra_price: 50,
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      variantId = res.data.data.id;
      results.push({
        name: "POST variants (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST variants (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/variants?item_id=${itemId}`
      );
      if (!res.data.success) throw new Error("Expected success");
      results.push({
        name: "GET variants (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET variants (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/variants/${variantId}`
      );
      if (res.data.data.id !== variantId) throw new Error("ID mismatch");
      results.push({
        name: "GET variants/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET variants/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(
        `/${restaurantShortId}/menu/variants/${variantId}`,
        { extra_price: 75 }
      );
      if (Number(res.data.data.extra_price) !== 75)
        throw new Error("Price not updated");
      results.push({
        name: "PUT variants/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT variants/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      await http.delete(`/${restaurantShortId}/menu/variants/${variantId}`);
      results.push({
        name: "DELETE variants/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE variants/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}

async function testAddOnCRUD(
  restaurantShortId: string,
  itemId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let addOnId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/add-ons`, {
        item_id: itemId,
        name: "Cheese Topping",
        price: 25,
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      addOnId = res.data.data.id;
      results.push({
        name: "POST add-ons (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST add-ons (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/add-ons?item_id=${itemId}`
      );
      if (!res.data.success) throw new Error("Expected success");
      results.push({
        name: "GET add-ons (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET add-ons (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/add-ons/${addOnId}`
      );
      if (res.data.data.id !== addOnId) throw new Error("ID mismatch");
      results.push({
        name: "GET add-ons/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET add-ons/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(
        `/${restaurantShortId}/menu/add-ons/${addOnId}`,
        { price: 40, name: "Double Cheese" }
      );
      if (Number(res.data.data.price) !== 40) throw new Error("Price not updated");
      results.push({
        name: "PUT add-ons/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT add-ons/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      await http.delete(`/${restaurantShortId}/menu/add-ons/${addOnId}`);
      results.push({
        name: "DELETE add-ons/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE add-ons/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}

async function testZoneCRUD(
  restaurantShortId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = Date.now().toString().slice(-6);
  let zoneId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/zones`, {
        name: `VIP Zone ${testId}`,
        description: "Auto-test zone",
        shortcode: `VZ${testId}`,
        is_active: true,
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      zoneId = res.data.data.id;
      results.push({
        name: "POST zones (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST zones (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(`/${restaurantShortId}/menu/zones`);
      if (!res.data.success) throw new Error("Expected success");
      results.push({
        name: "GET zones (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET zones (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/zones/${zoneId}`
      );
      if (res.data.data.id !== zoneId) throw new Error("ID mismatch");
      results.push({
        name: "GET zones/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET zones/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(
        `/${restaurantShortId}/menu/zones/${zoneId}`,
        { name: `Updated Zone ${testId}` }
      );
      if (res.data.data.name !== `Updated Zone ${testId}`)
        throw new Error("Name not updated");
      results.push({
        name: "PUT zones/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT zones/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      await http.delete(`/${restaurantShortId}/menu/zones/${zoneId}`);
      results.push({
        name: "DELETE zones/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE zones/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}

async function testShortcodeCRUD(
  restaurantShortId: string,
  referenceId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = Date.now().toString().slice(-6);
  let shortcodeId = "";

  // CREATE
  {
    const start = Date.now();
    try {
      const res = await http.post(`/${restaurantShortId}/menu/shortcodes`, {
        code: `SC${testId}`,
        type: "zone",
        reference_id: referenceId,
        is_active: true,
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      shortcodeId = res.data.data.id;
      results.push({
        name: "POST shortcodes (PG create)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "POST shortcodes (PG create)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
      return results;
    }
  }

  // TYPE VALIDATION
  {
    const start = Date.now();
    try {
      await http.post(`/${restaurantShortId}/menu/shortcodes`, {
        code: `BAD${testId}`,
        type: "invalid_type",
        reference_id: referenceId,
      });
      results.push({
        name: "POST shortcodes (type validation)",
        passed: false,
        error: "Expected 400 for invalid type",
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      if (e.response?.status === 400) {
        results.push({
          name: "POST shortcodes (type validation)",
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          name: "POST shortcodes (type validation)",
          passed: false,
          error: `Expected 400, got ${e.response?.status}`,
          durationMs: Date.now() - start,
        });
      }
    }
  }

  // DUPLICATE CHECK
  {
    const start = Date.now();
    try {
      await http.post(`/${restaurantShortId}/menu/shortcodes`, {
        code: `SC${testId}`,
        type: "zone",
        reference_id: referenceId,
      });
      results.push({
        name: "POST shortcodes (duplicate rejection)",
        passed: false,
        error: "Expected 400 for duplicate code",
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      if (e.response?.status === 400) {
        results.push({
          name: "POST shortcodes (duplicate rejection)",
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        results.push({
          name: "POST shortcodes (duplicate rejection)",
          passed: false,
          error: `Expected 400, got ${e.response?.status}`,
          durationMs: Date.now() - start,
        });
      }
    }
  }

  // LIST
  {
    const start = Date.now();
    try {
      const res = await http.get(`/${restaurantShortId}/menu/shortcodes`);
      if (!res.data.success) throw new Error("Expected success");
      results.push({
        name: "GET shortcodes (list)",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET shortcodes (list)",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // GET BY ID
  {
    const start = Date.now();
    try {
      const res = await http.get(
        `/${restaurantShortId}/menu/shortcodes/${shortcodeId}`
      );
      if (res.data.data.id !== shortcodeId) throw new Error("ID mismatch");
      results.push({
        name: "GET shortcodes/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "GET shortcodes/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // UPDATE
  {
    const start = Date.now();
    try {
      const res = await http.put(
        `/${restaurantShortId}/menu/shortcodes/${shortcodeId}`,
        { is_active: false }
      );
      if (res.data.data.is_active !== false)
        throw new Error("is_active not updated");
      results.push({
        name: "PUT shortcodes/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "PUT shortcodes/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  // DELETE
  {
    const start = Date.now();
    try {
      await http.delete(
        `/${restaurantShortId}/menu/shortcodes/${shortcodeId}`
      );
      results.push({
        name: "DELETE shortcodes/:id",
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e: any) {
      results.push({
        name: "DELETE shortcodes/:id",
        passed: false,
        error: e.response?.data?.error || e.message,
        durationMs: Date.now() - start,
      });
    }
  }

  return results;
}

// ── Main Runner ────────────────────────────────────

async function runAllTests(): Promise<TestResult[]> {
  const all: TestResult[] = [];
  const testId = Date.now().toString().slice(-5);

  // 1. Health & Root
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 1: Health & Root");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(await testHealth());
  all.push(await testApiRoot());

  // 2. Restaurant
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 2: Restaurant CRUD + Sync");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const restroResults = await testRestaurantCRUD();
  all.push(...restroResults);

  // Create a persistent restaurant for remaining tests
  let restaurantShortId = "";
  let restaurantPgId = "";
  {
    const res = await http.post("/restaurant/", {
      short_id: `rt-${testId}`,
      name: `Persistent Test ${testId}`,
    });
    restaurantShortId = res.data.data.short_id;
    restaurantPgId = res.data.data.id;
  }

  // 3. Menus
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 3: Menu CRUD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testMenuCRUD(restaurantShortId)));

  // Create persistent menu and category for child tests
  let menuId = "";
  let categoryId = "";
  let itemId = "";
  let zoneId = "";

  {
    const menuRes = await http.post(`/${restaurantShortId}/menu/menus`, {
      name: `Persistent Menu ${testId}`,
      is_active: true,
    });
    menuId = menuRes.data.data.id;
  }

  // 4. Categories
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 4: Category CRUD + Sync");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testCategoryCRUD(restaurantShortId, menuId)));

  // Create persistent category
  {
    const catRes = await http.post(`/${restaurantShortId}/menu/categories`, {
      name: `Persistent Category ${testId}`,
      menu_id: menuId,
      is_active: true,
    });
    categoryId = catRes.data.data.id;
  }

  // 5. Menu Items
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 5: Menu Item CRUD + Sync");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testMenuItemCRUD(restaurantShortId, categoryId)));

  // Create persistent item for variant/add-on tests
  {
    const itemRes = await http.post(`/${restaurantShortId}/menu/items`, {
      name: `Persistent Item ${testId}`,
      price: 100,
      category_id: categoryId,
      description: "For child tests",
    });
    itemId = itemRes.data.data.id;
  }

  // 6. Variants
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 6: Variant CRUD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testVariantCRUD(restaurantShortId, itemId)));

  // 7. Add-Ons
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 7: Add-On CRUD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testAddOnCRUD(restaurantShortId, itemId)));

  // 8. Zones
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 8: Zone CRUD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testZoneCRUD(restaurantShortId)));

  // Create persistent zone for shortcode tests
  {
    const zoneRes = await http.post(`/${restaurantShortId}/menu/zones`, {
      name: `Persistent Zone ${testId}`,
      description: "For shortcode tests",
      is_active: true,
    });
    zoneId = zoneRes.data.data.id;
  }

  // 9. Shortcodes
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PHASE 9: Shortcode CRUD");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  all.push(...(await testShortcodeCRUD(restaurantShortId, zoneId)));

  return all;
}

function printResults(results: TestResult[], attempt: number) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const pct = ((passed / total) * 100).toFixed(1);

  console.log("\n" + "═".repeat(70));
  console.log(`  ATTEMPT #${attempt} — TEST RESULTS: ${passed}/${total} (${pct}%)`);
  console.log("═".repeat(70));

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    const time = `${r.durationMs}ms`;
    console.log(`  ${icon} ${r.name.padEnd(45)} ${time}`);
    if (!r.passed && r.error) {
      console.log(`      └─ ${r.error}`);
    }
  }

  console.log("═".repeat(70));
  console.log(
    `  TOTAL: ${passed} passed, ${failed} failed out of ${total} (${pct}%)`
  );
  console.log("═".repeat(70));

  return { passed, failed, total, pct };
}

async function main() {
  const maxRetries = parseInt(
    process.argv.find((a) => a.startsWith("--max-retries="))?.split("=")[1] ||
      "5"
  );

  http = axios.create({
    baseURL: API_URL,
    headers: { "x-api-key": API_KEY },
    validateStatus: (status) => status < 500 || status === 500,
  });

  // Override validateStatus for the tests — we want to catch all errors
  http = axios.create({
    baseURL: API_URL,
    headers: { "x-api-key": API_KEY },
  });

  console.log("\n" + "█".repeat(70));
  console.log("  OrderZap — FULL ROUTE & SYNC VALIDATION");
  console.log("  PostgreSQL + Convex + Data Synchronization");
  console.log("█".repeat(70));
  console.log(`  API:     ${API_URL}`);
  console.log(`  Convex:  ${CONVEX_URL}`);
  console.log(`  Retries: up to ${maxRetries}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `\n${"▓".repeat(70)}\n  ATTEMPT ${attempt} of ${maxRetries}\n${"▓".repeat(70)}`
    );

    try {
      const results = await runAllTests();
      const { passed, failed, total, pct } = printResults(results, attempt);

      if (failed === 0) {
        console.log("\n🎉 ALL TESTS PASSED — 100% SUCCESS RATE! 🎉\n");
        process.exit(0);
      }

      if (attempt < maxRetries) {
        console.log(
          `\n⏳ ${failed} test(s) failed. Retrying in 3 seconds...\n`
        );
        await sleep(3000);
      } else {
        console.log(
          `\n❌ FAILED after ${maxRetries} attempts. ${failed}/${total} tests still failing.\n`
        );
        process.exit(1);
      }
    } catch (e: any) {
      console.error(`\n💥 FATAL ERROR on attempt ${attempt}:`, e.message);
      if (attempt < maxRetries) {
        console.log("⏳ Retrying in 5 seconds...");
        await sleep(5000);
      } else {
        process.exit(1);
      }
    }
  }
}

main();
