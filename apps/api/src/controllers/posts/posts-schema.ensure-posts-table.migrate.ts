import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";

async function addPostTypeIfMissing(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  if (columns.includes("post_type")) return;
  logger.log("📝 Adding post_type column to posts table...");
  await pool.query(
    "ALTER TABLE posts ADD COLUMN post_type VARCHAR(50) DEFAULT 'task_completion';",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);",
  );
}

async function addTaskIdIfMissing(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  if (columns.includes("task_id")) return;
  logger.log("📝 Adding task_id column to posts table...");
  await pool.query(
    "ALTER TABLE posts ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id);",
  );
}

async function addRideIdIfMissing(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  if (columns.includes("ride_id")) return;
  logger.log("📝 Adding ride_id column to posts table...");
  await pool.query(
    "ALTER TABLE posts ADD COLUMN ride_id UUID REFERENCES rides(id) ON DELETE CASCADE;",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_posts_ride_id ON posts(ride_id);",
  );
  logger.log("📝 Migrating existing ride posts to use ride_id column...");
  await pool.query(`
                            UPDATE posts 
                            SET ride_id = (metadata->>'ride_id')::uuid 
                            WHERE post_type = 'ride' 
                            AND metadata->>'ride_id' IS NOT NULL
                            AND ride_id IS NULL;
                        `);
}

async function addItemIdIfMissing(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  if (columns.includes("item_id")) return;
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

async function addMetadataIfMissing(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  if (columns.includes("metadata")) return;
  logger.log("📝 Adding metadata column to posts table...");
  await pool.query(
    "ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;",
  );
}

async function addStatusIfMissing(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  if (columns.includes("status")) return;
  logger.log("📝 Adding status column to posts table...");
  await pool.query(
    "ALTER TABLE posts ADD COLUMN status VARCHAR(50) DEFAULT 'active';",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);",
  );
}

async function tryFixItemIdColumnType(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  try {
    await pool.query(
      "ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_item_id_fkey;",
    );
    await pool.query("ALTER TABLE posts ALTER COLUMN item_id TYPE TEXT;");
  } catch (e) {
    logger.log("ℹ️  Note: item_id fix check:", (e as Error).message);
  }
}

/** Apply column migrations when posts table exists with valid core columns. */
export async function patchPostsTableColumns(
  pool: Pool,
  logger: Logger,
  columns: string[],
): Promise<void> {
  await addPostTypeIfMissing(pool, logger, columns);
  await addTaskIdIfMissing(pool, logger, columns);
  await addRideIdIfMissing(pool, logger, columns);
  await addItemIdIfMissing(pool, logger, columns);
  await addMetadataIfMissing(pool, logger, columns);
  await addStatusIfMissing(pool, logger, columns);
  await tryFixItemIdColumnType(pool, logger);
}

const POSTS_INDEX_QUERIES = [
  "CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id)",
  "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id)",
  "CREATE INDEX IF NOT EXISTS idx_posts_ride_id ON posts(ride_id)",
  "CREATE INDEX IF NOT EXISTS idx_posts_item_id ON posts(item_id)",
  "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type)",
  "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)",
] as const;

/** Create posts table and indexes when table is missing or was dropped. */
export async function createPostsTableFromScratch(
  pool: Pool,
  logger: Logger,
): Promise<void> {
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

  for (const q of POSTS_INDEX_QUERIES) {
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
}
