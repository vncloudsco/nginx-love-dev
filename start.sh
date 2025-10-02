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

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found!"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
cd backend && npm install
cd ..

echo ""
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

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
cd backend
npm run dev &
BACKEND_PID=$!

sleep 3

cd ..
echo -e "${YELLOW}Starting frontend on port 8080...${NC}"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo -e "${GREEN}✅ All services started!${NC}"
echo "================================================"
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID
