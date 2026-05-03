#!/bin/bash

# Local Development Startup Script
# This script starts all required services for local development

echo "🚀 Starting Karma Community Server - Local Development"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

print_status "Docker is running"

# Start Docker services (PostgreSQL + Redis)
echo "🐳 Starting Docker services..."
if docker-compose up -d; then
    print_status "Docker services started successfully"
else
    print_error "Failed to start Docker services"
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if PostgreSQL is ready
echo "🔍 Checking PostgreSQL connection..."
if docker-compose exec -T postgres pg_isready -U kc -d kc_db > /dev/null 2>&1; then
    print_status "PostgreSQL is ready"
else
    print_warning "PostgreSQL might not be ready yet, continuing..."
fi

# Check if Redis is ready
echo "🔍 Checking Redis connection..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is ready"
else
    print_warning "Redis might not be ready yet, continuing..."
fi

# Build the project
echo "🔨 Building the project..."
if npm run build; then
    print_status "Project built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Set environment variables and start the server
echo "🚀 Starting the NestJS server..."
echo "Environment: Development"
echo "Port: 3001"
echo "Google OAuth: Configured"
echo ""

# Export environment variables
export GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-"config_required"}
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-"config_required"}
export DATABASE_URL=${DATABASE_URL:-"postgresql://kc:local_secret@localhost:5432/kc_db"}
export REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
export NODE_ENV=development
export PORT=3001
export CORS_ORIGIN="http://localhost:3000,https://karma-community-kc.com"

# Start the server with watch mode
npm run start:dev
