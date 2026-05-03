# How to run the sync script

## Step 1: Obtain Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. ⚙️ **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file (eg: `firebase-service-account.json`)

## Step 2: Setting environment variables

### Option A: Environment variable (recommended)

```bash
# Copy the contents of the JSON file into an environment variable
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

### Option B: Service Account file

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/full/path/to/firebase-service-account.json"
```

### Database connection

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# Or
export POSTGRES_URL="postgresql://user:password@host:port/database"
```

## Step 3: Running the script

```bash
cd KC-MVP-server
npm run sync:firebase-users
```

## What will happen?

The script:
1. ✅ will connect to Firebase Authentication
2. ✅ will bring all users (up to 1000 at a time)
3. ✅ will check which of them does not exist in `user_profiles`
4. ✅ Creation of new records with an internal UUID
5. ✅ Will update existing users if there are changes
6. ✅ Will report the results

## Expected result

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
   ⏭️ Skipped: 0
   ❌ Errors: 0
   📈 Total processed: 20

✅ Firebase users sync completed!
```

## Checking that everything worked

After running the script, check:

1. **In the database:**
```sql
SELECT COUNT(*) FROM user_profiles WHERE firebase_uid IS NOT NULL;
```

2. **via API:**
```bash
curl http://localhost:3000/api/sync/status
```

3. **On the "Discover People" screen:**
   - Open the app
   - Go to the "Discover People" screen
   - Check that all users are listed