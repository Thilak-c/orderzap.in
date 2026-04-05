import { Response } from 'express';
import type { PaginationMeta } from '../types/database';

/**
 * responseUtils.ts — Standardized API Response Helpers
 * ────────────────────────────────────────────────────
 * Consistent response format across all V2 endpoints.
 */

/**
 * Send a success response.
 */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

/**
 * Send a paginated success response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta
): void {
  res.status(200).json({ success: true, data, pagination });
}

/**
 * Send an error response.
 */
export function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, error: message });
}

/**
 * Parse pagination query parameters with defaults.
 */
export function parsePagination(query: Record<string, any>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build a PaginationMeta object.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}
