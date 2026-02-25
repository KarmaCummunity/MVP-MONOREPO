-- KC MVP Database Schema
-- Full database schema for Karma Community MVP application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enhanced Users table with detailed profile information
-- This is the single source of truth for all user data - replaces legacy 'users' table
-- NOTE: id is UUID (standard identifier), firebase_uid is TEXT (for Firebase authentication linking)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE, -- Firebase UID for authentication linking (optional, can be null)
    google_id TEXT UNIQUE, -- Google ID (sub claim) for authentication linking (optional, can be null)
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    karma_points INTEGER DEFAULT 0,
    join_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Israel',
    interests TEXT[], -- Array of interests
    roles TEXT[] DEFAULT ARRAY['user'], -- user, org_admin, admin
    posts_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    total_donations_amount DECIMAL(10,2) DEFAULT 0,
    total_volunteer_hours INTEGER DEFAULT 0,
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{
        "language": "he",
        "dark_mode": false,
        "notifications_enabled": true,
        "privacy": "public"
    }'::jsonb,
    parent_manager_id UUID, -- REFERENCES user_profiles(id) ON DELETE SET NULL, -- For hierarchy management
    salary DECIMAL(10,2) DEFAULT 0, -- Manager salary in ILS
    seniority_start_date DATE DEFAULT CURRENT_DATE, -- Start date for seniority calculation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure parent_manager_id column exists (for existing tables that might not have it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'parent_manager_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN parent_manager_id UUID;
        -- Add foreign key constraint only if user_profiles table exists and constraint doesn't exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'user_profiles_parent_manager_id_fkey' AND table_name = 'user_profiles'
            ) THEN
                ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_parent_manager_id_fkey FOREIGN KEY (parent_manager_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Ensure salary column exists (for existing tables that might not have it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'salary'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN salary DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Ensure seniority_start_date column exists (for existing tables that might not have it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'seniority_start_date'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN seniority_start_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- NOTE: Legacy 'users' table is no longer used - all user data is in user_profiles
-- NOTE: user_id_mapping table has been removed - all user IDs are now unified as UUIDs in user_profiles
-- NOTE: links table has been removed - it contained duplicate user/item data

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    registration_number VARCHAR(50),
    organization_type VARCHAR(50), -- ngo, charity, community, etc.
    activity_areas TEXT[], -- Array of activity areas
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, pending
    created_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization applications (for org admin approval)
CREATE TABLE IF NOT EXISTS organization_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    organization_id UUID, -- REFERENCES organizations(id), -- Temporarily disabled for backward compatibility
    applicant_email VARCHAR(255) NOT NULL,
    org_name VARCHAR(255) NOT NULL,
    org_description TEXT,
    org_type VARCHAR(50),
    activity_areas TEXT[],
    contact_info JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    application_data JSONB,
    reviewed_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation categories table
CREATE TABLE IF NOT EXISTS donation_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- money, trump, knowledge, etc.
    name_he VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_he TEXT,
    description_en TEXT,
    icon VARCHAR(50), -- emoji or icon name
    color VARCHAR(7), -- hex color
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donations table with detailed tracking
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    recipient_id UUID, -- REFERENCES user_profiles(id), -- can be null for general donations, UUID to match user_profiles.id type
    organization_id UUID, -- REFERENCES organizations(id), -- Temporarily disabled for backward compatibility
    category_id UUID, -- REFERENCES donation_categories(id), -- Temporarily disabled for backward compatibility
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2), -- for money donations
    currency VARCHAR(3) DEFAULT 'ILS',
    type VARCHAR(20) NOT NULL, -- money, item, service, time, trump
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled, expired
    is_recurring BOOLEAN DEFAULT false,
    location JSONB, -- {city, address, coordinates}
    images TEXT[], -- array of image URLs
    tags TEXT[],
    metadata JSONB, -- flexible field for type-specific data
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rides table (Trump/carpooling)
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    title VARCHAR(255),
    from_location JSONB NOT NULL, -- {name, city, coordinates}
    to_location JSONB NOT NULL, -- {name, city, coordinates}
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ,
    available_seats INTEGER DEFAULT 1,
    price_per_seat DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    requirements TEXT, -- smoking, pets, etc.
    status VARCHAR(20) DEFAULT 'active', -- active, full, cancelled, completed
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ride requests/bookings
CREATE TABLE IF NOT EXISTS ride_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID, -- REFERENCES rides(id), -- Temporarily disabled for backward compatibility
    passenger_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    seats_requested INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ride_id, passenger_id)
);

