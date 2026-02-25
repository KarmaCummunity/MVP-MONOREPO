// File overview:
// - Purpose: Initialize database schema/tables on module init; supports modern schema and legacy JSONB compatibility.
// - Reached from: `AppModule` providers (runs on startup).
// - Provides: Detects legacy schema, runs `schema.sql` when available, ensures compatibility tables and default data.
// - Env inputs: `SKIP_FULL_SCHEMA` to skip full schema in dev.
// - Downstream: Creates core tables (community_stats, user_profiles, donation_categories, donations, user_activities) when needed.
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "./database.module";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DatabaseInit implements OnModuleInit {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      try {
        // 0) Allow forcing full schema via env var (overrides legacy detection and SKIP flags)
        const forceFullSchemaEnv = process.env.FORCE_FULL_SCHEMA;
        const forceFullSchema =
          !!forceFullSchemaEnv && /^(1|true|yes)$/i.test(forceFullSchemaEnv);

        if (forceFullSchema) {
          console.warn(
            "⏭️  FORCE_FULL_SCHEMA detected. Running full schema initialization.",
          );
          try {
            await this.runSchema(client);
            await this.initializeDefaultData(client);
            console.log(
              "✅ DatabaseInit - Forced full schema initialized successfully",
            );
          } catch (schemaError: unknown) {
            const reason =
              schemaError instanceof Error
                ? schemaError.message
                : String(schemaError);
            console.error(
              "❌ Forced full schema initialization failed:",
              reason,
            );
            throw schemaError;
          }
          return;
        }

        // Run full schema initialization
        // NOTE: Legacy tables are no longer created - all code should use relational tables
        if (process.env.SKIP_FULL_SCHEMA === "1") {
          console.warn(
            "⏭️  Skipping full schema initialization (SKIP_FULL_SCHEMA=1)",
          );
          await this.ensureBackwardCompatibility(client);
          await this.initializeDefaultData(client);
        } else {
          try {
            await this.runSchema(client);
            await this.initializeDefaultData(client);
            console.log(
              "✅ DatabaseInit - Complete schema initialized successfully",
            );
          } catch (schemaError: unknown) {
            const reason =
              schemaError instanceof Error
                ? schemaError.message
                : String(schemaError);
            console.error("❌ Full schema initialization failed:", reason);
            throw schemaError;
          }
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(
        "❌ DatabaseInit failed (Non-fatal, continuing startup)",
        err,
      );
      // DO NOT throw err; allow app to start so we can debug via logs/health check
    }
  }

  // NOTE: Legacy schema detection removed - we no longer support legacy JSONB tables
  // All code should use the new relational schema (user_profiles, etc.)

  /**
   * Split SQL statements intelligently, handling quoted strings, dollar quotes, and comments.
   * Preserves DO $$ ... END$$; blocks as single statements.
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = "";
    let i = 0;
    const len = sql.length;

    while (i < len) {
      const char = sql[i];

      // Handle single quoted strings '...'
      if (char === "'") {
        currentStatement += char;
        i++;
        while (i < len) {
          currentStatement += sql[i];
          if (sql[i] === "'") {
            // Check for escaped quote ''
            if (i + 1 < len && sql[i + 1] === "'") {
              currentStatement += sql[i + 1];
              i += 2;
              continue;
            }
            i++;
            break;
          }
          i++;
        }
        continue;
      }

      // Handle dollar quoted strings $tag$...$tag$
      if (char === "$") {
        // Check if it's a dollar quote start
        const tagMatch = sql.substring(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
        if (tagMatch) {
          const tag = tagMatch[1];
          currentStatement += tag;
          i += tag.length;

          // Find closing tag
          const closeIndex = sql.indexOf(tag, i);
          if (closeIndex !== -1) {
            currentStatement += sql.substring(i, closeIndex + tag.length);
            i = closeIndex + tag.length;
          } else {
            // Unterminated dollar quote - consume rest
            currentStatement += sql.substring(i);
            i = len;
          }
          continue;
        }
      }

      // Handle comments
      if (char === "-" && i + 1 < len && sql[i + 1] === "-") {
        // Line comment --
        const newlineIndex = sql.indexOf("\n", i);
        if (newlineIndex !== -1) {
          currentStatement += sql.substring(i, newlineIndex + 1);
          i = newlineIndex + 1;
        } else {
          currentStatement += sql.substring(i);
          i = len;
        }
        continue;
      }

      if (char === "/" && i + 1 < len && sql[i + 1] === "*") {
        // Block comment /* ... */
        const closeIndex = sql.indexOf("*/", i + 2);
        if (closeIndex !== -1) {
          currentStatement += sql.substring(i, closeIndex + 2);
          i = closeIndex + 2;
        } else {
          currentStatement += sql.substring(i);
          i = len;
        }
        continue;
      }

      // Handle semicolon
      if (char === ";") {
        currentStatement += char;
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = "";
        i++;
        continue;
      }

      // Regular character
      currentStatement += char;
      i++;
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements;
  }

  private async runSchema(client: import("pg").PoolClient) {
    try {
      // Support both build (dist) and dev (src) paths
      const candidates = [
        path.join(__dirname, "schema.sql"), // dist/database/schema.sql (build)
        path.join(process.cwd(), "dist", "database", "schema.sql"),
        path.join(process.cwd(), "src", "database", "schema.sql"), // dev path
        path.resolve(__dirname, "../../src/database/schema.sql"),
      ];

      let schemaPath = "";
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          schemaPath = p;
          break;
        }
      }

      if (!schemaPath) {
        throw new Error("schema.sql not found in expected locations");
      }

      const schemaSql = fs.readFileSync(schemaPath, "utf8");

      // Split SQL statements intelligently, handling DO $$ blocks
      const statements = this.splitSqlStatements(schemaSql);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await client.query(statement.trim());
          } catch (e) {
            const err = e as Error;
            console.error(
              `❌ Failed at statement #${i + 1} of ${statements.length}:`,
            );
            console.error(
              `Statement preview: ${statement.trim().substring(0, 200)}...`,
            );
            throw err;
          }
        }
      }

      console.log(`✅ Schema tables created successfully from: ${schemaPath}`);

      // Ensure firebase_uid column exists in user_profiles (for existing databases)
      // This is now handled in schema.sql, but kept here for backward compatibility
      await client.query(`
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
      `);

      // Ensure google_id column exists in user_profiles (for existing databases)
      // This is now handled in schema.sql, but kept here for backward compatibility
      try {
        // Check if column exists first
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' AND column_name = 'google_id'
        `);

        if (columnCheck.rows.length === 0) {
          console.log("📝 google_id column does not exist, creating it...");
          await client.query(`
            ALTER TABLE user_profiles ADD COLUMN google_id TEXT;
          `);
          console.log("✅ google_id column created");
        } else {
          console.log("✅ google_id column already exists");
        }

        // Add unique constraint separately if it doesn't exist
        const constraintCheck = await client.query(`
          SELECT conname 
          FROM pg_constraint 
          WHERE conname = 'user_profiles_google_id_key'
        `);

        if (constraintCheck.rows.length === 0) {
          console.log(
            "📝 google_id unique constraint does not exist, creating it...",
          );
          await client.query(`
            ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_google_id_key UNIQUE (google_id);
          `);
          console.log("✅ google_id unique constraint created");
        } else {
          console.log("✅ google_id unique constraint already exists");
        }

        // Create index if it doesn't exist
        const indexCheck = await client.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_google_id'
        `);

        if (indexCheck.rows.length === 0) {
          console.log("📝 google_id index does not exist, creating it...");
          await client.query(`
            CREATE INDEX idx_user_profiles_google_id ON user_profiles (google_id) WHERE google_id IS NOT NULL;
          `);
          console.log("✅ google_id index created");
        } else {
          console.log("✅ google_id index already exists");
        }

        console.log(
          "✅ google_id column, constraint, and index ensured in user_profiles",
        );
      } catch (e) {
        const err = e as Error;
        console.error("❌ Failed to add google_id column:", err.message);
        console.error("❌ Error stack:", err.stack);
        // Don't throw - continue with other operations
      }

      // Create the firebase_uid index (also in schema.sql)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_profiles_firebase_uid ON user_profiles (firebase_uid) WHERE firebase_uid IS NOT NULL;
      `);

      // Create the google_id index (also in schema.sql)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles (google_id) WHERE google_id IS NOT NULL;
      `);

      // Run challenges schema
      await this.runChallengesSchema(client);

      // Run community group challenges schema
      await this.runCommunityGroupChallengesSchema(client);
    } catch (err) {
      console.error("❌ Schema creation failed:", err);
      throw err;
    }
  }

  private async ensureBackwardCompatibility(client: import("pg").PoolClient) {
    try {
      // Required extensions for UUIDs and text search
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

      // NOTE: Legacy JSONB tables (users, posts, etc.) are no longer created
      // All code should use the new relational tables (user_profiles, etc.)
      // If you need legacy tables, they must be created manually or migrated from existing data

      // Ensure minimal relational tables required by new controllers exist
      // community_stats is used by StatsController; create it even in legacy mode
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
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_community_stats_type ON community_stats (stat_type, date_period);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_community_stats_city ON community_stats (city, date_period);
      `);

      // Ensure items table with separate columns (not JSONB)
      console.log("🔧 Ensuring items table with dedicated columns...");
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            owner_id UUID NOT NULL, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            condition VARCHAR(20),
            location JSONB,
            city VARCHAR(100),
            address TEXT,
            coordinates VARCHAR(100),
            price DECIMAL(10,2) DEFAULT 0,
            image_base64 TEXT,
            rating INTEGER DEFAULT 0,
            tags TEXT,
            quantity INTEGER DEFAULT 1,
            status VARCHAR(20) DEFAULT 'available',
            delivery_method VARCHAR(20) DEFAULT 'pickup',
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Try to create indexes, skip if column doesn't exist
        try {
          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items(owner_id);`,
          );
        } catch {
          console.log("⚠️ Skipping idx_items_owner_id");
        }

        try {
          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);`,
          );
        } catch {
          console.log("⚠️ Skipping idx_items_category");
        }

        try {
          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);`,
          );
        } catch {
          console.log("⚠️ Skipping idx_items_status");
        }

        try {
          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_items_is_deleted ON items(is_deleted);`,
          );
        } catch {
          console.log("⚠️ Skipping idx_items_is_deleted");
        }

        try {
          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);`,
          );
        } catch {
          console.log("⚠️ Skipping idx_items_created_at");
        }

        console.log("✅ Items table ensured with dedicated columns");
      } catch (error) {
        console.error("❌ Failed to create items table:", error);
        // Continue anyway - table might already exist in different format
      }

      // Ensure location column exists in items
      try {
        await client.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'location'
              ) THEN
                ALTER TABLE items ADD COLUMN location JSONB;
              END IF;
            END $$ ;
          `);
      } catch (_e) {
        console.log("⚠️ Failed to add location column to items:", _e);
      }

      // Minimal user_profiles to satisfy joins and stats
      // NOTE: id is UUID (standard identifier), firebase_uid is TEXT (for Firebase authentication linking)
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          firebase_uid TEXT UNIQUE, -- Firebase UID for authentication linking (optional)
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          avatar_url TEXT,
          city VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          last_active TIMESTAMPTZ DEFAULT NOW(),
          join_date TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Add firebase_uid column if it doesn't exist (for existing databases)
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'firebase_uid'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN firebase_uid TEXT;
            CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_firebase_uid_unique ON user_profiles (firebase_uid) WHERE firebase_uid IS NOT NULL;
          END IF;
        END $$ ;
      `);

      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON user_profiles (LOWER(email));`,
      );
      // Only create firebase_uid index if the column exists
      await client.query(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'firebase_uid'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_user_profiles_firebase_uid ON user_profiles (firebase_uid) WHERE firebase_uid IS NOT NULL;
          END IF;
        END $$ ;
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles (city);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles (is_active, last_active);`,
      );

      // Ensure metadata column exists
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'metadata'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
          END IF;
        END $$ ;
      `);

      // donation_categories to power categories and analytics
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

      // donations table with essential columns
      // If legacy JSONB 'donations' exists, replace it with relational schema
      const donationsLegacy = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'donations' AND column_name = 'data'
        ) AS exists;
      `);
      if (donationsLegacy?.rows?.[0]?.exists) {
        console.warn(
          "⚠️  Replacing legacy JSONB donations table with relational schema",
        );
        await client.query("DROP TABLE IF EXISTS donations CASCADE;");
      }
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
          is_recurring BOOLEAN DEFAULT false,
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
      // Create indexes conditionally to avoid errors if columns ever differ
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
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='donations' AND column_name='created_at'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_donations_created ON donations (created_at);
          END IF;
        END $$ ;
      `);
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='donations' AND column_name='is_recurring'
          ) THEN
            ALTER TABLE donations ADD COLUMN is_recurring BOOLEAN DEFAULT false;
          END IF;
        END $$ ;
      `);
      // location is JSONB – safe
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_donations_location ON donations USING GIN (location);`,
      );

      // minimal user_activities used by stats
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_activities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID,
          activity_type VARCHAR(50) NOT NULL,
          activity_data JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Ensure rides relational schema (replace legacy JSONB rides if exists)
      const ridesLegacy = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'rides' AND column_name = 'data'
        ) AS exists;
      `);
      if (ridesLegacy?.rows?.[0]?.exists) {
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
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='rides' AND column_name='created_at'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_rides_created ON rides (created_at);
          END IF;
        END $$ ;
      `);
      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_rides_from_location ON rides USING GIN (from_location);",
      );
      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_rides_to_location ON rides USING GIN (to_location);",
      );

      // Minimal chat schema required by ChatController
      // NOTE: All user ID fields use UUID type to match user_profiles.id
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255),
          type VARCHAR(20) DEFAULT 'direct',
          participants UUID[] NOT NULL, -- UUID[] to match user_profiles.id type
          created_by UUID, -- UUID to match user_profiles.id type
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL,
          sender_id UUID NOT NULL,
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
        END $$ ;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS message_read_receipts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID NOT NULL,
          user_id UUID NOT NULL,
          read_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(message_id, user_id)
        );
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts (message_id);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts (user_id);`,
      );

      // ride_bookings table
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

      // community_events table - required by StatsController
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
        `CREATE INDEX IF NOT EXISTS idx_community_events_date ON community_events (event_date);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_community_events_organizer ON community_events (organizer_id);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_community_events_status ON community_events (status);`,
      );

      // event_attendees table
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

      // community_members table for admin management
      await client.query(`
        CREATE TABLE IF NOT EXISTS community_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          description TEXT,
          contact_info JSONB,
          status VARCHAR(20) DEFAULT 'active',
          created_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_community_members_name ON community_members (name);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members (role);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members (status);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_community_members_created_at ON community_members (created_at DESC);`,
      );

      // Create trigger function if it doesn't exist
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS '
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        ' language 'plpgsql'
      `);

      // Create trigger for community_members
      await client.query(
        "DROP TRIGGER IF EXISTS update_community_members_updated_at ON community_members",
      );
      await client.query(`
        CREATE TRIGGER update_community_members_updated_at 
        BEFORE UPDATE ON community_members 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
      `);

      // NOTE: links table has been removed - it contained duplicate user/item data
      // All user data is now unified in user_profiles table with UUID identifiers

      // Ensure item_requests table exists
      console.log("📦 Ensuring item_requests table...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS item_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          item_id TEXT,
          requester_id UUID,
          status VARCHAR(20) DEFAULT 'pending',
          message TEXT,
          proposed_time TIMESTAMPTZ,
          delivery_method VARCHAR(20),
          meeting_location JSONB,
          owner_response TEXT,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_item_requests_item ON item_requests(item_id);`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_item_requests_requester ON item_requests(requester_id);`,
      );

      console.log("✅ Backward compatibility tables ensured");
    } catch (err) {
      console.error("❌ Backward compatibility setup failed:", err);
      throw err;
    }
  }

  private async initializeDefaultData(client: import("pg").PoolClient) {
    try {
      // Initialize donation categories
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

      for (const category of categories) {
        await client.query(
          `
          INSERT INTO donation_categories (slug, name_he, name_en, icon, color, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (slug) DO UPDATE SET
            name_he = EXCLUDED.name_he,
            name_en = EXCLUDED.name_en,
            icon = EXCLUDED.icon,
            color = EXCLUDED.color,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
        `,
          [
            category.slug,
            category.name_he,
            category.name_en,
            category.icon,
            category.color,
            category.sort_order,
          ],
        );
      }

      // Initialize global community stats
      // IMPORTANT: Using ON CONFLICT DO NOTHING to preserve existing data on redeployment
      // This ensures that stats like site_visits don't reset when the server restarts
      const defaultStats = [
        { stat_type: "site_visits", stat_value: 0 },
        { stat_type: "money_donations", stat_value: 0 },
        { stat_type: "volunteer_hours", stat_value: 0 },
        { stat_type: "rides_completed", stat_value: 0 },
        { stat_type: "events_created", stat_value: 0 },
        { stat_type: "active_members", stat_value: 0 },
        { stat_type: "food_kg", stat_value: 0 },
        { stat_type: "clothing_kg", stat_value: 0 },
        { stat_type: "books_donated", stat_value: 0 },
      ];

      for (const stat of defaultStats) {
        // ON CONFLICT DO NOTHING: If the stat exists for today, don't change it
        // This preserves accumulated values during server restarts/redeployments
        const result = await client.query(
          `
          INSERT INTO community_stats (stat_type, stat_value, date_period)
          VALUES ($1, $2, CURRENT_DATE)
          ON CONFLICT (stat_type, city, date_period) DO NOTHING
          RETURNING stat_type, stat_value
        `,
          [stat.stat_type, stat.stat_value],
        );

        // If result has rows, it means we created a new stat entry
        // If no rows, it means the stat already existed and was preserved
        if (result.rows.length > 0) {
          console.log(
            `✨ Created new stat: ${stat.stat_type} = ${stat.stat_value}`,
          );
        } else {
          console.log(`✅ Preserved existing stat: ${stat.stat_type}`);
        }
      }

      // Create a test user for API testing
      await client.query(`
        INSERT INTO user_profiles (id, email, name, is_active)
        VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User', true)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `);

      // Ensure root admin (from env) always has super_admin role. No hardcoded emails.
      const rootAdminEmail = process.env.ROOT_ADMIN_EMAIL?.toLowerCase().trim();
      if (rootAdminEmail) {
        await client.query(
          `UPDATE user_profiles 
           SET roles = ARRAY['super_admin', 'admin', 'user']::TEXT[]
           WHERE LOWER(TRIM(email)) = $1
             AND (roles IS NULL OR NOT (roles @> ARRAY['super_admin']::TEXT[]))`,
          [rootAdminEmail],
        );
        console.log(`✅ Root admin role ensured for: ${rootAdminEmail}`);
      } else {
        console.warn(
          "⚠️ ROOT_ADMIN_EMAIL not set - no root admin bootstrap. Set in .env for initial setup.",
        );
      }

      console.log("✅ Default data initialized");
    } catch (err) {
      console.error("❌ Default data initialization failed:", err);
      // Don't throw here as it's not critical
    }
  }

  private async runChallengesSchema(client: import("pg").PoolClient) {
    try {
      // Support both build (dist) and dev (src) paths
      const candidates = [
        path.join(__dirname, "challenges-schema.sql"),
        path.join(process.cwd(), "dist", "database", "challenges-schema.sql"),
        path.join(process.cwd(), "src", "database", "challenges-schema.sql"),
        path.resolve(__dirname, "../../src/database/challenges-schema.sql"),
      ];

      let schemaPath = "";
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          schemaPath = p;
          break;
        }
      }

      if (!schemaPath) {
        console.warn(
          "⚠️ challenges-schema.sql not found, skipping challenges tables",
        );
        return;
      }

      const schemaSql = fs.readFileSync(schemaPath, "utf8");

      // Split SQL statements intelligently, handling DO $$ blocks
      const statements = this.splitSqlStatements(schemaSql);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await client.query(statement.trim());
          } catch (e) {
            const err = e as Error;
            console.error(
              `❌ Failed at CHALLENGES statement #${i + 1} of ${statements.length}:`,
            );
            console.error(
              `Statement preview: ${statement.trim().substring(0, 200)}...`,
            );
            throw err;
          }
        }
      }

      console.log(
        `✅ Challenges schema tables created successfully from: ${schemaPath}`,
      );
    } catch (err) {
      console.error("❌ Challenges schema creation failed:", err);
      // Don't throw here as it's not critical
    }
  }

  private async runCommunityGroupChallengesSchema(
    client: import("pg").PoolClient,
  ) {
    try {
      // Support both build (dist) and dev (src) paths
      const candidates = [
        path.join(__dirname, "community-group-challenges-schema.sql"),
        path.join(
          process.cwd(),
          "dist",
          "database",
          "community-group-challenges-schema.sql",
        ),
        path.join(
          process.cwd(),
          "src",
          "database",
          "community-group-challenges-schema.sql",
        ),
        path.resolve(
          __dirname,
          "../../src/database/community-group-challenges-schema.sql",
        ),
      ];

      let schemaPath = "";
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          schemaPath = p;
          break;
        }
      }

      if (!schemaPath) {
        console.warn(
          "⚠️ community-group-challenges-schema.sql not found, skipping community challenges tables",
        );
        return;
      }

      const schemaSql = fs.readFileSync(schemaPath, "utf8");

      // Split SQL statements intelligently, handling DO $$ blocks
      const statements = this.splitSqlStatements(schemaSql);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await client.query(statement.trim());
          } catch (e) {
            const err = e as Error;
            console.error(
              `❌ Failed at COMMUNITY CHALLENGES statement #${i + 1} of ${statements.length}:`,
            );
            console.error(
              `Statement preview: ${statement.trim().substring(0, 200)}...`,
            );
            throw err;
          }
        }
      }

      // Additional migration: Ensure image_url column exists
      try {
        await client.query(`
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'community_group_challenges' AND column_name = 'image_url'
              ) THEN
                  ALTER TABLE community_group_challenges ADD COLUMN image_url TEXT;
                  RAISE NOTICE 'Column image_url added to community_group_challenges';
              END IF;
          END $$;
        `);
        console.log(
          "✅ Verified image_url column exists in community_group_challenges",
        );
      } catch (err) {
        console.error("⚠️ Could not verify image_url column:", err);
      }

      console.log(
        `✅ Community Group Challenges schema tables created successfully from: ${schemaPath}`,
      );
    } catch (err) {
      console.error(
        "❌ Community Group Challenges schema creation failed:",
        err,
      );
      // Don't throw here as it's not critical
    }
  }
}
