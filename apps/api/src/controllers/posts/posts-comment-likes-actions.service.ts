import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { PostsSchemaService } from "./posts-schema.service";
import type { LikeBody } from "./posts.types";

@Injectable()
export class PostsCommentLikesActionsService {
  private readonly logger = new Logger(PostsCommentLikesActionsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly schema: PostsSchemaService,
  ) {}

  async toggleCommentLike(postId: string, commentId: string, body: LikeBody) {
    const client = await this.pool.connect();
    try {
      await this.schema.ensureLikesCommentsTable();

      const { user_id } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");

      const commentCheck = await client.query(
        "SELECT id, user_id, text FROM post_comments WHERE id = $1 AND post_id = $2",
        [commentId, postId],
      );
      if (commentCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Comment not found" };
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
        "SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
        [commentId, user_id],
      );

      let isLiked: boolean;

      if (existingLike.rows.length > 0) {
        await client.query(
          "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
          [commentId, user_id],
        );
        isLiked = false;
      } else {
        await client.query(
          "INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)",
          [commentId, user_id],
        );
        isLiked = true;

        const comment = commentCheck.rows[0];
        const user = userCheck.rows[0];

        if (comment.user_id !== user_id) {
          const likerName = user.name || "משתמש";

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
              { liker_id: user_id, post_id: postId, comment_id: commentId },
            ],
          );
        }
      }

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM comment_likes WHERE comment_id = $1",
        [commentId],
      );
      const likesCount = countResult.rows[0]?.count || 0;

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
}
