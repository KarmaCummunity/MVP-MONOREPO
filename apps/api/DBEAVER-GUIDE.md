# 📊 מדריך DBeaver - איך לראות ולעבוד עם טבלת Items

## 🔧 שלב 1: יצירת טבלת Items

### אפשרות א': הרצה דרך Docker (מומלץ)
```bash
cd /Users/navesarussi/KC/DEV/KC-MVP-server && docker compose exec -T postgres psql -U kc -d kc_db < create-items-table.sql
```

### אפשרות ב': הרצה דרך DBeaver
1. פתח את DBeaver
2. התחבר לדטה-בייס שלך (kc_db)
3. לחץ **SQL Editor** (או Ctrl+])
4. פתח את הקובץ `create-items-table.sql`
5. לחץ על **Execute SQL Statement** (או Ctrl+Enter)

---

## 👀 שלב 2: צפייה בטבלת Items ב-DBeaver

### 1. רענון הטבלאות
לאחר יצירת הטבלה:
- לחיצה ימנית על **Tables** בעץ השמאלי
- בחר **Refresh** (או F5)
- הטבלה `items` אמורה להופיע ברשימה

### 2. צפייה במבנה הטבלה
- הרחב את **Tables** בעץ השמאלי
- מצא את **items**
- הרחב אותה כדי לראות:
  - **Columns** - כל העמודות (user_id, item_id, data, created_at, updated_at)
  - **Indexes** - כל האינדקסים
  - **Constraints** - המפתח הראשי

### 3. צפייה בנתונים
- לחיצה כפולה על **items**
- או: לחיצה ימנית → **View Data**
- תראה את כל השורות בטבלה (בהתחלה ריקה)

---

## 🔍 שלב 3: שאילתות שימושיות ב-DBeaver

### להציג את כל הפריטים:
```sql
SELECT 
    user_id,
    item_id,
    data->>'title' as title,
    data->>'category' as category,
    data->>'price' as price,
    data->>'location' as location,
    created_at
FROM items
ORDER BY created_at DESC;
```

### להציג פריטים של משתמש ספציפי:
```sql
SELECT 
    item_id,
    data->>'title' as title,
    data->>'description' as description,
    data->>'category' as category,
    data->>'condition' as condition,
    data->>'price' as price,
    created_at
FROM items
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;
```

### להציג פריטים בחינם:
```sql
SELECT 
    user_id,
    data->>'title' as title,
    data->>'location' as location,
    data
FROM items
WHERE (data->>'price')::numeric = 0
ORDER BY created_at DESC;
```

### להציג פריטים לפי קטגוריה:
```sql
SELECT 
    user_id,
    data->>'title' as title,
    data->>'condition' as condition,
    data->>'price' as price
FROM items
WHERE data->>'category' = 'furniture'  -- או 'clothes', 'general'
ORDER BY created_at DESC;
```

### סטטיסטיקות על הפריטים:
```sql
SELECT 
    data->>'category' as category,
    COUNT(*) as total_items,
    COUNT(CASE WHEN (data->>'price')::numeric = 0 THEN 1 END) as free_items,
    AVG((data->>'price')::numeric) as avg_price
FROM items
GROUP BY data->>'category'
ORDER BY total_items DESC;
```

---

## 🎯 שלב 4: בדיקה שהכל עובד

### 1. הכנס פריט לדוגמה:
```sql
INSERT INTO items (user_id, item_id, data)
VALUES (
    'test_user_123',
    '1234567890',
    '{
        "id": "1234567890",
        "ownerId": "test_user_123",
        "title": "ספה 3 מושבים - בדיקה",
        "description": "ספה נוחה מאוד",
        "category": "furniture",
        "condition": "used",
        "location": "תל אביב",
        "price": 0,
        "images": [],
        "rating": 0,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "tags": ["ספות", "בחינם"],
        "qty": 1
    }'::jsonb
);
```

### 2. בדוק שהפריט נשמר:
```sql
SELECT * FROM items WHERE item_id = '1234567890';
```

### 3. מחק את הפריט לאחר הבדיקה:
```sql
DELETE FROM items WHERE item_id = '1234567890';
```

---

## 📋 שלב 5: השוואה לטבלאות אחרות

להציג את מבנה הטבלאות הדומות:
```sql
-- השווה למבנה של users
\d+ users

-- השווה למבנה של posts
\d+ posts

-- השווה למבנה של items (הטבלה החדשה)
\d+ items
```

כל הטבלאות האלה צריכות להיות עם אותו מבנה:
- user_id (TEXT)
- item_id (TEXT)
- data (JSONB)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

---

## 🚀 טיפים נוספים ל-DBeaver

### 1. ER Diagram - תרשים קשרים
- לחיצה ימנית על הדטה-בייס
- בחר **View Diagram**
- תראה את כל הטבלאות והקשרים ביניהן

### 2. Data Export
- לחיצה ימנית על טבלה
- **Export Data**
- תוכל לייצא ל-CSV, JSON, XML וכו'

### 3. SQL History
- פתח **SQL History** (Ctrl+H)
- תראה את כל השאילתות שהרצת

### 4. Auto-completion
- כתיבת SQL ב-Editor
- Ctrl+Space למילוי אוטומטי של שמות טבלאות ועמודות

---

## ✅ בדיקת תקינות סופית

הרץ את השאילתה הזו כדי לוודא שהכל תקין:

```sql
-- בדיקת קיום הטבלה
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'items'
) as table_exists;

-- ספירת עמודות
SELECT COUNT(*) as columns_count
FROM information_schema.columns
WHERE table_name = 'items';

-- רשימת עמודות
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;

-- רשימת אינדקסים
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'items';
```

**תוצאה צפויה:**
- table_exists: true
- columns_count: 5
- columns: user_id, item_id, data, created_at, updated_at
- indexes: items_pkey, items_user_idx, items_item_idx, items_data_gin

---

## 🎉 סיימת!

עכשיו הטבלה `items` קיימת בדטה-בייס ואתה יכול:
- ✅ לשמור פריטים מהאפליקציה
- ✅ לצפות בהם ב-DBeaver
- ✅ להריץ שאילתות מורכבות
- ✅ לנתח את הנתונים

**הצעד הבא:** נסה להוסיף פריט מהאפליקציה ובדוק ש-DBeaver מראה אותו!






