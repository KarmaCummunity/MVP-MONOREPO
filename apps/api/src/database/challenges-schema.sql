-- Challenges/Timers Schema for KC-MVP
-- Tables for storing user challenges (timers), reset logs, and record breaks

-- Main challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date BIGINT NOT NULL,
  time_unit VARCHAR(20) NOT NULL CHECK (time_unit IN ('seconds', 'minutes', 'hours', 'days', 'weeks', 'months')),
  custom_reset_amount INTEGER NOT NULL CHECK (custom_reset_amount > 0),
  current_value BIGINT NOT NULL DEFAULT 0,
  last_calculated BIGINT NOT NULL,
  current_streak BIGINT NOT NULL DEFAULT 0,
  best_streak BIGINT NOT NULL DEFAULT 0,
  reset_count INTEGER NOT NULL DEFAULT 0,
  last_reset_date BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deleted challenges history
CREATE TABLE IF NOT EXISTS deleted_challenges (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date BIGINT NOT NULL,
  time_unit VARCHAR(20) NOT NULL,
  custom_reset_amount INTEGER NOT NULL,
  current_value BIGINT NOT NULL,
  last_calculated BIGINT NOT NULL,
  current_streak BIGINT NOT NULL,
  best_streak BIGINT NOT NULL,
  reset_count INTEGER NOT NULL,
  last_reset_date BIGINT NOT NULL,
  deleted_at BIGINT NOT NULL,
  final_value BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenge reset logs
CREATE TABLE IF NOT EXISTS challenge_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  amount_reduced INTEGER NOT NULL,
  reason TEXT NOT NULL,
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  value_before_reset BIGINT NOT NULL,
  value_after_reset BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challenge record breaks
CREATE TABLE IF NOT EXISTS challenge_record_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  old_record BIGINT NOT NULL,
  new_record BIGINT NOT NULL,
  improvement BIGINT NOT NULL,
  context TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Global challenge stats per user
CREATE TABLE IF NOT EXISTS challenge_global_stats (
  user_id VARCHAR(255) PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  total_resets INTEGER NOT NULL DEFAULT 0,
  last_reset_date BIGINT NOT NULL,
  last_check_date BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON challenges(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deleted_challenges_user_id ON deleted_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_challenges_deleted_at ON deleted_challenges(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_reset_logs_user_id ON challenge_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_logs_challenge_id ON challenge_reset_logs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_reset_logs_timestamp ON challenge_reset_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_record_breaks_user_id ON challenge_record_breaks(user_id);
CREATE INDEX IF NOT EXISTS idx_record_breaks_challenge_id ON challenge_record_breaks(challenge_id);
CREATE INDEX IF NOT EXISTS idx_record_breaks_timestamp ON challenge_record_breaks(timestamp DESC);

-- Comments for documentation
-- COMMENT ON TABLE challenges IS 'User challenges/timers for tracking personal goals';
-- COMMENT ON TABLE deleted_challenges IS 'Soft-deleted challenges kept for history';
-- COMMENT ON TABLE challenge_reset_logs IS 'Log of all challenge resets with mood and reason';
-- COMMENT ON TABLE challenge_record_breaks IS 'Log of personal record breaks';
-- COMMENT ON TABLE challenge_global_stats IS 'Global statistics per user across all challenges';
