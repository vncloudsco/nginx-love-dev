#!/bin/bash

echo "🚀 Starting Nginx WAF Backend Setup..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL server is running."
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing."
    echo "   Press Enter when ready..."
    read
fi

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npm run prisma:migrate || {
    echo "❌ Migration failed. Please check your database connection."
    echo "   Database URL: Check your .env file"
    exit 1
}

# Seed database
echo ""
echo "🌱 Seeding database with initial data..."
npm run prisma:seed || {
    echo "⚠️  Seeding failed, but continuing..."
}

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📝 You can now start the server with:"
echo "   npm run dev     (development mode)"
echo "   npm start       (production mode)"
echo ""
echo "📚 API will be available at: http://localhost:3001/api"
echo ""
