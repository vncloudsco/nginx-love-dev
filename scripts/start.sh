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
