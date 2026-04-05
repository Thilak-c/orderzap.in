import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';

const router = Router({ mergeParams: true });

// Helper to sync menu to Convex
const syncMenu = async (menu: any) => {
  try {
    await mutationConvex('menu:upsertMenuMirror', {
      pgId: menu.id,
      restaurantId: menu.restaurant_id,
      name: menu.name,
      isActive: menu.is_active
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (Menu):', err);
  }
};

// GET /api/:restaurantId/menu/menus
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { restaurantId } = req.params;
    const { is_active } = req.query;

    const conditions: string[] = ['restaurant_id = $1'];
    const params: unknown[] = [restaurantId];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM menus ${where}`, params);
    const total = parseInt(countResult[0].count);
    
    const rows = await query(
      `SELECT * FROM menus ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    
    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err: any) {
    console.error('GET menus error:', err);
    sendError(res, 500, `Failed to fetch menus: ${err.message}`);
  }
});

// GET /api/:restaurantId/menu/menus/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query('SELECT * FROM menus WHERE id = $1 AND restaurant_id = $2', [req.params.id, restaurantId]);
    if (rows.length === 0) return sendError(res, 404, 'Menu not found');
    sendSuccess(res, rows[0]);
  } catch (err: any) {
    console.error('GET menu/:id error:', err);
    sendError(res, 500, `Failed to fetch menu: ${err.message}`);
  }
});

// POST /api/:restaurantId/menu/menus
router.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name, is_active = true } = req.body;
    if (!name) {
      return sendError(res, 400, 'name is required');
    }

    const rows = await query(
      `INSERT INTO menus (restaurant_id, name, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [restaurantId, name, is_active]
    );
    
    const menu = rows[0];
    await syncMenu(menu);
    
    sendSuccess(res, menu, 201);
  } catch (err: any) {
    console.error('POST menu error:', err);
    sendError(res, 500, `Failed to create menu: ${err.message}`);
  }
});

// PUT /api/:restaurantId/menu/menus/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name, is_active } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    
    if (is_active !== undefined) {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }

    if (updates.length === 0) return sendError(res, 400, 'No fields to update');

    params.push(req.params.id);
    params.push(restaurantId);
    const rows = await query(
      `UPDATE menus SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND restaurant_id = $${params.length} RETURNING *`,
      params
    );
    
    if (rows.length === 0) return sendError(res, 404, 'Menu not found');
    
    const menu = rows[0];
    await syncMenu(menu);
    
    sendSuccess(res, menu);
  } catch (err: any) {
    console.error('PUT menu/:id error:', err);
    sendError(res, 500, `Failed to update menu: ${err.message}`);
  }
});

// DELETE /api/:restaurantId/menu/menus/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query('DELETE FROM menus WHERE id = $1 AND restaurant_id = $2 RETURNING *', [req.params.id, restaurantId]);
    if (rows.length === 0) return sendError(res, 404, 'Menu not found');
    
    // Sync deletion
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'menus', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (Menu Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err: any) {
    console.error('DELETE menu/:id error:', err);
    sendError(res, 500, `Failed to delete menu: ${err.message}`);
  }
});

export default router;
