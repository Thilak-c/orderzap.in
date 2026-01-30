# Troubleshooting Guide

## Server Won't Start

### Issue: "nothing hping" or no output when running `npm run dev`

**Possible Causes:**

1. **Convex not initialized**
   - The server tries to load Convex API but `convex/_generated` doesn't exist
   - **Solution**: Run `npx convex dev` in a separate terminal first
   - **Or**: The server will start anyway but Convex sync will be disabled

2. **PostgreSQL connection failed**
   - Database doesn't exist or credentials are wrong
   - **Solution**: 
     ```bash
     # Test connection
     node test-connection.js
     
     # Create database if needed
     createdb orderzap
     
     # Load schema
     psql orderzap < src/db/postgres/schema.sql
     ```

3. **Port already in use**
   - Another process is using port 3001
   - **Solution**:
     ```bash
     # Find process
     lsof -i :3001
     
     # Kill it
     kill -9 <PID>
     
     # Or change port in .env
     PORT=3002
     ```

4. **TypeScript compilation errors**
   - **Solution**:
     ```bash
     # Check for errors
     npx tsc --noEmit
     
     # Rebuild
     npm run build
     ```

5. **Missing environment variables**
   - **Solution**: Check `.env` file has all required variables
     ```bash
     # Required variables:
     DATABASE_URL=postgresql://...
     POSTGRES_HOST=localhost
     POSTGRES_PORT=5432
     POSTGRES_DB=orderzap
     POSTGRES_USER=your_user
     POSTGRES_PASSWORD=your_password
     CONVEX_DEPLOYMENT=https://...
     JWT_SECRET=your-secret
     ```

## Database Issues

### Issue: "Database connection failed"

```bash
# 1. Check if PostgreSQL is running
pg_isready

# 2. Check if database exists
psql -l | grep orderzap

# 3. Test connection with credentials from .env
psql -h localhost -U orderzap_user -d orderzap

# 4. If connection works, check if schema is loaded
psql orderzap -c "\dt"

# 5. If no tables, load schema
psql orderzap < src/db/postgres/schema.sql
```

### Issue: "relation does not exist"

Schema not loaded properly.

```bash
# Drop and recreate database
dropdb orderzap
createdb orderzap

# Load schema
psql orderzap < src/db/postgres/schema.sql

# Load test data
psql orderzap < test-data.sql
```

## Convex Issues

### Issue: "Convex API not available"

This is a warning, not an error. The server will still work but without realtime caching.

**To fix:**
```bash
# In a separate terminal
cd orderzap-backend
npx convex dev
```

This will:
1. Open your browser
2. Ask you to login/create account
3. Create a Convex project
4. Generate `convex/_generated` folder
5. Give you a deployment URL

**Then update `.env`:**
```env
CONVEX_DEPLOYMENT=https://your-deployment.convex.cloud
```

**Restart the server:**
```bash
npm run dev
```

### Issue: "Convex deployment not found"

Wrong URL in `.env`.

```bash
# Check your Convex dashboard
# URL should be: https://xxx.convex.cloud
# NOT: dev:xxx or just xxx

# Update .env
CONVEX_DEPLOYMENT=https://your-actual-deployment.convex.cloud
```

## API Issues

### Issue: "401 Unauthorized"

JWT token is missing or invalid.

**Solution:**
```bash
# Generate a valid token
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    restaurantId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@test.com',
    role: 'admin'
  },
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '7d' }
);
console.log(token);
"

# Use this token in Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/orders
```

### Issue: "404 Not Found"

Wrong endpoint or server not running.

**Check:**
```bash
# 1. Is server running?
curl http://localhost:3001/health

# 2. Check available endpoints
# POST   /api/orders
# GET    /api/orders
# GET    /api/orders/:id
# PUT    /api/orders/:id
# DELETE /api/orders/:id
```

### Issue: "500 Internal Server Error"

Check logs:

```bash
# View recent errors
tail -f logs/error.log

# View all logs
tail -f logs/app.log

# View last 50 lines
tail -50 logs/app.log
```

## Testing Issues

### Issue: test-api.sh fails

```bash
# 1. Make sure server is running
curl http://localhost:3001/health

# 2. Make sure test data is loaded
psql orderzap -c "SELECT * FROM restaurants WHERE id = '550e8400-e29b-41d4-a716-446655440000';"

# 3. Make script executable
chmod +x test-api.sh

# 4. Run with bash explicitly
bash test-api.sh
```

## Performance Issues

### Issue: Slow queries

```bash
# Check database connections
psql orderzap -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql orderzap -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Issue: Too many connections

```bash
# Check current connections
psql orderzap -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'orderzap';"

# Reduce max connections in pool.ts
# Change: max: 20 to max: 10
```

## Development Tips

### View Real-time Logs

```bash
# Terminal 1: Run Convex
npx convex dev

# Terminal 2: Run server
npm run dev

# Terminal 3: Watch logs
tail -f logs/app.log
```

### Quick Reset

```bash
# Reset everything
dropdb orderzap
createdb orderzap
psql orderzap < src/db/postgres/schema.sql
psql orderzap < test-data.sql
npm run dev
```

### Debug Mode

Add to `.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Restart server to see detailed logs.

## Common Error Messages

### "ECONNREFUSED"
- PostgreSQL not running
- Wrong host/port in .env
- Firewall blocking connection

### "password authentication failed"
- Wrong username/password in .env
- User doesn't exist in PostgreSQL

### "database does not exist"
- Run: `createdb orderzap`

### "Cannot find module"
- Run: `npm install`
- Check node_modules exists

### "Port 3001 already in use"
- Another server is running
- Kill it or change PORT in .env

### "JWT malformed"
- Token is invalid
- Generate new token with correct JWT_SECRET

## Still Having Issues?

1. **Check logs**: `tail -f logs/*.log`
2. **Test connection**: `node test-connection.js`
3. **Verify setup**: `bash check-setup.sh`
4. **Read docs**: See START_HERE.md and TESTING_GUIDE.md

## Quick Diagnostic

Run this to check everything:

```bash
echo "=== System Check ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "PostgreSQL: $(psql --version | head -1)"
echo ""
echo "=== Files Check ==="
ls -la .env && echo "✅ .env exists" || echo "❌ .env missing"
ls -la node_modules && echo "✅ node_modules exists" || echo "❌ node_modules missing"
ls -la convex/_generated && echo "✅ Convex initialized" || echo "⚠️  Convex not initialized"
echo ""
echo "=== Database Check ==="
psql -l | grep orderzap && echo "✅ Database exists" || echo "❌ Database missing"
echo ""
echo "=== Server Check ==="
curl -s http://localhost:3001/health && echo "✅ Server running" || echo "❌ Server not running"
```

Save this as `diagnose.sh`, make it executable (`chmod +x diagnose.sh`), and run it (`./diagnose.sh`).
