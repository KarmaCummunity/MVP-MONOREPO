# KC-MVP Server (NestJS + Postgres + Redis)

שרת NestJS לאפליקציית Karma Community עם Postgres ו-Redis, ו־REST גנרי תואם ל־`DatabaseService` בפרונט.

**גרסה נוכחית:** 2.5.2  
**עדכון אחרון:** 2025-12-24 - בדיקת Redis בפרודקשן

## 🆕 מה חדש בגרסה 2.5.3

- ✅ **Quality Gate System:** מערכת מקיפה למניעת הוספת בעיות חדשות
  - Pre-commit hooks (ESLint + TypeScript)
  - Pre-push validation (Tests + Security)
  - CI/CD Quality Gate (SonarCloud + Snyk)
- ✅ **הפרדת סביבות מוחלטת:** Development ו-Production מופרדים לחלוטין
- ✅ **בדיקות אוטומטיות:** סקריפטים לבדיקת משתני סביבה והפרדה
- ✅ **אבטחה משופרת:** בדיקה בעת startup שמונעת חיבור של dev ל-prod DB
- ✅ **תיעוד מקיף:** מדריכים מפורטים להגדרת Railway והעתקת DB
- ✅ **GitHub Actions:** בדיקות אוטומטיות לפני כל deploy

**🎯 Quality Gate:**
```bash
# בדיקה מקומית לפני push
npm run quality:gate

# בדיקת אבטחה בלבד
npm run quality:snyk
```

**⚠️ נמצאה בעיה:** Redis לא מוגדר בפרודקשן! ראה `FIX_REDIS_PRODUCTION.md`

**ראה:**
- `QUALITY_GATE_SETUP.md` - הגדרת Quality Gate
- `docs/QUALITY_GATE.md` - תיעוד מלא
- `FIX_REDIS_PRODUCTION.md`, `TEST_REDIS_PRODUCTION.md`, `RAILWAY_SETUP_GUIDE.md`

## 🌍 סביבות

### Production (main)
- **Domain**: `karma-community-kc.com`
- **Branch**: `main`
- **Database**: Postgres נפרד (ID: 5f1b9d5d) ✅
- **Redis**: ❌ **לא מוגדר - צריך תיקון!** (ראה `FIX_REDIS_PRODUCTION.md`)
- **Purpose**: משתמשים אמיתיים, נתונים אמיתיים

### Development (dev)
- **Domain**: `dev.karma-community-kc.com`
- **Branch**: `dev`
- **Database**: Postgres נפרד (ID: f92654e1) ✅
- **Redis**: Redis נפרד ✅ (password: ggCVffISJOm...)
- **Purpose**: בדיקות, פיתוח, נתונים מאנונימיזציים

## 🚀 הפעלה מקומית

```bash
npm install

# הרמת בסיסי נתונים
npm run docker:up

# אתחול סכמות וטבלאות
npm run init:db

# פיתוח
npm run start:dev
```

צרו קובץ `.env` (ראה `SETUP_GUIDE.md` למדריך מפורט):
```bash
# Copy example file and configure
cp .env.example .env

# Generate secure password
openssl rand -base64 16

# Edit .env and set:
# - DATABASE_URL with your generated password
# - POSTGRES_PASSWORD (same as in DATABASE_URL)
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - GOOGLE_CLIENT_ID and other OAuth credentials
# - ROOT_ADMIN_EMAIL

# IMPORTANT: Never commit .env to git!
# Use different passwords for development, testing, and production
```

**הערה חשובה:** אל תשתמשו בסיסמאות קשיחות! תמיד קראו מקובץ `.env` או ממשתני סביבה.  
ראה `SECURITY.md` לפרטים נוספים על ניהול secrets.

## 🔐 מערכת הרשאות (Permissions)

- **הרשאות נשמרות בדאטהבייס** בטבלת `user_profiles`: שדה `roles` (מערך: `user`, `volunteer`, `admin`, `super_admin`) ו-`parent_manager_id` (היררכיה).
- **המייל היחיד בקוד/קונפיג:** `ROOT_ADMIN_EMAIL` ב-`.env` – משמש רק כדי:
  - להעניק ל-user הזה את התפקיד `super_admin` באתחול (ב-`DatabaseInit`),
  - ולהגן עליו מפני שינוי/הורדה (לא ניתן להסיר לו מנהל או להוריד תפקיד).
- **כל שאר המנהלים והמתנדבים:** מקודמים/משויכים דרך ה-API (למשל `POST /api/users/:id/promote-admin`, `setManager`) והנתונים נשמרים ב-DB. אין רשימת מיילים בקוד.

## 📡 Endpoints

- `GET /` — בריאות
- CRUD גנרי לפי קולקציה (תואם ל־collections של DatabaseService):
  - `GET /api/:collection?userId=...` — רשימת פריטים למשתמש
  - `GET /api/:collection/:userId/:itemId` — פריט בודד
  - `POST /api/:collection` — יצירה/עדכון: body `{ id, userId, data }`
  - `PUT /api/:collection/:userId/:itemId` — עדכון: body `{ data }`
  - `DELETE /api/:collection/:userId/:itemId` — מחיקה

טבלאות נוצרות עם PK מורכב `(user_id, item_id)` ועמודת JSONB בשם `data`.

## 🚀 פריסה ב-Railway

הפרויקט מוגדר לפריסה אוטומטית ב-Railway עם **הפרדה מוחלטת** בין סביבות.

### הגדרות הפריסה:
- **Runtime**: V2 (גרסה מתקדמת ומהירה)
- **Builder**: Dockerfile
- **Replicas**: 1 (עותק אחד)
- **Multi-Region**: אירופה המערבית (europe-west4)
- **Restart Policy**: הפעלה מחדש אוטומטית במקרה של כשל
- **Health Check**: בדיקת בריאות אוטומטית

### פריסה - Development:
1. ב-Railway, בחר branch: `dev`
2. ודא שמחובר ל-Postgres-dev ו-Redis-dev
3. הגדר משתני סביבה (ראה `RAILWAY_SETUP_GUIDE.md`):
   ```
   ENVIRONMENT=development
   NODE_ENV=development
   CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,...
   JWT_SECRET=<חדש לdev>
   ```
4. Deploy אוטומטי מ-branch `dev`

### פריסה - Production:
1. ב-Railway, בחר branch: `main`
2. ודא שמחובר ל-Postgres-production ו-Redis-production
3. הגדר משתני סביבה:
   ```
   ENVIRONMENT=production
   NODE_ENV=production
   CORS_ORIGIN=https://karma-community-kc.com,https://www.karma-community-kc.com
   JWT_SECRET=<הקיים של production - אל תשנה!>
   ```
4. Deploy אוטומטי מ-branch `main`

**⚠️ חשוב:** 
- אל תשתמש באותו `JWT_SECRET` בשתי הסביבות!
- אל תחבר dev ל-production database!
- הרץ `npm run check:env` לפני deploy

**📚 מדריכים מפורטים:**
- `RAILWAY_SETUP_GUIDE.md` - הגדרת Railway מאפס
- `DB_COPY_GUIDE.md` - העתקת נתונים בין סביבות
- `ENVIRONMENT_SEPARATION.md` - תיעוד מלא על הפרדת סביבות