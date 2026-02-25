# Development Setup Guide

Quick guide to set up local development environment in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop installed and running

## Quick Start

### 1. Generate Secure Credentials

```bash
# Generate database password
openssl rand -base64 16

# Generate JWT secret
openssl rand -base64 32
```

### 2. Configure Environment

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` with your generated credentials:

```bash
# Database - use password from step 1
DATABASE_URL=postgresql://kc:YOUR_PASSWORD@localhost:5435/kc_db
POSTGRES_PASSWORD=YOUR_PASSWORD

# JWT - use secret from step 1
JWT_SECRET=YOUR_JWT_SECRET

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Admin email
ROOT_ADMIN_EMAIL=your-email@example.com
```

### 3. Start Services

```bash
# Start Docker services
docker-compose up -d

# Install dependencies
npm install

# Initialize database
npm run init:db

# Start development server
npm run start:dev
```

Server runs on `http://localhost:3001`

### 4. Verify Installation

```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok",...}`

## Common Issues

### Database Connection Failed

**Check:**
- Docker is running: `docker ps`
- Password matches in `.env` and `docker-compose.yml`
- Port 5435 is available: `lsof -i :5435`

**Fix:**
```bash
docker-compose down
docker-compose up -d
```

### Redis Connection Failed

```bash
docker-compose exec redis redis-cli ping
```

Expected: `PONG`

### JWT_SECRET Not Set

```bash
openssl rand -base64 32
```

Add to `.env`: `JWT_SECRET=<output>`

## Testing

```bash
# Create test environment
cp .env.test.example .env.test

# Edit .env.test with different password
# Example: postgresql://kc:test_password@localhost:5435/kc_test_db

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Environment Verification

Check you're connected to the correct database:

```bash
# Development check
ENVIRONMENT=development npm run verify:separation

# Production check (with production DATABASE_URL)
ENVIRONMENT=production npm run verify:separation
```

This verifies:
- Database host and name
- Number of users, posts, donations
- Environment-specific indicators

## Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] Never commit real passwords
- [ ] Use different passwords for dev/test/prod
- [ ] JWT_SECRET is at least 32 characters

## Next Steps

- Read [SECURITY.md](SECURITY.md) for best practices
- Check [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for production deployment
- See [.env.example](.env.example) for all options

## Getting Help

If stuck:
1. Check error messages
2. Search GitHub issues
3. Create issue with:
   - What you tried
   - Error message (remove passwords!)
   - OS and Node version
