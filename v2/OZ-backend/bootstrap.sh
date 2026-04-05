#!/bin/bash
# ================================================
# OrderZap v2 -- Zero-to-Hero Bootstrapper (Linux)
# ================================================

set -e

echo "➤ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "⚠ Node.js not found. Installing via curl + NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✔ Node.js found: $(node -v)"
fi

echo "➤ Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "⚠ Docker not found. Installing via curl + get.docker.com..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "⚠ Docker installed. You may need to log out and log back in for permissions to apply."
else
    echo "✔ Docker found."
fi

echo "➤ Handoff to Setup Orchestrator (Node.js)..."
node scripts/setup.js
