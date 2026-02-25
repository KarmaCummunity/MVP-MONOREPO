# תיקון בעיות זיהוי משתמשים (User ID Resolution)

## הבעיה

היו שתי בעיות עיקריות בבדיקות ה-API:

1. **Community Stats Test** - שגיאה: `column "roles" does not exist`
2. **Chat Conversations Test** - שגיאה: `column "google_id" does not exist`

## הסיבה

הקוד ניסה לגשת לעמודות `google_id` ו-`roles` שלא היו קיימות במסד הנתונים המקומי.

## הפתרון

### 1. עדכון קוד - שימוש רק ב-UUID

עדכנו את הקוד כך שהוא משתמש **רק ב-UUID שאנחנו יוצרים** (`user_profiles.id`) לזיהוי משתמשים:

**קבצים שעודכנו:**
- ✅ `src/services/user-resolution.service.ts` - הסרנו `google_id` מהשאילתה
- ✅ `src/controllers/community-members.controller.ts` - הסרנו `google_id`
- ✅ `src/controllers/rides.controller.ts` - הסרנו `google_id`

**מזהים נתמכים לזיהוי משתמשים:**
- ✅ UUID (user_profiles.id) - **המזהה העיקרי**
- ✅ Email
- ✅ Firebase UID (רק לקישור עם Firebase Auth)
- ❌ Google ID - **לא משתמשים יותר**

### 2. מיגרציה - הוספת עמודות חסרות

יצרנו מיגרציה שמוסיפה את העמודות החסרות אם הן לא קיימות:

```bash
# להריץ את המיגרציה ידנית:
./scripts/run-column-migration.sh
```

**או** - המיגרציה תרוץ אוטומטית כשתריץ:
```bash
cd ../MVP
./scripts/run-local-e2e.sh
```

## למה שמרנו את העמודה `google_id`?

למרות שאנחנו לא משתמשים ב-`google_id` לזיהוי משתמשים, **העמודה נשארת בטבלה** לצורכי:
- תיעוד היסטורי
- שימוש עתידי אפשרי
- תאימות לאחור

**אבל** - אנחנו **לא משתמשים בה לזיהוי משתמשים**. המזהה היחיד הוא `user_profiles.id` (UUID).

## בדיקה

אחרי הרצת המיגרציה, הרץ את הבדיקות:

```bash
cd ../MVP
./scripts/run-local-e2e.sh
```

הבדיקות הבאות אמורות לעבור:
- ✅ Community Stats
- ✅ Chat Conversations
- ✅ Donation Stats
- ✅ Notifications
- ✅ Redis Comprehensive

## קבצים שנוצרו/עודכנו

1. `src/database/migration-ensure-columns.sql` - מיגרציה להוספת עמודות
2. `scripts/run-column-migration.sh` - סקריפט להרצת המיגרציה
3. `src/services/user-resolution.service.ts` - עודכן להסרת `google_id`
4. `src/controllers/community-members.controller.ts` - עודכן להסרת `google_id`
5. `src/controllers/rides.controller.ts` - עודכן להסרת `google_id`

## עקרון חשוב

**אנחנו משתמשים רק ב-UUID שאנחנו יוצרים (`user_profiles.id`) לזיהוי משתמשים בכל המערכת.**

מזהים חיצוניים (Firebase UID, Google ID) משמשים **רק** לקישור עם ספקי אימות חיצוניים, אבל לא לזיהוי פנימי במערכת.
