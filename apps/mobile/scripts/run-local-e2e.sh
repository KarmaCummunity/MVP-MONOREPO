#!/usr/bin/env bash
# File overview:
# - Purpose: One-command local spin-up for backend (DB+Redis via Docker), API server, and KC Vision Web (Vite POC) pointing at localhost API.
# - Works with the monorepo layout: apps/api, apps/mobile (checks/lints), apps/kc-vision-web (browser UI).
# - Steps: Free ports, docker compose up, build server, ensure DB schema via ts-node, start server, smoke-test APIs, start Vite (Vision Web).
# - Inputs: PORT (API server), EXPO_PORT (web UI dev server — KC Vision Web / Vite, default 8081).
#   Exports EXPO_PUBLIC_* for legacy scripts; the browser client is kc-vision-web (Vite), not Expo Web.
# - Code quality: lint and Snyk always run. Client audit:all and Sonar (if SONAR_TOKEN) run by default.
#   Set SKIP_CHECKS=1 to skip only Sonar and client audit — not lint or Snyk.
set -euo pipefail

THIS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$(cd "$THIS_DIR/.." && pwd)"
MONOREPO_ROOT="$(cd "$CLIENT_DIR/../.." && pwd)"
SERVER_DIR="$(cd "$MONOREPO_ROOT/apps/api" && pwd)"
VISION_WEB_DIR="$(cd "$MONOREPO_ROOT/apps/kc-vision-web" && pwd)"
SERVER_PORT=${PORT:-3001}
EXPO_PORT=${EXPO_PORT:-8081}

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
  echo "ℹ️  $1"
}

log_success() {
  echo "✅ $1"
}

log_error() {
  echo "❌ $1" >&2
}

log_warning() {
  echo "⚠️  $1"
}

# Check if port is available
is_port_available() {
  local port="$1"
  ! lsof -ti tcp:"$port" >/dev/null 2>&1
}

# Helper to free port
kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti tcp:"$port" || true)
  if [[ -n "$pids" ]]; then
    log_info "Freeing port $port (PIDs: $pids)"
    kill -9 $pids >/dev/null 2>&1 || true
  fi
}

