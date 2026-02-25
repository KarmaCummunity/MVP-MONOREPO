# Firebase User Synchronization

Guide for syncing Firebase Authentication users to PostgreSQL database.

## Overview

This script syncs users from Firebase Authentication to the `user_profiles` table, creating PostgreSQL records for Firebase users.

## Prerequisites

- Firebase project with Authentication enabled
- PostgreSQL database configured
- Node.js environment set up

## Setup

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. ⚙️ **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file (e.g., `firebase-service-account.json`)

⚠️ **Security:** Never commit this file to git!

### Step 2: Configure Environment Variables

#### Option A: Environment Variable (Recommended)

```bash
# Copy entire JSON content to environment variable
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

#### Option B: Service Account File

```bash
# Path to service account file
export GOOGLE_APPLICATION_CREDENTIALS="/full/path/to/firebase-service-account.json"
```

### Step 3: Database Connection

```bash
# Set database connection
export DATABASE_URL="postgresql://user:password@host:port/database"

# Alternative
export POSTGRES_URL="postgresql://user:password@host:port/database"
```

## Running the Sync

### Local Development

```bash
cd apps/api
npm run sync:firebase-users
```

### Production (Railway)

#### Option 1: One-Time Manual Sync

```bash
# In Railway dashboard
railway run npm run sync:firebase-users
```

#### Option 2: Environment Variable Sync

1. **Add to Railway Variables:**
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   ```

2. **Run from Railway CLI:**
   ```bash
   railway link <project-id>
   railway run npm run sync:firebase-users
   ```

## What Happens During Sync

The script:
1. ✅ Connects to Firebase Authentication
2. ✅ Fetches all users (up to 1000 per batch)
3. ✅ Checks which users don't exist in `user_profiles`
4. ✅ Creates new records with internal UUIDs
5. ✅ Updates existing users if data changed
6. ✅ Reports results

## Expected Output

```
🔄 Starting Firebase users sync...
📥 Fetched 20 users from Firebase...
✅ Total users in Firebase: 20
✨ Created user: user1@example.com (firebase-uid-1)
✨ Created user: user2@example.com (firebase-uid-2)
✅ Updated user: existing@example.com (firebase-uid-3)
...

📊 Sync Summary:
   ✅ Created: 15
   🔄 Updated: 5
   ⏭️  Skipped: 0
   ❌ Errors: 0
   📈 Total processed: 20

✅ Firebase users sync completed!
```

## Verification

### 1. Check Database

```sql
-- Count users with Firebase UID
SELECT COUNT(*) FROM user_profiles WHERE firebase_uid IS NOT NULL;

-- List recent synced users
SELECT email, firebase_uid, created_at 
FROM user_profiles 
WHERE firebase_uid IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Check via API

```bash
curl http://localhost:3001/api/sync/status
```

### 3. Check in App

1. Open mobile app
2. Go to "Discover People" screen
3. Verify all users appear

## Sync Behavior

### New Users
- Creates record in `user_profiles`
- Generates internal UUID
- Stores Firebase UID for reference
- Sets default profile values

### Existing Users
- Updates display name if changed
- Updates email if changed
- Updates photo URL if changed
- Preserves existing profile data

### Edge Cases

**User exists with different Firebase UID:**
- Logs warning
- Skips update
- Manual intervention required

**User missing email:**
- Uses Firebase UID as identifier
- Logs warning
- Creates record anyway

**Firebase connection fails:**
- Reports error
- Exits gracefully
- No partial updates

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_KEY not found"

**Fix:**
```bash
# Verify variable is set
echo $FIREBASE_SERVICE_ACCOUNT_KEY

# Or set it
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### "Invalid service account"

**Fix:**
1. Verify JSON is valid
2. Check service account has correct permissions
3. Regenerate key if needed

### "Database connection failed"

**Fix:**
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### "Permission denied"

**Fix:**
1. In Firebase Console:
   - IAM & Admin → Service Accounts
   - Grant "Firebase Authentication Admin" role
2. Regenerate service account key

## Automation

### Scheduled Sync (Optional)

To run sync automatically:

#### Using Cron (Linux/Mac)

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/app && npm run sync:firebase-users >> /var/log/firebase-sync.log 2>&1
```

#### Using Railway Cron (if available)

```yaml
# railway.json
{
  "cron": [
    {
      "schedule": "0 2 * * *",
      "command": "npm run sync:firebase-users"
    }
  ]
}
```

#### Using GitHub Actions

```yaml
# .github/workflows/firebase-sync.yml
name: Firebase Sync
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run sync:firebase-users
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
```

## Security Best Practices

### Service Account Key

- [ ] Never commit to git
- [ ] Store in environment variable
- [ ] Rotate annually
- [ ] Grant minimum permissions
- [ ] Use different keys for dev/prod

### Database Access

- [ ] Use dedicated sync user
- [ ] Grant only INSERT/UPDATE on `user_profiles`
- [ ] No DELETE permission
- [ ] Log all operations

### Monitoring

- [ ] Log sync results
- [ ] Alert on failures
- [ ] Track sync duration
- [ ] Monitor error rates

## Advanced Usage

### Sync Specific Users

```bash
# Modify script to accept user IDs
SYNC_USER_IDS="uid1,uid2,uid3" npm run sync:firebase-users
```

### Dry Run Mode

```bash
# Preview changes without committing
DRY_RUN=true npm run sync:firebase-users
```

### Batch Size Configuration

```bash
# Adjust batch size (default: 1000)
FIREBASE_BATCH_SIZE=500 npm run sync:firebase-users
```

## Performance

### Sync Speed

- ~100 users per second
- Depends on network latency
- Database write speed
- Firebase API limits

### Optimization Tips

1. **Batch Processing:**
   - Process in chunks of 1000
   - Commit after each batch

2. **Parallel Processing:**
   - Split users into segments
   - Run multiple sync processes

3. **Incremental Sync:**
   - Track last sync time
   - Only sync new/updated users

## Next Steps

After first sync:
1. Verify all users in database
2. Test user authentication
3. Check "Discover People" screen
4. Set up automated sync if needed
5. Monitor for sync errors

## Questions?

If issues persist:
1. Check Firebase service account permissions
2. Verify database connection
3. Review sync logs
4. Check Firebase quota limits

---

**Important:** Always test sync in development environment before running in production.
