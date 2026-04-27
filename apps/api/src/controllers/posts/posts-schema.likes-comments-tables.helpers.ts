import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";

export async function tableExists(
  pool: Pool,
  tableName: string,
): Promise<boolean> {
  const r = await pool.query(
    `
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = $1 AND table_schema = 'public'
                ) AS exists;
            `,
    [tableName],
  );
  return Boolean(r.rows[0]?.exists);
}

async function columnExists(
  pool: Pool,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const r = await pool.query(
    `
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'
                    ) AS exists;
                `,
    [tableName, columnName],
  );
  return Boolean(r.rows[0]?.exists);
}

async function createPostLikesTable(pool: Pool): Promise<void> {
  await pool.query(`
                    CREATE TABLE post_likes (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(post_id, user_id)
                    );
                `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);`,
  );
}

export async function ensurePostLikesTable(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  const exists = await tableExists(pool, "post_likes");
  if (exists) {
    const hasId = await columnExists(pool, "post_likes", "id");
    if (hasId) return;
    logger.log(
      "⚠️ post_likes table exists but missing id column - recreating...",
    );
    await pool.query(`DROP TABLE IF EXISTS post_likes CASCADE;`);
    await createPostLikesTable(pool);
    logger.log("✅ post_likes table recreated");
    return;
  }

  logger.log("📝 Creating post_likes table...");
  await createPostLikesTable(pool);
  logger.log("✅ post_likes table created");
}

async function createPostCommentsTable(pool: Pool): Promise<void> {
  await pool.query(`
                    CREATE TABLE post_comments (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                        text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 2000),
                        likes_count INTEGER DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);`,
  );
}

export async function ensurePostCommentsTable(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  const exists = await tableExists(pool, "post_comments");
  if (exists) {
    const hasId = await columnExists(pool, "post_comments", "id");
    if (hasId) return;
    logger.log(
      "⚠️ post_comments table exists but missing id column - recreating...",
    );
    await pool.query(`DROP TABLE IF EXISTS comment_likes CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS post_comments CASCADE;`);
    await createPostCommentsTable(pool);
    logger.log("✅ post_comments table recreated");
    return;
  }

  logger.log("📝 Creating post_comments table...");
  await createPostCommentsTable(pool);
  logger.log("✅ post_comments table created");
}