# Test endpoint with retry logic
test_endpoint_with_retry() {
  local url="$1"
  local max_attempts="${2:-3}"
  local attempt=1
  
  while [[ $attempt -le $max_attempts ]]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi
    if [[ $attempt -lt $max_attempts ]]; then
      sleep 1
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

# ============================================================================
# Cleanup Function
# ============================================================================

cleanup() {
  echo ""
  log_info "Cleaning up..."
  
  # Stop server
  if [[ -n "${SERVER_PID:-}" ]]; then
    log_info "Stopping server (PID: $SERVER_PID)..."
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  
  # Optionally stop Docker (if SKIP_DOCKER_CLEANUP is not set)
  if [[ -z "${SKIP_DOCKER_CLEANUP:-}" ]]; then
    log_info "Stopping Docker containers..."
    (cd "$SERVER_DIR" && docker compose down >/dev/null 2>&1 || true)
  fi
  
  log_success "Cleanup complete"
}
trap cleanup EXIT INT TERM

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 Starting Local E2E Environment Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Node.js version
log_info "Checking Node.js version..."
REQUIRED_NODE_VERSION="18.0.0"
CURRENT_NODE_VERSION=$(node -v | sed 's/v//')
if ! node -e "const required = '$REQUIRED_NODE_VERSION'.split('.').map(Number); const current = '$CURRENT_NODE_VERSION'.split('.').map(Number); if (current[0] < required[0] || (current[0] === required[0] && current[1] < required[1])) process.exit(1);" 2>/dev/null; then
  log_error "Node.js version $CURRENT_NODE_VERSION is too old. Required: >= $REQUIRED_NODE_VERSION"
  exit 1
fi
log_success "Node.js version: $CURRENT_NODE_VERSION"

# Check required files
log_info "Checking required files..."
if [[ ! -f "$SERVER_DIR/package.json" ]]; then
  log_error "package.json not found in $SERVER_DIR"
  exit 1
fi

if [[ ! -f "$CLIENT_DIR/package.json" ]]; then
  log_error "package.json not found in $CLIENT_DIR"
  exit 1
fi

if [[ ! -f "$VISION_WEB_DIR/package.json" ]]; then
  log_error "package.json not found in $VISION_WEB_DIR (kc-vision-web)"
  exit 1
fi
log_success "Required files found"

# Check Docker availability
log_info "Checking Docker availability..."
if ! command -v docker >/dev/null 2>&1; then
  log_error "Docker not found. Please install Docker Desktop."
  exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
  log_error "Docker daemon is not running. Please start Docker Desktop."
  exit 1
fi
log_success "Docker is available and running"

# ============================================================================
# Code Quality & Security Checks (Lint, Snyk always; audit + Sonar unless SKIP_CHECKS=1)
# ============================================================================

log_info "Running Code Quality & Security Checks (Lint, Snyk, audit, Sonar if token)..."

# --- Linting (always; stops on failure) ---
log_info "Running server linting..."
(cd "$SERVER_DIR" && npm run lint)

log_info "Running client linting (mobile)..."
(cd "$CLIENT_DIR" && npm run lint)

log_info "Running KC Vision Web linting..."
(cd "$VISION_WEB_DIR" && npm run lint)
log_success "Lint checks passed."

# --- Client audit (skip when SKIP_CHECKS=1) ---
if [[ "${SKIP_CHECKS:-}" == "1" ]]; then
  log_warning "Skipping client audit:all (SKIP_CHECKS=1; lint and Snyk still run)."
else
  log_info "Running client audit checks (Colors, i18n, Constants, Responsive, Unused)..."
  (cd "$CLIENT_DIR" && npm run audit:all)
  log_success "Audit checks passed."
fi

# --- Snyk (always; stops on failure) ---
if command -v snyk >/dev/null 2>&1; then
  SNYK_CMD=("snyk")
else
  log_info "Snyk CLI not found. Running via npx..."
  SNYK_CMD=("npx" "snyk")
fi

log_info "Running Snyk security checks on server..."
(cd "$SERVER_DIR" && "${SNYK_CMD[@]}" test --all-projects)

log_info "Running Snyk security checks on client..."
(cd "$CLIENT_DIR" && "${SNYK_CMD[@]}" test --all-projects)
log_success "Snyk checks passed."

# --- SonarQube (when SONAR_TOKEN set; skip entirely when SKIP_CHECKS=1) ---
if [[ "${SKIP_CHECKS:-}" == "1" ]]; then
  log_warning "Skipping SonarQube (SKIP_CHECKS=1)."
elif [[ -z "${SONAR_TOKEN:-}" ]]; then
  log_warning "SONAR_TOKEN not set. Skipping SonarQube checks (set SONAR_TOKEN to enable)."
else
  if command -v sonar-scanner >/dev/null 2>&1; then
    SONAR_CMD=("sonar-scanner")
  else
    log_info "sonar-scanner CLI not found. Running via npx..."
    SONAR_CMD=("npx" "sonar-scanner")
  fi

  log_info "Running SonarQube checks on server..."
  (cd "$SERVER_DIR" && "${SONAR_CMD[@]}")

  log_info "Running SonarQube checks on client..."
  (cd "$CLIENT_DIR" && "${SONAR_CMD[@]}")
  log_success "SonarQube checks passed."
fi

# ============================================================================
# Port Management
# ============================================================================

log_info "Checking and freeing ports..."

# Check and free server port
if ! is_port_available "$SERVER_PORT"; then
  log_warning "Port $SERVER_PORT is in use. Attempting to free it..."
  kill_port "$SERVER_PORT"
  sleep 2
  if ! is_port_available "$SERVER_PORT"; then
    log_error "Port $SERVER_PORT is still in use. Please free it manually."
    exit 1
  fi
fi

# Check and free web UI port (Vite / KC Vision Web; env EXPO_PORT kept for backward compatibility)
if ! is_port_available "$EXPO_PORT"; then
  log_warning "Port $EXPO_PORT (web UI) is in use. Attempting to free it..."
  kill_port "$EXPO_PORT"
  sleep 2
  if ! is_port_available "$EXPO_PORT"; then
    log_error "Port $EXPO_PORT is still in use. Please free it manually."
    exit 1
  fi
fi

# Free other common ports that might interfere
kill_port 8080
kill_port 8080
kill_port 3000
kill_port 5432 # Free Postgres port to ensure we connect to Docker, not local DB

log_success "Ports are ready"

# ============================================================================
# Docker Services Setup
# ============================================================================

log_info "Starting Docker services (Postgres & Redis)..."

# MODIFIED: Preserve data between runs - only stop containers, don't delete volumes
log_info "Ensuring clean Docker state..."
(cd "$SERVER_DIR" && docker compose down --remove-orphans >/dev/null 2>&1 || true)

# Explicitly remove containers if they still exist (handles name conflicts)
log_info "Cleaning up any lingering containers..."
docker rm -f kc-mvp-server-postgres-1 kc-mvp-server-redis-1 >/dev/null 2>&1 || true

if docker compose version >/dev/null 2>&1; then
  (cd "$SERVER_DIR" && docker compose up -d --remove-orphans || {
    log_error "Failed to start Docker Compose services"
    exit 1
  })
elif command -v docker-compose >/dev/null 2>&1; then
  (cd "$SERVER_DIR" && docker-compose up -d || {
    log_error "Failed to start Docker Compose services"
    exit 1
  })
else
  log_error "docker compose not found"
  exit 1
fi

# Wait for Postgres to be ready
log_info "Waiting for Postgres to be ready..."
POSTGRES_READY=0
for i in {1..30}; do
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]] && docker exec "$POSTGRES_CONTAINER" pg_isready -U kc >/dev/null 2>&1; then
    POSTGRES_READY=1
    break
  fi
  if [[ $i -eq 30 ]]; then
    log_error "Postgres did not become ready in time"
    exit 1
  fi
  sleep 1
