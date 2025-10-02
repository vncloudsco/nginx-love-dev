#!/bin/bash

################################################################################
# Nginx Love UI - Complete Deployment Script
# Description: Deploy Backend + Frontend + Nginx + ModSecurity
# Version: 2.0.0
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
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/apps/api"
FRONTEND_DIR="$PROJECT_DIR/apps/web"
LOG_FILE="/var/log/nginx-love-ui-deploy.log"

# Database configuration
DB_NAME="nginx_waf"
DB_USER="postgres"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
DB_PORT=5432
JWT_ACCESS_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

# Logging
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

# Check root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "=================================="
log "Nginx Love UI Deployment Started"
log "=================================="

# Get server public IP
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip || echo "localhost")
log "Detected Public IP: $PUBLIC_IP"

# Step 1: Check Prerequisites
log "Step 1/8: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    warn "Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1 || error "Failed to download Node.js setup script"
    apt-get install -y nodejs >> "$LOG_FILE" 2>&1 || error "Failed to install Node.js"
    log "✓ Node.js $(node -v) installed successfully"
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        warn "Node.js version too old ($(node -v)). Upgrading to 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1
        apt-get install -y nodejs >> "$LOG_FILE" 2>&1 || error "Failed to upgrade Node.js"
        log "✓ Node.js upgraded to $(node -v)"
    else
        log "✓ Node.js $(node -v) detected"
    fi
fi

# Check pnpm (ensure it's installed)
if ! command -v pnpm &> /dev/null; then
    warn "pnpm not found. Installing pnpm..."
    npm install -g pnpm >> "$LOG_FILE" 2>&1 || error "Failed to install pnpm"
    log "✓ pnpm $(pnpm -v) installed successfully"
else
    log "✓ pnpm $(pnpm -v) detected"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    warn "Docker not found. Installing latest Docker..."
    curl -fsSL https://get.docker.com -o /tmp/install-docker.sh >> "$LOG_FILE" 2>&1 || error "Failed to download Docker installer"
    sh /tmp/install-docker.sh >> "$LOG_FILE" 2>&1 || error "Failed to install Docker"
    rm -f /tmp/install-docker.sh
    
    # Start Docker service
    systemctl start docker >> "$LOG_FILE" 2>&1
    systemctl enable docker >> "$LOG_FILE" 2>&1
    
    log "✓ Docker $(docker -v | cut -d',' -f1 | cut -d' ' -f3) installed successfully"
else
    log "✓ Docker $(docker -v | cut -d',' -f1 | cut -d' ' -f3) detected"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    warn "Docker Compose not found. Installing latest version..."
    
    # Get latest docker compose released tag
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    if [ -z "$COMPOSE_VERSION" ]; then
        warn "Failed to get latest version, using v2.24.0"
        COMPOSE_VERSION="v2.24.0"
    fi
    
    # Install docker-compose
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose >> "$LOG_FILE" 2>&1 || error "Failed to download Docker Compose"
    
    chmod +x /usr/local/bin/docker-compose
    
    # Install bash completion
    curl -L "https://raw.githubusercontent.com/docker/compose/${COMPOSE_VERSION}/contrib/completion/bash/docker-compose" \
        -o /etc/bash_completion.d/docker-compose 2>/dev/null || true
    
    log "✓ Docker Compose $(docker-compose -v | cut -d' ' -f4 | tr -d ',') installed successfully"
else
    log "✓ Docker Compose $(docker-compose -v | cut -d' ' -f4 | tr -d ',') detected"
fi

# Use pnpm as package manager
PKG_MANAGER="pnpm"
log "✓ Package manager: $PKG_MANAGER"

# Step 2: Setup Docker Services
log "Step 2/8: Setting up Docker services..."

cd "$PROJECT_DIR"

# Create/Update root .env file for docker-compose
log "Configuring docker-compose environment..."
cat > .env <<EOF
# Database Configuration (for Docker Compose)
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD
DB_PORT=$DB_PORT

# API Configuration
API_PORT=3001
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://$PUBLIC_IP:8080,http://localhost:8080,http://$PUBLIC_IP,http://localhost
BCRYPT_ROUNDS=10
SESSION_SECRET=$SESSION_SECRET
TWO_FACTOR_APP_NAME=Nginx Love UI
EOF

log "✓ Docker environment configured"

# Stop existing containers
log "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
log "Building and starting Docker services..."
docker-compose up -d --build >> "$LOG_FILE" 2>&1 || error "Failed to start Docker services"

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
sleep 5
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U $DB_USER > /dev/null 2>&1; then
        log "✓ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        error "PostgreSQL failed to start"
    fi
    sleep 1
