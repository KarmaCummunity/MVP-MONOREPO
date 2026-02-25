# פתרון בעיות - Development Environment

**תאריך:** 24 דצמבר 2025

---

## 🚨 בעיה: "Missing REQUIRED environment variables: DATABASE_URL"

### תסמינים:
```
[Nest] ERROR [Bootstrap] ❌ Missing REQUIRED environment variables: DATABASE_URL
[Nest] ERROR [Bootstrap] 💡 Set these variables in your .env file or environment
[Nest] ERROR [Bootstrap] ⚠️  Server cannot start without proper configuration
```

השרת מנסה להתניע שוב ושוב ונכשל.

---

### פתרון 1: חיבור Postgres Plugin

**הסיבה:** ה-Postgres plugin לא מחובר לשירות.

**פתרון:**
1. ב-Railway Dashboard, פתח את `KC-MVP-server-development`
2. לך ל-**"Variables"** → **"Plugins"** (טאב עליון)
3. אמור לראות את `Postgres` (ID: f92654e1)
4. לחץ על **"Connect"** לידו
5. זה יוסיף אוטומטית את `DATABASE_URL` למשתני הסביבה
6. השירות יעשה Redeploy אוטומטית

**זמן משוער:** 2 דקות + 2-3 דקות deploy

---

### פתרון 2: הוספה ידנית של DATABASE_URL

אם הפתרון הראשון לא עובד:

1. פתח `KC-MVP-server-development` → **"Variables"**
2. לחץ על **"Raw Editor"** (למעלה מימין)
3. הוסף שורה חדשה:
   ```
   DATABASE_URL=postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@postgres-a3d6beef.railway.internal:5432/railway
   ```
4. לחץ **"Save"**
5. השירות יעשה Redeploy אוטומטית

**שים לב:** השתמש ב-**internal URL** (עם `.railway.internal`) ולא ב-public URL!

---

### פתרון 3: בדיקת הגדרות Postgres

אם עדיין לא עובד:

1. פתח את ה-**Postgres** (ID: f92654e1) ב-Railway
2. לך ל-**"Variables"** או **"Connect"**
3. ודא שיש:
   - `DATABASE_URL`
   - `DATABASE_PRIVATE_URL` (זה ה-internal)
4. העתק את `DATABASE_PRIVATE_URL` (זה עם `.railway.internal`)
5. הדבק אותו כ-`DATABASE_URL` ב-`KC-MVP-server-development`

---

### אימות שהבעיה נפתרה:

אחרי ה-Redeploy, בדוק את הלוגים:

**לוגים טובים (עובד):**
```
[Nest] LOG [Bootstrap] 🚀 Starting Karma Community Server...
[Nest] LOG [Bootstrap] ✅ Environment validation passed
[Nest] LOG [Bootstrap] 📍 Environment: DEVELOPMENT 🟢
[Nest] LOG [Bootstrap] ✅ Database: Development (verified by connection string)
[Nest] LOG [DatabaseInit] 💾 Initializing database schema...
[Nest] LOG [DatabaseInit] ✅ Database initialized successfully
[Nest] LOG [NestApplication] Nest application successfully started
```

**לוגים רעים (עדיין לא עובד):**
```
[Nest] ERROR [Bootstrap] ❌ Missing REQUIRED environment variables: DATABASE_URL
```

---

## 🚨 בעיה: "Incorrect value" בהגדרת DNS

### תסמינים:
Railway מראה:
```
Incorrect value "jgr6a53j.up.railway.app"
```

אבל הערך הנכון הוא: `9jcslmta.up.railway.app`

---

### פתרון:

**אצל ספק הדומיין שלך:**

1. מצא את רשומת ה-CNAME עבור `dev.karma-community-kc.com`
2. ערוך אותה:
   - Type: `CNAME`
   - Name: `dev`
   - Value: `9jcslmta.up.railway.app` (**לא** `jgr6a53j.up.railway.app`)
   - TTL: Auto או 3600

3. שמור

4. חזור ל-Railway → `MVP-development` → Settings → Networking
5. בדוק את הסטטוס של הדומיין
6. אמור להשתנות ל-"Active" תוך 5-30 דקות

