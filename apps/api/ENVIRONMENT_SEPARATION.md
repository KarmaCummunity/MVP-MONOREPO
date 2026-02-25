# הפרדת סביבות - Development ו-Production

מדריך מפורט להגדרת סביבות נפרדות לחלוטין ב-Railway, כולל מסדי נתונים נפרדים.

## 🎯 מטרה

להפריד לחלוטין בין:
- **סביבת פיתוח (Development)** - לבדיקות ופיתוח
- **סביבת פרודקשן (Production)** - למשתמשים אמיתיים

כל סביבה תהיה עם:
- ✅ שירות נפרד (Service)
- ✅ מסד נתונים נפרד (Postgres Plugin)
- ✅ Redis נפרד (Redis Plugin)
- ✅ משתני סביבה נפרדים
- ✅ דומיינים נפרדים

---

## 📋 שלב 1: יצירת שירותי Development

### 1.1 שירות Backend - Development

1. ב-Railway Dashboard, פתח את הפרויקט שלך
2. לחץ על **"+ New"** → **"GitHub Repo"** (או **"Empty Service"**)
3. בחר את ה-repository: `KC-MVP-server`
4. בחר את ה-branch: `dev` (או branch אחר לפיתוח)
5. שם השירות: `KC-MVP-server-dev` (או שם אחר שמבדיל)

### 1.2 שירות Frontend - Development

1. לחץ על **"+ New"** → **"GitHub Repo"**
2. בחר את ה-repository: `MVP`
3. בחר את ה-branch: `dev`
4. שם השירות: `MVP-dev`

---

## 🗄️ שלב 2: יצירת מסדי נתונים נפרדים

### 2.1 Postgres - Development

1. לחץ על **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. שם ה-Plugin: `Postgres-dev` (או שם אחר שמבדיל)
3. **חשוב:** זה מסד נתונים נפרד לחלוטין מ-Production!

### 2.2 Postgres - Production

1. אם עדיין אין לך, צור: **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. שם ה-Plugin: `Postgres-production`
3. **חשוב:** זה מסד נתונים נפרד לחלוטין מ-Development!

### 2.3 Redis - Development

1. לחץ על **"+ New"** → **"Database"** → **"Add Redis"**
2. שם ה-Plugin: `Redis-dev`

### 2.4 Redis - Production

1. צור: **"+ New"** → **"Database"** → **"Add Redis"**
2. שם ה-Plugin: `Redis-production`

---

## 🔗 שלב 3: חיבור שירותים למסדי נתונים

### 3.1 חיבור Backend-Dev למסדי נתונים

1. פתח את השירות `KC-MVP-server-dev`
2. לך ל-**"Variables"** → **"Plugins"**
3. לחץ על **"Connect"** ליד `Postgres-dev`
4. לחץ על **"Connect"** ליד `Redis-dev`
5. Railway יוסיף אוטומטית את `DATABASE_URL` ו-`REDIS_URL`

### 3.2 חיבור Backend-Production למסדי נתונים

1. פתח את השירות `KC-MVP-server` (Production)
2. לך ל-**"Variables"** → **"Plugins"**
3. ודא שהוא מחובר ל-`Postgres-production` ו-`Redis-production`
4. **אם הוא מחובר ל-dev, נתק אותו מיד!**

---

## ⚙️ שלב 4: הגדרת משתני סביבה

### 4.1 Backend - Development

פתח את השירות `KC-MVP-server-dev` → **"Variables"**:

```env
# Environment
ENVIRONMENT=development
NODE_ENV=development

# CORS - Development domains only
CORS_ORIGIN=https://dev.karma-community-kc.com,http://localhost:19006,http://localhost:3000

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com

# Security - JWT Secret (שונה מ-Production!)
JWT_SECRET=<generate-new-secret-for-dev>
```

**ליצירת JWT_SECRET חדש:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.2 Backend - Production

פתח את השירות `KC-MVP-server` → **"Variables"**:

```env
# Environment
ENVIRONMENT=production
NODE_ENV=production

# CORS - Production domains only
CORS_ORIGIN=https://karma-community-kc.com,https://www.karma-community-kc.com

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com

# Security - JWT Secret (שונה מ-Development!)
JWT_SECRET=495e8b4123c87ffdc9623ae0db9d8cf2522377627aec8f08051039419cf6ad60
```

### 4.3 Frontend - Development

פתח את השירות `MVP-dev` → **"Variables"**:

```env
# Backend URL - Development
BACKEND_BASE_URL=https://kc-mvp-server-dev.up.railway.app
```

### 4.4 Frontend - Production

פתח את השירות `MVP` → **"Variables"**:

