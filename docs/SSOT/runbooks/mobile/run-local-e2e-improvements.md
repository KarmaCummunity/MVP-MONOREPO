# Recommended improvements to the run-local-e2e.sh script

## What the script does well ✅

1. ✅ Node.js version checker
2. ✅ Checks the existence of required files
3. ✅ Docker availability checker
4. ✅ Port manager (releases busy ports)
5. ✅ Pick up Docker services (Postgres + Redis)
6. ✅ Waiting for the services to be ready
7. ✅ Runs migrations
8. ✅ Builds the server
9. ✅ Initializes the DB
10. ✅ checks that the server is working (health checks)
11. ✅ Runs comprehensive API tests
12. ✅ Starts the Expo

## What is missing or needs improvement ⚠️

### 1. Checking existing Docker Containers
**Problem**: The script does not check if there are existing containers running on the same ports before it tries to pick up new ones.

**Suggested solution**:
```bash
# Before docker compose up, check if there are existing containers
EXISTING_POSTGRES=$(docker ps -q -f name=postgres)
EXISTING_REDIS=$(docker ps -q -f name=redis)

if [[ -n "$EXISTING_POSTGRES" ]] || [[ -n "$EXISTING_REDIS" ]]; then
  log_warning "Found existing containers. Stopping them..."
  (cd "$SERVER_DIR" && docker compose down)
fi
```

### 2. Testing the Expo CLI
**Problem**: The script does not check if Expo CLI is installed before trying to run `npx expo start`.

**Suggested solution**:
```bash
# Before starting Expo
if ! command -v expo >/dev/null 2>&1 && ! npx expo --version >/dev/null 2>&1; then
  log_warning "Expo CLI not found. Installing..."
  npm install -g expo-cli || log_warning "Failed to install Expo CLI globally, will use npx"
fi
```

### 3. TypeScript testing before Build
**Problem**: The script doesn't check for TypeScript errors before trying to build.

**Suggested solution**:
```bash
# Before npm run build
log_info "Checking TypeScript compilation..."
if ! npx tsc --noEmit -p tsconfig.json 2>/dev/null; then
  log_warning "TypeScript errors found, but continuing with build..."
fi
```

### 4. Checking npm Cache
**Problem**: Sometimes npm cache can cause problems. The script does not clear it.

**Suggested solution** (optional):
```bash
# If there are problems with dependencies
if [[ "${CLEAR_NPM_CACHE:-}" == "1" ]]; then
  log_info "Clearing npm cache..."
  npm cache clean --force
fi
```

### 5. Checking Database Schema before Init
**Problem**: The script doesn't check if the DB is already initialized before trying to reinitialize it.

**Suggested solution**:
```bash
# Before init-db, check if the tables already exist
TABLES_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

if [[ "$TABLES_COUNT" -gt "0" ]]; then
  log_info "Database already initialized ($TABLES_COUNT tables found)"
  if [[ "${RESET_DB:-}" == "1" ]]; then
    log_warning "RESET_DB=1 set, will reinitialize database..."
  else
    log_info "Skipping database initialization (set RESET_DB=1 to force reinit)"
    SKIP_DB_INIT=1
  fi
fi
```

### 6. Testing Expo Server after Start
**Problem**: The script does not check if Expo server is running after it starts it.

**Suggested solution**:
```bash
# After you start Expo, check that it works
log_info "Waiting for Expo server to be ready..."
EXPO_READY=0
for i in {1..30}; do
  if curl -sf "http://localhost:$EXPO_PORT" >/dev/null 2>&1; then
    EXPO_READY=1
    break
  fi
  sleep 1
done

if [[ $EXPO_READY -eq 1 ]]; then
  log_success "Expo server is ready"
else
  log_warning "Expo server might not be ready yet, but continuing..."
fi
```

### 7. Checking .env Files
**Problem**: The script does not check if there are .env files that need to be loaded.

**Suggested solution**:
```bash
# check if there are .env files
if [[ -f "$SERVER_DIR/.env" ]]; then
  log_info "Found .env file in server directory"
  # You can load it with source or dotenv
fi

if [[ -f "$CLIENT_DIR/.env" ]]; then
  log_info "Found .env file in client directory"
fi
```

### 8. Checking Git Status (optional)
**Problem**: Sometimes it is useful to know if there are uncommitted changes before running E2E.

**Suggested solution** (optional):
```bash
# only if CHECK_GIT_STATUS=1
if [[ "${CHECK_GIT_STATUS:-}" == "1" ]]; then
  if [[ -d "$SERVER_DIR/.git" ]]; then
    if [[ -n "$(cd "$SERVER_DIR" && git status --porcelain)" ]]; then
      log_warning "Server has uncommitted changes"
    fi
  fi
fi
```

### 9. Checking Port 5432 and 6379 before Docker
**Problem**: The script does not check if ports 5432 and 6379 are occupied before trying to mount Docker.sh
# Instead of just npx expo start, check the exit code
if ! EXPO_DEV_SERVER_PORT="$EXPO_PORT" npx expo start --port "$EXPO_PORT" --web --clear; then
  log_error "Expo failed to start"
  exit 1
fi
```

### 11. Checking Dependencies before Build
**Problem**: The script checks body-parser, but does not check other dependencies.

**Suggested solution**:
```bash
# Check critical dependencies
CRITICAL_DEPS=("@nestjs/core" "@nestjs/common" "pg" "ioredis")
for dep in "${CRITICAL_DEPS[@]}"; do
  if [[ ! -d "node_modules/$dep" ]]; then
    log_warning "Critical dependency $dep not found. Installing..."
    npm install "$dep"
  fi
done
```

### 12. Checking Database Connection before Init
**Problem**: The script doesn't check if it can connect to the DB before trying to initialize it.

**Suggested solution**:
```bash
# before init-db
log_info "Testing database connection..."
if ! docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -c "SELECT 1;" >/dev/null 2>&1; then
  log_error "Cannot connect to database"
  exit 1
fi
```

## Summary

The script **looks very good** and handles most of the important stuff. The proposed improvements are mainly:
- Additional tests before operations
- Better handling of errors
- additional options (like RESET_DB, CLEAR_NPM_CACHE)
- Tests of services after they start

The current script **should work fine** for most cases, but these improvements could make it more robust.