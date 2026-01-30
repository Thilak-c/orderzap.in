#!/bin/bash

# OrderZap Backend - Quick Start Script
# This script helps you get the backend running quickly

set -e  # Exit on error

echo "🚀 OrderZap Backend - Quick Start"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Step 2: Check npm
echo ""
echo "2️⃣  Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Step 3: Install dependencies
echo ""
echo "3️⃣  Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Step 4: Check PostgreSQL
echo ""
echo "4️⃣  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✓ PostgreSQL installed: $PSQL_VERSION${NC}"
    
    # Ask if user wants to setup database
    echo ""
    read -p "Do you want to setup the database now? (y/n): " SETUP_DB
    
    if [ "$SETUP_DB" = "y" ] || [ "$SETUP_DB" = "Y" ]; then
        echo ""
        echo "Setting up database..."
        
        # Check if database exists
        if psql -lqt | cut -d \| -f 1 | grep -qw orderzap; then
            echo -e "${YELLOW}Database 'orderzap' already exists${NC}"
            read -p "Do you want to recreate it? (y/n): " RECREATE
            
            if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
                dropdb orderzap 2>/dev/null || true
                createdb orderzap
                echo -e "${GREEN}✓ Database recreated${NC}"
            fi
        else
            createdb orderzap
            echo -e "${GREEN}✓ Database created${NC}"
        fi
        
        # Load schema
        echo "Loading schema..."
        psql orderzap < src/db/postgres/schema.sql > /dev/null 2>&1
        echo -e "${GREEN}✓ Schema loaded${NC}"
        
        # Load test data
        echo "Loading test data..."
        psql orderzap < test-data.sql > /dev/null 2>&1
        echo -e "${GREEN}✓ Test data loaded${NC}"
        
        echo ""
        echo -e "${GREEN}✅ Database setup complete!${NC}"
        echo ""
        echo "Test credentials:"
        echo "  Restaurant ID: 550e8400-e29b-41d4-a716-446655440000"
        echo "  User ID: 550e8400-e29b-41d4-a716-446655440001"
        echo "  Email: admin@test.com"
        echo "  Password: password123"
    fi
else
    echo -e "${YELLOW}⚠ PostgreSQL not found${NC}"
    echo "You can:"
    echo "  1. Install PostgreSQL locally"
    echo "  2. Use Docker: docker run --name orderzap-postgres -e POSTGRES_DB=orderzap -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15"
fi

# Step 5: Check Convex
echo ""
echo "5️⃣  Checking Convex..."
if [ -d "convex/_generated" ]; then
    echo -e "${GREEN}✓ Convex already initialized${NC}"
else
    echo -e "${YELLOW}⚠ Convex not initialized${NC}"
    echo "Run: npx convex dev"
    echo "This will open your browser to setup Convex"
fi

# Step 6: Check .env
echo ""
echo "6️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check if CONVEX_DEPLOYMENT is set
    if grep -q "CONVEX_DEPLOYMENT=your-deployment-url" .env; then
        echo -e "${YELLOW}⚠ Please update CONVEX_DEPLOYMENT in .env${NC}"
    fi
    
    # Check if JWT_SECRET is default
    if grep -q "JWT_SECRET=your-super-secret-jwt-key" .env; then
        echo -e "${YELLOW}⚠ Please update JWT_SECRET in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Copying from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
fi

# Summary
echo ""
echo "=================================="
echo "📋 Setup Summary"
echo "=================================="
echo ""

if command -v psql &> /dev/null && [ -d "convex/_generated" ]; then
    echo -e "${GREEN}✅ All prerequisites met!${NC}"
    echo ""
    echo "To start the backend:"
    echo "  1. Make sure Convex is running: npx convex dev (in another terminal)"
    echo "  2. Start the server: npm run dev"
    echo "  3. Test the API: ./test-api.sh"
    echo ""
    echo "Server will be available at: http://localhost:3001"
else
    echo -e "${YELLOW}⚠ Some setup steps remaining:${NC}"
    echo ""
    
    if ! command -v psql &> /dev/null; then
        echo "  • Install and setup PostgreSQL"
    fi
    
    if [ ! -d "convex/_generated" ]; then
        echo "  • Initialize Convex: npx convex dev"
    fi
    
    echo ""
    echo "See TESTING_GUIDE.md for detailed instructions"
fi

echo ""
echo "=================================="
