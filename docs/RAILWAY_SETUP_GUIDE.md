# מדריך הגדרת Railway - הפרדת סביבות Development ו-Production

**תאריך:** 24 דצמבר 2025  
**מצב נוכחי:** יש כבר הפרדה חלקית, צריך להשלים

---

## 📊 מצב נוכחי (לפי הנתונים שלך)

### ✅ מה שכבר עובד טוב:

#### Development Environment
- **Postgres**: נפרד ✅ (סיסמה: `mmWLXgvXF...`)
  - Internal: `postgres-a3d6beef.railway.internal`
  - Public: `caboose.proxy.rlwy.net:42564`
- **Server**: `KC-MVP-server-development`
- **Frontend**: `MVP-development`

#### Production Environment
- **Postgres**: נפרד ✅ (סיסמה: `RHkhivARk...`)
  - Internal: `postgres.railway.internal`
  - Public: `ballast.proxy.rlwy.net:33648`
- **Server**: `KC-MVP-server-production`
- **Frontend**: `MVP` (עם דומיין karma-community-kc.com)

### ⚠️ מה שצריך לתקן:

#### Redis משותף! 🚨
- **שתי הסביבות משתמשות באותו Redis!**
- סיסמה משותפת: `deQMolmzgWZsqeAkiEpZPFvejfGjenEm`
- זה יכול לגרום לבעיות:
  - Cache משותף בין dev ל-production
  - Sessions מתערבבים
  - נתוני dev משפיעים על production

---

## 🎯 מה צריך לעשות

### שלב 1: יצירת Redis נפרד ל-Development

#### 1.1 ב-Railway Dashboard

1. פתח את הפרויקט `adventurous-contentment`
2. בחר את הסביבה `development` (למעלה)
3. לחץ על **"+ New"**
4. בחר **"Database"** → **"Add Redis"**
5. שם מוצע: `redis-dev` או `redis-kc-mvp-dev`
6. לחץ **"Add Redis"**

#### 1.2 חיבור ל-Backend Development

1. אחרי שה-Redis נוצר, לחץ עליו
2. לך ל-**"Connect"** או **"Variables"**
3. תראה את המשתנים:
   - `REDIS_URL`
   - `REDIS_PASSWORD`
   - `REDIS_PUBLIC_URL`

4. עכשיו פתח את `KC-MVP-server-development`
5. לך ל-**"Variables"**
6. חפש את `REDIS_URL`
7. **עדכן אותו** ל-URL של ה-Redis החדש שיצרת

**לחלופין** - חבר דרך Plugins:
1. פתח `KC-MVP-server-development`
2. לך ל-**"Variables"** → **"Plugins"** (טאב)
3. לחץ **"Connect"** ליד `redis-dev`
4. זה יעדכן אוטומטית את `REDIS_URL`

#### 1.3 שינוי שם ל-Redis של Production (אופציונלי אבל מומלץ)

1. פתח את ה-Redis הישן (שנקרא `redis-kc-mvp`)
2. לך ל-**"Settings"**
3. שנה את השם ל-`redis-kc-mvp-prod` או `redis-prod`
4. זה יעזור לזהות איזה Redis שייך לאיזו סביבה

---

### שלב 2: הגדרת דומיין dev.karma-community-kc.com

#### 2.1 ב-Railway

1. פתח את השירות `MVP-development`
2. לך ל-**"Settings"** → **"Networking"**
3. במקטע **"Domains"**, לחץ **"Custom Domain"**
4. הזן: `dev.karma-community-kc.com`
5. לחץ **"Add Domain"**

Railway יציג לך הוראות DNS, משהו כמו:
```
Type: CNAME
Name: dev
Value: mvp-development-59c0.up.railway.app
```

#### 2.2 אצל ספק הדומיין שלך

