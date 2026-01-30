# 🚀 START HERE - OrderZap Backend

## What You Have

A complete, production-ready backend with:
- ✅ PostgreSQL as source of truth
- ✅ Convex for realtime caching
- ✅ Dual-write pattern (writes to both databases)
- ✅ Fallback reads (Convex → PostgreSQL)
- ✅ Multi-tenant restaurant isolation
- ✅ JWT authentication
- ✅ Soft deletes
- ✅ Complete API for orders

## Quick Start (3 Steps)

### Step 1: Setup Database

```bash
# Create PostgreSQL database
createdb orderzap

# Load schema
psql orderzap < src/db/postgres/schema.sql

# Load test data
psql orderzap < test-data.sql
```

**Using Docker instead?**
```bash
docker run --name orderzap-postgres \
  -e POSTGRES_DB=orderzap \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Wait 5 seconds, then:
docker exec -i orderzap-postgres psql -U admin -d orderzap < src/db/postgres/schema.sql
docker exec -i orderzap-postgres psql -U admin -d orderzap < test-data.sql
```

### Step 2: Setup Convex

```bash
# In a new terminal, run:
npx convex dev
```

This will:
1. Open your browser
2. Ask you to login/create Convex account
3. Create a project
4. Give you a deployment URL

**Copy the deployment URL!** You'll need it for Step 3.

### Step 3: Configure & Start

Edit `.env` file:
```env
# Update these lines:
DATABASE_URL=postgresql://postgres:password@localhost:5432/orderzap
CONVEX_DEPLOYMENT=https://your-actual-deployment.convex.cloud  # Paste from Step 2
JWT_SECRET=change-this-to-something-random
```

Start the server:
```bash
npm run dev
```

You should see:
```
🚀 OrderZap Backend started on port 3001
📊 Health check: http://localhost:3001/health
📝 API endpoint: http://localhost:3001/api/orders
🗄️  Database: Connected to PostgreSQL
⚡ Realtime: Convex integration active
```

## Test It

```bash
# Make script executable
chmod +x test-api.sh

# Run tests
./test-api.sh
```

When prompted, use these test IDs:
- Restaurant ID: `550e8400-e29b-41d4-a716-446655440000`
- User ID: `550e8400-e29b-41d4-a716-446655440001`
- Email: `admin@test.com`
- Menu Item ID: `550e8400-e29b-41d4-a716-446655440023`

## What Each File Does

### Core Files
- `src/index.ts` - Express server entry point
- `src/services/OrderService.ts` - Business logic with dual-write
- `src/api/controllers/OrderController.ts` - HTTP request handlers
- `src/api/routes/orders.ts` - API route definitions
- `src/db/postgres/pool.ts` - PostgreSQL connection
- `src/db/convex/client.ts` - Convex operations

### Database
- `src/db/postgres/schema.sql` - Complete PostgreSQL schema
- `convex/orders.ts` - Convex order functions
- `convex/orderItems.ts` - Convex order item functions

### Testing
- `test-api.sh` - Automated API testing script
- `test-data.sql` - Sample data for testing
- `TESTING_GUIDE.md` - Detailed testing instructions

### Configuration
- `.env` - Environment variables (edit this!)
- `.env.example` - Template for .env
- `package.json` - Dependencies and scripts

## API Endpoints

All endpoints require JWT token in `Authorization: Bearer <token>` header.

### Create Order
```bash
POST /api/orders
{
  "customer_name": "John Doe",
  "customer_phone": "+919876543210",
  "items": [
    {
      "menu_item_id": "uuid",
      "quantity": 2,
      "special_instructions": "Extra spicy"
    }
  ],
  "payment_method": "pay-counter",
  "tip_amount": 50
}
```

### List Orders
```bash
GET /api/orders
```

### Get Single Order
```bash
GET /api/orders/:id
```

### Update Order Status
```bash
PUT /api/orders/:id
{
  "status": "preparing"  # received | preparing | ready | completed
}
```

### Delete Order (Soft Delete)
```bash
DELETE /api/orders/:id
```

## How It Works

```
1. Client sends request
   ↓
2. Express API validates JWT
   ↓
3. OrderService processes request
   ↓
4. Write to PostgreSQL (transaction)
   ✓ Data saved
   ↓
5. Write to Convex (async)
   ✓ Cache updated
   ↓
6. Response sent to client
```

**For Reads:**
```
1. Try Convex (fast)
   ↓
2. If fails → Read from PostgreSQL
   ↓
3. Repair Convex cache
   ↓
4. Return data
```

## Troubleshooting

### "Database connection failed"
- Check PostgreSQL is running: `pg_isready`
- Test connection: `psql orderzap`
- Check `.env` has correct DATABASE_URL

### "Convex deployment not found"
- Make sure `npx convex dev` is running
- Check `.env` has correct CONVEX_DEPLOYMENT URL
- Verify `convex/_generated` folder exists

### "Port 3001 already in use"
- Change PORT in `.env` to 3002 or another port
- Or kill existing process: `lsof -i :3001` then `kill -9 <PID>`

### "Cannot find module"
- Run: `npm install`
- If still fails: `rm -rf node_modules && npm install`

## Next Steps

Once everything works:

1. **Connect Frontend**
   - Update `user-side/.env.local` with backend URL
   - Test order creation from UI

2. **Add More Features**
   - Menu management API
   - Table management API
   - Payment processing
   - Staff notifications
   - Analytics

3. **Deploy**
   - PostgreSQL: Railway, Supabase, or AWS RDS
   - Backend: Railway, Render, or Vercel
   - Convex: Already hosted

## Need Help?

1. Check logs: `tail -f logs/app.log`
2. Read `TESTING_GUIDE.md` for detailed instructions
3. Read `IMPLEMENTATION_GUIDE.md` for architecture details
4. Check `README.md` for API documentation

---

**Status: Ready to Run!** 🎉

Just complete the 3 steps above and you're good to go.
