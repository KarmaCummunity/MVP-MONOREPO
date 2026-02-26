import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import { PostsSchemaService } from "../posts-schema.service";
import { CommentBody, UpdateCommentBody } from "../dto/comment.dto";
import { LikeBody } from "../dto/like.dto";

const COMMENT_TEXT_MAX_LENGTH = 2000;
const CACHE_KEY_POST_COMMENTS = (postId: string) => `post_comments_${postId}`;

export interface AddCommentResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface GetPostCommentsResult {
  success: boolean;
  data?: unknown[];
  total?: number;
  error?: string;
}

export interface UpdateCommentResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DeleteCommentResult {
  success: boolean;
  data?: { deleted_comment_id: string; comments_count: number };
  error?: string;
}

export interface ToggleCommentLikeResult {
  success: boolean;
  data?: {
    comment_id: string;
    is_liked: boolean;
    likes_count: number;
  };
  error?: string;
}

@Injectable()
export class PostsCommentsService {
  private readonly logger = new Logger(PostsCommentsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly postsSchemaService: PostsSchemaService,
  ) {}

  async ensureLikesCommentsTable(): Promise<void> {
    await this.postsSchemaService.ensureLikesCommentsTable();
  }

  async ensurePostsTable(): Promise<void> {
    await this.postsSchemaService.ensurePostsTable();
  }

  validateCommentInput(
    userId?: string,
    text?: string,
  ): { valid: boolean; error?: string } {
    if (!userId) {
      return { valid: false, error: "user_id is required" };
    }
    if (!text || text.trim().length === 0) {
      return { valid: false, error: "Comment text is required" };
    }
    if (text.length > COMMENT_TEXT_MAX_LENGTH) {
      return {
        valid: false,
        error: `Comment text is too long (max ${COMMENT_TEXT_MAX_LENGTH} characters)`,
      };
    }
    return { valid: true };
  }

