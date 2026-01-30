#!/bin/bash

# OrderZap Backend Setup Script
# This script helps you set up the MVP backend quickly

echo "🚀 OrderZap Backend Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL CLI not found. Make sure PostgreSQL is installed."
else
    echo "✅ PostgreSQL detected"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your credentials."
else
    echo "✅ .env already exists"
fi

# Create logs directory
mkdir -p logs
echo "✅ Logs directory created"

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your database credentials"
echo "2. Create PostgreSQL database: createdb orderzap"
echo "3. Run schema: psql orderzap < src/db/postgres/schema.sql"
echo "4. Setup Convex: npx convex dev"
echo "5. Start server: npm run dev"
echo ""
echo "📖 See README.md for detailed instructions"
