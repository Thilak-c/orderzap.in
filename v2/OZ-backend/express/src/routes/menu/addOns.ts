import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';

const router = Router({ mergeParams: true });

// Helper to sync add-on to Convex
const syncAddOn = async (addOn: any) => {
  try {
    await mutationConvex('menu:upsertAddOnMirror', {
      pgId: addOn.id,
      menuItemId: addOn.item_id,
      name: addOn.name,
      price: Number(addOn.price),
      isAvailable: addOn.is_available
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (AddOn):', err);
  }
};

// GET /api/:restaurantId/menu/add-ons
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { item_id } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    
    if (item_id) { 
      params.push(item_id); 
      conditions.push(`item_id = $${params.length}`); 
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM add_ons ${where}`, params);
    const total = parseInt(countResult[0].count);
    
    const rows = await query(
      `SELECT * FROM add_ons ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    
    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err: any) {
    console.error('GET add-ons error:', err);
    sendError(res, 500, `Failed to fetch add-ons: ${err.message}`);
  }
});

// GET /api/:restaurantId/menu/add-ons/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await query('SELECT * FROM add_ons WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return sendError(res, 404, 'Add-on not found');
    sendSuccess(res, rows[0]);
  } catch (err: any) {
    console.error('GET add-on/:id error:', err);
    sendError(res, 500, `Failed to fetch add-on: ${err.message}`);
  }
});

// POST /api/:restaurantId/menu/add-ons
router.post('/', async (req: Request, res: Response) => {
  try {
    const { item_id, name, price = 0, is_available = true } = req.body;
    if (!item_id || !name) {
      return sendError(res, 400, 'item_id and name are required');
    }

    const rows = await query(
      `INSERT INTO add_ons (item_id, name, price, is_available) VALUES ($1, $2, $3, $4) RETURNING *`,
      [item_id, name, price, is_available]
    );
    
    const addOn = rows[0];
    await syncAddOn(addOn);
    
    sendSuccess(res, addOn, 201);
  } catch (err: any) {
    console.error('POST add-on error:', err);
    sendError(res, 500, `Failed to create add-on: ${err.message}`);
  }
});

// PUT /api/:restaurantId/menu/add-ons/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, price, is_available } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    
    if (price !== undefined) {
      params.push(price);
      updates.push(`price = $${params.length}`);
    }
    
    if (is_available !== undefined) {
      params.push(is_available);
      updates.push(`is_available = $${params.length}`);
    }

    if (updates.length === 0) return sendError(res, 400, 'No fields to update');

    params.push(req.params.id);
    const rows = await query(
      `UPDATE add_ons SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    if (rows.length === 0) return sendError(res, 404, 'Add-on not found');
    
    const addOn = rows[0];
    await syncAddOn(addOn);
    
    sendSuccess(res, addOn);
  } catch (err: any) {
    console.error('PUT add-on/:id error:', err);
    sendError(res, 500, `Failed to update add-on: ${err.message}`);
  }
});

// DELETE /api/:restaurantId/menu/add-ons/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await query('DELETE FROM add_ons WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) return sendError(res, 404, 'Add-on not found');
    
    // Sync deletion
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'add_ons', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (AddOn Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err: any) {
    console.error('DELETE add-on/:id error:', err);
    sendError(res, 500, `Failed to delete add-on: ${err.message}`);
  }
});

export default router;
