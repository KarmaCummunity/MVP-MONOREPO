import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Inject,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  isPostRowAbsent,
  runPostDeletionSideEffects,
} from "../services/post-deletion-side-effects";

interface LikeBody {
  user_id: string;
}

interface CommentBody {
  user_id: string;
  text: string;
}

interface UpdateCommentBody {
  user_id: string;
  text: string;
}

function parsePositiveIntWithDefault(
  value: string | undefined,
  defaultValue: number,
): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return n > 0 ? n : defaultValue;
}

@Controller("api/posts")
export class PostsController {
  private readonly logger = new Logger(PostsController.name);
  private readonly CACHE_TTL = 5 * 60; // 5 minutes cache

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {
    this.logger.log("🔄 PostsController initialized");
  }

  private getSessionUserId(req: import("express").Request): string | undefined {
    const user = req.user;
    if (!user || typeof user !== "object") {
      return undefined;
    }
    const candidate = (user as { userId?: unknown }).userId;
    return typeof candidate === "string" ? candidate : undefined;
  }

  /**
   * Patch posts table when it exists with valid id/author_id.
   * @returns `patched` — caller should return; `recreate` — table was dropped, run CREATE.
   */
  private async migrateExistingPostsTableColumns(
    columns: Set<string>,
  ): Promise<"patched" | "recreate"> {
    const hasId = columns.has("id");
    const hasAuthorId = columns.has("author_id");
    if (!hasId || !hasAuthorId) {
      this.logger.log(
        "⚠️  Detected legacy posts table structure - recreating...",
      );
      this.logger.log(`   - Has id column: ${hasId}`);
      this.logger.log(`   - Has author_id column: ${hasAuthorId}`);
      await this.pool.query("DROP TABLE IF EXISTS posts CASCADE;");
      return "recreate";
    }

    if (!columns.has("post_type")) {
      this.logger.log("📝 Adding post_type column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN post_type VARCHAR(50) DEFAULT 'task_completion';",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);",
      );
    }

    if (!columns.has("task_id")) {
      this.logger.log("📝 Adding task_id column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id);",
      );
    }