done
if [[ $POSTGRES_READY -eq 1 ]]; then
  log_success "Postgres is ready"
fi

# Wait for Redis to be ready
log_info "Waiting for Redis to be ready..."
REDIS_READY=0
for i in {1..30}; do
  REDIS_CONTAINER=$(docker ps -q -f name=redis)
  if [[ -n "$REDIS_CONTAINER" ]] && docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
    REDIS_READY=1
    break
  fi
  if [[ $i -eq 30 ]]; then
    log_error "Redis did not become ready in time"
    exit 1
  fi
  sleep 1
done
if [[ $REDIS_READY -eq 1 ]]; then
  log_success "Redis is ready"
fi

# ============================================================================
# Database Migration: UUID Conversion (run early, before init-db)
# ============================================================================

log_info "Running UUID conversion migration (if tables exist)..."
MIGRATION_FILE="$SERVER_DIR/src/database/migration-uuid-conversion.sql"
if [[ ! -f "$MIGRATION_FILE" ]]; then
  log_warning "Migration file not found: $MIGRATION_FILE - skipping migration"
else
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]]; then
    # Check if tables exist before running migration
    TABLES_EXIST=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('chat_messages', 'message_read_receipts', 'chat_conversations');" 2>/dev/null || echo "0")
    
    if [[ "$TABLES_EXIST" -gt "0" ]]; then
      # Run migration with error handling - ignore errors if columns are already UUID
      if docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db < "$MIGRATION_FILE" 2>/dev/null; then
        log_success "UUID conversion migration completed"
      else
        # Check if error is because columns are already UUID (which is fine)
        SENDER_ID_TYPE=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
          "SELECT data_type FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='sender_id';" 2>/dev/null || echo "")
        if [[ "$SENDER_ID_TYPE" == "uuid" ]]; then
          log_success "UUID conversion migration skipped (columns already UUID)"
        else
          log_warning "UUID conversion migration had errors (will retry after init-db)"
        fi
      fi
    else
      log_info "Tables don't exist yet - migration will run after init-db"
    fi
  else
    log_warning "Postgres container not found - skipping UUID migration"
  fi
