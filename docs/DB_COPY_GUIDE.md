# מדריך העתקת מסד נתונים מ-Production ל-Development

**תאריך:** 24 דצמבר 2025  
**מטרה:** העתקה בטוחה של נתונים מ-production ל-development לצורך בדיקות

---

## ⚠️ אזהרות חשובות

1. **אל תעתיק מ-dev ל-production!** רק בכיוון ההפוך!
2. **תמיד עשה גיבוי לפני ייבוא**
3. **השתמש באנונימיזציה** כדי להגן על פרטיות המשתמשים
4. **אל תעשה את זה בשעות עומס** (אם מייצא מ-production)

---

## 📋 דרישות מוקדמות

### 1. התקנת כלים

במחשב המקומי, ודא שיש לך:

```bash
# Node.js 18 ומעלה
node --version  # צריך להיות >= 18

# npm
npm --version

# PostgreSQL client (אופציונלי, לבדיקות)
psql --version
```

### 2. גישה ל-Railway

- גישה ל-Railway Dashboard
- הרשאות לצפות ב-Variables של כל השירותים

### 3. פרטי חיבור

תצטרך את ה-`DATABASE_PUBLIC_URL` של:
- **Production**: `postgresql://postgres:RHkhivARk...@ballast.proxy.rlwy.net:33648/railway`
- **Development**: `postgresql://postgres:mmWLXgvXF...@caboose.proxy.rlwy.net:42564/railway`

---

## 🔄 תהליך ההעתקה - שלב אחר שלב

### שלב 1: הכנת הסביבה

```bash
# נווט לתיקיית השרת
cd KC-MVP-server

# ודא שהחבילות מותקנות
npm install

# בדוק שהסקריפטים קיימים
ls -la src/scripts/export-data.ts
ls -la src/scripts/anonymize-data.ts
ls -la src/scripts/import-data.ts
```

---

### שלב 2: ייצוא נתונים מ-Production

#### 2.1 קבל את ה-DATABASE_PUBLIC_URL

1. פתח Railway Dashboard
2. לך לפרויקט `adventurous-contentment`
3. בחר סביבה: `production`
4. פתח את ה-`Postgres` (ID: 5f1b9d5d)
5. לך ל-**"Connect"** או **"Variables"**
6. העתק את `DATABASE_PUBLIC_URL`:
   ```
   postgresql://postgres:RHkhivARk...@ballast.proxy.rlwy.net:33648/railway
   ```

#### 2.2 הרץ את הייצוא

```bash
# הדבק את ה-URL שהעתקת
DATABASE_URL="postgresql://postgres:RHkhivARkcVwOrVHClXBttSBZQrbuVlq@ballast.proxy.rlwy.net:33648/railway" npm run data:export
```

**מה זה עושה:**
- מתחבר למסד הנתונים של production
- מוצא את כל הטבלאות
- מייצא כל טבלה לקובץ JSON נפרד
- שומר ב-`data-export/`

**פלט צפוי:**
```
✅ Connected to database for export
Found 15 tables to export: user_profiles, posts, donations, rides, ...
Exporting table: user_profiles...
Exporting table: posts...
...
✅ Export completed! Data saved to /path/to/KC-MVP-server/data-export
```

#### 2.3 בדוק את הקבצים

```bash
# רשום את הקבצים שנוצרו
ls -lh data-export/

# בדוק כמה רשומות יש (לדוגמה)
wc -l data-export/user_profiles.json
wc -l data-export/posts.json
```

---

### שלב 3: אנונימיזציה (מומלץ מאוד!)

**למה זה חשוב?**
- מגן על פרטיות המשתמשים
- מונע שליחת מיילים בטעות מסביבת dev
- עומד בדרישות GDPR/חוק הגנת הפרטיות

#### 3.1 הרץ אנונימיזציה

```bash
npm run data:anonymize
```

**מה זה עושה:**
- קורא את הקבצים מ-`data-export/`
- מסווה מיילים: `user_abc123@dev.test`
- מסווה טלפונים: `0500000000`
- שומר את שאר הנתונים כמו שהם
- שומר ב-`data-export-anonymized/`

**פלט צפוי:**
```
Anonymizing user_profiles.json...
Anonymizing posts.json...
...
✅ Anonymization completed! Data saved to /path/to/KC-MVP-server/data-export-anonymized
```

#### 3.2 בדוק את התוצאה

```bash
# השווה קובץ מקורי לאנונימיזציה
head -n 20 data-export/user_profiles.json
head -n 20 data-export-anonymized/user_profiles.json

# ודא שהמיילים שונו
grep -o '"email":"[^"]*"' data-export-anonymized/user_profiles.json | head
```

---

### שלב 4: גיבוי של Development (אופציונלי אבל מומלץ)

לפני שמייבאים, כדאי לגבות את מה שיש ב-development:

```bash
# קבל את ה-URL של development
DATABASE_URL="postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@caboose.proxy.rlwy.net:42564/railway" npm run data:export

# שמור את הגיבוי במקום אחר
mv data-export data-export-dev-backup-$(date +%Y%m%d-%H%M%S)
```

---

### שלב 5: ייבוא ל-Development

#### 5.1 קבל את ה-DATABASE_PUBLIC_URL של Development

1. ב-Railway Dashboard
2. בחר סביבה: `development`
3. פתח את ה-`Postgres` (ID: f92654e1)
4. העתק את `DATABASE_PUBLIC_URL`:
   ```
   postgresql://postgres:mmWLXgvXF...@caboose.proxy.rlwy.net:42564/railway
   ```

#### 5.2 הרץ את הייבוא

```bash
# הדבק את ה-URL של development
DATABASE_URL="postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@caboose.proxy.rlwy.net:42564/railway" npm run data:import
```

