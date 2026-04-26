# 📊 DBeaver guide - how to see and work with the Items table

## 🔧 Step 1: Creating the Items table

### Option A: Run through Docker (recommended)
```bash
cd /Users/navesarussi/KC/DEV/KC-MVP-server && docker compose exec -T postgres psql -U kc -d kc_db < create-items-table.sql
```

### Option B: Run through DBeaver
1. Open DBeaver
2. Connect to your database (kc_db)
3. Click **SQL Editor** (or Ctrl+])
4. Open the `create-items-table.sql` file
5. Click **Execute SQL Statement** (or Ctrl+Enter)

---

## 👀 Step 2: Viewing the Items table in DBeaver

### 1. Refreshing the tables
After creating the table:
- Right click on **Tables** in the left tree
- Select **Refresh** (or F5)
- The `items` table should appear in the list

### 2. Viewing the table structure
- Expand **Tables** in the left tree
- find the **items**
- Expand it to see:
  - **Columns** - all columns (user_id, item_id, data, created_at, updated_at)
  - **Indexes** - All indexes
  - **Constraints** - the main key

### 3. Data viewing
- Double click on **items**
- or: right click → **View Data**
- Show all rows in the table (initially empty)

---

## 🔍 Step 3: Useful queries in DBeaver

### Show all items:
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

### Show items of a specific user:
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

### View free items:
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

### Show items by category:
```sql
SELECT 
    user_id,
    data->>'title' as title,
    data->>'condition' as condition,
    data->>'price' as price
FROM items
WHERE data->>'category' = 'furniture' -- or 'clothes', 'general'
ORDER BY created_at DESC;
```

### Statistics on the items:
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

## 🎯 Step 4: Checking that everything works

### 1. Insert an example item:
```sql
INSERT INTO items (user_id, item_id, data)
VALUES (
    'test_user_123',
    '1234567890',
    '{
        "id": "1234567890",
        "ownerId": "test_user_123",
        "title": "3-seater sofa - review",
        "description": "Very comfortable sofa",
        "category": "furniture",
        "condition": "used",
        "location": "Tel Aviv",
        "price": 0,
        "images": [],
        "rating": 0,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "tags": ["sofas", "free"],
        "qty": 1
    }'::jsonb
);
```

### 2. Check that the item is saved:
```sql
SELECT * FROM items WHERE item_id = '1234567890';
```

### 3. Delete the item after checking:
```sql
DELETE FROM items WHERE item_id = '1234567890';
```

---

## 📋 Step 5: Comparison with other tables

Show the structure of the similar tables:
```sql
-- compare to the structure of users
\d+ users

-- compare to the structure of posts
\d+ posts

-- compare to the structure of items (the new table)
\d+ items
```

All these tables should have the same structure:
- user_id (TEXT)
- item_id (TEXT)
- data (JSONB)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

---

## 🚀 More tips for DBeaver

### 1. ER Diagram - relationship diagram
- Right click on the database
- Select **View Diagram**
- See all the tables and their connections

### 2. Data Export
- Right click on a table
- **Export Data**
- You can export to CSV, JSON, XML, etc.

### 3. SQL History
- Open **SQL History** (Ctrl+H)
- See all the queries you've run

### 4. Auto-completion
- Writing SQL in the Editor
- Ctrl+Space for automatic filling of table and column names

---

## ✅ Final integrity check

Run this query to make sure everything is fine:

```sql
-- Checking the existence of the table
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'items'
) as table_exists;M pg_indexes
WHERE tablename = 'items';
```

**Expected result:**
- table_exists: true
- columns_count: 5
- columns: user_id, item_id, data, created_at, updated_at
- indexes: items_pkey, items_user_idx, items_item_idx, items_data_gin

---

## 🎉 You're done!

Now the `items` table exists in the database and you can:
- ✅ Save items from the app
- ✅ Watch them on DBeaver
- ✅ Run complex queries
- ✅ Analyze the data

**Next step:** Try adding an item from the app and check that DBeaver shows it!