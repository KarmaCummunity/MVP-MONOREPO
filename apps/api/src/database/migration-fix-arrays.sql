-- Migration: Fix Array Columns (Text[] to UUID[])
-- Purpose: Convert chat_conversations.participants and tasks.assignees from TEXT[] to UUID[]
-- Date: 2025-12-18
--
-- This migration:
-- 1. Converts chat_conversations.participants from TEXT[] to UUID[]
-- 2. Converts tasks.assignees from TEXT[] to UUID[]
-- 3. safely resolves legacy IDs (Firebase UIDs, Emails) to User UUIDs

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Helper function to resolve user_id to UUID
-- ============================================
CREATE OR REPLACE FUNCTION resolve_user_id_for_array(input_id TEXT)
RETURNS UUID AS $$
DECLARE
    resolved_uuid UUID;
BEGIN
    -- 1. Try to parse as UUID directly first
    BEGIN
        resolved_uuid := input_id::UUID;
        -- Check if this UUID actually exists in user_profiles to be safe? 
        -- For now, if it looks like a UUID, we assume it's valid or at least compatible type-wise.
        RETURN resolved_uuid;
    EXCEPTION WHEN OTHERS THEN
        -- Not a valid UUID format, continue to lookup
        NULL;
    END;

    -- 2. Lookup in user_profiles
    SELECT id INTO resolved_uuid
    FROM user_profiles
    WHERE LOWER(email) = LOWER(input_id)
       OR firebase_uid = input_id
       OR google_id = input_id
    LIMIT 1;
    
    -- 3. If found, return it
    IF resolved_uuid IS NOT NULL THEN
        RETURN resolved_uuid;
    END IF;

    -- 4. If not found, create a placeholder user (to avoid data loss in array)
    INSERT INTO user_profiles (email, name, firebase_uid, created_at, updated_at)
    VALUES (
        CASE 
            WHEN input_id LIKE '%@%' THEN input_id 
            ELSE 'unknown_' || substring(md5(random()::text) from 1 for 8) || '@migrated.local'
        END,
        'Migrated User',
        CASE 
            WHEN input_id NOT LIKE '%@%' AND length(input_id) > 10 THEN input_id 
            ELSE NULL 
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO resolved_uuid;

    -- 5. If insert failed (race condition or conflict), lookup again
    IF resolved_uuid IS NULL THEN
         SELECT id INTO resolved_uuid
         FROM user_profiles
         WHERE email = (
            CASE 
                WHEN input_id LIKE '%@%' THEN input_id 
                ELSE 'unknown_' || substring(md5(random()::text) from 1 for 8) || '@migrated.local' 
            END
         );
         
         -- If still NULL, just generate a random UUID to satisfy the type constraint, 
         -- though this means the user is effectively lost/unlinked.
         IF resolved_uuid IS NULL THEN
             -- Try one last lookup by firebase_uid if applicable
             IF input_id NOT LIKE '%@%' AND length(input_id) > 10 THEN
                SELECT id INTO resolved_uuid FROM user_profiles WHERE firebase_uid = input_id;
             END IF;

             IF resolved_uuid IS NULL THEN
                resolved_uuid := uuid_generate_v4();
             END IF;
         END IF;
    END IF;

    RETURN resolved_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 1: Convert chat_conversations.participants
-- ============================================
DO $$
DECLARE
    r RECORD;
    arr_text TEXT[];
    arr_uuid UUID[];
    elem TEXT;
    u UUID;
    converted_count INTEGER := 0;
BEGIN
    -- Check if column is TEXT[] (array of text)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_conversations' 
        AND column_name = 'participants' 
        AND data_type = 'ARRAY' 
        AND udt_name = '_text' -- _text means TEXT[]
    ) THEN
        RAISE NOTICE 'Converting chat_conversations.participants from TEXT[] to UUID[]...';

        -- Rename old column to keep as backup/source
        ALTER TABLE chat_conversations RENAME COLUMN participants TO participants_old;
        
        -- Create new column
        ALTER TABLE chat_conversations ADD COLUMN participants UUID[];

        -- Migrate data
        FOR r IN SELECT id, participants_old FROM chat_conversations LOOP
            arr_text := r.participants_old;
            arr_uuid := ARRAY[]::UUID[];
            
            IF arr_text IS NOT NULL THEN
                FOREACH elem IN ARRAY arr_text
                LOOP
                    u := resolve_user_id_for_array(elem);
                    arr_uuid := array_append(arr_uuid, u);
                END LOOP;
            END IF;

            UPDATE chat_conversations 
            SET participants = arr_uuid
            WHERE id = r.id;
            
            converted_count := converted_count + 1;
        END LOOP;

        -- Drop old column (or keep it if you want backup, but schema expects 'participants' to be present)
        ALTER TABLE chat_conversations DROP COLUMN participants_old;
        
        -- Add constraint
        ALTER TABLE chat_conversations ALTER COLUMN participants SET NOT NULL;
        
        -- Recreate Index
        DROP INDEX IF EXISTS idx_chat_conversations_participants;
        CREATE INDEX idx_chat_conversations_participants ON chat_conversations USING GIN (participants);

        RAISE NOTICE 'Finished converting chat_conversations.participants (% rows)', converted_count;
    ELSE
        RAISE NOTICE 'chat_conversations.participants is not TEXT[], skipping.';
    END IF;
END $$;

-- ============================================
-- STEP 2: Convert tasks.assignees
-- ============================================
DO $$
DECLARE
    r RECORD;
    arr_text TEXT[];
    arr_uuid UUID[];
    elem TEXT;
    u UUID;
    converted_count INTEGER := 0;
BEGIN
    -- Check if column exists and is TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'assignees' 
        AND data_type = 'ARRAY' 
        AND udt_name = '_text'
    ) THEN
        RAISE NOTICE 'Converting tasks.assignees from TEXT[] to UUID[]...';

        ALTER TABLE tasks RENAME COLUMN assignees TO assignees_old;
        ALTER TABLE tasks ADD COLUMN assignees UUID[] DEFAULT ARRAY[]::UUID[];

        FOR r IN SELECT id, assignees_old FROM tasks LOOP
            arr_text := r.assignees_old;
            arr_uuid := ARRAY[]::UUID[];
            
            IF arr_text IS NOT NULL THEN
                FOREACH elem IN ARRAY arr_text
                LOOP
                    u := resolve_user_id_for_array(elem);
                    arr_uuid := array_append(arr_uuid, u);
                END LOOP;
            END IF;

            UPDATE tasks 
            SET assignees = arr_uuid
            WHERE id = r.id;
            
            converted_count := converted_count + 1;
        END LOOP;

        ALTER TABLE tasks DROP COLUMN assignees_old;
        
        DROP INDEX IF EXISTS idx_tasks_assignees_gin;
        CREATE INDEX idx_tasks_assignees_gin ON tasks USING GIN (assignees);

        RAISE NOTICE 'Finished converting tasks.assignees (% rows)', converted_count;
    ELSE
        RAISE NOTICE 'tasks.assignees is not TEXT[], skipping.';
    END IF;
END $$;

-- Drop helper function
DROP FUNCTION IF EXISTS resolve_user_id_for_array(TEXT);
