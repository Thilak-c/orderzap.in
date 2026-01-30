/**
 * Order Controller - MVP Version
 * Handles HTTP requests for orders
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { orderService } from '../../services/OrderService';
import { validate, createOrderSchema, updateOrderSchema } from '../../utils/validation';
import { logger } from '../../utils/logger';

export class OrderController {
  /**
   * POST /api/orders - Create new order
   */
  async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.user!.restaurantId;
      const validatedData = validate(createOrderSchema, req.body);

      const result = await orderService.createOrder(restaurantId, validatedData);

      res.status(201).json({
        success: true,
        data: {
          order: result.order,
          items: result.items,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders - List orders
   */
  async listOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.user!.restaurantId;
      const filters = {
        status: req.query.status as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const orders = await orderService.listOrders(restaurantId, filters);

      res.json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/:id - Get single order
   */
  async getOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.user!.restaurantId;
      const orderId = req.params.id;

      const result = await orderService.getOrder(restaurantId, orderId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/orders/:id - Update order
   */
  async updateOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.user!.restaurantId;
      const orderId = req.params.id;
      const validatedData = validate(updateOrderSchema, req.body);

      if (validatedData.status) {
        const order = await orderService.updateOrderStatus(
          restaurantId,
          orderId,
          validatedData.status
        );

        return res.json({
          success: true,
          data: order,
        });
      }

      res.json({
        success: true,
        message: 'No updates provided',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/orders/:id - Soft delete order
   */
  async deleteOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.user!.restaurantId;
      const orderId = req.params.id;

      await orderService.deleteOrder(restaurantId, orderId);

      res.json({
        success: true,
        message: 'Order deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
