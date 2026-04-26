# Explanation of the automatic synchronization of users

## How does the automatic synchronization work?

The system synchronizes users from Firebase Authentication to `user_profiles` **automatically** in three places:

### 1. When a user connects through Google (`/auth/google`)

**File:** `auth.controller.ts` - `googleAuth()` function

**What's happening:**
1. User connects through Google
2. The server receives `firebase_uid` and `google_id`
3. The server checks if the user exists in `user_profiles`:
   - If **yes** → update details (name, photo, etc.)
   - if **no** → creates a new user with an internal UUID
4. The user appears immediately in "Discover People"

**Applicable code:**
```typescript
// auth.controller.ts - line 594-682
// Checks if user exists
if (rows.length > 0) {
  // Updates an existing user
} else {
  // Creates a new user with a UUID
  INSERT INTO user_profiles (firebase_uid, google_id, email, ...)
}
```

### 2. Via `resolveUserId` (`/api/users/resolve-id`)

**File:** `users.controller.ts` - function `resolveUserId()`

**What's happening:**
1. The client calls `resolveUserId` with `firebase_uid`
2. The server checks if the user exists in `user_profiles`
3. If **not found** but there is `firebase_uid`:
   - The server pulls the user from the Firebase Admin SDK
   - Creates a new user in `user_profiles` with a UUID
4. The user appears immediately in "Discover People"

**Applicable code:**
```typescript
// users.controller.ts - line 864-1000
if (rows.length === 0) {
  if (firebase_uid) {
    // Pulls from Firebase Admin SDK
    const firebaseUser = await admin.auth().getUser(firebase_uid);
    // Creates a new user
    INSERT INTO user_profiles (...)
  }
}
```

### 3. Via Sync Endpoint (`/api/sync/user`)

**File:** `sync.controller.ts` - `syncUser()` function

**What's happening:**
1. Firebase Cloud Function (optional) calls the endpoint when a new user is created
2. The server receives `firebase_uid` or `email`
3. The server pulls the user from Firebase
4. Creates/updates the user in `user_profiles`
5. The user appears immediately in "Discover People"

**Example of Firebase Cloud Function:**
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const API_URL = 'https://your-api.com/api/sync/user';
  
  await fetch(API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': 'your-secret-key' // If SYNC_API_KEY is set
    },
    body: JSON.stringify({ firebase_uid: user.uid })
  });
});
```

## Flow chart

```
A new user has been created in Firebase
         ↓
    [3 options]
         ↓
┌──────────────────────────────────
│ 1. Connects through Google │
│ → auth.controller.ts │
│ → creates/updates user_profiles │
└────────────────────────┄
         ↓
┌──────────────────────────────────
│ 2. The client calls resolveUserId │
│ → users.controller.ts │
│ → Automatically created if not present │
└────────────────────────┄
         ↓
┌──────────────────────────────────
│ 3. Firebase Cloud Function │
│ → sync.controller.ts │
│ → creates/updates user_profiles │
└────────────────────────┄
         ↓
    Appears in "Discover People"
```

## Why does it always work?

1. **When user logs in** → automatically created in `user_profiles`
2. **If a user hasn't logged in yet** → the one-time script syncs it
3. **If a new user is created** → One of the three mechanisms creates it

## Status check

**Endpoint:** `GET /api/sync/status`

Returns:
- How many Firebase users
- How many users in `user_profiles`
- How many are missing

## Important notes

1. **The automatic synchronization only works if:**
   - Firebase Admin SDK configured (FIREBASE_SERVICE_ACCOUNT_KEY)
   - The user logs in at least once

2. **For existing users who have not logged in:**
   - The one-time script needs to be run once

3. **For new users:**
   - The automatic synchronization will work immediately when they connect