-- Community events
CREATE TABLE IF NOT EXISTS community_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    organization_id UUID, -- REFERENCES organizations(id), -- Temporarily disabled for backward compatibility
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location JSONB, -- {name, address, city, coordinates}
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    category VARCHAR(50),
    tags TEXT[],
    image_url TEXT,
    is_virtual BOOLEAN DEFAULT false,
    meeting_link TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, completed
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event attendees
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID, -- REFERENCES community_events(id), -- Temporarily disabled for backward compatibility
    user_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    status VARCHAR(20) DEFAULT 'going', -- going, maybe, not_going
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Enhanced chat conversations
-- NOTE: All user ID fields (participants, created_by) use UUID[]/UUID to match user_profiles.id type
-- NOTE: participants is UUID[] array - all participant IDs are UUIDs
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    type VARCHAR(20) DEFAULT 'direct', -- direct, group
    participants UUID[] NOT NULL, -- Array of participant user IDs (UUIDs)
    created_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    last_message_id UUID, -- REFERENCES chat_messages(id), -- Temporarily disabled for backward compatibility
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages with rich content support
-- NOTE: All ID fields use UUID type for consistency
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL, -- REFERENCES chat_conversations(id), -- Temporarily disabled for backward compatibility
    sender_id UUID NOT NULL, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, voice, location, donation
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(100),
    metadata JSONB, -- coordinates for location, donation details, etc.
    reply_to_id UUID, -- REFERENCES chat_messages(id), -- Temporarily disabled for backward compatibility
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Read receipts for messages
-- NOTE: All ID fields use UUID type for consistency
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL, -- REFERENCES chat_messages(id), -- Temporarily disabled for backward compatibility
    user_id UUID NOT NULL, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- User activity tracking for analytics
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    activity_type VARCHAR(50) NOT NULL, -- login, donation, chat, view_category, etc.
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community statistics aggregated table
CREATE TABLE IF NOT EXISTS community_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_type VARCHAR(50) NOT NULL, -- money_donations, volunteer_hours, etc.
    stat_value BIGINT DEFAULT 0,
    city VARCHAR(100),
    date_period DATE, -- for daily/monthly aggregation
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stat_type, city, date_period)
);

