# Guide to testing Redis in production

**Date:** December 24, 2025  
**Purpose:** Verify proper connection to Redis in production (main branch)

---

## 📋 current situation

According to the information we have:

### Production Environment
- **Branch**: `main`
- **Environment**: `production`
- **Database**: Separate Postgres (password: `RHkhivARk...`)
- **Redis**: need to check if configured and working

### Development Environment  
- **Branch**: `dev`
- **Environment**: `development`
- **Database**: Separate Postgres (password: `mmWLXgvXF...`)
- **Redis**: Separate Redis (password: `ggCVffISJOm...`) ✅

---

## 🔍 Test 1: What REDIS_URL exists in production?

### Method A: Via Railway CLI

```bash
cd KC-MVP-server

# Check if REDIS_URL is set
railway variables --service "PROD(main)-DEV(dev)-KC-server" | grep REDIS
```

If Railway CLI does not work, go to method B.

### Method B: Via Railway Dashboard (recommended)

1. Open https://railway.app
2. Select the `adventurous-contentment` project
3. **Important**: Select `production` environment (top menu)
4. Open the service `PROD(main)-DEV(dev)-KC-server`
5. Go to **Variables**
6. Search for `REDIS_URL`

### Possible results:

#### ✅ Scenario 1: REDIS_URL exists
If there is a `REDIS_URL`, copy it and proceed to test 2.

#### ⚠️ Scenario 2: No REDIS_URL
If there is no `REDIS_URL`, it means that Redis is not configured in production!

**Solution:**
1. In the Railway Dashboard (production environment)
2. Click **"+ New"** → **"Database"** → **"Add Redis"**
3. Suggested name: `redis-prod` or `redis-kc-mvp-prod`
4. Once created, click on the new Redis
5. Go to **"Connect"** and copy the URL
6. Return to the `PROD(main)-DEV(dev)-KC-server` service
7. Go to **"Variables"** and add `REDIS_URL=<the URL you copied>`

#### ⚠️ Scenario 3: REDIS_URL shared with Development
If the `REDIS_URL` contains the password `ggCVffISJOmdiIHAXBSQpsQCPfaFbaOR`, it is the Development Redis!

**This is a problem!** Both environments use the same Redis → This causes:
- Cache pollution (dev data is mixed with prod)
- Shared Sessions
- Performance issues

**Solution:** Follow scenario 2 to create a separate Redis for production.

---

## 🔍 Test 2: Redis connection test

Once you have a production `REDIS_URL`:

### Step 1: Preparation

```bash
cd KC-MVP-server

# Make sure the main branch is active
git branch --show-current
# Should display: main
```

If you are not in `main`, go to it:
```bash
git checkout main
```

### Step 2: Setting the environment variables

Edit the `.env.production` file:

```bash
# Delete the existing content and replace with this:
cat > .env.production << 'EOF'
ENVIRONMENT=production
REDIS_URL=<paste the REDIS_URL from Railway here>
EOF
```

**Example** (replace with your actual values):
```
ENVIRONMENT=production
REDIS_URL=redis://default:deQMolmzgWZsqeAkiEpZPFvejfGjenEm@redis-abc123.railway.internal:6379
```

### Step 3: Running the test

```bash
# Run test script with .env.production file
export $(cat .env.production | xargs) && npm run check:redis
```

### Expected results:

#### ✅ Complete success
```
-
🔍 Tests Redis connection in production
-

📍 Environment: PRODUCTION
🔗 Redis URL: redis://default:****@redis-xyz.railway.internal:6379
✅ Redis URL looks like that of PRODUCTION

────────────────────────────┄

🔒 TLS: Disabled (redis://)

🔌 Connecting to Redis...
✅ Successful login!

────────────────────────────┄

🧪 checks Redis operations:

1️⃣ PING checker...
   ✅ PING → PONG

2️⃣ checks INFO...
   ✅ Version: 7.x.x
   ✅ Uptime: XX minutes

3️⃣ checks SET/GET...
   ✅ SET test: xxxxx
   ✅ GET test:xxxxx
   📦 Value: Hello from production check!

4️⃣ checks DELETE...
   ✅ Successful deletion (1 keys deleted)

5️⃣ Database size checker...
   ✅ Number of keys in Redis: XX

7️⃣ checks memory usage...
   💾 Current usage: XXX KB
   💾 Maximum: no limit

────────────────────────────┄

✅ All tests passed successfully!
✅ Redis works properly in production

-
```

