/**
 * Convex HTTP Client
 * Thin wrapper for communicating with Convex backend from Node.js
 * 
 * ARCHITECTURE NOTE:
 * - This is ONLY a client to call Convex functions
 * - All Convex backend logic lives in /convex folder
 * - No schemas, validators, or business logic here
 */

import { ConvexHttpClient } from 'convex/browser';
import { logger } from '../utils/logger';
import { Order, OrderItem, MenuItem, Table, Payment } from '../types';

// Lazy-load Convex API after deployment
let api: any = null;
setTimeout(() => {
  try {
    api = require('../../convex/_generated/api').api;
    logger.info('Convex API loaded successfully');
  } catch (error) {
    // Convex not initialized yet - this is OK during startup
  }
}, 100);

const CONVEX_URL = process.env.CONVEX_DEPLOYMENT || '';

class ConvexClient {
  private client: ConvexHttpClient | null = null;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    if (CONVEX_URL) {
      try {
        this.client = new ConvexHttpClient(CONVEX_URL);
        logger.info('Convex client initialized');
      } catch (error: any) {
        logger.warn('Failed to initialize Convex client:', error.message);
      }
    } else {
      logger.warn('CONVEX_DEPLOYMENT not set, Convex operations will fail');
    }
  }

  private getClient(): ConvexHttpClient {
    if (!this.client) {
      if (!CONVEX_URL) {
        throw new Error('Convex not configured');
      }
      this.client = new ConvexHttpClient(CONVEX_URL);
    }
    return this.client;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await operation();
        return { success: true };
      } catch (error: any) {
        logger.error(`Convex ${entityType} sync failed (attempt ${attempt}/${this.maxRetries})`, {
          entityId,
          error: error.message,
        });

        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        } else {
          return { success: false, error: error.message };
        }
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * Sync Order to Convex
   * Calls the Convex mutation with properly normalized data
   */
  async syncOrder(order: Order, items: OrderItem[]): Promise<{ success: boolean; error?: string }> {
    if (!api) {
      logger.warn('Convex API not available, skipping sync');
      return { success: false, error: 'Convex not initialized' };
    }
    
    return this.withRetry(async () => {
      // Build data object - only include fields with actual values
      const data: any = {
        postgresId: order.id,
        restaurantId: order.restaurant_id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        tipAmount: Number(order.tip_amount),
        discountAmount: Number(order.discount_amount),
        depositUsed: Number(order.deposit_used),
        totalAmount: Number(order.total_amount),
        paymentStatus: order.payment_status,
        createdAt: order.created_at.getTime(),
        updatedAt: order.updated_at.getTime(),
      };
      
      // Add optional fields only if they have truthy values
      // This ensures null/undefined are never sent to Convex
      if (order.table_id) data.tableId = order.table_id;
      if (order.customer_name) data.customerName = order.customer_name;
      if (order.customer_phone) data.customerPhone = order.customer_phone;
      if (order.customer_session_id) data.customerSessionId = order.customer_session_id;
      if (order.payment_method) data.paymentMethod = order.payment_method;
      if (order.payment_transaction_id) data.paymentTransactionId = order.payment_transaction_id;
      if (order.notes) data.notes = order.notes;
      if (order.special_instructions) data.specialInstructions = order.special_instructions;
      if (order.estimated_ready_time) data.estimatedReadyTime = order.estimated_ready_time.getTime();
      if (order.completed_at) data.completedAt = order.completed_at.getTime();
      if (order.cancelled_at) data.cancelledAt = order.cancelled_at.getTime();
      if (order.cancellation_reason) data.cancellationReason = order.cancellation_reason;
      if (order.deleted_at) data.deletedAt = order.deleted_at.getTime();
      
      await this.getClient().mutation(api.orders.upsertOrder, data);

      // Sync order items
      for (const item of items) {
        const itemData: any = {
          postgresId: item.id,
          restaurantId: item.restaurant_id,
          postgresOrderId: order.id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          customizations: item.customizations || [],
          createdAt: item.created_at.getTime(),
          updatedAt: item.updated_at.getTime(),
        };
        
        if (item.menu_item_id) itemData.menuItemId = item.menu_item_id;
        if (item.special_instructions) itemData.specialInstructions = item.special_instructions;
        if (item.deleted_at) itemData.deletedAt = item.deleted_at.getTime();
        
        await this.getClient().mutation(api.orderItems.upsertOrderItem, itemData);
      }
    }, 'order', order.id);
  }

  async syncMenuItem(item: MenuItem): Promise<{ success: boolean; error?: string }> {
    if (!api) {
      return { success: false, error: 'Convex not initialized' };
    }
    
    return this.withRetry(async () => {
      await this.getClient().mutation(api.menuItems.upsertMenuItem, {
        postgresId: item.id,
        restaurantId: item.restaurant_id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.image_url,
        isAvailable: item.is_available,
        isVegetarian: item.is_vegetarian,
        isVegan: item.is_vegan,
        allergens: item.allergens,
        preparationTimeMinutes: item.preparation_time_minutes,
        calories: item.calories,
        displayOrder: item.display_order,
        createdAt: item.created_at.getTime(),
        updatedAt: item.updated_at.getTime(),
        deletedAt: item.deleted_at?.getTime(),
      });
    }, 'menuItem', item.id);
  }

  async syncTable(table: Table): Promise<{ success: boolean; error?: string }> {
    if (!api) {
      return { success: false, error: 'Convex not initialized' };
    }
    
    return this.withRetry(async () => {
      await this.getClient().mutation(api.tables.upsertTable, {
        postgresId: table.id,
        restaurantId: table.restaurant_id,
        tableNumber: table.table_number,
        zoneName: table.zone_name,
        capacity: table.capacity,
        qrCode: table.qr_code,
        isActive: table.is_active,
        createdAt: table.created_at.getTime(),
        updatedAt: table.updated_at.getTime(),
        deletedAt: table.deleted_at?.getTime(),
      });
    }, 'table', table.id);
  }

  async syncPayment(payment: Payment): Promise<{ success: boolean; error?: string }> {
    if (!api) {
      return { success: false, error: 'Convex not initialized' };
    }
    
    return this.withRetry(async () => {
      await this.getClient().mutation(api.payments.upsertPayment, {
        postgresId: payment.id,
        restaurantId: payment.restaurant_id,
        postgresOrderId: payment.order_id,
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method,
        paymentGateway: payment.payment_gateway,
        transactionId: payment.transaction_id,
        gatewayResponse: payment.gateway_response,
        status: payment.status,
        paidAt: payment.paid_at?.getTime(),
        refundedAt: payment.refunded_at?.getTime(),
        refundReason: payment.refund_reason,
        createdAt: payment.created_at.getTime(),
        updatedAt: payment.updated_at.getTime(),
        deletedAt: payment.deleted_at?.getTime(),
      });
    }, 'payment', payment.id);
  }

  async deleteEntity(
    entityType: 'order' | 'menuItem' | 'table' | 'payment',
    postgresId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!api) {
      return { success: false, error: 'Convex not initialized' };
    }
    
    return this.withRetry(async () => {
      switch (entityType) {
        case 'order':
          await this.getClient().mutation(api.orders.deleteOrder, { postgresId });
          break;
        case 'menuItem':
          await this.getClient().mutation(api.menuItems.deleteMenuItem, { postgresId });
          break;
        case 'table':
          await this.getClient().mutation(api.tables.deleteTable, { postgresId });
          break;
        case 'payment':
          await this.getClient().mutation(api.payments.deletePayment, { postgresId });
          break;
      }
    }, entityType, postgresId);
  }

  async getOrders(restaurantId: string, filters?: any) {
    if (!api) {
      throw new Error('Convex not initialized');
    }
    
    try {
      return await this.getClient().query(api.orders.listOrders, {
        restaurantId,
        ...filters,
      });
    } catch (error: any) {
      logger.error('Failed to query orders from Convex', { restaurantId, error: error.message });
      throw error;
    }
  }

  async getOrder(postgresId: string) {
    if (!api) {
      throw new Error('Convex not initialized');
    }
    
    try {
      return await this.getClient().query(api.orders.getOrder, { postgresId });
    } catch (error: any) {
      logger.error('Failed to query order from Convex', { postgresId, error: error.message });
      throw error;
    }
  }
}

export const convexClient = new ConvexClient();
