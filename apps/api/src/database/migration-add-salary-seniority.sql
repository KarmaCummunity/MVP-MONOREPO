-- Migration: Add salary and seniority_start_date columns to user_profiles table
-- Purpose: Add manager salary and seniority tracking fields
-- Safe to run multiple times (idempotent)

-- Add salary column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='salary') THEN
        ALTER TABLE user_profiles ADD COLUMN salary DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Added column: salary';
    ELSE
        RAISE NOTICE 'Column salary already exists';
    END IF;
END $$;

-- Add seniority_start_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='seniority_start_date') THEN
        ALTER TABLE user_profiles ADD COLUMN seniority_start_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added column: seniority_start_date';
    ELSE
        RAISE NOTICE 'Column seniority_start_date already exists';
    END IF;
END $$;

-- Update existing records: set salary to 0 if NULL, and seniority_start_date to CURRENT_DATE if NULL
DO $$ 
BEGIN
    UPDATE user_profiles 
    SET salary = COALESCE(salary, 0)
    WHERE salary IS NULL;
    
    UPDATE user_profiles 
    SET seniority_start_date = COALESCE(seniority_start_date, CURRENT_DATE)
    WHERE seniority_start_date IS NULL;
    
    RAISE NOTICE 'Updated existing records with default values';
END $$;

\echo '✅ Migration completed successfully'





