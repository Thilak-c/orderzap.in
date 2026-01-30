/**
 * Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../types';
import { logger } from '../../utils/logger';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      statusCode: 500,
    },
  });
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.path,
    },
  });
}