    if (!columns.has("ride_id")) {
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
                            WHERE post_type = 'ride' 
                            AND metadata->>'ride_id' IS NOT NULL
                            AND ride_id IS NULL;
                        `);
    }

    if (!columns.has("item_id")) {
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
                            WHERE post_type IN ('item', 'donation') 
                            AND metadata->>'item_id' IS NOT NULL
                            AND item_id IS NULL;
                        `);
    }

    if (!columns.has("metadata")) {
      this.logger.log("📝 Adding metadata column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;",
      );
    }

    if (!columns.has("status")) {
      this.logger.log("📝 Adding status column to posts table...");
      await this.pool.query(
        "ALTER TABLE posts ADD COLUMN status VARCHAR(50) DEFAULT 'active';",
      );
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);",
      );
    }

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

    return "patched";
  }

  /**
   * Ensure posts table exists with correct schema, create/migrate if needed
   */
  private async ensurePostsTable() {
    try {
      // Ensure uuid-ossp extension exists (required for uuid_generate_v4)
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

      // Check if posts table exists
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

        const columns = new Set(
          columnsCheck.rows.map((r) => String(r.column_name)),
        );
        const outcome = await this.migrateExistingPostsTableColumns(columns);
        if (outcome === "patched") {
          return;
        }
      }

      // Create posts table with correct schema (if dropped or didn't exist)
      await this.pool.query(`
                CREATE TABLE IF NOT EXISTS posts (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
                    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
                    ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
                    item_id TEXT, -- No FK to items table as it uses composite PK and text IDs
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

      // SEC-002.4: Create indexes individually — no string interpolation in SQL
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

      // Create trigger for updated_at
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

      this.logger.log("✅ Posts table ensured with correct schema");
    } catch (error) {
      this.logger.error("❌ Failed to ensure posts table:", error);
      // Don't throw - allow code to continue, but log the error
    }
  }

  /**
   * Ensure likes and comments tables exist
   */
  private async ensureLikesCommentsTable() {
    try {
      this.logger.log("📝 Ensuring likes and comments tables exist...");

      // First, verify that posts table exists (required for foreign keys)
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

      // Check if post_likes table exists and has correct structure
      const likesTableCheck = await this.pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'post_likes' AND table_schema = 'public'
                ) AS exists;
            `);

      if (likesTableCheck.rows[0]?.exists) {
        // Check if id column exists
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
      } else {
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
      }

      // Check if post_comments table exists and has correct structure
      const commentsTableCheck = await this.pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'post_comments' AND table_schema = 'public'
                ) AS exists;
            `);

      if (commentsTableCheck.rows[0]?.exists) {
        // Check if id column exists
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
          this.logger.log("✅ post_comments table recreated");
        }
      } else {
        this.logger.log("📝 Creating post_comments table...");
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
        this.logger.log("✅ post_comments table created");
      }

      // Check if comment_likes table exists
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

      // Check if user_notifications table exists (required for notifications)
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

      // Create SQL functions for updating counts
      this.logger.log("📝 Ensuring SQL functions exist...");

      // Function to update post likes count
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

      // Function to update post comments count
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

      // Function to update comment likes count
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

      // Create triggers
      this.logger.log("📝 Ensuring triggers exist...");

      // Trigger for post_likes
      await this.pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
                CREATE TRIGGER trigger_update_post_likes_count
                    AFTER INSERT OR DELETE ON post_likes
                    FOR EACH ROW
                    EXECUTE FUNCTION update_post_likes_count();
            `);

      // Trigger for post_comments
      await this.pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON post_comments;
                CREATE TRIGGER trigger_update_post_comments_count
                    AFTER INSERT OR DELETE ON post_comments
                    FOR EACH ROW
                    EXECUTE FUNCTION update_post_comments_count();
            `);

      // Trigger for comment_likes
      await this.pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
                CREATE TRIGGER trigger_update_comment_likes_count
                    AFTER INSERT OR DELETE ON comment_likes
                    FOR EACH ROW
                    EXECUTE FUNCTION update_comment_likes_count();
            `);

      // Trigger for post_comments updated_at
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
          // Function might not exist, that's okay
          this.logger.log(
            "⚠️ update_updated_at_column function not found, skipping trigger",
          );
        });

      this.logger.log("✅ Triggers ensured");
    } catch (error) {
      this.logger.error("❌ Failed to ensure likes/comments tables:", error);
    }
  }

  /**
   * Friends feed filters reference `user_follows`. If the table is missing (older DBs),
   * the main feed query fails and the fallback mapper strips real author names.
   */
  private async ensureUserFollowsTable() {
    try {
      const check = await this.pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'user_follows' AND table_schema = 'public'
                ) AS exists;
            `);
      if (check.rows[0]?.exists) {
        return;
      }
      this.logger.log(
        "📝 Creating user_follows table (required for friends feed)...",
      );
      await this.pool.query(`
                CREATE TABLE IF NOT EXISTS user_follows (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    follower_id UUID,
                    following_id UUID,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(follower_id, following_id)
                );
            `);
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);`,
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);`,
      );
      this.logger.log("✅ user_follows table ensured");
    } catch (error) {
      this.logger.error("❌ Failed to ensure user_follows table:", error);
    }
  }

  private async isPublicTableDefined(tableName: string): Promise<boolean> {
    try {
      const res = await this.pool.query(
        `
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = $1 AND table_schema = 'public'
                ) AS exists;
            `,
        [tableName],
      );
      return Boolean(res.rows[0]?.exists);
    } catch {
      return false;
    }
  }

  private async runGetPostsQueryWithFallback(
    query: string,
    params: unknown[],
    limit: number,
    offset: number,
  ): Promise<Record<string, unknown>[]> {
    try {
      const { rows } = await this.pool.query(query, params);
      this.logger.log(
        `✅ [getPosts] Query returned ${rows.length} posts (limit: ${limit}, offset: ${offset})`,
      );

      const taskPostsInResults = rows.filter(
        (p) =>
          p.post_type === "task_assignment" ||
          p.post_type === "task_completion",
      ).length;
      this.logger.log(
        `📊 Task-related posts in results: ${taskPostsInResults}/${rows.length}`,
      );

      if (rows.length > 0) {
        const samplePosts = rows.slice(0, 3).map((p) => ({
          id: p.id?.substring(0, 8),
          title: p.title?.substring(0, 30),
          post_type: p.post_type,
          author_id: p.author_id?.substring(0, 8),
          has_author: !!p.author,
          author_id_in_author: p.author?.id?.substring(0, 8),
        }));
        this.logger.log("📋 Sample posts:", samplePosts);
      } else {
        this.logger.warn("⚠️ getPosts returned 0 posts!");
      }

      return rows;
    } catch (queryError) {
      this.logger.error(`❌ [getPosts] Primary query failed:`, queryError);
      this.logger.log("⚠️ [getPosts] Attempting fallback query...");

      try {
        const fallbackQuery = `
                        SELECT 
                            id, author_id, title, description, images, likes, comments, created_at,
                            post_type, metadata, ride_id, item_id
                        FROM posts
                        ORDER BY created_at DESC
                        LIMIT $1 OFFSET $2
                    `;
        const fallbackParams = [limit, offset];
        const fallbackRes = await this.pool.query(
          fallbackQuery,
          fallbackParams,
        );

        const mappedRows = fallbackRes.rows.map(
          (row: Record<string, unknown>) => ({
            ...row,
            author: {
              id: row.author_id,
              name: "משתמש",
              avatar_url: "",
              email_verified: false,
            },
            task: null,
            is_liked: false,
            ride_data: null,
            item_data: null,
          }),
        );

        this.logger.log(
          `✅[getPosts] Fallback query returned ${mappedRows.length} posts`,
        );
        return mappedRows;
      } catch {
        this.logger.warn("⚠️ [getPosts] Fallback query also failed");
        throw queryError;
      }
    }
  }

  private buildGetPostsWhereState(
    postType: string | undefined,
    itemId: string | undefined,
    rideId: string | undefined,
    feedScopeFriends: boolean,
    userId: string | undefined,
    limit: number,
    offset: number,
  ): {
    whereConditions: string[];
    params: unknown[];
    paramIndex: number;
    viewerOrLikesParamIndex: number | null;
  } {
    const whereConditions: string[] = [];
    const params: unknown[] = [limit, offset];
    let paramIndex = 3;

    whereConditions.push(`(p.status IS NULL OR p.status != 'hidden')`);

    if (postType) {
      whereConditions.push(`p.post_type = $${paramIndex}`);
      params.push(postType);
      paramIndex++;
    }

    if (itemId) {
      whereConditions.push(`p.item_id = $${paramIndex}`);
      params.push(itemId);
      paramIndex++;
    }

    if (rideId) {
      whereConditions.push(`p.ride_id = $${paramIndex}`);
      params.push(rideId);
      paramIndex++;
    }

    let viewerOrLikesParamIndex: number | null = null;

    if (feedScopeFriends && userId) {
      whereConditions.push(
        `(p.author_id = $${paramIndex} OR p.author_id IN (SELECT uf.following_id FROM user_follows uf WHERE uf.follower_id = $${paramIndex}))`,
      );
      viewerOrLikesParamIndex = paramIndex;
      params.push(userId);
      paramIndex++;
    }

    return {
      whereConditions,
      params,
      paramIndex,
      viewerOrLikesParamIndex,
    };
  }

  private appendIsLikedToGetPostsQuery(
    baseQuery: string,
    userId: string | undefined,
    postLikesExists: boolean,
    viewerOrLikesParamIndex: number | null,
    paramIndex: number,
    params: unknown[],
  ): { query: string; paramIndex: number } {
    if (!userId || !postLikesExists) {
      return {
        query: `${baseQuery},
                    false as is_liked`,
        paramIndex,
      };
    }

    if (viewerOrLikesParamIndex === null) {
      const likesAt = paramIndex;
      params.push(userId);
      return {
        query: `${baseQuery},
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${likesAt}) as is_liked`,
        paramIndex: paramIndex + 1,
      };
    }

    return {
      query: `${baseQuery},
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${viewerOrLikesParamIndex}) as is_liked`,
      paramIndex,
    };
  }

  // ============================================
  // POSTS ENDPOINTS
  // ============================================

  @Get()
  async getPosts(
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
    @Query("user_id") userId?: string,
    @Query("post_type") postType?: string,
    @Query("item_id") itemId?: string,
    @Query("ride_id") rideId?: string,
    /** When `friends`, restrict to posts by the viewer and users they follow (`user_follows`). Requires `user_id` (viewer). */
    @Query("feed_scope") feedScope?: string,
  ) {
    try {
      await this.ensurePostsTable();
      await this.ensureLikesCommentsTable();

      const limit = parsePositiveIntWithDefault(limitArg, 20);
      const offset = Number.parseInt(String(offsetArg ?? ""), 10) || 0;
      const feedScopeFriends =
        String(feedScope || "")
          .trim()
          .toLowerCase() === "friends";
      if (feedScopeFriends && userId) {
        await this.ensureUserFollowsTable();
      }

      // Build query with optional user_id for checking if user liked each post
      // Use explicit column names to avoid conflicts in JOIN queries
      let query = `
                SELECT 
                    p.id,
                    p.author_id,
                    p.task_id,
                    p.ride_id,
                    p.item_id,
                    p.community_challenge_id,
                    p.title,
                    p.description,
                    p.images,
                    p.likes,
                    p.comments,
                    p.post_type,
                    p.metadata,
                    p.created_at,
                    p.updated_at,
                    CASE 
                        WHEN u.id IS NOT NULL THEN json_build_object(
                            'id', u.id,
                            'name', COALESCE(u.name, 'ללא שם'),
                            'avatar_url', COALESCE(u.avatar_url, ''),
                            'email_verified', COALESCE(u.email_verified, false)
                        )
                        ELSE json_build_object(
                            'id', p.author_id,
                            'name', 'משתמש לא נמצא',
                            'avatar_url', '',
                            'email_verified', false
                        )
                    END as author,
                    CASE WHEN t.id IS NOT NULL THEN json_build_object(
                        'id', t.id, 
                        'title', t.title, 
                        'description', t.description,
                        'status', t.status,
                        'estimated_hours', t.estimated_hours,
                        'due_date', t.due_date,
                        'assignees', (
                            SELECT json_agg(json_build_object(
                                'id', u_assignee.id, 
                                'name', u_assignee.name, 
                                'avatar', u_assignee.avatar_url
                            ))
                            FROM user_profiles u_assignee
                            WHERE u_assignee.id = ANY(t.assignees)
                        ),
                        'creator', (
                            SELECT json_build_object(
                                'id', uc.id,
                                'name', uc.name,
                                'avatar', uc.avatar_url
                            )
                            FROM user_profiles uc
                            WHERE uc.id::text = t.created_by::text
                               OR uc.firebase_uid = t.created_by::text
                               OR uc.google_id = t.created_by::text
                            LIMIT 1
                        )
                    ) ELSE NULL END as task,
                    CASE 
                        WHEN r.id IS NOT NULL THEN json_build_object(
                            'id', r.id, 
                            'from_location', r.from_location,
                            'to_location', r.to_location,
                            'departure_time', r.departure_time,
                            'available_seats', r.available_seats,
                            'price_per_seat', r.price_per_seat,
                            'status', r.status,
                            'description', r.description,
                            'requirements', r.requirements,
                            'metadata', r.metadata
                        ) 
                        ELSE NULL 
                    END as ride_data,
                    CASE 
                        WHEN i.id IS NOT NULL THEN json_build_object(
                            'id', i.id,
                            'title', i.title,
                            'status', i.status
                        )
                        ELSE NULL
                    END as item_data,
                    CASE 
                        WHEN cgc.id IS NOT NULL THEN json_build_object(
                            'id', cgc.id,
                            'type', cgc.type,
                            'frequency', cgc.frequency,
                            'difficulty', cgc.difficulty,
                            'category', cgc.category,
                            'goal_value', cgc.goal_value,
                            'deadline', cgc.deadline,
                            'image_url', cgc.image_url
                        )
                        ELSE NULL
                    END as community_challenge
            `;

      const postLikesExists = await this.isPublicTableDefined("post_likes");

      const { whereConditions, params, paramIndex, viewerOrLikesParamIndex } =
        this.buildGetPostsWhereState(
          postType,
          itemId,
          rideId,
          feedScopeFriends,
          userId,
          limit,
          offset,
        );

      const withLiked = this.appendIsLikedToGetPostsQuery(
        query,
        userId,
        postLikesExists,
        viewerOrLikesParamIndex,
        paramIndex,
        params,
      );
      query = withLiked.query;

      query += `
                FROM posts p
                LEFT JOIN user_profiles u ON p.author_id = u.id
                LEFT JOIN tasks t ON p.task_id = t.id
                LEFT JOIN rides r ON p.ride_id = r.id
                LEFT JOIN items i ON p.item_id = i.id
                LEFT JOIN community_group_challenges cgc ON p.community_challenge_id = cgc.id
            `;

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      query += `
                ORDER BY p.created_at DESC
                LIMIT $1 OFFSET $2
            `;

      this.logger.log("📝 [getPosts] Executing query with params:", {
        limit,
        offset,
        userId,
        hasUserId: !!userId,
        feedScope,
        feedScopeFriends,
      });

      const rows = await this.runGetPostsQueryWithFallback(
        query,
        params,
        limit,
        offset,
      );
      return { success: true, data: rows };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get posts error:", errorMessage);
      return {
        success: false,
        error: `Failed to get posts: ${errorMessage} `,
      };
    }
  }

  @Get("user/:userId")
  async getUserPosts(
    @Param("userId") userId: string,
    @Query("limit") limitArg: string,
    @Query("viewer_id") viewerId?: string,
  ) {
    try {
      await this.ensurePostsTable();
      await this.ensureLikesCommentsTable();

      const limit = parsePositiveIntWithDefault(limitArg, 20);

      // Use explicit column names to avoid conflicts in JOIN queries
      let query = `
                SELECT
                p.id,
                    p.author_id,
                    p.task_id,
                    p.ride_id,
                    p.item_id,
                    p.community_challenge_id,
                    p.title,
                    p.description,
                    p.images,
                    p.likes,
                    p.comments,
                    p.post_type,
                    p.metadata,
                    p.created_at,
                    p.updated_at,
                    CASE 
                        WHEN u.id IS NOT NULL THEN json_build_object(
                            'id', u.id,
                            'name', COALESCE(u.name, 'ללא שם'),
                            'avatar_url', COALESCE(u.avatar_url, ''),
                            'email_verified', COALESCE(u.email_verified, false)
                        )
                        ELSE json_build_object(
                            'id', p.author_id,
                            'name', 'משתמש לא נמצא',
                            'avatar_url', '',
                            'email_verified', false
                        )
                END as author,
                    CASE WHEN t.id IS NOT NULL THEN json_build_object(
                        'id', t.id, 
                        'title', t.title, 
                        'description', t.description,
                        'status', t.status,
                        'estimated_hours', t.estimated_hours,
                        'due_date', t.due_date,
                        'assignees', (
                            SELECT json_agg(json_build_object(
                                'id', u_assignee.id, 
                                'name', u_assignee.name, 
                                'avatar', u_assignee.avatar_url
                            ))
                            FROM user_profiles u_assignee
                            WHERE u_assignee.id = ANY(t.assignees)
                        ),
                        'creator', (
                            SELECT json_build_object(
                                'id', uc.id,
                                'name', uc.name,
                                'avatar', uc.avatar_url
                            )
                            FROM user_profiles uc
                            WHERE uc.id::text = t.created_by::text
                               OR uc.firebase_uid = t.created_by::text
                               OR uc.google_id = t.created_by::text
                            LIMIT 1
                        )
                    ) ELSE NULL END as task,
                    CASE 
                        WHEN r.id IS NOT NULL THEN json_build_object(
                            'id', r.id, 
                            'from_location', r.from_location,
                            'to_location', r.to_location,
                            'departure_time', r.departure_time,
                            'available_seats', r.available_seats,
                            'price_per_seat', r.price_per_seat,
                            'status', r.status,
                            'description', r.description,
                            'requirements', r.requirements,
                            'metadata', r.metadata
                        ) 
                        ELSE NULL 
                    END as ride_data,
                    CASE 
                        WHEN i.id IS NOT NULL THEN json_build_object(
                            'id', i.id,
                            'title', i.title,
                            'status', i.status
                        )
                        ELSE NULL
                    END as item_data,
                    CASE 
                        WHEN cgc.id IS NOT NULL THEN json_build_object(
                            'id', cgc.id,
                            'type', cgc.type,
                            'frequency', cgc.frequency,
                            'difficulty', cgc.difficulty,
                            'category', cgc.category,
                            'goal_value', cgc.goal_value,
                            'deadline', cgc.deadline,
                            'image_url', cgc.image_url
                        )
                        ELSE NULL
                    END as community_challenge
                `;

      // Check if post_likes table exists before using it
      const postLikesExists = await this.pool.query(`
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'post_likes' AND table_schema = 'public'
                ) AS exists;
                `);

      if (viewerId && postLikesExists.rows[0]?.exists) {
        query += `,
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) as is_liked
                `;
      } else {
        query += `,
                    false as is_liked
                `;
      }

      query += `
                FROM posts p
                LEFT JOIN user_profiles u ON p.author_id = u.id
                LEFT JOIN tasks t ON p.task_id = t.id
                LEFT JOIN rides r ON p.ride_id = r.id
                LEFT JOIN items i ON p.item_id = i.id
                LEFT JOIN community_group_challenges cgc ON p.community_challenge_id = cgc.id
                WHERE p.author_id = $1
                ORDER BY p.created_at DESC
                LIMIT $2
            `;

      const params = viewerId ? [userId, limit, viewerId] : [userId, limit];
      const { rows } = await this.pool.query(query, params);

      return { success: true, data: rows };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Get user posts error:", {
        message: errorMessage,
        stack: errorStack,
        userId,
        limit: limitArg,
        viewerId,
      });
      return {
        success: false,
        error: `Failed to get user posts: ${errorMessage} `,
      };
    }
  }

  private async notifyAuthorOfNewPostLike(
    client: PoolClient,
    post: { author_id: string; post_type: string; title: string },
    liker: { name: string | null },
    likerUserId: string,
    postId: string,
  ): Promise<void> {
    if (post.author_id === likerUserId) {
      return;
    }
    const likerName = liker.name || "משתמש";
    const postType =
      post.post_type === "task_completion" ? "השלמת משימה" : "פוסט";
    await client.query(
      `
                        INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
                VALUES($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    `,
      [
        post.author_id,
        "לייק חדש!",
        `${likerName} אהב / ה את ה${postType} שלך: "${post.title}"`,
        "like",
        postId,
        { liker_id: likerUserId, post_id: postId },
      ],
    );
  }

  private async notifyAuthorOfNewComment(
    client: PoolClient,
    post: { author_id: string; post_type: string },
    commenter: { name: string | null },
    commenterUserId: string,
    postId: string,
    text: string,
    commentId: string,
  ): Promise<void> {
    if (post.author_id === commenterUserId) {
      return;
    }
    const commenterName = commenter.name || "משתמש";
    const postType =
      post.post_type === "task_completion" ? "השלמת משימה" : "פוסט";
    await client.query(
      `
                    INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
                VALUES($1, $2, $3, $4, $5, $6)
                `,
      [
        post.author_id,
        "תגובה חדשה!",
        `${commenterName} הגיב / ה על ה${postType} שלך: "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
        "comment",
        postId,
        {
          commenter_id: commenterUserId,
          post_id: postId,
          comment_id: commentId,
        },
      ],
    );
  }

  private async notifyCommentAuthorOfLike(
    client: PoolClient,
    comment: { user_id: string; text: string },
    liker: { name: string | null },
    likerUserId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    if (comment.user_id === likerUserId) {
      return;
    }
    const likerName = liker.name || "משתמש";
    await client.query(
      `
                        INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
                VALUES($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    `,
      [
        comment.user_id,
        "לייק לתגובה!",
        `${likerName} אהב / ה את התגובה שלך: "${comment.text.substring(0, 30)}${comment.text.length > 30 ? "..." : ""}"`,
        "like",
        postId,
        { liker_id: likerUserId, post_id: postId, comment_id: commentId },
      ],
    );
  }

  // ============================================
  // LIKES ENDPOINTS
  // ============================================

  /**
   * Toggle like on a post (like if not liked, unlike if already liked)
   * POST /api/posts/:postId/like
   */
  @Post(":postId/like")
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param("postId") postId: string, @Body() body: LikeBody) {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

      const { user_id } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");

      // Check if post exists
      const postCheck = await client.query(
        "SELECT id, author_id, title, post_type FROM posts WHERE id = $1",
        [postId],
      );
      if (postCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      // Check if user exists
      const userCheck = await client.query(
        "SELECT id, name FROM user_profiles WHERE id = $1",
        [user_id],
      );
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      // Check if like already exists
      const existingLike = await client.query(
        "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
        [postId, user_id],
      );

      let isLiked: boolean;

      if (existingLike.rows.length > 0) {
        // Unlike - remove the like
        await client.query(
          "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
          [postId, user_id],
        );
        isLiked = false;
      } else {
        // Like - add new like
        await client.query(
          "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
          [postId, user_id],
        );
        isLiked = true;

        await this.notifyAuthorOfNewPostLike(
          client,
          postCheck.rows[0],
          userCheck.rows[0],
          user_id,
          postId,
        );
      }

      // Calculate likes count from post_likes table (more reliable than reading from posts.likes)
      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_likes WHERE post_id = $1",
        [postId],
      );
      const likesCount = countResult.rows[0]?.count || 0;

      // Update posts.likes manually as fallback (in case trigger didn't fire)
      await client.query(
        "UPDATE posts SET likes = $1, updated_at = NOW() WHERE id = $2",
        [likesCount, postId],
      );

      await client.query("COMMIT");

      // Clear cache
      await this.redisCache.delete(`post_likes_${postId} `);

      return {
        success: true,
        data: {
          post_id: postId,
          is_liked: isLiked,
          likes_count: likesCount,
        },
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Toggle like error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to toggle like: ${errorMessage} `,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get users who liked a post
   * GET /api/posts/:postId/likes
   */
  @Get(":postId/likes")
  async getPostLikes(
    @Param("postId") postId: string,
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
  ) {
    try {
      await this.ensureLikesCommentsTable();

      const limit = parsePositiveIntWithDefault(limitArg, 50);
      const offset = Number.parseInt(String(offsetArg ?? ""), 10) || 0;

      const { rows } = await this.pool.query(
        `
                SELECT
                pl.id,
                    pl.created_at,
                    json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'avatar_url', u.avatar_url
                    ) as user
                FROM post_likes pl
                JOIN user_profiles u ON pl.user_id = u.id
                WHERE pl.post_id = $1
                ORDER BY pl.created_at DESC
                LIMIT $2 OFFSET $3
            `,
        [postId, limit, offset],
      );

      // Get total count
      const countResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM post_likes WHERE post_id = $1",
        [postId],
      );

      return {
        success: true,
        data: rows,
        total: Number.parseInt(String(countResult.rows[0]?.total ?? "0"), 10),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Get post likes error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        limit: limitArg,
        offset: offsetArg,
      });
      return {
        success: false,
        error: `Failed to get likes: ${errorMessage} `,
      };
    }
  }

  /**
   * Check if user liked a post
   * GET /api/posts/:postId/likes/check/:userId
   */
  @Get(":postId/likes/check/:userId")
  async checkUserLiked(
    @Param("postId") postId: string,
    @Param("userId") userId: string,
  ) {
    try {
      await this.ensureLikesCommentsTable();

      const result = await this.pool.query(
        "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2) as is_liked",
        [postId, userId],
      );

      return {
        success: true,
        data: {
          post_id: postId,
          user_id: userId,
          is_liked: result.rows[0]?.is_liked || false,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Check user liked error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId,
      });
      return {
        success: false,
        error: `Failed to check like status: ${errorMessage} `,
      };
    }
  }

  // ============================================
  // COMMENTS ENDPOINTS
  // ============================================

  /**
   * Add a comment to a post
   * POST /api/posts/:postId/comments
   */
  @Post(":postId/comments")
  @UseGuards(JwtAuthGuard)
  async addComment(@Param("postId") postId: string, @Body() body: CommentBody) {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

      const { user_id, text } = body;

      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      if (!text || text.trim().length === 0) {
        return { success: false, error: "Comment text is required" };
      }

      if (text.length > 2000) {
        return {
          success: false,
          error: "Comment text is too long (max 2000 characters)",
        };
      }

      // Ensure schema is up to date (Just in case getPosts wasn't called yet or schema is stale)
      await this.ensurePostsTable();

      await client.query("BEGIN");

      this.logger.log(`[addComment] Checking existence of post ${postId}`);

      // Check if post exists
      const postCheck = await client.query(
        "SELECT id, author_id, title, post_type FROM posts WHERE id = $1",
        [postId],
      );

      this.logger.log(
        `[addComment] Post check result: ${postCheck.rows.length} rows found`,
      );

      if (postCheck.rows.length === 0) {
        // Debugging: Check if post exists with whitespace or case issues?
        const debugCheck = await client.query("SELECT id FROM posts LIMIT 5");
        this.logger.log(
          "[addComment] Debug - First 5 posts in DB:",
          debugCheck.rows,
        );

        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      // Check if user exists
      const userCheck = await client.query(
        "SELECT id, name FROM user_profiles WHERE id = $1",
        [user_id],
      );
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      // Insert comment
      const { rows } = await client.query(
        `
                INSERT INTO post_comments(post_id, user_id, text)
                VALUES($1, $2, $3)
                RETURNING id, post_id, user_id, text, likes_count, created_at, updated_at
                    `,
        [postId, user_id, text.trim()],
      );

      if (!rows || rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Failed to create comment" };
      }

      const comment = rows[0];

      // Get user info for the response
      const userResult = await client.query(
        `
                SELECT id, name, avatar_url FROM user_profiles WHERE id = $1
                    `,
        [user_id],
      );

      // Calculate comments count from post_comments table (more reliable than reading from posts.comments)
      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_comments WHERE post_id = $1",
        [postId],
      );
      const commentsCount = countResult.rows[0]?.count || 0;

      // Update posts.comments manually as fallback (in case trigger didn't fire)
      await client.query(
        "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
        [commentsCount, postId],
      );

      // Send notification to post author if not same user
      await this.notifyAuthorOfNewComment(
        client,
        postCheck.rows[0],
        userCheck.rows[0],
        user_id,
        postId,
        text,
        comment.id,
      );

      await client.query("COMMIT");

      // Clear cache
      await this.redisCache.delete(`post_comments_${postId} `);

      return {
        success: true,
        data: {
          ...comment,
          user: userResult.rows[0] || null,
          comments_count: commentsCount,
        },
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Add comment error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to add comment: ${errorMessage} `,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all comments for a post
   * GET /api/posts/:postId/comments
   */
  @Get(":postId/comments")
  async getPostComments(
    @Param("postId") postId: string,
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
    @Query("viewer_id") viewerId?: string,
  ) {
    try {
      await this.ensureLikesCommentsTable();

      const limit = parsePositiveIntWithDefault(limitArg, 50);
      const offset = Number.parseInt(String(offsetArg ?? ""), 10) || 0;

      let query = `
                SELECT
                c.id,
                    c.post_id,
                    c.user_id,
                    c.text,
                    c.likes_count,
                    c.created_at,
                    c.updated_at,
                    json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'avatar_url', u.avatar_url
                    ) as user
                `;

      // Add is_liked if viewer_id is provided
      if (viewerId) {
        query += `,
                    EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $4) as is_liked
                `;
      } else {
        query += `,
                    false as is_liked
                `;
      }

      query += `
                FROM post_comments c
                JOIN user_profiles u ON c.user_id = u.id
                WHERE c.post_id = $1
                ORDER BY c.created_at ASC
                LIMIT $2 OFFSET $3
            `;

      const params = viewerId
        ? [postId, limit, offset, viewerId]
        : [postId, limit, offset];
      const { rows } = await this.pool.query(query, params);

      // Get total count
      const countResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM post_comments WHERE post_id = $1",
        [postId],
      );

      return {
        success: true,
        data: rows,
        total: Number.parseInt(String(countResult.rows[0]?.total ?? "0"), 10),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Get post comments error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        limit: limitArg,
        offset: offsetArg,
        viewerId,
      });
      return {
        success: false,
        error: `Failed to get comments: ${errorMessage} `,
      };
    }
  }

  /**
   * Single post by id (same row shape as feed / user posts lists).
   * GET /api/posts/:postId — registered after `:postId/likes` and `:postId/comments` so those paths match first.
   */
  @Get(":postId")
  async getPostById(
    @Param("postId") postId: string,
    @Query("viewer_id") viewerId?: string,
  ) {
    try {
      await this.ensurePostsTable();
      await this.ensureLikesCommentsTable();

      let query = `
                SELECT
                p.id,
                    p.author_id,
                    p.task_id,
                    p.ride_id,
                    p.item_id,
                    p.community_challenge_id,
                    p.title,
                    p.description,
                    p.images,
                    p.likes,
                    p.comments,
                    p.post_type,
                    p.metadata,
                    p.created_at,
                    p.updated_at,
                    CASE 
                        WHEN u.id IS NOT NULL THEN json_build_object(
                            'id', u.id,
                            'name', COALESCE(u.name, 'ללא שם'),
                            'avatar_url', COALESCE(u.avatar_url, ''),
                            'email_verified', COALESCE(u.email_verified, false)
                        )
                        ELSE json_build_object(
                            'id', p.author_id,
                            'name', 'משתמש לא נמצא',
                            'avatar_url', '',
                            'email_verified', false
                        )
                END as author,
                    CASE WHEN t.id IS NOT NULL THEN json_build_object(
                        'id', t.id, 
                        'title', t.title, 
                        'description', t.description,
                        'status', t.status,
                        'estimated_hours', t.estimated_hours,
                        'due_date', t.due_date,
                        'assignees', (
                            SELECT json_agg(json_build_object(
                                'id', u_assignee.id, 
                                'name', u_assignee.name, 
                                'avatar', u_assignee.avatar_url
                            ))
                            FROM user_profiles u_assignee
                            WHERE u_assignee.id = ANY(t.assignees)
                        ),
                        'creator', (
                            SELECT json_build_object(
                                'id', uc.id,
                                'name', uc.name,
                                'avatar', uc.avatar_url
                            )
                            FROM user_profiles uc
                            WHERE uc.id::text = t.created_by::text
                               OR uc.firebase_uid = t.created_by::text
                               OR uc.google_id = t.created_by::text
                            LIMIT 1
                        )
                    ) ELSE NULL END as task,
                    CASE 
                        WHEN r.id IS NOT NULL THEN json_build_object(
                            'id', r.id, 
                            'from_location', r.from_location,
                            'to_location', r.to_location,
                            'departure_time', r.departure_time,
                            'available_seats', r.available_seats,
                            'price_per_seat', r.price_per_seat,
                            'status', r.status,
                            'description', r.description,
                            'requirements', r.requirements,
                            'metadata', r.metadata
                        ) 
                        ELSE NULL 
                    END as ride_data,
                    CASE 
                        WHEN i.id IS NOT NULL THEN json_build_object(
                            'id', i.id,
                            'title', i.title,
                            'status', i.status
                        )
                        ELSE NULL
                    END as item_data,
                    CASE 
                        WHEN cgc.id IS NOT NULL THEN json_build_object(
                            'id', cgc.id,
                            'type', cgc.type,
                            'frequency', cgc.frequency,
                            'difficulty', cgc.difficulty,
                            'category', cgc.category,
                            'goal_value', cgc.goal_value,
                            'deadline', cgc.deadline,
                            'image_url', cgc.image_url
                        )
                        ELSE NULL
                    END as community_challenge
                `;

      const postLikesExists = await this.pool.query(`
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'post_likes' AND table_schema = 'public'
                ) AS exists;
                `);

      if (viewerId && postLikesExists.rows[0]?.exists) {
        query += `,
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) as is_liked
                `;
      } else {
        query += `,
                    false as is_liked
                `;
      }

      query += `
                FROM posts p
                LEFT JOIN user_profiles u ON p.author_id = u.id
                LEFT JOIN tasks t ON p.task_id = t.id
                LEFT JOIN rides r ON p.ride_id = r.id
                LEFT JOIN items i ON p.item_id = i.id
                LEFT JOIN community_group_challenges cgc ON p.community_challenge_id = cgc.id
                WHERE p.id = $1
                LIMIT 1
            `;

      const params = viewerId ? [postId, viewerId] : [postId];
      const { rows } = await this.pool.query(query, params);

      if (rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get post by id error:", {
        message: errorMessage,
        postId,
        viewerId,
      });
      return {
        success: false,
        error: `Failed to get post: ${errorMessage}`,
      };
    }
  }

  /**
   * Update a comment (only owner can update)
   * PUT /api/posts/:postId/comments/:commentId
   */
  @Put(":postId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Body() body: UpdateCommentBody,
  ) {
    try {
      await this.ensureLikesCommentsTable();

      const { user_id, text } = body;

      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      if (!text || text.trim().length === 0) {
        return { success: false, error: "Comment text is required" };
      }

      if (text.length > 2000) {
        return {
          success: false,
          error: "Comment text is too long (max 2000 characters)",
        };
      }

      // Check if comment exists and belongs to user
      const existingComment = await this.pool.query(
        "SELECT id, user_id FROM post_comments WHERE id = $1 AND post_id = $2",
        [commentId, postId],
      );

      if (existingComment.rows.length === 0) {
        return { success: false, error: "Comment not found" };
      }

      if (existingComment.rows[0].user_id !== user_id) {
        return { success: false, error: "You can only edit your own comments" };
      }

      // Update comment
      const { rows } = await this.pool.query(
        `
                UPDATE post_comments 
                SET text = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
                    `,
        [text.trim(), commentId],
      );

      // Clear cache
      await this.redisCache.delete(`post_comments_${postId} `);

      return { success: true, data: rows[0] };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Update comment error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        commentId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to update comment: ${errorMessage} `,
      };
    }
  }

  /**
   * Delete a comment (only owner can delete)
   * DELETE /api/posts/:postId/comments/:commentId
   */
  @Delete(":postId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Query("user_id") userId: string,
  ) {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

      if (!userId) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");

      // Check if comment exists and belongs to user
      const existingComment = await client.query(
        "SELECT id, user_id FROM post_comments WHERE id = $1 AND post_id = $2",
        [commentId, postId],
      );

      if (existingComment.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Comment not found" };
      }

      if (existingComment.rows[0].user_id !== userId) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "You can only delete your own comments",
        };
      }

      // Delete comment (trigger will update count)
      await client.query("DELETE FROM post_comments WHERE id = $1", [
        commentId,
      ]);

      // Calculate comments count from post_comments table (more reliable than reading from posts.comments)
      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_comments WHERE post_id = $1",
        [postId],
      );
      const commentsCount = countResult.rows[0]?.count || 0;

      // Update posts.comments manually as fallback (in case trigger didn't fire)
      await client.query(
        "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
        [commentsCount, postId],
      );

      await client.query("COMMIT");

      // Clear cache
      await this.redisCache.delete(`post_comments_${postId} `);

      return {
        success: true,
        data: {
          deleted_comment_id: commentId,
          comments_count: commentsCount,
        },
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Delete comment error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        commentId,
        userId,
      });
      return {
        success: false,
        error: `Failed to delete comment: ${errorMessage} `,
      };
    } finally {
      client.release();
    }
  }

  // ============================================
  // COMMENT LIKES ENDPOINTS
  // ============================================

  /**
   * Toggle like on a comment
   * POST /api/posts/:postId/comments/:commentId/like
   */
  @Post(":postId/comments/:commentId/like")
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Body() body: LikeBody,
  ) {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

      const { user_id } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");

      // Check if comment exists
      const commentCheck = await client.query(
        "SELECT id, user_id, text FROM post_comments WHERE id = $1 AND post_id = $2",
        [commentId, postId],
      );
      if (commentCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Comment not found" };
      }

      // Check if user exists
      const userCheck = await client.query(
        "SELECT id, name FROM user_profiles WHERE id = $1",
        [user_id],
      );
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      // Check if like already exists
      const existingLike = await client.query(
        "SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
        [commentId, user_id],
      );

      let isLiked: boolean;

      if (existingLike.rows.length > 0) {
        // Unlike - remove the like
        await client.query(
          "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
          [commentId, user_id],
        );
        isLiked = false;
      } else {
        // Like - add new like
        await client.query(
          "INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)",
          [commentId, user_id],
        );
        isLiked = true;

        await this.notifyCommentAuthorOfLike(
          client,
          commentCheck.rows[0],
          userCheck.rows[0],
          user_id,
          postId,
          commentId,
        );
      }

      // Calculate likes count from comment_likes table (more reliable than reading from post_comments.likes_count)
      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM comment_likes WHERE comment_id = $1",
        [commentId],
      );
      const likesCount = countResult.rows[0]?.count || 0;

      // Update post_comments.likes_count manually as fallback (in case trigger didn't fire)
      await client.query(
        "UPDATE post_comments SET likes_count = $1, updated_at = NOW() WHERE id = $2",
        [likesCount, commentId],
      );

      await client.query("COMMIT");

      return {
        success: true,
        data: {
          comment_id: commentId,
          is_liked: isLiked,
          likes_count: likesCount,
        },
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Toggle comment like error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        commentId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to toggle comment like: ${errorMessage} `,
      };
    } finally {
      client.release();
    }
  }

  // ============================================
  // POST UPDATE ENDPOINT
  // ============================================

  /**
   * Update a post (title, description, image)
   * PUT /api/posts/:postId
   *
   * Rules:
   * 1. Only post owner can update
   * 2. Can update: title, description, image_url
   */
  @Put(":postId")
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param("postId") postId: string,
    @Body()
    body: {
      user_id?: string;
      title?: string;
      description?: string;
      image?: string;
    },
    @Req() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get user_id from authenticated request
      const user_id =
        req.user?.userId ||
        (req.user as unknown as Record<string, unknown>)?.id ||
        (req.user as unknown as Record<string, unknown>)?.sub ||
        body.user_id;

      if (!user_id) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not authenticated" };
      }

      // Get post details
      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      // Check if user is the owner
      if (post.author_id !== user_id) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "Permission denied. You can only update your own posts.",
        };
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (body.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(body.title);
      }

      if (body.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(body.description);
      }

      if (body.image !== undefined) {
        updates.push(`image_url = $${paramIndex++}`);
        values.push(body.image);
      }

      if (updates.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "No fields to update" };
      }

      // Add updated_at
      updates.push(`updated_at = NOW()`);
      values.push(postId);

      // Execute update
      const updateQuery = `
                UPDATE posts 
                SET ${updates.join(", ")}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

      const result = await client.query(updateQuery, values);

      // Track update activity
      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [
          user_id,
          "post_updated",
          JSON.stringify({
            post_id: postId,
            updated_fields: Object.keys(body).filter((k) => k !== "user_id"),
          }),
        ],
      );

      await client.query("COMMIT");

      // Clear relevant caches
      await this.redisCache.delete(`post_${postId}`);
      await this.redisCache.invalidatePattern("posts_*");
      await this.redisCache.invalidatePattern("user_posts_*");

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Update post error:", errorMessage);
      return {
        success: false,
        error: `Failed to update post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  // ============================================
  // POST HIDE/UNHIDE ENDPOINTS
  // ============================================

  /**
   * Hide a post (soft delete - sets status to 'hidden')
   * POST /api/posts/:postId/hide
   *
   * Rules:
   * 1. Only post owner can hide their posts
   */
  @Post(":postId/hide")
  @UseGuards(JwtAuthGuard)
  async hidePost(
    @Param("postId") postId: string,
    @Body() body: { user_id?: string },
    @Req() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    try {
      // Get user_id from authenticated request
      const user_id =
        req.user?.userId ||
        (req.user as unknown as Record<string, unknown>)?.id ||
        (req.user as unknown as Record<string, unknown>)?.sub ||
        body.user_id;

      if (!user_id) {
        return { success: false, error: "User not authenticated" };
      }

      // Get post details
      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      // Check if user is the owner
      if (post.author_id !== user_id) {
        return {
          success: false,
          error: "Permission denied. You can only hide your own posts.",
        };
      }

      // Update post status to 'hidden'
      await client.query(
        `UPDATE posts 
                 SET status = 'hidden', updated_at = NOW()
                 WHERE id = $1`,
        [postId],
      );

      // Track hide activity
      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [user_id, "post_hidden", JSON.stringify({ post_id: postId })],
      );

      // Clear relevant caches
      await this.redisCache.delete(`post_${postId}`);
      await this.redisCache.invalidatePattern("posts_*");
      await this.redisCache.invalidatePattern("user_posts_*");

      return {
        success: true,
        data: { status: "hidden", post_id: postId },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Hide post error:", errorMessage);
      return {
        success: false,
        error: `Failed to hide post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Unhide a post (restore from hidden status)
   * POST /api/posts/:postId/unhide
   *
   * Rules:
   * 1. Only post owner can unhide their posts
   */
  @Post(":postId/unhide")
  @UseGuards(JwtAuthGuard)
  async unhidePost(
    @Param("postId") postId: string,
    @Body() body: { user_id?: string },
    @Req() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    try {
      // Get user_id from authenticated request
      const user_id =
        req.user?.userId ||
        (req.user as unknown as Record<string, unknown>)?.id ||
        (req.user as unknown as Record<string, unknown>)?.sub ||
        body.user_id;

      if (!user_id) {
        return { success: false, error: "User not authenticated" };
      }

      // Get post details
      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      // Check if user is the owner
      if (post.author_id !== user_id) {
        return {
          success: false,
          error: "Permission denied. You can only unhide your own posts.",
        };
      }

      // Update post status back to 'active' or original status
      await client.query(
        `UPDATE posts 
                 SET status = 'active', updated_at = NOW()
                 WHERE id = $1`,
        [postId],
      );

      // Track unhide activity
      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [user_id, "post_unhidden", JSON.stringify({ post_id: postId })],
      );

      // Clear relevant caches
      await this.redisCache.delete(`post_${postId}`);
      await this.redisCache.invalidatePattern("posts_*");
      await this.redisCache.invalidatePattern("user_posts_*");

      return {
        success: true,
        data: { status: "active", post_id: postId },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Unhide post error:", errorMessage);
      return {
        success: false,
        error: `Failed to unhide post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  // ============================================
  // POST DELETION ENDPOINT
  // ============================================

  /**
   * Delete a post and its related entity (ride/item/task)
   * DELETE /api/posts/:postId
   *
   * Rules:
   * 1. User can delete their own posts
   * 2. Super admin can delete any post
   * 3. Deleting a post cascades based on post_type:
   *    - ride: Deletes the ride (post auto-deleted via CASCADE)
   *    - item/donation: Deletes the item (post auto-deleted via CASCADE)
   *    - task: Only deletes the post, not the task
   *    - general: Only deletes the post
   */
  @Delete(":postId")
  @UseGuards(JwtAuthGuard)
  async deletePost(
    @Param("postId") postId: string,
    @Req() req: import("express").Request,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get user_id from authenticated request (more secure/reliable than body)
      const user_id = this.getSessionUserId(req);

      if (!user_id) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not authenticated" };
      }

      // Get post details
      const postResult = await client.query(
        `SELECT p.*, u.roles 
                 FROM posts p
                 LEFT JOIN user_profiles u ON p.author_id = u.id
                 WHERE p.id = $1`,
        [postId],
      );

      if (postResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      // Check permissions
      const userResult = await client.query(
        "SELECT roles FROM user_profiles WHERE id = $1",
        [user_id],
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const userRoles = userResult.rows[0].roles || [];
      const isSuperAdmin = userRoles.includes("super_admin");
      const isOwner = post.author_id === user_id;

      if (!isOwner && !isSuperAdmin) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error:
            "Permission denied. You can only delete your own posts or be a super admin.",
        };
      }

      this.logger.log(
        `🗑️ Deleting post ${postId} (type: ${post.post_type}) by user ${user_id} (owner: ${isOwner}, admin: ${isSuperAdmin})`,
      );

      const { deletionStrategy, relatedEntityDeleted } =
        await runPostDeletionSideEffects(client, postId, post);

      const postRemoved = await isPostRowAbsent(client, postId);
      if (!postRemoved) {
        await client.query("ROLLBACK");
        this.logger.error(
          `Post ${postId} still present after deletion attempt (type: ${post.post_type})`,
        );
        return {
          success: false,
          error:
            "Post could not be removed. Please try again or contact support.",
        };
      }

      // Track deletion activity
      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [
          user_id,
          "post_deleted",
          JSON.stringify({
            post_id: postId,
            post_type: post.post_type,
            deletion_strategy: deletionStrategy,
            related_entity_deleted: relatedEntityDeleted,
            is_admin_action: isSuperAdmin && !isOwner,
          }),
        ],
      );

      await client.query("COMMIT");

      // Clear relevant caches
      await this.redisCache.delete(`post_${postId}`);
      await this.redisCache.invalidatePattern("posts_*");
      await this.redisCache.invalidatePattern("user_posts_*");

      return {
        success: true,
        data: {
          post_id: postId,
          post_type: post.post_type,
          deletion_strategy: deletionStrategy,
          message: relatedEntityDeleted
            ? `Post and related ${post.post_type} deleted successfully`
            : "Post deleted successfully",
        },
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Delete post error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId: this.getSessionUserId(req),
      });
      return {
        success: false,
        error: `Failed to delete post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }
}
