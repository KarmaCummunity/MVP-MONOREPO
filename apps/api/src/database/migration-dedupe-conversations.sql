-- Migration: Deduplicate and Prevent Duplicate Conversations
-- Purpose: Fix existing duplicate conversations and prevent future duplicates
-- Date: 2025-12-18
-- 
-- This migration:
-- 1. Creates a helper function to sort UUID arrays
-- 2. Identifies and merges duplicate conversations
-- 3. Adds UNIQUE constraint to prevent future duplicates
-- 4. Updates chat_conversations to always store sorted participants

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Create array sorting function
-- ============================================
-- This function ensures participants are always in consistent order
CREATE OR REPLACE FUNCTION array_sort_uuid(anyarray)
RETURNS anyarray AS $$
  SELECT ARRAY(
    SELECT unnest($1) 
    ORDER BY 1
  )
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================
-- STEP 2: Backup current conversations (optional safety)
-- ============================================
DO $$
BEGIN
  -- Create backup table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversations_backup_20251218') THEN
    CREATE TABLE chat_conversations_backup_20251218 AS 
    SELECT * FROM chat_conversations;
    
    RAISE NOTICE 'Created backup table: chat_conversations_backup_20251218';
  END IF;
END $$;

-- ============================================
-- STEP 3: Find and merge duplicate conversations
-- ============================================
DO $$
DECLARE
  duplicate_record RECORD;
  keep_conversation_id UUID;
  delete_conversation_ids UUID[];
  merged_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting duplicate conversation cleanup...';
  
  -- Find all duplicate conversation groups
  FOR duplicate_record IN
    SELECT 
      array_sort_uuid(participants) as sorted_participants,
      array_agg(id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) as conversation_ids,
      count(*) as duplicate_count
    FROM chat_conversations
    GROUP BY array_sort_uuid(participants)
    HAVING count(*) > 1
  LOOP
    -- Keep the first conversation (most recent activity)
    keep_conversation_id := duplicate_record.conversation_ids[1];
    delete_conversation_ids := duplicate_record.conversation_ids[2:];
    
    RAISE NOTICE 'Found % duplicate conversations for participants %, keeping %, deleting %',
      duplicate_record.duplicate_count,
      duplicate_record.sorted_participants,
      keep_conversation_id,
      delete_conversation_ids;
    
    -- Update messages to point to the kept conversation
    UPDATE chat_messages
    SET conversation_id = keep_conversation_id
    WHERE conversation_id = ANY(delete_conversation_ids);
    
    -- Update read receipts if needed (via messages)
    -- (No direct update needed as receipts reference messages, not conversations)
    
    -- Delete duplicate conversations
    DELETE FROM chat_conversations
    WHERE id = ANY(delete_conversation_ids);
    
    merged_count := merged_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Merged % duplicate conversation groups', merged_count;
END $$;

-- ============================================
-- STEP 4: Sort all existing participants
-- ============================================
DO $$
DECLARE
  conv_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Sorting participants in all conversations...';
  
  FOR conv_record IN
    SELECT id, participants
    FROM chat_conversations
  LOOP
    -- Update to sorted version
    UPDATE chat_conversations
    SET participants = array_sort_uuid(conv_record.participants),
        updated_at = NOW()
    WHERE id = conv_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Sorted participants for % conversations', updated_count;
END $$;

-- ============================================
-- STEP 5: Add UNIQUE constraint
-- ============================================
DO $$
BEGIN
  -- Drop existing index if it exists
  DROP INDEX IF EXISTS idx_chat_conversations_participants;
  
  -- Create unique index on sorted participants
  -- This prevents future duplicates at the database level
  CREATE UNIQUE INDEX IF NOT EXISTS unique_chat_conversations_participants
    ON chat_conversations (array_sort_uuid(participants));
  
  RAISE NOTICE 'Created unique index on sorted participants';
  
  -- Recreate the GIN index for array containment queries (but not unique)
  CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants_gin
    ON chat_conversations USING GIN (participants);
    
  RAISE NOTICE 'Recreated GIN index for participant queries';
END $$;

-- ============================================
-- STEP 6: Add trigger to always sort participants on insert/update
-- ============================================
CREATE OR REPLACE FUNCTION ensure_sorted_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Always sort participants before insert or update
  NEW.participants := array_sort_uuid(NEW.participants);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sort_participants ON chat_conversations;
CREATE TRIGGER trigger_sort_participants
  BEFORE INSERT OR UPDATE OF participants
  ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_sorted_participants();

RAISE NOTICE 'Created trigger to auto-sort participants';

-- ============================================
-- STEP 7: Verification
-- ============================================
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  -- Check if any duplicates remain
  SELECT count(*)
  INTO remaining_duplicates
  FROM (
    SELECT array_sort_uuid(participants), count(*)
    FROM chat_conversations
    GROUP BY array_sort_uuid(participants)
    HAVING count(*) > 1
  ) duplicates;
  
  IF remaining_duplicates > 0 THEN
    RAISE WARNING 'WARNING: % duplicate conversation groups still exist!', remaining_duplicates;
  ELSE
    RAISE NOTICE '✅ No duplicate conversations found - migration successful!';
  END IF;
END $$;

-- ============================================
-- Migration Complete
-- ============================================
-- Summary:
-- - Created array_sort_uuid function
-- - Backed up existing conversations
-- - Merged duplicate conversations
-- - Sorted all participants
-- - Added unique constraint
-- - Added auto-sort trigger
-- - Verified no duplicates remain
