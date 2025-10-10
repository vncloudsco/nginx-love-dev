#!/bin/bash
set -e

echo "🧹 Cleaning up old nginx PID if exists..."
rm -f /var/run/nginx.pid

echo "🚀 Starting Nginx..."
nginx -g "daemon off;" &

# Wait for Postgres to be ready
echo "⏳ Waiting for Postgres to be ready..."
sleep 30

# Wait prisma to be ready
pnpm prisma:generate
pnpm exec prisma migrate deploy
pnpm prisma:seed
touch .seeded

echo "🟢 Starting Node.js API..."
node /app/apps/api/dist/index.js
