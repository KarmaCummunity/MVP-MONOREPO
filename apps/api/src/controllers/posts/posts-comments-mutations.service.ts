import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import { PostsSchemaService } from "./posts-schema.service";
import type { CommentBody } from "./posts.types";
import { safeRollback } from "./posts-pg-rollback.util";
import {
  fetchCommentUserProfile,
  insertCommentAndReturnRow,
  loadCommentAuthorOrFail,
  loadPostForCommentOrFail,
  notifyPostAuthorOfNewComment,
  parseAddCommentInput,
  refreshPostCommentsCount,
} from "./posts-comments-mutations.helpers";

@Injectable()
export class PostsCommentsMutationsService {
  private readonly logger = new Logger(PostsCommentsMutationsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly schema: PostsSchemaService,
  ) {}

  private async addCommentTx(
    client: PoolClient,
    postId: string,
    userId: string,
    text: string,
  ) {
    const post = await loadPostForCommentOrFail(client, postId, this.logger);
    if (!post) {
      return { success: false as const, error: "Post not found" };
    }

    const user = await loadCommentAuthorOrFail(client, userId);
    if (!user) {
      return { success: false as const, error: "User not found" };
    }

    const comment = await insertCommentAndReturnRow(
      client,
      postId,
      userId,
      text,
    );
    if (!comment) {
      return { success: false as const, error: "Failed to create comment" };
    }

    const userRow = await fetchCommentUserProfile(client, userId);
    const commentsCount = await refreshPostCommentsCount(client, postId);

    await notifyPostAuthorOfNewComment(
      client,
      post,
      user,
      userId,
      postId,
      text,
      comment.id,
    );

    await client.query("COMMIT");

    return {
      success: true as const,
      data: {
        ...comment,
        user: userRow,
        comments_count: commentsCount,
      },
    };
  }

  async addComment(postId: string, body: CommentBody) {
    const client = await this.pool.connect();
    try {
      await this.schema.ensureLikesCommentsTable();

      const parsed = parseAddCommentInput(body);
      if (!parsed.ok) {
        return { success: false, error: parsed.error };
      }

      await this.schema.ensurePostsTable();

      await client.query("BEGIN");
      const result = await this.addCommentTx(
        client,
        postId,
        parsed.user_id,
        parsed.text,
      );
      if (!result.success) {
        return result;
      }

      await this.redisCache.delete(`post_comments_${postId} `);
      return result;
    } catch (error) {
      await safeRollback(client, this.logger);
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
      await safeRollback(client, this.logger);
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
