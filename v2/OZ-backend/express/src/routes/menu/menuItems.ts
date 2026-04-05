import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';
import type { MenuItem } from '../../types/database';

const router = Router({ mergeParams: true });

// Helper to sync menu item to Convex
const syncMenuItem = async (item: MenuItem) => {
  try {
    await mutationConvex('menu:upsertItemMirror', {
      pgId: item.id,
      restaurantId: item.restaurant_id || '',
      categoryId: item.category_id || '',
      name: item.name,
      price: Number(item.price),
      description: item.description,
      isAvailable: item.is_available ?? item.available ?? true,
      isHidden: item.is_hidden ?? false,
      shortcode: item.shortcode
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (MenuItem):', err);
  }
};

// GET /api/:restaurantId/menu/items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { restaurantId } = req.params;
    const { category_id, is_available, is_hidden } = req.query;

    const conditions: string[] = ['restaurant_id = $1'];
    const params: unknown[] = [restaurantId];

    if (category_id) { params.push(category_id); conditions.push(`category_id = $${params.length}`); }
    if (is_available !== undefined) { params.push(is_available === 'true'); conditions.push(`is_available = $${params.length}`); }
    if (is_hidden !== undefined) { params.push(is_hidden === 'true'); conditions.push(`is_hidden = $${params.length}`); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM menu_items ${where}`, params);
    const total = parseInt(countResult[0].count);

    const rows = await query<MenuItem>(
      `SELECT * FROM menu_items ${where} ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err) {
    console.error('GET items error:', err);
    sendError(res, 500, 'Failed to fetch menu items');
  }
});

// GET /api/:restaurantId/menu/items/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query<MenuItem>(
      'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Menu item not found');
    sendSuccess(res, rows[0]);
  } catch (err) {
    console.error('GET item/:id error:', err);
    sendError(res, 500, 'Failed to fetch menu item');
  }
});

// POST /api/:restaurantId/menu/items
router.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { 
      name, price, category_id, description, 
      is_available = true, is_hidden = false, shortcode, image_url, ...rest 
    } = req.body;
    
    if (!name || price === undefined || !category_id || description === undefined) {
      return sendError(res, 400, 'name, price, category_id, and description are required');
    }

    const fields = ['restaurant_id', 'name', 'price', 'category_id', 'description', 'is_available', 'is_hidden', 'category'];
    const values: unknown[] = [restaurantId, name, price, category_id, description, is_available, is_hidden, rest.category || 'Default'];
    
    if (shortcode) { fields.push('shortcode'); values.push(shortcode); }
    if (image_url) { fields.push('image_url'); values.push(image_url); }

    const optionalFields = ['image', 'image_file_url', 'allowed_zones', 'theme_colors'];

    for (const f of optionalFields) {
      if (rest[f] !== undefined) {
        fields.push(f);
        values.push(typeof rest[f] === 'object' ? JSON.stringify(rest[f]) : rest[f]);
      }
    }

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await query<MenuItem>(
      `INSERT INTO menu_items (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`, values
    );
    
    const item = rows[0];
    await syncMenuItem(item);
    
    sendSuccess(res, item, 201);
  } catch (err) {
    console.error('POST item error:', err);
    sendError(res, 500, 'Failed to create menu item');
  }
});

// PUT /api/:restaurantId/menu/items/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const updates = req.body;
    
    // Sync legacy/new available fields if one is provided
    if (updates.available !== undefined && updates.is_available === undefined) updates.is_available = updates.available;
    if (updates.is_available !== undefined && updates.available === undefined) updates.available = updates.is_available;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'id' || key === 'restaurant_id') continue;
      setClauses.push(`${key} = $${idx}`);
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      idx++;
    }
    if (setClauses.length === 0) return sendError(res, 400, 'No fields to update');
    
    // Update updated_at
    setClauses.push(`updated_at = $${idx}`);
    values.push(Date.now());
    idx++;

    values.push(req.params.id);
    values.push(restaurantId);
    const rows = await query<MenuItem>(
      `UPDATE menu_items SET ${setClauses.join(', ')} WHERE id = $${idx} AND restaurant_id = $${idx + 1} RETURNING *`, 
      values
    );
    if (rows.length === 0) return sendError(res, 404, 'Menu item not found');
    
    const item = rows[0];
    await syncMenuItem(item);
    
    sendSuccess(res, item);
  } catch (err) {
    console.error('PUT item/:id error:', err);
    sendError(res, 500, 'Failed to update menu item');
  }
});

// DELETE /api/:restaurantId/menu/items/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query<MenuItem>(
      'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING *', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Menu item not found');
    
    // Sync deletion to Convex
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'menu_items', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (MenuItem Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE item/:id error:', err);
    sendError(res, 500, 'Failed to delete menu item');
  }
});

export default router;
