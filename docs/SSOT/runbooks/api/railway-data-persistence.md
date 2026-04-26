# Permanent data storage in Railway - Data Persistence

## The problem
The statistics of the community (like the number of visits to the site) are reset with every update of the Railway server.

## the reason
If you are not using Railway's Postgres Plugin, the data is stored in a temporary database that is deleted with each redeployment.

## The complete solution

### Step 1: Make sure you are using Railway's Postgres Plugin

1. Log in to your project in Railway
2. Click "+ New" and select "Database" -> "Add PostgreSQL"
3. Railway will create a permanent database for you with automatic environment variables

### Step 2: Connect the server to the permanent database

In the backend service, make sure the following environment variables are defined:

**Option 1: Use DATABASE_URL (recommended)**
```
DATABASE_URL=postgresql://user:password@host:port/database
```
Railway will automatically configure this when you connect the Postgres Plugin.

**Option 2: Use separate variables**
```
PGHOST=your-postgres-host.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-password
PGDATABASE=railway
PGSSLMODE=require
```

### Step 3: Make sure the service is connected to the plugin

1. On the service page of the backend, click on "Variables"
2. In the "Plugins" section, make sure you have a connection to the PostgreSQL Plugin
3. If not, click "Connect" and select the PostgreSQL Plugin

### Step 4: Check that the data is saved

After updating the server:

1. Visit the site - this will create a first visit
2. Refresh the page several times
3. Update the Railway server (push new code)
4. Visit the site again - the number of visits **should not reset**

### Step 5: Advanced testing

If you want to check directly in the database:

1. In Railway, click the PostgreSQL Plugin
2. Click "Data" or "Connect"
3. Use psql or another database management tool
4. Hertz:
```sql
SELECT * FROM community_stats WHERE stat_type = 'site_visits';
```

## What we did in the code

### 1. We added `site_visits` to the initial statistics

In the file `src/database/database.init.ts`:
```typescript
const defaultStats = [
  { stat_type: 'site_visits', stat_value: 0 }, // <-- new!
  { stat_type: 'money_donations', stat_value: 0 },
  // ... the rest of the stats
];
```

### 2. We made sure that ``ON CONFLICT DO NOTHING'' saves existing data

The code:
```typescript
INSERT INTO community_stats (stat_type, stat_value, date_period)
VALUES ($1, $2, CURRENT_DATE)
ON CONFLICT (stat_type, city, date_period) DO NOTHING
```

This means: if the record already exists (with the same `stat_type`, `city`, and `date_period`), **don't change it**.

This way existing data is preserved when redeploying.

## How does the visiting mechanism work?

1. **When someone visits the website for the first time in a day:**
   ```sql
   INSERT INTO community_stats (stat_type, stat_value, city, date_period)
   VALUES ('site_visits', 1, NULL, CURRENT_DATE)
   ON CONFLICT (stat_type, city, date_period) 
   DO UPDATE SET stat_value = community_stats.stat_value + 1
   ```

2. **In additional visits on the same day:**
   The value is updated: `stat_value = stat_value + 1`

3. **When redeploying:**
   - The code tries to create a new record with `stat_value = 0`
   - Because of ``ON CONFLICT DO NOTHING'', the existing record **does not change**
   - Data is saved! ✅

## Warning: what **not** to do

❌ **Do not delete the Postgres Plugin** - it will delete all data!
❌ **Don't use a local DATABASE_URL in production** - it won't work
❌ **Do not call `/api/stats/community/reset`** - it will delete all statistics

## Common problems

### Problem: Data is still being reset
**Solution:**
1. Check that Railway is using Postgres Plugin (not a temporary database)
2. Check that `DATABASE_URL` points to the plugin and not somewhere else
3. Check the logs - there might be an error connecting to the database

### Problem: "relation does not exist"
**Solution:**
The table was not created. This happens automatically the first time the server is started.
If it doesn't happen, run manually:
```bash
npm run init:db
```

### Problem: The data is saved but not displayed on the site
**Solution:**
1. Clear the Redis cache:
   ```bash
   # Connect to Redis on Railway
   redis-cli
   FLUSHALL
   ```
2. Or wait 10 minutes - the cache will expire automatically

## Update version

Version: 1.7.5
Date: 2025-11-23
Change: adding `site_visits` to the initial statistics + full documentation