-- יצירת טבלת items במבנה JSONB גנרי (זהה ל-users, posts, chats)
DROP TABLE IF EXISTS items CASCADE;

CREATE TABLE items (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

-- יצירת אינדקסים
CREATE INDEX items_user_idx ON items (user_id);
CREATE INDEX items_item_idx ON items (item_id);
CREATE INDEX items_data_gin ON items USING GIN (data);

-- בדיקה שהטבלה נוצרה
SELECT 'items table created successfully!' as status;
SELECT tablename, schemaname FROM pg_tables WHERE tablename = 'items';






