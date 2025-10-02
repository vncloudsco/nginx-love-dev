#!/bin/bash

################################################################################
# Nginx Love UI - Quick Start Script
# Triển khai nhanh cho development/testing
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database config
DB_NAME="nginx_love_db"
DB_USER="nginx_love_user"
DB_PASSWORD="dev_password_123"
DB_PORT=5432

echo "🚀 Nginx Love UI - Quick Start"
echo "================================"
echo ""

# Check Docker (optional)
USE_DOCKER=false
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    read -p "Use Docker for PostgreSQL? (y/n, default: y): " USE_DOCKER_INPUT
    if [ "$USE_DOCKER_INPUT" != "n" ]; then
        USE_DOCKER=true
    fi
fi

# Setup PostgreSQL
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Starting PostgreSQL with Docker..."
    
    # Stop existing container if any
    docker stop nginx-love-postgres 2>/dev/null || true
    docker rm nginx-love-postgres 2>/dev/null || true
    
    # Start PostgreSQL
    docker run -d \
        --name nginx-love-postgres \
        -e POSTGRES_DB=$DB_NAME \
        -e POSTGRES_USER=$DB_USER \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        -p $DB_PORT:5432 \
        postgres:15-alpine > /dev/null
    
    echo "✅ PostgreSQL started in Docker"
    echo "   Waiting for database to be ready..."
    sleep 3
    
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME?schema=public"
else
    echo "📋 Please ensure PostgreSQL is running and update DATABASE_URL in backend/.env"
    DATABASE_URL=${DATABASE_URL:-"postgresql://user:password@localhost:5432/nginx_love_db?schema=public"}
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  .env not found. Creating..."
    cat > backend/.env <<EOF
# Database Configuration
DATABASE_URL="$DATABASE_URL"

# JWT Configuration
JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
NODE_ENV="development"
PORT=3001

# CORS Configuration
CORS_ORIGIN="http://localhost:8080,http://localhost:5173"

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET="dev-session-secret-change-in-production"

# 2FA
TWO_FACTOR_APP_NAME="Nginx Love UI - Dev"

# SSL Configuration
SSL_DIR="/etc/nginx/ssl"
ACME_DIR="/var/www/html/.well-known/acme-challenge"
EOF
    echo "✅ Created backend/.env"
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install && cd ..
npm install

# Setup database
echo "🗄️  Setting up database..."
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed 2>/dev/null || echo "Database already seeded"
cd ..

# Start services
echo "🎯 Starting services..."
echo ""

# Start backend in background
cd backend && npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) - http://localhost:3001"

# Start frontend in background
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID) - http://localhost:8080"

echo ""
echo "================================"
echo "✨ Quick Start Completed!"
echo "================================"
echo ""
echo "🌐 Access:"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:3001"
echo ""
echo "🔐 Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 Stop:"
if [ "$USE_DOCKER" = true ]; then
    echo "   kill $BACKEND_PID $FRONTEND_PID && docker stop nginx-love-postgres"
else
    echo "   kill $BACKEND_PID $FRONTEND_PID"
fi
echo ""

# Wait for services to start
sleep 3

# Health check
if curl -s http://localhost:3001/api/health | grep -q "success"; then
    echo "✅ Backend health check: PASSED"
else
    echo "⚠️  Backend health check: FAILED (check /tmp/backend.log)"
fi

echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait
