#!/bin/bash
# File overview:
# - Purpose: Complete reset of ALL local data - Postgres, Redis, and Frontend storage
# - Usage: ./scripts/reset-all-local-data.sh
# - Warning: This will DELETE ALL DATA from local database AND frontend storage

set -e

# Get script directory and ensure we're in the server directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

# Verify we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ Error: docker-compose.yml not found in $SERVER_DIR"
  echo "   Please run this script from the KC-MVP-server directory"
  exit 1
fi

# Load database connection details from .env file (if exists)
# Default to Docker container values, but allow override from .env
if [ -f ".env" ]; then
  export $(grep -E "^POSTGRES_" .env | grep -v "^#" | xargs)
fi

# Use .env values if set, otherwise use Docker defaults
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-kc}"
DB_PASSWORD="${POSTGRES_PASSWORD:-kc_password}"
DB_NAME="${POSTGRES_DB:-kc_db}"

# ============================================================================
# SAFETY CHECKS - Prevent accidental production database deletion
# ============================================================================

echo "🔒 Running safety checks..."
SAFETY_CHECK_FAILED=0

# Check 1: Host must be localhost or 127.0.0.1
if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" && "$DB_HOST" != "::1" ]]; then
  echo "❌ SAFETY CHECK FAILED: Database host is not localhost!"
  echo "   Host: $DB_HOST"
  echo "   This script only works with LOCAL databases (localhost or 127.0.0.1)"
  echo "   To prevent accidental deletion of production data, this script is blocked."
  SAFETY_CHECK_FAILED=1
fi

# Check 2: Host must not contain production keywords
if echo "$DB_HOST" | grep -qiE "production|prod|railway|vercel|aws|azure|gcp|cloud|remote|external"; then
  echo "❌ SAFETY CHECK FAILED: Database host contains production keywords!"
  echo "   Host: $DB_HOST"
  echo "   This looks like a production database. Blocking to prevent data loss."
  SAFETY_CHECK_FAILED=1
fi

# Check 3: Check DATABASE_URL if it exists
if [ -n "${DATABASE_URL:-}" ]; then
  if echo "$DATABASE_URL" | grep -qiE "production|prod|railway|vercel|aws|azure|gcp|cloud|\.com|\.net|\.org"; then
    echo "❌ SAFETY CHECK FAILED: DATABASE_URL contains production indicators!"
    echo "   DATABASE_URL: ${DATABASE_URL:0:50}..."
    echo "   This looks like a production database URL. Blocking to prevent data loss."
    SAFETY_CHECK_FAILED=1
  fi
  
  # Extract host from DATABASE_URL and verify it's localhost
  DB_URL_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  if [[ -n "$DB_URL_HOST" && "$DB_URL_HOST" != "localhost" && "$DB_URL_HOST" != "127.0.0.1" ]]; then
    echo "❌ SAFETY CHECK FAILED: DATABASE_URL points to non-localhost!"
    echo "   Host from DATABASE_URL: $DB_URL_HOST"
    echo "   This script only works with LOCAL databases."
    SAFETY_CHECK_FAILED=1
  fi
fi

# Check 4: Port must be standard local port (not production ports)
if [[ "$DB_PORT" != "5432" && "$DB_PORT" != "5433" && "$DB_PORT" != "5434" ]]; then
  echo "⚠️  WARNING: Database port is not standard local port (5432/5433/5434)"
  echo "   Port: $DB_PORT"
  echo "   Continuing, but please verify this is a local database."
fi

# Check 5: Database name should not contain production keywords
if echo "$DB_NAME" | grep -qiE "production|prod|live|main"; then
  echo "❌ SAFETY CHECK FAILED: Database name contains production keywords!"
  echo "   Database: $DB_NAME"
  echo "   This looks like a production database. Blocking to prevent data loss."
  SAFETY_CHECK_FAILED=1
fi

# Check 6: Verify we can actually connect and it's a local database
if [ "$SAFETY_CHECK_FAILED" -eq 0 ]; then
  # Try to connect and check if it's really localhost
  if command -v psql >/dev/null 2>&1; then
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
      # Check if we can get the database location info
      DB_INFO=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT current_setting('listen_addresses');" 2>/dev/null || echo "")
      if [[ -n "$DB_INFO" && "$DB_INFO" != "localhost" && "$DB_INFO" != "*" && "$DB_INFO" != "0.0.0.0" ]]; then
        echo "⚠️  WARNING: Database listen_addresses is: $DB_INFO"
        echo "   This might not be a local-only database."
      fi
    fi
  fi
fi

# If any safety check failed, exit
if [ "$SAFETY_CHECK_FAILED" -eq 1 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "❌ SAFETY CHECKS FAILED - SCRIPT BLOCKED"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "This script is designed to ONLY work with LOCAL databases."
  echo "If you need to reset a production database, use a different method."
  echo ""
  echo "Current configuration:"
  echo "   Host: $DB_HOST"
  echo "   Port: $DB_PORT"
  echo "   User: $DB_USER"
  echo "   Database: $DB_NAME"
  echo ""
  exit 1
fi

echo "✅ Safety checks passed - database appears to be local"
echo ""

# Determine if we should use Docker exec or direct psql
USE_DOCKER=false
if [ "$DB_USER" = "kc" ] && [ -z "$POSTGRES_PASSWORD" ]; then
  USE_DOCKER=true
  echo "📦 Using Docker container database (user: kc)"
else
  echo "🔌 Using direct database connection (user: $DB_USER, host: $DB_HOST)"
  # Set PGPASSWORD for direct connection
  export PGPASSWORD="$DB_PASSWORD"
fi

echo "=========================================="
echo "🗑️  FULL Local Data Reset"
echo "=========================================="
echo "⚠️  WARNING: This will DELETE ALL DATA from:"
echo "   - Local database (Postgres) - ALL tables including:"
echo "     * All users and user profiles"
echo "     * All posts, chats, messages"
echo "     * All items and dedicated items"
echo "     * All donations (donation_categories will be kept - project structure)"
echo "     * All organizations, events, rides"
echo "     * All challenges, analytics, bookmarks"
echo "     * ALL other user data tables"
echo "   - Redis cache (all keys)"
echo "   - Frontend local storage (AsyncStorage/localStorage)"
echo ""
echo "📁 Working directory: $SERVER_DIR"
echo "🗄️  Database: $DB_HOST:$DB_PORT/$DB_NAME (user: $DB_USER)"
echo ""
echo "⚠️  FINAL CONFIRMATION REQUIRED"
echo "   This will PERMANENTLY DELETE ALL LOCAL DATA!"
echo "   Type 'DELETE ALL LOCAL DATA' to confirm:"
read -r CONFIRMATION
if [ "$CONFIRMATION" != "DELETE ALL LOCAL DATA" ]; then
  echo "❌ Confirmation failed. Script aborted."
  exit 1
fi
echo "✅ Confirmation received. Proceeding with data deletion..."
echo ""

# Step 1: Stop containers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1/9: Stopping Docker containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker compose down 2>&1; then
  echo "✅ Docker containers stopped successfully"
else
  echo "⚠️  Warning: Some containers may not have been running (this is OK)"
fi

# Step 2: Remove volumes (complete wipe)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  Step 2/9: Removing Docker volumes (complete wipe)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker compose down -v 2>&1; then
  echo "✅ Docker volumes removed successfully"
  echo "   - Postgres data volume deleted"
  echo "   - Redis data volume deleted"
else
  echo "⚠️  Warning: Some volumes may not have existed (this is OK)"
fi

# Step 3: Start containers
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Step 3/9: Starting Docker containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker compose up -d 2>&1; then
  echo "✅ Docker containers started successfully"
  echo "   - Postgres container: starting..."
  echo "   - Redis container: starting..."
else
  echo "❌ Error: Failed to start Docker containers"
  exit 1
fi

# Step 4: Wait for Postgres
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Step 4/9: Waiting for Postgres to be ready..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$USE_DOCKER" = true ]; then
  echo "   Waiting 5 seconds for Postgres to initialize..."
  sleep 5

  MAX_ATTEMPTS=30
  ATTEMPT=0
  echo "   Checking Postgres readiness..."
  until docker compose exec -T postgres pg_isready -U kc > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $((ATTEMPT % 5)) -eq 0 ]; then
      echo "   Still waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    fi
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
      echo "❌ Error: Postgres did not become ready in time"
      echo "   Tried $MAX_ATTEMPTS times, giving up"
      exit 1
    fi
    sleep 1
  done
  echo "✅ Postgres is ready and accepting connections"
else
  echo "   Checking direct database connection..."
  MAX_ATTEMPTS=5
  ATTEMPT=0
  until psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
      echo "❌ Error: Cannot connect to database at $DB_HOST:$DB_PORT"
      echo "   User: $DB_USER, Database: $DB_NAME"
      exit 1
    fi
    echo "   Retrying connection... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 1
  done
  echo "✅ Database connection successful"
fi

# Step 5: Initialize database schema
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Step 5/9: Initializing database schema..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Running: npm run init:db"
echo "   Note: This will add donation_categories (project structure)"
echo "         User data will be deleted in the next step (categories kept)"
if npm run init:db 2>&1; then
  echo "✅ Database schema initialized successfully"
else
  echo "❌ Error: Failed to initialize database schema"
  echo "   Check the error messages above for details"
  exit 1
fi

# Step 6: Delete ALL data from all tables (except donation_categories)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  Step 6/9: Deleting ALL data from all tables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   This will delete:"
echo "   - All users (user_profiles)"
echo "   - All posts"
echo "   - All items (items, items_delivery)"
echo "   - All chats and messages"
echo "   - All donations (except donation_categories)"
echo "   - All rides, events, organizations"
echo "   - All challenges, analytics, bookmarks"
echo "   - ALL other user data"
echo ""
echo "   Executing TRUNCATE on all tables (keeping donation_categories)..."

# Fixed SQL Syntax here: Removed extra escaping
# Use the correct database connection based on .env settings
if [ "$USE_DOCKER" = true ]; then
  DB_CMD="docker compose exec -T postgres psql -U kc -d kc_db"
else
  DB_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
fi

if $DB_CMD <<'SQL_EOF' 2>&1; then
-- Disable foreign key constraints temporarily
SET session_replication_role = replica;

DO $$
DECLARE
    r RECORD;
    table_count INTEGER := 0;
    deleted_count INTEGER := 0;
    skipped_count INTEGER := 0;
    total_rows_deleted BIGINT := 0;
    rows_in_table BIGINT;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    ) LOOP
        table_count := table_count + 1;
        
        -- Skip donation_categories (project structure)
        IF r.tablename = 'donation_categories' THEN
            skipped_count := skipped_count + 1;
            RAISE NOTICE '⏭️  Skipping donation_categories (project structure)';
            CONTINUE;
        END IF;
        
        -- Count rows before deletion
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(r.tablename) INTO rows_in_table;
            total_rows_deleted := total_rows_deleted + rows_in_table;
        EXCEPTION WHEN OTHERS THEN
            rows_in_table := 0;
        END;
        
        BEGIN
            -- Try TRUNCATE first (faster, resets sequences)
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
            deleted_count := deleted_count + 1;
            RAISE NOTICE '✅ Deleted % rows from %', rows_in_table, r.tablename;
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                -- Fallback to DELETE if TRUNCATE fails
                EXECUTE 'DELETE FROM ' || quote_ident(r.tablename);
                deleted_count := deleted_count + 1;
                RAISE NOTICE '✅ Deleted % rows from % (using DELETE)', rows_in_table, r.tablename;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Could not delete from %: %', r.tablename, SQLERRM;
            END;
        END;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ DELETION SUMMARY:';
    RAISE NOTICE '   Total tables processed: %', table_count;
    RAISE NOTICE '   Tables deleted: %', deleted_count;
    RAISE NOTICE '   Tables skipped: %', skipped_count;
    RAISE NOTICE '   Total rows deleted: %', total_rows_deleted;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Reset all sequences to 1
DO $$
DECLARE
    r RECORD;
    seq_count INTEGER := 0;
BEGIN
    FOR r IN (
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1';
            seq_count := seq_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Error resetting sequence %: %', r.sequence_name, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'Total sequences reset: %', seq_count;
END $$;
SQL_EOF
  echo ""
  echo "✅ All table data deleted (donation_categories kept)"
  echo "   Sequences reset successfully"
else
  echo "⚠️  Warning: Some tables or sequences may have had errors (check output above)"
fi

# Step 7: Clear Redis
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  Step 7/9: Clearing Redis cache..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if docker compose exec -T redis redis-cli FLUSHALL 2>&1; then
  echo "✅ Redis cache cleared successfully"
else
  echo "⚠️  Warning: Redis may not have been running"
fi

# Step 8: Verify everything is empty
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 8/9: Verifying all tables are empty..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Use the correct database connection for verification
if [ "$USE_DOCKER" = true ]; then
  VERIFY_CMD="docker compose exec -T postgres psql -U kc -d kc_db -t"
else
  VERIFY_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t"
fi

VERIFICATION_RESULT=$($VERIFY_CMD <<'EOF'
CREATE OR REPLACE FUNCTION check_all_tables()
RETURNS TABLE(table_name TEXT, row_count BIGINT) AS $$
DECLARE
    r RECORD;
    cnt BIGINT;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    ) LOOP
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(r.tablename) INTO cnt;
            table_name := r.tablename;
            row_count := cnt;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM check_all_tables() ORDER BY table_name;
DROP FUNCTION IF EXISTS check_all_tables();
EOF
)

if [ -n "$VERIFICATION_RESULT" ]; then
  echo "$VERIFICATION_RESULT" | awk '{printf "   %-35s %10s rows\n", $1, $2}'
  
  # Check specific critical tables that must be empty
  CRITICAL_TABLES=("user_profiles" "users" "posts" "items" "chats" "messages" "donations" "rides" "challenges")
  CRITICAL_TABLES_FAILED=0
  
  echo ""
  echo "🔍 Verifying critical tables are empty..."
  for table in "${CRITICAL_TABLES[@]}"; do
    ROW_COUNT=$(echo "$VERIFICATION_RESULT" | awk -v t="$table" '$1 == t {print $2; exit}')
    if [ -z "$ROW_COUNT" ]; then
      # Table doesn't exist, which is OK
      continue
    fi
    if [ "$ROW_COUNT" -gt 0 ]; then
      echo "   ⚠️  $table: $ROW_COUNT rows (should be 0)"
      CRITICAL_TABLES_FAILED=1
    else
      echo "   ✅ $table: empty"
    fi
  done
  
  # Check if any tables still have data
  NON_EMPTY_TABLES=$(echo "$VERIFICATION_RESULT" | awk '$2 > 0 && $1 != "donation_categories" {print $1}')
  if [ -n "$NON_EMPTY_TABLES" ]; then
    echo ""
    echo "⚠️  WARNING: Some tables still contain data:"
    echo "$NON_EMPTY_TABLES" | while read -r table; do
      ROW_COUNT=$(echo "$VERIFICATION_RESULT" | awk -v t="$table" '$1 == t {print $2}')
      echo "   - $table: $ROW_COUNT rows"
    done
    echo ""
    echo "   This might indicate:"
    echo "   - Foreign key constraints prevented deletion"
    echo "   - Some tables require manual cleanup"
    echo "   - Database schema has changed"
    
    if [ "$CRITICAL_TABLES_FAILED" -eq 1 ]; then
      echo ""
      echo "❌ CRITICAL: Some critical tables still have data!"
      echo "   Please review the tables above and manually clean them if needed."
    fi
  else
    echo ""
    echo "✅ All user data tables are empty (donation_categories kept as expected)"
    echo "✅ All critical tables verified empty"
  fi
else
  echo "   (No tables found or error occurred)"
fi
echo ""

# Step 9: Clear frontend local storage
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 Step 9/9: Clearing frontend local storage data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PROJECT_ROOT="$(cd "$SERVER_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/MVP"

if [ -f "$FRONTEND_DIR/scripts/clear-local-storage.sh" ]; then
  echo "📱 Running frontend storage clear script..."
  cd "$FRONTEND_DIR"
  if bash scripts/clear-local-storage.sh; then
    echo "✅ Frontend storage clear script completed successfully"
  else
    echo "⚠️  Frontend storage clear script completed with warnings"
  fi
  cd "$SERVER_DIR"
else
  echo "⚠️  Frontend clear script not found. Skipping."
fi

echo ""
echo "=========================================="
echo "✅ FULL Local Data Reset Complete!"
echo "=========================================="
echo ""
echo "📊 Final Summary:"
echo "   ✅ All user data deleted from database"
echo "   ✅ All posts and items deleted"
echo "   ✅ All chats and messages deleted"
echo "   ✅ Redis cache cleared"
echo "   ✅ Frontend storage cleared"
echo ""
echo "⚠️  IMPORTANT: Make sure your frontend is connected to LOCAL server!"
echo "   Run the frontend with: npm run start:local"
echo "   Or set: EXPO_PUBLIC_API_BASE_URL=http://localhost:3001"
echo "   Otherwise, the frontend will connect to PRODUCTION server"
echo "   and you'll still see production data!"
echo ""
echo "🔒 Safety: This script ONLY works with local databases (localhost)"
echo "   Production databases are protected and cannot be deleted by this script."
echo ""