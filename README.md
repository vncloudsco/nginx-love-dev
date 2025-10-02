# 🚀 Nginx WAF - Advanced Nginx Management Platform

Comprehensive Nginx management system with ModSecurity WAF, Domain Management, SSL Certificates and Real-time Monitoring.

## ✨ Key Features

- 🔒 **ModSecurity WAF** - OWASP Core Rule Set (CRS) + Custom Rules
- 🌐 **Domain Management** - Load balancing, upstream monitoring, HTTPS backend support
- 🔐 **SSL Certificate Management** - Auto Let's Encrypt + Manual upload
- 👥 **Multi-user Management** - Role-based access control (Admin/Moderator/Viewer)
- 📊 **Real-time Monitoring** - Performance metrics, alerts, system health
- 🛡️ **Access Control Lists (ACL)** - IP whitelist/blacklist, GeoIP, User-Agent filtering
- 📋 **Activity Logging** - Comprehensive audit trail
- 🔔 **Smart Alerts** - Email/Telegram notifications with custom conditions
- 💾 **Database Management** - PostgreSQL with Prisma ORM
- 🎨 **Modern UI** - React + TypeScript + ShadCN UI + Tailwind CSS

## 📋 Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

## 🚀 Quick Start

### Option 1: Using Scripts (Recommended)

The easiest way to get started:

```bash
# Clone repository
git clone https://github.com/TinyActive/nginx-love.git
cd nginx-love

# Run quick start script (sets up everything)
bash scripts/quickstart.sh
```

This will:
- Install dependencies
- Start Docker services (PostgreSQL + API)
- Run database migrations and seeding
- Start frontend on http://localhost:5173

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

**Press Ctrl+C to stop all services**

---

### Option 2: Manual Setup

If you prefer manual control:

#### 1. Clone & Install

```bash
git clone https://github.com/TinyActive/nginx-love.git
cd nginx-love
pnpm install
```

#### 2. Setup Environment Files

```bash
# Docker Compose (database + API)
cp .env.example .env

# Frontend
cp apps/web/.env.example apps/web/.env
```

**Important**: Update `.env` with secure secrets before deploying to production.

#### 3. Start Services with Docker

```bash
# Start database and API in containers
docker-compose up -d

# View logs
docker-compose logs -f api
```

#### 4. Setup Database (First time only)

```bash
# Run migrations inside the API container
docker-compose exec api pnpm prisma:migrate
docker-compose exec api pnpm prisma:seed
```

#### 5. Run Frontend

```bash
# Start frontend (connects to API on http://localhost:3001)
pnpm --filter @nginx-love/web dev    # http://localhost:5173
```

## 📜 Deployment Scripts

All scripts are located in the `scripts/` directory and are ready to use.

### 🎯 `quickstart.sh` - Quick Testing (Recommended)

**Best for:** First-time setup, testing, demos

```bash
bash scripts/quickstart.sh
```

**What it does:**
- ✅ Installs dependencies (pnpm)
- ✅ Copies `.env` files from examples
- ✅ Starts Docker services (PostgreSQL + API)
- ✅ Runs database migrations and seeding
- ✅ Starts frontend on http://localhost:5173
- ✅ Handles graceful shutdown (Ctrl+C)

**Architecture:**
- Database: Docker
- API: Docker (port 3001)
- Frontend: Local (port 5173)

---

### 🛠️ `start.sh` - Local Development

**Best for:** Development with hot-reload for API and frontend

```bash
bash scripts/start.sh
```

**What it does:**
- ✅ Installs dependencies (pnpm)
- ✅ Copies `.env` files from examples
- ✅ Starts PostgreSQL in Docker
- ✅ Runs API locally with hot-reload (port 3001)
- ✅ Runs frontend locally with hot-reload (port 5173)
- ✅ Handles graceful shutdown (Ctrl+C)

**Architecture:**
- Database: Docker
- API: Local (port 3001)
- Frontend: Local (port 5173)

---

### 🚀 `deploy.sh` - Production Deployment

**Best for:** Production servers with Nginx + ModSecurity

```bash
sudo bash scripts/deploy.sh
```

**What it does:**
1. ✅ Installs prerequisites (Node.js, pnpm, Docker, Docker Compose)
2. ✅ Builds and starts Docker services (PostgreSQL + API)
3. ✅ Runs database migrations and seeding
4. ✅ Installs Nginx + ModSecurity WAF
5. ✅ Builds and deploys frontend
6. ✅ Configures systemd services
7. ✅ Saves credentials to `/root/.nginx-love-credentials`

**After deployment:**
- Frontend: `http://YOUR_IP:8080`
- Backend API: `http://YOUR_IP:3001`

**Manage services:**
```bash
# Docker services
docker-compose up -d           # Start all
docker-compose down            # Stop all
docker-compose logs -f api     # View API logs

# Frontend (systemd)
systemctl restart nginx-love-frontend

# Nginx
systemctl restart nginx
```

**Architecture:**
- Database: Docker
- API: Docker (port 3001)
- Frontend: Systemd service (port 8080)
- Nginx: Reverse proxy + ModSecurity WAF

---

### 📊 Script Comparison

| Script | Database | API | Frontend | Root | Use Case |
|--------|----------|-----|----------|------|----------|
| `quickstart.sh` | Docker | Docker | Local | ❌ | Quick testing |
| `start.sh` | Docker | Local | Local | ❌ | Development |
| `deploy.sh` | Docker | Docker | Systemd | ✅ | Production |

---

## 🛠️ Manual Commands

For advanced users who want manual control:

```bash
# Development
pnpm dev          # Start all apps locally
pnpm build        # Build all apps
pnpm lint         # Lint all apps

# Database (from apps/api/)
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run migrations
pnpm prisma:seed      # Seed database
pnpm prisma:studio    # Open Prisma Studio

# Docker
docker-compose up -d           # Start database + API
docker-compose up -d db        # Start only database
docker-compose logs -f api     # View API logs
docker-compose exec api pnpm prisma:migrate  # Run migrations
docker-compose down            # Stop all services
```

---

## 📁 Project Structure

```
nginx-love/
├── apps/
│   ├── web/          # Vite + React frontend
│   └── api/          # Express + Prisma backend
├── docs/             # Documentation
├── scripts/          # Deployment scripts
└── config/           # Configuration files
```

---

## 📚 Documentation

- [Complete API Reference](./docs/API.md) - All API endpoints and examples

## 🔗 Links

- [GitHub Repository](https://github.com/TinyActive/nginx-love)
- [Issue Tracker](https://github.com/TinyActive/nginx-love/issues)

## 📄 License

Apache 2.0 License. See [LICENSE](./LICENSE) for details.

## 👥 Support & Community

### Getting Help
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/TinyActive/nginx-love/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/TinyActive/nginx-love/discussions)
- 📚 **Documentation**: [Project Wiki](https://github.com/TinyActive/nginx-love/wiki)
- 💬 **Community**: [Discord Server](#) (coming soon)

### Security Issues
For security vulnerabilities, please email: security@tinyactive.net

### Acknowledgments
- [OWASP ModSecurity Core Rule Set](https://owasp.org/www-project-modsecurity-core-rule-set/)
- [Nginx](https://nginx.org/) & [ModSecurity](https://modsecurity.org/)
- [React](https://reactjs.org/) & [ShadCN UI](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io/) & [PostgreSQL](https://www.postgresql.org/)

---

**🔥 Made with ❤️ by TinyActive Team**

⭐ **Star this repository if it helped you!**