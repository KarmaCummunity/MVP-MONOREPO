import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import type { Request } from "express";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";

@Injectable()
export class PostsVisibilityService {
  private readonly logger = new Logger(PostsVisibilityService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  private resolveUserId(req: Request, bodyUserId?: string): string | undefined {
    const u = req.user as unknown as Record<string, unknown> | undefined;
    const fromReq =
      (typeof u?.userId === "string" && u.userId) ||
      (typeof u?.id === "string" && u.id) ||
      (typeof u?.sub === "string" && u.sub);
    return fromReq || bodyUserId;
  }

  async hidePost(postId: string, body: { user_id?: string }, req: Request) {
    const client = await this.pool.connect();
    try {
      const user_id = this.resolveUserId(req, body.user_id);

      if (!user_id) {
        return { success: false, error: "User not authenticated" };
      }

      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      if (post.author_id !== user_id) {
        return {
          success: false,
          error: "Permission denied. You can only hide your own posts.",
        };
      }

      await client.query(
        `UPDATE posts 
                 SET status = 'hidden', updated_at = NOW()
                 WHERE id = $1`,
        [postId],
      );

      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [user_id, "post_hidden", JSON.stringify({ post_id: postId })],
      );

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

  async unhidePost(postId: string, body: { user_id?: string }, req: Request) {
    const client = await this.pool.connect();
    try {
      const user_id = this.resolveUserId(req, body.user_id);

      if (!user_id) {
        return { success: false, error: "User not authenticated" };
      }

      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      if (post.author_id !== user_id) {
        return {
          success: false,
          error: "Permission denied. You can only unhide your own posts.",
        };
      }

      await client.query(
        `UPDATE posts 
                 SET status = 'active', updated_at = NOW()
                 WHERE id = $1`,
        [postId],
      );

      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [user_id, "post_unhidden", JSON.stringify({ post_id: postId })],
      );

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
}
