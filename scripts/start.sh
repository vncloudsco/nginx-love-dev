#!/bin/bash

# 🚀 Quick Start Script - Nginx WAF Admin Portal

echo "================================================"
echo "🚀 Starting Nginx WAF Admin Portal"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Check if apps directory exists
if [ ! -d "apps/api" ]; then
    echo "❌ API directory not found!"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies with pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi
pnpm install

echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd apps/api
pnpm prisma:generate
pnpm exec prisma migrate deploy
pnpm prisma:seed

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "================================================"
echo "📋 Test Credentials:"
echo "================================================"
echo ""
echo "Admin:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Operator:"
echo "  Username: operator"
echo "  Password: operator123"
echo ""
echo "Viewer:"
echo "  Username: viewer"
echo "  Password: viewer123"
echo ""
echo "================================================"
echo "🚀 Starting services..."
echo "================================================"
echo ""
echo -e "${YELLOW}Starting backend on port 3001...${NC}"
cd "$PROJECT_DIR/apps/api"
pnpm dev &
BACKEND_PID=$!

sleep 3

cd "$PROJECT_DIR/apps/web"
echo -e "${YELLOW}Starting frontend on port 5173...${NC}"
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo -e "${GREEN}✅ All services started!${NC}"
echo "================================================"
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID
