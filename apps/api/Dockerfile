# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy app package files
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd apps/api && pnpm prisma:generate

# Build the application
RUN pnpm --filter @nginx-love/api build

# Production stage
FROM node:20-slim

# Install OpenSSL and wget for Prisma and health checks
RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace and package files
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy built files and prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Install all dependencies (needed for Prisma CLI and native modules)
RUN pnpm install --frozen-lockfile --filter @nginx-love/api

# Generate Prisma client
RUN cd apps/api && pnpm prisma:generate

WORKDIR /app/apps/api

# Expose port 3001
EXPOSE 3001

# Health check (using root endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "dist/index.js"]
