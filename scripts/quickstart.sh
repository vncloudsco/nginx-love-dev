#!/bin/bash

################################################################################
# Nginx Love UI - Quick Start Script
# Quick start for development/testing
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Nginx Love UI - Quick Start"
echo "================================"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker and Docker Compose are required!"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install
echo ""

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Root .env not found. Copying from example...${NC}"
    cp .env.example .env
fi

if [ ! -f "apps/web/.env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env not found. Copying from example...${NC}"
    cp apps/web/.env.example apps/web/.env
fi

# Start Docker services
echo -e "${BLUE}🐳 Starting Docker services (PostgreSQL + API)...${NC}"
docker-compose up -d
echo ""

# Wait for services
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Check if database is ready
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to start"
        exit 1
    fi
    sleep 1
done

# Check if API is ready
for i in {1..30}; do
    if curl -s http://localhost:3001/ > /dev/null 2>&1; then
        echo "✅ API is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  API may not be ready yet"
    fi
    sleep 1
done

echo ""

# Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
docker-compose exec -T api pnpm prisma:migrate
docker-compose exec -T api pnpm prisma:seed 2>/dev/null || echo "Database already seeded"
echo ""

# Start frontend
echo -e "${BLUE}🎯 Starting frontend...${NC}"
cd apps/web
pnpm dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "================================"
echo "✨ Quick Start Completed!"
echo "================================"
echo ""
echo "🌐 Access:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "🔐 Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📋 Logs:"
echo "   Backend:  docker-compose logs -f api"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 Stop:"
echo "   kill $FRONTEND_PID && docker-compose down"
echo ""

echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $FRONTEND_PID 2>/dev/null; docker-compose down; exit 0" INT TERM

# Keep script running
wait $FRONTEND_PID
