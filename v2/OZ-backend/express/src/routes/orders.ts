import { Router, Request, Response } from "express";
import { query } from "../config/database.js";
import { actionConvex, queryConvex } from "../services/convexClient.js";
import { emitNewOrder, emitOrderUpdate } from "../services/realtimeRelay.js";

/**
 * orders.ts — Order Routes
 * ────────────────────────
 * All order CRUD operations. Writes go to PostgreSQL first (source of truth),
 * then mirror to Convex for real-time. Reads try Convex first, fall back to PG.
 */

const router = Router();

// ── Types ─────────────────────────────────────────

interface OrderRow {
  id: number;
  table_no: number;
  items: string[];
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ConvexOrder {
  _id: string;
  _creationTime: number;
  pg_id: number;
  table_no: number;
  items: string[];
  total: number;
  status: string;
}

// ── GET /api/orders/live ──────────────────────────
// Returns pending + cooking orders for the Chef screen.
// Tries Convex first (real-time), falls back to PostgreSQL.

router.get("/live", async (_req: Request, res: Response) => {
  try {
    // Try Convex first for real-time data
    const convexOrders = await queryConvex<ConvexOrder[]>("orders:getLiveOrders");

    if (convexOrders !== null) {
      res.json({
        source: "convex",
        orders: convexOrders.map((o) => ({
          pg_id: o.pg_id,
          table_no: o.table_no,
          items: o.items,
          total: o.total,
          status: o.status,
          created_at: new Date(o._creationTime).toISOString(),
        })),
      });
      return;
    }

    // Fallback to PostgreSQL
    console.log("📦 Convex unavailable, falling back to PostgreSQL for live orders");
    const rows = await query<OrderRow>(
      `SELECT id, table_no, items, total::float, status, created_at, updated_at
       FROM orders
       WHERE status IN ('pending', 'cooking')
       ORDER BY created_at ASC`
    );

    res.json({
      source: "postgresql",
      orders: rows.map((r) => ({
        pg_id: r.id,
        table_no: r.table_no,
        items: r.items,
        total: r.total,
        status: r.status,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ GET /api/orders/live failed:", message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch orders" });
  }
});

// ── POST /api/orders ──────────────────────────────
// Place a new order. Writes to PostgreSQL, mirrors to Convex, emits Socket.io event.

router.post("/", async (req: Request, res: Response) => {
  try {
    const { table_no, items, total, status = "pending" } = req.body;

    // Validate required fields
    if (!table_no || !items || !Array.isArray(items) || items.length === 0 || !total) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Required fields: table_no (number), items (string[]), total (number)",
      });
      return;
    }

    // Validate status
    const validStatuses = ["pending", "cooking", "served"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    // Step 1: Write to PostgreSQL (source of truth)
    const rows = await query<{ id: number }>(
      `INSERT INTO orders (table_no, items, total, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [table_no, items, total, status]
    );

    const pgId = rows[0].id;

    // Step 2: Mirror to Convex (best effort — don't fail the request if Convex is down)
    const convexResult = await actionConvex("ordersActions:placeOrder", {
      table_no,
      items,
      total,
      status,
    }).catch((err) => {
      console.warn("⚠️  Convex mirror failed for new order:", err);
      return null;
    });

    // Step 3: Emit real-time event
    const order = { pg_id: pgId, table_no, items, total, status };
    emitNewOrder(order);

    res.status(201).json({
      success: true,
      order,
      convex_synced: convexResult !== null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ POST /api/orders failed:", message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to place order" });
  }
});

// ── PATCH /api/orders/:pgId/status ────────────────
// Update an order's status. Writes to PostgreSQL, mirrors to Convex, emits Socket.io event.

router.patch("/:pgId/status", async (req: Request, res: Response) => {
  try {
    const pgId = parseInt(req.params.pgId, 10);
    const { status } = req.body;

    if (isNaN(pgId)) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid order ID" });
      return;
    }

    const validStatuses = ["pending", "cooking", "served"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    // Step 1: Update PostgreSQL
    const rows = await query<{ id: number }>(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [status, pgId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "NOT_FOUND", message: `Order ${pgId} not found` });
      return;
    }

    // Step 2: Mirror to Convex (best effort)
    await actionConvex("ordersActions:updateStatus", {
      pg_id: pgId,
      status,
    }).catch((err) => {
      console.warn("⚠️  Convex mirror failed for order status update:", err);
    });

    // Step 3: Emit real-time event
    emitOrderUpdate({ pg_id: pgId, status });

    res.json({ success: true, pg_id: pgId, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ PATCH /api/orders/:pgId/status failed:", message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update order" });
  }
});

export default router;
