# KC API Scripts

This directory contains scripts for managing the KC API server, development environment, and security scanning.

## Script Organization

### 🔒 Security Scripts

#### `snyk-scan-filtered.sh` - Filtered Security Scan
**Purpose:** Run Snyk security scans without false positives

**What it does:**
- ✅ Scans dependencies for vulnerabilities
- ✅ Scans code with Snyk Code
- ✅ **Filters out 11 SQL Injection false positives** automatically
- ✅ Shows only real actionable security issues
- ✅ Saves full reports to `/tmp/snyk-*.json`

**Usage:**
```bash
./scripts/snyk-scan-filtered.sh
```

**Why use this?**
Snyk Code doesn't support proper exclusions, reporting many false positives for our parameterized SQL queries. This script filters them automatically, showing only real issues.

**Output Example:**
```
✅ No vulnerabilities found in dependencies!
📊 Results:
   Total issues found: 19
   False positives filtered: 11
   Remaining issues: 8
```

---

### Core Development Scripts

#### `start-local-dev.sh` - Simple Local Development
**Purpose:** Quick start for API development (server only)

**What it does:**
- ✅ Checks Docker is running
- ✅ Starts Docker services (PostgreSQL + Redis)
- ✅ Waits for services to be ready
- ✅ Builds the project
- ✅ Starts the NestJS server in development mode

**When to use:**
- You only need to work on the API server
- You don't need the mobile app running
- Quick iterations on backend code

**Usage:**
```bash
cd apps/api
./scripts/start-local-dev.sh
```

**Prerequisites:**
- Docker Desktop running
- `DATABASE_URL` environment variable set
- Node.js 18+ installed

---

#### `run-local-e2e.sh` (in apps/mobile/scripts/) - Full E2E Environment
**Purpose:** Complete local environment for testing (server + mobile app)

**What it does:**
- ✅ All of `start-local-dev.sh` features **PLUS:**
- ✅ Code quality checks (Lint, Snyk, SonarQube)
- ✅ Automatic port management
- ✅ Database migrations
- ✅ API health checks
- ✅ Expo client startup
- ✅ Cleanup on exit

**When to use:**
- Full E2E testing
- Mobile app development
- Integration testing
- Pre-deployment testing

**Usage:**
```bash
cd apps/mobile
./scripts/run-local-e2e.sh
```

---

### Shared Library

#### `lib/common-functions.sh`
Shared utility functions used across multiple scripts.

**Functions:**
- `print_status()` - Success messages (green ✅)
- `print_warning()` - Warning messages (yellow ⚠️)
- `print_error()` - Error messages (red ❌)
- `check_docker()` - Verify Docker is running
- `start_docker_services()` - Start Docker Compose services
- `wait_for_postgres()` - Wait for PostgreSQL to be ready
- `wait_for_redis()` - Wait for Redis to be ready
- `setup_default_env_vars()` - Setup default environment variables

**Usage in scripts:**
```bash
# Source the library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common-functions.sh"

# Use functions
check_docker
start_docker_services
wait_for_postgres 30
```

---

### Quality Gate Scripts

#### `check-quality-gate.sh` - Local Quality Gate Check
**Purpose:** Validate code quality before pushing (prevents CI/CD failures)

**What it does:**
- ✅ Detects changed files (compared to base branch)
- ✅ Runs ESLint on changed files only
- ✅ Checks TypeScript compilation
- ✅ Runs all tests with coverage
- ✅ Scans for security vulnerabilities (Snyk)
- ✅ Scans for sensitive data (passwords, API keys)
- ✅ Lists TODO comments

**When to use:**
- Before pushing code to remote
- Before creating a Pull Request
- When you want to ensure CI/CD will pass

**Usage:**
```bash
# Check against main branch
./scripts/check-quality-gate.sh main

# Check against dev branch
./scripts/check-quality-gate.sh dev

# Use default (main)
./scripts/check-quality-gate.sh
```

**Exit codes:**
- `0` - All checks passed ✅
- `1` - Quality gate failed ❌

---

#### `check-snyk-delta.sh` - Security Delta Check
**Purpose:** Detect only NEW security vulnerabilities (not existing ones)

**What it does:**
- ✅ Runs Snyk security scan
- ✅ Compares with baseline (previous scan)
- ✅ Identifies only new High/Critical issues
- ✅ Allows existing issues (technical debt)

**When to use:**
- Part of quality gate check
- Security-focused validation
- When updating dependencies

**Usage:**
```bash
./scripts/check-snyk-delta.sh
```

**First run:**
Creates `.snyk-baseline.json` with current issues

**Subsequent runs:**
Compares against baseline and fails only on new issues

**Update baseline:**
Run script after fixing security issues - baseline auto-updates

---

### Other Utility Scripts

#### `reset-all-local-data.sh`
Completely resets local database and Redis data.

#### `show-db-data.sh`
Displays current database tables and row counts.

#### `copy-prod-to-dev.sh`
Copies production data to development database.

#### `run-column-migration.sh`
Runs specific database column migrations.

#### `setup-db-urls.sh`
Configures database connection URLs.

---

## Quick Reference

| Script | Purpose | Starts Server | Starts Mobile | Runs Tests | Migrations |
|--------|---------|---------------|---------------|------------|------------|
| `start-local-dev.sh` | Quick API dev | ✅ | ❌ | ❌ | ❌ |
| `run-local-e2e.sh` | Full E2E | ✅ | ✅ | ✅ | ✅ |
| `check-quality-gate.sh` | Quality validation | ❌ | ❌ | ✅ | ❌ |
| `check-snyk-delta.sh` | Security scan | ❌ | ❌ | ❌ | ❌ |

---

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string

### Optional (with defaults)
- `REDIS_URL` - Redis connection (default: `redis://localhost:6379`)
- `NODE_ENV` - Environment (default: `development`)
- `PORT` - Server port (default: `3001`)
- `CORS_ORIGIN` - CORS allowed origins
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `JWT_SECRET` - JWT signing secret

### E2E Specific
- `SKIP_CHECKS` - Skip lint/security checks (E2E script)
- `SKIP_DOCKER_CLEANUP` - Don't stop Docker on exit (E2E script)
- `SONAR_TOKEN` - Enable SonarQube checks (E2E script)

---

## Troubleshooting

### "Docker is not running"
Start Docker Desktop before running the scripts.

### "DATABASE_URL environment variable is not set"
Set the database URL:
```bash
export DATABASE_URL='postgresql://kc:local_secret@localhost:5432/kc_db'
```

### "Port already in use"
The E2E script automatically frees ports. For `start-local-dev.sh`, manually kill the process:
```bash
lsof -ti tcp:3001 | xargs kill -9
```

### Services not ready
Increase wait time in the script or check Docker logs:
```bash
docker-compose logs postgres
docker-compose logs redis
```

---

## Development Notes

- **DO NOT modify `run-local-e2e.sh`** without thorough testing - it's the central E2E script
- Common functions are in `lib/common-functions.sh` to avoid duplication
- All scripts should use the shared library when possible
- Always test changes in both scripts before committing
