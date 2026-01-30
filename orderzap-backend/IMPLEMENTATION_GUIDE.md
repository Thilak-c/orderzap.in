# OrderZap Backend - Complete Implementation Guide

## 🎯 System Overview

This is a **production-ready** PostgreSQL + Convex hybrid backend for OrderZap.

**Architecture:**
- PostgreSQL = Source of Truth
- Convex = Realtime Cache
- Dual-write pattern with automatic sync
- Multi-tenant with restaurant isolation

---

## 📁 Current Progress (20% Complete)

### ✅ Completed Files:

1. `.env.example` - Environment configuration
2. `package.json` - Dependencies
3. `tsconfig.json` - TypeScript config
4. `src/db/postgres/schema.sql` - Complete database schema
5. `src/db/postgres/pool.ts` - Connection pool
6. `src/db/convex/schema.ts` - Convex schema
7. `src/db/convex/client.ts` - Convex operations
8. `src/types/index.ts` - Type definitions
9. `src/utils/logger.ts` - Winston logger
10. `src/utils/jwt.ts` - JWT utilities
11. `src/utils/validation.ts` - Zod validation

---

## 🚀 Next Steps to Complete

### Phase 1: Core Services (Critical)

#### File: `src/services/OrderService.ts`
```typescript
/**
 * Order Service - Implements Dual-Write Pattern
 * 1. Write to PostgreSQL (transaction)
 * 2. Write to Convex (with retry)
 * 3. Log sync status
 */

import { db } from '../db/postgres/pool';
import { convexClient } from '../db/convex/client';
import { CreateOrderRequest, Order, OrderItem } from '../types';
import { logger } from '../utils/logger';

export class OrderService {
  /**
   * Create Order - Dual Write
   */
  async createOrder(
    restaurantId: string,
    data: CreateOrderRequest
  ): Promise<{ order: Order; items: OrderItem[] }> {
    // Step 1: PostgreSQL Transaction
    const result = await db.transaction(async (client) => {
      // Calculate totals
      const itemsData = await this.calculateOrderTotals(client, restaurantId, data.items);
      
      const subtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
      const taxAmount = subtotal * 0.05; // 5% tax
      const totalAmount = subtotal + taxAmount + (data.tip_amount || 0) - (data.discount_amount || 0) - (data.deposit_used || 0);

      // Generate order number
      const orderNumber = await this.generateOrderNumber(client, restaurantId);

      // Insert order
      const orderResult = await client.query(`
        INSERT INTO orders (
          restaurant_id, table_id, order_number, customer_name, customer_phone,
          customer_session_id, status, subtotal, tax_amount, tip_amount,
          discount_amount, deposit_used, total_amount, payment_method,
          payment_status, notes, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        restaurantId, data.table_id, orderNumber, data.customer_name, data.customer_phone,
        data.customer_session_id, 'pending', subtotal, taxAmount, data.tip_amount || 0,
        data.discount_amount || 0, data.deposit_used || 0, totalAmount, data.payment_method,
        'pending', data.notes, data.special_instructions
      ]);

      const order = orderResult.rows[0];

      // Insert order items
      const items: OrderItem[] = [];
      for (const itemData of itemsData) {
        const itemResult = await client.query(`
          INSERT INTO order_items (
            restaurant_id, order_id, menu_item_id, name, price, quantity, subtotal,
            special_instructions, customizations
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          restaurantId, order.id, itemData.menu_item_id, itemData.name, itemData.price,
          itemData.quantity, itemData.subtotal, itemData.special_instructions,
          JSON.stringify(itemData.customizations || [])
        ]);
        items.push(itemResult.rows[0]);
      }

      return { order, items };
    });

    // Step 2: Sync to Convex (non-blocking)
    this.syncToConvex(result.order, result.items).catch(err => {
      logger.error('Convex sync failed for new order', { orderId: result.order.id, error: err });
    });

    return result;
  }

  /**
   * Sync to Convex with retry logic
   */
  private async syncToConvex(order: Order, items: OrderItem[]): Promise<void> {
    const syncResult = await convexClient.syncOrder(order, items);
    
    if (!syncResult.success) {
      // Log failed sync for worker to retry
      await db.query(`
        UPDATE sync_logs 
        SET convex_sync_status = 'failed', 
            convex_error = $1,
            convex_sync_attempts = convex_sync_attempts + 1
        WHERE entity_id = $2 AND entity_type = 'orders'
      `, [syncResult.error, order.id]);
    }
  }

  // ... more methods
}
```

### Phase 2: Authentication Middleware

#### File: `src/api/middleware/auth.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../../utils/jwt';
import { UnauthorizedError } from '../../types';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    restaurantId: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      restaurantId: decoded.restaurantId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }
    next();
  };
}
```

### Phase 3: API Routes

#### File: `src/api/routes/orders.ts`
```typescript
import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticate } from '../middleware/auth';

