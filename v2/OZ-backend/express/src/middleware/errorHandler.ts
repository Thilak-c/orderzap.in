import { Request, Response, NextFunction } from 'express';

/**
 * errorHandler.ts — Global Error Handling Middleware
 * ──────────────────────────────────────────────────
 * Catches unhandled errors from route handlers.
 * Must be registered LAST in the Express middleware stack.
 */

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('\n[API Error]', err);

  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
