# הסבר על הסנכרון האוטומטי של משתמשים

## איך הסנכרון האוטומטי עובד?

המערכת מסנכרנת משתמשים מ-Firebase Authentication ל-`user_profiles` **אוטומטית** בשלושה מקומות:

### 1. כשמשתמש מתחבר דרך Google (`/auth/google`)

**קובץ:** `auth.controller.ts` - פונקציה `googleAuth()`

**מה קורה:**
1. משתמש מתחבר דרך Google
2. השרת מקבל `firebase_uid` ו-`google_id`
3. השרת בודק אם המשתמש קיים ב-`user_profiles`:
   - אם **כן** → מעדכן פרטים (שם, תמונה, וכו')
   - אם **לא** → יוצר משתמש חדש עם UUID פנימי
4. המשתמש מופיע מיד ב"גלה אנשים"

**קוד רלוונטי:**
```typescript
// auth.controller.ts - שורה 594-682
// בודק אם משתמש קיים
if (rows.length > 0) {
  // מעדכן משתמש קיים
} else {
  // יוצר משתמש חדש עם UUID
  INSERT INTO user_profiles (firebase_uid, google_id, email, ...)
}
```

### 2. דרך `resolveUserId` (`/api/users/resolve-id`)

**קובץ:** `users.controller.ts` - פונקציה `resolveUserId()`

**מה קורה:**
1. הלקוח קורא ל-`resolveUserId` עם `firebase_uid`
2. השרת בודק אם המשתמש קיים ב-`user_profiles`
3. אם **לא נמצא** אבל יש `firebase_uid`:
   - השרת שולף את המשתמש מ-Firebase Admin SDK
   - יוצר משתמש חדש ב-`user_profiles` עם UUID
4. המשתמש מופיע מיד ב"גלה אנשים"

**קוד רלוונטי:**
```typescript
// users.controller.ts - שורה 864-1000
if (rows.length === 0) {
  if (firebase_uid) {
    // שולף מ-Firebase Admin SDK
    const firebaseUser = await admin.auth().getUser(firebase_uid);
    // יוצר משתמש חדש
    INSERT INTO user_profiles (...)
  }
}
```

### 3. דרך Sync Endpoint (`/api/sync/user`)

**קובץ:** `sync.controller.ts` - פונקציה `syncUser()`

**מה קורה:**
1. Firebase Cloud Function (אופציונלי) קוראת ל-endpoint כשמשתמש חדש נוצר
2. השרת מקבל `firebase_uid` או `email`
3. השרת שולף את המשתמש מ-Firebase
4. יוצר/מעדכן את המשתמש ב-`user_profiles`
5. המשתמש מופיע מיד ב"גלה אנשים"

**דוגמה ל-Firebase Cloud Function:**
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
      'X-API-Key': 'your-secret-key' // אם הוגדר SYNC_API_KEY
    },
    body: JSON.stringify({ firebase_uid: user.uid })
  });
});
```

## תרשים זרימה

```
משתמש חדש נוצר ב-Firebase
         ↓
    [3 אפשרויות]
         ↓
┌─────────────────────────────────────┐
│ 1. מתחבר דרך Google                │
│    → auth.controller.ts             │
│    → יוצר/מעדכן ב-user_profiles    │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 2. הלקוח קורא ל-resolveUserId      │
│    → users.controller.ts            │
│    → יוצר אוטומטית אם לא קיים       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 3. Firebase Cloud Function          │
│    → sync.controller.ts             │
│    → יוצר/מעדכן ב-user_profiles    │
└─────────────────────────────────────┘
         ↓
    מופיע ב"גלה אנשים"
```

## למה זה עובד תמיד?

1. **כשמשתמש מתחבר** → נוצר אוטומטית ב-`user_profiles`
2. **אם משתמש לא התחבר עדיין** → הסקריפט החד-פעמי מסנכרן אותו
3. **אם משתמש חדש נוצר** → אחד משלושת המנגנונים יוצר אותו

## בדיקת סטטוס

**Endpoint:** `GET /api/sync/status`

מחזיר:
- כמה משתמשים ב-Firebase
- כמה משתמשים ב-`user_profiles`
- כמה חסרים

## הערות חשובות

1. **הסנכרון האוטומטי עובד רק אם:**
   - Firebase Admin SDK מוגדר (FIREBASE_SERVICE_ACCOUNT_KEY)
   - המשתמש מתחבר לפחות פעם אחת

2. **למשתמשים קיימים שלא התחברו:**
   - צריך להריץ את הסקריפט החד-פעמי פעם אחת

3. **למשתמשים חדשים:**
   - הסנכרון האוטומטי יעבוד מיד כשהם מתחברים

