# Separation of environments - Development and Production

A detailed guide to setting up completely separate environments in Railway, including separate databases.

## 🎯 goal

completely separate between:
- **Development environment** - for testing and development
- **Production environment** - for real users

Each environment will have:
- ✅ Separate service (Service)
- ✅ Separate database (Postgres Plugin)
- ✅ Separate Redis (Redis Plugin)
- ✅ Separate environment variables
- ✅ Separate domains

---

## 📋 Step 1: Creating Development services

### 1.1 Backend service - Development

1. In the Railway Dashboard, open your project
2. Click **"+ New"** → **"GitHub Repo"** (or **"Empty Service"**)
3. Select the repository: `KC-MVP-server`
4. Select the branch: `dev' (or another branch for development)
5. The name of the service: `KC-MVP-server-dev' (or another distinguishing name)

### 1.2 Frontend service - Development

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the repository: `MVP`
3. Select the branch: `dev`
4. Service name: `MVP-dev`

---

## 🗄️ Step 2: Creating separate databases

### 2.1 Postgres - Development

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Plugin name: `Postgres-dev' (or another name that distinguishes)
3. **Important:** This is a completely separate database from Production!

### 2.2 Postgres - Production

1. If you don't have it yet, create: **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Plugin name: `Postgres-production`
3. **Important:** This is a completely separate database from Development!

### 2.3 Redis - Development

1. Click **"+ New"** → **"Database"** → **"Add Redis"**
2. Plugin name: `Redis-dev`

### 2.4 Redis - Production

1. Create: **"+ New"** → **"Database"** → **"Add Redis"**
2. Plugin name: `Redis-production`

---

## 🔗 Step 3: Connecting services to databases

### 3.1 Backend-Dev connection to databases

1. Open the service `KC-MVP-server-dev`
2. Go to **"Variables"** → **"Plugins"**
3. Click **"Connect"** next to `Postgres-dev`
4. Click **"Connect"** next to `Redis-dev`
5. Railway will automatically add `DATABASE_URL` and `REDIS_URL`

### 3.2 Backend-Production connection to databases

1. Open the service `KC-MVP-server` (Production)
2. Go to **"Variables"** → **"Plugins"**
3. Make sure it is connected to `Postgres-production` and `Redis-production`
4. **If it is connected to dev, disconnect it immediately!**

---

## ⚙️ Step 4: Setting environment variables

### 4.1 Backend - Development

Open the service `KC-MVP-server-dev` → **"Variables"**:

```env
#Environment
ENVIRONMENT=development
NODE_ENV=development

# CORS - Development domains only
CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,http://localhost:3000

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com

# Security - JWT Secret (different from Production!)
JWT_SECRET=<generate-new-secret-for-dev>
```

**To create a new JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.2 Backend - Production

Open the service `KC-MVP-server` → **"Variables"**:

```env
#Environment
ENVIRONMENT=production
NODE_ENV=production

# CORS - Production domains only
CORS_ORIGIN=https://karma-community-kc.com,https://www.karma-community-kc.com

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com

# Security - JWT Secret (different from Development!)
JWT_SECRET=495e8b4123c87ffdc9623ae0db9d8cf2522377627aec8f08051039419cf6ad60
```

### 4.3 Frontend - Development

Open the service `MVP-dev` → **"Variables"**:

```env
# Backend URL - Development
BACKEND_BASE_URL=https://kc-mvp-server-dev.up.railway.app
```

### 4.4 Frontend - Production

Open the service `MVP` → **"Variables"**:

```env
# Backend URL - Production
BACKEND_BASE_URL=https://kc-mvp-server-production.up.railway.app
```

---

## 🌐 Step 5: Defining domains

### 5.1 Development Domain

1. Open the `MVP-dev` service
2. Go to **"Settings"** → **"Networking"**
3. Click on **"Custom Domain"**
4. Enter: `dev.karma-community-kc.com`
5. Follow the DNS instructions

### 5.2 Production Domain

1. Open the service `MVP`
2. Go to **"Settings"** → **"Networking"**
3. Click on **"Custom Domain"**
4. Enter: `karma-community-kc.com` (and `www.karma-community-kc.com` if needed)

---

## ✅ Step 6: Testing

### 6.1 Environmental separation test- Add data in Dev → should not appear in Production
   - Add a figure in Production → should not appear in Dev

### 6.2 Checking database connections

**Development:**
```bash
# Check DATABASE_URL in Railway
# Should contain: postgres-dev or similar name
```

**Production:**
```bash
# Check DATABASE_URL in Railway
# Should contain: postgres-production or similar name
```

---

## ⚠️ Important warnings

### 🚨 Do not:

1. ❌ **Do not connect Production to Dev databases!**
2. ❌ **Don't use the same JWT_SECRET in both environments!**
3. ❌ **Do not deploy Dev code to Production!**
4. ❌ **Don't share environment variables between environments!**

### ✅ Always:

1. ✅ **Make sure each environment is connected to separate databases**
2. ✅ **Check the logs during activation - they will show the environment**
3. ✅ **Use separate branches: `dev' for Development, `main' for Production**
4. ✅ **check the CORS_ORIGIN - every environment with different domains**

---

## 🔍 How to identify which environment ran?

### Blogs of the server:

```
📍 Environment: DEVELOPMENT 🟢 DEVELOPMENT
📍 Environment: PRODUCTION 🔴 PRODUCTION
```

### in environment variables:

- `ENVIRONMENT=development` → development environment
- `ENVIRONMENT=production` → production environment

### in database:

- Check `DATABASE_URL` - it will include the plugin name
- Development: `...@postgres-dev...`
- Production: `...@postgres-production...`

---

## 📝 Summary

After completing all the steps, you will have:

| component | Development | Production |
|------|------------|------------|
| **Backend Service** | `KC-MVP-server-dev` | `KC-MVP-server` |
| **Frontend Service** | `MVP-dev` | ``MVP'' |
| **Postgres** | `postgres-dev` | `postgres-production` |
| **Redis** | `redis-dev` | `redis-production` |
| **Domain** | `dev.karma-community-kc.com` | `karma-community-kc.com` |
| **CORS** | Dev domains only | Production domains only |
| **JWT_SECRET** | Secret A | Secret B (different!) |
| **Branch** | `dev` | `main` |

---

## 🆘 Problem solving

### Problem: "The data appears in both environments"

**Solution:** Make sure each service is connected to a separate database. Check `DATABASE_URL` in Variables.

### Problem: "CORS errors"

**SOLUTION:** Ensure that `CORS_ORIGIN` contains the correct domain for each environment.

### Problem: "Don't know what environment he wanted"

**Solution:** Check the logs at startup - they will show the environment clearly.

---

**Updated:** 2025-01-XX
**Version:** 1.0.0