#!/bin/bash

echo "🚀 Starting OrderZap Backend..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Copy .env.example to .env and configure it"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed!"
    echo "Run: npm install"
    exit 1
fi

# Build the project
echo "📦 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Start the server
echo "🎯 Starting server on port ${PORT:-3001}..."
echo ""
npm run dev