```env
# Backend URL - Production
BACKEND_BASE_URL=https://kc-mvp-server-production.up.railway.app
```

---

## 🌐 שלב 5: הגדרת דומיינים

### 5.1 Development Domain

1. פתח את השירות `MVP-dev`
2. לך ל-**"Settings"** → **"Networking"**
3. לחץ על **"Custom Domain"**
4. הזן: `dev.karma-community-kc.com`
5. בצע את הוראות ה-DNS

### 5.2 Production Domain

1. פתח את השירות `MVP`
2. לך ל-**"Settings"** → **"Networking"**
3. לחץ על **"Custom Domain"**
4. הזן: `karma-community-kc.com` (ו-`www.karma-community-kc.com` אם צריך)

---

## ✅ שלב 6: בדיקה

### 6.1 בדיקת הפרדת סביבות

1. **בדוק את הלוגים** של כל שירות בעת הפעלה:
   ```
   📍 Environment: DEVELOPMENT 🟢 DEVELOPMENT
   💾 Database: ✅ Connected to kc_db_dev@postgres-dev...
   ⚡ Redis: ✅ Connected to redis-dev...
   ```

2. **בדוק CORS:**
   - `https://dev.karma-community-kc.com` → אמור לעבוד רק עם Backend-Dev
   - `https://karma-community-kc.com` → אמור לעבוד רק עם Backend-Production

3. **בדוק מסדי נתונים:**
   - הוסף נתון ב-Dev → לא אמור להופיע ב-Production
   - הוסף נתון ב-Production → לא אמור להופיע ב-Dev

### 6.2 בדיקת חיבורי מסדי נתונים

**Development:**
```bash
# בדוק את DATABASE_URL ב-Railway
# אמור להכיל: postgres-dev או שם דומה
```

**Production:**
```bash
# בדוק את DATABASE_URL ב-Railway
# אמור להכיל: postgres-production או שם דומה
```

---

## ⚠️ אזהרות חשובות

### 🚨 אל תעשה:

1. ❌ **אל תחבר את Production ל-Dev databases!**
2. ❌ **אל תשתמש באותו JWT_SECRET בשתי הסביבות!**
3. ❌ **אל תעשה deploy של קוד Dev ל-Production!**
4. ❌ **אל תשתף משתני סביבה בין הסביבות!**

### ✅ תמיד:

1. ✅ **ודא שכל סביבה מחוברת למסדי נתונים נפרדים**
2. ✅ **בדוק את הלוגים בעת הפעלה - הם יציגו את הסביבה**
3. ✅ **השתמש ב-branches נפרדים: `dev` ל-Development, `main` ל-Production**
4. ✅ **בדוק את ה-CORS_ORIGIN - כל סביבה עם דומיינים שונים**

---

## 🔍 איך לזהות איזו סביבה רצה?

### בלוגים של השרת:

```
📍 Environment: DEVELOPMENT 🟢 DEVELOPMENT
📍 Environment: PRODUCTION 🔴 PRODUCTION
```

### במשתני סביבה:

- `ENVIRONMENT=development` → סביבת פיתוח
- `ENVIRONMENT=production` → סביבת פרודקשן

### במסד נתונים:

- בדוק את `DATABASE_URL` - הוא יכלול את שם ה-Plugin
- Development: `...@postgres-dev...`
- Production: `...@postgres-production...`

---

## 📝 סיכום

לאחר ביצוע כל השלבים, תהיה לך:

| רכיב | Development | Production |
|------|------------|------------|
| **Backend Service** | `KC-MVP-server-dev` | `KC-MVP-server` |
| **Frontend Service** | `MVP-dev` | `MVP` |
| **Postgres** | `Postgres-dev` | `Postgres-production` |
| **Redis** | `Redis-dev` | `Redis-production` |
| **Domain** | `dev.karma-community-kc.com` | `karma-community-kc.com` |
| **CORS** | Dev domains only | Production domains only |
| **JWT_SECRET** | Secret A | Secret B (שונה!) |
| **Branch** | `dev` | `main` |

---

## 🆘 פתרון בעיות

### בעיה: "הנתונים מופיעים בשתי הסביבות"

**פתרון:** ודא שכל שירות מחובר למסד נתונים נפרד. בדוק את `DATABASE_URL` ב-Variables.

### בעיה: "CORS errors"

**פתרון:** ודא ש-`CORS_ORIGIN` מכיל את הדומיין הנכון לכל סביבה.

### בעיה: "לא יודע איזו סביבה רצה"

**פתרון:** בדוק את הלוגים בעת הפעלה - הם יציגו את הסביבה בבירור.

---

**עודכן:** 2025-01-XX
**גרסה:** 1.0.0







