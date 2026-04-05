/**
 * V2 Database Type Definitions
 * ────────────────────────────────────
 * TypeScript interfaces for PostgreSQL and Convex tables
 * Generated from schema analysis for type-safe database operations
 */

// ============================================================================
// POSTGRESQL TABLE INTERFACES
// ============================================================================

/**
 * Restaurant - Core restaurant entity with business information and subscription
 * PostgreSQL Table: restaurants
 */
export interface Restaurant {
  id: string; // UUID
  short_id: string; // Short restaurant ID (e.g., "bts", "mgc")
  name: string;
  logo?: string;
  favicon_url?: string;
  logo_url?: string;
  brand_name?: string;
  primary_color?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  active: boolean;
  is_open?: boolean;
  business_hours?: Record<string, any>;
  created_at: number; // BIGINT timestamp
  owner_name?: string;
  owner_phone?: string;
  manager_name?: string;
  manager_phone?: string;
  instagram_link?: string;
  youtube_link?: string;
  google_maps_link?: string;
  onboarding_filled_by?: string;
  onboarding_filled_by_name?: string;
  map_link?: string;
  onboarding_status?: number;
  theme_colors?: {
    dominant?: string;
    muted?: string;
    darkVibrant?: string;
    lightVibrant?: string;
  };
  status?: 'trial' | 'active' | 'expired' | 'blocked';
  trial_start_date?: number;
  trial_end_date?: number;
  subscription_end_date?: number;
  blocked_reason?: string;
}

/**
 * Zone - Dining zones within a restaurant
 * PostgreSQL Table: zones
 */
export interface Zone {
  id: string; // UUID
  restaurant_id?: string;
  name: string;
  description: string;
  is_active?: boolean;
  shortcode?: string;
}

/**
 * Category - Menu item categories with custom icons
 * PostgreSQL Table: categories
 */
export interface Category {
  id: string; // UUID
  restaurant_id?: string;
  menu_id?: string; // Optional parent menu
  name: string;
  icon?: string;
  icon_file_url?: string;
  icon_url?: string;
  display_order?: number;
  is_active?: boolean;
  created_at: number;
}

/**
 * MenuItem - Restaurant menu items with pricing and availability
 * PostgreSQL Table: menu_items
 */
export interface MenuItem {
  id: string; // UUID
  restaurant_id?: string;
  category_id?: string; // UUID reference to categories
  name: string;
  price: number; // NUMERIC
  category: string; // Legacy text category
  image?: string;
  image_file_url?: string;
  image_url?: string;
  description: string;
  available: boolean;
  is_available?: boolean; // Alias for 'available'
  is_hidden?: boolean;
  shortcode?: string;
  allowed_zones?: string[];
  theme_colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

/**
 * Table - Restaurant tables with capacity and zone assignment
 * PostgreSQL Table: tables
 */
export interface Table {
  id: string; // UUID
  restaurant_id?: string;
  name: string;
  number: number;
  capacity?: number;
  zone_id?: string; // UUID reference to zones
}

/**
 * AlertSettings - WhatsApp alert configuration
 * PostgreSQL Table: alert_settings
 */
export interface AlertSettings {
  id: string; // UUID
  restaurant_id: string;
  whatsapp_number: string;
  alerts_enabled: boolean;
}

/**
 * Settings - Global app settings
 * PostgreSQL Table: settings
 */
export interface Settings {
  id: string; // UUID
  key: string;
  value: string;
}

/**
 * Staff - Staff members with roles and assignments
 * PostgreSQL Table: staff
 */
export interface Staff {
  id: string; // UUID
  restaurant_id?: string; // UUID
  name: string;
  role: string;
  phone?: string;
  email?: string;
  password?: string;
  assigned_tables: number[]; // JSONB array
  active: boolean;
  is_online?: boolean;
  last_seen?: number;
  current_location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
  };
  is_in_restaurant?: boolean;
  orders_served_today?: number;
  total_orders_served?: number;
  last_order_assigned_at?: number;
  profile_photo?: string;
  date_of_birth?: string; // YYYY-MM-DD
  address?: string;
  emergency_contact?: string;
  emergency_contact_phone?: string;
  joining_date?: number;
  salary?: number; // NUMERIC
  salary_type?: string;
  hourly_rate?: number; // NUMERIC
  bank_account?: string;
  bank_name?: string;
  ifsc_code?: string;
}

