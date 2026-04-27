import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";

/**
 * Create post_likes, post_comments, comment_likes, user_notifications if missing.
 */
export async function ensureLikesCommentsTables(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  logger.log("📝 Ensuring likes and comments tables exist...");

  const postsTableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'posts' AND table_schema = 'public'
                ) AS exists;
            `);

  if (!postsTableCheck.rows[0]?.exists) {
    logger.log(
      "⚠️  Posts table does not exist yet - skipping likes/comments table creation",
    );
    return;
  }

  const likesTableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'post_likes' AND table_schema = 'public'
                ) AS exists;
            `);

  if (!likesTableCheck.rows[0]?.exists) {
    logger.log("📝 Creating post_likes table...");
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
    logger.log("✅ post_likes table created");
  } else {
    const idColumnCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'post_likes' AND column_name = 'id' AND table_schema = 'public'
                    ) AS exists;
                `);
    if (!idColumnCheck.rows[0]?.exists) {
      logger.log(
        "⚠️ post_likes table exists but missing id column - recreating...",
      );
      await pool.query(`DROP TABLE IF EXISTS post_likes CASCADE;`);
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
      logger.log("✅ post_likes table recreated");
    }
  }

  const commentsTableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'post_comments' AND table_schema = 'public'
                ) AS exists;
            `);

  if (!commentsTableCheck.rows[0]?.exists) {
    logger.log("📝 Creating post_comments table...");
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
    logger.log("✅ post_comments table created");
  } else {
    const idColumnCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'post_comments' AND column_name = 'id' AND table_schema = 'public'
                    ) AS exists;
                `);
    if (!idColumnCheck.rows[0]?.exists) {
      logger.log(
        "⚠️ post_comments table exists but missing id column - recreating...",
      );
      await pool.query(`DROP TABLE IF EXISTS comment_likes CASCADE;`);
      await pool.query(`DROP TABLE IF EXISTS post_comments CASCADE;`);
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
      logger.log("✅ post_comments table recreated");
    }
  }

  const commentLikesTableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'comment_likes' AND table_schema = 'public'
                ) AS exists;
            `);

  if (!commentLikesTableCheck.rows[0]?.exists) {
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

  const notificationsTableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'user_notifications' AND table_schema = 'public'
                ) AS exists;
            `);

  if (!notificationsTableCheck.rows[0]?.exists) {
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
}
