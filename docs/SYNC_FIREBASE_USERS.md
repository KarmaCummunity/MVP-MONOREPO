# סנכרון משתמשי Firebase עם user_profiles

## סקירה כללית

המערכת מסנכרנת אוטומטית את כל המשתמשים מ-Firebase Authentication לטבלת `user_profiles` כדי שהם יופיעו במסך "גלה אנשים".

## מנגנון הסנכרון

### 1. סנכרון חד-פעמי (Initial Sync)

להרצת סנכרון חד-פעמי של כל המשתמשים הקיימים:

```bash
npm run sync:firebase-users
```

**דרישות:**
- הגדר משתנה סביבה `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string של service account)
- או הגדר `GOOGLE_APPLICATION_CREDENTIALS` (path לקובץ service account JSON)

**מה הסקריפט עושה:**
- שולף את כל המשתמשים מ-Firebase Authentication
- בודק מי מהם לא קיים ב-`user_profiles`
- יוצר רשומות חדשות ב-`user_profiles` עם UUID פנימי
- מעדכן משתמשים קיימים אם יש שינויים

### 2. סנכרון אוטומטי (Automatic Sync)

המערכת מסנכרנת אוטומטית משתמשים חדשים בשתי דרכים:

#### א. דרך resolveUserId
כשמשתמש מתחבר דרך Google/Firebase, הפונקציה `resolveUserId` בודקת אם המשתמש קיים ב-`user_profiles`. אם לא, היא יוצרת אותו אוטומטית.

#### ב. דרך Sync Endpoint
ניתן להגדיר Firebase Cloud Function שקוראת ל-endpoint זה כשמשתמש חדש נוצר:

**Endpoint:** `POST /api/sync/user`

**Body:**
```json
{
  "firebase_uid": "user-firebase-uid"
}
```

או:
```json
{
  "email": "user@example.com"
}
```

**דוגמה ל-Firebase Cloud Function:**
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

### 3. בדיקת סטטוס סנכרון

**Endpoint:** `GET /api/sync/status`

מחזיר:
- מספר משתמשים ב-Firebase
- מספר משתמשים ב-`user_profiles`
- כמה משתמשים מקושרים ל-Firebase
- כמה משתמשים חסרים

## הגדרת Firebase Admin SDK

### אפשרות 1: משתנה סביבה (מומלץ ל-production)

```bash
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'
```

### אפשרות 2: קובץ Service Account

1. הורד service account key מ-Firebase Console
2. שמור אותו במיקום מאובטח
3. הגדר:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## תוצאה

לאחר הסנכרון:
- ✅ כל המשתמשים מ-Firebase Authentication יופיעו ב-`user_profiles`
- ✅ כל משתמש חדש שנוצר ב-Firebase יסונכרן אוטומטית
- ✅ כל המשתמשים יופיעו במסך "גלה אנשים"
- ✅ כל המשתמשים משתמשים במזהה UUID פנימי אחיד

## הערות חשובות

1. **אבטחה:** ה-endpoint `/api/sync/user` צריך להיות מוגן (API key או admin authentication)
2. **ביצועים:** הסנכרון החד-פעמי יכול לקחת זמן אם יש הרבה משתמשים
3. **כפילויות:** הסקריפט בודק כפילויות לפי email ו-firebase_uid כדי למנוע יצירת משתמשים כפולים

