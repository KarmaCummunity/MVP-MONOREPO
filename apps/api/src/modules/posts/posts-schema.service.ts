import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";

/**
 * Handles DDL for posts, post_likes, post_comments, comment_likes, and user_notifications.
 * Extracted from PostsController to reduce cognitive complexity and improve testability.
 */
@Injectable()
export class PostsSchemaService {
  private readonly logger = new Logger(PostsSchemaService.name);
  private postsTableEnsurePromise: Promise<void> | null = null;
  private likesCommentsEnsurePromise: Promise<void> | null = null;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ensurePostsTable(): Promise<void> {
    if (this.postsTableEnsurePromise) {
      await this.postsTableEnsurePromise;
      return;
    }
    const promise = this.doEnsurePostsTable();
    this.postsTableEnsurePromise = promise;
    try {
      await promise;
    } catch (error) {
      this.postsTableEnsurePromise = null;
      throw error;
    }
  }

  async ensureLikesCommentsTable(): Promise<void> {
    if (this.likesCommentsEnsurePromise) {
      await this.likesCommentsEnsurePromise;
      return;
    }
    const promise = this.doEnsureLikesCommentsTable();
    this.likesCommentsEnsurePromise = promise;
    try {
      await promise;
    } catch (error) {
      this.likesCommentsEnsurePromise = null;
      throw error;
    }
  }

  private async doEnsurePostsTable(): Promise<void> {
    try {
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

      const tableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'posts' AND table_schema = 'public'
        ) AS exists;
      `);

      if (tableCheck.rows[0]?.exists) {
        const columnsCheck = await this.pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'posts' AND table_schema = 'public'
        `);
        const columns = columnsCheck.rows.map(
          (r: { column_name: string }) => r.column_name,
        );

