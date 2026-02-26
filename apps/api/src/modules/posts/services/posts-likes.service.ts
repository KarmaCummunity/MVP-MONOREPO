import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import { PostsSchemaService } from "../posts-schema.service";

const CACHE_KEY_POST_LIKES = (postId: string) => `post_likes_${postId}`;

export interface ToggleLikeResult {
  success: boolean;
  data?: {
    post_id: string;
    is_liked: boolean;
    likes_count: number;
  };
  error?: string;
}

export interface GetPostLikesResult {
  success: boolean;
  data?: unknown[];
  total?: number;
  error?: string;
}

export interface CheckUserLikedResult {
  success: boolean;
  data?: { post_id: string; user_id: string; is_liked: boolean };
  error?: string;
}

@Injectable()
export class PostsLikesService {
  private readonly logger = new Logger(PostsLikesService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly postsSchemaService: PostsSchemaService,
  ) {}

  async ensureLikesCommentsTable(): Promise<void> {
    await this.postsSchemaService.ensureLikesCommentsTable();
  }

  async toggleLike(postId: string, userId: string): Promise<ToggleLikeResult> {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

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
        [userId],
      );
      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const existingLike = await client.query(
        "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId],
      );

      let isLiked: boolean;

      if (existingLike.rows.length > 0) {
        await client.query(
          "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
          [postId, userId],
        );
        isLiked = false;
      } else {
        await client.query(
          "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
          [postId, userId],
        );
        isLiked = true;

        const post = postCheck.rows[0];
        const user = userCheck.rows[0];
        await this.sendLikeNotification(client, post, user, userId, postId);
      }

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_likes WHERE post_id = $1",
        [postId],
      );
      const likesCount = countResult.rows[0]?.count ?? 0;

      await client.query(
        "UPDATE posts SET likes = $1, updated_at = NOW() WHERE id = $2",
        [likesCount, postId],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(CACHE_KEY_POST_LIKES(postId));

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
        this.logger.error("Rollback error", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Toggle like error", {
        message: errorMessage,
        postId,
        userId,
      });
      return {
        success: false,
        error: `Failed to toggle like: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  private async sendLikeNotification(
    client: import("pg").PoolClient,
    post: { author_id: string; post_type?: string; title: string },
    user: { name?: string },
    likerId: string,
    postId: string,
  ): Promise<void> {
    if (post.author_id === likerId) return;

    const likerName = user.name ?? "";
    const postTypeLabel =
      post.post_type === "task_completion" ? "task completion" : "post";
    const title = "New like";
    const content = `${likerName || "Someone"} liked your ${postTypeLabel}: "${post.title}"`;

    await client.query(
      `INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
       VALUES($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        post.author_id,
        title,
        content,
        "like",
        postId,
        { liker_id: likerId, post_id: postId },
      ],
    );
  }

  async getPostLikes(
    postId: string,
    limit: number,
    offset: number,
  ): Promise<GetPostLikesResult> {
    try {
      await this.ensureLikesCommentsTable();

      const { rows } = await this.pool.query(
        `SELECT pl.id, pl.created_at,
                json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as user
         FROM post_likes pl
         JOIN user_profiles u ON pl.user_id = u.id
         WHERE pl.post_id = $1
         ORDER BY pl.created_at DESC
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset],
      );

      const countResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM post_likes WHERE post_id = $1",
        [postId],
      );
      const total = Number.parseInt(
        String(countResult.rows[0]?.total ?? 0),
        10,
      );

      return { success: true, data: rows, total };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get post likes error", {
        message: errorMessage,
        postId,
      });
      return {
        success: false,
        error: `Failed to get likes: ${errorMessage}`,
      };
    }
  }

  async checkUserLiked(
    postId: string,
    userId: string,
  ): Promise<CheckUserLikedResult> {
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
          is_liked: Boolean(result.rows[0]?.is_liked),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Check user liked error", {
        message: errorMessage,
        postId,
        userId,
      });
      return {
        success: false,
        error: `Failed to check like status: ${errorMessage}`,
      };
    }
  }
}
