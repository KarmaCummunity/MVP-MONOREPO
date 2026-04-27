import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../database/database.module";
import { PostsSchemaService } from "./posts-schema.service";
import type { LikeBody } from "./posts.types";
import { safeRollback } from "./posts-pg-rollback.util";
import {
  commentLikeExists,
  fetchCommentForLike,
  fetchUserNameForLike,
  insertCommentLike,
  notifyCommentAuthorOfLike,
  removeCommentLike,
  syncCommentLikesCount,
} from "./posts-comment-likes.helpers";

@Injectable()
export class PostsCommentLikesActionsService {
  private readonly logger = new Logger(PostsCommentLikesActionsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly schema: PostsSchemaService,
  ) {}

  private async runToggleCommentLikeTx(
    client: PoolClient,
    postId: string,
    commentId: string,
    userId: string,
  ) {
    const comment = await fetchCommentForLike(client, commentId, postId);
    if (!comment) {
      await client.query("ROLLBACK");
      return { success: false as const, error: "Comment not found" };
    }

    const user = await fetchUserNameForLike(client, userId);
    if (!user) {
      await client.query("ROLLBACK");
      return { success: false as const, error: "User not found" };
    }

    const hadLike = await commentLikeExists(client, commentId, userId);
    if (hadLike) {
      await removeCommentLike(client, commentId, userId);
    } else {
      await insertCommentLike(client, commentId, userId);
      await notifyCommentAuthorOfLike(
        client,
        comment,
        user,
        userId,
        postId,
        commentId,
      );
    }

    const likesCount = await syncCommentLikesCount(client, commentId);
    await client.query("COMMIT");

    return {
      success: true as const,
      data: {
        comment_id: commentId,
        is_liked: !hadLike,
        likes_count: likesCount,
      },
    };
  }

  async toggleCommentLike(postId: string, commentId: string, body: LikeBody) {
    const client = await this.pool.connect();
    try {
      await this.schema.ensureLikesCommentsTable();

      const { user_id } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");
      const result = await this.runToggleCommentLikeTx(
        client,
        postId,
        commentId,
        user_id,
      );
      if (!result.success) {
        return result;
      }
      return result;
    } catch (error) {
      await safeRollback(client, this.logger);
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
