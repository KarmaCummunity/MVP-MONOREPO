import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import { PostsSchemaService } from "./posts-schema.service";
import type { CommentBody } from "./posts.types";

@Injectable()
export class PostsCommentsMutationsService {
  private readonly logger = new Logger(PostsCommentsMutationsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly schema: PostsSchemaService,
  ) {}

  async addComment(postId: string, body: CommentBody) {
    const client = await this.pool.connect();
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

      await this.schema.ensurePostsTable();

      await client.query("BEGIN");

      this.logger.log(`[addComment] Checking existence of post ${postId}`);

      const postCheck = await client.query(
        "SELECT id, author_id, title, post_type FROM posts WHERE id = $1",
        [postId],
      );

      this.logger.log(
        `[addComment] Post check result: ${postCheck.rows.length} rows found`,
      );

      if (postCheck.rows.length === 0) {
        const debugCheck = await client.query("SELECT id FROM posts LIMIT 5");
        this.logger.log(
          "[addComment] Debug - First 5 posts in DB:",
          debugCheck.rows,
        );

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

      const userResult = await client.query(
        `
                SELECT id, name, avatar_url FROM user_profiles WHERE id = $1
                    `,
        [user_id],
      );

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_comments WHERE post_id = $1",
        [postId],
      );
      const commentsCount = countResult.rows[0]?.count || 0;

      await client.query(
        "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
        [commentsCount, postId],
      );

      const post = postCheck.rows[0];
      const user = userCheck.rows[0];

      if (post.author_id !== user_id) {
        const commenterName = user.name || "משתמש";
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
            { commenter_id: user_id, post_id: postId, comment_id: comment.id },
          ],
        );
      }

      await client.query("COMMIT");

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

  async deleteComment(postId: string, commentId: string, userId: string) {
    const client = await this.pool.connect();
    try {
      await this.schema.ensureLikesCommentsTable();

      if (!userId) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");

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

      await client.query("DELETE FROM post_comments WHERE id = $1", [
        commentId,
      ]);

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_comments WHERE post_id = $1",
        [postId],
      );
      const commentsCount = countResult.rows[0]?.count || 0;

      await client.query(
        "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
        [commentsCount, postId],
      );

      await client.query("COMMIT");

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
}
