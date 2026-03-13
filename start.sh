#!/bin/bash

# OrderZap Startup Script
# This script starts both the Next.js frontend and Convex backend

echo "🚀 Starting OrderZap..."
echo ""

# Check if we're in the right directory
if [ ! -d "user-side" ]; then
    echo "❌ Error: user-side directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Navigate to user-side directory
cd user-side

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "Please create .env.local with your Convex and Razorpay credentials."
    exit 1
fi

echo "✅ Starting OrderZap on port 3001..."
echo ""
echo "📱 Frontend: http://localhost:3001"
echo "🔧 Convex Dashboard: Check terminal output for URL"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start both frontend and backend in parallel
npm run dev
