import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import type { Request } from "express";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";

@Injectable()
export class PostsUpdateService {
  private readonly logger = new Logger(PostsUpdateService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  async updatePost(
    postId: string,
    body: {
      user_id?: string;
      title?: string;
      description?: string;
      image?: string;
    },
    req: Request,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const user_id =
        req.user?.userId ||
        (req.user as unknown as Record<string, unknown>)?.id ||
        (req.user as unknown as Record<string, unknown>)?.sub ||
        body.user_id;

      if (!user_id) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not authenticated" };
      }

      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      if (post.author_id !== user_id) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "Permission denied. You can only update your own posts.",
        };
      }

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

      updates.push(`updated_at = NOW()`);
      values.push(postId);

      const updateQuery = `
                UPDATE posts 
                SET ${updates.join(", ")}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

      const result = await client.query(updateQuery, values);

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
}
