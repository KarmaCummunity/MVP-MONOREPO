-- Migration: Create posts for all existing items that don't have posts
-- This allows likes/comments to work on existing items in the feed
-- Run this once to backfill posts for existing items

-- Insert posts for items that don't have a corresponding post yet
INSERT INTO posts (author_id, item_id, title, description, images, post_type, metadata, created_at)
SELECT 
    i.owner_id AS author_id,
    i.id AS item_id,
    i.title,
    COALESCE(i.description, '') AS description,
    CASE 
        WHEN i.image_base64 IS NOT NULL AND i.image_base64 != '' 
        THEN ARRAY[i.image_base64]
        ELSE ARRAY[]::TEXT[]
    END AS images,
    CASE 
        WHEN i.price > 0 THEN 'item'
        ELSE 'donation'
    END AS post_type,
    jsonb_build_object(
        'item_id', i.id,
        'category', i.category,
        'price', COALESCE(i.price, 0),
        'condition', i.condition,
        'city', i.city,
        'migrated', true,
        'migrated_at', NOW()
    ) AS metadata,
    i.created_at
FROM items i
LEFT JOIN posts p ON p.item_id = i.id
WHERE p.id IS NULL  -- Only items without posts
  AND i.is_deleted = FALSE;  -- Only non-deleted items

-- Log the result
DO $$
DECLARE
    items_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO items_migrated 
    FROM posts 
    WHERE metadata->>'migrated' = 'true';
    
    RAISE NOTICE '✅ Migration complete: % posts created for existing items', items_migrated;
END $$;
