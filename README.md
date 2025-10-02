# 🚀 Nginx WAF - Admin Portal

Modern admin portal for managing Nginx and ModSecurity WAF.

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
# Docker Compose (database)
cp .env.example .env

# Frontend
cp apps/web/.env.example apps/web/.env

# Backend
cp apps/api/.env.example apps/api/.env
```

### 3. Start Database

```bash
docker-compose up -d
```

### 4. Setup Database

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
cd ../..
```

### 5. Run Development

```bash
# Start all apps
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
docker-compose up -d      # Start database
docker-compose logs -f db # View logs
docker-compose down       # Stop database
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
