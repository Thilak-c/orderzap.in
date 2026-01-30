/**
 * Type Definitions for OrderZap Backend
 */

// ============================================
// DATABASE TYPES
// ============================================

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface User {
  id: string;
  restaurant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  phone?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  allergens: string[];
  preparation_time_minutes?: number;
  calories?: number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  zone_name?: string;
  capacity: number;
  qr_code?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'pay-now' | 'pay-counter' | 'pay-table';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  restaurant_id: string;
  table_id?: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_session_id?: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  discount_amount: number;
  deposit_used: number;
  total_amount: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  payment_transaction_id?: string;
  notes?: string;
  special_instructions?: string;
  estimated_ready_time?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface OrderItem {
  id: string;
  restaurant_id: string;
  order_id: string;
  menu_item_id?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  special_instructions?: string;
  customizations: any[];
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Payment {
  id: string;
  restaurant_id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  payment_gateway?: string;
  transaction_id?: string;
  gateway_response?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paid_at?: Date;
  refunded_at?: Date;
  refund_reason?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface SyncLog {
  id: string;
  restaurant_id?: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  postgres_data?: Record<string, any>;
  convex_sync_status: 'pending' | 'success' | 'failed' | 'retrying';
  convex_sync_attempts: number;
  convex_error?: string;
  last_sync_at?: Date;
  created_at: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOrderRequest {
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_session_id?: string;
  items: {
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
    customizations?: any[];
  }[];
  payment_method?: PaymentMethod;
  notes?: string;
  special_instructions?: string;
  tip_amount?: number;
  discount_amount?: number;
  deposit_used?: number;
}

export interface UpdateOrderRequest {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_transaction_id?: string;
  notes?: string;
  estimated_ready_time?: string;
  cancellation_reason?: string;
}

export interface OrderResponse {
  id: string;
  order_number: string;
  restaurant_id: string;
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  discount_amount: number;
  deposit_used: number;
  total_amount: number;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  payment_transaction_id?: string;
  notes?: string;
  items: OrderItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface OrderItemResponse {
  id: string;
  menu_item_id?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  special_instructions?: string;
  customizations?: any[];
}

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  id: string;
  restaurant_id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
}

export interface JWTPayload {
  userId: string;
  restaurantId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ============================================
// SYNC TYPES
// ============================================

export interface SyncResult {
  entity_type: string;
  synced_count: number;
  failed_count: number;
  errors: string[];
}

export interface ConvexSyncPayload {
  postgresId: string;
  restaurantId: string;
  data: Record<string, any>;
  operation: 'create' | 'update' | 'delete';
}

// ============================================
// ERROR TYPES
// ============================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(500, message, false);
  }
}
