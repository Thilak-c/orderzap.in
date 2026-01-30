/**
 * Authentication Middleware - MVP Version
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../../utils/jwt';
import { UnauthorizedError } from '../../types';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    restaurantId: string;
    email: string;
    role: string;
  };
}

/**
 * Authenticate user from JWT token
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      restaurantId: decoded.restaurantId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate restaurant access
 */
export function validateRestaurantAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError('User not authenticated'));
  }

  // Extract restaurant_id from request params or body
  const requestRestaurantId = req.params.restaurantId || req.body.restaurant_id;

  if (requestRestaurantId && requestRestaurantId !== req.user.restaurantId) {
    return next(new UnauthorizedError('Access denied: Restaurant mismatch'));
  }

  next();
}

/**
 * Optional auth - doesn't fail if no token
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
}
