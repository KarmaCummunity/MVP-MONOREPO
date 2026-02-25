-- Community Group Challenges Schema for KC-MVP
-- Tables for storing community challenges, participants, and entries
-- Note: Using "community_group_challenges" prefix to avoid conflicts with existing "challenges" table (personal timers)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main community challenges table
CREATE TABLE IF NOT EXISTS community_group_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT, -- Challenge image (optional, has default)
  type VARCHAR(20) NOT NULL CHECK (type IN ('BOOLEAN', 'NUMERIC', 'DURATION')),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'FLEXIBLE')),
  goal_value DECIMAL(10,2), -- Optional target value
  deadline TIMESTAMPTZ, -- Optional deadline
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  category VARCHAR(50), -- Challenge category
  is_active BOOLEAN DEFAULT true,
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add image_url column if it doesn't exist (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_group_challenges' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE community_group_challenges ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Add goal_direction column if it doesn't exist (for success/failure calculation)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_group_challenges' AND column_name = 'goal_direction'
    ) THEN
        -- Step 1: Add column without default
        ALTER TABLE community_group_challenges 
        ADD COLUMN goal_direction VARCHAR(20) 
        CHECK (goal_direction IN ('maximize', 'minimize'));
        
        -- Step 2: Migration - update existing NUMERIC/DURATION challenges with goal_value
        UPDATE community_group_challenges 
        SET goal_direction = 'maximize' 
        WHERE type IN ('NUMERIC', 'DURATION') 
          AND goal_value IS NOT NULL
          AND goal_direction IS NULL;
    END IF;
END $$;

-- Challenge participants table
CREATE TABLE IF NOT EXISTS community_challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES community_group_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_entries INTEGER DEFAULT 0,
  last_entry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Challenge entries table (daily progress tracking)
CREATE TABLE IF NOT EXISTS community_challenge_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES community_group_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  value DECIMAL(10,2) NOT NULL, -- 0/1 for BOOLEAN, number for NUMERIC, minutes for DURATION
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, entry_date)
);

-- Add community_challenge_id column to posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'community_challenge_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN community_challenge_id UUID 
          REFERENCES community_group_challenges(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_challenges_creator ON community_group_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_challenges_active ON community_group_challenges(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_community_challenges_category ON community_group_challenges(category);
CREATE INDEX IF NOT EXISTS idx_community_challenges_created_at ON community_group_challenges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_challenges_deadline ON community_group_challenges(deadline) WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON community_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON community_challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_joined_at ON community_challenge_participants(joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON community_challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_user ON community_challenge_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_date ON community_challenge_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge_user ON community_challenge_entries(challenge_id, user_id);

-- Optimized index for daily tracker queries
CREATE INDEX IF NOT EXISTS idx_challenge_entries_tracker 
ON community_challenge_entries(user_id, challenge_id, entry_date DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_challenge_entries_date_range 
ON community_challenge_entries(user_id, entry_date DESC) 
WHERE entry_date >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_posts_community_challenge ON posts(community_challenge_id) WHERE community_challenge_id IS NOT NULL;

-- Trigger for updated_at on community_group_challenges
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_community_challenges_updated_at ON community_group_challenges;
CREATE TRIGGER update_community_challenges_updated_at 
  BEFORE UPDATE ON community_group_challenges 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_challenge_participants_updated_at ON community_challenge_participants;
CREATE TRIGGER update_challenge_participants_updated_at 
  BEFORE UPDATE ON community_challenge_participants 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE community_group_challenges IS 'Community challenges that users can create and join together';
COMMENT ON TABLE community_challenge_participants IS 'Users who have joined community challenges';
COMMENT ON TABLE community_challenge_entries IS 'Daily entries/progress for community challenges';
COMMENT ON COLUMN community_group_challenges.type IS 'BOOLEAN (yes/no), NUMERIC (count/amount), DURATION (time in minutes)';
COMMENT ON COLUMN community_group_challenges.frequency IS 'DAILY (every day), WEEKLY (once per week), FLEXIBLE (custom schedule)';
COMMENT ON COLUMN community_group_challenges.goal_direction IS 'maximize (value >= goal_value = success) or minimize (value < goal_value = success). NULL for BOOLEAN or challenges without numeric goals';
COMMENT ON COLUMN community_challenge_entries.value IS '0/1 for BOOLEAN, number for NUMERIC, minutes for DURATION';
