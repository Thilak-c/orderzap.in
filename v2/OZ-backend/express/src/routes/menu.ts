import { Router, Request, Response } from "express";
import { query } from "../config/database.js";
import { actionConvex, queryConvex } from "../services/convexClient.js";
import { emitMenuUpdate, emitMenuSynced } from "../services/realtimeRelay.js";

/**
 * menu.ts — Menu Routes
 * ─────────────────────
 * Menu item operations. Reads try Convex first, fall back to PG.
 * Writes go to PostgreSQL first, then mirror to Convex.
 */

const router = Router();

// ── Types ─────────────────────────────────────────

interface MenuItemRow {
  id: number;
  name: string;
  price: number;
  category: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

interface ConvexMenuItem {
  _id: string;
  _creationTime: number;
  pg_id: number;
  name: string;
  price: number;
  category: string;
  in_stock: boolean;
}

// ── GET /api/menu ─────────────────────────────────
// Returns all menu items. Tries Convex first, falls back to PostgreSQL.

router.get("/", async (_req: Request, res: Response) => {
  try {
    // Try Convex first
    const convexItems = await queryConvex<ConvexMenuItem[]>("menu:getMenu");

    if (convexItems !== null) {
      res.json({
        source: "convex",
        items: convexItems.map((item) => ({
          pg_id: item.pg_id,
          name: item.name,
          price: item.price,
          category: item.category,
          in_stock: item.in_stock,
        })),
      });
      return;
    }

    // Fallback to PostgreSQL
    console.log("📦 Convex unavailable, falling back to PostgreSQL for menu");
    const rows = await query<MenuItemRow>(
      `SELECT id, name, price::float, category, in_stock, created_at, updated_at
       FROM menu_items
       ORDER BY category, name`
    );

    res.json({
      source: "postgresql",
      items: rows.map((r) => ({
        pg_id: r.id,
        name: r.name,
        price: r.price,
        category: r.category,
        in_stock: r.in_stock,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ GET /api/menu failed:", message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch menu" });
  }
});

// ── PATCH /api/menu/:pgId/stock ───────────────────
// Toggle in_stock status. Writes to PG, mirrors to Convex, emits Socket.io event.

router.patch("/:pgId/stock", async (req: Request, res: Response) => {
  try {
    const pgId = parseInt(req.params.pgId, 10);

    if (isNaN(pgId)) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid menu item ID" });
      return;
    }

    // Step 1: Toggle in PostgreSQL and get new value
    const rows = await query<{ in_stock: boolean }>(
      `UPDATE menu_items
       SET in_stock = NOT in_stock, updated_at = NOW()
       WHERE id = $1
       RETURNING in_stock`,
      [pgId]
    );

    if (rows.length === 0) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: `Menu item ${pgId} not found`,
      });
      return;
    }

    const newStockStatus = rows[0].in_stock;

    // Step 2: Mirror to Convex (best effort)
    await actionConvex("menuActions:toggleStock", {
      pg_id: pgId,
    }).catch((err) => {
      console.warn("⚠️  Convex mirror failed for stock toggle:", err);
    });

    // Step 3: Emit real-time event
    emitMenuUpdate({ pg_id: pgId, in_stock: newStockStatus });

    res.json({ success: true, pg_id: pgId, in_stock: newStockStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ PATCH /api/menu/:pgId/stock failed:", message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to toggle stock" });
  }
});

// ── POST /api/menu/sync ───────────────────────────
// Force full sync from PostgreSQL → Convex. Useful for recovery.

router.post("/sync", async (_req: Request, res: Response) => {
  try {
    // Call the Convex sync action
    const result = await actionConvex<{ synced: number }>(
      "menuActions:syncMenuFromPostgres"
    );

    if (result === null) {
      res.status(503).json({
        error: "CONVEX_UNAVAILABLE",
        message: "Convex is not reachable. Cannot sync menu.",
      });
      return;
    }

    emitMenuSynced({ synced: result.synced });

    res.json({
      success: true,
      synced: result.synced,
      message: `Synced ${result.synced} menu items from PostgreSQL → Convex`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ POST /api/menu/sync failed:", message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to sync menu" });
  }
});

export default router;
