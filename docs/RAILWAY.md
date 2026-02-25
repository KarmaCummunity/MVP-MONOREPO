# פריסה ל־Railway (Backend + Frontend + Postgres + Redis)

מדריך קצר לפריסה של המערכת ל־Railway כשני שירותים נפרדים: `backend` (NestJS) ו־`web` (Expo Web על Nginx), עם תוספי Postgres ו־Redis.

## דרישות מקדימות
- חשבון Railway
- התקנת Railway CLI מקומית (אופציונלי): `npm i -g @railway/cli`
- קישור המאגר ל־GitHub מומלץ לפריסות אוטומטיות

## סקירת ארכיטקטורה
- Backend: תיקייה `KC-MVP-server` (NestJS).
- Frontend Web: תיקייה `MVP` (Expo export + Nginx).
- מסדי נתונים: Railway Plugins ל־Postgres ו־Redis.

## שירותי Railway
### 1) יצירת פרויקט והוספת תוספים
- צור Project חדש ב־Railway.
- הוסף תוספים (Plugins): Postgres, Redis.

### 2) שירות Backend (NestJS)
- צור Service חדש מתוך התיקייה `KC-MVP-server` (דרך GitHub או CLI):
  - CLI (אופציונלי):
    ```bash
    cd KC-MVP-server
    railway up --service backend
    ```
- משתני סביבה חשובים (Railway קובע חלק מהם אוטומטית):
  - Database:
    - מומלץ: `DATABASE_URL` (נוצר אוטומטית ע"י תוסף Postgres)
    - או: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require`
  - Redis:
    - `REDIS_URL` (אם זמין), או `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
    - אם זה Upstash: נתמך גם `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_USERNAME`, `UPSTASH_REDIS_PASSWORD`
    - להכריח TLS: `REDIS_TLS=true` (אם נדרש)
  - CORS:
    - `CORS_ORIGIN` = דומיין הפרונט (למשל `https://<web-subdomain>.up.railway.app`)
  - Google Places (אופציונלי):
    - `GOOGLE_API_KEY`

> השרת מקשיב ל־`PORT` של Railway אוטומטית (`0.0.0.0`).

### 3) שירות Web (Nginx + Expo export)
- צור Service חדש מתוך התיקייה `MVP` (דרך GitHub או CLI):
  - CLI (אופציונלי):
    ```bash
    cd MVP
    railway up --service web
    ```
- משתני סביבה לשירות ה־Web:
  - `BACKEND_BASE_URL` = כתובת ציבורית של הבקאנד, למשל:
    - `https://<backend-subdomain>.up.railway.app`
  - (בזמן בנייה) ברירת המחדל כבר מוגדרת כך שהאפליקציה תקרא ל־`/api` כנתיב יחסי, וה־Nginx יעשה proxy ל־`BACKEND_BASE_URL`.

## בדיקות מהירות
- בקרו ב־URL של שירות ה־Web. ודאו שניתן לבצע פעולות היוצרות קריאות ל־`/api/...`.
- בדקו בריאות Redis: `https://<backend>/health/redis`.
- בדקו בריאות כללית: `https://<backend>/`.

## הערות טכניות רלוונטיות לקוד
- Backend:
  - מודול Postgres תומך ב־`DATABASE_URL` ובסט ה־PG* הסטנדרטי.
  - מודול Redis תומך ב־`REDIS_URL`/`REDIS_*` וגם משתני Upstash, עם `REDIS_TLS`.
- Web:
  - Nginx משתמש בתבנית קונפיגורציה עם `envsubst` כדי להזריק `BACKEND_BASE_URL` בזמן ריצה.
  - קבצי JS מבצעים קריאות ל־`/api` כברירת מחדל; ה־proxy מנתב ל־Backend.

## טיפים
- אם תרצו דומיין מותאם לפרונט/בקאנד, הוסיפו Custom Domain לכל שירות והגדירו את `CORS_ORIGIN` בהתאם.
- לוגים: לוח ה־Railway מציג את לוגי השירותים.

## ⚠️ חשוב: שמירת נתונים קבועה (Data Persistence)

**בעיה נפוצה:** נתוני הסטטיסטיקות (כמו מספר ביקורים באתר) מתאפסים בכל עדכון של השרת.

**הסיבה:** השרת לא מחובר ל-Postgres Plugin של Railway, או שהוא משתמש במסד נתונים זמני.

### כיצד לוודא ששמירת הנתונים עובדת:

1. **וודא שיש לך Postgres Plugin:**
   - בפרויקט של Railway, לחץ על "+ New" → "Database" → "Add PostgreSQL"
   - Railway ייצור מסד נתונים קבוע עם כרך (Volume) שנשמר בין עדכונים

2. **חבר את ה-Backend ל-Plugin:**
   - בדף ה-Service של ה-Backend, לחץ על "Variables"
   - בחלק "Plugins", וודא שיש חיבור ל-PostgreSQL
   - אם אין, לחץ על "Connect" ובחר את ה-PostgreSQL Plugin

3. **בדוק את משתני הסביבה:**
   - `DATABASE_URL` אמור להיות מוגדר אוטומטית ע"י ה-Plugin
   - או: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
   - אם אין - הוסף אותם ידנית מהפרטים של ה-PostgreSQL Plugin

4. **בדיקה:**
   - בקר באתר מספר פעמים
   - עדכן את השרת (push קוד חדש)
   - בקר באתר שוב - מספר הביקורים **לא אמור להתאפס**

### הערות טכניות:

- הקוד משתמש ב-`ON CONFLICT DO NOTHING` כדי לשמור נתונים קיימים
- הלוגים יראו "✅ Preserved existing stat" כאשר נתונים נשמרים
- לפרטים נוספים ראה: `RAILWAY_DATA_PERSISTENCE.md`

### בעיות נפוצות:

**הנתונים עדיין מתאפסים?**
- בדוק שה-PostgreSQL הוא Plugin ולא שירות נפרד
- בדוק שהחיבור נעשה דרך "Connect to Plugin" ולא ידנית
- בדוק את הלוגים - חפש שגיאות חיבור למסד נתונים

**"relation does not exist"?**
- זה אומר שהטבלאות לא נוצרו
- זה אמור לקרות אוטומטית בהפעלה הראשונה
- אם לא - בדוק את הלוגים של השרת


