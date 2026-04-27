import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";
import {
  ensurePostCommentsTable,
  ensurePostLikesTable,
  tableExists,
} from "./posts-schema.likes-comments-tables.helpers";

async function ensureCommentLikesTable(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  const exists = await tableExists(pool, "comment_likes");
  if (exists) return;

  logger.log("📝 Creating comment_likes table...");
  await pool.query(`
                    CREATE TABLE comment_likes (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(comment_id, user_id)
                    );
                `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);`,
  );
  logger.log("✅ comment_likes table created");
}

async function ensureUserNotificationsTable(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  const exists = await tableExists(pool, "user_notifications");
  if (exists) return;

  logger.log("📝 Creating user_notifications table...");
  await pool.query(`
                    CREATE TABLE user_notifications (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID,
                        title VARCHAR(255),
                        content TEXT,
                        notification_type VARCHAR(50),
                        related_id UUID,
                        is_read BOOLEAN DEFAULT false,
                        read_at TIMESTAMPTZ,
                        metadata JSONB,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(user_id, is_read) WHERE is_read = false;`,
  );

  logger.log("✅ user_notifications table created");
}

/**
 * Create post_likes, post_comments, comment_likes, user_notifications if missing.
 */
export async function ensureLikesCommentsTables(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  logger.log("📝 Ensuring likes and comments tables exist...");

  const postsExists = await tableExists(pool, "posts");
  if (postsExists) {
    await ensurePostLikesTable(pool, logger);
    await ensurePostCommentsTable(pool, logger);
    await ensureCommentLikesTable(pool, logger);
    await ensureUserNotificationsTable(pool, logger);
    return;
  }

  logger.log(
    "⚠️  Posts table does not exist yet - skipping likes/comments table creation",
  );
}
