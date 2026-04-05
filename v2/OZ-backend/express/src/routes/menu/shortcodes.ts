import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';

const router = Router({ mergeParams: true });

// Helper to sync shortcode to Convex
const syncShortcode = async (shortcode: any) => {
  try {
    await mutationConvex('menu:upsertShortcodeMirror', {
      pgId: shortcode.id,
      restaurantId: shortcode.restaurant_id,
      code: shortcode.code,
      type: shortcode.type,
      referenceId: shortcode.reference_id,
      isActive: shortcode.is_active
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (Shortcode):', err);
  }
};

// GET /api/:restaurantId/menu/shortcodes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { restaurantId } = req.params;
    const { type } = req.query;

    const conditions: string[] = ['restaurant_id = $1'];
    const params: unknown[] = [restaurantId];
    
    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM shortcodes ${where}`, params);
    const total = parseInt(countResult[0].count);
    
    const rows = await query(
      `SELECT * FROM shortcodes ${where} ORDER BY code ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    
    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err: any) {
    console.error('GET shortcodes error:', err);
    sendError(res, 500, `Failed to fetch shortcodes: ${err.message}`);
  }
});

// GET /api/:restaurantId/menu/shortcodes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query(
      'SELECT * FROM shortcodes WHERE id = $1 AND restaurant_id = $2', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Shortcode not found');
    sendSuccess(res, rows[0]);
  } catch (err: any) {
    console.error('GET shortcode/:id error:', err);
    sendError(res, 500, `Failed to fetch shortcode: ${err.message}`);
  }
});

// POST /api/:restaurantId/menu/shortcodes
router.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { code, type, reference_id, is_active = true } = req.body;
    if (!code || !type || !reference_id) {
      return sendError(res, 400, 'code, type, and reference_id are required');
    }

    if (!['table', 'zone', 'item'].includes(type)) {
      return sendError(res, 400, 'type must be one of: table, zone, item');
    }

    // Check if code already exists for this restaurant
    const existing = await query(
      'SELECT id FROM shortcodes WHERE restaurant_id = $1 AND code = $2',
      [restaurantId, code]
    );
    if (existing.length > 0) {
      return sendError(res, 400, 'Shortcode already exists for this restaurant');
    }

    const rows = await query(
      `INSERT INTO shortcodes (restaurant_id, code, type, reference_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [restaurantId, code, type, reference_id, is_active]
    );
    
    const shortcode = rows[0];
    await syncShortcode(shortcode);
    
    sendSuccess(res, shortcode, 201);
  } catch (err: any) {
    console.error('POST shortcode error:', err);
    sendError(res, 500, `Failed to create shortcode: ${err.message}`);
  }
});

// PUT /api/:restaurantId/menu/shortcodes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { code, is_active, reference_id } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (code !== undefined) {
      params.push(code);
      updates.push(`code = $${params.length}`);
    }
    
    if (is_active !== undefined) {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }
    
    if (reference_id !== undefined) {
      params.push(reference_id);
      updates.push(`reference_id = $${params.length}`);
    }

    if (updates.length === 0) return sendError(res, 400, 'No fields to update');

    params.push(req.params.id);
    params.push(restaurantId);
    const rows = await query(
      `UPDATE shortcodes SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND restaurant_id = $${params.length} RETURNING *`,
      params
    );
    
    if (rows.length === 0) return sendError(res, 404, 'Shortcode not found');
    
    const shortcode = rows[0];
    await syncShortcode(shortcode);
    
    sendSuccess(res, shortcode);
  } catch (err: any) {
    console.error('PUT shortcode/:id error:', err);
    sendError(res, 500, `Failed to update shortcode: ${err.message}`);
  }
});

// DELETE /api/:restaurantId/menu/shortcodes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query(
      'DELETE FROM shortcodes WHERE id = $1 AND restaurant_id = $2 RETURNING *', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Shortcode not found');
    
    // Sync deletion
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'shortcodes', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (Shortcode Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err: any) {
    console.error('DELETE shortcode/:id error:', err);
    sendError(res, 500, `Failed to delete shortcode: ${err.message}`);
  }
});

export default router;
