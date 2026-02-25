# שמירת נתונים קבועה ב-Railway - Data Persistence

## הבעיה
נתוני הסטטיסטיקות של הקהילה (כמו מספר הביקורים באתר) מתאפסים בכל עדכון של השרת ב-Railway.

## הסיבה
אם אתה לא משתמש ב-Postgres Plugin של Railway, הנתונים נשמרים במסד נתונים זמני שנמחק בכל פריסה מחדש.

## הפתרון המלא

### שלב 1: וודא שאתה משתמש ב-Postgres Plugin של Railway

1. כנס לפרויקט שלך ב-Railway
2. לחץ על "+ New" ובחר "Database" -> "Add PostgreSQL"
3. Railway ייצור לך מסד נתונים קבוע עם משתני סביבה אוטומטיים

### שלב 2: חבר את השרת למסד הנתונים הקבוע

ב-Service של ה-Backend, וודא שמוגדרים משתני הסביבה הבאים:

**אפשרות 1: השתמש ב-DATABASE_URL (מומלץ)**
```
DATABASE_URL=postgresql://user:password@host:port/database
```
Railway יגדיר את זה אוטומטית כשאתה מחבר את ה-Postgres Plugin.

**אפשרות 2: השתמש במשתנים נפרדים**
```
PGHOST=your-postgres-host.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-password
PGDATABASE=railway
PGSSLMODE=require
```

### שלב 3: וודא שה-Service מחובר ל-Plugin

1. בדף ה-Service של ה-Backend, לחץ על "Variables"
2. בחלק "Plugins", וודא שיש לך חיבור ל-PostgreSQL Plugin
3. אם אין, לחץ על "Connect" ובחר את ה-PostgreSQL Plugin

### שלב 4: בדוק שהנתונים נשמרים

לאחר עדכון השרת:

1. בקר באתר - זה ייצור ביקור ראשון
2. רענן את הדף מספר פעמים
3. עדכן את השרת ב-Railway (push קוד חדש)
4. בקר באתר שוב - מספר הביקורים **לא אמור להתאפס**

### שלב 5: בדיקה מתקדמת

אם אתה רוצה לבדוק ישירות במסד הנתונים:

1. ב-Railway, לחץ על ה-PostgreSQL Plugin
2. לחץ על "Data" או "Connect"
3. השתמש ב-psql או בכלי ניהול מסד נתונים אחר
4. הרץ:
```sql
SELECT * FROM community_stats WHERE stat_type = 'site_visits';
```

## מה עשינו בקוד

### 1. הוספנו את `site_visits` לסטטיסטיקות ההתחלתיות

בקובץ `src/database/database.init.ts`:
```typescript
const defaultStats = [
  { stat_type: 'site_visits', stat_value: 0 },  // <-- חדש!
  { stat_type: 'money_donations', stat_value: 0 },
  // ... שאר הסטטיסטיקות
];
```

### 2. וידאנו ש-`ON CONFLICT DO NOTHING` שומר נתונים קיימים

הקוד:
```typescript
INSERT INTO community_stats (stat_type, stat_value, date_period)
VALUES ($1, $2, CURRENT_DATE)
ON CONFLICT (stat_type, city, date_period) DO NOTHING
```

זה אומר: אם הרשומה כבר קיימת (עם אותו `stat_type`, `city`, ו-`date_period`), **אל תשנה אותה**.

כך הנתונים הקיימים נשמרים בעת פריסה מחדש.

## איך עובד מנגנון הביקורים

1. **כשמישהו מבקר באתר לראשונה ביום:**
   ```sql
   INSERT INTO community_stats (stat_type, stat_value, city, date_period)
   VALUES ('site_visits', 1, NULL, CURRENT_DATE)
   ON CONFLICT (stat_type, city, date_period) 
   DO UPDATE SET stat_value = community_stats.stat_value + 1
   ```

2. **בביקורים נוספים באותו יום:**
   הערך מתעדכן: `stat_value = stat_value + 1`

3. **בעת פריסה מחדש:**
   - הקוד מנסה ליצור רשומה חדשה עם `stat_value = 0`
   - בגלל `ON CONFLICT DO NOTHING`, הרשומה הקיימת **לא משתנה**
   - הנתונים נשמרים! ✅

## אזהרה: מה **לא** לעשות

❌ **אל תמחק את ה-Postgres Plugin** - זה ימחק את כל הנתונים!
❌ **אל תשתמש ב-DATABASE_URL מקומי בפרודקשן** - זה לא יעבוד
❌ **אל תקרא ל-`/api/stats/community/reset`** - זה ימחק את כל הסטטיסטיקות

## בעיות נפוצות

### בעיה: הנתונים עדיין מתאפסים
**פתרון:**
1. בדוק ש-Railway משתמש ב-Postgres Plugin (לא במסד נתונים זמני)
2. בדוק ש-`DATABASE_URL` מצביע ל-Plugin ולא למקום אחר
3. בדוק את הלוגים - אולי יש שגיאה בחיבור למסד הנתונים

### בעיה: "relation does not exist"
**פתרון:**
הטבלה לא נוצרה. זה קורה אוטומטית בהפעלה הראשונה של השרת.
אם זה לא קורה, הרץ ידנית:
```bash
npm run init:db
```

### בעיה: הנתונים נשמרים אבל לא מוצגים באתר
**פתרון:**
1. נקה את ה-cache של Redis:
   ```bash
   # התחבר ל-Redis ב-Railway
   redis-cli
   FLUSHALL
   ```
2. או המתן 10 דקות - ה-cache יפוג אוטומטית

## עדכון גרסה

גרסה: 1.7.5
תאריך: 2025-11-23
שינוי: הוספת `site_visits` לסטטיסטיקות ההתחלתיות + תיעוד מלא


