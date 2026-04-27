import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";

/**
 * Ensure posts table exists with correct schema, create/migrate if needed.
 */
export async function ensurePostsTable(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'posts' AND table_schema = 'public'
                ) AS exists;
            `);

    if (tableCheck.rows[0]?.exists) {
      const columnsCheck = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'posts' AND table_schema = 'public'
                `);

      const columns = columnsCheck.rows.map((r) => r.column_name);

      if (!columns.includes("id") || !columns.includes("author_id")) {
        logger.log("⚠️  Detected legacy posts table structure - recreating...");
        logger.log(`   - Has id column: ${columns.includes("id")}`);
        logger.log(
          `   - Has author_id column: ${columns.includes("author_id")}`,
        );
        await pool.query("DROP TABLE IF EXISTS posts CASCADE;");
      } else {
        if (!columns.includes("post_type")) {
          logger.log("📝 Adding post_type column to posts table...");
          await pool.query(
            "ALTER TABLE posts ADD COLUMN post_type VARCHAR(50) DEFAULT 'task_completion';",
          );
          await pool.query(
            "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);",
          );
        }

        if (!columns.includes("task_id")) {
          logger.log("📝 Adding task_id column to posts table...");
          await pool.query(
            "ALTER TABLE posts ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;",
          );
          await pool.query(
            "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id);",
          );
        }

        if (!columns.includes("ride_id")) {
          logger.log("📝 Adding ride_id column to posts table...");
          await pool.query(
            "ALTER TABLE posts ADD COLUMN ride_id UUID REFERENCES rides(id) ON DELETE CASCADE;",
          );
          await pool.query(
            "CREATE INDEX IF NOT EXISTS idx_posts_ride_id ON posts(ride_id);",
          );

          logger.log(
            "📝 Migrating existing ride posts to use ride_id column...",
          );
          await pool.query(`
                            UPDATE posts 
                            SET ride_id = (metadata->>'ride_id')::uuid 
                            WHERE post_type = 'ride' 
                            AND metadata->>'ride_id' IS NOT NULL
                            AND ride_id IS NULL;
                        `);
        }

        if (!columns.includes("item_id")) {
          logger.log("📝 Adding item_id column to posts table...");
          await pool.query("ALTER TABLE posts ADD COLUMN item_id TEXT;");
          await pool.query(
            "CREATE INDEX IF NOT EXISTS idx_posts_item_id ON posts(item_id);",
          );

          logger.log(
            "📝 Migrating existing item/donation posts to use item_id column...",
          );
          await pool.query(`
                            UPDATE posts 
                            SET item_id = metadata->>'item_id'
                            WHERE post_type IN ('item', 'donation') 
                            AND metadata->>'item_id' IS NOT NULL
                            AND item_id IS NULL;
                        `);
        }

        if (!columns.includes("metadata")) {
          logger.log("📝 Adding metadata column to posts table...");
          await pool.query(
            "ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;",
          );
        }

        if (!columns.includes("status")) {
          logger.log("📝 Adding status column to posts table...");
          await pool.query(
            "ALTER TABLE posts ADD COLUMN status VARCHAR(50) DEFAULT 'active';",
          );
          await pool.query(
            "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);",
          );
        }

        try {
          await pool.query(
            "ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_item_id_fkey;",
          );
          await pool.query("ALTER TABLE posts ALTER COLUMN item_id TYPE TEXT;");
        } catch (e) {
          logger.log("ℹ️  Note: item_id fix check:", (e as Error).message);
        }

        return;
      }
    }

    await pool.query(`
                CREATE TABLE IF NOT EXISTS posts (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
                    ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
                    item_id TEXT,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    images TEXT[],
                    likes INTEGER DEFAULT 0,
                    comments INTEGER DEFAULT 0,
                    post_type VARCHAR(50) DEFAULT 'task_completion',
                    status VARCHAR(50) DEFAULT 'active',
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);

    const indexQueries = [
      "CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id)",
      "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id)",
      "CREATE INDEX IF NOT EXISTS idx_posts_ride_id ON posts(ride_id)",
      "CREATE INDEX IF NOT EXISTS idx_posts_item_id ON posts(item_id)",
      "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)",
      "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type)",
      "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)",
    ];

    for (const q of indexQueries) {
      try {
        await pool.query(q);
      } catch {
        // index may already exist
      }
    }

    try {
      await pool.query(`
                    DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
                    CREATE TRIGGER update_posts_updated_at 
                        BEFORE UPDATE ON posts 
                        FOR EACH ROW 
                        EXECUTE FUNCTION update_updated_at_column();
                `);
    } catch {
      logger.log(
        "⚠️ Could not create update_posts_updated_at trigger (function might not exist)",
      );
    }

    logger.log("✅ Posts table ensured with correct schema");
  } catch (error) {
    logger.error("❌ Failed to ensure posts table:", error);
  }
}