/**
 * Payroll - Monthly payroll records
 * PostgreSQL Table: payroll
 */
export interface Payroll {
  id: string; // UUID
  restaurant_id: string; // UUID
  staff_id: string; // UUID
  month: string; // YYYY-MM
  base_salary: number; // NUMERIC
  bonus?: number; // NUMERIC
  deductions?: number; // NUMERIC
  total_amount: number; // NUMERIC
  days_worked: number;
  total_days: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_on?: number;
  payment_method?: string;
  notes?: string;
  created_at: number;
}

/**
 * Inventory - Restaurant inventory items
 * PostgreSQL Table: inventory
 */
export interface Inventory {
  id: string; // UUID
  restaurant_id?: string; // UUID
  name: string;
  unit: string;
  quantity: number; // NUMERIC
  min_stock: number; // NUMERIC
  cost_per_unit: number; // NUMERIC
  category: string;
}

/**
 * Wastage - Inventory wastage tracking
 * PostgreSQL Table: wastage
 */
export interface Wastage {
  id: string; // UUID
  restaurant_id?: string; // UUID
  item_id: string; // UUID
  item_name: string;
  quantity: number; // NUMERIC
  reason: string;
  date: string;
  cost_loss: number; // NUMERIC
}

/**
 * Deduction - Inventory deductions linked to orders
 * PostgreSQL Table: deductions
 */
export interface Deduction {
  id: string; // UUID
  restaurant_id?: string; // UUID
  item_id: string; // UUID
  item_name: string;
  quantity: number; // NUMERIC
  order_id: string;
}

/**
 * Customer - Customer accounts with visit history
 * PostgreSQL Table: customers
 */
export interface Customer {
  id: string; // UUID
  name: string;
  phone: string;
  total_visits: number;
  total_spent: number; // NUMERIC
  deposit_balance: number; // NUMERIC
  created_at: number;
  last_visit?: number;
}

/**
 * Reservation - Table reservations
 * PostgreSQL Table: reservations
 */
export interface Reservation {
  id: string; // UUID
  restaurant_id?: string; // UUID
  table_id: string; // UUID
  table_number: number;
  customer_name: string;
  customer_phone?: string;
  customer_id?: string; // UUID
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  party_size: number;
  deposit_amount?: number; // NUMERIC
  status: 'confirmed' | 'cancelled' | 'completed';
  arrived?: boolean;
  notes?: string;
}

/**
 * Review - Customer feedback and reviews
 * PostgreSQL Table: reviews
 */
export interface Review {
  id: string; // UUID
  restaurant_id: string;
  table_id: string;
  table_number: number;
  enjoyed: boolean;
  issue_with?: 'restaurant' | 'app';
  issue_category?: string;
  feedback?: string;
  created_at: number;
}

/**
 * Subscription - Restaurant subscription plans
 * PostgreSQL Table: subscriptions
 */
export interface Subscription {
  id: string; // UUID
  restaurant_id: string;
  plan_type: 'monthly' | 'custom' | 'trial_extension';
  days: number;
  price_per_day: number; // NUMERIC
  total_price: number; // NUMERIC
  start_date: number;
  end_date: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_id?: string; // UUID
  status: 'active' | 'expired' | 'cancelled';
  auto_renew?: boolean;
  created_at: number;
  created_by: string;
  notes?: string;
}

/**
 * Payment - Payment records with gateway integration
 * PostgreSQL Table: payments
 */
export interface Payment {
  id: string; // UUID
  restaurant_id: string;
  subscription_id?: string; // UUID
  amount: number; // NUMERIC
  currency: string;
  payment_method?: string;
  gateway_name?: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  gateway_signature?: string;
  gateway_response?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  created_at: number;
  completed_at?: number;
  failed_reason?: string;
  refund_amount?: number; // NUMERIC
  refund_reason?: string;
  refunded_at?: number;
  processed_by?: string;
  notes?: string;
}