fi

# ============================================================================
# Server Build
# ============================================================================

cd "$SERVER_DIR"
log_info "Building server..."

# Clean old build artifacts
log_info "Cleaning old build artifacts..."
rm -rf "$SERVER_DIR/dist" "$SERVER_DIR/build.err.log" 2>/dev/null || true

# Ensure dependencies are installed
if [[ ! -d node_modules ]] && [[ ! -d "$MONOREPO_ROOT/node_modules" ]]; then 
  log_info "Installing dependencies (root node_modules missing)..."
  (cd "$MONOREPO_ROOT" && npm install)
fi

# Verify critical dependencies are installed (checking both local and root for monorepo compatibility)
if [[ ! -f node_modules/body-parser/package.json ]] && [[ ! -f "$MONOREPO_ROOT/node_modules/body-parser/package.json" ]]; then
  log_warning "Critical dependency 'body-parser' not found. Installing..."
  npm install body-parser --no-save # Install locally but don't save to package.json to avoid cluttering monorepo
  if [[ ! -f node_modules/body-parser/package.json ]]; then
    log_error "Failed to install body-parser. Aborting."
    exit 1
  fi
fi

# Build with error logging
log_info "Running npm run build..."
if ! npm run build 2>build.err.log; then
  log_error "Build failed. Errors:"
  if [[ -f build.err.log ]]; then
    tail -100 build.err.log
  fi
  log_error "TSC fallback attempt..."
  if ! npx tsc -p tsconfig.build.json 2>>build.err.log; then
    log_error "TSC fallback also failed. Aborting."
    exit 1
  fi
fi

# Verify build output
if [[ ! -f "$SERVER_DIR/dist/main.js" ]]; then
  log_error "Build output missing: dist/main.js"
  log_warning "Running tsc fallback..."
  if ! npx tsc -p tsconfig.build.json; then
    log_error "TSC fallback failed. Aborting."
    exit 1
  fi
  if [[ ! -f "$SERVER_DIR/dist/main.js" ]]; then
    log_error "Build output still missing after fallback. Aborting."
    exit 1
  fi
fi

log_success "Server build completed"

# Check for required build files
REQUIRED_JS=(
  "$SERVER_DIR/dist/main.js"
  "$SERVER_DIR/dist/app.module.js"
  "$SERVER_DIR/dist/controllers/health.controller.js"
  "$SERVER_DIR/dist/controllers/chat.controller.js"
  "$SERVER_DIR/dist/items/items.controller.js"
  "$SERVER_DIR/dist/items/items.module.js"
)

MISSING_ANY=0
for f in "${REQUIRED_JS[@]}"; do
  if [[ ! -f "$f" ]]; then MISSING_ANY=1; fi
done

if [[ $MISSING_ANY -eq 1 ]]; then
  log_warning "Build output incomplete — switching to ts-node runtime."
  FALLBACK_SERVER_JS=1
fi

# ============================================================================
# Environment Configuration
# ============================================================================

log_info "Configuring environment variables..."

# Database configuration
export REDIS_URL=${REDIS_URL:-redis://localhost:6379}
export POSTGRES_HOST=${POSTGRES_HOST:-127.0.0.1}
export POSTGRES_PORT=${POSTGRES_PORT:-5435}
export POSTGRES_USER=${POSTGRES_USER:-kc}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-local_secret}
export POSTGRES_DB=${POSTGRES_DB:-kc_db}
export PORT="$SERVER_PORT"
export DATABASE_URL=${DATABASE_URL:-postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB}

