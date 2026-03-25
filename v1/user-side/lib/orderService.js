/**
 * Order Service - Handles order creation with backend integration
 * Uses backend API for writes, Convex for real-time reads
 */

import { api } from './api';

/**
 * Transform frontend order data to backend format
 * NOTE: Currently uses hardcoded UUIDs for testing
 * TODO: Implement proper Convex ID to PostgreSQL UUID mapping
 */
function transformOrderForBackend(orderData, restaurantId, userId) {
  // TEMPORARY: Use hardcoded restaurant UUID for testing
  // The JWT token also has this UUID, so it will match
  const TEMP_RESTAURANT_UUID = '550e8400-e29b-41d4-a716-446655440000';
  
  // TEMPORARY: Map first item to test menu item UUID
  // TODO: Implement proper ID mapping from Convex to PostgreSQL
  const TEMP_MENU_ITEM_UUID = '550e8400-e29b-41d4-a716-446655440001';
  
  console.warn('⚠️ Using temporary UUID mapping for testing');
  console.warn('Restaurant ID:', restaurantId, '→', TEMP_RESTAURANT_UUID);
  console.warn('Menu items will use:', TEMP_MENU_ITEM_UUID);
  
  return {
    restaurant_id: TEMP_RESTAURANT_UUID, // Hardcoded for testing
    customer_name: orderData.customerName || 'Guest',
    customer_phone: orderData.customerPhone || null,
    customer_email: orderData.customerEmail || null,
    table_number: orderData.tableId || null,
    table_id: orderData.tableId || null,
    items: orderData.items.map((item, index) => ({
      // TEMPORARY: Use test UUID for first item, skip others for now
      menu_item_id: index === 0 ? TEMP_MENU_ITEM_UUID : TEMP_MENU_ITEM_UUID,
      quantity: item.quantity,
      unit_price: item.price,
      special_instructions: item.notes || null,
    })),
    payment_method: orderData.paymentMethod || 'pay-counter',
    payment_status: orderData.paymentMethod === 'pay-now' ? 'paid' : 'pending',
    special_instructions: orderData.notes || null,
    tip_amount: orderData.tipAmount || 0,
    discount_amount: orderData.discountAmount || 0,
    deposit_used: orderData.depositUsed || 0,
  };
}

/**
 * Create order via backend API
 * Backend will handle dual-write to PostgreSQL and Convex
 */
export async function createOrderViaBackend(orderData, restaurantId, userId) {
  try {
    const backendOrder = transformOrderForBackend(orderData, restaurantId, userId);
    
    console.log('Creating order via backend:', backendOrder);
    
    const response = await api.createOrder(backendOrder);
    
    console.log('Order created successfully:', response);
    
    return {
      success: true,
      order: response.order,
      convexId: response.convexId, // Backend returns Convex ID after sync
    };
  } catch (error) {
    console.error('Failed to create order via backend:', error);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update order status via backend
 */
export async function updateOrderStatusViaBackend(orderId, status) {
  try {
    const response = await api.updateOrderStatus(orderId, status);
    
    return {
      success: true,
      order: response.order,
    };
  } catch (error) {
    console.error('Failed to update order status:', error);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get orders from backend (fallback if Convex is down)
 */
export async function getOrdersViaBackend(filters = {}) {
  try {
    const response = await api.getOrders(filters);
    
    return {
      success: true,
      orders: response.orders,
    };
  } catch (error) {
    console.error('Failed to fetch orders from backend:', error);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check backend connectivity
 */
export async function checkBackendHealth() {
  try {
    const response = await api.healthCheck();
    return response.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