        if (!columns.includes("id") || !columns.includes("author_id")) {
          this.logger.log(
            "⚠️  Detected legacy posts table structure - recreating...",
          );
          this.logger.log(`   - Has id column: ${columns.includes("id")}`);
          this.logger.log(
            `   - Has author_id column: ${columns.includes("author_id")}`,
          );
          await this.pool.query("DROP TABLE IF EXISTS posts CASCADE;");
        } else {
          await this.addMissingPostsColumns(columns);
          await this.fixPostsItemIdType();
          return;
        }
      }

      await this.createPostsTable();
      this.logger.log("✅ Posts table ensured with correct schema");
    } catch (error) {
      this.logger.error("❌ Failed to ensure posts table:", error);
      throw error;
    }
  }

  private async addMissingPostsColumns(columns: string[]): Promise<void> {
    if (!columns.includes("post_type")) {
      this.logger.log("📝 Adding post_type column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN post_type VARCHAR(50) DEFAULT 'task_completion';",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);",
      );
    }
    if (!columns.includes("task_id")) {
      this.logger.log("📝 Adding task_id column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id);",
      );
    }
    if (!columns.includes("ride_id")) {
      this.logger.log("📝 Adding ride_id column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN ride_id UUID REFERENCES rides(id) ON DELETE CASCADE;",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_ride_id ON posts(ride_id);",
      );
      this.logger.log(
        "📝 Migrating existing ride posts to use ride_id column...",
      );
      await this.pool.query(`
        UPDATE posts 
        SET ride_id = (metadata->>'ride_id')::uuid 
        WHERE post_type = 'ride' AND metadata->>'ride_id' IS NOT NULL AND ride_id IS NULL;
      `);
    }
    if (!columns.includes("item_id")) {
      this.logger.log("📝 Adding item_id column to posts table...");
      await this.pool.query("ALTER TABLE posts ADD COLUMN item_id TEXT;");
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_item_id ON posts(item_id);",
      );
      this.logger.log(
        "📝 Migrating existing item/donation posts to use item_id column...",
      );
      await this.pool.query(`
        UPDATE posts 
        SET item_id = metadata->>'item_id'
        WHERE post_type IN ('item', 'donation') AND metadata->>'item_id' IS NOT NULL AND item_id IS NULL;
      `);
    }
    if (!columns.includes("metadata")) {
      this.logger.log("📝 Adding metadata column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;",
      );
    }
    if (!columns.includes("status")) {
      this.logger.log("📝 Adding status column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN status VARCHAR(50) DEFAULT 'active';",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);",
      );
    }
  }

  private async fixPostsItemIdType(): Promise<void> {
    try {
      await this.pool.query(
        "ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_item_id_fkey;",
      );
      await this.pool.query(
        "ALTER TABLE posts ALTER COLUMN item_id TYPE TEXT;",
      );
    } catch (e) {
      this.logger.log("ℹ️  Note: item_id fix check:", (e as Error).message);
    }
  }

  private async createPostsTable(): Promise<void> {
    await this.pool.query(`
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
        await this.pool.query(q);
      } catch {
        // index may already exist
      }
    }
    try {
      await this.pool.query(`
        DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
        CREATE TRIGGER update_posts_updated_at 
          BEFORE UPDATE ON posts 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch {
      this.logger.log(
        "⚠️ Could not create update_posts_updated_at trigger (function might not exist)",
      );
    }
  }

  private async doEnsureLikesCommentsTable(): Promise<void> {
    try {
      this.logger.log("📝 Ensuring likes and comments tables exist...");

      const postsTableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'posts' AND table_schema = 'public'
        ) AS exists;
      `);
      if (!postsTableCheck.rows[0]?.exists) {
        this.logger.log(
          "⚠️  Posts table does not exist yet - skipping likes/comments table creation",
        );
        return;
      }

      await this.ensurePostLikesTable();
      await this.ensurePostCommentsTable();
      await this.ensureCommentLikesTable();
      await this.ensureUserNotificationsTable();
      await this.ensureLikesCommentsFunctionsAndTriggers();

      this.logger.log("✅ Triggers ensured");
    } catch (error) {
      this.logger.error("❌ Failed to ensure likes/comments tables:", error);
      throw error;
    }
  }

  private async ensurePostLikesTable(): Promise<void> {
    const likesTableCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'post_likes' AND table_schema = 'public'
      ) AS exists;
    `);
    if (!likesTableCheck.rows[0]?.exists) {
      this.logger.log("📝 Creating post_likes table...");
      await this.pool.query(`
        CREATE TABLE post_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(post_id, user_id)
        );
      `);
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);`,
      );
      this.logger.log("✅ post_likes table created");
      return;
    }
    const idColumnCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'post_likes' AND column_name = 'id' AND table_schema = 'public'
      ) AS exists;
    `);
    if (!idColumnCheck.rows[0]?.exists) {
      this.logger.log(
        "⚠️ post_likes table exists but missing id column - recreating...",
      );
      await this.pool.query(`DROP TABLE IF EXISTS post_likes CASCADE;`);
      await this.pool.query(`
        CREATE TABLE post_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(post_id, user_id)
        );
      `);
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);`,
      );
      this.logger.log("✅ post_likes table recreated");
    }
  }

  private async ensurePostCommentsTable(): Promise<void> {
    const commentsTableCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'post_comments' AND table_schema = 'public'
      ) AS exists;
    `);
    if (!commentsTableCheck.rows[0]?.exists) {
      this.logger.log("📝 Creating post_comments table...");
      await this.createPostCommentsTable();
      this.logger.log("✅ post_comments table created");
      return;
    }
    const idColumnCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'post_comments' AND column_name = 'id' AND table_schema = 'public'
      ) AS exists;
    `);
    if (!idColumnCheck.rows[0]?.exists) {
      this.logger.log(
        "⚠️ post_comments table exists but missing id column - recreating...",
      );
      await this.pool.query(`DROP TABLE IF EXISTS comment_likes CASCADE;`);
      await this.pool.query(`DROP TABLE IF EXISTS post_comments CASCADE;`);
      await this.createPostCommentsTable();
      this.logger.log("✅ post_comments table recreated");
    }
  }

  private async createPostCommentsTable(): Promise<void> {
    await this.pool.query(`
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
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);`,
    );
  }

  private async ensureCommentLikesTable(): Promise<void> {
    const commentLikesTableCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'comment_likes' AND table_schema = 'public'
      ) AS exists;
    `);
    if (!commentLikesTableCheck.rows[0]?.exists) {
      this.logger.log("📝 Creating comment_likes table...");
      await this.pool.query(`
        CREATE TABLE comment_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(comment_id, user_id)
        );
      `);
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);`,
      );
      this.logger.log("✅ comment_likes table created");
    }
  }

  private async ensureUserNotificationsTable(): Promise<void> {
    const notificationsTableCheck = await this.pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_notifications' AND table_schema = 'public'
      ) AS exists;
    `);
    if (!notificationsTableCheck.rows[0]?.exists) {
      this.logger.log("📝 Creating user_notifications table...");
      await this.pool.query(`
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
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(user_id, is_read) WHERE is_read = false;`,
      );
      this.logger.log("✅ user_notifications table created");
    }
  }

  private async ensureLikesCommentsFunctionsAndTriggers(): Promise<void> {
    this.logger.log("📝 Ensuring SQL functions exist...");

    await this.pool.query(`
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
    `);
    await this.pool.query(`
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
    `);
    await this.pool.query(`
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
    `);
    this.logger.log("✅ SQL functions ensured");

    this.logger.log("📝 Ensuring triggers exist...");
    await this.pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
      CREATE TRIGGER trigger_update_post_likes_count
        AFTER INSERT OR DELETE ON post_likes
        FOR EACH ROW
        EXECUTE FUNCTION update_post_likes_count();
    `);
    await this.pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON post_comments;
      CREATE TRIGGER trigger_update_post_comments_count
        AFTER INSERT OR DELETE ON post_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_post_comments_count();
    `);
    await this.pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
      CREATE TRIGGER trigger_update_comment_likes_count
        AFTER INSERT OR DELETE ON comment_likes
        FOR EACH ROW
        EXECUTE FUNCTION update_comment_likes_count();
    `);
    await this.pool
      .query(
        `
        DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
        CREATE TRIGGER update_post_comments_updated_at 
          BEFORE UPDATE ON post_comments 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
      `,
      )
      .catch(() => {
        this.logger.log(
          "⚠️ update_updated_at_column function not found, skipping trigger",
        );
      });
  }
}
