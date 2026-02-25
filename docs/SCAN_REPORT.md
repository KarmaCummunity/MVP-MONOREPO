# דוח סריקה מלאה - מנגנון משתמשים ומזהים

## תאריך: 2025-12-18

## סיכום בעיות קריטיות

### 1. בעיות UUID ב-items-delivery.service.ts

**מיקום**: `src/controllers/items-delivery.service.ts`

**בעיות**:
- שורה 117, 158: הערות שגויות - "owner_id is TEXT containing Firebase UIDs" - אבל הטבלה הומרה ל-UUID!
- שורה 164: `LEFT JOIN user_profiles up ON up.firebase_uid = i.owner_id` - צריך להיות `up.id = i.owner_id`
- שורה 210: הערה שגויה - "items.owner_id contains Firebase UIDs (TEXT)"
- שורה 234: משתמש ב-firebaseUid במקום UUID
- שורה 478: יש שימוש נכון ב-`up_owner.id = i.owner_id` אבל לא עקבי

**השפעה**: שגיאת UUID כשמתקבל Firebase UID כ-owner_id

---

### 2. טבלאות JSONB עם user_id TEXT במקום UUID

**מיקום**: `src/scripts/init-db.ts` שורות 79-121

**טבלאות שצריך להמיר**:
- users (כפולה - צריך למחוק!)
- posts
- followers
- following
- chats
- messages
- notifications
- bookmarks
- settings
- media
- blocked_users
- message_reactions
- typing_status
- read_receipts
- voice_messages
- conversation_metadata
- organizations
- org_applications
- links (צריך למחוק!)

**בעיה**: כל הטבלאות האלה נוצרות עם `user_id TEXT NOT NULL` במקום `user_id UUID`

**השפעה**: אי-תאימות עם user_profiles.id (UUID)

---

### 3. טבלאות כפולות

**טבלאות שצריך למחוק**:
1. **users** - כפילות של `user_profiles`
   - נוצרת ב-`init-db.ts` שורה 94
   - לא אמורה להתקיים לפי schema.sql שורה 45

2. **links** - נמחקה לפי UNIFICATION_SUMMARY
   - נוצרת ב-`init-db.ts` שורה 114
   - לא אמורה להתקיים לפי schema.sql שורה 47

---

### 4. שימוש ב-email/firebase_uid במקום UUID

**מקומות שמשתמשים ב-email/firebase_uid לזיהוי משתמשים**:

1. **items-delivery.service.ts**:
   - שורה 48: `WHERE LOWER(email) = LOWER($1)`
   - שורה 210-240: מנסה לפתור owner_id ל-firebase_uid במקום UUID

2. **users.controller.ts**:
   - שורות 55, 166, 335: שימוש ב-email לזיהוי
   - זה תקין - צריך לתמוך ב-email לזיהוי, אבל להמיר ל-UUID

3. **auth.controller.ts**:
   - שורות 154, 270, 327, 432, 642, 653: שימוש ב-email
   - זה תקין - צריך לתמוך ב-email לזיהוי

4. **sync.controller.ts**:
   - שורות 106, 331: שימוש ב-email/firebase_uid
   - זה תקין

5. **rides.controller.ts**:
   - שורות 54, 310: שימוש ב-email
   - זה תקין

6. **tasks.controller.ts**:
   - שורה 46: שימוש ב-email
   - זה תקין

7. **chat.controller.ts**:
   - שורה 46: שימוש ב-email
   - זה תקין

**הערה**: שימוש ב-email/firebase_uid לזיהוי הוא תקין, אבל צריך להמיר ל-UUID לפני שימוש ב-queries.

---

### 5. בעיות נוספות

#### 5.1. items.service.ts
- שורה 168: `WHERE user_id = $1` - משתמש ב-user_id TEXT
- צריך לבדוק אם הטבלאות הומרו ל-UUID

#### 5.2. challenges.controller.ts
- שורות 351, 420: `challenge.user_id`, `deleted.user_id`
- צריך לבדוק את מבנה הטבלה

#### 5.3. item_requests
- שורה 431 ב-items-delivery.service.ts: `itemCheck.rows[0].owner_id === createRequestDto.requester_id`
- צריך לבדוק אם זה UUID או TEXT

---

## סיכום בעיות לפי סדר עדיפות

### קריטי (חייב לתקן מיד):
1. ✅ תיקון items.owner_id ב-items-delivery.service.ts - שינוי מ-firebase_uid ל-id
2. ✅ המרת טבלאות JSONB מ-user_id TEXT ל-UUID
3. ✅ הסרת טבלאות כפולות (users, links)

### חשוב (צריך לתקן בקרוב):
4. ✅ עדכון init-db.ts - שינוי baseTable ל-UUID
5. ✅ יצירת migration script להמרת נתונים קיימים
6. ✅ עדכון כל הקוד שמשתמש בטבלאות JSONB

### בינוני (לבדוק ולתקן):
7. ✅ בדיקת items.service.ts - האם הטבלאות הומרו
8. ✅ בדיקת challenges - מבנה הטבלה
9. ✅ בדיקת item_requests - סוגי מזהים

---

## המלצות

1. **לבצע migration מלא** - להמיר את כל הטבלאות ל-UUID בבת אחת
2. **לעדכן את init-db.ts** - למנוע יצירת טבלאות עם TEXT
3. **לבדוק את כל ה-queries** - לוודא שהם משתמשים ב-UUID
4. **לבדוק את כל ה-joins** - לוודא שהם משתמשים ב-UUID
5. **לנקות טבלאות כפולות** - למחוק users ו-links

---

## קבצים שצריך לעדכן

### שרת:
1. `src/controllers/items-delivery.service.ts` - תיקון owner_id queries
2. `src/scripts/init-db.ts` - המרת user_id ל-UUID
3. `src/items/items.service.ts` - בדיקה ועדכון
4. `src/database/schema.sql` - וידוא שכל הטבלאות נכונות
5. יצירת `src/database/migration-jsonb-to-uuid.sql` - migration script

### בדיקות:
- לבדוק את כל ה-controllers שמשתמשים ב-user_id
- לבדוק את כל ה-services שמשתמשים ב-user_id
- לבדוק את כל ה-queries שמשתמשים ב-joins

