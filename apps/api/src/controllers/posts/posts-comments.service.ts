import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import { PostsSchemaService } from "./posts-schema.service";
import type { UpdateCommentBody } from "./posts.types";

@Injectable()
export class PostsCommentsService {
  private readonly logger = new Logger(PostsCommentsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly schema: PostsSchemaService,
  ) {}

  async getPostComments(
    postId: string,
    limitArg: string,
    offsetArg: string,
    viewerId?: string,
  ) {
    try {
      await this.schema.ensureLikesCommentsTable();

      const limit = parseInt(limitArg) || 50;
      const offset = parseInt(offsetArg) || 0;

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

      const countResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM post_comments WHERE post_id = $1",
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

  async updateComment(
    postId: string,
    commentId: string,
    body: UpdateCommentBody,
  ) {
    try {
      await this.schema.ensureLikesCommentsTable();

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

      const { rows } = await this.pool.query(
        `
                UPDATE post_comments 
                SET text = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
                    `,
        [text.trim(), commentId],
      );

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
}
