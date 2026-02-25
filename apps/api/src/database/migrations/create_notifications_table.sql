-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    user_id TEXT NOT NULL,          -- User who receives the notification (partition key)
    item_id TEXT NOT NULL,          -- UUID for the notification itself
    data JSONB NOT NULL,            -- The notification content (title, body, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- Index for listing by user and date (sorting)
CREATE INDEX IF NOT EXISTS idx_notifications_user_timestamp 
ON notifications (user_id, (data->>'timestamp') DESC);

-- Index for finding unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications (user_id) 
WHERE (data->>'read')::boolean = false;
