-- Migration: Unify Users System
-- Purpose: Convert all user ID fields to UUID and remove duplicate tables
-- Date: 2025-12-18
-- 
-- This migration:
-- 1. Converts items.owner_id from TEXT to UUID
-- 2. Converts tasks.created_by from TEXT to UUID
-- 3. Converts community_members.created_by from TEXT to UUID
-- 4. Migrates data from user_id_mapping to user_profiles
-- 5. Drops links and user_id_mapping tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Migrate user_id_mapping data to user_profiles
-- ============================================
-- Update user_profiles with data from user_id_mapping
DO $$
DECLARE
    mapping_record RECORD;
    user_uuid UUID;
BEGIN
    -- Check if user_id_mapping table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_id_mapping') THEN
        -- Migrating data from user_id_mapping to user_profiles
        
        FOR mapping_record IN 
            SELECT old_user_id, new_user_id 
            FROM user_id_mapping
        LOOP
            -- Try to find user by new_user_id (UUID)
            SELECT id INTO user_uuid 
            FROM user_profiles 
            WHERE id::text = mapping_record.new_user_id::text
            LIMIT 1;
            
            IF user_uuid IS NULL THEN
                -- Try to find by old_user_id (could be email, firebase_uid, etc.)
                SELECT id INTO user_uuid 
                FROM user_profiles 
                WHERE email = mapping_record.old_user_id
                   OR firebase_uid = mapping_record.old_user_id
                   OR google_id = mapping_record.old_user_id
                LIMIT 1;
            END IF;
            
            -- If user found, update firebase_uid or google_id if needed
            IF user_uuid IS NOT NULL THEN
                -- Check if old_user_id looks like a Firebase UID (long alphanumeric)
                IF length(mapping_record.old_user_id) > 20 AND mapping_record.old_user_id !~ '@' THEN
                    -- Likely Firebase UID
                    UPDATE user_profiles 
                    SET firebase_uid = mapping_record.old_user_id,
                        updated_at = NOW()
                    WHERE id = user_uuid 
                      AND firebase_uid IS NULL;
                ELSIF mapping_record.old_user_id ~ '@' THEN
                    -- Email - already should be set, but ensure it matches
                    UPDATE user_profiles 
                    SET email = mapping_record.old_user_id,
                        updated_at = NOW()
                    WHERE id = user_uuid 
                      AND (email IS NULL OR email != mapping_record.old_user_id);
                END IF;
            END IF;
        END LOOP;
        
        -- Migration completed
    ELSE
        -- user_id_mapping table does not exist, skipping
    END IF;
END $$;

-- ============================================
-- STEP 2: Convert items.owner_id from TEXT to UUID
-- ============================================
DO $$
DECLARE
    item_record RECORD;
    user_uuid UUID;
    converted_count INTEGER := 0;
    failed_count INTEGER := 0;
