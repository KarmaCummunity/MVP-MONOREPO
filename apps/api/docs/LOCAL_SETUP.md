# Local Development Setup

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed
- PostgreSQL client (optional, for manual DB access)

## Initial Setup

### 1. Configure Environment Variables

Create a `.env` file in the `apps/api` directory:

```bash
cp .env.example .env
```

Edit `.env` and set the following **required** variables:

```bash
# Database - use Docker Compose credentials
DATABASE_URL=postgresql://kc:YOUR_LOCAL_PASSWORD@localhost:5432/kc_db

# Redis - default for local development
REDIS_URL=redis://localhost:6379

# Google OAuth - get from Google Cloud Console
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# JWT Secret - generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-required

# Admin Email
ROOT_ADMIN_EMAIL=your-email@example.com
```

### 2. Update Docker Compose

Edit `docker-compose.yml` and set a strong password for PostgreSQL:

```yaml
environment:
  POSTGRES_PASSWORD: YOUR_LOCAL_PASSWORD  # Use same password as in DATABASE_URL
```

### 3. Configure Test Environment (Optional)

For running tests, create `.env.test`:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` and set test database credentials:

```bash
TEST_DATABASE_URL=postgresql://kc:YOUR_TEST_PASSWORD@localhost:5432/kc_test_db
TEST_REDIS_URL=redis://localhost:6379/1
```

## Running the Server

### Option 1: Using the Start Script

```bash
# Make the script executable
chmod +x scripts/start-local-dev.sh

# Run the script
./scripts/start-local-dev.sh
```

### Option 2: Manual Start

```bash
# Start Docker services
docker-compose up -d

# Wait for services to be ready
sleep 5

# Build the project
npm run build

# Start in development mode
npm run start:dev
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

## Security Notes

⚠️ **NEVER commit the following files:**

- `.env`
- `.env.development`
- `.env.production`
- `.env.test`

✅ **Safe to commit:**

- `.env.example`
- `.env.test.example`
- All documentation files

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Verify Docker is running: `docker ps`
2. Check PostgreSQL is ready: `docker-compose exec postgres pg_isready`
3. Verify credentials match between `docker-compose.yml` and `.env`

### Redis Connection Issues

1. Check Redis is running: `docker-compose exec redis redis-cli ping`
2. Should respond with `PONG`

### Google OAuth Issues

1. Verify `GOOGLE_CLIENT_ID` is set correctly
2. Check that the client ID matches your Google Cloud Console project
3. Ensure OAuth consent screen is configured

## Environment Separation

To verify you're connected to the correct environment:

```bash
# Check development environment
ENVIRONMENT=development npm run verify:separation

# Check production environment (use with production DATABASE_URL)
ENVIRONMENT=production npm run verify:separation
```

This script checks:
- Database host and name
- Number of users, posts, donations
- Environment-specific indicators

## Additional Resources

- [Environment Configuration Guide](.env.example)
- [Test Configuration Guide](.env.test.example)
- [Deployment Guide](DEPLOYMENT.md)