-- User following relationships
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    following_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    title VARCHAR(255),
    content TEXT,
    notification_type VARCHAR(50), -- donation, message, event, system
    related_id UUID, -- ID of related donation, message, etc.
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure firebase_uid column exists (for backward compatibility with existing databases)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
-- Ensure google_id column exists (for backward compatibility with existing databases)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON user_profiles (LOWER(email));
-- Create firebase_uid index
CREATE INDEX IF NOT EXISTS idx_user_profiles_firebase_uid ON user_profiles (firebase_uid) WHERE firebase_uid IS NOT NULL;
-- Create google_id index
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles (google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles (city);
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles (is_active, last_active);

-- Only create parent_manager_id index if the column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'parent_manager_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_profiles_parent_manager_id ON user_profiles (parent_manager_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations (donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_category ON donations (category_id);
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations (type);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations (status);
CREATE INDEX IF NOT EXISTS idx_donations_location ON donations USING GIN (location);
CREATE INDEX IF NOT EXISTS idx_donations_created ON donations (created_at);

CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_departure ON rides (departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_from_location ON rides USING GIN (from_location);
CREATE INDEX IF NOT EXISTS idx_rides_to_location ON rides USING GIN (to_location);

-- Chat indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants ON chat_conversations USING GIN (participants); -- UUID[] array
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations (last_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by ON chat_conversations (created_by);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON chat_conversations (type);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id); -- UUID field
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages (reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages (message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted ON chat_messages (is_deleted) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts (message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts (user_id); -- UUID field
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_read_at ON message_read_receipts (read_at);

CREATE INDEX IF NOT EXISTS idx_community_events_date ON community_events (event_date);
CREATE INDEX IF NOT EXISTS idx_community_events_organizer ON community_events (organizer_id);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities (activity_type, created_at);

CREATE INDEX IF NOT EXISTS idx_community_stats_type ON community_stats (stat_type, date_period);
CREATE INDEX IF NOT EXISTS idx_community_stats_city ON community_stats (city, date_period);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS '
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
' language 'plpgsql';

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_donations_updated_at ON donations;
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rides_updated_at ON rides;
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tasks table for group task management
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, in_progress, stuck, testing, done, archived
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- low, medium, high
    category VARCHAR(50), -- development, marketing, operations, etc.
    due_date TIMESTAMPTZ,
    assignees UUID[] DEFAULT ARRAY[]::UUID[], -- UUID[] to match user_profiles.id type
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    checklist JSONB, -- [{id, text, done}]
    created_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    parent_task_id UUID, -- REFERENCES tasks(id) ON DELETE CASCADE, -- For subtasks hierarchy
    estimated_hours NUMERIC(10,2), -- Estimated hours for task completion
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure parent_task_id column exists (for existing tables that might not have it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN parent_task_id UUID;
        -- Add foreign key constraint only if tasks table exists and constraint doesn't exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'tasks_parent_task_id_fkey' AND table_name = 'tasks'
            ) THEN
                ALTER TABLE tasks ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees_gin ON tasks USING GIN (assignees); -- UUID[] array
CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin ON tasks USING GIN (tags);

-- Only create parent_task_id index if the column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks (parent_task_id);
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Task time logs table for tracking actual hours worked on tasks
CREATE TABLE IF NOT EXISTS task_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    actual_hours NUMERIC(10,2) NOT NULL CHECK (actual_hours > 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_logged_at ON task_time_logs(logged_at DESC);

-- Posts table for user posts and task-related posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL, -- Foreign key constraint added below in DO block
    task_id UUID, -- Foreign key constraint added below in DO block
    ride_id UUID, -- Foreign key constraint added below in DO block
    item_id TEXT, -- Foreign key constraint added below in DO block
    title VARCHAR(255) NOT NULL,
    description TEXT,
    images TEXT[],
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    post_type VARCHAR(50) DEFAULT 'task_completion', -- task_completion, task_assignment, general_update, donation, ride, item, etc.
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure author_id and task_id columns exist and have foreign key constraints
DO $$ 
BEGIN
    -- Drop existing foreign key constraints if they exist (from old schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_author_id_fkey' AND table_name = 'posts'
    ) THEN
        ALTER TABLE posts DROP CONSTRAINT posts_author_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_task_id_fkey' AND table_name = 'posts'
    ) THEN
        ALTER TABLE posts DROP CONSTRAINT posts_task_id_fkey;
    END IF;
    
    -- Add author_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'author_id'
    ) THEN
        -- Add column as nullable first (without constraint to avoid issues)
        ALTER TABLE posts ADD COLUMN author_id UUID;
        -- Update existing rows to have a default author_id if needed
        -- Only update if user_profiles has rows
        IF EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN
            UPDATE posts SET author_id = (SELECT id FROM user_profiles LIMIT 1) WHERE author_id IS NULL;
        END IF;
    END IF;
    
    -- Add foreign key constraint for author_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Only set NOT NULL if all rows have author_id
    IF NOT EXISTS (SELECT 1 FROM posts WHERE author_id IS NULL) THEN
        ALTER TABLE posts ALTER COLUMN author_id SET NOT NULL;
    END IF;
    
    -- Add task_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN task_id UUID;
    END IF;
    
    -- Add foreign key constraint for task_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE posts ADD CONSTRAINT posts_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
    END IF;
    
    -- Add ride_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'ride_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN ride_id UUID;
    END IF;
    
    -- Add foreign key constraint for ride_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rides') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'posts_ride_id_fkey' AND table_name = 'posts'
        ) THEN
            ALTER TABLE posts ADD CONSTRAINT posts_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Check if item_id exists and is UUID (fix for previous failed schema update)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'item_id' AND data_type = 'uuid'
    ) THEN
        -- Drop foreign key if exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'posts_item_id_fkey' AND table_name = 'posts'
        ) THEN
            ALTER TABLE posts DROP CONSTRAINT posts_item_id_fkey;
        END IF;
        
        -- Convert column to TEXT
        ALTER TABLE posts ALTER COLUMN item_id TYPE TEXT;
    END IF;

    -- Add item_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'item_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN item_id TEXT;
    END IF;
    
    -- Add foreign key constraint for item_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'posts_item_id_fkey' AND table_name = 'posts'
        ) THEN
            ALTER TABLE posts ADD CONSTRAINT posts_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Add post_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'post_type'
    ) THEN
        ALTER TABLE posts ADD COLUMN post_type VARCHAR(50) DEFAULT 'task_completion';
    END IF;
    
    -- Add created_at if missing (should always exist, but check just in case)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE posts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Only create indexes if the columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'author_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'task_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'ride_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_posts_ride_id ON posts(ride_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'item_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_posts_item_id ON posts(item_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'post_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Post Likes table - tracks which users liked which posts
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- Each user can only like a post once
);

