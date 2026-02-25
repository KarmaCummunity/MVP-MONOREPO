-- Migration to ensure google_id and roles columns exist in user_profiles table
-- This is a safe migration that only adds columns if they don't exist

-- Add google_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'google_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN google_id TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles (google_id) WHERE google_id IS NOT NULL;
        RAISE NOTICE 'Added google_id column to user_profiles';
    ELSE
        RAISE NOTICE 'google_id column already exists in user_profiles';
    END IF;
END$$;

-- Ensure roles column exists (should already exist from schema.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'roles'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN roles TEXT[] DEFAULT ARRAY['user'];
        CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles USING GIN (roles);
        RAISE NOTICE 'Added roles column to user_profiles';
    ELSE
        RAISE NOTICE 'roles column already exists in user_profiles';
    END IF;
END$$;

RAISE NOTICE 'Migration completed successfully';
