import { Router, Request, Response } from 'express';
import { query } from '../../config/database';
import { mutationConvex } from '../../services/convexClient';
import { sendSuccess, sendError } from '../../utils/responseUtils';
import type { Restaurant } from '../../types/database';

const router = Router();

/**
 * Restaurant Registration API
 * ───────────────────────────
 * POST /api/restaurant/
 * Used to onboard new SaaS tenants.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { short_id, name, email, description, active = true, status = 'active' } = req.body;

    if (!short_id || !name) {
      return sendError(res, 400, 'short_id and name are required');
    }

    // Check if short_id is already taken
    const existing = await query('SELECT id FROM restaurants WHERE short_id = $1', [short_id]);
    if (existing.length > 0) {
      return sendError(res, 400, 'Restaurant short_id already exists');
    }

    const fields = ['short_id', 'name', 'active', 'status', 'created_at'];
    const values: unknown[] = [short_id, name, active, status, Date.now()];

    if (email) { fields.push('email'); values.push(email); }
    if (description) { fields.push('description'); values.push(description); }

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await query<Restaurant>(
      `INSERT INTO restaurants (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    const restaurant = rows[0];

    // Mirror to Convex for real-time visibility
    try {
      await mutationConvex('menu:upsertRestaurantMirror', {
        pgId: restaurant.id,
        shortId: restaurant.short_id,
        name: restaurant.name,
        active: restaurant.active
      });
    } catch (syncErr) {
      console.warn('⚠️  Convex Sync Warning (Restaurant):', syncErr);
    }

    sendSuccess(res, restaurant, 201);
  } catch (err: any) {
    console.error('POST /api/restaurant error:', err);
    sendError(res, 500, `Failed to create restaurant: ${err.message}`);
  }
});

export default router;
