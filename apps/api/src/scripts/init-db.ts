// File overview:
// - Purpose: One-off/dev script to ensure minimal DB schema and indexes exist for local E2E runs.
// - Reached from: Client script `scripts/run-local-e2e.sh` before starting server.
// - Provides: Creates `community_stats`, `donation_categories`, relational `donations`, plus a set of JSONB tables for generic items and messaging.
// - Also: Ensures rides + ride_bookings tables; seeds default categories; prints success on completion.
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "kc",
    password: process.env.POSTGRES_PASSWORD || "kc_password",
    database: process.env.POSTGRES_DB || "kc_db",
  });

  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    // Minimal relational tables to satisfy new controllers when skipping full schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_stats (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stat_type VARCHAR(50) NOT NULL,
        stat_value BIGINT DEFAULT 0,
        city VARCHAR(100),
        date_period DATE,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(stat_type, city, date_period)
      );
    `);
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_community_stats_type ON community_stats (stat_type, date_period);",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_community_stats_city ON community_stats (city, date_period);",
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS donation_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug VARCHAR(50) UNIQUE NOT NULL,
        name_he VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        description_he TEXT,
        description_en TEXT,
        icon VARCHAR(50),
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        donor_id UUID,
        recipient_id UUID,
        organization_id UUID,
        category_id UUID,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'ILS',
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        location JSONB,
        images TEXT[],
        tags TEXT[],
        metadata JSONB,
        expires_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const baseTable = (name: string) => `
      CREATE TABLE IF NOT EXISTS ${name} (
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, item_id)
      );
      CREATE INDEX IF NOT EXISTS ${name}_user_idx ON ${name}(user_id);
      CREATE INDEX IF NOT EXISTS ${name}_item_idx ON ${name}(item_id);
      CREATE INDEX IF NOT EXISTS ${name}_data_gin ON ${name} USING GIN (data);
    `;

    const tables = [
      "users",
      // 'posts' - handled separately as relational table (not JSONB)
      "followers",
      "following",
      "chats",
      "messages",
      "notifications",
      "bookmarks",
      "settings",
      "media",
      "blocked_users",
      "message_reactions",
      "typing_status",
      "read_receipts",
      "voice_messages",
      "conversation_metadata",
      // Organizations / NGO onboarding
      "organizations",
      "org_applications",
      // Links (for groups and organizations)
      "links",
      "analytics",
    ];

    for (const t of tables) {
      // eslint-disable-next-line no-console
      console.log(`Ensuring table: ${t}`);

      try {
        // 1. Create Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${t} (
            user_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, item_id)
          );
        `);

        // 2. Create Indexes (Individually)
        // Check if index exists is tricky in one-liner, but IF NOT EXISTS handles it.
        // However, we catch errors individually.

        await client.query(
          `CREATE INDEX IF NOT EXISTS ${t}_user_idx ON ${t}(user_id);`,
        );
        await client.query(
          `CREATE INDEX IF NOT EXISTS ${t}_item_idx ON ${t}(item_id);`,
        );
        await client.query(
          `CREATE INDEX IF NOT EXISTS ${t}_data_gin ON ${t} USING GIN (data);`,
        );
      } catch (e) {
        const err = e as Error & { code?: string };
        console.error(`❌ Error initializing table '${t}':`, err.message);
        if (err.code === "42501") {
          // Permission denied - try to grant myself? No.
          // Check ownership?
          const res = await client.query(
            `
               SELECT tableowner FROM pg_tables WHERE tablename = $1
            `,
            [t],
          );
          console.log(
            `Owner of ${t}:`,
            res.rows[0]?.tableowner || "Unknown (table might not exist)",
          );
        }
        throw err;
      }
    }

    // Check if tasks table exists in new schema format (with 'title' column)
    // If it does, skip creating the legacy JSONB version
    const newTasks = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'title'
      ) AS exists;
    `);

    if (!newTasks?.rows?.[0]?.exists) {
      // Create legacy JSONB tasks table only if new schema doesn't exist
      // eslint-disable-next-line no-console
      console.log("Ensuring table: tasks (legacy JSONB format)");
      await client.query(baseTable("tasks"));
    } else {
      // eslint-disable-next-line no-console
      console.log(
        "✅ Tasks table exists in new schema format - skipping legacy creation",
      );
    }

    // Index for email lookup in users table
    await client.query(
      `CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users ((lower(data->>'email')))`,
    );

    // If a legacy JSONB donations table exists (with 'data' column) — replace it with relational schema for APIs
    const legacyDonations = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'donations' AND column_name = 'data'
      ) AS exists;
    `);
    if (legacyDonations?.rows?.[0]?.exists) {
      // eslint-disable-next-line no-console
      console.warn(
        "⚠️  Replacing legacy JSONB donations table with relational schema",
      );
      await client.query("DROP TABLE IF EXISTS donations CASCADE;");
    }
    // Ensure relational donations table exists (id/donor_id/...)
    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        donor_id UUID,
        recipient_id UUID,
        organization_id UUID,
        category_id UUID,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'ILS',
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        location JSONB,
        images TEXT[],
        tags TEXT[],
        metadata JSONB,
        expires_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Create indexes only if columns exist (safe on re-run)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='donations' AND column_name='donor_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations (donor_id);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='donations' AND column_name='category_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_donations_category ON donations (category_id);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='donations' AND column_name='type'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_donations_type ON donations (type);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='donations' AND column_name='status'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_donations_status ON donations (status);
        END IF;
      END$$;
    `);

    // Ensure rides relational schema (replace legacy JSONB rides if exists)
    const legacyRides = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rides' AND column_name = 'data'
      ) AS exists;
    `);
    if (legacyRides?.rows?.[0]?.exists) {
      // eslint-disable-next-line no-console
      console.warn(
        "⚠️  Replacing legacy JSONB rides table with relational schema",
      );
      await client.query("DROP TABLE IF EXISTS rides CASCADE;");
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        driver_id UUID,
        title VARCHAR(255),
        from_location JSONB NOT NULL,
        to_location JSONB NOT NULL,
        departure_time TIMESTAMPTZ NOT NULL,
        arrival_time TIMESTAMPTZ,
        available_seats INTEGER DEFAULT 1,
        price_per_seat DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        requirements TEXT,
        status VARCHAR(20) DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='rides' AND column_name='driver_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides (driver_id);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='rides' AND column_name='departure_time'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_rides_departure ON rides (departure_time);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='rides' AND column_name='status'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_rides_status ON rides (status);
        END IF;
      END$$;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='rides' AND column_name='from_location'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_rides_from_location ON rides USING GIN (from_location);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='rides' AND column_name='to_location'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_rides_to_location ON rides USING GIN (to_location);
        END IF;
      END$$;
    `);

    // Ensure ride_bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ride_bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ride_id UUID,
        passenger_id UUID,
        seats_requested INTEGER DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(ride_id, passenger_id)
      );
    `);

    // Ensure community_events table - required by StatsController
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organizer_id UUID,
        organization_id UUID,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ,
        location JSONB,
        max_attendees INTEGER,
        current_attendees INTEGER DEFAULT 0,
        category VARCHAR(50),
        tags TEXT[],
        image_url TEXT,
        is_virtual BOOLEAN DEFAULT false,
        meeting_link TEXT,
        status VARCHAR(20) DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_community_events_date ON community_events (event_date);",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_community_events_organizer ON community_events (organizer_id);",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_community_events_status ON community_events (status);",
    );

    // Ensure event_attendees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_attendees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID,
        user_id UUID,
        status VARCHAR(20) DEFAULT 'going',
        registered_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      );
    `);

    // Ensure chat_messages table with required columns for StatsController
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID,
        sender_id UUID,
        content TEXT,
        message_type VARCHAR(20) DEFAULT 'text',
        file_url TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        file_type VARCHAR(100),
        metadata JSONB,
        reply_to_id UUID,
        is_edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMPTZ,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (conversation_id, created_at);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id);`,
    );

    // Add missing columns to existing chat_messages table if needed
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='chat_messages' AND column_name='is_deleted'
        ) THEN
          ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='chat_messages' AND column_name='deleted_at'
        ) THEN
          ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='chat_messages' AND column_name='is_edited'
        ) THEN
          ALTER TABLE chat_messages ADD COLUMN is_edited BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='chat_messages' AND column_name='edited_at'
        ) THEN
          ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMPTZ;
        END IF;
      END$$;
    `);

    // Ensure chat_conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255),
        type VARCHAR(20) DEFAULT 'direct',
        participants UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
        created_by UUID,
        last_message_id UUID,
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants ON chat_conversations USING GIN (participants);`,
    );

    // Ensure user_profiles table - required by StatsController
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT UNIQUE,
        email VARCHAR(255),
        name VARCHAR(255),
        phone VARCHAR(50),
        city VARCHAR(100),
        address TEXT,
        profile_image TEXT,
        bio TEXT,
        date_of_birth DATE,
        gender VARCHAR(20),
        join_date TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        last_active TIMESTAMPTZ DEFAULT NOW(),
        karma_points INTEGER DEFAULT 0,
        total_donations INTEGER DEFAULT 0,
        total_received INTEGER DEFAULT 0,
        is_recurring BOOLEAN DEFAULT false,
        notification_preferences JSONB DEFAULT '{}'::jsonb,
        privacy_settings JSONB DEFAULT '{}'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Create indexes only if columns exist (safe on re-run)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_profiles' AND column_name='user_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_profiles' AND column_name='email'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles (LOWER(email));
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_profiles' AND column_name='city'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles (city);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_profiles' AND column_name='is_active'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles (is_active);
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_profiles' AND column_name='last_active'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles (last_active);
        END IF;
      END$$;
    `);

    // Ensure posts table - relational table (not JSONB)
    // Check if posts table exists and what schema it has
    const postsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'posts'
      ) AS exists;
    `);

    if (postsTableExists?.rows?.[0]?.exists) {
      // Check if it's legacy JSONB format (has 'user_id' and 'item_id' columns instead of 'author_id')
      const legacyPostsCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'posts' AND column_name = 'user_id'
        ) AS exists;
      `);
      const hasAuthorId = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'posts' AND column_name = 'author_id'
        ) AS exists;
      `);

      if (
        legacyPostsCheck?.rows?.[0]?.exists &&
        !hasAuthorId?.rows?.[0]?.exists
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          "⚠️  Replacing legacy JSONB posts table with relational schema",
        );
        await client.query("DROP TABLE IF EXISTS posts CASCADE;");
      }
    }

    // Check if posts table exists with correct structure (author_id column)
    const postsCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'author_id'
      ) AS exists;
    `);
    if (!postsCheck?.rows?.[0]?.exists) {
      // eslint-disable-next-line no-console
      console.log("Ensuring table: posts (relational schema)");
      // Create task_id without foreign key constraint first (tasks table might not exist yet)
      await client.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          task_id UUID,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          images TEXT[],
          likes INTEGER DEFAULT 0,
          comments INTEGER DEFAULT 0,
          post_type VARCHAR(50) DEFAULT 'task_completion',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      // Add foreign key constraint to tasks if tasks table exists and has id column
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tasks' AND column_name = 'id'
            ) THEN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'posts_task_id_fkey' AND table_name = 'posts'
              ) THEN
                ALTER TABLE posts ADD CONSTRAINT posts_task_id_fkey 
                  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
              END IF;
            END IF;
          END IF;
        END$$;
      `);
      // Create indexes only if columns exist (safe on re-run)
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='posts' AND column_name='author_id'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts (author_id);
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='posts' AND column_name='task_id'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts (task_id);
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='posts' AND column_name='created_at'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='posts' AND column_name='post_type'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts (post_type);
          END IF;
        END$$;
      `);
    } else {
      // eslint-disable-next-line no-console
      console.log(
        "✅ Posts table exists with correct schema - skipping creation",
      );
    }

    // Ensure user_activities table - required by StatsController for real-time tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        activity_type VARCHAR(50) NOT NULL,
        activity_data JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities (user_id);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities (activity_type);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities (created_at);`,
    );

    // Seed default donation categories if empty
    const { rows: catCountRows } = await client.query(
      "SELECT COUNT(*)::int as count FROM donation_categories",
    );
    const catCount = catCountRows?.[0]?.count ?? 0;
    if (catCount === 0) {
      const categories = [
        {
          slug: "money",
          name_he: "כסף",
          name_en: "Money",
          icon: "💰",
          color: "#4CAF50",
          sort_order: 1,
        },
        {
          slug: "trump",
          name_he: "טרמפים",
          name_en: "Rides",
          icon: "🚗",
          color: "#2196F3",
          sort_order: 2,
        },
        {
          slug: "knowledge",
          name_he: "ידע",
          name_en: "Knowledge",
          icon: "📚",
          color: "#9C27B0",
          sort_order: 3,
        },
        {
          slug: "time",
          name_he: "זמן",
          name_en: "Time",
          icon: "⏰",
          color: "#FF9800",
          sort_order: 4,
        },
        {
          slug: "food",
          name_he: "אוכל",
          name_en: "Food",
          icon: "🍞",
          color: "#8BC34A",
          sort_order: 5,
        },
        {
          slug: "clothes",
          name_he: "בגדים",
          name_en: "Clothes",
          icon: "👕",
          color: "#03A9F4",
          sort_order: 6,
        },
        {
          slug: "books",
          name_he: "ספרים",
          name_en: "Books",
          icon: "📖",
          color: "#607D8B",
          sort_order: 7,
        },
        {
          slug: "furniture",
          name_he: "רהיטים",
          name_en: "Furniture",
          icon: "🪑",
          color: "#795548",
          sort_order: 8,
        },
        {
          slug: "medical",
          name_he: "רפואה",
          name_en: "Medical",
          icon: "🏥",
          color: "#F44336",
          sort_order: 9,
        },
        {
          slug: "animals",
          name_he: "חיות",
          name_en: "Animals",
          icon: "🐾",
          color: "#4CAF50",
          sort_order: 10,
        },
        {
          slug: "housing",
          name_he: "דיור",
          name_en: "Housing",
          icon: "🏠",
          color: "#FF5722",
          sort_order: 11,
        },
        {
          slug: "support",
          name_he: "תמיכה",
          name_en: "Support",
          icon: "💝",
          color: "#E91E63",
          sort_order: 12,
        },
        {
          slug: "education",
          name_he: "חינוך",
          name_en: "Education",
          icon: "🎓",
          color: "#3F51B5",
          sort_order: 13,
        },
        {
          slug: "environment",
          name_he: "סביבה",
          name_en: "Environment",
          icon: "🌱",
          color: "#4CAF50",
          sort_order: 14,
        },
        {
          slug: "technology",
          name_he: "טכנולוגיה",
          name_en: "Technology",
          icon: "💻",
          color: "#009688",
          sort_order: 15,
        },
      ];
      for (const c of categories) {
        await client.query(
          `INSERT INTO donation_categories (slug, name_he, name_en, icon, color, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (slug) DO UPDATE SET name_he=EXCLUDED.name_he, name_en=EXCLUDED.name_en, icon=EXCLUDED.icon, color=EXCLUDED.color, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
          [c.slug, c.name_he, c.name_en, c.icon, c.color, c.sort_order],
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log("✅ Database initialized");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ init-db failed", err);
  process.exit(1);
});
