-- Create links table if it doesn't exist
CREATE TABLE IF NOT EXISTS links (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS links_user_idx ON links(user_id);
CREATE INDEX IF NOT EXISTS links_item_idx ON links(item_id);
CREATE INDEX IF NOT EXISTS links_data_gin ON links USING GIN (data);
