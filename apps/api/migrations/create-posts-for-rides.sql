-- Migration: Create posts for existing rides
-- This ensures all rides have corresponding posts for likes/comments functionality

-- First, check if posts table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        RAISE EXCEPTION 'posts table does not exist. Please run posts migration first.';
    END IF;
END $$;

-- Create posts for rides that don't have them yet
INSERT INTO posts (author_id, ride_id, title, description, post_type, metadata, images, created_at, updated_at)
SELECT 
    r.driver_id as author_id,
    r.id as ride_id,
    r.title,
    COALESCE(r.description, 'נסיעה מ' || (r.from_location->>'name') || ' ל' || (r.to_location->>'name')) as description,
    'ride' as post_type,
    jsonb_build_object(
        'from_location', r.from_location,
        'to_location', r.to_location,
        'departure_time', r.departure_time,
        'available_seats', r.available_seats,
        'price_per_seat', r.price_per_seat
    ) as metadata,
    ARRAY[]::text[] as images,
    r.created_at,
    r.updated_at
FROM rides r
WHERE NOT EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.ride_id = r.id
)
AND r.status = 'active';

-- Log the migration
DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Created % posts for existing rides', inserted_count;
END $$;