-- Add foreign key constraints for post_likes
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_likes_post_id_fkey' AND table_name = 'post_likes'
    ) THEN
        ALTER TABLE post_likes DROP CONSTRAINT post_likes_post_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_likes_user_id_fkey' AND table_name = 'post_likes'
    ) THEN
        ALTER TABLE post_likes DROP CONSTRAINT post_likes_user_id_fkey;
    END IF;
    
    -- Add constraints only if target tables AND columns exist
    -- This prevents errors when old tables exist with different structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'id'
    ) THEN
        ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey 
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'id'
    ) THEN
        ALTER TABLE post_likes ADD CONSTRAINT post_likes_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);

-- Post Comments table - stores all comments on posts
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 2000),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints for post_comments
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_comments_post_id_fkey' AND table_name = 'post_comments'
    ) THEN
        ALTER TABLE post_comments DROP CONSTRAINT post_comments_post_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_comments_user_id_fkey' AND table_name = 'post_comments'
    ) THEN
        ALTER TABLE post_comments DROP CONSTRAINT post_comments_user_id_fkey;
    END IF;
    
    -- Add constraints only if target tables AND columns exist
    -- This prevents errors when old tables exist with different structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'id'
    ) THEN
        ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey 
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'id'
    ) THEN
        ALTER TABLE post_comments ADD CONSTRAINT post_comments_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes for post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- Trigger for post_comments updated_at
DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at 
    BEFORE UPDATE ON post_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comment Likes table - tracks which users liked which comments
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id) -- Each user can only like a comment once
);

-- Add foreign key constraints for comment_likes
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_likes_comment_id_fkey' AND table_name = 'comment_likes'
    ) THEN
        ALTER TABLE comment_likes DROP CONSTRAINT comment_likes_comment_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_likes_user_id_fkey' AND table_name = 'comment_likes'
    ) THEN
        ALTER TABLE comment_likes DROP CONSTRAINT comment_likes_user_id_fkey;
    END IF;
    
    -- Add constraints only if target tables AND columns exist
    -- This prevents errors when old tables exist with different structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'post_comments' AND column_name = 'id'
    ) THEN
        ALTER TABLE comment_likes ADD CONSTRAINT comment_likes_comment_id_fkey 
            FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'id'
    ) THEN
        ALTER TABLE comment_likes ADD CONSTRAINT comment_likes_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Functions to update like/comment counts on posts automatically

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes = likes + 1, updated_at = NOW() WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes = GREATEST(0, likes - 1), updated_at = NOW() WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments = comments + 1, updated_at = NOW() WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments = GREATEST(0, comments - 1), updated_at = NOW() WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE post_comments SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_comments SET likes_count = GREATEST(0, likes_count - 1), updated_at = NOW() WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update counts when likes/comments are added/removed
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON post_comments;
CREATE TRIGGER trigger_update_post_comments_count
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_comments_count();

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_count();

