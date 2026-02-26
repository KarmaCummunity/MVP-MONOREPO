-- Migration: Add missing columns to user_profiles table
-- Purpose: Sync Docker database schema with expected schema
-- Safe to run multiple times (idempotent)
-- Uses single DO block and constants to avoid string literal duplication (plsql:S1192)

DO $$
DECLARE
    c_tbl CONSTANT TEXT := 'user_profiles';
    c_schema TEXT;
BEGIN
    c_schema := current_schema();

    -- Add parent_manager_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'parent_manager_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN parent_manager_id UUID', c_tbl);
        RAISE NOTICE 'Added column: parent_manager_id';
    ELSE
        RAISE NOTICE 'Column parent_manager_id already exists';
    END IF;

    -- Add settings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'settings') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN settings JSONB DEFAULT %L::jsonb', c_tbl,
            '{"privacy": "public", "language": "he", "dark_mode": false, "notifications_enabled": true}');
        RAISE NOTICE 'Added column: settings';
    ELSE
        RAISE NOTICE 'Column settings already exists';
    END IF;

    -- Add total_donations_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'total_donations_amount') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN total_donations_amount NUMERIC(10,2) DEFAULT 0', c_tbl);
        RAISE NOTICE 'Added column: total_donations_amount';
    ELSE
        RAISE NOTICE 'Column total_donations_amount already exists';
    END IF;

    -- Add total_volunteer_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'total_volunteer_hours') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN total_volunteer_hours INTEGER DEFAULT 0', c_tbl);
        RAISE NOTICE 'Added column: total_volunteer_hours';
    ELSE
        RAISE NOTICE 'Column total_volunteer_hours already exists';
    END IF;

    -- Add posts_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'posts_count') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN posts_count INTEGER DEFAULT 0', c_tbl);
        RAISE NOTICE 'Added column: posts_count';
    ELSE
        RAISE NOTICE 'Column posts_count already exists';
    END IF;

    -- Add followers_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'followers_count') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN followers_count INTEGER DEFAULT 0', c_tbl);
        RAISE NOTICE 'Added column: followers_count';
    ELSE
        RAISE NOTICE 'Column followers_count already exists';
    END IF;

    -- Add following_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'following_count') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN following_count INTEGER DEFAULT 0', c_tbl);
        RAISE NOTICE 'Added column: following_count';
    ELSE
        RAISE NOTICE 'Column following_count already exists';
    END IF;

    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'email_verified') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN email_verified BOOLEAN DEFAULT false', c_tbl);
        RAISE NOTICE 'Added column: email_verified';
    ELSE
        RAISE NOTICE 'Column email_verified already exists';
    END IF;

    -- Add interests column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'interests') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN interests TEXT[]', c_tbl);
        RAISE NOTICE 'Added column: interests';
    ELSE
        RAISE NOTICE 'Column interests already exists';
    END IF;

    -- Add country column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'country') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN country VARCHAR(100) DEFAULT %L', c_tbl, 'Israel');
        RAISE NOTICE 'Added column: country';
    ELSE
        RAISE NOTICE 'Column country already exists';
    END IF;

    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'password_hash') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN password_hash TEXT', c_tbl);
        RAISE NOTICE 'Added column: password_hash';
    ELSE
        RAISE NOTICE 'Column password_hash already exists';
    END IF;

    -- Add foreign key constraint for parent_manager_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_schema = c_schema AND constraint_name = 'user_profiles_parent_manager_id_fkey' AND table_name = c_tbl) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT user_profiles_parent_manager_id_fkey FOREIGN KEY (parent_manager_id) REFERENCES %I(id) ON DELETE SET NULL', c_tbl, c_tbl);
        RAISE NOTICE 'Added foreign key constraint: user_profiles_parent_manager_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint user_profiles_parent_manager_id_fkey already exists';
    END IF;

    -- Add index for parent_manager_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = c_schema AND indexname = 'idx_user_profiles_parent_manager') THEN
        EXECUTE format('CREATE INDEX idx_user_profiles_parent_manager ON %I(parent_manager_id)', c_tbl);
        RAISE NOTICE 'Added index: idx_user_profiles_parent_manager';
    ELSE
        RAISE NOTICE 'Index idx_user_profiles_parent_manager already exists';
    END IF;

    -- Migrate data from notification_preferences and privacy_settings to settings if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'settings')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'notification_preferences') THEN
        EXECUTE format('UPDATE %I SET settings = jsonb_build_object(' ||
            '''privacy'', COALESCE(privacy_settings->>''privacy'', ''public''), ' ||
            '''language'', ''he'', ''dark_mode'', false, ' ||
            '''notifications_enabled'', COALESCE((notification_preferences->>''enabled'')::boolean, true)) ' ||
            'WHERE settings IS NULL OR settings = ''{}''::jsonb', c_tbl);
        RAISE NOTICE 'Migrated notification_preferences and privacy_settings to settings';
    END IF;

    -- Copy profile_image to avatar_url if avatar_url doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'profile_image')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'avatar_url') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN avatar_url TEXT', c_tbl);
        EXECUTE format('UPDATE %I SET avatar_url = profile_image WHERE profile_image IS NOT NULL', c_tbl);
        RAISE NOTICE 'Copied profile_image to avatar_url';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'avatar_url') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN avatar_url TEXT', c_tbl);
        RAISE NOTICE 'Added column: avatar_url';
    ELSE
        RAISE NOTICE 'Column avatar_url already exists';
    END IF;

    -- Make email NOT NULL if it isn't already
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = c_schema AND table_name = c_tbl AND column_name = 'email' AND is_nullable = 'YES') THEN
        EXECUTE format('UPDATE %I SET email = ''unknown_'' || id::text || ''@placeholder.com'' WHERE email IS NULL OR email = ''''', c_tbl);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN email SET NOT NULL', c_tbl);
        RAISE NOTICE 'Made email column NOT NULL';
    ELSE
        RAISE NOTICE 'Email column is already NOT NULL';
    END IF;

    -- Add unique constraint on email if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_schema = c_schema AND constraint_name = 'user_profiles_email_key' AND table_name = c_tbl) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT user_profiles_email_key UNIQUE (email)', c_tbl);
        RAISE NOTICE 'Added unique constraint on email';
    ELSE
        RAISE NOTICE 'Unique constraint on email already exists';
    END IF;
END $$;

\echo '✅ Migration completed successfully'
