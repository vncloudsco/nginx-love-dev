#!/bin/bash

################################################################################
# Nginx Love UI - Update Script
# Description: Update source code, rebuild and restart services
# Version: 1.0.0
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/apps/api"
FRONTEND_DIR="$PROJECT_DIR/apps/web"
LOG_FILE="/var/log/nginx-love-ui-update.log"

# Database configuration
DB_CONTAINER_NAME="nginx-love-postgres"

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ "${EUID}" -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "=================================="
log "Nginx Love UI Update Started"
log "=================================="

# Check if services exist
if ! systemctl list-unit-files | grep -q nginx-love-backend.service; then
    error "Backend service not found. Please run deploy.sh first."
fi

if ! systemctl list-unit-files | grep -q nginx-love-frontend.service; then
    error "Frontend service not found. Please run deploy.sh first."
fi

# Check if database container exists
if ! docker ps -a | grep -q "${DB_CONTAINER_NAME}"; then
    error "Database container '${DB_CONTAINER_NAME}' not found. Please run deploy.sh first."
fi

# Step 1: Check prerequisites
log "Step 1/6: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js not found. Please install Node.js 18+ first."
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    error "pnpm not found. Please install pnpm first."
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker not found. Please install Docker first."
fi

log "✓ Prerequisites check passed"

# Step 2: Stop services before update
log "Step 2/6: Stopping services for update..."

# Stop backend service
if systemctl is-active --quiet nginx-love-backend.service; then
    systemctl stop nginx-love-backend.service
    log "✓ Backend service stopped"
else
    warn "Backend service was not running"
fi

# Stop frontend service
if systemctl is-active --quiet nginx-love-frontend.service; then
    systemctl stop nginx-love-frontend.service
    log "✓ Frontend service stopped"
else
    warn "Frontend service was not running"
fi

# Step 3: Update dependencies and build backend
log "Step 3/6: Building backend..."

cd "${PROJECT_DIR}"

# Update monorepo dependencies
log "Updating monorepo dependencies..."
pnpm install >> "${LOG_FILE}" 2>&1 || error "Failed to update monorepo dependencies"

cd "${BACKEND_DIR}"

# Generate Prisma client (in case schema changed)
log "Generating Prisma client..."
pnpm prisma:generate >> "$LOG_FILE" 2>&1 || error "Failed to generate Prisma client"

# Run database migrations (only creates new tables, doesn't overwrite existing data)
log "Running database migrations..."
pnpm exec prisma migrate deploy >> "$LOG_FILE" 2>&1 || error "Failed to run migrations"

# Seed database (only adds missing data, doesn't overwrite existing)
log "Seeding database for missing tables/data..."
pnpm prisma:seed >> "$LOG_FILE" 2>&1 || warn "Failed to seed database (this is normal if data already exists)"

# Build backend
log "Building backend..."
cd "${PROJECT_DIR}"
pnpm --filter @nginx-love/api build >> "${LOG_FILE}" 2>&1 || error "Failed to build backend"

log "✓ Backend build completed"

# Step 4: Build frontend
log "Step 4/6: Building frontend..."

cd "${FRONTEND_DIR}"

# Clean previous build
if [ -d "dist" ]; then
    log "Cleaning previous frontend build..."
    rm -rf dist
fi

# Build frontend
log "Building frontend..."
cd "${PROJECT_DIR}"
pnpm --filter @nginx-love/web build >> "${LOG_FILE}" 2>&1 || error "Failed to build frontend"

# Get public IP for CSP update
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip || echo "localhost")

# Update CSP in built index.html to use public IP
log "Updating Content Security Policy with public IP: ${PUBLIC_IP}..."
sed -i "s|__API_URL__|http://${PUBLIC_IP}:3001 http://localhost:3001|g" "${FRONTEND_DIR}/dist/index.html"
sed -i "s|__WS_URL__|ws://${PUBLIC_IP}:* ws://localhost:*|g" "${FRONTEND_DIR}/dist/index.html"

