# 🚀 מדריך מהיר: העתקת דאטה מ-Production ל-Development

**תאריך:** 24 דצמבר 2025  
**גרסה:** 2.0.0

---

## 📝 סיכום

סקריפט אוטומטי שמעתיק את כל הדאטה מהסביבה האמיתית (production/main) לסביבת הפיתוח (development/dev) בלחיצת כפתור אחת.

**מה הסקריפט עושה:**
1. ✅ מייצא את כל הדאטה מ-production
2. ✅ מבצע אנונימיזציה אוטומטית (מיילים, טלפונים)
3. ✅ מגבה את development לפני החלפה
4. ✅ מייבא את הדאטה ל-development
5. ✅ מאמת שהכל עבד

---

## ⚡ שימוש מהיר (3 צעדים)

### צעד 1: הגדרת URL-ים

הרץ את הסקריפט האינטראקטיבי:

```bash
cd KC-MVP-server
source ./scripts/setup-db-urls.sh
```

הסקריפט ישאל אותך:
- **Production Database URL** - העתק מ-Railway Dashboard → production → Postgres → Connect
- **Development Database URL** - העתק מ-Railway Dashboard → development → Postgres → Connect

💡 הסקריפט שומר את ה-URLs ב-`.env.local` אז תצטרך לעשות את זה רק פעם אחת!

### צעד 2: הרצת ההעתקה

```bash
./scripts/copy-prod-to-dev.sh
```

או דרך npm:

```bash
npm run data:copy-prod-to-dev
```

### צעד 3: אישור

הסקריפט ישאל אותך לאישור לפני שהוא מתחיל:

```
⚠️  This will copy ALL data from PRODUCTION to DEVELOPMENT
⚠️  Development data will be REPLACED!

Production DB: postgresql://postgres:RHkhi...
Development DB: postgresql://postgres:mmWLX...

Are you sure you want to continue? (yes/no):
```

הקלד `yes` והמתן שהתהליך יסתיים (בדרך כלל 5-10 דקות).

---

## 🎯 דוגמאות שימוש

### שימוש רגיל (עם כל האבטחות)

```bash
# הגדרת URLs (פעם ראשונה בלבד)
source ./scripts/setup-db-urls.sh

# העתקה מלאה
./scripts/copy-prod-to-dev.sh
```

### דילוג על גיבוי של development

אם אתה בטוח שאתה לא צריך גיבוי:

```bash
./scripts/copy-prod-to-dev.sh --skip-backup
```

### דילוג על אנונימיזציה (לא מומלץ!)

**⚠️ אזהרה:** זה ישמור מיילים וטלפונים אמיתיים ב-development!

```bash
./scripts/copy-prod-to-dev.sh --skip-anonymize
```

### שימוש עם .env.local

אם שמרת את ה-URLs ב-`.env.local`:

```bash
# טען את המשתנים
source .env.local

# הרץ את ההעתקה
./scripts/copy-prod-to-dev.sh
```

---

## 📊 מה קורה בתהליך?

### STEP 1/5: Export from Production

```
🔵 Exporting data from PRODUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connecting to production database...
This may take several minutes depending on data size...

✅ Production data exported successfully

Exported files:
  - user_profiles.json          2.5M
  - posts.json                  8.3M
  - donations.json              4.1M
  - rides.json                  1.2M
  ...

✅ Exported 15 tables
```

### STEP 2/5: Anonymize Data

```
🔵 Anonymizing sensitive data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Masking emails, phones, and other PII...

✅ Data anonymized successfully

Sample anonymized emails:
  - user_abc123@dev.test
  - user_def456@dev.test
  - user_ghi789@dev.test
```

### STEP 3/5: Backup Development

```
🔵 Backing up current DEVELOPMENT data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating backup of development database...
Backup will be saved to: data-backups/20251224-143022

✅ Development backup created: data-backups/20251224-143022
  Backup size: 12M
```

### STEP 4/5: Import to Development

```
🔵 Importing data to DEVELOPMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connecting to development database...
This may take several minutes...

✅ Data imported to development successfully
```

### STEP 5/5: Verify

```
🔵 Verifying import
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running verification checks...

📊 Database Statistics:

  ✓ user_profiles                    523 rows
  ✓ posts                           1847 rows
  ✓ donations                       1203 rows
  ✓ rides                            456 rows
  ✓ items                            789 rows
  ...

✅ Emails are anonymized
✅ Verification complete!
```