**מה זה עושה:**
- מתחבר למסד הנתונים של development
- קורא את הקבצים מ-`data-export-anonymized/`
- מייבא בסדר הנכון (users → posts → donations וכו')
- מטפל ב-foreign key constraints

**פלט צפוי:**
```
✅ Connected to target database for import
Importing user_profiles.json...
  Inserted 150 rows
Importing posts.json...
  Inserted 320 rows
...
✅ Import completed!
```

#### 5.3 טיפול בשגיאות

אם יש שגיאת foreign key:

```bash
# הסקריפט ינסה לטפל בזה אוטומטית
# אם זה לא עובד, ייבא ידנית בסדר:

# 1. טבלאות בסיס (ללא תלויות)
# 2. טבלאות שתלויות בהן
# 3. טבלאות עם many-to-many

# סדר מומלץ:
# user_profiles
# organizations
# categories
# posts
# donations
# rides
# items
# chats
# messages
# post_likes
# comments
```

---

### שלב 6: אימות

#### 6.1 בדוק ספירות

התחבר למסד הנתונים של development:

```bash
# דרך psql
psql "postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@caboose.proxy.rlwy.net:42564/railway"

# או דרך Railway Dashboard → Postgres → Data
```

הרץ שאילתות:

```sql
-- ספירת משתמשים
SELECT COUNT(*) FROM user_profiles;

-- ספירת פוסטים
SELECT COUNT(*) FROM posts;

-- ספירת תרומות
SELECT COUNT(*) FROM donations;

-- בדוק שהמיילים אנונימיזציים
SELECT email FROM user_profiles LIMIT 10;

-- בדוק שהטלפונים אנונימיזציים
SELECT phone FROM user_profiles WHERE phone IS NOT NULL LIMIT 10;
```

#### 6.2 בדוק באפליקציה

1. פתח `https://dev.karma-community-kc.com`
2. התחבר (אם Authentication עובד)
3. בדוק שרואים:
   - משתמשים
   - פוסטים
   - תרומות
4. נסה ליצור פוסט חדש - צריך לעבוד

#### 6.3 הרץ סקריפט אימות

```bash
# בדוק שהסביבות מופרדות
DATABASE_URL="postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@caboose.proxy.rlwy.net:42564/railway" ENVIRONMENT=development npm run verify:separation
```

---

## 🧹 ניקוי

אחרי שסיימת והכל עובד:

```bash
# מחק את הקבצים הזמניים (אופציונלי)
rm -rf data-export/
rm -rf data-export-anonymized/

# או שמור אותם לגיבוי
mkdir -p backups
mv data-export backups/export-$(date +%Y%m%d-%H%M%S)
mv data-export-anonymized backups/anonymized-$(date +%Y%m%d-%H%M%S)
```

---

## 🔄 עדכון תקופתי

אם אתה רוצה לעדכן את development עם נתונים עדכניים מ-production:

```bash
# הרץ את כל התהליך שוב
# 1. ייצוא
DATABASE_URL="<prod-url>" npm run data:export

# 2. אנונימיזציה
npm run data:anonymize

# 3. ייבוא
DATABASE_URL="<dev-url>" npm run data:import
```

**תדירות מומלצת:**
- פעם בשבוע - לפני תכנון ספרינט
- לפני בדיקות חשובות
- אחרי שינויים גדולים בסכמה

---

## 🆘 פתרון בעיות

### בעיה: "Connection timeout"

**פתרון:**
- ודא שאתה משתמש ב-`DATABASE_PUBLIC_URL` (לא internal)
- בדוק שה-Postgres online ב-Railway
- נסה שוב - לפעמים זה זמני

### בעיה: "Foreign key constraint violation"

**פתרון:**
- הסקריפט אמור לטפל בזה
- אם לא, ייבא טבלאות ידנית בסדר הנכון
- או השבת foreign keys זמנית:
  ```sql
  SET session_replication_role = 'replica';
  -- ייבוא
  SET session_replication_role = 'origin';
  ```

### בעיה: "Out of memory"

**פתרון:**
- אם יש הרבה מאוד נתונים, ייבא טבלה אחת בכל פעם
- או הגדל את זיכרון Node:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" npm run data:import
  ```

### בעיה: "Permission denied"

**פתרון:**
- ודא שה-URL נכון
- ודא שיש לך הרשאות למסד הנתונים
- בדוק שהסיסמה נכונה

---

## 📊 סטטיסטיקות טיפוסיות

לדוגמה, בפרויקט עם:
- 500 משתמשים
- 2000 פוסטים
- 1500 תרומות

**זמנים משוערים:**
- ייצוא: 2-5 דקות
- אנונימיזציה: 30 שניות
- ייבוא: 3-7 דקות

**גודל קבצים:**
- `data-export/`: ~50-100 MB
- `data-export-anonymized/`: ~50-100 MB (אותו גודל)

---

## ✅ Checklist

לפני שמתחיל:
- [ ] יש לי גישה ל-Railway
- [ ] Node.js מותקן
- [ ] אני בתיקייה `KC-MVP-server`
- [ ] `npm install` הורץ

במהלך:
- [ ] ייצוא מ-production הצליח
- [ ] אנונימיזציה הצליחה
- [ ] בדקתי שהמיילים שונו
- [ ] (אופציונלי) גיבוי של development
- [ ] ייבוא ל-development הצליח

אחרי:
- [ ] ספירות נכונות במסד הנתונים
- [ ] מיילים מאנונימיזציים
- [ ] האפליקציה עובדת
- [ ] `npm run verify:separation` עובר
- [ ] ניקיתי קבצים זמניים

---

**עודכן:** 24 דצמבר 2025  
**גרסה:** 1.0.0







