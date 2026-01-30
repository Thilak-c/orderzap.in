/**
 * Authentication Routes
 * For testing purposes only - generates JWT tokens
 */

import { Router } from 'express';
import { generateToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/auth/generate-test-token
 * Generate a test JWT token (for development/testing only)
 */
router.post('/generate-test-token', async (req, res) => {
  try {
    const { userId, restaurantId, email, role } = req.body;

    // Validate required fields
    if (!userId || !restaurantId || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, restaurantId, email, role'
      });
    }

    // Generate token
    const token = generateToken({
      userId,
      restaurantId,
      email,
      role
    });

    logger.info('Test token generated', { userId, restaurantId, email, role });

    res.json({
      success: true,
      token,
      payload: {
        userId,
        restaurantId,
        email,
        role
      },
      note: 'This is a test token for development purposes'
    });
  } catch (error: any) {
    logger.error('Failed to generate test token', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
