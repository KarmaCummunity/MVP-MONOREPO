# Railway Deployment Guide

Complete guide for deploying backend (NestJS) and frontend (Expo Web) to Railway with proper environment separation.

## Architecture Overview

- **Backend**: `apps/api` (NestJS)
- **Frontend**: `apps/mobile` (Expo Web + Nginx)
- **Databases**: PostgreSQL and Redis (Railway Plugins)
- **Environments**: Separate dev and production

## Initial Setup

### Prerequisites

- Railway account
- GitHub repository connected to Railway
- Railway CLI (optional): `npm i -g @railway/cli`

### 1. Create Project and Environments

1. Create new Railway project
2. Create two environments:
   - `production`
   - `development`

### 2. Add Database Plugins

For **each environment**, add:
1. **PostgreSQL**: "+ New" → "Database" → "Add PostgreSQL"
2. **Redis**: "+ New" → "Database" → "Add Redis"

Naming convention:
- Production: `postgres-prod`, `redis-prod`
- Development: `postgres-dev`, `redis-dev`

## Backend Service Configuration

### Create Backend Service

1. "+ New" → "GitHub Repo" → Select your repository
2. Root Directory: `apps/api`
3. Service name: `api-production` or `api-development`

### Environment Variables - Production

```bash
# Environment
ENVIRONMENT=production
NODE_ENV=production

# Database (auto-set by Plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-set by Plugin)
REDIS_URL=${{Redis.REDIS_URL}}

# CORS - set your production domain
CORS_ORIGIN=https://karma-community-kc.com,https://www.karma-community-kc.com

# JWT Secret - generate with: openssl rand -base64 32
JWT_SECRET=<your-production-secret>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>

# Admin
ROOT_ADMIN_EMAIL=<your-admin-email>

# Optional
GOOGLE_API_KEY=<your-api-key>
```

### Environment Variables - Development

```bash
# Environment
ENVIRONMENT=development
NODE_ENV=development

# Database (auto-set by Plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-set by Plugin)
REDIS_URL=${{Redis.REDIS_URL}}

# CORS - include dev domains
CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,http://localhost:3000,http://localhost:8081

# JWT Secret - different from production!
JWT_SECRET=<your-dev-secret>

# Google OAuth (can be same as production)
GOOGLE_CLIENT_ID=<your-google-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>

# Admin
ROOT_ADMIN_EMAIL=<your-admin-email>
```

## Frontend Service Configuration

### Create Frontend Service

1. "+ New" → "GitHub Repo" → Select your repository
2. Root Directory: `apps/mobile`
3. Service name: `web-production` or `web-development`

### Environment Variables - Production

```bash
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_BASE_URL=https://<your-backend-url>.up.railway.app
```

### Environment Variables - Development

```bash
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_API_BASE_URL=https://<your-dev-backend-url>.up.railway.app
```

## Custom Domains

### Production Domain

**Frontend:**
1. Service Settings → Networking → Custom Domain
2. Add: `karma-community-kc.com` and `www.karma-community-kc.com`

**Backend:**
1. Service Settings → Networking → Custom Domain
2. Add: `api.karma-community-kc.com`

**DNS Configuration:**
```
Type: CNAME
Name: @ (or www, or api)
Value: <railway-generated-url>.up.railway.app
```

### Development Domain

**Frontend:**
1. Service Settings → Networking → Custom Domain
2. Add: `dev.karma-community-kc.com`

**Backend:**
1. Service Settings → Networking → Custom Domain
2. Add: `api-dev.karma-community-kc.com`

**DNS Configuration:**
```
Type: CNAME
Name: dev (or api-dev)
Value: <railway-dev-url>.up.railway.app
```

## Data Persistence

### Verify Data Persists

Railway Postgres Plugins use persistent volumes. To verify:

1. **Check Plugin Connection:**
   - Service → Variables → Plugins tab
   - Ensure PostgreSQL is connected
   - `DATABASE_URL` should be auto-set

2. **Test Persistence:**
   - Visit site, create data
   - Deploy update
   - Verify data still exists

3. **Check Logs:**
   - Look for: `✅ Preserved existing stat`
   - No errors about relation not existing

### Common Issues

**Data resets on deploy?**
- Check PostgreSQL is a Plugin, not a separate service
- Verify connection via "Connect to Plugin"
- Check logs for database connection errors

**"relation does not exist"?**
- Tables not created
- Should happen automatically on first startup
- Check server logs for migration errors

## Verification

### Health Checks

**Backend health:**
```bash
curl https://<backend-url>/health
curl https://<backend-url>/health/redis
```

**Check environment:**
Look for in logs:
```
📍 Environment: PRODUCTION 🔴
✅ Database: Production (verified)
✅ Redis: Production (separate instance)
```

### Environment Separation Test

1. Create post in development
2. Check it doesn't appear in production
3. Verify separate user counts
4. Check Redis keys are isolated

## Monitoring

### Railway Logs

Check logs for:
- Startup messages with environment indicators
- Database connection confirmations
- Redis connection confirmations
- No sensitive data (passwords masked)

### Security Verification

- [ ] No `.env` files in repository
- [ ] All secrets in Railway Variables
- [ ] Different JWT secrets per environment
- [ ] CORS properly configured
- [ ] Production uses HTTPS only

## Troubleshooting

### "DATABASE_URL not found"

**Fix:**
1. Service → Variables → Plugins
2. Click "Connect" on PostgreSQL Plugin
3. Redeploys automatically

Or add manually:
```bash
DATABASE_URL=postgresql://postgres:<password>@<host>.railway.internal:5432/railway
```

### "Redis connection failed"

**Fix:**
1. Service → Variables → Plugins
2. Click "Connect" on Redis Plugin
3. Verify `REDIS_URL` is set

### Build Failures

**Check:**
- Build logs in Railway dashboard
- Ensure root directory is correct
- Verify `package.json` scripts
- Check Node version compatibility

### CORS Errors

**Fix:**
1. Backend → Variables
2. Update `CORS_ORIGIN` to include frontend domain
3. Redeploy

## Backup and Recovery

### Database Backup

```bash
# Export from production
railway login
railway link <project-id>
railway run pg_dump > backup.sql

# Import to development
railway environment development
railway run psql < backup.sql
```

### Environment Variables Backup

Export from Railway dashboard:
1. Variables → Raw Editor
2. Copy all variables
3. Save to secure location (NOT in git)

## Advanced Configuration

### Auto-Deploy on Push

**Production:**
- Deploy only from `main` branch
- Enable "Auto-Deploy" in Settings

**Development:**
- Deploy from `develop` branch
- Enable "Auto-Deploy" in Settings

### Environment Checks

Use GitHub Actions to verify before deploy:
- No hardcoded credentials
- All required env vars present
- Tests pass

## Next Steps

After deployment:
1. Monitor logs for 24 hours
2. Test all features in production
3. Verify analytics/metrics work
4. Set up alerts for errors
5. Document any custom configurations

## Getting Help

If issues persist:
1. Check Railway status page
2. Review deployment logs
3. Check database connection strings
4. Verify all environment variables are set
5. Create support ticket with Railway

---

**Important:** Never commit `.env` files or credentials to git. Always use Railway Variables for secrets.