BEGIN
    -- Check if items table exists and owner_id is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'owner_id' AND data_type = 'text'
    ) THEN
        -- Converting items.owner_id from TEXT to UUID
        
        -- Create temporary column for UUID
        ALTER TABLE items ADD COLUMN IF NOT EXISTS owner_id_uuid UUID;
        
        -- Convert each owner_id to UUID
        FOR item_record IN 
            SELECT id, owner_id FROM items WHERE owner_id IS NOT NULL
        LOOP
            -- Try to find user by owner_id (could be email, firebase_uid, UUID string, etc.)
            SELECT id INTO user_uuid 
            FROM user_profiles 
            WHERE id::text = item_record.owner_id
               OR email = item_record.owner_id
               OR firebase_uid = item_record.owner_id
               OR google_id = item_record.owner_id
            LIMIT 1;
            
            IF user_uuid IS NOT NULL THEN
                UPDATE items 
                SET owner_id_uuid = user_uuid 
                WHERE id = item_record.id;
                converted_count := converted_count + 1;
            ELSE
                -- If user not found, create a placeholder user profile
                INSERT INTO user_profiles (email, name, firebase_uid, created_at)
                VALUES (
                    COALESCE(item_record.owner_id, 'unknown_' || uuid_generate_v4()::text) || '@migrated.local',
                    'Migrated User',
                    CASE WHEN item_record.owner_id !~ '@' AND length(item_record.owner_id) > 20 
                         THEN item_record.owner_id 
                         ELSE NULL 
                    END,
                    NOW()
                )
                ON CONFLICT (email) DO NOTHING
                RETURNING id INTO user_uuid;
                
                IF user_uuid IS NOT NULL THEN
                    UPDATE items 
                    SET owner_id_uuid = user_uuid 
                    WHERE id = item_record.id;
                    converted_count := converted_count + 1;
                ELSE
                    -- Get the existing user by email
                    SELECT id INTO user_uuid 
                    FROM user_profiles 
                    WHERE email = COALESCE(item_record.owner_id, 'unknown') || '@migrated.local'
                    LIMIT 1;
                    
                    IF user_uuid IS NOT NULL THEN
                        UPDATE items 
                        SET owner_id_uuid = user_uuid 
                        WHERE id = item_record.id;
                        converted_count := converted_count + 1;
                    ELSE
                        failed_count := failed_count + 1;
                        RAISE WARNING 'Failed to convert owner_id for item %: %', item_record.id, item_record.owner_id;
                    END IF;
                END IF;
            END IF;
        END LOOP;
        
        -- Drop old column and rename new one
        ALTER TABLE items DROP COLUMN IF EXISTS owner_id;
        ALTER TABLE items RENAME COLUMN owner_id_uuid TO owner_id;
        ALTER TABLE items ALTER COLUMN owner_id SET NOT NULL;
        
        -- Recreate index
        DROP INDEX IF EXISTS idx_items_owner_id;
        CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);
        
        -- Conversion completed: converted_count converted, failed_count failed
    ELSE
        -- items.owner_id is already UUID or table does not exist, skipping
    END IF;
END $$;

-- ============================================
-- STEP 3: Convert tasks.created_by from TEXT to UUID
-- ============================================
DO $$
DECLARE
    task_record RECORD;
    user_uuid UUID;
    converted_count INTEGER := 0;
    failed_count INTEGER := 0;
BEGIN
    -- Check if tasks table exists and created_by is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'created_by' AND data_type = 'text'
    ) THEN
        -- Converting tasks.created_by from TEXT to UUID
        
        -- Create temporary column for UUID
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_uuid UUID;
        
        -- Convert each created_by to UUID
        FOR task_record IN 
            SELECT id, created_by FROM tasks WHERE created_by IS NOT NULL
        LOOP
            -- Try to find user by created_by (could be email, firebase_uid, UUID string, etc.)
            SELECT id INTO user_uuid 
            FROM user_profiles 
            WHERE id::text = task_record.created_by
               OR email = task_record.created_by
               OR firebase_uid = task_record.created_by
               OR google_id = task_record.created_by
            LIMIT 1;
            
            IF user_uuid IS NOT NULL THEN
                UPDATE tasks 
                SET created_by_uuid = user_uuid 
                WHERE id = task_record.id;
                converted_count := converted_count + 1;
            ELSE
                -- If user not found, create a placeholder user profile
                INSERT INTO user_profiles (email, name, firebase_uid, created_at)
                VALUES (
                    COALESCE(task_record.created_by, 'unknown_' || uuid_generate_v4()::text) || '@migrated.local',
                    'Migrated User',
                    CASE WHEN task_record.created_by !~ '@' AND length(task_record.created_by) > 20 
                         THEN task_record.created_by 
                         ELSE NULL 
                    END,
                    NOW()
                )
                ON CONFLICT (email) DO NOTHING
                RETURNING id INTO user_uuid;
                
                IF user_uuid IS NOT NULL THEN
                    UPDATE tasks 
                    SET created_by_uuid = user_uuid 
                    WHERE id = task_record.id;
                    converted_count := converted_count + 1;
                ELSE
                    -- Get the existing user by email
                    SELECT id INTO user_uuid 
                    FROM user_profiles 
                    WHERE email = COALESCE(task_record.created_by, 'unknown') || '@migrated.local'
                    LIMIT 1;
                    
                    IF user_uuid IS NOT NULL THEN
                        UPDATE tasks 
                        SET created_by_uuid = user_uuid 
                        WHERE id = task_record.id;
                        converted_count := converted_count + 1;
                    ELSE
                        failed_count := failed_count + 1;
                        RAISE WARNING 'Failed to convert created_by for task %: %', task_record.id, task_record.created_by;
                    END IF;
                END IF;
            END IF;
        END LOOP;
        
        -- Drop old column and rename new one
        ALTER TABLE tasks DROP COLUMN IF EXISTS created_by;
        ALTER TABLE tasks RENAME COLUMN created_by_uuid TO created_by;
        
        -- Conversion completed: converted_count converted, failed_count failed
    ELSE
        -- tasks.created_by is already UUID or table does not exist, skipping
    END IF;