# Environment configuration (CRITICAL)
export ENVIRONMENT=${ENVIRONMENT:-development}
export NODE_ENV=${NODE_ENV:-development}

# CORS configuration (IMPORTANT)
export CORS_ORIGIN=${CORS_ORIGIN:-"http://localhost:8081,http://localhost:5173,http://localhost:3000,http://localhost:19006"}

# JWT Secret (CRITICAL - try .env first, then generate)
if [[ -z "${JWT_SECRET:-}" ]]; then
  # Try to find it in .env file
  ENV_FILE="$SERVER_DIR/.env"
  if [[ -f "$ENV_FILE" ]]; then
    DOT_ENV_SECRET=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2- || echo "")
    if [[ -n "$DOT_ENV_SECRET" ]]; then
      export JWT_SECRET="$DOT_ENV_SECRET"
      log_success "Using JWT_SECRET from .env: ${JWT_SECRET:0:20}..."
    fi
  fi
  
  # Generation fallback if still not set
  if [[ -z "${JWT_SECRET:-}" ]]; then
    log_info "Generating NEW JWT_SECRET for local development..."
    export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    log_success "JWT_SECRET generated: ${JWT_SECRET:0:20}..."
    
    # Optionally save to .env if missing to help next time
    if [[ -f "$ENV_FILE" ]] && ! grep -q "^JWT_SECRET=" "$ENV_FILE"; then
      echo "JWT_SECRET=$JWT_SECRET" >> "$ENV_FILE"
      log_info "Saved new JWT_SECRET to $ENV_FILE"
    fi
  fi
else
  if [[ ${#JWT_SECRET} -lt 32 ]]; then
    log_error "JWT_SECRET must be at least 32 characters long (current: ${#JWT_SECRET})"
    exit 1
  fi
  log_success "Using provided JWT_SECRET: ${JWT_SECRET:0:20}..."
fi

# Google OAuth Configuration (CRITICAL for auth to work)
export GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com}
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com}
export EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:-430191522654-q05j71a8lu3e1vgf75c2r2jscgckb4mm.apps.googleusercontent.com}
export EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:-430191522654-jno2tkl1dotil0mkf4h4hahfk4e4gas8.apps.googleusercontent.com}

echo ""
log_info "Environment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Node Env: $NODE_ENV"
echo "   CORS Origin: $CORS_ORIGIN"
echo "   GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
echo "   Web Client ID: ${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:0:20}..."

# ============================================================================
# Database Initialization
# ============================================================================

log_info "Ensuring DB tables (init script)..."

if ! SKIP_FULL_SCHEMA=1 NODE_OPTIONS= \
  POSTGRES_HOST="$POSTGRES_HOST" \
  POSTGRES_PORT="$POSTGRES_PORT" \
  POSTGRES_USER="$POSTGRES_USER" \
  POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  POSTGRES_DB="$POSTGRES_DB" \
  DATABASE_URL="$DATABASE_URL" \
  npx ts-node -r tsconfig-paths/register src/scripts/init-db.ts; then
  log_error "DB init failed. Aborting."
  exit 1
fi
log_success "Database initialized"

# ============================================================================
# Database Migration: UUID Conversion (retry after init-db if needed)
# ============================================================================

log_info "Ensuring UUID conversion migration is applied..."
MIGRATION_FILE="$SERVER_DIR/src/database/migration-uuid-conversion.sql"
if [[ ! -f "$MIGRATION_FILE" ]]; then
  log_warning "Migration file not found: $MIGRATION_FILE - skipping migration"
else
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]]; then
    # Check if columns are already UUID
    SENDER_ID_TYPE=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
      "SELECT data_type FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='sender_id';" 2>/dev/null || echo "")
    
    if [[ "$SENDER_ID_TYPE" != "uuid" ]] && [[ -n "$SENDER_ID_TYPE" ]]; then
      # Run migration
      if docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db < "$MIGRATION_FILE" 2>/dev/null; then
        log_success "UUID conversion migration completed"
      else
        log_warning "UUID conversion migration had errors (columns may already be UUID or tables may not exist)"
      fi
    else
      log_success "UUID conversion already applied (columns are UUID)"
    fi
  else
    log_warning "Postgres container not found - skipping UUID migration"
  fi
