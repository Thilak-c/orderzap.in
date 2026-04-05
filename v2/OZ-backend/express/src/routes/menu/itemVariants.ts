import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';

const router = Router({ mergeParams: true });

// Helper to sync variant to Convex
const syncVariant = async (variant: any) => {
  try {
    await mutationConvex('menu:upsertVariantMirror', {
      pgId: variant.id,
      menuItemId: variant.item_id,
      name: variant.name,
      extraPrice: Number(variant.extra_price)
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (Variant):', err);
  }
};

// GET /api/:restaurantId/menu/variants
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

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM item_variants ${where}`, params);
    const total = parseInt(countResult[0].count);
    
    const rows = await query(
      `SELECT * FROM item_variants ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    
    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err: any) {
    console.error('GET variants error:', err);
    sendError(res, 500, `Failed to fetch item variants: ${err.message}`);
  }
});

// GET /api/:restaurantId/menu/variants/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await query('SELECT * FROM item_variants WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return sendError(res, 404, 'Item variant not found');
    sendSuccess(res, rows[0]);
  } catch (err: any) {
    console.error('GET variant/:id error:', err);
    sendError(res, 500, `Failed to fetch item variant: ${err.message}`);
  }
});

// POST /api/:restaurantId/menu/variants
router.post('/', async (req: Request, res: Response) => {
  try {
    const { item_id, name, extra_price = 0 } = req.body;
    if (!item_id || !name) {
      return sendError(res, 400, 'item_id and name are required');
    }

    const rows = await query(
      `INSERT INTO item_variants (item_id, name, extra_price) VALUES ($1, $2, $3) RETURNING *`,
      [item_id, name, extra_price]
    );
    
    const variant = rows[0];
    await syncVariant(variant);
    
    sendSuccess(res, variant, 201);
  } catch (err: any) {
    console.error('POST variant error:', err);
    sendError(res, 500, `Failed to create item variant: ${err.message}`);
  }
});

// PUT /api/:restaurantId/menu/variants/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, extra_price } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    
    if (extra_price !== undefined) {
      params.push(extra_price);
      updates.push(`extra_price = $${params.length}`);
    }

    if (updates.length === 0) return sendError(res, 400, 'No fields to update');

    params.push(req.params.id);
    const rows = await query(
      `UPDATE item_variants SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    
    if (rows.length === 0) return sendError(res, 404, 'Item variant not found');
    
    const variant = rows[0];
    await syncVariant(variant);
    
    sendSuccess(res, variant);
  } catch (err: any) {
    console.error('PUT variant/:id error:', err);
    sendError(res, 500, `Failed to update item variant: ${err.message}`);
  }
});

// DELETE /api/:restaurantId/menu/variants/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await query('DELETE FROM item_variants WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) return sendError(res, 404, 'Item variant not found');
    
    // Sync deletion
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'item_variants', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (Variant Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err: any) {
    console.error('DELETE variant/:id error:', err);
    sendError(res, 500, `Failed to delete item variant: ${err.message}`);
  }
});

export default router;
