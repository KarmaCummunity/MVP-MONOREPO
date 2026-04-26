# Instructions for running Firebase Users synchronization

## Before running the script - required settings

### 1. Receiving a Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (⚙️) → **Service Accounts**
4. Click on **Generate New Private Key**
5. Save the JSON file

### 2. Setting environment variables

**Option A: environment variable (recommended)**
```bash
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

**Option B: Service Account file**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Database connection:**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# Or
export POSTGRES_URL="postgresql://user:password@host:port/database"
```

### 3. Running the script

```bash
cd KC-MVP-server
npm run sync:firebase-users
```

## What does the script do?

1. ✅ Connects to Firebase Authentication
2. ✅ Extracts all users (up to 1000 at a time)
3. ✅ checks which of them does not exist in `user_profiles`
4. ✅ Creates new records with an internal UUID
5. ✅ Updates existing users if there are changes
6. ✅ reports the results

## Expected result

```
🔄 Starting Firebase users sync...
📥 Fetched 20 users from Firebase...
✅ Total users in Firebase: 20
✨ Created user: user1@example.com (firebase-uid-1)
✨ Created user: user2@example.com (firebase-uid-2)
...

📊 Sync Summary:
   ✅ Created: 15
   🔄 Updated: 5
   ⏭️ Skipped: 0
   ❌ Errors: 0
   📈 Total processed: 20

✅ Firebase users sync completed!
```