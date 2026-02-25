# איך להריץ את סקריפט הסנכרון

## שלב 1: קבלת Firebase Service Account Key

1. לך ל-[Firebase Console](https://console.firebase.google.com/)
2. בחר את הפרויקט שלך
3. ⚙️ **Project Settings** → **Service Accounts**
4. לחץ **Generate New Private Key**
5. שמור את הקובץ JSON (למשל: `firebase-service-account.json`)

## שלב 2: הגדרת משתני סביבה

### אפשרות א': משתנה סביבה (מומלץ)

```bash
# העתק את התוכן של הקובץ JSON למשתנה סביבה
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

### אפשרות ב': קובץ Service Account

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/full/path/to/firebase-service-account.json"
```

### חיבור למסד נתונים

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# או
export POSTGRES_URL="postgresql://user:password@host:port/database"
```

## שלב 3: הרצת הסקריפט

```bash
cd KC-MVP-server
npm run sync:firebase-users
```

## מה יקרה?

הסקריפט:
1. ✅ יתחבר ל-Firebase Authentication
2. ✅ יביא את כל המשתמשים (עד 1000 בכל פעם)
3. ✅ יבדוק מי מהם לא קיים ב-`user_profiles`
4. ✅ ייצור רשומות חדשות עם UUID פנימי
5. ✅ יעדכן משתמשים קיימים אם יש שינויים
6. ✅ ידווח על התוצאות

## תוצאה צפויה

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

## בדיקה שהכל עבד

לאחר הרצת הסקריפט, בדוק:

1. **במסד הנתונים:**
```sql
SELECT COUNT(*) FROM user_profiles WHERE firebase_uid IS NOT NULL;
```

2. **דרך API:**
```bash
curl http://localhost:3000/api/sync/status
```

3. **במסך "גלה אנשים":**
   - פתח את האפליקציה
   - לך למסך "גלה אנשים"
   - בדוק שכל המשתמשים מופיעים