log "✓ Frontend build completed"

# Step 5: Restart services
log "Step 5/6: Starting services..."

# Ensure database container is running
if ! docker ps | grep -q "${DB_CONTAINER_NAME}"; then
    log "Starting database container..."
    docker start "${DB_CONTAINER_NAME}" >> "${LOG_FILE}" 2>&1 || error "Failed to start database container"
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 5
    for i in {1..30}; do
        if docker exec "${DB_CONTAINER_NAME}" pg_isready > /dev/null 2>&1; then
            log "✓ Database is ready"
            break
        fi
        if [ "${i}" -eq 30 ]; then
            error "Database failed to start"
        fi
        sleep 1
    done
else
    log "✓ Database container is already running"
fi

# Start backend service
systemctl start nginx-love-backend.service || error "Failed to start backend service"
sleep 3
if ! systemctl is-active --quiet nginx-love-backend.service; then
    error "Backend service failed to start. Check logs: journalctl -u nginx-love-backend.service"
fi
log "✓ Backend service started"

# Start frontend service
systemctl start nginx-love-frontend.service || error "Failed to start frontend service"
sleep 3
if ! systemctl is-active --quiet nginx-love-frontend.service; then
    error "Frontend service failed to start. Check logs: journalctl -u nginx-love-frontend.service"
fi
log "✓ Frontend service started"

# Ensure nginx is running
if ! systemctl is-active --quiet nginx; then
    systemctl start nginx || error "Failed to start nginx"
fi
log "✓ Nginx is running"

# Step 6: Health check and summary
log "Step 6/6: Performing health checks..."

# Health check with retries
log "Performing health checks..."
sleep 5

# Backend health check
BACKEND_HEALTHY=false
for i in {1..10}; do
    if curl -s http://localhost:3001/api/health | grep -q "success"; then
        BACKEND_HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$BACKEND_HEALTHY" = true ]; then
    log "✅ Backend health check: PASSED"
else
    warn "⚠️  Backend health check: FAILED (check logs: tail -f /var/log/nginx-love-backend.log)"
fi

# Frontend health check
FRONTEND_HEALTHY=false
for i in {1..5}; do
    if curl -s http://localhost:8080 | grep -q "<!doctype html"; then
        FRONTEND_HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$FRONTEND_HEALTHY" = true ]; then
    log "✅ Frontend health check: PASSED"
else
    warn "⚠️  Frontend health check: FAILED (check logs: tail -f /var/log/nginx-love-frontend.log)"
fi

# Final Summary
log ""
log "=================================="
log "Update Completed Successfully!"
log "=================================="
log ""
log "📋 Updated Components:"
log "  • Backend API: Rebuilt and restarted"
log "  • Frontend UI: Rebuilt and restarted"
log "  • Database: Migrations applied, new tables seeded"
log ""
log "🌐 Services Status:"
log "  • Backend API: http://${PUBLIC_IP}:3001"
log "  • Frontend UI: http://${PUBLIC_IP}:8080"
log "  • Database: Running in Docker container"
log ""
log "📝 Manage Services:"
log "  Backend:    systemctl {start|stop|restart|status} nginx-love-backend"
log "  Frontend:   systemctl {start|stop|restart|status} nginx-love-frontend"
log "  Database:   docker {start|stop|restart} ${DB_CONTAINER_NAME}"
log ""
log "📊 View Logs:"
log "  Backend:    tail -f /var/log/nginx-love-backend.log"
log "  Frontend:   tail -f /var/log/nginx-love-frontend.log"
log "  Database:   docker logs -f ${DB_CONTAINER_NAME}"
log "  Update:     tail -f ${LOG_FILE}"
log ""
log "🔐 Access the portal at: http://${PUBLIC_IP}:8080"
log ""
log "Update log saved to: ${LOG_FILE}"
log "=================================="