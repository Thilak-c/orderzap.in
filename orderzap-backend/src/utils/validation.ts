/**
 * Input Validation Utilities using Zod
 */

import { z } from 'zod';
import { ValidationError } from '../types';

// ============================================
// ORDER VALIDATION SCHEMAS
// ============================================

export const createOrderSchema = z.object({
  table_id: z.string().uuid().optional(),
  customer_name: z.string().min(1).max(255).optional(),
  customer_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  customer_session_id: z.string().max(255).optional(),
  items: z.array(
    z.object({
      menu_item_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      special_instructions: z.string().max(500).optional(),
      customizations: z.array(z.any()).optional(),
    })
  ).min(1),
  payment_method: z.enum(['pay-now', 'pay-counter', 'pay-table']).optional(),
  notes: z.string().max(1000).optional(),
  special_instructions: z.string().max(1000).optional(),
  tip_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  deposit_used: z.number().min(0).optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  payment_transaction_id: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  estimated_ready_time: z.string().datetime().optional(),
  cancellation_reason: z.string().max(500).optional(),
});

// ============================================
// AUTH VALIDATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  full_name: z.string().min(1).max(255),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
});

// ============================================
// MENU ITEM VALIDATION SCHEMAS
// ============================================

export const createMenuItemSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  image_url: z.string().url().optional(),
  is_available: z.boolean().default(true),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  preparation_time_minutes: z.number().int().positive().optional(),
  calories: z.number().int().positive().optional(),
  display_order: z.number().int().default(0),
});

// ============================================
// VALIDATION HELPER FUNCTION
// ============================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new ValidationError(messages.join(', '));
    }
    throw error;
  }
}

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate restaurant ID matches authenticated user
 */
export function validateRestaurantAccess(userRestaurantId: string, resourceRestaurantId: string): void {
  if (userRestaurantId !== resourceRestaurantId) {
    throw new ValidationError('Access denied: Restaurant ID mismatch');
  }
}
