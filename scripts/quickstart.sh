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

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM=Linux;;
    Darwin*)    PLATFORM=Mac;;
    *)          PLATFORM="UNKNOWN"
esac

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing Node.js 20.x...${NC}"

    if [ "$PLATFORM" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - > /dev/null 2>&1
        sudo apt-get install -y nodejs > /dev/null 2>&1 || {
            echo "❌ Failed to install Node.js. Please install manually from: https://nodejs.org/"
            exit 1
        }
    elif [ "$PLATFORM" = "Mac" ]; then
        if command -v brew &> /dev/null; then
            brew install node@20 > /dev/null 2>&1
        else
            echo "❌ Homebrew not found. Please install Node.js 18+ from: https://nodejs.org/"
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install Node.js 18+ from: https://nodejs.org/"
        exit 1
    fi
    echo "✅ Node.js $(node -v) installed successfully"
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠️  Node.js version too old: $(node -v). Upgrading to 20.x...${NC}"

        if [ "$PLATFORM" = "Linux" ]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - > /dev/null 2>&1
            sudo apt-get install -y nodejs > /dev/null 2>&1
        elif [ "$PLATFORM" = "Mac" ]; then
            brew upgrade node > /dev/null 2>&1 || brew install node@20 > /dev/null 2>&1
        fi
        echo "✅ Node.js upgraded to $(node -v)"
    else
        echo "✅ Node.js $(node -v) detected"
    fi
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found. Installing...${NC}"
    npm install -g pnpm > /dev/null 2>&1
    echo "✅ pnpm $(pnpm -v) installed"
else
    echo "✅ pnpm $(pnpm -v) detected"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found. Installing Docker...${NC}"

    if [ "$PLATFORM" = "Linux" ]; then
        curl -fsSL https://get.docker.com -o /tmp/install-docker.sh
        sudo sh /tmp/install-docker.sh > /dev/null 2>&1
        rm -f /tmp/install-docker.sh
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
        echo "✅ Docker installed. You may need to log out and back in for group permissions."
    elif [ "$PLATFORM" = "Mac" ]; then
        echo "❌ Please install Docker Desktop manually: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker daemon not running. Starting Docker...${NC}"
    if [ "$PLATFORM" = "Linux" ]; then
        sudo systemctl start docker
        sleep 2
    else
        echo "❌ Please start Docker Desktop"
        exit 1
    fi
fi
echo "✅ Docker $(docker -v | cut -d',' -f1 | cut -d' ' -f3) detected"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose not found. Installing...${NC}"

    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    if [ -z "$COMPOSE_VERSION" ]; then
        COMPOSE_VERSION="v2.24.0"
    fi

    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose > /dev/null 2>&1
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose $(docker-compose -v | cut -d' ' -f4 | tr -d ',') installed"
else
    echo "✅ Docker Compose $(docker-compose -v | cut -d' ' -f4 | tr -d ',') detected"
fi

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