### Summary

```
🎉 COPY COMPLETED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  ✅ Exported from production
  ✅ Anonymized sensitive data
  ✅ Backed up development
  ✅ Imported to development
  ✅ Verified import

Development backup: data-backups/20251224-143022

✅ Development environment is now synced with production data!

Next steps:
  1. Test the development environment
  2. Verify that anonymization worked correctly
  3. Run: DATABASE_URL="$DEV_DB_URL" npm run verify:separation
```

---

## 🔒 אבטחה ובטיחות

### בדיקות אבטחה מובנות

הסקריפט כולל מספר בדיקות בטיחות:

1. **בדיקת כיוון** - מוודא שמעתיקים prod→dev ולא להפך
2. **זיהוי שרתים** - מזהה אם ה-URLs מתחלפים (ballast vs caboose)
3. **אישור משתמש** - מבקש אישור מפורש לפני התחלה
4. **אנונימיזציה** - מסווה מיילים וטלפונים אוטומטית
5. **גיבוי אוטומטי** - שומר את development לפני החלפה

### מה מתאנונם?

- ✅ **מיילים**: `user@example.com` → `user_abc123@dev.test`
- ✅ **טלפונים**: `0501234567` → `0500000000`
- ✅ **שמות משתמש**: נשארים (לצורך בדיקות)
- ✅ **תמונות/קישורים**: נשארים (לצורך בדיקות)

---

## 📁 מבנה קבצים

אחרי הרצה מוצלחת:

```
KC-MVP-server/
├── scripts/
│   ├── copy-prod-to-dev.sh      # הסקריפט הראשי
│   └── setup-db-urls.sh         # הגדרת URLs
├── data-backups/
│   └── 20251224-143022/         # גיבוי של development
│       ├── user_profiles.json
│       ├── posts.json
│       └── ...
├── .env.local                   # URLs שמורים (לא ב-git)
└── .gitignore                   # מוודא ש-.env.local לא נכנס ל-git
```

---

## 🆘 פתרון בעיות

### שגיאה: "Database URLs not set"

**פתרון:**

```bash
# הרץ את setup-db-urls.sh
source ./scripts/setup-db-urls.sh

# או הגדר ידנית:
export PROD_DATABASE_URL="postgresql://..."
export DEV_DATABASE_URL="postgresql://..."
```

### שגיאה: "Connection timeout"

**סיבות אפשריות:**
- ה-URL לא נכון
- הפוסטגרס offline ב-Railway
- בעיית רשת

**פתרון:**
1. בדוק ב-Railway Dashboard שה-Postgres online
2. ודא שהעתקת את `DATABASE_PUBLIC_URL` (לא internal)
3. נסה שוב - לפעמים זה זמני

### שגיאה: "Foreign key constraint violation"

**פתרון:**

הסקריפט אמור לטפל בזה אוטומטית. אם זה לא עובד:

```bash
# הרץ את הייבוא שוב - הוא חכם מספיק לדלג על מה שכבר קיים
DATABASE_URL="$DEV_DB_URL" npm run data:import
```

### שגיאה: "Permission denied"

**פתרון:**

```bash
# תן הרשאות הרצה לסקריפטים
chmod +x scripts/*.sh

# הרץ שוב
./scripts/copy-prod-to-dev.sh
```

### הייבוא נכשל - איך לשחזר?

אם הייבוא נכשל, אתה יכול לשחזר מהגיבוי:

```bash
# מצא את הגיבוי האחרון
ls -lt data-backups/

# שחזר
cp -r data-backups/20251224-143022/* data-export-anonymized/
DATABASE_URL="$DEV_DB_URL" npm run data:import
```

---

## ⏱️ זמני ביצוע

לפרויקט טיפוסי:

| שלב | זמן משוער |
|-----|-----------|
| Export from Production | 2-5 דקות |
| Anonymization | 30 שניות |
| Backup Development | 1-3 דקות |
| Import to Development | 3-7 דקות |
| Verification | 30 שניות |
| **סה"כ** | **7-16 דקות** |

*הזמנים תלויים בכמות הדאטה ובמהירות החיבור*

---

## 🔄 עדכון תקופתי

מומלץ להריץ את הסקריפט:

- ✅ **פעם בשבוע** - לפני תכנון ספרינט
- ✅ **לפני בדיקות חשובות** - כדי לעבוד עם דאטה עדכני
- ✅ **אחרי שינויים גדולים בסכמה** - לוודא תאימות
- ✅ **כשצריך לבדוק באג ספציפי** - עם דאטה אמיתי

### הרצה מתוזמנת (אופציונלי)

אפשר להוסיף ל-crontab:

```bash
# כל יום ראשון ב-02:00
0 2 * * 0 cd /path/to/KC-MVP-server && source .env.local && ./scripts/copy-prod-to-dev.sh --skip-backup
```

---

## 📋 Checklist

לפני הרצה:
- [ ] אני ב-directory `KC-MVP-server`
- [ ] הרצתי `npm install`
- [ ] יש לי גישה ל-Railway Dashboard
- [ ] הגדרתי את ה-URLs (דרך `setup-db-urls.sh` או `.env.local`)

במהלך:
- [ ] אישרתי את ההעתקה
- [ ] הסקריפט רץ ללא שגיאות
- [ ] ראיתי "COPY COMPLETED SUCCESSFULLY"

אחרי:
- [ ] בדקתי את הסטטיסטיקות (כמות rows)
- [ ] אימתתי שהמיילים מאנונימיזציים
- [ ] בדקתי שהאפליקציה עובדת
- [ ] (אופציונלי) הרצתי `npm run verify:separation`

---

## 🔗 קבצים קשורים

- `DB_COPY_GUIDE.md` - מדריך מפורט צעד אחר צעד
- `scripts/copy-prod-to-dev.sh` - הסקריפט הראשי
- `scripts/setup-db-urls.sh` - הגדרת URLs
- `src/scripts/export-data.ts` - לוגיקת ייצוא
- `src/scripts/anonymize-data.ts` - לוגיקת אנונימיזציה
- `src/scripts/import-data.ts` - לוגיקת ייבוא

---

## 💡 טיפים

### טיפ 1: שמירת זמן

שמור את ה-URLs ב-`.env.local` פעם אחת:

```bash
source ./scripts/setup-db-urls.sh
# בחר "yes" כשנשאל אם לשמור
```

בפעמים הבאות:

```bash
source .env.local && ./scripts/copy-prod-to-dev.sh
```

### טיפ 2: בדיקה מהירה

אם אתה רק רוצה לראות מה יש ב-production:

```bash
DATABASE_URL="$PROD_DATABASE_URL" npm run data:export
ls -lh data-export/
```

### טיפ 3: ייבוא חלקי

אם אתה רוצה רק טבלאות ספציפיות, ערוך את `src/scripts/import-data.ts` והוסף:

```typescript
const TABLES_TO_IMPORT = ['user_profiles', 'posts'];
```

### טיפ 4: גיבויים

הסקריפט שומר גיבויים ב-`data-backups/`. מומלץ לנקות ישנים:

```bash
# שמור רק 5 גיבויים אחרונים
cd data-backups
ls -t | tail -n +6 | xargs rm -rf
```

---

## ❓ שאלות נפוצות

**ש: האם זה בטוח להריץ בשעות עבודה?**  
ת: כן! הסקריפט רק קורא מ-production, לא משנה שום דבר שם.

**ש: מה קורה אם אני מפסיק באמצע?**  
ת: אין בעיה. הסקריפט idempotent - אפשר להריץ אותו שוב.

**ש: האם הדאטה המאנונימיזציה מספיקה לבדיקות?**  
ת: כן! שמות משתמש, תמונות, פוסטים - הכל נשאר. רק מיילים וטלפונים משתנים.

**ש: איך אני יודע שזה עבד?**  
ת: הסקריפט מריץ verification אוטומטית ומציג סטטיסטיקות.

**ש: כמה מקום זה תופס?**  
ת: הגיבויים יכולים לתפוס 50-200MB. נקה ישנים מדי פעם.

**ש: האם אפשר להריץ את זה מ-CI/CD?**  
ת: כן! העבר את ה-URLs כ-environment variables:

```bash
PROD_DATABASE_URL="..." DEV_DATABASE_URL="..." ./scripts/copy-prod-to-dev.sh --skip-backup
```

---

**עודכן:** 24 דצמבר 2025  
**גרסה:** 2.0.0  
**מחבר:** AI Assistant

לשאלות או בעיות, פנה למפתח הראשי של הפרויקט.