fi

# ============================================================================
# Database Migration: Ensure Required Columns (google_id, roles)
# ============================================================================

log_info "Ensuring required columns exist in user_profiles..."
COLUMN_MIGRATION_FILE="$SERVER_DIR/src/database/migration-ensure-columns.sql"
if [[ ! -f "$COLUMN_MIGRATION_FILE" ]]; then
  log_warning "Column migration file not found: $COLUMN_MIGRATION_FILE - skipping"
else
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]]; then
    # Run migration (it's safe to run multiple times - it checks if columns exist)
    if docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db < "$COLUMN_MIGRATION_FILE" 2>/dev/null; then
      log_success "Required columns migration completed"
    else
      log_warning "Column migration had errors (columns may already exist)"
    fi
  else
    log_warning "Postgres container not found - skipping column migration"
  fi
fi

# ============================================================================
# Database Migration: Add Missing Columns (parent_manager_id, settings, etc.)
# ============================================================================

log_info "Running missing columns migration..."
MISSING_COLUMNS_MIGRATION_FILE="$SERVER_DIR/src/database/migration-add-missing-columns.sql"
if [[ ! -f "$MISSING_COLUMNS_MIGRATION_FILE" ]]; then
  log_warning "Missing columns migration file not found: $MISSING_COLUMNS_MIGRATION_FILE - skipping"
else
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]]; then
    # Run migration (it's safe to run multiple times - it checks if columns exist)
    if docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db < "$MISSING_COLUMNS_MIGRATION_FILE" 2>/dev/null; then
      log_success "Missing columns migration completed"
    else
      log_warning "Missing columns migration had warnings (columns may already exist)"
    fi
  else
    log_warning "Postgres container not found - skipping missing columns migration"
  fi
fi

# ============================================================================
# Database Migration: Fix Schema Synchronization (avatar_url, tasks table)
# ============================================================================

log_info "Running schema synchronization migration..."
SCHEMA_SYNC_MIGRATION_FILE="$SERVER_DIR/src/database/migration-fix-schema-sync.sql"
if [[ ! -f "$SCHEMA_SYNC_MIGRATION_FILE" ]]; then
  log_warning "Schema sync migration file not found: $SCHEMA_SYNC_MIGRATION_FILE - skipping"
else
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]]; then
    # Run migration (it's safe to run multiple times - it checks if columns/tables exist)
    if docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db < "$SCHEMA_SYNC_MIGRATION_FILE" 2>/dev/null; then
      log_success "Schema synchronization migration completed"
    else
      log_warning "Schema sync migration had warnings (schema may already be correct)"
    fi
  else
    log_warning "Postgres container not found - skipping schema sync migration"
  fi
fi

# ============================================================================
# Database Migration: Posts Table (ensure posts table exists with correct schema)
# ============================================================================

log_info "Ensuring posts table exists with correct schema..."
POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
if [[ -n "$POSTGRES_CONTAINER" ]]; then
  # Check if posts table exists and has correct structure
  POSTS_TABLE_EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='posts');" 2>/dev/null || echo "false")
  
  POSTS_HAS_AUTHOR_ID=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='author_id');" 2>/dev/null || echo "false")
  
  if [[ "$POSTS_TABLE_EXISTS" == "t" ]] && [[ "$POSTS_HAS_AUTHOR_ID" == "t" ]]; then
    log_success "Posts table already exists with correct schema - no migration needed"
  else
    # Table doesn't exist or has wrong structure - create/update it safely
    log_info "Creating or updating posts table..."
    
    # Check if table exists but has wrong structure (legacy table with user_id/item_id/data)
    POSTS_HAS_LEGACY_STRUCTURE=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='user_id');" 2>/dev/null || echo "false")
    
    if [[ "$POSTS_HAS_LEGACY_STRUCTURE" == "t" ]]; then
      log_warning "Detected legacy posts table structure - migrating to new schema..."
      # Backup data if exists (though legacy table likely has different structure)
      POSTS_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
        "SELECT COUNT(*) FROM posts;" 2>/dev/null || echo "0")
      if [[ "$POSTS_COUNT" -gt "0" ]]; then
        log_warning "Posts table has $POSTS_COUNT rows - these will be lost due to schema change"
        log_warning "If you need to preserve this data, please export it manually before running this script"
      fi
    fi
    
    # Create posts table with correct schema (safe to run multiple times)
    docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db <<EOF 2>/dev/null || true
