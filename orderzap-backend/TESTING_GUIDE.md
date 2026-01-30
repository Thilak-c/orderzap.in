# 🧪 OrderZap Backend - Complete Testing Guide

## Prerequisites Check

Before starting, verify you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ PostgreSQL 12+ installed (`psql --version`)
- ✅ npm installed (`npm --version`)

## Step 1: Install Dependencies

```bash
cd orderzap-backend
npm install
```

This will install all required packages including Express, PostgreSQL client, Convex, JWT, etc.

## Step 2: Setup PostgreSQL Database

### Option A: Using Local PostgreSQL

```bash
# Create database
createdb orderzap

# Or if you need to specify user
createdb -U postgres orderzap

# Load schema
psql orderzap < src/db/postgres/schema.sql

# Load test data
psql orderzap < test-data.sql
```

### Option B: Using Docker

```bash
# Start PostgreSQL container
docker run --name orderzap-postgres \
  -e POSTGRES_DB=orderzap \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Wait 5 seconds for container to start
sleep 5

# Load schema
docker exec -i orderzap-postgres psql -U admin -d orderzap < src/db/postgres/schema.sql

# Load test data
docker exec -i orderzap-postgres psql -U admin -d orderzap < test-data.sql
```

### Verify Database Setup

```bash
# Connect to database
psql orderzap

# Or with Docker
docker exec -it orderzap-postgres psql -U admin -d orderzap

# Check tables
\dt

# Check test data
SELECT * FROM restaurants;
SELECT * FROM users;
SELECT * FROM menu_items;

# Exit
\q
```

## Step 3: Setup Convex

```bash
# Install Convex CLI globally (if not already installed)
npm install -g convex

# Initialize Convex in the project
npx convex dev
```

This will:
1. Open your browser to create/login to Convex account
2. Create a new Convex project
3. Generate `convex/_generated` folder
4. Give you a deployment URL

**IMPORTANT**: Copy the deployment URL from the terminal output!

## Step 4: Configure Environment Variables

Edit the `.env` file:

```bash
# If using local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/orderzap
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=orderzap
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# If using Docker PostgreSQL
DATABASE_URL=postgresql://admin:password@localhost:5432/orderzap
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=orderzap
POSTGRES_USER=admin
POSTGRES_PASSWORD=password

# Convex (paste your deployment URL from Step 3)
CONVEX_DEPLOYMENT=https://your-deployment.convex.cloud

# JWT Secret (change this!)
JWT_SECRET=my-super-secret-key-change-this-in-production

# Server
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Leave other settings as default
```

## Step 5: Start the Backend Server

```bash
# Development mode (with auto-reload)
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

## Step 6: Test the API

### Manual Testing with curl

Open a new terminal and run:

```bash
# Test 1: Health Check
curl http://localhost:3001/health

# Expected: {"status":"ok","timestamp":"...","database":{...}}
```

### Automated Testing Script

Make the test script executable and run it:

```bash
chmod +x test-api.sh
./test-api.sh
```

The script will prompt you for:
- Restaurant ID: `550e8400-e29b-41d4-a716-446655440000`
- User ID: `550e8400-e29b-41d4-a716-446655440001`
- Email: `admin@test.com`
- Menu Item ID: `550e8400-e29b-41d4-a716-446655440023` (Chicken Burger)

It will test:
1. ✅ Health check
2. ✅ JWT token generation
3. ✅ Create order
4. ✅ List orders
5. ✅ Get single order
6. ✅ Update order status
7. ✅ Authentication enforcement

## Step 7: Verify Dual-Write System

### Check PostgreSQL

```bash
# Connect to database
psql orderzap

# View orders
SELECT id, order_number, status, total_amount, created_at 
FROM orders 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT 5;

# View order items
SELECT oi.id, oi.quantity, mi.name, oi.price 
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE oi.deleted_at IS NULL
ORDER BY oi.created_at DESC
LIMIT 10;
```

### Check Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Click "Data" tab
4. Check `orders` and `orderItems` tables
5. Verify the same data exists in both PostgreSQL and Convex

## Step 8: Test Fallback System

### Simulate Convex Outage

1. Stop Convex dev server (Ctrl+C in the terminal running `npx convex dev`)
2. Try to fetch an order:

```bash
# Generate token first
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  {userId: '550e8400-e29b-41d4-a716-446655440001', restaurantId: '550e8400-e29b-41d4-a716-446655440000', email: 'admin@test.com', role: 'admin'},
  'my-super-secret-key-change-this-in-production',
  {expiresIn: '7d'}
));
")

# Fetch orders (should still work from PostgreSQL)
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer $TOKEN"
```

3. Restart Convex: `npx convex dev`
4. Next read will repair the Convex cache

## Step 9: Check Logs

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View all logs
tail -f logs/*.log
```

## Common Issues & Solutions

### Issue: "Database connection failed"

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Or with Docker
docker ps | grep orderzap-postgres

# Test connection manually
psql -h localhost -U postgres -d orderzap
```

### Issue: "Convex deployment not found"

**Solution:**
1. Make sure `npx convex dev` is running
2. Check `.env` has correct `CONVEX_DEPLOYMENT` URL
3. Verify `convex/_generated` folder exists

### Issue: "JWT token invalid"

**Solution:**
1. Check `JWT_SECRET` in `.env` matches the one used to generate token
2. Verify token hasn't expired (default 7 days)
3. Use jwt.io to decode and inspect the token

### Issue: "Port 3001 already in use"

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT=3002
```

### Issue: "Cannot find module 'express'"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] PostgreSQL running and accessible
- [ ] Database schema loaded
- [ ] Test data loaded
- [ ] Convex project created and running
- [ ] `.env` configured correctly
- [ ] Backend server starts without errors
- [ ] Health check returns 200 OK
- [ ] Can create orders via API
- [ ] Orders appear in PostgreSQL
- [ ] Orders appear in Convex dashboard
- [ ] Can list and fetch orders
- [ ] Can update order status
- [ ] Authentication is enforced
- [ ] Logs are being written

## Next Steps

Once all tests pass:

1. **Connect Frontend**: Update `user-side/.env.local` with backend URL
2. **Add More Endpoints**: Menu, tables, payments, etc.
3. **Add Sync Worker**: Background job to retry failed Convex syncs
4. **Add WebSockets**: Real-time order updates using Convex subscriptions
5. **Deploy**: Use Railway, Render, or VPS for production

## Success Criteria

Your backend is working correctly when:
- ✅ All API endpoints respond correctly
- ✅ Data is written to both PostgreSQL and Convex
- ✅ Reads fallback to PostgreSQL when Convex is down
- ✅ Restaurant isolation is enforced
- ✅ Authentication works properly
- ✅ Logs show no errors

---

**Need Help?** Check logs in `./logs/` directory for detailed error messages.
