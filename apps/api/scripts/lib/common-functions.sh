#!/bin/bash

# Common Functions Library for KC Development Scripts
# This file contains shared utility functions used across multiple scripts

# ============================================================================
# Logging Functions
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# Docker Functions
# ============================================================================

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop first."
        return 1
    fi
    print_status "Docker is running"
    return 0
}

start_docker_services() {
    local compose_dir="${1:-.}"
    
    echo "🐳 Starting Docker services..."
    if (cd "$compose_dir" && docker-compose up -d); then
        print_status "Docker services started successfully"
        return 0
    else
        print_error "Failed to start Docker services"
        return 1
    fi
}

wait_for_postgres() {
    local max_attempts="${1:-30}"
    local compose_dir="${2:-.}"
    
    echo "🔍 Checking PostgreSQL connection..."
    
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if (cd "$compose_dir" && docker-compose exec -T postgres pg_isready -U kc -d kc_db > /dev/null 2>&1); then
            print_status "PostgreSQL is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_warning "PostgreSQL might not be ready yet, continuing..."
    return 1
}

wait_for_redis() {
    local max_attempts="${1:-30}"
    local compose_dir="${2:-.}"
    
    echo "🔍 Checking Redis connection..."
    
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if (cd "$compose_dir" && docker-compose exec -T redis redis-cli ping > /dev/null 2>&1); then
            print_status "Redis is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    print_warning "Redis might not be ready yet, continuing..."
    return 1
}

# ============================================================================
# Environment Setup Functions
# ============================================================================

check_env_var() {
    local var_name="$1"
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        print_error "$var_name environment variable is not set!"
        return 1
    fi
    return 0
}

setup_default_env_vars() {
    export REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
    export NODE_ENV=${NODE_ENV:-development}
    export PORT=${PORT:-3001}
    export CORS_ORIGIN=${CORS_ORIGIN:-"http://localhost:3000,https://karma-community-kc.com"}
}
