/**
 * Order Routes - MVP Version
 */

import { Router } from 'express';
import { orderController } from '../controllers/OrderController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/orders - Create order
router.post('/', (req, res, next) => orderController.createOrder(req, res, next));

// GET /api/orders - List orders
router.get('/', (req, res, next) => orderController.listOrders(req, res, next));

// GET /api/orders/:id - Get single order
router.get('/:id', (req, res, next) => orderController.getOrder(req, res, next));

// PUT /api/orders/:id - Update order
router.put('/:id', (req, res, next) => orderController.updateOrder(req, res, next));

// DELETE /api/orders/:id - Soft delete order
router.delete('/:id', (req, res, next) => orderController.deleteOrder(req, res, next));

export default router;
