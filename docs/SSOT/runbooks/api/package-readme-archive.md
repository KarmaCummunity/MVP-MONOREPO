# KC-MVP Server (NestJS + Postgres + Redis)

A NestJS server for the Karma Community application with Postgres and Redis, and a generic REST compatible ``DatabaseService'' in the frontend.

**Current version:** 2.5.2  
**Last update:** 2025-12-24 - Redis test in production

## 🆕 What's new in version 2.5.2

- ✅ **Complete separation of environments:** Development and Production are completely separated
- ✅ **Automatic tests:** Scripts for testing environment variables and separation
- ✅ **Improved security:** Check at startup that prevents connection of dev to prod DB
- ✅ **Comprehensive documentation:** Detailed guides for setting up Railway and copying DB
- ✅ **GitHub Actions:** Automatic tests before every deploy
- 🔍 **Testing Redis in production:** Scripts for testing and repairing Redis

**⚠️ Problem found:** Redis not configured in production! See `fix-redis-production.md` (in this folder)

**See:** `fix-redis-production.md`, `test-redis-production.md`, `railway.md` (all in this folder)

## 🌍 environments

### Production (main)
- **Domain**: `karma-community-kc.com`
- **Branch**: `main`
- **Database**: Separate Postgres (ID: 5f1b9d5d) ✅
- **Redis**: ❌ **Undefined - needs fixing!** (see `fix-redis-production.md` (in this folder))
- **Purpose**: Real users, real data

### Development (dev)
- **Domain**: `dev.karma-community-kc.com`
- **Branch**: `dev`
- **Database**: Separate Postgres (ID: f92654e1) ✅
- **Redis**: Separate Redis ✅ (password: ggCVffISJOm...)
- **Purpose**: tests, development, anonymized data

## 🚀 Local activation

```bash
npm install

# Raising databases
npm run docker:up

# Initialize schemas and tables
npm run init:db

# Development
npm run start:dev
```

Create a `.env` file:
```
# Local
PORT=3001
CORS_ORIGIN=http://localhost:8081,http://localhost:19006
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=kc
POSTGRES_PASSWORD=kc_password
POSTGRES_DB=kc_db
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# JWT Secret - a must! Minimum 32 characters
# To create a secure secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Production (Railway/Vercel): Use the environment values that are assigned
# DATABASE_URL=postgres://user:pass@host:5432/dbname
# REDIS_URL=redis://default:pass@host:6379
# JWT_SECRET=your-production-jwt-secret-minimum-32-characters

# Main manager - the only email defined in the config (all other managers are saved in the database)
ROOT_ADMIN_EMAIL=your-admin@gmail.com
```

## 🔐 Permissions system

- **Permissions are saved in the database** in the `user_profiles` table: `roles` field (array: `user`, `volunteer`, `admin`, `super_admin`) and `parent_manager_id` (hierarchy).
- **The only email in the code/config:** `ROOT_ADMIN_EMAIL` in `.env` - is only used to:
  - grant this user the role `super_admin` at startup (in `DatabaseInit`),
  - and protect it from being changed/downgraded (it is not possible to remove an administrator or demote a position).
- **All other managers and volunteers:** are promoted/associated via the API (e.g. `POST /api/users/:id/promote-admin`, `setManager`) and the data is saved in the DB. There is no email list in the code.

## 📡 Endpoints

- `GET /` — Health
- Generic CRUD by collection (compatible with DatabaseService collections):
  - `GET /api/:collection?userId=...` — list of items for the user
  - `GET /api/:collection/:userId/:itemId` — single item
  - `POST /api/:collection` — create/update: body `{ id, userId, data }`
  - `PUT /api/:collection/:userId/:itemId` — update: body `{ data }`
  - `DELETE /api/:collection/:userId/:itemId` — deletion

Tables are created with a composite PK `(user_id, item_id)` and a JSONB column named `data`.

## 🚀 Railway deployment

The project is configured for automatic deployment on Railway with **total separation** between environments.

### layout settings:
- **Runtime**: V2 (advanced and fast version)
- **Builder**: Dockerfile
- **Replicas**: 1 (one copy)
- **Multi-Region**: Western Europe (europe-west4)
- **Restart Policy**: automatic restart in case of failure
- **Health Check**: automatic health check

### Layout - Development:
1. In Railway, select branch: `dev`
2. Make sure Postgres-dev and Redis-dev are connected
3. Set environment variables (see `railway.md`):
   ```
   ENVIRONMENT=development
   NODE_ENV=development
   CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,...
   JWT_SECRET=<new to dev>
   ```
4. Automatic deploy from `dev` branchS
- `DB_COPY_GUIDE.md` - Copying data between environments
- `environment-separation.md` - full documentation on environment separation