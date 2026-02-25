-- Example Queries Using New ride_id and item_id Columns
-- ========================================================

-- 1. Get all posts for a specific ride with full ride details
SELECT 
    p.id as post_id,
    p.title as post_title,
    p.likes,
    p.comments,
    r.id as ride_id,
    r.from_location->>'city' as from_city,
    r.to_location->>'city' as to_city,
    r.departure_time,
    r.available_seats
FROM posts p
JOIN rides r ON p.ride_id = r.id
WHERE p.ride_id = 'your-ride-uuid-here';

-- 2. Get all posts for a specific item
SELECT 
    p.id as post_id,
    p.title,
    p.likes,
    i.id as item_id,
    i.title as item_title,
    i.category,
    i.status
FROM posts p
JOIN items i ON p.item_id = i.id
WHERE p.item_id = 'your-item-id-here';

-- 3. Find most liked ride posts
SELECT 
    r.id as ride_id,
    r.title as ride_title,
    r.from_location->>'city' as from_city,
    r.to_location->>'city' as to_city,
    p.likes,
    p.comments
FROM rides r
JOIN posts p ON p.ride_id = r.id
WHERE p.post_type = 'ride'
ORDER BY p.likes DESC
LIMIT 10;

-- 4. Get all posts (tasks, rides, items) with their related entities
SELECT 
    p.id,
    p.title,
    p.post_type,
    p.likes,
    p.comments,
    p.created_at,
    -- Task details (if applicable)
    CASE WHEN p.task_id IS NOT NULL 
        THEN json_build_object('id', t.id, 'title', t.title, 'status', t.status)
        ELSE NULL 
    END as task,
    -- Ride details (if applicable)
    CASE WHEN p.ride_id IS NOT NULL 
        THEN json_build_object(
            'id', r.id, 
            'from', r.from_location->>'city', 
            'to', r.to_location->>'city',
            'departure', r.departure_time
        )
        ELSE NULL 
    END as ride,
    -- Item details (if applicable)
    CASE WHEN p.item_id IS NOT NULL 
        THEN json_build_object('id', i.id, 'title', i.title, 'category', i.category)
        ELSE NULL 
    END as item
FROM posts p
LEFT JOIN tasks t ON p.task_id = t.id
LEFT JOIN rides r ON p.ride_id = r.id
LEFT JOIN items i ON p.item_id = i.id
ORDER BY p.created_at DESC
LIMIT 50;

-- 5. Count posts by type with engagement metrics
SELECT 
    p.post_type,
    COUNT(*) as total_posts,
    AVG(p.likes) as avg_likes,
    AVG(p.comments) as avg_comments,
    SUM(p.likes) as total_likes
FROM posts p
GROUP BY p.post_type
ORDER BY total_posts DESC;

-- 6. Find rides with the most engagement
SELECT 
    r.id,
    r.title,
    r.from_location->>'city' || ' → ' || r.to_location->>'city' as route,
    r.departure_time,
    p.likes,
    p.comments,
    (p.likes + p.comments * 2) as engagement_score
FROM rides r
JOIN posts p ON p.ride_id = r.id
WHERE r.status = 'active'
ORDER BY engagement_score DESC
LIMIT 20;

-- 7. Delete a ride and its post (CASCADE will handle this automatically)
-- When you delete a ride, the post is automatically deleted due to ON DELETE CASCADE
DELETE FROM rides WHERE id = 'your-ride-uuid';
-- The corresponding post is automatically deleted!

-- 8. Get user's posts with type breakdown
SELECT 
    u.id as user_id,
    u.name,
    COUNT(CASE WHEN p.task_id IS NOT NULL THEN 1 END) as task_posts,
    COUNT(CASE WHEN p.ride_id IS NOT NULL THEN 1 END) as ride_posts,
    COUNT(CASE WHEN p.item_id IS NOT NULL THEN 1 END) as item_posts,
    COUNT(*) as total_posts,
    SUM(p.likes) as total_likes
FROM user_profiles u
LEFT JOIN posts p ON p.author_id = u.id
GROUP BY u.id, u.name
ORDER BY total_posts DESC;

-- 9. Find orphaned posts (posts without valid references)
-- This should return 0 rows if foreign keys are working correctly
SELECT 
    p.id,
    p.title,
    p.post_type,
    p.task_id,
    p.ride_id,
    p.item_id
FROM posts p
WHERE 
    (p.post_type LIKE 'task%' AND p.task_id IS NULL) OR
    (p.post_type = 'ride' AND p.ride_id IS NULL) OR
    (p.post_type IN ('item', 'donation') AND p.item_id IS NULL);

-- 10. Performance comparison: JSONB vs Column
-- Old way (slow):
EXPLAIN ANALYZE
SELECT * FROM posts 
WHERE metadata->>'ride_id' = 'some-uuid';

-- New way (fast):
EXPLAIN ANALYZE
SELECT * FROM posts 
WHERE ride_id = 'some-uuid'::uuid;
