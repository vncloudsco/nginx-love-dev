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

### 1. Clone & Install

```bash
git clone https://github.com/TinyActive/nginx-love.git
cd nginx-love
pnpm install
```

### 2. Setup Environment Files

```bash
# Docker Compose (database + API)
cp .env.example .env

# Frontend
cp apps/web/.env.example apps/web/.env
```

**Important**: Update `.env` with secure secrets before deploying to production.

### 3. Start Services with Docker

```bash
# Start database and API in containers
docker-compose up -d

# View logs
docker-compose logs -f api
```

### 4. Setup Database (First time only)

```bash
# Run migrations inside the API container
docker-compose exec api pnpm prisma:migrate
docker-compose exec api pnpm prisma:seed
```

### 5. Run Frontend

```bash
# Start frontend (connects to API on http://localhost:3001)
pnpm --filter @nginx-love/web dev    # http://localhost:5173
```

## 🔧 Alternative: Local Development (without Docker)

If you prefer running API locally instead of in Docker:

```bash
# 1. Start only database
docker-compose up -d db

# 2. Copy backend env file
cp apps/api/.env.example apps/api/.env

# 3. Setup database (from apps/api/)
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
cd ../..

# 4. Run all apps locally
pnpm dev

# Or run individually
pnpm --filter @nginx-love/web dev    # Frontend: http://localhost:5173
pnpm --filter @nginx-love/api dev    # API: http://localhost:3001
```

## 🔐 Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📚 API Documentation

- [Complete API Reference](./docs/API.md) - All API endpoints and examples

## 🛠️ Available Commands

```bash
# Development
pnpm dev          # Start all apps
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