# Quick Setup Guide for New Developers

This guide will help you set up the development environment in 5 minutes.

## Prerequisites

✅ Node.js 18+ installed  
✅ Docker Desktop installed and running  

## Step-by-Step Setup

### 1. Generate a Secure Password

```bash
# Generate a random password for local development
openssl rand -base64 16
```

Copy the output (e.g., `Xy9mK2pL8nQ4vR7wZ3aB1c==`)

### 2. Create Environment File

```bash
cd apps/api
cp .env.example .env
```

### 3. Edit .env File

Open `.env` and replace these values:

```bash
# Database - use YOUR password from step 1
DATABASE_URL=postgresql://kc:Xy9mK2pL8nQ4vR7wZ3aB1c==@localhost:5435/kc_db

# Also set POSTGRES_PASSWORD for Docker
POSTGRES_PASSWORD=Xy9mK2pL8nQ4vR7wZ3aB1c==

# JWT Secret - generate with: openssl rand -base64 32
JWT_SECRET=<paste output from: openssl rand -base64 32>

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Your admin email
ROOT_ADMIN_EMAIL=your-email@example.com
```

### 4. Start Docker Services

```bash
docker-compose up -d
```

Wait a few seconds for services to start.

### 5. Install Dependencies

```bash
npm install
```

### 6. Initialize Database

```bash
npm run init:db
```

### 7. Start Development Server

```bash
npm run start:dev
```

The server should now be running on `http://localhost:3001`

## Verification

Test the server:

```bash
curl http://localhost:3001/api/health
```

You should see: `{"status":"ok",...}`

## Common Issues

### "Database connection failed"

**Check:**
1. Docker is running: `docker ps`
2. Password matches in `.env` and `docker-compose.yml`
3. Port 5435 is available: `lsof -i :5435`

**Fix:**
```bash
# Restart Docker services
docker-compose down
docker-compose up -d
```

### "Redis connection failed"

**Check:**
```bash
docker-compose exec redis redis-cli ping
```

Should respond with `PONG`

### "JWT_SECRET not set"

Generate one:
```bash
openssl rand -base64 32
```

Add to `.env`:
```bash
JWT_SECRET=<paste the output>
```

## Testing

Run tests:
```bash
# Create test environment file
cp .env.test.example .env.test

# Edit .env.test and set TEST_DATABASE_URL with a different password
# Example: postgresql://kc:test_password@localhost:5435/kc_test_db

# Run tests
npm test
```

## Security Checklist

Before you start coding, verify:

- [ ] `.env` file is in `.gitignore`
- [ ] Never commit real passwords to git
- [ ] Use different passwords for dev/test/prod
- [ ] Generated JWT_SECRET is at least 32 characters

## Next Steps

- Read [SECURITY.md](SECURITY.md) for security best practices
- Read [LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for detailed documentation
- Check [.env.example](.env.example) for all available options

## Getting Help

If you're stuck:

1. Check the error message carefully
2. Search for the error in GitHub issues
3. Ask in the team chat
4. Create a GitHub issue with:
   - What you tried
   - Error message (remove passwords!)
   - Your OS and Node version

## Summary

✅ Environment file: `.env` created and configured  
✅ Docker: PostgreSQL + Redis running  
✅ Database: Initialized with schema  
✅ Server: Running on port 3001  

**You're ready to code! 🎉**