1. התחבר לספק הדומיין שלך (GoDaddy, Cloudflare, Namecheap וכו')
2. מצא את ניהול ה-DNS עבור `karma-community-kc.com`
3. הוסף רשומה חדשה:
   - **Type**: CNAME
   - **Name**: `dev` (או `dev.karma-community-kc.com`)
   - **Value**: מה ש-Railway נתן לך
   - **TTL**: Auto או 3600

4. שמור

#### 2.3 המתן לאימות

- בדרך כלל לוקח 5-30 דקות
- לפעמים עד 24 שעות (נדיר)
- ב-Railway תראה סטטוס "Waiting for DNS" ואז "Active"

---

### שלב 3: עדכון משתני סביבה

#### 3.1 Backend Development (`KC-MVP-server-development`)

לך ל-**Variables** והוסף/עדכן:

```env
# Environment
ENVIRONMENT=development
NODE_ENV=development

# CORS - Development domains
CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,http://localhost:3000,http://localhost:8081

# Port
PORT=3001

# Google OAuth (אותו לשתי הסביבות)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com

# JWT Secret - צור חדש!
JWT_SECRET=<הרץ את הפקודה למטה>
```

**ליצירת JWT_SECRET חדש**, הרץ במחשב שלך:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

העתק את התוצאה והדבק ב-`JWT_SECRET`.

**שים לב**: `DATABASE_URL` ו-`REDIS_URL` אמורים להיות כבר מוגדרים מה-plugins. אל תשנה אותם ידנית!

#### 3.2 Backend Production (`KC-MVP-server-production`)

לך ל-**Variables** וודא שיש:

```env
# Environment
ENVIRONMENT=production
NODE_ENV=production

# CORS - Production domains only!
CORS_ORIGIN=https://karma-community-kc.com,https://www.karma-community-kc.com

# Port
PORT=3001

# Google OAuth (אותו לשתי הסביבות)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com

# JWT Secret - אל תשנה! השאר את הקיים!
JWT_SECRET=<הקיים - אל תגע!>
```

**חשוב מאוד**: אל תשנה את ה-`JWT_SECRET` של production! זה ישבור את כל הטוקנים הקיימים של המשתמשים.

#### 3.3 Frontend Development (`MVP-development`)

לך ל-**Variables** והוסף/עדכן:

```env
# Environment
EXPO_PUBLIC_ENVIRONMENT=development

# API URL - הכתובת של השרת Development
EXPO_PUBLIC_API_BASE_URL=https://kc-mvp-server-development.up.railway.app
```

(או הכתובת המדויקת של השרת שלך - תמצא אותה ב-Settings → Networking של השרת)

#### 3.4 Frontend Production (`MVP`)

לך ל-**Variables** וודא שיש:

```env
# Environment
EXPO_PUBLIC_ENVIRONMENT=production

# API URL - הכתובת של השרת Production
EXPO_PUBLIC_API_BASE_URL=https://kc-mvp-server-production.up.railway.app
```

---

### שלב 4: העתקת מסד נתונים מ-Production ל-Development

#### 4.1 הכנה

במחשב המקומי, בתיקיה `KC-MVP-server`:

```bash
# ודא שיש לך את החבילות
npm install
```

#### 4.2 ייצוא מ-Production

```bash
DATABASE_URL="postgresql://postgres:RHkhivARkcVwOrVHClXBttSBZQrbuVlq@ballast.proxy.rlwy.net:33648/railway" npm run data:export
```

זה ייצור תיקייה `data-export/` עם כל הטבלאות בפורמט JSON.

**שים לב**: השתמש ב-`DATABASE_PUBLIC_URL` (עם `ballast.proxy.rlwy.net`) ולא ב-internal URL!

#### 4.3 אנונימיזציה (מומלץ!)

```bash
npm run data:anonymize
```

זה ייצור `data-export-anonymized/` עם:
- מיילים מוסווים (user_xxx@dev.test)
- טלפונים מוסווים (0500000000)
- שאר הנתונים נשמרים

#### 4.4 ייבוא ל-Development

```bash
DATABASE_URL="postgresql://postgres:mmWLXgvXFYuTiWblJNyYWoVugcgWcBTR@caboose.proxy.rlwy.net:42564/railway" npm run data:import
```

**שים לב**: 
- השתמש ב-`DATABASE_PUBLIC_URL` של development
- הסקריפט ינסה לטפל ב-foreign keys אוטומטית
- אם יש שגיאות, ייתכן שתצטרך לייבא טבלאות בסדר ידני

#### 4.5 אימות

התחבר למסד הנתונים של development (דרך Railway או DBeaver) ובדוק:
```sql
SELECT COUNT(*) FROM user_profiles;
SELECT COUNT(*) FROM posts;
SELECT COUNT(*) FROM donations;
```

---

### שלב 5: בדיקות

#### 5.1 הרץ את סקריפט הבדיקה

במחשב המקומי:

```bash
cd KC-MVP-server

# בדוק Development
DATABASE_URL="<dev-url>" ENVIRONMENT=development npm run check:env

# בדוק Production
DATABASE_URL="<prod-url>" ENVIRONMENT=production npm run check:env
```

#### 5.2 בדוק לוגים ב-Railway

**Development:**
1. פתח `KC-MVP-server-development`
2. לך ל-**"Deployments"** → לחץ על הפריסה האחרונה
3. לך ל-**"View Logs"**
4. חפש:
   - `Environment: DEVELOPMENT` או `🟢 DEVELOPMENT`
   - `Database: ✅ Connected`
   - `Redis: ✅ Connected`

**Production:**
1. פתח `KC-MVP-server-production`
2. עשה אותו דבר
3. חפש:
   - `Environment: PRODUCTION` או `🔴 PRODUCTION`
   - בדוק שמחובר למסדי נתונים הנכונים

#### 5.3 בדוק CORS

1. פתח `https://dev.karma-community-kc.com` בדפדפן
2. פתח Developer Console (F12)
3. לך ל-Console
4. בדוק שאין שגיאות CORS
5. נסה להתחבר/לבצע פעולה

6. עשה אותו דבר עם `https://karma-community-kc.com`

#### 5.4 בדוק הפרדת נתונים

1. התחבר ל-`dev.karma-community-kc.com`
2. צור פוסט עם טקסט: "TEST DEV ENVIRONMENT - DELETE ME"
3. התחבר ל-`karma-community-kc.com`
4. ודא שהפוסט **לא** מופיע שם
5. חזור ל-dev וודא שהוא **כן** מופיע

---

## 📋 Checklist סופי

לפני השקה, ודא ש:

### Infrastructure
- [ ] יש Redis נפרד לכל סביבה
- [ ] יש Postgres נפרד לכל סביבה
- [ ] דומיין dev.karma-community-kc.com פעיל
- [ ] דומיין karma-community-kc.com פעיל
- [ ] SSL/HTTPS פעיל בשני הדומיינים

### Environment Variables
- [ ] `ENVIRONMENT` מוגדר נכון בכל שירות
- [ ] `NODE_ENV` מוגדר נכון
- [ ] `CORS_ORIGIN` שונה בין הסביבות
- [ ] `JWT_SECRET` שונה בין הסביבות
- [ ] `DATABASE_URL` שונה בין הסביבות
- [ ] `REDIS_URL` שונה בין הסביבות
- [ ] Frontend מכוון לשרת הנכון

### Testing
- [ ] שתי הסביבות עולות ללא שגיאות
- [ ] אין שגיאות CORS
- [ ] Authentication עובד בשתי הסביבות
- [ ] נתונים מופרדים (פוסט ב-dev לא מופיע ב-prod)
- [ ] Cache מופרד (Redis שונה)

### Data
- [ ] Production מכיל רק נתונים אמיתיים
- [ ] אין משתמשי בדיקה ב-production
- [ ] יש גיבוי של production
- [ ] Development מכיל נתונים מאנונימיזציים

---

## 🆘 פתרון בעיות נפוצות

### בעיה: "CORS error" בדפדפן

**פתרון:**
1. בדוק שה-`CORS_ORIGIN` ב-backend כולל את הדומיין הנכון
2. ודא שאין רווחים מיותרים
3. ודא שיש `https://` בהתחלה
4. נסה לעשות Redeploy לשרת

### בעיה: "הנתונים מופיעים בשתי הסביבות"

**פתרון:**
1. בדוק את `DATABASE_URL` בכל שירות
2. ודא שהסיסמאות שונות
3. הרץ את `npm run check:env` לבדיקה

### בעיה: "Authentication לא עובד"

**פתרון:**
1. בדוק ש-`JWT_SECRET` מוגדר
2. בדוק שהוא לפחות 32 תווים
3. בדוק שהוא שונה בין הסביבות
4. נקה cookies ונסה שוב

### בעיה: "Redis connection failed"

**פתרון:**
1. בדוק ש-`REDIS_URL` מוגדר
2. בדוק שהוא מחובר ל-Redis הנכון
3. ב-Railway, ודא שה-Redis online
4. נסה לנתק ולחבר מחדש את ה-plugin

### בעיה: "Cannot import data - foreign key constraint"

**פתרון:**
1. הסקריפט מנסה לייבא בסדר הנכון
2. אם זה לא עובד, ייבא ידנית בסדר:
   - users / user_profiles
   - organizations
   - categories
   - posts
   - donations
   - rides
   - items
   - chats
   - messages

---

## 📞 עזרה נוספת

אם יש בעיה:
1. בדוק את הלוגים ב-Railway
2. הרץ `npm run check:env`
3. הרץ `npm run verify:separation`
4. בדוק את המדריך `KC-MVP-server/ENVIRONMENT_SEPARATION.md`

---

**עודכן:** 24 דצמבר 2025  
**גרסה:** 1.0.0







