# 🚨 תיקון מיידי - Development לא עולה

**בעיה:** השרת ב-development לא מוצא `DATABASE_URL`

---

## ✅ פתרון - 2 דקות

### שלב 1: חבר את ה-Postgres

1. **פתח Railway Dashboard**
2. **לך ל-`KC-MVP-server-development`**
3. **לחץ על "Variables"** (בתפריט השמאלי)
4. **לחץ על "Plugins"** (טאב עליון)
5. **מצא את `Postgres`** (ID: f92654e1)
6. **לחץ על "Connect"** לידו

זהו! Railway יוסיף אוטומטית את `DATABASE_URL` ויעשה Redeploy.

---

### שלב 2: המתן ל-Deploy (2-3 דקות)

עקוב אחרי הלוגים. אמור לראות:

**✅ טוב:**
```
[Nest] LOG [Bootstrap] 🚀 Starting Karma Community Server...
[Nest] LOG [Bootstrap] ✅ Environment validation passed
[Nest] LOG [Bootstrap] 📍 Environment: DEVELOPMENT 🟢
[Nest] LOG [Bootstrap] ✅ Database: Development (verified)
```

**❌ עדיין רע:**
```
[Nest] ERROR [Bootstrap] ❌ Missing REQUIRED environment variables: DATABASE_URL
```

---

## אם זה לא עוזר - פתרון חלופי

### הוסף DATABASE_URL ידנית:

1. `KC-MVP-server-development` → **"Variables"**
2. **"Raw Editor"** (כפתור למעלה מימין)
3. **הוסף שורה:**
   ```
   DATABASE_URL=postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@postgres-a3d6beef.railway.internal:5432/railway
   ```
4. **"Save"**

---

## אחרי שזה עובד

חזור ל-`START_HERE.md` והמשך עם:
- [ ] יצירת Redis נפרד
- [ ] עדכון משתני סביבה
- [ ] הגדרת דומיין (כבר התחלת!)

---

**פירוט מלא:** `TROUBLESHOOTING_DEV.md`