-- Create posts table if it doesn't exist, or recreate if it has wrong structure
DO \$\$
BEGIN
    -- Drop table only if it has wrong structure (legacy)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='posts' AND column_name='user_id'
    ) THEN
        DROP TABLE IF EXISTS posts CASCADE;
    END IF;
    
    -- Create table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name='posts'
    ) THEN
        CREATE TABLE posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            images TEXT[],
            likes INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            post_type VARCHAR(50) DEFAULT 'task_completion',
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
        
        DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
        CREATE TRIGGER update_posts_updated_at 
            BEFORE UPDATE ON posts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END \$\$;
EOF
    
    if [[ $? -eq 0 ]]; then
      log_success "Posts table ensured with correct schema"
    else
      log_warning "Posts table creation had warnings (table may already exist)"
    fi
  fi
else
  log_warning "Postgres container not found - skipping posts table creation"
fi

# ============================================================================
# Database Migration: Community Group Challenges Tables
# ============================================================================

log_info "Ensuring community group challenges tables exist..."
COMMUNITY_CHALLENGES_SCHEMA_FILE="$SERVER_DIR/src/database/community-group-challenges-schema.sql"
if [[ ! -f "$COMMUNITY_CHALLENGES_SCHEMA_FILE" ]]; then
  log_warning "Community challenges schema file not found: $COMMUNITY_CHALLENGES_SCHEMA_FILE - skipping"
else
  POSTGRES_CONTAINER=$(docker ps -q -f name=postgres)
  if [[ -n "$POSTGRES_CONTAINER" ]]; then
    # Check if community_group_challenges table exists
    COMMUNITY_CHALLENGES_EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='community_group_challenges');" 2>/dev/null || echo "false")
    
    if [[ "$COMMUNITY_CHALLENGES_EXISTS" == "t" ]]; then
      log_success "Community group challenges tables already exist - no migration needed"
    else
      log_info "Creating community group challenges tables..."
      if docker exec -i "$POSTGRES_CONTAINER" psql -U kc -d kc_db < "$COMMUNITY_CHALLENGES_SCHEMA_FILE" 2>/dev/null; then
        log_success "Community group challenges tables created successfully"
      else
        log_warning "Community challenges schema creation had warnings (tables may already exist)"
      fi
    fi
  else
    log_warning "Postgres container not found - skipping community challenges tables creation"
  fi
fi

# Final check: ensure dependencies are installed before starting server
if [[ ! -f node_modules/body-parser/package.json ]] && [[ ! -f "$MONOREPO_ROOT/node_modules/body-parser/package.json" ]]; then
  log_warning "body-parser not found. Installing dependencies..."
  npm install
  if [[ ! -f node_modules/body-parser/package.json ]] && [[ ! -f "$MONOREPO_ROOT/node_modules/body-parser/package.json" ]]; then
    log_error "Failed to install dependencies. Aborting."
    exit 1
  fi
fi

# ============================================================================
# Server Startup
# ============================================================================

