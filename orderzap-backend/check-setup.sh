#!/bin/bash

# OrderZap Backend - Setup Checker (Non-interactive)

echo "🔍 OrderZap Backend - Setup Check"
echo "=================================="
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: Not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: Not installed"
fi

# Check dependencies
if [ -d "node_modules" ] && [ -f "node_modules/express/package.json" ]; then
    echo "✅ Dependencies: Installed"
else
    echo "❌ Dependencies: Not installed (run: npm install)"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL: $(psql --version | cut -d' ' -f3)"
    
    # Check if database exists
    if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw orderzap; then
        echo "✅ Database 'orderzap': Exists"
        
        # Check if tables exist
        TABLE_COUNT=$(psql orderzap -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        if [ "$TABLE_COUNT" -gt 0 ]; then
            echo "✅ Database schema: Loaded ($TABLE_COUNT tables)"
        else
            echo "⚠️  Database schema: Not loaded (run: psql orderzap < src/db/postgres/schema.sql)"
        fi
        
        # Check if test data exists
        RESTAURANT_COUNT=$(psql orderzap -t -c "SELECT COUNT(*) FROM restaurants;" 2>/dev/null | tr -d ' ')
        if [ "$RESTAURANT_COUNT" -gt 0 ]; then
            echo "✅ Test data: Loaded ($RESTAURANT_COUNT restaurants)"
        else
            echo "⚠️  Test data: Not loaded (run: psql orderzap < test-data.sql)"
        fi
    else
        echo "⚠️  Database 'orderzap': Not found (run: createdb orderzap)"
    fi
else
    echo "❌ PostgreSQL: Not installed"
fi

# Check Convex
if [ -d "convex/_generated" ]; then
    echo "✅ Convex: Initialized"
else
    echo "⚠️  Convex: Not initialized (run: npx convex dev)"
fi

# Check .env
if [ -f ".env" ]; then
    echo "✅ .env file: Exists"
    
    # Check critical env vars
    if grep -q "CONVEX_DEPLOYMENT=your-deployment-url" .env 2>/dev/null; then
        echo "⚠️  CONVEX_DEPLOYMENT: Not configured"
    else
        echo "✅ CONVEX_DEPLOYMENT: Configured"
    fi
    
    if grep -q "DATABASE_URL=" .env 2>/dev/null; then
        echo "✅ DATABASE_URL: Configured"
    else
        echo "⚠️  DATABASE_URL: Not configured"
    fi
else
    echo "❌ .env file: Not found (copy from .env.example)"
fi

# Check if server can start
echo ""
echo "=================================="
echo "📊 Readiness Status"
echo "=================================="
echo ""

READY=true

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required"
    READY=false
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required"
    READY=false
fi

if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed"
    READY=false
fi

if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found (optional for testing)"
fi

if [ ! -d "convex/_generated" ]; then
    echo "⚠️  Convex not initialized (required for full functionality)"
fi

if [ "$READY" = true ]; then
    echo ""
    echo "✅ Backend is ready to start!"
    echo ""
    echo "Next steps:"
    echo "  1. Start Convex (if not running): npx convex dev"
    echo "  2. Start backend: npm run dev"
    echo "  3. Test API: ./test-api.sh"
else
    echo ""
    echo "❌ Some requirements are missing"
    echo "See TESTING_GUIDE.md for setup instructions"
fi

echo ""
