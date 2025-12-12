#!/bin/bash

# Dev Orchestrator - Restart Electron App Script
# This script kills existing processes, clears cache, and restarts the app

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "  Dev Orchestrator - Restart Script"
echo "========================================="

# Kill existing processes
echo ""
echo "1. Stopping existing processes..."

# Kill electron-vite dev server
pkill -f "electron-vite dev" 2>/dev/null && echo "   Killed electron-vite processes" || true

# Kill Dev Orchestrator Electron processes (not VS Code or other Electron apps)
pkill -f "dev_orchestrator.*Electron.app" 2>/dev/null && echo "   Killed Dev Orchestrator Electron" || true

# Give processes time to exit
sleep 2

echo "   Done"

# Change to local-app directory
cd "$SCRIPT_DIR/local-app" || { echo "Error: local-app directory not found"; exit 1; }

# Clear caches
echo ""
echo "2. Clearing caches..."
rm -rf dist dist-electron node_modules/.vite 2>/dev/null
echo "   Cleared dist and vite cache"

# Ensure we're using Node 22
echo ""
echo "3. Setting up Node environment..."
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm use 22 2>/dev/null || echo "   Node 22 not available, using current version"
fi
echo "   Using Node $(node -v)"

# Unset ELECTRON_RUN_AS_NODE to ensure Electron works properly
unset ELECTRON_RUN_AS_NODE

# Start the app
echo ""
echo "4. Starting Dev Orchestrator..."
echo "========================================="
echo ""
echo "Press Ctrl+C to stop the app"
echo ""

# Run the dev server (not in background so you see output)
npm run dev