---

## 🚨 בעיה: משתני סביבה לא מתעדכנים

### תסמינים:
שינית משתנה ב-Railway אבל השרת עדיין משתמש בערך הישן.

---

### פתרון:

1. **Redeploy ידני:**
   - Railway Dashboard → השירות
   - לחץ על הפריסה האחרונה (Deployments)
   - לחץ על **"Redeploy"**

2. **נקה Build Cache:**
   - Settings → **"Clear Build Cache"**
   - אחר כך Redeploy

3. **אם זה לא עוזר - בדוק שהמשתנה נשמר:**
   - Variables → Raw Editor
   - ודא שהמשתנה שם עם הערך הנכון

---

## 🚨 בעיה: Redis connection failed

### תסמינים:
```
[Nest] ERROR [RedisModule] ❌ Redis connection failed
```

---

### פתרון:

**אם עדיין לא יצרת Redis נפרד:**

1. Railway → `development` environment
2. **"+ New"** → **"Database"** → **"Add Redis"**
3. שם: `redis-dev`
4. אחרי שנוצר:
   - פתח `KC-MVP-server-development`
   - Variables → Plugins → Connect `redis-dev`

**אם כבר יצרת אבל לא עובד:**

1. בדוק שה-`REDIS_URL` מוגדר:
   - `KC-MVP-server-development` → Variables
   - חפש `REDIS_URL`
   - צריך להיות משהו כמו: `redis://default:password@host:port`

2. אם חסר, הוסף ידנית:
   - פתח את `redis-dev`
   - העתק את `REDIS_URL` או `REDIS_PRIVATE_URL`
   - הדבק ב-`KC-MVP-server-development` → Variables

---

## 🚨 בעיה: CORS errors בדפדפן

### תסמינים:
```
Access to fetch at 'https://kc-mvp-server-development...' from origin 'https://dev.karma-community-kc.com' has been blocked by CORS policy
```

---

### פתרון:

1. ב-Railway: `KC-MVP-server-development` → Variables
2. בדוק/עדכן את `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,http://localhost:3000,http://localhost:8081
   ```

3. **חשוב:** אל תשכח את `https://` בהתחלה!

4. שמור ו-Redeploy

---

## 🚨 בעיה: "Cannot connect to database"

### תסמינים:
```
[Nest] ERROR [DatabaseModule] Cannot connect to database
```

---

### פתרון:

1. **בדוק שה-Postgres online:**
   - Railway → Postgres (ID: f92654e1)
   - ודא שהסטטוס "Active"

2. **בדוק את ה-URL:**
   - צריך להיות עם `.railway.internal` (לא `.proxy.rlwy.net`)
   - פורמט: `postgresql://postgres:password@postgres-xxx.railway.internal:5432/railway`

3. **נסה להתחבר ידנית:**
   ```bash
   psql "postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@caboose.proxy.rlwy.net:42564/railway"
   ```
   
   אם זה עובד, הבעיה היא ב-Railway configuration.

---

## 📋 Checklist לפני שמבקש עזרה

- [ ] בדקתי שה-Postgres plugin מחובר
- [ ] בדקתי שיש `DATABASE_URL` במשתני סביבה
- [ ] עשיתי Redeploy אחרי שינוי משתנים
- [ ] בדקתי את הלוגים המלאים (לא רק את השגיאה)
- [ ] ניסיתי לנקות Build Cache
- [ ] בדקתי שהשירות ב-branch הנכון (dev)

---

## 🆘 עזרה נוספת

אם שום דבר לא עוזר:

1. **צלם screenshot של:**
   - Variables של `KC-MVP-server-development`
   - Plugins של `KC-MVP-server-development`
   - הלוגים המלאים (לא רק השגיאה)

2. **הרץ בדיקה מקומית:**
   ```bash
   cd KC-MVP-server
   npm run check:env
   ```

3. **בדוק את המדריך המלא:**
   - `RAILWAY_SETUP_GUIDE.md`

---

**עודכן:** 24 דצמבר 2025







