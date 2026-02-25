-- Migration: Convert JSONB tables user_id from TEXT to UUID
-- Purpose: Convert all JSONB tables (posts, followers, following, chats, messages, etc.) to use UUID for user_id
-- Date: 2025-12-18
-- 
-- This migration:
-- 1. Converts user_id from TEXT to UUID in all JSONB tables
-- 2. Handles data migration by resolving TEXT user_ids to UUIDs via user_profiles
-- 3. Drops old indexes and recreates them for UUID type

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Helper function to resolve user_id to UUID
-- ============================================
CREATE OR REPLACE FUNCTION resolve_user_id_to_uuid(input_id TEXT)
RETURNS UUID AS $$
DECLARE
    resolved_uuid UUID;
BEGIN
    -- Try to find user by input_id (could be UUID string, email, firebase_uid, google_id)
    SELECT id INTO resolved_uuid
    FROM user_profiles
    WHERE id::text = input_id
       OR LOWER(email) = LOWER(input_id)
       OR firebase_uid = input_id
       OR google_id = input_id
    LIMIT 1;
    
    RETURN resolved_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Convert each JSONB table
-- ============================================

DO $$
DECLARE
    table_name TEXT;
    tables_to_convert TEXT[] := ARRAY[
        'posts', 'followers', 'following', 'chats', 'messages', 
        'notifications', 'bookmarks', 'settings', 'media', 
        'blocked_users', 'message_reactions', 'typing_status', 
        'read_receipts', 'voice_messages', 'conversation_metadata',
        'organizations', 'org_applications'
    ];
    record_count INTEGER;
    converted_count INTEGER := 0;
    failed_count INTEGER := 0;
    table_record RECORD;
BEGIN
    FOREACH table_name IN ARRAY tables_to_convert
    LOOP
        -- Check if table exists and user_id is TEXT
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_name AND column_name = 'user_id' AND data_type = 'text'
        ) THEN
            RAISE NOTICE 'Converting table: %', table_name;
            
            -- Create temporary column for UUID
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id_uuid UUID', table_name);
            
            -- Convert each user_id to UUID
            converted_count := 0;
            failed_count := 0;
            
            FOR table_record IN EXECUTE format('SELECT user_id, item_id FROM %I WHERE user_id IS NOT NULL', table_name)
            LOOP
                DECLARE
                    resolved_uuid UUID;
                BEGIN
                    resolved_uuid := resolve_user_id_to_uuid(table_record.user_id);
                    
                    IF resolved_uuid IS NOT NULL THEN
                        EXECUTE format(
                            'UPDATE %I SET user_id_uuid = $1 WHERE user_id = $2 AND item_id = $3',
                            table_name
                        ) USING resolved_uuid, table_record.user_id, table_record.item_id;
                        converted_count := converted_count + 1;
                    ELSE
                        failed_count := failed_count + 1;
                        RAISE WARNING 'Failed to resolve user_id % for table %', table_record.user_id, table_name;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    failed_count := failed_count + 1;
                    RAISE WARNING 'Error converting user_id % for table %: %', table_record.user_id, table_name, SQLERRM;
                END;
            END LOOP;
            
            -- Drop old column and rename new one
            EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS user_id', table_name);
            EXECUTE format('ALTER TABLE %I RENAME COLUMN user_id_uuid TO user_id', table_name);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id SET NOT NULL', table_name);
            
            -- Recreate indexes
            EXECUTE format('DROP INDEX IF EXISTS %I_user_idx', table_name);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I_user_idx ON %I(user_id)', table_name, table_name);
            
            RAISE NOTICE 'Table % converted: % converted, % failed', table_name, converted_count, failed_count;
        ELSE
            RAISE NOTICE 'Table % already uses UUID or does not exist, skipping', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- Cleanup: Drop helper function
-- ============================================
DROP FUNCTION IF EXISTS resolve_user_id_to_uuid(TEXT);

-- ============================================
-- Drop duplicate tables if they exist
-- ============================================
DROP TABLE IF EXISTS users CASCADE; -- Duplicate of user_profiles
DROP TABLE IF EXISTS links CASCADE; -- Removed per UNIFICATION_SUMMARY

RAISE NOTICE 'Migration completed successfully';