log_info "Starting server on http://localhost:$SERVER_PORT ..."
if [[ -n "${FALLBACK_SERVER_JS:-}" ]]; then
  log_warning "Using fallback: running TS directly via ts-node"
  # ensure dev deps
  if [[ ! -d node_modules ]]; then npm ci || npm install; fi
  SKIP_FULL_SCHEMA=1 \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" \
  DATABASE_URL="$DATABASE_URL" \
  REDIS_URL="$REDIS_URL" \
  NODE_ENV="$NODE_ENV" \
  ENVIRONMENT="$ENVIRONMENT" \
  CORS_ORIGIN="$CORS_ORIGIN" \
  JWT_SECRET="$JWT_SECRET" \
  PORT="$PORT" \
  node -r ts-node/register -r tsconfig-paths/register src/main.ts &
else
  SKIP_FULL_SCHEMA=1 \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" \
  DATABASE_URL="$DATABASE_URL" \
  REDIS_URL="$REDIS_URL" \
  NODE_ENV="$NODE_ENV" \
  ENVIRONMENT="$ENVIRONMENT" \
  CORS_ORIGIN="$CORS_ORIGIN" \
  JWT_SECRET="$JWT_SECRET" \
  PORT="$PORT" \
  node dist/main.js &
fi
SERVER_PID=$!

# Wait for server to be healthy
log_info "Waiting for server to be healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=80
until curl -sf http://localhost:"$SERVER_PORT"/health >/dev/null 2>&1 || curl -sf http://localhost:"$SERVER_PORT"/ >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [[ $ATTEMPTS -gt $MAX_ATTEMPTS ]]; then
    log_error "Server did not become healthy in time"
    exit 1
  fi
  if [[ $((ATTEMPTS % 10)) -eq 0 ]]; then
    log_info "Still waiting... ($ATTEMPTS/$MAX_ATTEMPTS)"
  fi
  sleep 0.25
done
log_success "Server is up and healthy"

# ============================================================================
# API Tests
# ============================================================================

log_info "Running API Health Tests..."
if ! "$CLIENT_DIR/scripts/test-api-health.sh" "$SERVER_PORT"; then
  log_error "API Health Tests failed. Aborting."
  exit 1
fi
log_success "API Health Tests passed"

# ============================================================================
# Client (KC Vision Web — Vite) Startup
# ============================================================================

log_info "Starting KC Vision Web / Vite (API=http://localhost:$SERVER_PORT, port=$EXPO_PORT)"

# Root install supplies hoisted deps for @kc/vision-web workspace
if [[ ! -d "$MONOREPO_ROOT/node_modules" ]]; then
  log_info "Installing monorepo dependencies (root node_modules missing)..."
  (cd "$MONOREPO_ROOT" && npm install --legacy-peer-deps)
fi

export EXPO_PUBLIC_API_BASE_URL=http://localhost:"$SERVER_PORT"
export EXPO_PUBLIC_USE_BACKEND=1
export EXPO_PUBLIC_USE_FIRESTORE=0

# ============================================================================
# Final User Message
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🎉 Local E2E Environment is Ready!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📍 API:        http://localhost:$SERVER_PORT"
echo "📍 Web (POC):  http://localhost:$EXPO_PORT"
echo ""
echo "🔧 Environment: $ENVIRONMENT"
echo "🗄️  Database: $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
echo "📦 Redis: $REDIS_URL"
echo ""
echo "💡 Tips:"
echo "   - Press Ctrl+C to stop all services"
echo "   - Server logs: Check terminal output"
echo "   - Database: docker exec -it \$(docker ps -q -f name=postgres) psql -U kc -d kc_db"
echo "   - Redis: docker exec -it \$(docker ps -q -f name=redis) redis-cli"
echo ""
echo "⚠️  Open http://localhost:$EXPO_PORT for the KC Vision Web POC (Vite)."
echo "   Expo Web is not started by this script."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Vite in foreground — same default port as before (8081) unless EXPO_PORT is overridden
(cd "$MONOREPO_ROOT" && npm run dev --workspace=@kc/vision-web -- --port "$EXPO_PORT" --host)
