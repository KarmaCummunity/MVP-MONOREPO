# Railway Deployment Troubleshooting Guide

## Issue: Table "community_group_challenges" does not exist

### Root Cause
The database schema initialization is not running properly on Railway deployment, causing tables to not be created.

### Diagnosis Steps

1. **Check Railway Deployment Logs**
   - Go to Railway dashboard → Your project → API service
   - Click on "Deployments" tab → Latest deployment
   - Check the logs for these messages:
     - `🔍 Searching for schema.sql in:`
     - `✅ Found schema.sql at:`
     - `✅ Community Group Challenges schema tables created successfully`
   
2. **If you see "schema.sql not found":**
   - The Docker build didn't copy SQL files properly
   - Check the build logs for `ls -la ./apps/api/dist/database/`
   - Verify SQL files exist in the image

3. **If you see "DatabaseInit failed":**
   - There's an error during schema execution
   - Check the specific error message in the logs

### Solution Options

#### Option 1: Check Environment Variables (Most Common Issue)
Railway might have `SKIP_FULL_SCHEMA=1` set, which skips full schema initialization.

**Fix:**
1. Go to Railway dashboard → Variables
2. Check if `SKIP_FULL_SCHEMA` is set
3. If yes, remove it or set it to `0`
4. Redeploy

#### Option 2: Force Schema Initialization (If automatic init fails)
If the automatic schema initialization isn't working, you can run it manually:

```bash
# Connect to Railway via CLI
railway login
railway link [your-project-id]

# Run the force schema initialization script
railway run npm run force:schema --workspace @kc/api
```

Or connect directly to the database and run the SQL files:

```bash
# Get your DATABASE_URL from Railway dashboard
export DATABASE_URL="postgresql://..."

# Run the initialization script
npm run force:schema --workspace @kc/api
```

#### Option 3: Manual SQL Execution
If the scripts don't work, you can manually execute the SQL files:

1. Get the DATABASE_URL from Railway dashboard
2. Connect using psql or any PostgreSQL client:
   ```bash
   psql $DATABASE_URL
   ```
3. Copy and paste the contents of these files in order:
   - `apps/api/src/database/schema.sql`
   - `apps/api/src/database/challenges-schema.sql`
   - `apps/api/src/database/community-group-challenges-schema.sql`

#### Option 4: Set FORCE_FULL_SCHEMA Environment Variable
Add this environment variable in Railway:
```
FORCE_FULL_SCHEMA=1
```
Then redeploy. This will force the schema to run even if it thinks it should skip.

### Verification

After applying a fix, verify the tables exist:

```sql
-- Connect to your Railway database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'community_group_challenges';
```

Should return one row showing the table exists.

### Expected Log Output (Successful Deployment)

```
[Nest] 1  - DATE LOG [DatabaseInit] 🔍 Searching for schema.sql in: [...]
[Nest] 1  - DATE LOG [DatabaseInit] ✅ Found schema.sql at: /app/apps/api/dist/database/schema.sql
[Nest] 1  - DATE LOG [DatabaseInit] ✅ Schema tables created successfully from: /app/apps/api/dist/database/schema.sql
[Nest] 1  - DATE LOG [DatabaseInit] 🔍 Searching for community-group-challenges-schema.sql in: [...]
[Nest] 1  - DATE LOG [DatabaseInit] ✅ Found community-group-challenges-schema.sql at: /app/apps/api/dist/database/community-group-challenges-schema.sql
[Nest] 1  - DATE LOG [DatabaseInit] ✅ Community Group Challenges schema tables created successfully
[Nest] 1  - DATE LOG [DatabaseInit] ✅ DatabaseInit - Complete schema initialized successfully
```

### Files Modified in Fix

1. **apps/api/Dockerfile** - Enhanced to ensure SQL files are copied and verified
2. **apps/api/nest-cli.json** - Added SQL files as build assets
3. **apps/api/src/database/database.init.ts** - Added detailed logging
4. **apps/api/src/scripts/force-schema-init.ts** - New manual initialization script
5. **apps/api/package.json** - Added `npm run force:schema` command

### Next Steps

1. Wait for Railway deployment to complete (3-5 minutes)
2. Check the logs for the expected output above
3. Try creating a challenge again
4. If it still fails, try Option 1 or Option 2 above

### Contact Points

- Railway Logs: https://railway.app/dashboard (check your specific project)
- Database connection: Check Railway dashboard → PostgreSQL service → Connect
