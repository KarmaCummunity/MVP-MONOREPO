#!/bin/bash

# Local Development Startup Script
# This script starts all required services for local development

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions library
if [ -f "$SCRIPT_DIR/lib/common-functions.sh" ]; then
    source "$SCRIPT_DIR/lib/common-functions.sh"
else
    echo "Error: Could not find common-functions.sh library"
    exit 1
fi

echo "🚀 Starting Karma Community Server - Local Development"
echo "======================================================"

# Check if Docker is running
if ! check_docker; then
    exit 1
fi

# Start Docker services (PostgreSQL + Redis)
if ! start_docker_services; then
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

wait_for_postgres 10
wait_for_redis 10

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

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set!"
    print_warning "Please set DATABASE_URL in your environment or .env file"
    print_warning "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/kc_db'"
    exit 1
fi

# Setup default environment variables
setup_default_env_vars

# Start the server with watch mode
npm run start:dev