done

# Wait for API to be ready
log "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/ > /dev/null 2>&1; then
        log "✓ API is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        warn "API may not be ready yet"
    fi
    sleep 1
done

log "✓ Docker services started successfully"
log "  • Database: PostgreSQL 16"
log "  • API: Running on port 3001"

# Step 3: Install Nginx + ModSecurity
log "Step 3/8: Installing Nginx + ModSecurity..."

if ! command -v nginx &> /dev/null; then
    info "Nginx not found. Installing..."
    bash "$PROJECT_DIR/scripts/install-nginx-modsecurity.sh" || error "Failed to install Nginx + ModSecurity"
    log "✓ Nginx + ModSecurity installed"
else
    log "✓ Nginx already installed ($(nginx -v 2>&1 | cut -d'/' -f2))"
fi

# Step 4: Setup Database
log "Step 4/8: Setting up database..."

# Run migrations inside API container
log "Running database migrations..."
docker-compose exec -T api pnpm prisma:migrate >> "$LOG_FILE" 2>&1 || error "Failed to run migrations"

# Seed database
log "Seeding database..."
docker-compose exec -T api pnpm prisma:seed >> "$LOG_FILE" 2>&1 || warn "Failed to seed database"

log "✓ Database setup completed"

# Step 5: API is already built and running
log "Step 5/8: API service..."
log "✓ API is already built and running in Docker container"

# Step 6: Setup Frontend
log "Step 6/8: Setting up Frontend..."

cd "$FRONTEND_DIR"

