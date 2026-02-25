-- Migration to fix schema synchronization issues
-- This migration addresses:
-- 1. user_profiles: Add avatar_url column (code expects it, but DB has profile_image)
-- 2. tasks: Replace legacy JSONB structure with proper relational schema

-- ============================================================================
-- Part 1: Fix user_profiles - Add avatar_url column
-- ============================================================================

DO $$
BEGIN
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to user_profiles';
        
        -- Copy data from profile_image to avatar_url if profile_image exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'profile_image'
        ) THEN
            UPDATE user_profiles SET avatar_url = profile_image WHERE profile_image IS NOT NULL;
            RAISE NOTICE 'Copied profile_image data to avatar_url';
        END IF;
    ELSE
        RAISE NOTICE 'avatar_url column already exists in user_profiles';
    END IF;
END$$;

-- ============================================================================
-- Part 2: Fix tasks table - Replace legacy JSONB with relational schema
-- ============================================================================

DO $$
BEGIN
    -- Check if tasks table has the legacy structure (user_id, item_id, data columns)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'data' AND data_type = 'jsonb'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'item_id'
    ) THEN
        RAISE NOTICE 'Detected legacy JSONB tasks table - replacing with relational schema';
        
        -- Drop the legacy tasks table
        DROP TABLE IF EXISTS tasks CASCADE;
        RAISE NOTICE 'Dropped legacy tasks table';
        
        -- Create new relational tasks table
        CREATE TABLE tasks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, in_progress, done, archived
            priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- low, medium, high
            category VARCHAR(50), -- development, marketing, operations, etc.
            due_date TIMESTAMPTZ,
            assignees UUID[] DEFAULT ARRAY[]::UUID[], -- UUID[] to match user_profiles.id type
            tags TEXT[] DEFAULT ARRAY[]::TEXT[],
            checklist JSONB, -- [{id, text, done}]
            created_by UUID, -- REFERENCES user_profiles(id)
            parent_task_id UUID, -- REFERENCES tasks(id) for subtasks
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes for performance
        CREATE INDEX idx_tasks_status ON tasks (status);
        CREATE INDEX idx_tasks_priority ON tasks (priority);
        CREATE INDEX idx_tasks_category ON tasks (category);
        CREATE INDEX idx_tasks_due_date ON tasks (due_date);
        CREATE INDEX idx_tasks_created_at ON tasks (created_at);
        CREATE INDEX idx_tasks_assignees_gin ON tasks USING GIN (assignees);
        CREATE INDEX idx_tasks_tags_gin ON tasks USING GIN (tags);
        CREATE INDEX idx_tasks_created_by ON tasks (created_by);
        CREATE INDEX idx_tasks_parent_task_id ON tasks (parent_task_id);
        
        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS '
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        ' language 'plpgsql';
        
        DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
        CREATE TRIGGER update_tasks_updated_at 
            BEFORE UPDATE ON tasks 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Created new relational tasks table with proper schema';
    ELSE
        RAISE NOTICE 'Tasks table already has relational schema - no changes needed';
    END IF;
END$$;

-- ============================================================================
-- Part 3: Ensure parent_task_id column exists in tasks (for hierarchical tasks)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN parent_task_id UUID;
        CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks (parent_task_id);
        RAISE NOTICE 'Added parent_task_id column to tasks';
    ELSE
        RAISE NOTICE 'parent_task_id column already exists in tasks';
    END IF;
END$$;
