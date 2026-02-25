-- Migration: Add Task Hours Management
-- Purpose: Add estimated_hours to tasks and create task_time_logs table
-- Date: 2025-01-XX

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Add estimated_hours column to tasks
-- ============================================
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2);

-- Set default value of 0 for existing tasks that have NULL
UPDATE tasks 
SET estimated_hours = 0 
WHERE estimated_hours IS NULL;

-- ============================================
-- STEP 2: Create task_time_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS task_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    actual_hours NUMERIC(10,2) NOT NULL CHECK (actual_hours > 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure one log per task per user (if needed, can be changed later)
    UNIQUE(task_id, user_id)
);

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_logged_at ON task_time_logs(logged_at DESC);

-- ============================================
-- STEP 4: Add trigger for updated_at (if needed in future)
-- ============================================
-- Note: We don't need updated_at for logs as they are immutable,
-- but we keep created_at for audit trail

