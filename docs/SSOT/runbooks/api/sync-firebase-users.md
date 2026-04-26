# Sync Firebase users with user_profiles

## Overview

The system automatically syncs all users from Firebase Authentication to the `user_profiles` table so that they appear on the "Discover People" screen.

## The synchronization mechanism

### 1. One-time synchronization (Initial Sync)

To run a one-time synchronization of all existing users:

```bash
npm run sync:firebase-users
```

**Requirements:**
- Set environment variable `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string of service account)
- Or set `GOOGLE_APPLICATION_CREDENTIALS` (path to the JSON service account file)

**What the script does:**
- Removes all users from Firebase Authentication
- checks which of them does not exist in `user_profiles`
- Creates new entries in `user_profiles` with an internal UUID
- Updates existing users if there are changes

### 2. Automatic synchronization (Automatic Sync)

The system automatically synchronizes new users in two ways:

#### a. via resolveUserId
When a user connects via Google/Firebase, the `resolveUserId` function checks if the user exists in `user_profiles`. If not, it creates it automatically.

#### b. via Sync Endpoint
You can define a Firebase Cloud Function that calls this endpoint when a new user is created:

**Endpoint:** `POST /api/sync/user`

**Body:**
```json
{
  "firebase_uid": "user-firebase-uid"
}
```

or:
```json
{
  "email": "user@example.com"
}
```

**Example of Firebase Cloud Function:**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const API_URL = 'https://your-api-url.com/api/sync/user';
  
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebase_uid: user.uid })
  });
});
```

### 3. Synchronization status check

**Endpoint:** `GET /api/sync/status`

Returns:
- Number of Firebase users
- Number of users in `user_profiles`
- How many users are linked to Firebase
- Some users are missing

## Setting up Firebase Admin SDK

### Option 1: environment variable (recommended for production)

```bash
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'
```

### Option 2: Service Account file

1. Download service account key from Firebase Console
2. Keep it in a secure location
3. Define:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## result

After syncing:
- ✅ All users from Firebase Authentication will appear in `user_profiles`
- ✅ Every new user created in Firebase will be automatically synchronized
- ✅ All users will appear on the "Discover People" screen
- ✅ All users use a uniform internal UUID identifier

## Important notes

1. **Security:** The `/api/sync/user' endpoint should be protected (API key or admin authentication)
2. **Performance:** The one-time synchronization can take time if there are many users
3. **Duplicates:** The script checks for duplicates by email and firebase_uid to avoid creating duplicate users