END $$;

-- ============================================
-- STEP 4: Convert community_members.created_by from TEXT to UUID
-- ============================================
DO $$
DECLARE
    member_record RECORD;
    user_uuid UUID;
    converted_count INTEGER := 0;
    failed_count INTEGER := 0;
BEGIN
    -- Check if community_members table exists and created_by is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_members' AND column_name = 'created_by' AND data_type = 'text'
    ) THEN
        -- Converting community_members.created_by from TEXT to UUID
        
        -- Create temporary column for UUID
        ALTER TABLE community_members ADD COLUMN IF NOT EXISTS created_by_uuid UUID;
        
        -- Convert each created_by to UUID
        FOR member_record IN 
            SELECT id, created_by FROM community_members WHERE created_by IS NOT NULL
        LOOP
            -- Try to find user by created_by (could be email, firebase_uid, UUID string, etc.)
            SELECT id INTO user_uuid 
            FROM user_profiles 
            WHERE id::text = member_record.created_by
               OR email = member_record.created_by
               OR firebase_uid = member_record.created_by
               OR google_id = member_record.created_by
            LIMIT 1;
            
            IF user_uuid IS NOT NULL THEN
                UPDATE community_members 
                SET created_by_uuid = user_uuid 
                WHERE id = member_record.id;
                converted_count := converted_count + 1;
            ELSE
                -- If user not found, create a placeholder user profile
                INSERT INTO user_profiles (email, name, firebase_uid, created_at)
                VALUES (
                    COALESCE(member_record.created_by, 'unknown_' || uuid_generate_v4()::text) || '@migrated.local',
                    'Migrated User',
                    CASE WHEN member_record.created_by !~ '@' AND length(member_record.created_by) > 20 
                         THEN member_record.created_by 
                         ELSE NULL 
                    END,
                    NOW()
                )
                ON CONFLICT (email) DO NOTHING
                RETURNING id INTO user_uuid;
                
                IF user_uuid IS NOT NULL THEN
                    UPDATE community_members 
                    SET created_by_uuid = user_uuid 
                    WHERE id = member_record.id;
                    converted_count := converted_count + 1;
                ELSE
                    -- Get the existing user by email
                    SELECT id INTO user_uuid 
                    FROM user_profiles 
                    WHERE email = COALESCE(member_record.created_by, 'unknown') || '@migrated.local'
                    LIMIT 1;
                    
                    IF user_uuid IS NOT NULL THEN
                        UPDATE community_members 
                        SET created_by_uuid = user_uuid 
                        WHERE id = member_record.id;
                        converted_count := converted_count + 1;
                    ELSE
                        failed_count := failed_count + 1;
                        RAISE WARNING 'Failed to convert created_by for community_member %: %', member_record.id, member_record.created_by;
                    END IF;
                END IF;
            END IF;
        END LOOP;
        
        -- Drop old column and rename new one
        ALTER TABLE community_members DROP COLUMN IF EXISTS created_by;
        ALTER TABLE community_members RENAME COLUMN created_by_uuid TO created_by;
        
        -- Conversion completed: converted_count converted, failed_count failed
    ELSE
        -- community_members.created_by is already UUID or table does not exist, skipping
    END IF;
END $$;

-- ============================================
-- STEP 5: Drop links table
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'links') THEN
        DROP TABLE IF EXISTS links CASCADE;
    ELSE
        -- links table does not exist, skipping
    END IF;
END $$;

-- ============================================
-- STEP 6: Drop user_id_mapping table
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_id_mapping') THEN
        DROP TABLE IF EXISTS user_id_mapping CASCADE;
    ELSE
        -- user_id_mapping table does not exist, skipping
    END IF;
END $$;

-- ============================================
-- Migration Complete
-- ============================================
-- All user ID fields have been converted to UUID
-- Duplicate tables (links, user_id_mapping) have been removed

