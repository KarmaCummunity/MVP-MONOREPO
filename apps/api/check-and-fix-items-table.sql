-- ═══════════════════════════════════════════════════════════════
-- בדיקה ותיקון של טבלת items
-- ═══════════════════════════════════════════════════════════════

-- שלב 1: בדיקת המבנה הנוכחי של טבלת items
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'שלב 1: בדיקת מבנה טבלת items הנוכחית'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

\d+ items

-- שלב 2: השוואה למבנה של users (הטבלה הגנרית)
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'שלב 2: השוואה למבנה של users (למעט items)'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

\d+ users

-- שלב 3: בדיקה אם יש נתונים קיימים בטבלה
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'שלב 3: בדיקת נתונים קיימים'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT COUNT(*) as total_items FROM items;

-- שלב 4: תיקון המבנה אם צריך
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'שלב 4: תיקון מבנה הטבלה (אם נדרש)'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

-- מחיקת הטבלה הישנה (רק אם היא לא תואמת)
-- אם יש לך נתונים חשובים - תעשה backup קודם!
DROP TABLE IF EXISTS items CASCADE;

-- יצירת הטבלה במבנה הנכון (זהה ל-users, posts, chats)
CREATE TABLE items (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

\echo '✅ טבלת items נוצרה מחדש במבנה הנכון'
\echo ''

-- יצירת אינדקסים (זהה לשאר הטבלאות)
CREATE INDEX items_user_idx ON items (user_id);
CREATE INDEX items_item_idx ON items (item_id);
CREATE INDEX items_data_gin ON items USING GIN (data);

\echo '✅ אינדקסים נוצרו בהצלחה'
\echo ''

-- שלב 5: אימות שהמבנה תקין
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'שלב 5: אימות המבנה החדש'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

\d+ items

-- שלב 6: השוואה סופית
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'שלב 6: השוואת מבנה items ל-users (צריכים להיות זהים!)'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT 
    'items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;

\echo ''

SELECT 
    'users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo '✅ סיימתי! טבלת items עכשיו במבנה זהה לשאר הטבלאות'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''
\echo 'המבנה הנכון:'
\echo '- user_id (TEXT) - מזהה המשתמש'
\echo '- item_id (TEXT) - מזהה הפריט'
\echo '- data (JSONB) - כל הנתונים של הפריט'
\echo '- created_at (TIMESTAMPTZ) - תאריך יצירה'
\echo '- updated_at (TIMESTAMPTZ) - תאריך עדכון'
\echo ''
\echo 'עכשיו תוכל לשמור פריטים מהאפליקציה! 🎉'
\echo ''






