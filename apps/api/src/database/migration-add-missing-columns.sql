-- Migration: Add missing columns to user_profiles table
-- Purpose: Sync Docker database schema with expected schema
-- Safe to run multiple times (idempotent)

-- Add parent_manager_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='parent_manager_id') THEN
        ALTER TABLE user_profiles ADD COLUMN parent_manager_id UUID;
        RAISE NOTICE 'Added column: parent_manager_id';
    ELSE
        RAISE NOTICE 'Column parent_manager_id already exists';
    END IF;
END $$;

-- Add settings column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='settings') THEN
        ALTER TABLE user_profiles ADD COLUMN settings JSONB DEFAULT '{"privacy": "public", "language": "he", "dark_mode": false, "notifications_enabled": true}'::jsonb;
        RAISE NOTICE 'Added column: settings';
    ELSE
        RAISE NOTICE 'Column settings already exists';
    END IF;
END $$;

-- Add total_donations_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='total_donations_amount') THEN
        ALTER TABLE user_profiles ADD COLUMN total_donations_amount NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE 'Added column: total_donations_amount';
    ELSE
        RAISE NOTICE 'Column total_donations_amount already exists';
    END IF;
END $$;

-- Add total_volunteer_hours column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='total_volunteer_hours') THEN
        ALTER TABLE user_profiles ADD COLUMN total_volunteer_hours INTEGER DEFAULT 0;
        RAISE NOTICE 'Added column: total_volunteer_hours';
    ELSE
        RAISE NOTICE 'Column total_volunteer_hours already exists';
    END IF;
END $$;

-- Add posts_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='posts_count') THEN
        ALTER TABLE user_profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added column: posts_count';
    ELSE
        RAISE NOTICE 'Column posts_count already exists';
    END IF;
END $$;

-- Add followers_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='followers_count') THEN
        ALTER TABLE user_profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added column: followers_count';
    ELSE
        RAISE NOTICE 'Column followers_count already exists';
    END IF;
END $$;

-- Add following_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='following_count') THEN
        ALTER TABLE user_profiles ADD COLUMN following_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added column: following_count';
    ELSE
        RAISE NOTICE 'Column following_count already exists';
    END IF;
END $$;

-- Add email_verified column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='email_verified') THEN
        ALTER TABLE user_profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added column: email_verified';
    ELSE
        RAISE NOTICE 'Column email_verified already exists';
    END IF;
END $$;

-- Add interests column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='interests') THEN
        ALTER TABLE user_profiles ADD COLUMN interests TEXT[];
        RAISE NOTICE 'Added column: interests';
    ELSE
        RAISE NOTICE 'Column interests already exists';
    END IF;
END $$;

-- Add country column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='country') THEN
        ALTER TABLE user_profiles ADD COLUMN country VARCHAR(100) DEFAULT 'Israel';
        RAISE NOTICE 'Added column: country';
    ELSE
        RAISE NOTICE 'Column country already exists';
    END IF;
END $$;

-- Add password_hash column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='password_hash') THEN
        ALTER TABLE user_profiles ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added column: password_hash';
    ELSE
        RAISE NOTICE 'Column password_hash already exists';
    END IF;
END $$;

-- Add foreign key constraint for parent_manager_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='user_profiles_parent_manager_id_fkey' 
                   AND table_name='user_profiles') THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_parent_manager_id_fkey 
        FOREIGN KEY (parent_manager_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint: user_profiles_parent_manager_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint user_profiles_parent_manager_id_fkey already exists';
    END IF;
END $$;

-- Add index for parent_manager_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE indexname='idx_user_profiles_parent_manager') THEN
        CREATE INDEX idx_user_profiles_parent_manager ON user_profiles(parent_manager_id);
        RAISE NOTICE 'Added index: idx_user_profiles_parent_manager';
    ELSE
        RAISE NOTICE 'Index idx_user_profiles_parent_manager already exists';
    END IF;
END $$;

-- Migrate data from notification_preferences and privacy_settings to settings if needed
DO $$ 
BEGIN
    -- Only migrate if settings column exists and notification_preferences exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_profiles' AND column_name='settings')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='notification_preferences') THEN
        
        UPDATE user_profiles 
        SET settings = jsonb_build_object(
            'privacy', COALESCE(privacy_settings->>'privacy', 'public'),
            'language', 'he',
            'dark_mode', false,
            'notifications_enabled', COALESCE((notification_preferences->>'enabled')::boolean, true)
        )
        WHERE settings IS NULL OR settings = '{}'::jsonb;
        
        RAISE NOTICE 'Migrated notification_preferences and privacy_settings to settings';
    END IF;
END $$;

-- Copy profile_image to avatar_url if avatar_url doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_profiles' AND column_name='profile_image')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='user_profiles' AND column_name='avatar_url') THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        UPDATE user_profiles SET avatar_url = profile_image WHERE profile_image IS NOT NULL;
        RAISE NOTICE 'Copied profile_image to avatar_url';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='user_profiles' AND column_name='avatar_url') THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added column: avatar_url';
    ELSE
        RAISE NOTICE 'Column avatar_url already exists';
    END IF;
END $$;

-- Make email NOT NULL if it isn't already
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_profiles' AND column_name='email' AND is_nullable='YES') THEN
        -- First set empty emails to a placeholder
        UPDATE user_profiles SET email = 'unknown_' || id::text || '@placeholder.com' WHERE email IS NULL OR email = '';
        -- Then make it NOT NULL
        ALTER TABLE user_profiles ALTER COLUMN email SET NOT NULL;
        RAISE NOTICE 'Made email column NOT NULL';
    ELSE
        RAISE NOTICE 'Email column is already NOT NULL';
    END IF;
END $$;

-- Add unique constraint on email if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='user_profiles_email_key' 
                   AND table_name='user_profiles') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
        RAISE NOTICE 'Added unique constraint on email';
    ELSE
        RAISE NOTICE 'Unique constraint on email already exists';
    END IF;
END $$;

\echo '✅ Migration completed successfully'
