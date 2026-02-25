# תוכניות עתיד – רפקטור מונוריפו

**מטרה:** תיעוד שיפורים עתידיים שלא נכללים בתוכנית הנוכחית. לבצע רק אחרי שהמבנה הבסיסי יציב.

---

## 1. Prisma ORM (נדחה)

**סיבה לדחייה:** המעבר מ-raw `pg` Pool ל-Prisma דורש כתיבת מחדש של כל השכבת גישה לנתונים. זה פרויקט עצמאי.

**מה קיים היום:**
- `pg` Pool עם `PG_POOL` token
- 18 קבצי SQL migration
- `database.init.ts` – 1,326 שורות, הרצת schema על startup
- שאילתות raw SQL עם `pg-format` בכל ה-services

**כשנבצע:**
1. התקנת Prisma: `npm install prisma @prisma/client --workspace @kc/api`
2. המרת `schema.sql` ל-`schema.prisma`
3. יצירת migration ראשוני
4. החלפת `PG_POOL` ב-`PrismaService` בכל service
5. כתיבת מחדש של כל השאילתות ל-Prisma Client API

**הערה:** לשקול `node-pg-migrate` או כלי migration אחר לפני Prisma – כדי להפריד schema creation מ-startup.

---

## 2. Shared Packages (@kc/shared, @kc/logger, @kc/config) – נדחה

**סיבה לדחייה:** הוספת packages חדשים במונוריפו דורשת הגדרת build pipeline ווידוא תאימות ל-API ול-mobile. עדיף קודם לייצב את המבנה.

**@kc/shared (עתידי):**
- Types משותפים: `User`, `ApiResponse<T>`, `AuthMode`, `Role`
- **חשוב:** לוודא ש-`User` תואם למה שקיים ב-userStore (avatar, bio, phone, location, notifications, settings, orgApplicationId, orgName)

**@kc/logger – לא מומלץ:**
- NestJS כבר מספק Logger
- ב-mobile – logger מקומי מספיק
- logger חוצה פלטפורמות מוסיף מורכבות מיותרת

**@kc/config – לא מומלץ:**
- validation של env – רלוונטי רק ל-API
- `validateRequiredEnvVars()` ב-main.ts כבר עושה את העבודה
- אם רוצים – אפשר להעביר ל-ConfigService בתוך ה-API בלבד

---

## 3. database.init.ts – פיצול והפרדה

**מצב נוכחי:** 1,326 שורות, רץ על כל startup.

**שיפורים עתידיים:**
1. **הפרדת migrations** – העברת יצירת schema לכלי migration (למשל `node-pg-migrate`)
2. **הפחתת database.init.ts** – רק בדיקת חיבור ו-health check
3. **הרצת migrations** – כפקודה נפרדת (`npm run migrate`) ולא ב-startup

---

## 4. החלפת process.env ב-ConfigService

**מצב נוכחי:** ~31 קבצים משתמשים ב-`process.env` ישירות.

**שיפור עתידי:**
- יצירת `ConfigService` ב-API (ללא package נפרד)
- הזרקה דרך NestJS DI
- החלפה הדרגתית: קודם קבצים חדשים, אחר כך קיימים

**קבצים עיקריים:** database/, redis/, auth/, main.ts, scripts/

---

## 5. החלפת console.log ב-Logger

**מצב נוכחי:** `console.log`, `console.warn`, `console.error` בכמה services.

**שיפור עתידי:**
- שימוש ב-`Logger` של NestJS (כבר קיים)
- הזרקת Logger ל-services
- החלפה הדרגתית

---

## 6. פיצול userStore (Mobile)

**מצב נוכחי:** 774 שורות, אחריות רבה.

**שיפור עתידי (אחרי Phase 2):**
- `auth.store.ts` – isAuthenticated, authMode, isLoading
- `user.store.ts` – currentUser, setUser, updateUser, clearUser
- `AuthService` – לוגיקת sign-in/sign-out, עדכון stores

---

## 7. פיצול databaseService (Mobile)

**מצב נוכחי:** 1,148 שורות, 3 adapters (REST, Firestore, AsyncStorage).

**שיפורים עתידיים:**
1. **החלטה אסטרטגית:** האם Firestore עדיין נדרש? אם לא – הסרת firestoreAdapter
2. **פיצול לפי domain:** UserDataService, PostDataService, ChatDataService וכו'
3. **הפשטה:** אם REST בלבד – databaseService רק עוטף את apiService

---

## 8. פיצול apiService (Mobile)

**מצב נוכחי:** 1,002 שורות, כל ה-endpoints בקובץ אחד.

**שיפור עתידי:**
- `api/client.ts` – base HTTP client
- `api/endpoints/auth.api.ts`
- `api/endpoints/users.api.ts`
- `api/endpoints/donations.api.ts`
- וכו'

---

## 9. פיצול users.controller (API)

**מצב נוכחי:** 3,472 שורות – קובץ ענק.

**תוכנית נפרדת:** [USERS_CONTROLLER_SPLIT_PLAN.md](./USERS_CONTROLLER_SPLIT_PLAN.md)

---

## 10. Health Module משופר

**מצב נוכחי:** HealthController בסיסי.

**שיפור עתידי:**
- בדיקת חיבור ל-DB
- בדיקת חיבור ל-Redis
- endpoint `/health/ready` ל-Kubernetes/Docker

---

## 11. API Versioning

**שיפור עתידי:** הוספת prefix `/api/v1` לכל ה-routes, הכנה ל-v2.

---

## 12. Swagger/OpenAPI

**שיפור עתידי:** תיעוד API אוטומטי עם @nestjs/swagger.

---

## סדר עדיפויות מומלץ (אחרי Phase 4)

1. פיצול users.controller (כבר מתועד)
2. Health module משופר
3. החלפת process.env ב-ConfigService (API)
4. פיצול userStore (auth + user)
5. פיצול databaseService – אחרי החלטה על Firestore
6. פיצול apiService ל-endpoints
7. Prisma – רק אם יש צורך ברור ב-ORM
