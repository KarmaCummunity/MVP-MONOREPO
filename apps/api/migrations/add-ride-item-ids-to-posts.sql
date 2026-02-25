-- Migration: Add ride_id and item_id columns to posts table
-- This migration adds proper foreign key columns for rides and items instead of relying on metadata JSONB

-- Ensure uuid-ossp extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add ride_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'ride_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN ride_id UUID REFERENCES rides(id) ON DELETE CASCADE;
        CREATE INDEX idx_posts_ride_id ON posts(ride_id);
        
        -- Migrate existing ride posts from metadata to ride_id column
        UPDATE posts 
        SET ride_id = (metadata->>'ride_id')::uuid 
        WHERE post_type = 'ride' 
        AND metadata->>'ride_id' IS NOT NULL
        AND ride_id IS NULL;
        
        RAISE NOTICE 'Added ride_id column and migrated existing data';
    ELSE
        RAISE NOTICE 'ride_id column already exists';
    END IF;
END $$;

-- Add item_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'item_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN item_id UUID REFERENCES items(id) ON DELETE CASCADE;
        CREATE INDEX idx_posts_item_id ON posts(item_id);
        
        -- Migrate existing item/donation posts from metadata to item_id column
        UPDATE posts 
        SET item_id = (metadata->>'item_id')::uuid 
        WHERE post_type IN ('item', 'donation') 
        AND metadata->>'item_id' IS NOT NULL
        AND item_id IS NULL;
        
        RAISE NOTICE 'Added item_id column and migrated existing data';
    ELSE
        RAISE NOTICE 'item_id column already exists';
    END IF;
END $$;

-- Log completion
DO $$
DECLARE
    ride_posts_count INTEGER;
    item_posts_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ride_posts_count FROM posts WHERE ride_id IS NOT NULL;
    SELECT COUNT(*) INTO item_posts_count FROM posts WHERE item_id IS NOT NULL;
    
    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  - Posts with ride_id: %', ride_posts_count;
    RAISE NOTICE '  - Posts with item_id: %', item_posts_count;
END $$;
