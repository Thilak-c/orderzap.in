import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';
import type { Zone } from '../../types/database';

const router = Router({ mergeParams: true });

// Helper to sync zone to Convex
const syncZone = async (zone: Zone) => {
  try {
    await mutationConvex('menu:upsertZoneMirror', {
      pgId: zone.id,
      restaurantId: zone.restaurant_id || '',
      name: zone.name,
      shortcode: zone.shortcode,
      isActive: zone.is_active ?? true
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (Zone):', err);
  }
};

// GET /api/:restaurantId/menu/zones
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { restaurantId } = req.params;
    const { is_active } = req.query;

    const conditions: string[] = ['restaurant_id = $1'];
    const params: unknown[] = [restaurantId];
    
    if (is_active !== undefined) { params.push(is_active === 'true'); conditions.push(`is_active = $${params.length}`); }
    
    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM zones ${where}`, params);
    const total = parseInt(countResult[0].count);
    const rows = await query<Zone>(
      `SELECT * FROM zones ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err) {
    console.error('GET zones error:', err);
    sendError(res, 500, 'Failed to fetch zones');
  }
});

// GET /api/:restaurantId/menu/zones/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query('SELECT * FROM zones WHERE id = $1 AND restaurant_id = $2', [req.params.id, restaurantId]);
    if (rows.length === 0) return sendError(res, 404, 'Zone not found');
    sendSuccess(res, rows[0]);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch zone');
  }
});

// POST /api/:restaurantId/menu/zones
router.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, shortcode, qr_code_url, is_active = true } = req.body;
    if (!name || description === undefined) return sendError(res, 400, 'name and description are required');

    const fields = ['restaurant_id', 'name', 'description', 'is_active'];
    const values: unknown[] = [restaurantId, name, description, is_active];
    if (shortcode !== undefined) { fields.push('shortcode'); values.push(shortcode); }
    if (qr_code_url !== undefined) { fields.push('qr_code_url'); values.push(qr_code_url); }

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await query<Zone>(
      `INSERT INTO zones (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`, values
    );
    
    const zone = rows[0];
    await syncZone(zone);
    
    sendSuccess(res, zone, 201);
  } catch (err) {
    console.error('POST zone error:', err);
    sendError(res, 500, 'Failed to create zone');
  }
});

// PUT /api/:restaurantId/menu/zones/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const updates = req.body;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'id' || key === 'restaurant_id') continue;
      setClauses.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }
    if (setClauses.length === 0) return sendError(res, 400, 'No fields to update');
    
    values.push(req.params.id);
    values.push(restaurantId);
    const rows = await query<Zone>(
      `UPDATE zones SET ${setClauses.join(', ')} WHERE id = $${idx} AND restaurant_id = $${idx + 1} RETURNING *`, values
    );
    if (rows.length === 0) return sendError(res, 404, 'Zone not found');
    
    const zone = rows[0];
    await syncZone(zone);
    
    sendSuccess(res, zone);
  } catch (err) {
    sendError(res, 500, 'Failed to update zone');
  }
});

// DELETE /api/:restaurantId/menu/zones/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query(
      'DELETE FROM zones WHERE id = $1 AND restaurant_id = $2 RETURNING *', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Zone not found');
    
    // Sync deletion
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'zones', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (Zone Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err) {
    sendError(res, 500, 'Failed to delete zone');
  }
});

export default router;
