-- ═══════════════════════════════════════════════════════════════
-- יצירת טבלת items במבנה JSONB גנרי
-- ═══════════════════════════════════════════════════════════════
-- 
-- הטבלה הזו תאפשר לשמור פריטים (רהיטים, בגדים, חפצים כלליים)
-- במבנה גנרי זהה לטבלאות users, posts, messages וכו'
--

-- יצירת הטבלה
CREATE TABLE IF NOT EXISTS items (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

-- יצירת אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS items_user_idx ON items (user_id);
CREATE INDEX IF NOT EXISTS items_item_idx ON items (item_id);
CREATE INDEX IF NOT EXISTS items_data_gin ON items USING GIN (data);

-- הצגת מבנה הטבלה
SELECT 
    'items' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- הטבלה נוצרה בהצלחה!
-- 
-- מבנה הטבלה:
-- - user_id: מזהה המשתמש שיצר את הפריט
-- - item_id: מזהה ייחודי של הפריט
-- - data: כל הנתונים של הפריט בפורמט JSONB
--   {
--     "id": "123456",
--     "ownerId": "user_id",
--     "title": "ספה 3 מושבים",
--     "description": "ספה יפה וגדולה",
--     "category": "furniture",
--     "condition": "used",
--     "location": "תל אביב",
--     "price": 0,
--     "images": [],
--     "rating": 0,
--     "timestamp": "2024-01-01T00:00:00.000Z",
--     "tags": ["ספות"],
--     "qty": 1
--   }
-- ═══════════════════════════════════════════════════════════════