#### ❌ Failure - unable to connect

If there is an error like:
```
❌ Error connecting to Redis:
   Connection timeout
```

**Possible solutions:**

1. **Check that Redis is online on Railway:**
   - Open Railway Dashboard
   - Select a production environment
   - Check that the Redis plugin appears as "Running" (green)

2. **Check the REDIS_URL:**
   - Make sure you haven't copied it with spaces
   - Make sure the password is correct
   - Make sure the host is correct

3. **Try to connect via Railway CLI:**
   ```bash
   railway connect redis
   ```p.railway.app/health/redis
```

or (if there is a custom domain):
```bash
curl https://api.karma-community-kc.com/health/redis
```

**Expected response:**
```json
{
  "ok": true,
  "ping": "health"
}
```

If receiving:
```json
{
  "ok": false,
  "error": "Redis not configured"
}
```

This means that the server is unable to connect to Redis.

### Check through Logs in Railway

1. Open Railway Dashboard
2. Select a production environment
3. Open the service `PROD(main)-DEV(dev)-KC-server`
4. Go to **"Deployments"** → Click on the latest deployment
5. Click **"View Logs"**

Search blogs:
- `⚡ Redis: ✅ Connected to <host>` → Redis is connected!
- `⚡ Redis: ❌ Not connected - REDIS_URL missing!` → Redis not configured!
- `[redis] ⚠️ No Redis configuration found` → Redis is not configured!

---

## 📊 Redis status summary

| environment | Branch | Redis Status | Redis URL Signature |
|-------|--------|--------------|--------------------|
| **Development** | `dev` | ✅ Defined | `ggCVffISJOm...` |
| **Production** | `main` | ❓ need to check | `deQMolmzgWZ...` or new |

---

## ✅ Checklist

After the tests, make sure that:

- [ ] REDIS_URL defined in production (Railway Variables)
- [ ] Redis online in Railway Dashboard (status: Running)
- [ ] `npm run check:redis` script passes successfully
- [ ] Health endpoint (`/health/redis`) returns `ok: true`
- [ ] The logs show ` ✅ Redis: Connected`
- [ ] Redis of production is separate from development (different passwords)

---

## 🚨 If Redis doesn't work in production

### Option 1: Redis is not configured at all

**Solution:**
1. Create a new Redis in Railway (production environment)
2. Connect it to the service through Variables or Plugins
3. Do Redeploy

### Option 2: Redis is shared with Development

**Solution:**
1. Create a new Redis for production
2. Update `REDIS_URL` in production
3. Leave the old Redis for Development
4. Do Redeploy

### Option 3: Redis exists but does not connect

**Solution:**
1. Check that Redis is online
2. Check that the REDIS_URL is correct (no spaces, the password is correct)
3. Try to restart the Redis Plugin
4. Try to redeploy the server

---

## 📞 More help

If the tests fail:

1. **check railway.toml:**
   - Make sure `REDIS_URL` is not overridden

2. **check main.ts:**
   - The server logs the Redis status at startup
   - Look for blogs what the status is

3. **Check redis.module.ts:**
   - The code supports an optional REDIS_URL
   - If there is no URL, it continues without Redis (but cache will not work)

4. **Check that you don't have 2 shared Redis instances:**
   ```bash
   railway variables | grep REDIS
   ```

---

**Created:** December 24, 2025  
**Purpose:** Redis verification in production  
**Status:** Awaiting review