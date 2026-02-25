-- Migration: Convert chat-related columns to UUID
-- Purpose: Convert sender_id, user_id, message_id, and created_by columns from TEXT/other types to UUID
-- Date: 2024
-- 
-- This migration converts the following columns:
-- 1. chat_messages.sender_id -> UUID
-- 2. message_read_receipts.user_id -> UUID
-- 3. message_read_receipts.message_id -> UUID
-- 4. chat_conversations.created_by -> UUID

-- 1. המרת sender_id בטבלת ההודעות ל-UUID
ALTER TABLE chat_messages 
ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;

-- 2. המרת user_id בטבלת אישורי הקריאה ל-UUID
ALTER TABLE message_read_receipts 
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- 3. המרת message_id בטבלת אישורי הקריאה ל-UUID (למקרה שהוא לא)
ALTER TABLE message_read_receipts 
ALTER COLUMN message_id TYPE uuid USING message_id::uuid;

-- 4. המרת created_by בטבלת השיחות ל-UUID
ALTER TABLE chat_conversations 
ALTER COLUMN created_by TYPE uuid USING created_by::uuid;