/**
 * AdminUser - Admin user accounts
 * PostgreSQL Table: admin_users
 */
export interface AdminUser {
  id: string; // UUID
  email: string;
  password_hash: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  permissions: {
    view?: boolean;
    edit?: boolean;
    delete?: boolean;
    refund?: boolean;
    manageAdmins?: boolean;
  };
  active: boolean;
  last_login_at?: number;
  created_at: number;
}

/**
 * ActivityLog - Audit trail for system activities
 * PostgreSQL Table: activity_logs
 */
export interface ActivityLog {
  id: string; // UUID
  actor_type: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: number;
}

// ============================================================================
// CONVEX TABLE INTERFACES
// ============================================================================

/**
 * Order - Real-time order tracking (Convex)
 * Convex Table: orders
 */
export interface ConvexOrder {
  _id: string; // Convex ID
  _creationTime: number;
  restaurantId?: string;
  tableId?: string;
  orderNumber: string;
  items?: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  total?: number;
  totalAmount?: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  customerSessionId?: string;
  customerPhone?: string;
  customerName?: string;
  depositUsed?: number;
  assignedWaiterId?: string;
  assignedAt?: number;
  assignmentStatus?: 'pending' | 'accepted' | 'rejected' | 'timeout';
  assignmentAcceptedAt?: number;
  assignmentTimeoutAt?: number;
  subtotal?: number;
  taxAmount?: number;
  tipAmount?: number;
  discountAmount?: number;
  specialInstructions?: string;
  createdAt?: number;
  updatedAt?: number;
  // PostgreSQL sync fields
  postgresId?: string;
  lastSyncedAt?: number;
  syncPending?: boolean;
  syncError?: string;
  lastSyncAttempt?: number;
}

/**
 * StaffCall - Real-time staff call requests (Convex)
 * Convex Table: staffCalls
 */
export interface ConvexStaffCall {
  _id: string; // Convex ID
  _creationTime: number;
  restaurantId?: string;
  tableId: string;
  tableNumber: number;
  zoneName?: string;
  reason?: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: number;
  acknowledgedAt?: number;
  originalStaffId?: string;
  reassignedTo?: string;
  reassignReason?: string;
}

/**
 * ZoneRequest - Real-time zone change requests (Convex)
 * Convex Table: zoneRequests
 */
export interface ConvexZoneRequest {
  _id: string; // Convex ID
  _creationTime: number;
  restaurantId?: string;
  tableId: string;
  tableNumber: number;
  currentZone?: string;
  requestedZone: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
}

/**
 * Notification - Multi-channel notifications (Convex)
 * Convex Table: notifications
 */
export interface ConvexNotification {
  _id: string; // Convex ID
  _creationTime: number;
  restaurantId: string;
  type: string;
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  read: boolean;
  channels: string[];
  sentAt?: number;
  readAt?: number;
  createdAt: number;
  metadata?: any;
}

/**
 * StaffNotification - Notifications for managers (Convex)
 * Convex Table: staffNotifications
 */
export interface ConvexStaffNotification {
  _id: string; // Convex ID
  _creationTime: number;
  type: string;
  message: string;
  staffId?: string;
  relatedCallId?: string;
  read: boolean;
  createdAt: number;
}

/**
 * Attendance - Staff attendance tracking (Convex)
 * Convex Table: attendance
 */
export interface ConvexAttendance {
  _id: string; // Convex ID
  _creationTime: number;
  restaurantId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  checkIn?: number;
  checkOut?: number;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  status: 'present' | 'absent' | 'half-day' | 'leave';
  workHours?: number;
  notes?: string;
  // PostgreSQL sync fields
  postgresId?: string;
  lastSyncedAt?: number;
  syncPending?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Database response wrapper for API endpoints
 */
export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  error?: string;
}
