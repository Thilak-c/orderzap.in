/**
 * Order Service - MVP Version
 * Simplified dual-write pattern for orders
 */

import { db } from '../db/postgres/pool';
import { convexClient } from '../lib/convexClient';
import { CreateOrderRequest, Order, OrderItem, NotFoundError } from '../types';
import { logger } from '../utils/logger';

export class OrderService {
  /**
   * Create Order - Dual Write (Simplified)
   */
  async createOrder(
    restaurantId: string,
    data: CreateOrderRequest
  ): Promise<{ order: Order; items: OrderItem[] }> {
    logger.info('Creating order', { restaurantId, itemCount: data.items.length });

    // Step 1: Write to PostgreSQL
    const result = await db.transaction(async (client) => {
      // Calculate totals
      let subtotal = 0;
      const itemsWithPrices = [];

      for (const item of data.items) {
        const menuItem = await client.query(
          'SELECT price, name FROM menu_items WHERE id = $1 AND restaurant_id = $2 AND deleted_at IS NULL',
          [item.menu_item_id, restaurantId]
        );

        if (menuItem.rows.length === 0) {
          throw new NotFoundError(`Menu item ${item.menu_item_id} not found`);
        }

        const price = Number(menuItem.rows[0].price);
        const itemSubtotal = price * item.quantity;
        subtotal += itemSubtotal;

        itemsWithPrices.push({
          ...item,
          name: menuItem.rows[0].name,
          price,
          subtotal: itemSubtotal,
        });
      }

      const taxAmount = subtotal * 0.05; // 5% tax
      const tipAmount = data.tip_amount || 0;
      const discountAmount = data.discount_amount || 0;
      const depositUsed = data.deposit_used || 0;
      const totalAmount = subtotal + taxAmount + tipAmount - discountAmount - depositUsed;

      // Generate order number
      const orderNumberResult = await client.query(
        `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [restaurantId]
      );
      const dailyCount = parseInt(orderNumberResult.rows[0].count) + 1;
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10)}-${dailyCount.toString().padStart(4, '0')}`;

      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (
          restaurant_id, table_id, order_number, customer_name, customer_phone,
          customer_session_id, status, subtotal, tax_amount, tip_amount,
          discount_amount, deposit_used, total_amount, payment_method,
          payment_status, notes, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          restaurantId,
          data.table_id || null,
          orderNumber,
          data.customer_name || null,
          data.customer_phone || null,
          data.customer_session_id || null,
          'pending',
          subtotal,
          taxAmount,
          tipAmount,
          discountAmount,
          depositUsed,
          totalAmount,
          data.payment_method || null,
          'pending',
          data.notes || null,
          data.special_instructions || null,
        ]
      );

      const order = orderResult.rows[0];

      // PROOF LOGGING: Capture exact PostgreSQL return value
      logger.info('🔍 POSTGRES RETURNED ORDER', {
        orderId: order.id,
        cancellation_reason_value: order.cancellation_reason,
        cancellation_reason_type: typeof order.cancellation_reason,
        cancellation_reason_is_null: order.cancellation_reason === null,
        cancellation_reason_is_undefined: order.cancellation_reason === undefined,
        all_keys: Object.keys(order),
      });

      // Insert order items
      const items: OrderItem[] = [];
      for (const itemData of itemsWithPrices) {
        const itemResult = await client.query(
          `INSERT INTO order_items (
            restaurant_id, order_id, menu_item_id, name, price, quantity, subtotal,
            special_instructions, customizations
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            restaurantId,
            order.id,
            itemData.menu_item_id,
            itemData.name,
            itemData.price,
            itemData.quantity,
            itemData.subtotal,
            itemData.special_instructions || null,
            JSON.stringify(itemData.customizations || []),
          ]
        );
        items.push(itemResult.rows[0]);
      }

      return { order, items };
    });

    // Step 2: Sync to Convex (async, non-blocking)
    this.syncToConvex(result.order, result.items).catch((err) => {
      logger.error('Convex sync failed', { orderId: result.order.id, error: err.message });
    });

    logger.info('Order created successfully', { orderId: result.order.id, orderNumber: result.order.order_number });
    return result;
  }

  /**
   * Get Order by ID
   */
  async getOrder(restaurantId: string, orderId: string): Promise<{ order: Order; items: OrderItem[] }> {
    // Try Convex first (fast)
    try {
      const convexOrder = await convexClient.getOrder(orderId);
      if (convexOrder) {
        logger.debug('Order fetched from Convex', { orderId });
        return convexOrder as any; // Simplified type casting
      }
    } catch (error) {
      logger.warn('Convex read failed, falling back to PostgreSQL', { orderId });
    }

    // Fallback to PostgreSQL
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2 AND deleted_at IS NULL',
      [orderId, restaurantId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1 AND deleted_at IS NULL',
      [orderId]
    );

    const order = orderResult.rows[0];
    const items = itemsResult.rows;

    // Repair Convex cache
    this.syncToConvex(order, items).catch((err) => {
      logger.error('Convex repair failed', { orderId, error: err.message });
    });

    return { order, items };
  }

  /**
   * List Orders
   */
  async listOrders(restaurantId: string, filters?: { status?: string; limit?: number }): Promise<Order[]> {
    const limit = filters?.limit || 50;
    let query = 'SELECT * FROM orders WHERE restaurant_id = $1 AND deleted_at IS NULL';
    const params: any[] = [restaurantId];

    if (filters?.status) {
      query += ' AND status = $2';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Update Order Status
   */
  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    status: string
  ): Promise<Order> {
    const result = await db.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND restaurant_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [status, orderId, restaurantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order not found');
    }

    const order = result.rows[0];

    // Sync to Convex
    const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    this.syncToConvex(order, items.rows).catch((err) => {
      logger.error('Convex sync failed after status update', { orderId, error: err.message });
    });

    return order;
  }

  /**
   * Soft Delete Order
   */
  async deleteOrder(restaurantId: string, orderId: string): Promise<void> {
    await db.query(
      `UPDATE orders 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND restaurant_id = $2`,
      [orderId, restaurantId]
    );

    await db.query(
      `UPDATE order_items 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE order_id = $1`,
      [orderId]
    );

    // Sync deletion to Convex
    convexClient.deleteEntity('order', orderId).catch((err) => {
      logger.error('Convex delete sync failed', { orderId, error: err.message });
    });
  }

  /**
   * Sync to Convex
   */
  private async syncToConvex(order: Order, items: OrderItem[]): Promise<void> {
    const syncResult = await convexClient.syncOrder(order, items);

    if (!syncResult.success) {
      logger.error('Convex sync failed', { orderId: order.id, error: syncResult.error });
      // In production, this would be logged to sync_logs table for retry
    }
  }
}

export const orderService = new OrderService();