# Install dependencies
if [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies..."
    $PKG_MANAGER install >> "$LOG_FILE" 2>&1 || error "Failed to install frontend dependencies"
fi

# Create/Update frontend .env
log "Configuring frontend environment..."
cat > .env <<EOF
# API Configuration
VITE_API_URL=http://$PUBLIC_IP:3001/api
EOF

log "✓ Frontend .env configured with API: http://$PUBLIC_IP:3001/api"

# Clean previous build
if [ -d "dist" ]; then
    log "Cleaning previous build..."
    rm -rf dist
fi

# Build frontend
log "Building frontend..."
$PKG_MANAGER run build >> "$LOG_FILE" 2>&1 || error "Failed to build frontend"

# Update CSP in built index.html to use public IP
log "Updating Content Security Policy with public IP..."
sed -i "s|__API_URL__|http://$PUBLIC_IP:3001 http://localhost:3001|g" dist/index.html
sed -i "s|__WS_URL__|ws://$PUBLIC_IP:* ws://localhost:*|g" dist/index.html

log "✓ Frontend built successfully"
log "✓ CSP configured for: http://$PUBLIC_IP:3001, http://localhost:3001"

# Step 7: Setup Nginx Configuration
log "Step 7/8: Configuring Nginx..."

# Create required directories
mkdir -p /etc/nginx/ssl
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/snippets
mkdir -p /var/www/html/.well-known/acme-challenge
chmod -R 755 /var/www/html/.well-known
touch /etc/nginx/conf.d/acl-rules.conf

# Create ACME challenge snippet if not exists
if [ ! -f "/etc/nginx/snippets/acme-challenge.conf" ]; then
    cat > /etc/nginx/snippets/acme-challenge.conf <<'EOF'
# ACME Challenge for Let's Encrypt
location ^~ /.well-known/acme-challenge/ {
    default_type "text/plain";
    root /var/www/html;
    allow all;
}

location = /.well-known/acme-challenge/ {
    return 404;
}
EOF
    log "✓ ACME challenge snippet created"
fi

# Setup systemd services
log "Setting up systemd services..."

# Note: Backend runs in Docker, systemd service not needed

# Frontend service (if using preview mode)
cat > /etc/systemd/system/nginx-love-frontend.service <<EOF
[Unit]
Description=Nginx Love UI Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$FRONTEND_DIR
Environment=NODE_ENV=production
ExecStart=$(which $PKG_MANAGER) run preview -- --host 0.0.0.0 --port 8080
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nginx-love-frontend.log
StandardError=append:/var/log/nginx-love-frontend-error.log

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable frontend service
systemctl enable nginx-love-frontend.service >> "$LOG_FILE" 2>&1

log "✓ Systemd service configured"

# Step 8: Start Services
log "Step 8/8: Starting services..."

# Backend already running in Docker
log "✓ Backend running in Docker (port 3001)"

# Start frontend
systemctl restart nginx-love-frontend.service || error "Failed to start frontend service"
sleep 2
if ! systemctl is-active --quiet nginx-love-frontend.service; then
    error "Frontend service failed to start. Check logs: journalctl -u nginx-love-frontend.service"
fi
log "✓ Frontend service started"

# Ensure nginx is running
if ! systemctl is-active --quiet nginx; then
    # Fix IPv6 issue if present
    if nginx -t 2>&1 | grep -q "Address family not supported"; then
        log "Fixing IPv6 configuration..."
        sed -i 's/listen \[::\]:80/# listen [::]:80/g' /etc/nginx/sites-available/default 2>/dev/null || true
        sed -i 's/listen \[::\]:443/# listen [::]:443/g' /etc/nginx/sites-available/default 2>/dev/null || true
        sed -i 's/listen \[::\]:80/# listen [::]:80/g' /etc/nginx/sites-enabled/*.conf 2>/dev/null || true
        sed -i 's/listen \[::\]:443/# listen [::]:443/g' /etc/nginx/sites-enabled/*.conf 2>/dev/null || true
    fi
    
    systemctl start nginx || error "Failed to start nginx"
fi
log "✓ Nginx running"

# Final Summary
log ""
log "=================================="
log "Deployment Completed Successfully!"
log "=================================="
log ""
log "📋 Service Status:"
log "  • PostgreSQL: Docker container 'nginx-love-db'"
log "  • Backend API: Docker container 'nginx-love-api' (http://$PUBLIC_IP:3001)"
log "  • Frontend UI: http://$PUBLIC_IP:8080"
log "  • Nginx: Port 80/443"
log ""
log "🔐 Database Credentials:"
log "  • Host: localhost"
log "  • Port: $DB_PORT"
log "  • Database: $DB_NAME"
log "  • Username: $DB_USER"
log "  • Password: $DB_PASSWORD"
log ""
log "🔑 Security Keys:"
log "  • JWT Access Secret: $JWT_ACCESS_SECRET"
log "  • JWT Refresh Secret: $JWT_REFRESH_SECRET"
log "  • Session Secret: $SESSION_SECRET"
log ""
log "📝 Manage Services:"
log "  Docker:     docker-compose {up|down|restart}"
log "  PostgreSQL: docker-compose {start|stop|restart} db"
log "  Backend:    docker-compose {start|stop|restart} api"
log "  Frontend:   systemctl {start|stop|restart|status} nginx-love-frontend"
log "  Nginx:      systemctl {start|stop|restart|status} nginx"
log ""
log "📊 View Logs:"
log "  PostgreSQL: docker-compose logs -f db"
log "  Backend:    docker-compose logs -f api"
log "  Frontend:   tail -f /var/log/nginx-love-frontend.log"
log "  Nginx:      tail -f /var/log/nginx/error.log"
log ""
log "🔐 Default Credentials:"
log "  Username: admin"
log "  Password: admin123"
log ""
log "🌐 Access the portal at: http://$PUBLIC_IP:8080"
log ""

# Save credentials to file
cat > /root/.nginx-love-credentials <<EOF
# Nginx Love UI - Deployment Credentials
# Generated: $(date)

## Public Access
Frontend: http://$PUBLIC_IP:8080
Backend:  http://$PUBLIC_IP:3001

## Database (Docker Compose)
Container: nginx-love-db
Host: localhost
Port: $DB_PORT
Database: $DB_NAME
Username: $DB_USER
Password: $DB_PASSWORD

## Security Keys
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET

## Default Login
Username: admin
Password: admin123

## Docker Compose Commands
Start all:   docker-compose up -d
Stop all:    docker-compose down
Restart:     docker-compose restart
View logs:   docker-compose logs -f
DB logs:     docker-compose logs -f db
API logs:    docker-compose logs -f api
Connect DB:  docker-compose exec db psql -U $DB_USER -d $DB_NAME
EOF

chmod 600 /root/.nginx-love-credentials
log "💾 Credentials saved to: /root/.nginx-love-credentials"

# Health check
sleep 3
if curl -s http://localhost:3001/api/health | grep -q "success"; then
    log "✅ Backend health check: PASSED"
else
    warn "⚠️  Backend health check: FAILED (may need a moment to start)"
fi

if curl -s http://localhost:8080 | grep -q "<!doctype html"; then
    log "✅ Frontend health check: PASSED"
else
    warn "⚠️  Frontend health check: FAILED (may need a moment to start)"
fi

log ""
log "Deployment log saved to: $LOG_FILE"
log "=================================="
