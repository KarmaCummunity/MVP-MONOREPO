# ספר דרישות מערכת - Karma Community

**גרסה:** 1.0  
**תאריך:** 17/02/2026  
**סטטוס:** Draft

---

## תוכן עניינים

1. [מבוא](#מבוא)
2. [ארכיטקטורת המערכת](#ארכיטקטורת-המערכת)
3. [דרישות פונקציונליות](#דרישות-פונקציונליות)
4. [ניהול משתמשים ואימות](#ניהול-משתמשים-ואימות)
5. [מודול תרומות ומתנות](#מודול-תרומות-ומתנות)
6. [מודול נסיעות משותפות](#מודול-נסיעות-משותפות)
7. [מודול משימות וניהול פרויקטים](#מודול-משימות-וניהול-פרויקטים)
8. [מודול אתגרים קהילתיים](#מודול-אתגרים-קהילתיים)
9. [מודול פוסטים ו-Feed](#מודול-פוסטים-ו-feed)
10. [מודול צ'אט והודעות](#מודול-צאט-והודעות)
11. [מודול התראות](#מודול-התראות)
12. [מודול ניהול מנהלים](#מודול-ניהול-מנהלים)
13. [מודול סטטיסטיקות ואנליטיקה](#מודול-סטטיסטיקות-ואנליטיקה)
14. [דרישות אבטחה](#דרישות-אבטחה)
15. [דרישות ביצועים](#דרישות-ביצועים)
16. [דרישות UI/UX](#דרישות-ui-ux)
17. [אינטגרציות חיצוניות](#אינטגרציות-חיצוניות)

---

## מבוא

### תיאור המערכת
**Karma Community** היא פלטפורמת קהילה חברתית המקשרת בין אנשים לצורך תרומות, שיתופי פעולה ועזרה הדדית. המערכת מאפשרת למשתמשים לתרום זמן, כסף, פריטים ושירותים, לנהל משימות קבוצתיות, להשתתף באתגרים קהילתיים ולתקשר בצורה ישירה.

### מטרות המערכת
- יצירת קהילה חברתית מחוברת המבוססת על עזרה הדדית וקרמה
- איפשור תרומות מגוונות: כסף, פריטים, שירותים, זמן, ידע ונסיעות
- ניהול משימות ופרויקטים בצורה קבוצתית
- מעקב אחר תרומות אישיות וקבוצתיות
- יצירת מעורבות קהילתית דרך אתגרים ופעילויות

### היקף המערכת
- **פלטפורמות נתמכות:** Web (React Native Web), iOS (Expo), Android (Expo)
- **שפות תמיכה:** עברית (RTL), אנגלית (LTR)
- **סביבות פריסה:**
  - **Production (main):** karma-community-kc.com
  - **Development (dev):** dev.karma-community-kc.com

---

## ארכיטקטורת המערכת

### סטאק טכנולוגי

#### Backend (Server)
- **Framework:** NestJS 10.x
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.4+
- **Database:** PostgreSQL 14+ (with UUID extension, pg_trgm for full-text search)
- **Cache:** Redis 5+ (via ioredis)
- **Authentication:** 
  - Firebase Admin SDK 12.7
  - Google OAuth 2.0 (google-auth-library)
  - JWT tokens (custom implementation)
  - Argon2 password hashing
- **Security:**
  - Helmet.js for HTTP headers
  - CORS configuration
  - Rate limiting (NestJS Throttler)
  - Input validation (class-validator, class-transformer)

#### Frontend (Client)
- **Framework:** React Native 0.80 + Expo SDK 53
- **Language:** TypeScript 5.8
- **Navigation:** React Navigation 7
- **State Management:** Zustand 5.0
- **HTTP Client:** Axios 1.13
- **UI Components:**
  - React Native core components
  - Expo vector icons
  - Custom component library
- **Animations:** React Native Reanimated 3.19
- **Graphics:** Shopify React Native Skia 2.0
- **Localization:** i18next 25.3 + react-i18next 15.6

### מבנה בסיס הנתונים

#### טבלאות עיקריות

1. **user_profiles** - משתמשים
   - UUID primary key
   - Firebase UID + Google ID for authentication
   - Profile information, roles, settings
   - Hierarchy (parent_manager_id)
   - Salary and seniority tracking

2. **organizations** - ארגונים
   - Organization management
   - Verification status
   - Creator tracking

3. **donations** - תרומות
   - Multiple types: money, item, service, time, trump
   - Category linkage
   - Status tracking
   - Location and metadata

4. **rides** - נסיעות משותפות
   - Driver and passenger management
   - Location-based (from/to with coordinates)
   - Seat availability tracking

5. **tasks** - משימות
   - Hierarchical tasks (parent-child)
   - Multiple assignees
   - Status, priority, category
   - Time tracking integration

6. **posts** - פוסטים
   - Generic post system
   - Links to tasks, rides, items
   - Like and comment counts
   - Author tracking

7. **chat_conversations** - שיחות
   - Direct and group chats
   - Participant array (UUID[])
   - Last message tracking

8. **chat_messages** - הודעות
   - Multiple message types (text, image, file, voice, location)
   - Reply-to support
   - Edit/delete tracking

9. **challenges** - אתגרים אישיים (מנהלים)
10. **community_group_challenges** - אתגרים קהילתיים
11. **items** - פריטים לתרומה
12. **community_members** - חברי קהילה (רשומות ניהוליות)
13. **admin_tables** - טבלאות דינמיות למנהלים
14. **manager_volunteer_invitations** - הזמנות שיוך מתנדבים

#### קשרים בין טבלאות
- Foreign keys עם ON DELETE CASCADE/SET NULL
- GIN indexes for arrays and JSONB fields
- Full-text search indexes (pg_trgm)
- Automatic triggers for updated_at timestamps

### תשתית Cloud

#### Deployment
- **Platform:** Railway.app
- **Database:** PostgreSQL managed instance
- **Redis:** Redis managed instance
- **Storage:** Firebase Storage (for images/files)
- **CI/CD:** GitHub Actions (implied by .github folder)

#### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `FIREBASE_*` - Firebase configuration
- `NODE_ENV` - Environment (development/production)

---

## דרישות פונקציונליות

### FR-001: ניהול משתמשים ואימות

#### FR-001.1: רישום משתמשים
- **תיאור:** המערכת תאפשר למשתמשים חדשים להירשם בשלוש דרכים
- **שיטות רישום:**
  1. **Google OAuth:**
     - התחברות באמצעות חשבון Google
     - אימות token בצד שרת
     - בדיקת email verified
     - יצירת UUID ייחודי למשתמש
     - שמירת Google ID ו-Firebase UID נפרדים
  2. **Email/Password:**
     - הזנת email ו-password (מינימום 6 תווים)
     - האשינג של הסיסמה באמצעות Argon2
     - אימות תקינות email
     - שליחת email verification (תכנון עתידי)
  3. **Guest Mode:**
     - כניסה ללא רישום
     - גישה מוגבלת לתכונות
     - ללא שמירת נתונים לטווח ארוך

#### FR-001.2: התחברות
- **תיאור:** משתמשים רשומים יוכלו להתחבר למערכת
- **שיטות התחברות:**
  1. Email/Password - אימות מול hash בבסיס הנתונים
  2. Google OAuth - אימות token ושחזור/יצירת משתמש
  3. Firebase Auth State - שחזור session אוטומטי

#### FR-001.3: ניהול Session
- **JWT Tokens:**
  - Access Token (תוקף קצר - 15 דקות)
  - Refresh Token (תוקף ארוך - 7 ימים)
  - רענון אוטומטי של Access Token
  - אחסון מאובטח ב-AsyncStorage (mobile) / LocalStorage (web)
- **Firebase Auth State Listener:**
  - עדכון אוטומטי של מצב המשתמש
  - סנכרון עם backend

#### FR-001.4: ניהול פרופיל
- **תיאור:** משתמשים יוכלו לנהל את הפרופיל האישי שלהם
- **שדות הפרופיל:**
  - שם מלא
  - תמונת פרופיל
  - ביוגרפיה (bio)
  - מיקום (עיר, מדינה)
  - תחומי עניין (tags)
  - מספר טלפון
  - הגדרות (שפה, Dark mode, התראות, פרטיות)
- **פעולות:**
  - עריכת פרופיל
  - העלאת תמונת פרופיל
  - צפייה בפרופילים של משתמשים אחרים
  - עדכון הגדרות

#### FR-001.5: מערכת הרשאות (Roles)
- **תיאור:** המערכת תתמוך בהיררכיית הרשאות מורכבת
- **תפקידים:**
  1. **user** - משתמש רגיל (ללא הרשאות ניהול)
  2. **volunteer** - מתנדב (user שמשויך למנהל)
  3. **admin** - מנהל מתנדבים בקהילה (user שיש תחתיו מתנדבים)
  4. **org_admin** - מנהל ארגון (user של ארגון)
  5. **super_admin** - מנהל ראשי של כל האפליקציה
  
- **הרשאות לפי תפקיד:**
  - `user`: גישה בסיסית לכל תכונות המשתמש, אין הרשאות ניהול
  - `volunteer`: כמו user + משויך למנהל, יכול לבטל את השיוך בכל רגע
  - `admin`: כמו user + ניהול מתנדבים (שיוך/ביטול שיוך), צפייה בפעילות המתנדבים שלו
  - `org_admin`: ניהול ארגון, אישור בקשות, ניהול חברי ארגון
  - `super_admin`: גישה מלאה לכל ממשקי הניהול, סטטיסטיקות, משתמשים, מבנה היררכי גלובלי

#### FR-001.6: היררכיית ניהול
- **תיאור:** תמיכה במבנה ניהולי היררכי עם אילוצים מחמירים
- **מאפיינים:**
  - `parent_manager_id` - מנהל ישיר (UUID של המנהל)
  - היררכיה ללא מעגלים (Acyclic Directed Graph)
  - כל מתנדב יכול להיות משויך למנהל אחד בלבד בכל זמן נתון
  - מעקב אחר שכר וותק (salary, seniority_start_date)
  - הצגת עץ היררכי במסך ניהול

- **כללי שיוך:**
  1. **שיוך מתנדב למנהל:**
     - רק `admin` או `super_admin` יכולים לשייך user למנהל
     - התהליך דו-שלבי:
       - המנהל שולח בקשת שיוך (invitation)
       - היוזר חייב לאשר את השיוך (accept invitation)
     - לאחר האישור, היוזר מקבל role = 'volunteer' (בנוסף ל-'user')
     - ה-`parent_manager_id` מתעדכן ל-UUID של המנהל
  
  2. **ביטול שיוך:**
     - **המתנדב עצמו** יכול לבטל את השיוך בכל רגע (self-unassign)
     - **המנהל הישיר** יכול לבטל את השיוך של המתנדב שלו
     - **מנהל בכיר** (מנהל של המנהל) יכול לבטל שיוך של מתנדב למנהל זוטר
     - **super_admin** יכול לבטל כל שיוך
     - בביטול שיוך:
       - `parent_manager_id` = NULL
       - role 'volunteer' מוסר מה-roles array
  
  3. **מניעת מעגלים (Cycle Prevention):**
     - בעת שיוך, המערכת בודקת שאין מעגל:
       - A לא יכול להיות מנהל של B אם B הוא מנהל (ישיר או עקיף) של A
     - אלגוריתם: מעבר רקורסיבי על כל שרשרת ההיררכיה למעלה
     - דוגמה:
       ```
       A (manager) → B (volunteer)
       B (manager) → C (volunteer)
       ❌ אסור: C (manager) → A (יוצר מעגל)
       ```
  
  4. **מגבלות:**
     - מתנדב (volunteer) לא יכול להיות מנהל (admin) של מתנדבים אחרים - **אלא אם יש אישור מיוחד**
     - אם מתנדב רוצה להיות מנהל, `super_admin` חייב לאשר ולקדם אותו ל-`admin`
     - מנהל יכול להיות גם מתנדב (יכול להיות `admin` ו-`volunteer` בו זמנית)

- **מבנה נתונים:**
  ```typescript
  // user_profiles table
  {
    id: UUID,
    roles: ['user', 'volunteer', 'admin', 'org_admin', 'super_admin'],
    parent_manager_id: UUID | null, // מנהל ישיר
    manager_since: TIMESTAMPTZ, // מתי נעשה מנהל
    volunteer_since: TIMESTAMPTZ, // מתי נעשה מתנדב
    salary: DECIMAL, // שכר (למנהלים)
    seniority_start_date: DATE // תאריך התחלת ותק
  }
  
  // manager_volunteer_invitations (טבלה חדשה)
  {
    id: UUID,
    manager_id: UUID, // המנהל ששולח את ההזמנה
    user_id: UUID, // היוזר שמוזמן להיות מתנדב
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled',
    created_at: TIMESTAMPTZ,
    responded_at: TIMESTAMPTZ
  }
  ```

- **Endpoints נדרשים:**
  - `POST /api/managers/invite-volunteer` - שליחת הזמנה למתנדב (admin/super_admin)
  - `POST /api/volunteers/accept-invitation/:id` - אישור הזמנה (user)
  - `POST /api/volunteers/reject-invitation/:id` - דחיית הזמנה (user)
  - `DELETE /api/volunteers/unassign` - ביטול שיוך עצמי (volunteer)
  - `DELETE /api/managers/:managerId/volunteers/:volunteerId` - ביטול שיוך (manager/super_admin)
  - `GET /api/managers/my-volunteers` - רשימת המתנדבים שלי (admin)
  - `GET /api/hierarchy/tree` - עץ היררכי מלא (super_admin)
  - `GET /api/hierarchy/validate-assignment` - בדיקת תקינות שיוך (למניעת מעגלים)

#### FR-001.7: מעקב אחר פעילות
- **תיאור:** המערכת תתעד פעילות משתמשים
- **נתונים נשמרים:**
  - last_active - זמן פעילות אחרון
  - user_activities - לוג פעולות (login, donation, chat, view_category)
  - IP address + User agent (לצורכי אבטחה)

#### FR-001.7: תהליך הזמנות מתנדבים (Volunteer Invitations)
- **תיאור:** תהליך דו-שלבי לשיוך מתנדב למנהל
- **טבלה:** `manager_volunteer_invitations`
- **שדות:**
  - `id` (UUID) - מזהה ההזמנה
  - `manager_id` (UUID) - המנהל ששולח את ההזמנה
  - `user_id` (UUID) - היוזר שמוזמן
  - `status` - מצב ההזמנה
  - `message` (TEXT) - הודעה אישית מהמנהל (אופציונלי)
  - `created_at` - תאריך יצירה
  - `responded_at` - תאריך תגובה
  - `expires_at` - תאריך תפוגה (14 ימים מיצירה)

- **סטטוסים:**
  - `pending` - ממתינה לתגובה
  - `accepted` - אושרה על ידי היוזר
  - `rejected` - נדחתה על ידי היוזר
  - `cancelled` - בוטלה על ידי המנהל
  - `expired` - פגה תוקף (14 ימים ללא תגובה)

- **תהליך:**
  1. **שליחת הזמנה (admin/super_admin):**
     - `POST /api/managers/invite-volunteer`
     - Body: `{ userId: UUID, message?: string }`
     - Validations:
       - המנהל חייב להיות admin/super_admin
       - היוזר לא יכול להיות כבר מתנדב של מנהל אחר
       - לא קיימת הזמנה pending אחרת מאותו מנהל לאותו יוזר
     - יוצר רשומה ב-`manager_volunteer_invitations`
     - שולח התראה ליוזר (notification)
  
  2. **צפייה בהזמנות (user):**
     - `GET /api/volunteers/my-invitations`
     - מחזיר רשימת הזמנות pending
     - הצגה ב-UI: מודאל/מסך עם פרטי המנהל + הודעה
  
  3. **אישור הזמנה (user):**
     - `POST /api/volunteers/accept-invitation/:invitationId`
     - עדכון `status = 'accepted'`, `responded_at = NOW()`
     - עדכון `user_profiles`:
       - הוספת role 'volunteer' ל-`roles` array
       - עדכון `parent_manager_id = manager_id`
       - עדכון `volunteer_since = NOW()`
     - שליחת התראה למנהל
     - ביטול אוטומטי של כל ההזמנות האחרות (pending) לאותו יוזר
  
  4. **דחיית הזמנה (user):**
     - `POST /api/volunteers/reject-invitation/:invitationId`
     - עדכון `status = 'rejected'`, `responded_at = NOW()`
     - שליחת התראה למנהל
  
  5. **ביטול הזמנה (manager):**
     - `DELETE /api/managers/invitations/:invitationId`
     - רק אם `status = 'pending'`
     - עדכון `status = 'cancelled'`
     - שליחת התראה ליוזר

- **תפוגה אוטומטית:**
  - Cron job יומי: מסמן `status = 'expired'` להזמנות שעברו 14 ימים במצב pending
  - התראה ליוזר על הזמנה שפגה

- **UI/UX:**
  - Badge על אייקון התראות עם מספר הזמנות pending
  - מודאל מיוחד להזמנות: "👤 [שם המנהל] מזמין אותך להיות מתנדב"
  - כפתורים: "קבל הזמנה" / "דחה"

#### FR-001.8: ביטול שיוך מתנדב
- **תיאור:** תהליך ביטול קשר בין מתנדב למנהל
- **מי יכול לבטל:**
  1. **המתנדב עצמו** - `DELETE /api/volunteers/unassign`
  2. **המנהל הישיר** - `DELETE /api/managers/my-volunteers/:volunteerId`
  3. **מנהל בכיר** - `DELETE /api/managers/:managerId/volunteers/:volunteerId`
     - רק אם `managerId` הוא מנהל זוטר תחת המנהל הבכיר
  4. **super_admin** - `DELETE /api/managers/:managerId/volunteers/:volunteerId`
     - ללא הגבלות

- **תהליך ביטול:**
  1. Validations:
     - בדיקת הרשאות (כנ"ל)
     - המתנדב באמת משויך למנהל זה
  2. עדכון `user_profiles`:
     - `parent_manager_id = NULL`
     - הסרת role 'volunteer' מ-`roles` array
     - `volunteer_since = NULL`
  3. שליחת התראות:
     - למתנדב (אם לא הוא שביטל)
     - למנהל (אם לא הוא שביטל)
  4. רישום ב-`user_activities`:
     - `activity_type = 'volunteer_unassigned'`
     - `activity_data = { manager_id, volunteer_id, unassigned_by }`

- **UI:**
  - כפתור "בטל שיוך" במסך המתנדב (למתנדב עצמו)
  - כפתור "הסר מתנדב" במסך ניהול המתנדבים (למנהל)
  - Modal אישור: "האם אתה בטוח שברצונך לבטל את השיוך?"

---

### FR-002: מודול תרומות ומתנות

#### FR-002.1: קטגוריות תרומות
- **תיאור:** המערכת תתמוך ב-33 קטגוריות תרומות
- **קטגוריות עיקריות:**
  1. כסף (Money)
  2. פריטים (Items)
  3. זמן (Time/Volunteering)
  4. ידע (Knowledge)
  5. טרמפים (Trump/Rides)
  
- **קטגוריות נוספות:**
  - אוכל (Food)
  - בגדים (Clothes)
  - ספרים (Books)
  - רהיטים (Furniture)
  - ציוד רפואי (Medical)
  - בעלי חיים (Animals)
  - דיור (Housing)
  - תמיכה רגשית (Support)
  - חינוך (Education)
  - איכות הסביבה (Environment)
  - טכנולוגיה (Technology)
  - מוזיקה (Music)
  - משחקים (Games)
  - חידות (Riddles)
  - מתכונים (Recipes)
  - צמחים (Plants)
  - פסולת (Waste)
  - אמנות (Art)
  - ספורט (Sports)
  - חלומות (Dreams)
  - פוריות (Fertility)
  - משרות (Jobs)
  - שידוכים (Matchmaking)
  - בריאות נפשית (Mental Health)
  - גיל הזהב (Golden Age)
  - שפות (Languages)
  - אתגרים קהילתיים (Community Challenges)

#### FR-002.2: יצירת תרומה
- **תיאור:** משתמשים יוכלו ליצור תרומות חדשות
- **שדות חובה:**
  - כותרת (title)
  - תיאור (description)
  - קטגוריה (category_id)
  - סוג (type: money/item/service/time/trump)
- **שדות אופציונליים:**
  - סכום (amount) - לתרומות כסף
  - מטבע (currency) - ברירת מחדל ILS
  - מיקום (location: city, address, coordinates)
  - תמונות (images[])
  - תגיות (tags[])
  - תאריך תפוגה (expires_at)
  - מטא-דאטה (metadata) - נתונים ספציפיים לקטגוריה
- **סטטוסים:**
  - active - פעילה
  - completed - הושלמה
  - cancelled - בוטלה
  - expired - פגה תוקף

#### FR-002.3: חיפוש ועיון בתרומות
- **תיאור:** משתמשים יוכלו לחפש ולעיין בתרומות
- **אפשרויות חיפוש:**
  - לפי קטגוריה
  - לפי מיקום (עיר)
  - לפי תגיות
  - חיפוש חופשי בכותרת/תיאור (full-text search)
  - סינון לפי סטטוס
- **תצוגה:**
  - רשימה (List view)
  - גריד (Grid view 1-3 columns)
  - מיון: תאריך, פופולריות, קרבה

#### FR-002.4: מעקב אחר תרומות
- **תיאור:** המערכת תעקוב אחר תרומות משתמשים
- **נתונים נשמרים:**
  - total_donations_amount - סה"כ תרומות כסף
  - total_volunteer_hours - סה"כ שעות התנדבות
  - karma_points - נקודות קרמה (מבוסס תרומות)
- **סטטיסטיקות:**
  - תרומות לפי קטגוריה
  - תרומות לפי תקופה
  - השוואה קהילתית

---

### FR-003: מודול פריטים לתרומה

#### FR-003.1: ניהול פריטים
- **תיאור:** מערכת ייעודית לניהול פריטים פיזיים לתרומה
- **מאפייני פריט:**
  - כותרת (title)
  - תיאור (description)
  - קטגוריה (category: furniture, clothes, electronics, general)
  - מצב (condition: new, like_new, used, for_parts)
  - מיקום (city, address, coordinates)
  - מחיר (price: 0 = חינם)
  - תמונה (image_base64)
  - דירוג (rating)
  - תגיות (tags)
  - כמות (quantity)
  - סטטוס (status: available, reserved, delivered, expired, cancelled)
  - שיטת מסירה (delivery_method: pickup, delivery, shipping)

#### FR-003.2: חיפוש פריטים
- **תיאור:** חיפוש מתקדם לפריטים
- **אפשרויות:**
  - חיפוש לפי כותרת/תיאור (pg_trgm)
  - סינון לפי קטגוריה
  - סינון לפי מצב
  - סינון לפי מיקום
  - סינון לפי מחיר
  - סינון לפי תגיות

#### FR-003.3: בקשות למסירת פריטים
- **תיאור:** מערכת לניהול בקשות למסירת פריטים
- **תהליך:**
  1. משתמש מבקש פריט (item_request)
  2. הבעלים מאשר/דוחה
  3. תיאום זמן ומיקום מסירה
  4. סימון כהושלם
- **סטטוסים:**
  - pending - ממתינה
  - approved - אושרה
  - rejected - נדחתה
  - scheduled - מתוזמנת
  - completed - הושלמה
  - cancelled - בוטלה
- **נתונים:**
  - הודעה מהמבקש (message)
  - זמן מוצע (proposed_time)
  - שיטת מסירה (delivery_method)
  - מיקום פגישה (meeting_location)
  - תגובת הבעלים (owner_response)

#### FR-003.4: פוסטים למסירת פריטים
- **תיאור:** יצירת פוסטים אוטומטיים למסירת פריטים
- **טריגרים:**
  - כאשר פריט נמסר (status = delivered) → יצירת post מסוג item_delivered
- **תוכן הפוסט:**
  - פרטי הפריט
  - המוסר והמקבל
  - תמונות
  - מיקום

---

### FR-004: מודול נסיעות משותפות (טרמפים)

#### FR-004.1: יצירת נסיעה
- **תיאור:** משתמשים יוכלו להציע נסיעות משותפות
- **שדות חובה:**
  - כותרת (title)
  - מוצא (from_location: name, city, coordinates)
  - יעד (to_location: name, city, coordinates)
  - זמן יציאה (departure_time)
  - מספר מקומות פנויים (available_seats)
- **שדות אופציונליים:**
  - זמן הגעה משוער (arrival_time)
  - מחיר למקום (price_per_seat)
  - תיאור (description)
  - דרישות (requirements: עישון, חיות מחמד וכו')
- **סטטוסים:**
  - active - פעילה
  - full - מלאה
  - cancelled - בוטלה
  - completed - הושלמה

#### FR-004.2: הזמנת מקום בנסיעה
- **תיאור:** נוסעים יוכלו להזמין מקומות בנסיעות
- **תהליך:**
  1. בחירת נסיעה
  2. מספר מקומות מבוקש (seats_requested)
  3. הודעה לנהג (message - אופציונלי)
  4. ממתין לאישור נהג
- **סטטוסים:**
  - pending - ממתינה לאישור
  - approved - אושרה
  - rejected - נדחתה
  - cancelled - בוטלה
- **אילוצים:**
  - UNIQUE(ride_id, passenger_id) - נוסע יכול להזמין פעם אחת לנסיעה

#### FR-004.3: ניהול נסיעות
- **פעולות נהג:**
  - עדכון פרטי נסיעה
  - אישור/דחיית בקשות
  - ביטול נסיעה
  - סימון נסיעה כהושלמה
- **פעולות נוסע:**
  - צפייה בנסיעות שהזמנתי
  - ביטול הזמנה
  - דירוג נהג (תכנון עתידי)

#### FR-004.4: חיפוש נסיעות
- **תיאור:** חיפוש מתקדם לנסיעות
- **אפשרויות:**
  - לפי מוצא (GIN index on from_location)
  - לפי יעד (GIN index on to_location)
  - לפי תאריך יציאה
  - לפי מספר מקומות פנויים
  - מיון לפי: תאריך, מחיר, מקומות פנויים

#### FR-004.5: פוסטים לנסיעות
- **תיאור:** יצירת פוסטים אוטומטיים לנסיעות
- **טריגרים:**
  - נסיעה חדשה → post מסוג ride_offered
  - נסיעה הושלמה → post מסוג ride_completed
- **תוכן:**
  - פרטי הנסיעה
  - נהג ונוסעים
  - מסלול

---

### FR-005: מודול משימות וניהול פרויקטים

#### FR-005.1: יצירת משימות
- **תיאור:** מנהלים יוכלו ליצור משימות לצוות
- **שדות חובה:**
  - כותרת (title)
  - תיאור (description)
  - סטטוס (status)
  - עדיפות (priority)
- **שדות אופציונליים:**
  - קטגוריה (category: development, marketing, operations, etc.)
  - תאריך יעד (due_date)
  - מבצעים (assignees: UUID[])
  - תגיות (tags: TEXT[])
  - checklist (JSONB: [{id, text, done}])
  - משימת אב (parent_task_id) - למשימות משנה
  - שעות משוערות (estimated_hours)

#### FR-005.2: סטטוסים ועדכון משימות
- **סטטוסים אפשריים:**
  - open - פתוחה
  - in_progress - בביצוע
  - stuck - תקועה
  - testing - בבדיקה
  - done - הושלמה
  - archived - בארכיון
- **עדיפויות:**
  - low - נמוכה
  - medium - בינונית
  - high - גבוהה
- **פעולות:**
  - עדכון סטטוס
  - הוספה/הסרה של מבצעים
  - עדכון checklist
  - עדכון תאריכים ועדיפות

#### FR-005.3: היררכיית משימות
- **תיאור:** תמיכה במשימות משנה (subtasks)
- **מאפיינים:**
  - parent_task_id - קישור למשימת אב
  - ON DELETE CASCADE - מחיקת אב מוחקת ילדים
  - הצגה היררכית בממשק

#### FR-005.4: מעקב שעות עבודה
- **תיאור:** רישום שעות עבודה בפועל למשימות
- **טבלה:** task_time_logs
- **שדות:**
  - task_id
  - user_id
  - actual_hours (חייב להיות > 0)
  - logged_at
- **אילוצים:**
  - UNIQUE(task_id, user_id) - משתמש יכול לרשום שעות פעם אחת למשימה
- **שימושים:**
  - השוואה בין estimated_hours ל-actual_hours
  - דוחות זמן למנהלים
  - חישוב שכר (integration עם salary)

#### FR-005.5: פוסטים למשימות
- **תיאור:** יצירת פוסטים אוטומטיים למשימות
- **טריגרים:**
  - משימה הוקצתה → post מסוג task_assignment
  - משימה הושלמה → post מסוג task_completion
- **תוכן:**
  - פרטי המשימה
  - מבצעים
  - סטטוס

---

### FR-006: מודול אתגרים

#### FR-006.1: אתגרים אישיים (Challenges)
- **תיאור:** מערכת למעקב אחר אתגרים אישיים למנהלים
- **טבלה:** challenges
- **שימושים:**
  - טיימרים
  - מעקב הרגלים יומיים
  - יעדים אישיים

#### FR-006.2: אתגרים קהילתיים (Community Group Challenges)
- **תיאור:** אתגרים קבוצתיים לכל הקהילה
- **טבלה:** community_group_challenges
- **מאפיינים:**
  - כותרת ותיאור
  - תאריך התחלה וסיום
  - משתתפים
  - מטרות (goals)
  - התקדמות (progress tracking)
- **ממשקים:**
  - רשימת אתגרים פעילים
  - הצטרפות לאתגר
  - מעקב אחר התקדמות
  - סטטיסטיקות אתגר

#### FR-006.3: מעקב הרגלים יומיים
- **תיאור:** מערכת למעקב יומי אחר הרגלים
- **קומפוננטות:**
  - `HabitsTrackerTable` - טבלה שבועית/חודשית
  - `HabitsTrackerCell` - תא בודד (יום + הרגל)
  - `DailyHabitsQuickView` - תצוגה מהירה של היום
  - `HabitsStatsCard` - כרטיס סטטיסטיקות
- **פעולות:**
  - סימון הרגל כהושלם
  - עדכון רשומות (EditEntryModal)
  - צפייה בהיסטוריה

#### FR-006.4: מסכי ניהול אתגרים
- **מסכים:**
  - `MyChallengesScreen` - אתגרים שאני משתתף בהם
  - `MyCreatedChallengesScreen` - אתגרים שיצרתי
  - `ChallengeDetailsScreen` - פרטי אתגר + משתתפים
  - `ChallengeStatisticsScreen` - סטטיסטיקות מפורטות
  - `CommunityChallengesScreen` - אתגרים קהילתיים פעילים

---

### FR-007: מודול פוסטים ו-Feed

#### FR-007.1: סוגי פוסטים
- **תיאור:** המערכת תתמוך במגוון סוגי פוסטים
- **סוגים:**
  - `general_update` - עדכון כללי
  - `task_completion` - משימה הושלמה
  - `task_assignment` - משימה הוקצתה
  - `donation` - תרומה
  - `ride_offered` - נסיעה הוצעה
  - `ride_completed` - נסיעה הושלמה
  - `item_delivered` - פריט נמסר
  - `challenge_update` - עדכון אתגר

#### FR-007.2: יצירת פוסטים
- **שדות:**
  - כותרת (title)
  - תיאור (description)
  - תמונות (images: TEXT[])
  - סוג פוסט (post_type)
  - קישורים לישויות: task_id, ride_id, item_id
  - מטא-דאטה (metadata: JSONB)
- **פעולות:**
  - יצירה ידנית
  - יצירה אוטומטית (triggers)
  - עריכה (EditPostModal)
  - מחיקה (רק למחבר)

#### FR-007.3: לייקים ותגובות
- **Likes:**
  - טבלה: post_likes
  - UNIQUE(post_id, user_id)
  - עדכון אוטומטי של likes counter בטבלת posts (trigger)
  - הצגת מספר לייקים
  - אייקון מודגש אם המשתמש לייק
  
- **Comments:**
  - טבלה: post_comments
  - שדות: text (1-2000 תווים), user_id, likes_count
  - עדכון אוטומטי של comments counter (trigger)
  - לייקים לתגובות (comment_likes)
  - עריכה/מחיקה של תגובות (רק למחבר)
  - CommentsModal להצגה והוספה

#### FR-007.4: Feed Display
- **תצוגות:**
  - List View - רשימה אנכית
  - Grid View - גריד של 1-3 עמודות
  - Reels Mode - גלילה אנכית בפוסטים
- **מצבי Feed:**
  - Friends - פוסטים של אנשים שאני עוקב אחריהם
  - Discovery - פוסטים פופולריים/חדשים מכל הקהילה
- **תכונות:**
  - Pull-to-refresh
  - Infinite scroll (pagination)
  - סינון לפי סוג פוסט
  - מיון (חדש → ישן, פופולרי)

#### FR-007.5: אינטראקציות בפוסטים
- **פעולות:**
  - לייק/ביטול לייק
  - תגובה
  - שיתוף (תכנון עתידי)
  - דיווח (ReportPostModal)
  - הסתרה (Hide post)
  - מחיקה (רק מחבר/מנהל)
  - עריכה (רק מחבר)
- **תפריט אפשרויות (OptionsModal):**
  - עריכה
  - מחיקה
  - דיווח
  - הסתרה
  - העתקת קישור

#### FR-007.6: כרטיסי פוסט (Post Cards)
- **תיאור:** כל סוג פוסט מוצג בעיצוב ייעודי
- **קומפוננטות:**
  - `RegularItemCard` - פוסט רגיל
  - `DonationItemCard` - פוסט תרומה
  - `ItemDeliveredCard` - פריט נמסר
  - `TaskCompletionCard` - משימה הושלמה
  - `TaskAssignmentCard` - משימה הוקצתה
  - `RideCompletedCard` - נסיעה הושלמה
  - `RideOfferedCard` - נסיעה מוצעת
- **מאפיינים משותפים:**
  - תמונת מחבר + שם
  - תמונות הפוסט
  - כפתורי like/comment/share
  - תאריך
  - תיאור

---

### FR-008: מודול צ'אט והודעות

#### FR-008.1: שיחות (Conversations)
- **תיאור:** ניהול שיחות בין משתמשים
- **סוגי שיחות:**
  - direct - שיחה ישירה (2 משתתפים)
  - group - קבוצה (3+ משתתפים)
- **שדות:**
  - כותרת (title) - אופציונלי, לקבוצות
  - משתתפים (participants: UUID[])
  - יוצר (created_by)
  - הודעה אחרונה (last_message_id, last_message_at)
- **פעולות:**
  - יצירת שיחה חדשה
  - הוספת משתתפים (קבוצות)
  - הסרת משתתפים (קבוצות)
  - מחיקת שיחה

#### FR-008.2: הודעות (Messages)
- **סוגי הודעות:**
  - text - טקסט
  - image - תמונה
  - file - קובץ
  - voice - הודעה קולית
  - location - מיקום
  - donation - קישור לתרומה
- **שדות:**
  - תוכן (content) - לטקסט
  - קובץ (file_url, file_name, file_size, file_type)
  - מטא-דאטה (metadata) - למיקום, תרומה וכו'
  - תגובה להודעה (reply_to_id)
  - עריכה (is_edited, edited_at)
  - מחיקה (is_deleted, deleted_at)
- **פעולות:**
  - שליחת הודעה
  - עריכת הודעה
  - מחיקת הודעה
  - תשובה להודעה
  - העלאת קבצים (image/video/document)

#### FR-008.3: אישורי קריאה (Read Receipts)
- **תיאור:** מעקב אחר הודעות שנקראו
- **טבלה:** message_read_receipts
- **שדות:**
  - message_id
  - user_id
  - read_at
- **אילוצים:**
  - UNIQUE(message_id, user_id)
- **תכונות:**
  - סימון אוטומטי כנקרא בכניסה לצ'אט
  - הצגת "נקרא" בהודעות
  - ספירת הודעות שלא נקראו

#### FR-008.4: עדכונים בזמן אמת
- **תיאור:** עדכון אוטומטי של צ'אטים
- **מנגנונים:**
  - Firestore Listeners (אם זמין)
  - Polling (fallback) - כל X שניות
- **Subscriptions:**
  - `subscribeToMessages(conversationId)` - עדכוני הודעות בשיחה
  - `subscribeToConversations()` - עדכוני רשימת שיחות
- **עדכונים:**
  - הודעה חדשה → הוספה לרשימה
  - הודעה נערכה → עדכון
  - הודעה נמחקה → סימון/הסרה
  - שיחה חדשה → הוספה לרשימה

#### FR-008.5: ממשק משתמש
- **מסכים:**
  - `ChatListScreen` - רשימת שיחות
  - `ChatDetailScreen` - שיחה פרטנית
  - `NewChatScreen` - יצירת שיחה חדשה
- **קומפוננטות:**
  - `ChatListItem` - פריט ברשימת שיחות
  - `ChatMessageBubble` - בועת הודעה
- **תכונות UI:**
  - Badge עם מספר הודעות שלא נקראו
  - הצגת הודעה אחרונה
  - הצגת זמן יחסי
  - הדגשת הודעות שלא נקראו
  - אינדיקציה של "מקליד..."

#### FR-008.6: העלאת קבצים בצ'אט
- **סוגי קבצים:**
  - תמונות (JPEG, PNG, GIF, WebP)
  - סרטונים (MP4, WebM)
  - מסמכים (PDF, DOC, XLS, etc.)
- **תהליך:**
  1. בחירת קובץ (expo-image-picker / expo-document-picker)
  2. וולידציה (גודל, סוג)
  3. העלאה ל-Firebase Storage עם progress
  4. שמירת URL בהודעה
- **מגבלות:**
  - תמונות: עד 10MB
  - סרטונים: עד 50MB
  - מסמכים: עד 20MB

---

### FR-009: מודול התראות

#### FR-009.1: סוגי התראות
- **תיאור:** המערכת תשלח התראות למשתמשים
- **סוגים:**
  - `message` - הודעה חדשה בצ'אט
  - `donation` - תרומה חדשה/עדכון
  - `ride` - בקשת נסיעה/עדכון
  - `task` - הקצאת משימה/עדכון
  - `challenge` - עדכון אתגר
  - `event` - אירוע קהילתי
  - `system` - הודעת מערכת
  - `like` - מישהו לייק את הפוסט שלי
  - `comment` - תגובה על הפוסט שלי

#### FR-009.2: שליחת התראות
- **ערוצים:**
  - In-app notifications (טבלה: user_notifications)
  - Push notifications (Expo Notifications)
  - Email (תכנון עתידי)
- **שדות:**
  - user_id
  - title
  - content
  - notification_type
  - related_id - ID של הישות הקשורה
  - is_read
  - metadata (JSONB)

#### FR-009.3: ניהול התראות
- **פעולות:**
  - סימון כנקרא (mark as read)
  - סימון הכל כנקרא (mark all as read)
  - מחיקת התראה
  - הגדרות התראות (בהגדרות משתמש)
- **הגדרות:**
  - notifications_enabled (true/false)
  - התראות לפי סוג (message, donation, etc.)
  - שעות שקט (Do Not Disturb)

#### FR-009.4: Badge ומונה
- **תיאור:** הצגת מספר התראות שלא נקראו
- **מיקומים:**
  - Badge על אייקון Notifications בכותרת עליונה
  - מונה במסך התראות
- **עדכון:**
  - רענון כל X שניות
  - עדכון בזמן אמת בכניסה לאפליקציה
- **Hook:** `useUnreadNotificationsCount()`

#### FR-009.5: מסך התראות
- **מסך:** `NotificationsScreen`
- **תצוגה:**
  - רשימת התראות (חדש → ישן)
  - הבחנה בין נקרא/לא נקרא (הדגשה)
  - קישור לישות הקשורה (פוסט, צ'אט, משימה וכו')
  - כפתור "סמן הכל כנקרא"
- **אינטראקציה:**
  - לחיצה על התראה → סימון כנקרא + ניווט לישות
  - החלקה למחיקה (swipe to delete)

---

### FR-010: מודול ניהול מנהלים (Admin)

#### FR-010.1: דשבורד מנהלים
- **מסך:** `AdminDashboardScreen`
- **גישה:** רק למשתמשים עם role = 'admin'
- **תכולה:**
  - קישורים למסכי ניהול
  - סטטיסטיקות מהירות
  - התראות ניהוליות

#### FR-010.2: ניהול משתמשים
- **מסך:** `AdminPeopleScreen`
- **גישה:** 
  - `admin`: רואה רק את המתנדבים שלו
  - `super_admin`: רואה את כל המשתמשים והמבנה המלא
  
- **פעולות (super_admin בלבד):**
  - צפייה ברשימת כל המשתמשים
  - חיפוש משתמשים
  - עריכת פרופילים
  - קידום משתמש ל-admin/super_admin (promoteToAdmin)
  - הורדה מתפקיד admin/super_admin (demoteAdmin)
  - הצגת עץ היררכי מלא (AdminHierarchyTree)
  - חסימה/ביטול חסימת משתמשים

- **פעולות (admin):**
  - שליחת הזמנות למתנדבים (invite-volunteer)
  - צפייה במתנדבים שלו בלבד
  - ביטול שיוך של מתנדב שלו
  - עדכון שכר וותק של המתנדבים שלו
  - הצגת עץ היררכי של המתנדבים שלו

- **אילוצים:**
  - admin לא יכול לשייך/לבטל שיוך של מתנדבים של admin אחר
  - admin לא יכול לקדם משתמשים לתפקידים
  - רק super_admin יכול לקדם/להוריד תפקידים

#### FR-010.3: ניהול משימות
- **מסך:** `AdminTasksScreen`
- **פעולות:**
  - צפייה בכל המשימות
  - יצירת משימות חדשות
  - הקצאת משימות
  - עדכון סטטוסים
  - צפייה בשעות עבודה (task_time_logs)
  - ניהול משימות משנה (subtasks)

#### FR-010.4: ניהול CRM
- **מסך:** `AdminCRMScreen`
- **תיאור:** ניהול קשרי לקוחות וקהילה
- **פעולות:**
  - ניהול רשומות community_members
  - מעקב אחר תרומות
  - סטטוסים (active/inactive)

#### FR-010.5: ניהול קבצים
- **מסך:** `AdminFilesScreen`
- **תיאור:** ניהול קבצים משותפים למנהלים
- **פעולות:**
  - העלאת קבצים
  - הורדת קבצים
  - מחיקת קבצים
  - שיתוף קבצים

#### FR-010.6: ניהול טבלאות דינמיות
- **מסכים:**
  - `AdminTablesScreen` - רשימת טבלאות
  - `AdminTableRowsScreen` - שורות בטבלה
- **טבלאות:**
  - `admin_tables` - הגדרת טבלאות
  - `admin_table_columns` - עמודות בטבלה
  - `admin_table_rows` - שורות נתונים
- **סוגי עמודות:**
  - text
  - number
  - date
- **פעולות:**
  - יצירת טבלה חדשה
  - הוספת עמודות
  - הוספה/עריכה/מחיקה של שורות
  - ייצוא נתונים (תכנון עתידי)

#### FR-010.7: ניהול כספים וזמן
- **מסכים:**
  - `AdminMoneyScreen` - ניהול תרומות כסף
  - `AdminTimeManagementScreen` - ניהול שעות עבודה
- **פעולות:**
  - צפייה בדוחות
  - מעקב אחר תשלומים
  - ניהול שכר (salary integration)

#### FR-010.8: אישורים וביקורות
- **מסכים:**
  - `AdminReviewScreen` - ביקורות
  - `AdminOrgApprovalsScreen` - אישורי ארגונים
- **פעולות:**
  - אישור/דחיית בקשות לארגונים (organization_applications)
  - ביקורת תרומות/פריטים/נסיעות
  - ניהול דיווחים (reports)

#### FR-010.9: עץ היררכי
- **קומפוננטה:** `AdminHierarchyTree`
- **תיאור:** הצגה ויזואלית של מבנה הניהול
- **מאפיינים:**
  - הצגת כל המנהלים והמתנדבים הכפופים להם
  - parent_manager_id relationships
  - הדגשת סוגי roles (super_admin, admin, volunteer)
  - עומק היררכיה (depth level)
  
- **תצוגה:**
  ```
  📊 Super Admin (אדון ראשי)
  ├── 👤 Admin A (מנהל)
  │   ├── 🙋 Volunteer 1
  │   ├── 🙋 Volunteer 2
  │   └── 👤 Admin B (מנהל זוטר תחת A)
  │       ├── 🙋 Volunteer 3
  │       └── 🙋 Volunteer 4
  ├── 👤 Admin C (מנהל)
  │   └── 🙋 Volunteer 5
  └── 🏢 Org Admin (מנהל ארגון - לא חלק מהיררכיית מתנדבים)
  ```

- **פעולות (super_admin בלבד):**
  - קידום user ל-admin
  - הורדת admin ל-user
  - ביטול שיוך כלשהו
  - העברת מתנדב ממנהל למנהל אחר (reassign)
  
- **פעולות (admin):**
  - צפייה בענף שלו בלבד
  - הזמנת מתנדבים חדשים
  - ביטול שיוך של מתנדב ישיר שלו

- **אילוצים מוצגים:**
  - מניעת מעגלים - המערכת תציג אזהרה אם מנסים ליצור מעגל
  - מגבלת עומק (אופציונלי) - למשל, מקסימום 5 רמות
  - מתנדב יכול להיות רק תחת מנהל אחד

---

### FR-011: מודול סטטיסטיקות ואנליטיקה

#### FR-011.1: סטטיסטיקות קהילה
- **מסך:** `CommunityStatsScreen`
- **נתונים:**
  - סה"כ משתמשים (totalUsers)
  - סה"כ תרומות (totalDonations)
  - סה"כ שעות התנדבות (totalVolunteerHours)
  - סה"כ תרומות כסף (totalMoneyDonated)
  - תרומות לפי קטגוריה
  - פעילות לאורך זמן (trends)
  - משתמשים פעילים
- **טבלה:** community_stats
- **אגרגציה:**
  - לפי סוג סטטיסטיקה (stat_type)
  - לפי עיר (city)
  - לפי תקופה (date_period)

#### FR-011.2: סטטיסטיקות אישיות
- **מיקום:** פרופיל משתמש
- **נתונים:**
  - karma_points
  - posts_count
  - followers_count / following_count
  - total_donations_amount
  - total_volunteer_hours
  - תרומות לפי קטגוריה

#### FR-011.3: מעקב פעילות
- **טבלה:** user_activities
- **נתונים נשמרים:**
  - activity_type (login, donation, chat, view_category, etc.)
  - activity_data (JSONB)
  - ip_address
  - user_agent
  - created_at
- **שימושים:**
  - אנליטיקה
  - זיהוי דפוסים
  - אבטחה (זיהוי פעילות חשודה)

#### FR-011.4: קומפוננטות סטטיסטיקה
- **CommunityStatsGrid** - גריד של כרטיסי סטטיסטיקה
- **CommunityStatsPanel** - פאנל עם מספרים מרכזיים
- **DonationStatsScreen** - סטטיסטיקות תרומות
- **DonationStatsFooter** - תחתית עם סטטיסטיקות בדף תרומות
- **StatMiniCharts** - גרפים מיניאטוריים
- **StatDetailsModal** - פרטי סטטיסטיקה

#### FR-011.5: Redis Caching
- **תיאור:** שימוש ב-Redis לקאשינג סטטיסטיקות
- **מנגנון:**
  - שמירת נתונים נפוצים (totalUsers, totalDonations, etc.)
  - TTL (Time To Live) - תפוגה אוטומטית
  - ניקוי קאש במקרים מתאימים (clearStatsCaches)
- **יתרונות:**
  - ביצועים מהירים
  - הפחתת עומס על PostgreSQL
  - תמיכה במערכת בקנה מידה

---

### FR-012: חיפוש וסינון

#### FR-012.1: חיפוש כללי
- **מסך:** `SearchScreen`
- **אפשרויות:**
  - חיפוש משתמשים
  - חיפוש פוסטים
  - חיפוש תרומות
  - חיפוש נסיעות
  - חיפוש פריטים
- **קומפוננטה:** `SearchBar`

#### FR-012.2: Full-Text Search
- **תיאור:** חיפוש מתקדם בטקסט
- **טכנולוגיה:** PostgreSQL pg_trgm extension
- **טבלאות עם FTS:**
  - items (title, description)
  - donations (title, description)
  - posts (title, description)
- **Indexes:**
  - GIN indexes on text fields
  - Trigram similarity

#### FR-012.3: סינון ומיון
- **קומפוננטה:** `FilterSortOptions`
- **אפשרויות סינון:**
  - לפי קטגוריה
  - לפי תאריך
  - לפי מיקום
  - לפי סטטוס
  - לפי תגיות
- **אפשרויות מיון:**
  - חדש → ישן
  - ישן → חדש
  - פופולריות (לייקים)
  - קרבה (location-based)

#### FR-012.4: חיפוש מיקום
- **קומפוננטה:** `LocationSearchComp`
- **תיאור:** חיפוש וב חירת מיקום
- **אינטגרציה:** Google Places API
- **תכונות:**
  - Autocomplete
  - קואורדינטות GPS
  - שמירת מיקומים אחרונים

---

### FR-013: עקיבה וקשרים חברתיים

#### FR-013.1: עקיבה אחר משתמשים
- **תיאור:** משתמשים יוכלו לעקוב אחר משתמשים אחרים
- **טבלה:** user_follows
- **שדות:**
  - follower_id (מי עוקב)
  - following_id (אחרי מי עוקב)
- **אילוצים:**
  - UNIQUE(follower_id, following_id)
- **פעולות:**
  - `followUser(userId)` - התחלת עקיבה
  - `unfollowUser(userId)` - הפסקת עקיבה
  - `getFollowers(userId)` - רשימת עוקבים
  - `getFollowing(userId)` - רשימת נעקבים

#### FR-013.2: מונים
- **שדות ב-user_profiles:**
  - followers_count - מספר עוקבים
  - following_count - מספר נעקבים
- **עדכון:**
  - Trigger אוטומטי על הוספה/הסרה ב-user_follows

#### FR-013.3: מסכי עקיבה
- **מסך:** `FollowersScreen`
- **מצבים:**
  - Followers - עוקבים
  - Following - נעקבים
- **פעולות:**
  - צפייה ברשימות
  - עקיבה/ביטול עקיבה
  - ניווט לפרופיל

#### FR-013.4: גילוי אנשים
- **מסך:** `DiscoverPeopleScreen`
- **תיאור:** המלצות על אנשים לעקוב
- **אלגוריתם (בסיסי):**
  - משתמשים פעילים
  - משתמשים באותו אזור
  - משתמשים עם תחומי עניין דומים

---

### FR-014: ארגונים

#### FR-014.1: רישום ארגון
- **מסך:** `OrgOnboardingScreen`
- **שדות:**
  - שם ארגון
  - תיאור
  - סוג ארגון (NGO, Charity, Community, etc.)
  - תחומי פעילות
  - פרטי קשר (email, phone, address)
  - לוגו
  - מספר רישום (אם קיים)
- **תהליך:**
  1. מילוי טופס
  2. שליחת בקשה (organization_applications)
  3. ממתין לאישור מנהל
  4. אישור → יצירת ארגון + העלאת role ל-org_admin

#### FR-014.2: ניהול ארגון
- **מסך:** `OrgDashboardScreen`
- **גישה:** רק למנהלי ארגון (org_admin)
- **פעולות:**
  - עדכון פרטי ארגון
  - ניהול חברים
  - צפייה בתרומות לארגון
  - סטטיסטיקות

#### FR-014.3: טבלת ארגונים
- **טבלה:** organizations
- **שדות עיקריים:**
  - name, description
  - website_url, contact_email, contact_phone
  - address, city
  - organization_type
  - activity_areas (TEXT[])
  - is_verified - אומת על ידי מנהלים
  - status (active, inactive, pending)

#### FR-014.4: בקשות לארגונים
- **טבלה:** organization_applications
- **סטטוסים:**
  - pending - ממתינה
  - approved - אושרה
  - rejected - נדחתה
- **מנהלים:**
  - צפייה בבקשות (AdminOrgApprovalsScreen)
  - אישור/דחייה
  - הערות (reviewed_by, reviewed_at)

---

## דרישות אבטחה

### SEC-001: Authentication & Authorization

#### SEC-001.1: אימות משתמשים
- **Password Hashing:** Argon2 (memory-hard, resistant to GPU attacks)
- **JWT Tokens:**
  - Access Token: 15 דקות
  - Refresh Token: 7 ימים
  - HMAC-SHA256 signing
  - Secure storage (AsyncStorage/LocalStorage)
- **Google OAuth:**
  - Server-side token verification
  - Email verification required
  - Separate Google ID and Firebase UID

#### SEC-001.2: Rate Limiting
- **מנגנון:** NestJS Throttler
- **הגבלות:**
  - Login: 5 attempts/minute
  - Register: 5 attempts/minute
  - Google Auth: 10 attempts/minute
  - Token Refresh: 20 attempts/minute
  - Email Check: 10 attempts/minute
  - Global: 60 requests/minute per IP
- **Override:** Per-route `@Throttle()` decorator

#### SEC-001.3: Input Validation
- **Server-side:**
  - class-validator DTOs
  - Email normalization (lowercase, trim)
  - Length constraints
  - Type checking
- **Client-side:**
  - Form validation
  - Sanitization

#### SEC-001.4: Secure Logging
- **עקרונות:**
  - לא רושמים passwords/tokens
  - רושמים רק partial emails (3 chars + domain)
  - רושמים רק domains, לא emails מלאים
  - Stack traces רק ב-development

### SEC-002: Data Protection

#### SEC-002.1: HTTPS Only
- **כל התקשורת:** HTTPS (TLS 1.2+)
- **Certificate Pinning:** (תכנון עתידי)

#### SEC-002.2: HTTP Security Headers
- **Helmet.js:**
  - Content Security Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security

#### SEC-002.3: CORS
- **הגדרות:**
  - Allowed origins: production + dev domains
  - Credentials: true
  - Specific methods (GET, POST, PUT, DELETE)

#### SEC-002.4: SQL Injection Prevention
- **Parameterized Queries:** תמיד עם `$1, $2...`
- **ORM/Query Builder:** pg library with prepared statements
- **אין string concatenation של queries**

#### SEC-002.5: XSS Prevention
- **React Native:** Automatic escaping
- **Web:** Sanitization of user input
- **CSP Headers:** Prevent inline scripts

### SEC-003: Authorization & Access Control

#### SEC-003.1: Role-Based Access Control (RBAC)
- **Roles:** user, volunteer, admin, org_admin, super_admin
- **Hierarchy Levels:**
  - Level 0: user (no special permissions)
  - Level 1: volunteer (user with assigned manager)
  - Level 2: admin (can manage volunteers)
  - Level 3: org_admin (organization manager - parallel to admin)
  - Level 4: super_admin (full system access)
  
- **Guards:**
  - `JwtAuthGuard` - בדיקת JWT
  - `RolesGuard` - בדיקת הרשאות לפי role
  - `HierarchyGuard` - בדיקת הרשאות לפי מבנה היררכי
  
- **Enforcement:**
  - Server-side checks on every endpoint
  - Client-side UI hiding (not security)
  - Hierarchy validation on every manager-volunteer operation

#### SEC-003.2: Resource Ownership
- **עקרון:** משתמש יכול לערוך רק את התוכן שלו
- **בדיקות:**
  - פוסטים: author_id === current_user_id
  - תגובות: user_id === current_user_id
  - משימות: רק assignees ו-creator
  - תרומות: רק donor

#### SEC-003.3: Protected Endpoints by Role
- **super_adminOnly:**
  - `/api/admin/*` - כל ממשקי הניהול המלאים
  - `/api/users/:id/promote` - קידום למנהל/super_admin
  - `/api/users/:id/demote` - הורדה מתפקיד
  - `/api/stats/full` - סטטיסטיקות מלאות
  - `/api/hierarchy/tree` - עץ היררכי מלא
  - `/api/managers/:managerId/volunteers/:volunteerId` - ביטול שיוך כלשהו
  
- **admin + super_admin:**
  - `/api/managers/invite-volunteer` - הזמנת מתנדב
  - `/api/managers/my-volunteers` - רשימת המתנדבים שלי
  - `/api/managers/:managerId/volunteers` - רשימת מתנדבים (admin רואה רק שלו)
  
- **volunteer + admin + super_admin:**
  - `/api/volunteers/my-manager` - המנהל שלי
  - `/api/volunteers/unassign` - ביטול שיוך עצמי
  
- **org_admin:**
  - `/api/organizations/:orgId/*` - ניהול הארגון שלי
  - `/api/org-approvals/*` - אישורי בקשות לארגון

#### SEC-003.4: Hierarchy Validation
- **מניעת מעגלים:**
  - כל פעולת שיוך מבצעת BFS/DFS למעלה בעץ
  - אם נמצא המשתמש החדש בשרשרת ההורים → REJECT
  - Time complexity: O(depth) - בדרך כלל קטן
  
- **Single Manager Constraint:**
  - בדיקה ש-volunteer לא משויך כבר למנהל אחר
  - אם משויך → דרוש ביטול שיוך קודם
  
- **Permission Validation:**
  - admin יכול לשייך/לבטל רק מתנדבים **ישירים** שלו
  - super_admin יכול לשייך/לבטל כל מתנדב
  - מנהל בכיר יכול לבטל שיוך של מתנדב למנהל זוטר **תחתיו**

### SEC-004: Session Security

#### SEC-004.1: Token Expiration
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days
- **Automatic Refresh:** לפני expiration

#### SEC-004.2: Token Revocation
- **Redis Blacklist:** (תכנון עתידי)
- **Logout:** מחיקת tokens מהאחסון

#### SEC-004.3: Session Hijacking Prevention
- **User Agent Tracking:** (תכנון עתידי)
- **IP Tracking:** user_activities table

### SEC-005: Additional Security Measures

#### SEC-005.1: Account Lockout
- **(תכנון עתידי)** נעילת חשבון אחרי X ניסיונות התחברות כושלים

#### SEC-005.2: Two-Factor Authentication (2FA)
- **(תכנון עתידי)** תמיכה ב-TOTP/SMS

#### SEC-005.3: Email Verification
- **(תכנון עתידי)** אימות email לפני שימוש מלא במערכת

#### SEC-005.4: Password Requirements
- **(תכנון עתידי)**
  - מינימום 8 תווים
  - אותיות גדולות/קטנות
  - מספרים
  - תווים מיוחדים

#### SEC-005.5: Security Auditing
- **(תכנון עתידי)** לוגים מפורטים של פעולות אבטחה

---

## דרישות ביצועים

### PERF-001: Database Performance

#### PERF-001.1: Indexes
- **תיאור:** כל השדות המשמשים לחיפוש/מיון מאונדקסים
- **סוגים:**
  - B-tree indexes - לשדות רגילים
  - GIN indexes - ל-arrays ו-JSONB
  - Trigram indexes - ל-full-text search
- **דוגמאות:**
  - `idx_user_profiles_email_lower`
  - `idx_donations_type`
  - `idx_posts_created_at`
  - `idx_items_title_trgm`

#### PERF-001.2: Query Optimization
- **Pagination:** LIMIT + OFFSET
- **Selective Columns:** SELECT רק שדות נדרשים
- **Joins:** במקום N+1 queries
- **Aggregations:** COUNT, SUM במסד הנתונים

#### PERF-001.3: Connection Pooling
- **pg Pool:** ניהול חיבורים יעיל
- **Max Connections:** הגדרה לפי עומס

### PERF-002: Redis Caching

#### PERF-002.1: Cache Strategy
- **נתונים נשמרים:**
  - Community stats (totalUsers, totalDonations, etc.)
  - User sessions
  - Rate limiting counters
- **TTL:**
  - Stats: 5-15 minutes
  - Sessions: לפי token expiration
- **Invalidation:**
  - Manual clear (clearStatsCaches)
  - Auto-expiration (TTL)

#### PERF-002.2: ioredis
- **Client:** ioredis 5+
- **Features:**
  - Automatic reconnection
  - Cluster support (future)
  - Pipeline support

### PERF-003: API Response Time

#### PERF-003.1: Target Response Times
- **<< 100ms:** Simple GET requests (cached)
- **< 500ms:** Complex queries (with DB)
- **< 1000ms:** File uploads (small files)
- **< 3000ms:** Large file uploads

#### PERF-003.2: Optimization Techniques
- **Lazy Loading:** טעינה מדורגת של נתונים
- **Pagination:** LIMIT queries
- **Compression:** GZIP responses (via Helmet)
- **CDN:** (future) for static assets

### PERF-004: Client Performance

#### PERF-004.1: Rendering
- **React Native:**
  - FlatList for long lists (virtualization)
  - Memoization (React.memo, useMemo)
  - Avoid unnecessary re-renders
- **Images:**
  - Lazy loading
  - Image compression
  - Caching (expo-file-system)

#### PERF-004.2: Network
- **Batch Requests:** מיזוג requests דומים
- **Debouncing:** חיפוש, auto-save
- **Offline Support:** (future) caching with AsyncStorage

#### PERF-004.3: Bundle Size
- **Code Splitting:** (Web) dynamic imports
- **Tree Shaking:** remove unused code
- **Minification:** production builds

### PERF-005: Scalability

#### PERF-005.1: Horizontal Scaling
- **Stateless Backend:** ניתן להוסיף instances
- **Load Balancer:** Railway/Nginx
- **Session Store:** Redis (shared)

#### PERF-005.2: Database Scaling
- **Read Replicas:** (future) for read-heavy queries
- **Partitioning:** (future) for large tables
- **Sharding:** (future) if needed

---

## דרישות UI/UX

### UX-001: Responsive Design

#### UX-001.1: Platform Support
- **Mobile:** iOS (iPhone, iPad), Android (Phone, Tablet)
- **Web:** Desktop (1920x1080+), Laptop (1366x768+), Tablet (768x1024)
- **Adaptive Layouts:**
  - Single column (mobile)
  - Multi-column (tablet/desktop)
  - Grid views (1-3 columns)

#### UX-001.2: Responsive Components
- **Utilities:** `getScreenInfo()`, `isLandscape()`, `responsiveSpacing()`
- **Breakpoints:**
  - Mobile: < 768px
  - Tablet: 768-1024px
  - Desktop: > 1024px

### UX-002: RTL Support

#### UX-002.1: Languages
- **עברית (RTL):** ברירת מחדל
- **אנגלית (LTR):** תמיכה מלאה

#### UX-002.2: i18n
- **Library:** i18next + react-i18next
- **Files:** `locales/he/{namespace}.json`, `locales/en/{namespace}.json` (split by namespace: common, donations, auth, etc.)
- **Features:**
  - מעבר שפה דינמי
  - RTL flip אוטומטי
  - Pluralization
  - Interpolation

#### UX-002.3: RTL Layout
- **I18nManager:** React Native RTL
- **Flexbox:** direction: row-reverse
- **Icons:** mirror where needed

### UX-003: Accessibility

#### UX-003.1: Screen Readers
- **accessibilityLabel:** לכל אלמנטים אינטראקטיביים
- **accessibilityHint:** הסבר על פעולה
- **accessibilityRole:** סוג האלמנט

#### UX-003.2: Colors & Contrast
- **WCAG AA:** Contrast ratio >= 4.5:1
- **Color Blindness:** אין הסתמכות על צבע בלבד

#### UX-003.3: Font Sizes
- **Minimum:** 14px for body text
- **Scalable:** תמיכה ב-Dynamic Type (iOS)

### UX-004: Themes & Dark Mode

#### UX-004.1: Dark Mode
- **תמיכה:** settings.dark_mode
- **Colors:** `globals/colors.tsx`
- **Switching:** בזמן ריצה

#### UX-004.2: Color Palette
- **Primary:** כחול/ירוק (Karma branding)
- **Secondary:** צהוב/כתום
- **Backgrounds:** לבן/אפור (light), כהה (dark)
- **Text:** שחור/לבן (contrast)

### UX-005: Animations & Feedback

#### UX-005.1: Transitions
- **React Native Reanimated:** smooth animations
- **Timing:** 200-300ms for UI transitions
- **Easing:** ease-in-out

#### UX-005.2: User Feedback
- **Loading States:**
  - Spinner/ActivityIndicator
  - Skeleton screens
  - Progress bars (file uploads)
- **Success/Error:**
  - Toast messages
  - Modal alerts
  - Inline validation

#### UX-005.3: Haptic Feedback
- **expo-haptics:**
  - Button press
  - Toggle switch
  - Long press

### UX-006: Navigation

#### UX-006.1: Bottom Tab Navigator
- **Tabs:** Home, Search, Donations, Profile, Admin (if admin)
- **Icons:** Material Icons, Ionicons
- **Badge:** unread notifications, messages

#### UX-006.2: Top Bar
- **Elements:**
  - Settings
  - Notifications (with badge)
  - Chat
  - About
- **Dynamic Title:** לפי מסך נוכחי

#### UX-006.3: Deep Linking
- **linkingConfig:** URL routing
- **Universal Links:** (future) for app/web

#### UX-006.4: Back Navigation
- **Stack Navigation:** back button
- **Gesture:** swipe back (iOS)
- **Web:** browser back

### UX-007: Error Handling

#### UX-007.1: Error Boundary
- **Component:** `ErrorBoundary`
- **Fallback UI:** friendly error message + retry

#### UX-007.2: Network Errors
- **Retry:** automatic retry (3 attempts)
- **Offline Mode:** (future) cached data
- **User Message:** "אין חיבור לאינטרנט"

#### UX-007.3: Validation Errors
- **Inline:** red text below input
- **Toast:** for form submissions
- **Specific Messages:** "Email כבר קיים", "שדה חובה" וכו'

### UX-008: Special UI Features

#### UX-008.1: Pull-to-Refresh
- **FlatList:** refreshControl prop
- **Usage:** Feed, lists

#### UX-008.2: Infinite Scroll
- **FlatList:** onEndReached
- **Pagination:** load next page

#### UX-008.3: Swipe Actions
- **Usage:** delete chat, delete notification
- **react-native-gesture-handler**

#### UX-008.4: Floating Bubbles
- **Components:**
  - `FloatingBubblesSkia` - Skia rendering
  - `FloatingBubblesOverlay` - overlay layer
- **Usage:** decorative animation

#### UX-008.5: Profile Completion Banner
- **Component:** `ProfileCompletionBanner`
- **Trigger:** missing profile fields
- **Actions:** "השלם פרופיל"

#### UX-008.6: Guest Mode Notice
- **Component:** `GuestModeNotice`
- **Trigger:** user in guest mode
- **Actions:** "הירשם עכשיו"

#### UX-008.7: Dev Environment Banner
- **Component:** `DevEnvironmentBanner`
- **Trigger:** DEV environment
- **Styling:** distinct color (red/orange)

---

## אינטגרציות חיצוניות

### INT-001: Firebase

#### INT-001.1: Firebase Authentication
- **SDK:** Firebase JS SDK 10.12
- **Methods:**
  - Google Sign-In
  - Email/Password
  - Phone (future)
- **onAuthStateChanged:** real-time sync

#### INT-001.2: Firebase Storage
- **Usage:** Upload images, files
- **Paths:**
  - `/users/{userId}/avatar.jpg`
  - `/chat/{conversationId}/{messageId}/{filename}`
  - `/posts/{postId}/{filename}`
- **Security Rules:** (תכנון - מאובטח לפי userId)

#### INT-001.3: Firestore (Optional)
- **Usage:** Real-time listeners (fallback if PostgreSQL unavailable)
- **Collections:** users, posts, chats, etc.
- **Sync:** Backend → Firestore (optional)

### INT-002: Google APIs

#### INT-002.1: Google OAuth 2.0
- **Library:** google-auth-library
- **Flow:**
  1. Client gets ID Token from Google
  2. Client sends to backend
  3. Backend verifies with `googleClient.verifyIdToken()`
  4. Backend creates/updates user
- **Scopes:** profile, email

#### INT-002.2: Google Places API
- **Usage:** Location search (PlacesController)
- **Endpoints:**
  - Autocomplete
  - Place Details
  - Geocoding
- **Component:** `LocationSearchComp`

### INT-003: Railway (Deployment)

#### INT-003.1: Backend Deployment
- **Platform:** Railway.app
- **Trigger:** Git push to main/dev
- **Build:**
  - `npm run build`
  - `npm start`
- **Environment Variables:** injected by Railway

#### INT-003.2: PostgreSQL
- **Type:** Managed PostgreSQL instance
- **Connection:** DATABASE_URL

#### INT-003.3: Redis
- **Type:** Managed Redis instance
- **Connection:** REDIS_URL

### INT-004: Expo Services

#### INT-004.1: Expo Push Notifications
- **SDK:** expo-notifications
- **Flow:**
  1. Request permission
  2. Get Expo Push Token
  3. Store token in backend
  4. Send notifications from backend
- **Types:** badge, sound, alert

#### INT-004.2: Expo Updates
- **OTA Updates:** over-the-air for JS code
- **Trigger:** publish to Expo

#### INT-004.3: Expo Image Picker
- **SDK:** expo-image-picker
- **Usage:** Select images from gallery/camera

#### INT-004.4: Expo Document Picker
- **SDK:** expo-document-picker
- **Usage:** Select files (PDF, DOC, etc.)

#### INT-004.5: Expo Location
- **SDK:** expo-location
- **Usage:** Get current location (GPS)

### INT-005: GitHub Actions (CI/CD)

#### INT-005.1: Automated Testing
- **(תכנון)** Run tests on PR
- **(תכנון)** Lint check

#### INT-005.2: Deployment
- **(תכנון)** Auto-deploy to Railway on merge to main/dev

---

## סיכום

מסמך זה מתאר את כל הדרישות הפונקציונליות, האבטחה, הביצועים וה-UI/UX של מערכת **Karma Community**. 

### מודולים עיקריים:
1. ניהול משתמשים ואימות
2. תרומות ומתנות (33 קטגוריות)
3. פריטים פיזיים לתרומה
4. נסיעות משותפות (טרמפים)
5. משימות וניהול פרויקטים
6. אתגרים (אישיים וקהילתיים)
7. פוסטים ו-Feed חברתי
8. צ'אט והודעות (text, image, file, voice, location)
9. התראות
10. ניהול מנהלים (Admin Dashboard)
11. סטטיסטיקות ואנליטיקה
12. עקיבה וקשרים חברתיים
13. ארגונים

### טכנולוגיות:
- **Backend:** NestJS, PostgreSQL, Redis, Firebase Admin
- **Frontend:** React Native (Expo), Zustand, Axios, i18next
- **Cloud:** Railway, Firebase Storage
- **Security:** JWT, Argon2, Rate Limiting, Input Validation

### הערות:
- ✅ = מוטמע
- (תכנון עתידי) = תכנון אך טרם הוטמע

---

**סוף מסמך דרישות מערכת**
