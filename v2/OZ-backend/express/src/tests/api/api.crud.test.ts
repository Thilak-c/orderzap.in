import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from './testApp';
import pool from '../../config/database';

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_KEY || 'test_api_key_123';
const app = createTestApp();

/**
 * Integrations tests verifying the HTTP REST abstractions over Phase 4 CRUD routes.
 */
describe('Phase 4: API REST Endpoint Verifications', () => {
  let restaurantId: string;
  let restaurantShortId: string;
  let zoneId: string;
  let tableId: string;
  let staffId: string;
  let itemId: string;
  let inventoryId: string;
  let category: string = 'Test Category';

  beforeAll(async () => {
    // Scaffold core dependencies using the API itself
    const suffix = Math.floor(Math.random() * 1000000).toString();
    
    // 1. Restaurant
    const rRes = await request(app).post('/api/v2/restaurants').set('x-api-key', API_KEY).send({
      short_id: `API-${suffix}`, name: 'API Factory Test Rest', address: '123 Test St', phone: `+1234${suffix}`, email: `factory${suffix}@test.com`
    });
    if (rRes.status !== 201) throw new Error(`beforeAll: Failed to create restaurant: ${JSON.stringify(rRes.body)}`);
    restaurantId = rRes.body.data?.id;
    restaurantShortId = rRes.body.data?.short_id;

    // 2. Zone
    const zRes = await request(app).post('/api/v2/zones').set('x-api-key', API_KEY).send({
      restaurant_id: restaurantShortId, name: `Zone ${suffix}`, description: 'Test Zone'
    });
    if (zRes.status !== 201) throw new Error(`beforeAll: Failed to create zone: ${JSON.stringify(zRes.body)}`);
    zoneId = zRes.body.data?.id;

    // 3. Table
    const tRes = await request(app).post('/api/v2/tables').set('x-api-key', API_KEY).send({
       restaurant_id: restaurantShortId, zone_id: zoneId, name: `T-${suffix}`, number: Math.floor(Math.random()*1000), capacity: 4
    });
    if (tRes.status !== 201) throw new Error(`beforeAll: Failed to create table: ${JSON.stringify(tRes.body)}`);
    tableId = tRes.body.data?.id;
    
    // 4. Staff
    const sRes = await request(app).post('/api/v2/staff').set('x-api-key', API_KEY).send({
      restaurant_id: restaurantId, name: `Staff ${suffix}`, role: 'waiter', email: `staff${suffix}@test.com`, phone: `555${suffix}`, password: 'hash'
    });
    if (sRes.status !== 201) throw new Error(`beforeAll: Failed to create staff: ${JSON.stringify(sRes.body)}`);
    staffId = sRes.body.data?.id;
    
    // 5. Item
    const iRes = await request(app).post('/api/v2/menu-items').set('x-api-key', API_KEY).send({
      restaurant_id: restaurantShortId, name: `Item ${suffix}`, price: 10, category: 'Food', description: 'Test Item Item'
    });
    if (iRes.status !== 201) throw new Error(`beforeAll: Failed to create item: ${JSON.stringify(iRes.body)}`);
    itemId = iRes.body.data?.id;

    // 6. Inventory
    const invRes = await request(app).post('/api/v2/inventory').set('x-api-key', API_KEY).send({
      restaurant_id: restaurantId, name: `Stock ${suffix}`, unit: 'kg', quantity: 100, min_stock: 10, cost_per_unit: 5, category: 'General'
    });
    if (invRes.status !== 201) throw new Error(`beforeAll: Failed to create inventory: ${JSON.stringify(invRes.body)}`);
    inventoryId = invRes.body.data?.id;
  });

  afterAll(async () => {
    // Cleanup generated mock integration resources
    if (restaurantId) {
      await request(app).delete(`/api/v2/restaurants/${restaurantId}`).set('x-api-key', API_KEY);
    }
  });

  const endpoints = [
    {
      name: 'Restaurants',
      path: '/api/v2/restaurants',
      validPostPayload: { short_id: () => `REST-${Math.floor(Math.random() * 1000000)}`, name: 'HTTP Factory Rest', address: '123', phone: '111222', email: () => `http${Math.floor(Math.random() * 1000000)}@test.com` },
      validPutPayload: { name: 'Updated HTTP Factory Rest' },
    },
    {
      name: 'Zones',
      path: '/api/v2/zones',
      validPostPayload: { restaurant_id: () => restaurantShortId, name: 'HTTP Zone', description: 'Testing POST' },
      validPutPayload: { description: 'Updated Zone' }
    },
    {
      name: 'Tables',
      path: '/api/v2/tables',
      validPostPayload: { restaurant_id: () => restaurantShortId, zone_id: () => zoneId, name: 'T1', number: 1, capacity: 4 },
      validPutPayload: { capacity: 6 }
    },
    {
      name: 'Categories',
      path: '/api/v2/categories',
      validPostPayload: { restaurant_id: () => restaurantShortId, name: 'HTTP Category', sort_order: 1 },
      validPutPayload: { name: 'Updated Cat' }
    },
    {
      name: 'Staff',
      path: '/api/v2/staff',
      validPostPayload: { restaurant_id: () => restaurantId, name: 'API Waiter', role: 'waiter', email: () => `waiter${Math.floor(Math.random()*10000)}@test.com`, password: 'hash' },
      validPutPayload: { name: 'Updated Waiter' }
    },
    // Adding attendance explicitly to assert the 501 stub behavior
    {
      name: 'Attendance (Stub)',
      path: '/api/v2/attendance',
      isStub: true,
    },
    {
      name: 'Payroll',
      path: '/api/v2/payroll',
      validPostPayload: { restaurant_id: () => restaurantId, staff_id: () => staffId, month: '2023-10', base_salary: 1000, total_amount: 1000, days_worked: 20, total_days: 22, status: 'pending' },
      validPutPayload: { status: 'paid' }
    },
    {
      name: 'Inventory',
      path: '/api/v2/inventory',
      validPostPayload: { restaurant_id: () => restaurantId, name: 'Burger Buns', unit: 'pcs', quantity: 100, min_stock: 20, cost_per_unit: 0.5, category: 'Food' },
      validPutPayload: { quantity: 150 }
    },
    {
      name: 'Wastage',
      path: '/api/v2/wastage',
      validPostPayload: { restaurant_id: () => restaurantId, item_id: () => inventoryId, item_name: 'Stall Bun', quantity: 5, reason: 'Expired', date: '2023-10-01', cost_loss: 2.5 },
      validPutPayload: { reason: 'Dropped' }
    },
    {
      name: 'Deductions',
      path: '/api/v2/deductions',
      validPostPayload: { restaurant_id: () => restaurantId, item_id: () => inventoryId, item_name: 'Deduction Item', quantity: 1, order_id: 'ORD-123' },
      validPutPayload: { quantity: 2 }
    },
    {
      name: 'Customers',
      path: '/api/v2/customers',
      validPostPayload: { name: 'John Doe API', phone: () => `+1234${Math.floor(Math.random()*1000000)}` },
      validPutPayload: { name: 'Jonathan Doe API' }
    },
    {
      name: 'Reservations',
      path: '/api/v2/reservations',
      validPostPayload: { restaurant_id: () => restaurantId, table_id: () => tableId, table_number: 999, customer_name: 'Jane Doe', date: '2023-11-01', start_time: '18:00', end_time: '20:00', party_size: 2, status: 'confirmed' },
      validPutPayload: { status: 'cancelled' }
    },
    {
      name: 'Reviews',
      path: '/api/v2/reviews',
      validPostPayload: { restaurant_id: () => restaurantShortId, table_id: () => tableId, table_number: 999, enjoyed: true },
      validPutPayload: { feedback: 'Great service' }
    },
    {
      name: 'Subscriptions',
      path: '/api/v2/subscriptions',
      validPostPayload: { restaurant_id: () => restaurantShortId, plan_type: 'monthly', days: 30, price_per_day: 1.5, total_price: 45.0, start_date: 1696156800000, end_date: 1698748800000, payment_status: 'completed', status: 'active', created_by: 'system' },
      validPutPayload: { status: 'cancelled' }
    },
    {
      name: 'Payments',
      path: '/api/v2/payments',
      validPostPayload: { restaurant_id: () => restaurantShortId, amount: 45.0, currency: 'USD', status: 'processing' },
      validPutPayload: { status: 'completed' }
    },
    {
      name: 'Admin Users',
      path: '/api/v2/admin-users',
      validPostPayload: { email: () => `admin${Math.floor(Math.random()*10000)}@test.com`, password_hash: 'hash', name: 'Admin API', role: 'admin', permissions: { dashboard: true } },
      validPutPayload: { name: 'Admin Updated' }
    },
    {
      name: 'Activity Logs',
      path: '/api/v2/activity-logs',
      validPostPayload: { actor_type: 'system', action: 'CREATE', entity_type: 'TEST', entity_id: '123', description: 'API Test' },
      validPutPayload: null, // Immutable audit logs
      noDelete: true,
    },
    {
      name: 'Notifications',
      path: '/api/v2/notifications',
      validPostPayload: { restaurant_id: () => restaurantShortId, whatsapp_number: '+1234567' },
      validPutPayload: { alerts_enabled: false }
    },
    {
      name: 'Orders',
      path: '/api/v2/orders',
      validPostPayload: { 
        restaurant_id: () => restaurantShortId, 
        table_id: () => tableId, 
        order_number: () => `ORD-${Math.floor(Math.random()*10000)}`,
        items: () => [
          { menu_item_id: itemId, name: 'Test Pizza', price: 15.99, quantity: 2 }
        ],
        total_amount: 31.98,
        subtotal: 30.00,
        payment_method: 'card',
        payment_status: 'completed',
        customer_name: 'Test Customer'
      },
      validPutPayload: null, // Orders use status-specific PATCH/PUT usually
      noDelete: true, // Orders are typically archived/cancelled, not physically deleted in this API version
    }
  ];

  /* 
   * Dynamic factory running assertions over identical CRUD structures
   * ensuring standardized responseUtils wrap outputs appropriately.
   */
  for (const ep of endpoints) {
    describe(`${ep.name} Endpoints`, () => {
      
      if (ep.isStub) {
        it('should return 501 Not Implemented regarding Convex handling', async () => {
          const res = await request(app).get(ep.path).set('x-api-key', API_KEY);
          expect(res.status).toBe(501);
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('NOT_IMPLEMENTED');
        });
        return; // skip standard tests
      }

      let generatedId: string;

      it(`POST ${ep.path} -> 201 Created`, async () => {
        // Resolve dynamic relations
        const payload: Record<string, any> = { ...ep.validPostPayload };
        for (const [k, v] of Object.entries(payload)) {
          if (typeof v === 'function') payload[k] = v();
        }

        const res = await request(app)
          .post(ep.path)
          .set('x-api-key', API_KEY)
          .send(payload);

        if (res.status >= 400) {
          console.error(`POST ${ep.path} failed:`, res.body);
        }

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        generatedId = res.body.data.id;
      });

      it(`GET ${ep.path} -> 200 Paginated Array`, async () => {
        const res = await request(app).get(ep.path).set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
      });

      it(`GET ${ep.path}/:id -> 200 Record`, async () => {
        const res = await request(app).get(`${ep.path}/${generatedId}`).set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(generatedId);
      });

      if (ep.validPutPayload) {
        it(`PUT ${ep.path}/:id -> 200 Updated`, async () => {
          const res = await request(app)
            .put(`${ep.path}/${generatedId}`)
            .set('x-api-key', API_KEY)
            .send(ep.validPutPayload);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
        });
      }

      if (!ep.noDelete) {
        it(`DELETE ${ep.path}/:id -> 200 Deleted`, async () => {
          const res = await request(app)
            .delete(`${ep.path}/${generatedId}`)
            .set('x-api-key', API_KEY);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.deleted).toBe(true);
          
          // Assert 404 naturally follows
          const getRes = await request(app).get(`${ep.path}/${generatedId}`).set('x-api-key', API_KEY);
          expect(getRes.status).toBe(404);
        });
      }

    });
  }

  // Cross-cutting Concern Testing
  describe('Security & Middleware Constraints', () => {
    it('returns 401 UNAUTHORIZED when omitting API key header', async () => {
      const res = await request(app).get('/api/v2/restaurants');
      expect(res.status).toBe(401);
      expect(res.body.success).toBeUndefined(); // Base router lacks responseUtils formatting
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('returns 404 nicely wrapping nonexistent paths via global handler', async () => {
      const res = await request(app).get('/api/v2/non-existent-nonsense').set('x-api-key', API_KEY);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

});