-- Items table for item donations/deliveries
-- NOTE: id is TEXT to support various identifier formats
-- NOTE: owner_id is UUID (references user_profiles.id) - all users must be in user_profiles
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- furniture, clothes, electronics, general, etc.
    condition VARCHAR(20), -- new, like_new, used, for_parts
    
    -- Location as separate columns plus JSONB for flexibility
    location JSONB, -- {city, address, coordinates}
    city VARCHAR(100),
    address TEXT,
    coordinates VARCHAR(100), -- stored as "lat,lng" string
    
    price DECIMAL(10,2) DEFAULT 0, -- 0 means free
    image_base64 TEXT, -- base64 encoded image
    rating INTEGER DEFAULT 0,
    tags TEXT, -- comma-separated tags
    quantity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, delivered, expired, cancelled
    delivery_method VARCHAR(20) DEFAULT 'pickup', -- pickup, delivery, shipping
    
    -- Soft delete fields
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_is_deleted ON items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Item requests/bookings for delivery workflow
-- NOTE: item_id is TEXT to match items.id type
-- NOTE: requester_id is UUID (references user_profiles.id) - all users must be in user_profiles
CREATE TABLE IF NOT EXISTS item_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id TEXT, -- Changed from UUID to TEXT to match items.id type
    requester_id UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, scheduled, completed, cancelled
    message TEXT,
    proposed_time TIMESTAMPTZ,
    delivery_method VARCHAR(20), -- pickup, delivery, shipping
    meeting_location JSONB, -- {address, city, coordinates: {lat, lng}}
    owner_response TEXT, -- response from item owner
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for items table
-- Note: idx_items_owner_id, idx_items_category, idx_items_status already created above (lines 391-393)
CREATE INDEX IF NOT EXISTS idx_items_condition ON items (condition);
-- Note: No location field in items table - location data is stored in separate columns: city, address, coordinates
CREATE INDEX IF NOT EXISTS idx_items_created ON items (created_at);
CREATE INDEX IF NOT EXISTS idx_items_price ON items (price);
-- Note: tags is TEXT (not TEXT[]), so regular index instead of GIN
CREATE INDEX IF NOT EXISTS idx_items_tags ON items (tags);

-- Full-text search index for items (using pg_trgm)
CREATE INDEX IF NOT EXISTS idx_items_title_trgm ON items USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_items_description_trgm ON items USING GIN (description gin_trgm_ops);

-- Indexes for item_requests table
CREATE INDEX IF NOT EXISTS idx_item_requests_item ON item_requests (item_id);
CREATE INDEX IF NOT EXISTS idx_item_requests_requester ON item_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_item_requests_status ON item_requests (status);
CREATE INDEX IF NOT EXISTS idx_item_requests_created ON item_requests (created_at);

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_requests_updated_at ON item_requests;
CREATE TRIGGER update_item_requests_updated_at BEFORE UPDATE ON item_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Community members/people records table for admin management
CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL, -- התפקיד/התרומה שלו לקהילה
    description TEXT, -- תיאור נוסף על התרומה
    contact_info JSONB, -- {email, phone, etc.}
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    created_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for community_members
CREATE INDEX IF NOT EXISTS idx_community_members_name ON community_members (name);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members (role);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members (status);
CREATE INDEX IF NOT EXISTS idx_community_members_created_at ON community_members (created_at DESC);

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_community_members_updated_at ON community_members;
CREATE TRIGGER update_community_members_updated_at BEFORE UPDATE ON community_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: links table has been removed - it contained duplicate user/item data
-- All user data is now unified in user_profiles table with UUID identifiers

-- Admin Dynamic Tables - Custom tables management for admins
CREATE TABLE IF NOT EXISTS admin_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID, -- REFERENCES user_profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Table Columns - Column definitions for each table
CREATE TABLE IF NOT EXISTS admin_table_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL, -- REFERENCES admin_tables(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'number', 'date')),
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_table_column_name UNIQUE (table_id, name)
);

-- Admin Table Rows - Data rows for each table
CREATE TABLE IF NOT EXISTS admin_table_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL, -- REFERENCES admin_tables(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID, -- REFERENCES user_profiles(id) ON DELETE SET NULL,
    updated_by UUID, -- REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin_tables
CREATE INDEX IF NOT EXISTS idx_admin_tables_created_by ON admin_tables(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_tables_created_at ON admin_tables(created_at DESC);

-- Indexes for admin_table_columns
CREATE INDEX IF NOT EXISTS idx_admin_table_columns_table_id ON admin_table_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_admin_table_columns_display_order ON admin_table_columns(table_id, display_order);

-- Indexes for admin_table_rows
CREATE INDEX IF NOT EXISTS idx_admin_table_rows_table_id ON admin_table_rows(table_id);
CREATE INDEX IF NOT EXISTS idx_admin_table_rows_created_by ON admin_table_rows(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_table_rows_created_at ON admin_table_rows(table_id, created_at DESC);
-- GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_admin_table_rows_data_gin ON admin_table_rows USING GIN (data);

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_admin_tables_updated_at ON admin_tables;
CREATE TRIGGER update_admin_tables_updated_at BEFORE UPDATE ON admin_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_table_rows_updated_at ON admin_table_rows;
CREATE TRIGGER update_admin_table_rows_updated_at BEFORE UPDATE ON admin_table_rows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

