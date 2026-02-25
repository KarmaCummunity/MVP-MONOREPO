# הוראות להרצת סנכרון Firebase Users

## לפני הרצת הסקריפט - הגדרות נדרשות

### 1. קבלת Firebase Service Account Key

1. לך ל-[Firebase Console](https://console.firebase.google.com/)
2. בחר את הפרויקט שלך
3. לך ל-**Project Settings** (⚙️) → **Service Accounts**
4. לחץ על **Generate New Private Key**
5. שמור את הקובץ JSON

### 2. הגדרת משתני סביבה

**אפשרות א': משתנה סביבה (מומלץ)**
```bash
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

**אפשרות ב': קובץ Service Account**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**חיבור למסד נתונים:**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# או
export POSTGRES_URL="postgresql://user:password@host:port/database"
```

### 3. הרצת הסקריפט

```bash
cd KC-MVP-server
npm run sync:firebase-users
```

## מה הסקריפט עושה?

1. ✅ מתחבר ל-Firebase Authentication
2. ✅ שולף את כל המשתמשים (עד 1000 בכל פעם)
3. ✅ בודק מי מהם לא קיים ב-`user_profiles`
4. ✅ יוצר רשומות חדשות עם UUID פנימי
5. ✅ מעדכן משתמשים קיימים אם יש שינויים
6. ✅ מדווח על התוצאות

## תוצאה צפויה

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
   ⏭️  Skipped: 0
   ❌ Errors: 0
   📈 Total processed: 20

✅ Firebase users sync completed!
```

