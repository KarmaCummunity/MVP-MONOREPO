import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import { PostsSchemaService } from "./posts-schema.service";
import type { LikeBody } from "./posts.types";

@Injectable()
export class PostsLikesService {
  private readonly logger = new Logger(PostsLikesService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly schema: PostsSchemaService,
  ) {}

  async toggleLike(postId: string, body: LikeBody) {
    const client = await this.pool.connect();
    try {
      await this.schema.ensureLikesCommentsTable();

      const { user_id } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");

      const postCheck = await client.query(
        "SELECT id, author_id, title, post_type FROM posts WHERE id = $1",
        [postId],
      );
      if (postCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const userCheck = await client.query(
        "SELECT id, name FROM user_profiles WHERE id = $1",
        [user_id],
      );
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const existingLike = await client.query(
        "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
        [postId, user_id],
      );

      let isLiked: boolean;

      if (existingLike.rows.length > 0) {
        await client.query(
          "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
          [postId, user_id],
        );
        isLiked = false;
      } else {
        await client.query(
          "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
          [postId, user_id],
        );
        isLiked = true;

        const post = postCheck.rows[0];
        const user = userCheck.rows[0];

        if (post.author_id !== user_id) {
          const likerName = user.name || "משתמש";
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
              { liker_id: user_id, post_id: postId },
            ],
          );
        }
      }

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_likes WHERE post_id = $1",
        [postId],
      );
      const likesCount = countResult.rows[0]?.count || 0;

      await client.query(
        "UPDATE posts SET likes = $1, updated_at = NOW() WHERE id = $2",
        [likesCount, postId],
      );

      await client.query("COMMIT");

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

  async getPostLikes(postId: string, limitArg: string, offsetArg: string) {
    try {
      await this.schema.ensureLikesCommentsTable();

      const limit = parseInt(limitArg) || 50;
      const offset = parseInt(offsetArg) || 0;

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

      const countResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM post_likes WHERE post_id = $1",
        [postId],
      );

      return {
        success: true,
        data: rows,
        total: parseInt(countResult.rows[0]?.total || "0"),
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

  async checkUserLiked(postId: string, userId: string) {
    try {
      await this.schema.ensureLikesCommentsTable();

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
}