  async addComment(
    postId: string,
    body: CommentBody,
  ): Promise<AddCommentResult> {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();
      await this.ensurePostsTable();

      const { user_id, text } = body;
      const validation = this.validateCommentInput(user_id, text);
      if (!validation.valid) {
        return { success: false, error: validation.error };
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

      const { rows } = await client.query(
        `INSERT INTO post_comments(post_id, user_id, text)
         VALUES($1, $2, $3)
         RETURNING id, post_id, user_id, text, likes_count, created_at, updated_at`,
        [postId, user_id, text?.trim() ?? ""],
      );

      if (!rows?.length) {
        await client.query("ROLLBACK");
        return { success: false, error: "Failed to create comment" };
      }

      const comment = rows[0];

      const userResult = await client.query(
        `SELECT id, name, avatar_url FROM user_profiles WHERE id = $1`,
        [user_id],
      );

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM post_comments WHERE post_id = $1",
        [postId],
      );
      const commentsCount = countResult.rows[0]?.count ?? 0;

      await client.query(
        "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
        [commentsCount, postId],
      );

      const post = postCheck.rows[0];
      const user = userCheck.rows[0];
      await this.sendCommentNotification(
        client,
        post,
        user,
        user_id,
        postId,
        text ?? "",
        comment,
      );

      await client.query("COMMIT");

      await this.redisCache.delete(CACHE_KEY_POST_COMMENTS(postId));

      return {
        success: true,
        data: {
          ...comment,
          user: userResult.rows[0] ?? null,
          comments_count: commentsCount,
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
      this.logger.error("Add comment error", {
        message: errorMessage,
        postId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to add comment: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  private async sendCommentNotification(
    client: import("pg").PoolClient,
    post: { author_id: string; post_type?: string },
    user: { name?: string },
    commenterId: string,
    postId: string,
    text: string,
    comment: { id: string },
  ): Promise<void> {
    if (post.author_id === commenterId) return;

    const commenterName = user.name ?? "";
    const postTypeLabel =
      post.post_type === "task_completion" ? "task completion" : "post";
    const preview = text.length > 30 ? `${text.substring(0, 30)}...` : text;
    const title = "New comment";
    const content = `${commenterName || "Someone"} commented on your ${postTypeLabel}: "${preview}"`;

    await client.query(
      `INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
       VALUES($1, $2, $3, $4, $5, $6)`,
      [
        post.author_id,
        title,
        content,
        "comment",
        postId,
        {
          commenter_id: commenterId,
          post_id: postId,
          comment_id: comment.id,
        },
      ],
    );
  }

  async getPostComments(
    postId: string,
    limit: number,
    offset: number,
    viewerId?: string,
  ): Promise<GetPostCommentsResult> {
    try {
      await this.ensureLikesCommentsTable();

      const isLikedFragment = viewerId
        ? `EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $4) as is_liked`
        : `false as is_liked`;

      const query = `
        SELECT
          c.id, c.post_id, c.user_id, c.text, c.likes_count, c.created_at, c.updated_at,
          json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as user,
          ${isLikedFragment}
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
      const total = Number.parseInt(
        String(countResult.rows[0]?.total ?? 0),
        10,
      );

      return { success: true, data: rows, total };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get post comments error", {
        message: errorMessage,
        postId,
      });
      return {
        success: false,
        error: `Failed to get comments: ${errorMessage}`,
      };
    }
  }

  async updateComment(
    postId: string,
    commentId: string,
    body: UpdateCommentBody,
  ): Promise<UpdateCommentResult> {
    try {
      await this.ensureLikesCommentsTable();

      const { user_id, text } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }
      if (!text || text.trim().length === 0) {
        return { success: false, error: "Comment text is required" };
      }
      if (text.length > COMMENT_TEXT_MAX_LENGTH) {
        return {
          success: false,
          error: `Comment text is too long (max ${COMMENT_TEXT_MAX_LENGTH} characters)`,
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
        return {
          success: false,
          error: "You can only edit your own comments",
        };
      }

      const { rows } = await this.pool.query(
        `UPDATE post_comments SET text = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [text.trim(), commentId],
      );

      await this.redisCache.delete(CACHE_KEY_POST_COMMENTS(postId));

      return { success: true, data: rows[0] };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Update comment error", {
        message: errorMessage,
        postId,
        commentId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to update comment: ${errorMessage}`,
      };
    }
  }

  async deleteComment(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<DeleteCommentResult> {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

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
      const commentsCount = countResult.rows[0]?.count ?? 0;

      await client.query(
        "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
        [commentsCount, postId],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(CACHE_KEY_POST_COMMENTS(postId));

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
        this.logger.error("Rollback error", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Delete comment error", {
        message: errorMessage,
        postId,
        commentId,
        userId,
      });
      return {
        success: false,
        error: `Failed to delete comment: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  async toggleCommentLike(
    postId: string,
    commentId: string,
    body: LikeBody,
  ): Promise<ToggleCommentLikeResult> {
    const client = await this.pool.connect();
    try {
      await this.ensureLikesCommentsTable();

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
          const likerName = user.name ?? "";
          const preview =
            comment.text.length > 30
              ? `${comment.text.substring(0, 30)}...`
              : comment.text;
          await client.query(
            `INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
             VALUES($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [
              comment.user_id,
              "Like on comment",
              `${likerName || "Someone"} liked your comment: "${preview}"`,
              "like",
              postId,
              {
                liker_id: user_id,
                post_id: postId,
                comment_id: commentId,
              },
            ],
          );
        }
      }

      const countResult = await client.query(
        "SELECT COUNT(*)::int as count FROM comment_likes WHERE comment_id = $1",
        [commentId],
      );
      const likesCount = countResult.rows[0]?.count ?? 0;

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
        this.logger.error("Rollback error", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Toggle comment like error", {
        message: errorMessage,
        postId,
        commentId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to toggle comment like: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }
}