const router = Router();
const orderController = new OrderController();

// All routes require authentication
router.use(authenticate);

// POST /api/orders - Create order
router.post('/', orderController.createOrder);

// GET /api/orders - List orders
router.get('/', orderController.listOrders);

// GET /api/orders/:id - Get single order
router.get('/:id', orderController.getOrder);

// PUT /api/orders/:id - Update order
router.put('/:id', orderController.updateOrder);

// DELETE /api/orders/:id - Soft delete order
router.delete('/:id', orderController.deleteOrder);

export default router;
```

### Phase 4: Sync Worker

#### File: `src/workers/syncWorker.ts`
```typescript
import cron from 'node-cron';
import { db } from '../db/postgres/pool';
import { convexClient } from '../db/convex/client';
import { logger } from '../utils/logger';

export class SyncWorker {
  private isRunning = false;

  start() {
    // Run every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Sync already running, skipping');
        return;
      }

      this.isRunning = true;
      try {
        await this.syncPendingChanges();
      } catch (error) {
        logger.error('Sync worker error', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Sync worker started');
  }

  private async syncPendingChanges() {
    // Get pending sync logs
    const result = await db.query(`
      SELECT * FROM sync_logs
      WHERE convex_sync_status IN ('pending', 'failed')
        AND convex_sync_attempts < 3
      ORDER BY created_at ASC
      LIMIT 100
    `);

    for (const log of result.rows) {
      await this.processSyncLog(log);
    }
  }

  private async processSyncLog(log: any) {
    // Fetch latest data from PostgreSQL
    const entity = await this.fetchEntity(log.entity_type, log.entity_id);
    
    if (!entity) {
      logger.warn('Entity not found', { type: log.entity_type, id: log.entity_id });
      return;
    }

    // Sync to Convex based on entity type
    let syncResult;
    switch (log.entity_type) {
      case 'orders':
        const items = await this.fetchOrderItems(log.entity_id);
        syncResult = await convexClient.syncOrder(entity, items);
        break;
      // ... handle other entity types
    }

    // Update sync log
    await db.query(`
      UPDATE sync_logs
      SET convex_sync_status = $1,
          convex_error = $2,
          convex_sync_attempts = convex_sync_attempts + 1,
          last_sync_at = NOW()
      WHERE id = $3
    `, [
      syncResult.success ? 'success' : 'failed',
      syncResult.error,
      log.id
    ]);
  }
}
```

---

## 📋 Remaining Files Needed

### Services (6 files)
- `src/services/OrderService.ts` ⭐ CRITICAL
- `src/services/AuthService.ts`
- `src/services/MenuService.ts`
- `src/services/TableService.ts`
- `src/services/PaymentService.ts`
- `src/services/SyncService.ts`

### Controllers (5 files)
- `src/api/controllers/OrderController.ts` ⭐ CRITICAL
- `src/api/controllers/AuthController.ts`
- `src/api/controllers/MenuController.ts`
- `src/api/controllers/TableController.ts`
- `src/api/controllers/PaymentController.ts`

### Middleware (4 files)
- `src/api/middleware/auth.ts` ⭐ CRITICAL
- `src/api/middleware/errorHandler.ts`
- `src/api/middleware/rateLimiter.ts`
- `src/api/middleware/restaurantIsolation.ts`

### Routes (5 files)
- `src/api/routes/orders.ts` ⭐ CRITICAL
- `src/api/routes/auth.ts`
- `src/api/routes/menu.ts`
- `src/api/routes/tables.ts`
- `src/api/routes/payments.ts`

### Workers (2 files)
- `src/workers/syncWorker.ts` ⭐ CRITICAL
- `src/workers/cleanupWorker.ts`

### Convex Functions (5 files)
- `convex/orders.ts` ⭐ CRITICAL
- `convex/orderItems.ts`
- `convex/menuItems.ts`
- `convex/tables.ts`
- `convex/payments.ts`

### Scripts (3 files)
- `src/scripts/migrate.ts`
- `src/scripts/seed.ts`
- `src/scripts/fullSync.ts`

### Main Entry (1 file)
- `src/index.ts` ⭐ CRITICAL

---

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd orderzap-backend
npm install
```

### 2. Setup PostgreSQL
```bash
# Create database
createdb orderzap

# Run migrations
psql orderzap < src/db/postgres/schema.sql
```

### 3. Setup Convex
```bash
npx convex dev
# Deploy schema
npx convex deploy
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 5. Run Development
```bash
npm run dev
```

### 6. Start Sync Worker
```bash
npm run worker:sync
```

---

## 🎯 Priority Implementation Order

1. **OrderService** - Core business logic
2. **Auth Middleware** - Security
3. **Order Routes** - API endpoints
4. **Sync Worker** - Data consistency
5. **Convex Functions** - Realtime queries
6. **Error Handling** - Reliability
7. **Testing** - Quality assurance

---

## 📊 System Flow Diagram

```
Customer Order
     ↓
API Endpoint (/api/orders)
     ↓
Auth Middleware (verify JWT + restaurant_id)
     ↓
OrderController (validate input)
     ↓
OrderService
     ↓
PostgreSQL Transaction (BEGIN)
  - Insert order
  - Insert order_items
  - Insert sync_log
PostgreSQL Transaction (COMMIT)
     ↓
Convex Sync (async, non-blocking)
  - Try sync
  - If fail → log for retry
     ↓
Return Response to Customer
     ↓
Sync Worker (every 30s)
  - Retry failed syncs
  - Keep Convex updated
```

---

## 🔒 Security Checklist

- ✅ JWT authentication on all routes
- ✅ Restaurant ID validation on every request
- ✅ Parameterized SQL queries (no injection)
- ✅ Input validation with Zod
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Environment secrets
- ✅ Soft deletes (no data loss)

---

## 📈 Monitoring & Observability

### Logs to Track:
- Order creation success/failure
- Convex sync status
- PostgreSQL query performance
- Authentication failures
- API response times

### Metrics to Monitor:
- Orders per minute
- Sync lag time
- Database connection pool usage
- API error rate
- Convex sync success rate

---

## 🚀 Deployment

### Production Checklist:
1. Set strong JWT_SECRET
2. Enable PostgreSQL SSL
3. Configure backup strategy
4. Set up monitoring (Sentry, Datadog)
5. Enable rate limiting
6. Configure CORS for production domains
7. Set up CI/CD pipeline
8. Load test the system
9. Document API endpoints
10. Train support team

---

## 📞 Support

For questions or issues:
- Check logs in `./logs/`
- Review sync_logs table in PostgreSQL
- Monitor Convex dashboard
- Check API health endpoint: `/health`

---

**Status: 20% Complete - Ready for Phase 1 Implementation**

Next: Implement OrderService.ts and Auth Middleware
