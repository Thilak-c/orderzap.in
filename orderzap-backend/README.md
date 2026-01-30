# OrderZap Backend - MVP Version

## 🎯 What This Is

A **simplified but production-ready** backend for OrderZap that implements:
- ✅ PostgreSQL as source of truth
- ✅ Convex as realtime cache
- ✅ Dual-write pattern with fallback
- ✅ Multi-tenant restaurant isolation
- ✅ JWT authentication
- ✅ Soft deletes
- ✅ Error handling

## 📦 What's Included

### Core Files (MVP):
1. **Database Layer**
   - `src/db/postgres/schema.sql` - Complete schema
   - `src/db/postgres/pool.ts` - Connection pool
   - `src/db/convex/schema.ts` - Convex schema
   - `src/db/convex/client.ts` - Convex operations

2. **Business Logic**
   - `src/services/OrderService.ts` - Order CRUD with dual-write

3. **API Layer**
   - `src/api/controllers/OrderController.ts` - HTTP handlers
   - `src/api/routes/orders.ts` - Route definitions
   - `src/api/middleware/auth.ts` - JWT authentication
   - `src/api/middleware/errorHandler.ts` - Error handling

4. **Utilities**
   - `src/utils/logger.ts` - Winston logging
   - `src/utils/jwt.ts` - Token management
   - `src/utils/validation.ts` - Zod validation

5. **Convex Functions**
   - `convex/orders.ts` - Order mutations/queries
   - `convex/orderItems.ts` - Order item operations

6. **Entry Point**
   - `src/index.ts` - Express server

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd orderzap-backend
npm install
```

### 2. Setup PostgreSQL
```bash
# Create database
createdb orderzap

# Run schema
psql orderzap < src/db/postgres/schema.sql

# Or using Docker
docker run --name orderzap-postgres \
  -e POSTGRES_DB=orderzap \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Setup Convex
```bash
# Install Convex CLI
npm install -g convex

# Initialize Convex project
npx convex dev

# This will:
# - Create a Convex project
# - Generate convex/_generated folder
# - Give you a deployment URL
```

### 4. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
# PostgreSQL
DATABASE_URL=postgresql://admin:password@localhost:5432/orderzap
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=orderzap
POSTGRES_USER=admin
POSTGRES_PASSWORD=password

# Convex (from npx convex dev)
CONVEX_DEPLOYMENT=https://your-deployment.convex.cloud

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 5. Create Test Data
```sql
-- Connect to PostgreSQL
psql orderzap

-- Create a test restaurant
INSERT INTO restaurants (name, slug, email, currency)
VALUES ('Test Restaurant', 'test-restaurant', 'test@restaurant.com', 'INR')
RETURNING id;

-- Create a test user (save the restaurant_id from above)
INSERT INTO users (restaurant_id, email, password_hash, full_name, role)
VALUES (
  'YOUR_RESTAURANT_ID_HERE',
  'admin@test.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWYgmmK6', -- password: "password123"
  'Admin User',
  'admin'
);

-- Create test menu items
INSERT INTO menu_items (restaurant_id, name, price, is_available)
VALUES 
  ('YOUR_RESTAURANT_ID_HERE', 'Burger', 299.00, true),
  ('YOUR_RESTAURANT_ID_HERE', 'Pizza', 499.00, true),
  ('YOUR_RESTAURANT_ID_HERE', 'Pasta', 349.00, true);
```

### 6. Run the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

Server will start on `http://localhost:3001`

## 📝 API Usage

### 1. Get JWT Token (Manual for MVP)
```javascript
// In Node.js or browser console
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'YOUR_USER_ID',
    restaurantId: 'YOUR_RESTAURANT_ID',
    email: 'admin@test.com',
    role: 'admin'
  },
  'your-super-secret-key-change-this',
  { expiresIn: '7d' }
);

console.log(token);
```

### 2. Create Order
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "+919876543210",
    "items": [
      {
        "menu_item_id": "MENU_ITEM_UUID",
        "quantity": 2,
        "special_instructions": "Extra cheese"
      }
    ],
    "payment_method": "pay-counter",
    "tip_amount": 50
  }'
```

### 3. List Orders
```bash
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Single Order
```bash
curl http://localhost:3001/api/orders/ORDER_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Update Order Status
```bash
curl -X PUT http://localhost:3001/api/orders/ORDER_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "preparing"
  }'
```

### 6. Delete Order
```bash
curl -X DELETE http://localhost:3001/api/orders/ORDER_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔍 Testing the System

### Test Dual-Write Pattern:
1. Create an order via API
2. Check PostgreSQL: `SELECT * FROM orders;`
3. Check Convex dashboard: Should see the same order
4. Update order status
5. Both databases should reflect the change

### Test Fallback Read:
1. Stop Convex (simulate outage)
2. Try to fetch an order
3. Should still work (reads from PostgreSQL)
4. Restart Convex
5. Next read will repair Convex cache

## 📊 Architecture Flow

```
Client Request
     ↓
Express API (/api/orders)
     ↓
Auth Middleware (verify JWT)
     ↓
OrderController (validate input)
     ↓
OrderService
     ↓
PostgreSQL (WRITE - Transaction)
  ✓ Order created
  ✓ Items inserted
  ✓ Sync log created
     ↓
Convex (WRITE - Async)
  ✓ Order synced
  ✓ Items synced
  ✗ If fails → logged for retry
     ↓
Response to Client
```

## 🎯 What's NOT Included (But Easy to Add)

- Auth endpoints (login/register) - Use existing JWT utils
- Menu management - Similar to orders
- Table management - Similar to orders
- Payment processing - Add payment gateway
- Sync worker - Cron job to retry failed syncs
- WebSocket notifications - Use Convex subscriptions
- Rate limiting - Add express-rate-limit
- API documentation - Add Swagger

## 🔧 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
psql $DATABASE_URL
```

### Convex Sync Failed
```bash
# Check Convex deployment
npx convex dev

# View logs
tail -f logs/app.log
```

### JWT Token Invalid
- Check JWT_SECRET matches in .env
- Verify token hasn't expired
- Use jwt.io to decode and inspect token

## 📈 Next Steps

1. **Add Auth Endpoints** - Login/register routes
2. **Add Sync Worker** - Retry failed Convex syncs
3. **Add Menu APIs** - CRUD for menu items
4. **Add WebSockets** - Real-time order updates
5. **Add Tests** - Jest unit/integration tests
6. **Add Monitoring** - Sentry, Datadog, etc.
7. **Deploy** - Vercel, Railway, or VPS

## 🎉 Success Criteria

You have a working MVP when:
- ✅ You can create orders via API
- ✅ Orders appear in both PostgreSQL and Convex
- ✅ You can list and fetch orders
- ✅ Status updates sync to both databases
- ✅ Soft deletes work correctly
- ✅ Restaurant isolation is enforced
- ✅ Errors are logged properly

## 📞 Support

Check logs in `./logs/app.log` for debugging.

---

**Status: MVP Complete - Ready to Run!** 🚀
