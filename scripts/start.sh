#!/bin/bash

################################################################################
# Nginx Love UI - Start Script (Local Development)
# Runs API locally (not in Docker) + Frontend
################################################################################

set -e

echo "================================================"
echo "🚀 Starting Nginx WAF Admin Portal (Local Dev)"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

if [ ! -f "apps/api/.env" ]; then
    echo -e "${YELLOW}⚠️  API .env not found. Copying from example...${NC}"
    cp apps/api/.env.example apps/api/.env
fi

if [ ! -f "apps/web/.env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env not found. Copying from example...${NC}"
    cp apps/web/.env.example apps/web/.env
fi

# Start only database in Docker
echo -e "${BLUE}🐳 Starting PostgreSQL in Docker...${NC}"
docker-compose up -d db
echo ""

# Wait for database
echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
sleep 3

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
echo ""

# Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed 2>/dev/null || echo "Database already seeded"
cd "$PROJECT_DIR"
echo ""

echo "================================================"
echo "📋 Test Credentials:"
echo "================================================"
echo ""
echo "Admin:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "================================================"
echo "🚀 Starting services..."
echo "================================================"
echo ""

# Start backend locally
echo -e "${YELLOW}Starting backend on port 3001...${NC}"
cd "$PROJECT_DIR/apps/api"
pnpm dev &
BACKEND_PID=$!

sleep 3

# Start frontend
cd "$PROJECT_DIR/apps/web"
echo -e "${YELLOW}Starting frontend on port 5173...${NC}"
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo -e "${GREEN}✅ All services started!${NC}"
echo "================================================"
echo ""
echo "Backend:  http://localhost:3001 (local)"
echo "Frontend: http://localhost:5173 (local)"
echo "Database: PostgreSQL in Docker"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose stop db; exit 0" INT TERM

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID
