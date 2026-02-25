# Posts Table Schema Update - ride_id & item_id

## 📋 Overview
This update adds proper foreign key columns (`ride_id` and `item_id`) to the `posts` table instead of storing these IDs only in the `metadata` JSONB field.

## 🎯 Why This Change?

### Before ❌
```sql
CREATE TABLE posts (
    id UUID,
    author_id UUID,
    task_id UUID,        -- Only tasks had a dedicated column
    metadata JSONB       -- ride_id and item_id hidden here
)
```

### After ✅
```sql
CREATE TABLE posts (
    id UUID,
    author_id UUID,
    task_id UUID,        -- Link to tasks
    ride_id UUID,        -- Link to rides (NEW)
    item_id UUID,        -- Link to items/donations (NEW)
    metadata JSONB       -- Additional flexible data
)
```

## 💡 Benefits

1. **Better Performance**: Direct column queries are faster than JSONB searches
2. **Foreign Keys**: Automatic cascading deletes - when a ride is deleted, its post is deleted too
3. **Indexes**: Can create indexes on `ride_id` and `item_id` for faster lookups
4. **Consistency**: All post types (tasks, rides, items) are treated equally
5. **Type Safety**: Database enforces UUID type and referential integrity

## 📝 What Changed

### 1. Database Schema (`posts.controller.ts`)
- Added `ride_id UUID REFERENCES rides(id) ON DELETE CASCADE`
- Added `item_id UUID REFERENCES items(id) ON DELETE CASCADE`
- Added indexes: `idx_posts_ride_id` and `idx_posts_item_id`
- Auto-migration from metadata to new columns

### 2. API Responses (`posts.controller.ts`)
- `GET /api/posts` now returns `ride_id` and `item_id` fields
- `GET /api/posts/user/:userId` now returns `ride_id` and `item_id` fields

### 3. Ride Creation (`rides.controller.ts`)
- When creating a ride, the post now uses `ride_id` column
- Metadata still contains ride details (location, seats, price) but not the ID

### 4. Migration Script (`create-posts-for-rides.sql`)
- Updated to insert `ride_id` directly into the column
- Uses `WHERE p.ride_id = r.id` instead of JSONB search

## 🚀 Migration

The migration happens automatically when the server starts:

1. **Existing Tables**: Columns are added via `ALTER TABLE`
2. **Data Migration**: Existing posts with `metadata->>'ride_id'` are updated
3. **New Tables**: Created with all columns from the start

### Manual Migration (if needed)
```bash
psql -d your_database -f migrations/add-ride-item-ids-to-posts.sql
```

## 🔄 Backward Compatibility

- ✅ **Metadata is preserved**: The JSONB field still exists for additional data
- ✅ **Existing queries work**: The controller handles both old and new data
- ✅ **Auto-migration**: Old data is automatically migrated to new columns

## 📊 Example Usage

### Creating a Ride Post (New Way)
```typescript
await client.query(`
    INSERT INTO posts (author_id, ride_id, title, description, post_type, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
`, [userId, rideId, title, description, 'ride', additionalData]);
```

### Querying Ride Posts
```sql
-- Fast! Uses index on ride_id
SELECT * FROM posts WHERE ride_id = 'some-uuid';

-- Can join directly
SELECT p.*, r.* 
FROM posts p 
JOIN rides r ON p.ride_id = r.id;
```

## 🎨 Frontend Impact

The frontend (`useFeedData.ts`) already handles this correctly:
- It receives `ride_id` and `item_id` from the API
- Can use these for direct lookups if needed
- Metadata is still used for display details (location, seats, etc.)

## ✅ Testing Checklist

- [ ] Server starts without errors
- [ ] Migration runs successfully
- [ ] Existing ride posts show `ride_id` populated
- [ ] New rides create posts with `ride_id`
- [ ] Deleting a ride deletes its post (CASCADE)
- [ ] Feed displays rides correctly
- [ ] Likes/comments on ride posts work

## 🔮 Future Enhancements

With this structure, we can now:
- Add `JOIN` queries to get ride details with posts in one query
- Create views that combine posts with their related entities
- Add constraints to ensure post_type matches the ID column used
- Track post engagement per ride/item more efficiently
