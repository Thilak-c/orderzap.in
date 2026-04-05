import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import {
  sendSuccess, sendPaginated, sendError,
  parsePagination, buildPaginationMeta,
} from '../../utils/responseUtils';
import type { Category } from '../../types/database';

const router = Router({ mergeParams: true });

// Helper to sync category to Convex
const syncCategory = async (category: Category) => {
  try {
    await mutationConvex('menu:upsertCategoryMirror', {
      pgId: category.id,
      restaurantId: category.restaurant_id,
      menuId: category.menu_id,
      name: category.name,
      isActive: category.is_active,
      displayOrder: category.display_order
    });
  } catch (err) {
    console.warn('⚠️  Convex Sync Warning (Category):', err);
  }
};

// GET /api/:restaurantId/menu/categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { restaurantId } = req.params;
    const { menu_id, is_active } = req.query;

    const conditions: string[] = ['restaurant_id = $1'];
    const params: unknown[] = [restaurantId];

    if (menu_id) { params.push(menu_id); conditions.push(`menu_id = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active === 'true'); conditions.push(`is_active = $${params.length}`); }
    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM categories ${where}`, params);
    const total = parseInt(countResult[0].count);
    const rows = await query<Category>(
      `SELECT * FROM categories ${where} ORDER BY display_order ASC, name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    sendPaginated(res, rows, buildPaginationMeta(total, page, limit));
  } catch (err) {
    console.error('GET categories error:', err);
    sendError(res, 500, 'Failed to fetch categories');
  }
});

// GET /api/:restaurantId/menu/categories/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query<Category>(
      'SELECT * FROM categories WHERE id = $1 AND restaurant_id = $2', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Category not found');
    sendSuccess(res, rows[0]);
  } catch (err) {
    console.error('GET category/:id error:', err);
    sendError(res, 500, 'Failed to fetch category');
  }
});

// POST /api/:restaurantId/menu/categories
router.post('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { 
      menu_id, name, icon, icon_file_url, icon_url, 
      display_order, is_active = true, created_at = Date.now() 
    } = req.body;
    if (!name) return sendError(res, 400, 'name is required');

    const fields = ['restaurant_id', 'name', 'is_active', 'created_at'];
    const values: unknown[] = [restaurantId, name, is_active, created_at];
    
    if (menu_id !== undefined) { fields.push('menu_id'); values.push(menu_id); }
    if (icon !== undefined) { fields.push('icon'); values.push(icon); }
    if (icon_file_url !== undefined) { fields.push('icon_file_url'); values.push(icon_file_url); }
    if (icon_url !== undefined) { fields.push('icon_url'); values.push(icon_url); }
    if (display_order !== undefined) { fields.push('display_order'); values.push(display_order); }

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await query<Category>(
      `INSERT INTO categories (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`, values
    );
    
    const category = rows[0];
    await syncCategory(category);
    
    sendSuccess(res, category, 201);
  } catch (err) {
    console.error('POST category error:', err);
    sendError(res, 500, 'Failed to create category');
  }
});

// PUT /api/:restaurantId/menu/categories/:id
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
    const rows = await query<Category>(
      `UPDATE categories SET ${setClauses.join(', ')} WHERE id = $${idx} AND restaurant_id = $${idx + 1} RETURNING *`, values
    );
    if (rows.length === 0) return sendError(res, 404, 'Category not found');
    
    const category = rows[0];
    await syncCategory(category);
    
    sendSuccess(res, category);
  } catch (err) {
    console.error('PUT category/:id error:', err);
    sendError(res, 500, 'Failed to update category');
  }
});

// DELETE /api/:restaurantId/menu/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const rows = await query<Category>(
      'DELETE FROM categories WHERE id = $1 AND restaurant_id = $2 RETURNING *', 
      [req.params.id, restaurantId]
    );
    if (rows.length === 0) return sendError(res, 404, 'Category not found');
    
    // Sync deletion to Convex
    try {
      await mutationConvex('menu:deleteMirrorRecord', { table: 'categories', pgId: req.params.id });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (Category Delete):', syncErr);
    }
    
    sendSuccess(res, { deleted: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE category/:id error:', err);
    sendError(res, 500, 'Failed to delete category');
  }
});

export default router;
