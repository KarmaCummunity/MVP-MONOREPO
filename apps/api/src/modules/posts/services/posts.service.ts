import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import { PostsSchemaService } from "../posts-schema.service";
import {
  buildPostsWhereClause,
  buildPostsSelectQuery,
} from "../helpers/posts-query.builder";
import { UpdatePostBody } from "../dto/update-post.dto";
import {
  isPostRowAbsent,
  runPostDeletionSideEffects,
} from "../../../services/post-deletion-side-effects";

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

export interface GetPostsResult {
  success: boolean;
  data?: unknown[];
  error?: string;
}

export interface GetUserPostsResult {
  success: boolean;
  data?: unknown[];
  error?: string;
}

export interface UpdatePostResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface HideUnhideResult {
  success: boolean;
  data?: { status: string; post_id: string };
  error?: string;
}

export interface DeletePostResult {
  success: boolean;
  data?: {
    post_id: string;
    post_type: string;
    deletion_strategy: string;
    message: string;
  };
  error?: string;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly postsSchemaService: PostsSchemaService,
  ) {}

  async ensurePostsTable(): Promise<void> {
    await this.postsSchemaService.ensurePostsTable();
  }

  async ensureLikesCommentsTable(): Promise<void> {
    await this.postsSchemaService.ensureLikesCommentsTable();
  }

  async checkPostLikesTableExists(): Promise<boolean> {
    try {
      const res = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'post_likes' AND table_schema = 'public'
        ) AS exists;
      `);
      return Boolean(res.rows[0]?.exists);
    } catch {
      return false;
    }
  }

  async getPosts(
    limitArg: string,
    offsetArg: string,
    userId?: string,
    postType?: string,
    itemId?: string,
    rideId?: string,
  ): Promise<GetPostsResult> {
    try {
      await this.ensurePostsTable();
      await this.ensureLikesCommentsTable();

      const limit = Number.parseInt(limitArg, 10) || DEFAULT_LIMIT;
      const offset = Number.parseInt(offsetArg, 10) || DEFAULT_OFFSET;

      const postLikesExists = await this.checkPostLikesTableExists();
      const {
        conditions,
        params: filterParams,
        nextParamIndex,
      } = buildPostsWhereClause(postType, itemId, rideId);

      const allParams: unknown[] = [limit, offset, ...filterParams];
      if (userId && postLikesExists) {
        allParams.push(userId);
      }

      const query =
        buildPostsSelectQuery(userId, nextParamIndex, postLikesExists) +
        ` WHERE ${conditions.join(" AND ")}` +
        ` ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`;

      this.logger.log("getPosts executing query", {
        limit,
        offset,
        hasUserId: Boolean(userId),
      });

      try {
        const { rows } = await this.pool.query(query, allParams);
        this.logger.log(`getPosts returned ${rows.length} posts`);

        const taskPostsCount = rows.filter(
          (p: { post_type?: string }) =>
            p.post_type === "task_assignment" ||
            p.post_type === "task_completion",
        ).length;
        this.logger.log(`Task posts: ${taskPostsCount}/${rows.length}`);

        if (rows.length > 0) {
          const sample = rows
            .slice(0, 3)
            .map((p: { id?: string; title?: string; post_type?: string }) => ({
              id: p.id?.substring(0, 8),
              title: p.title?.substring(0, 30),
              post_type: p.post_type,
            }));
          this.logger.log("Sample posts", sample);
        } else {
          this.logger.warn("getPosts returned 0 posts");
        }

        return { success: true, data: rows };
      } catch (queryError) {
        this.logger.error("getPosts primary query failed", queryError);
        this.logger.log("Attempting fallback query");

        try {
          const mappedRows = await this.executeFallbackPostsQuery(
            limit,
            offset,
          );
          this.logger.log(`Fallback returned ${mappedRows.length} posts`);
          return { success: true, data: mappedRows };
        } catch {
          this.logger.warn("Fallback query also failed");
          throw queryError;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get posts error", errorMessage);
      return { success: false, error: `Failed to get posts: ${errorMessage}` };
    }
  }

  private async executeFallbackPostsQuery(
    limit: number,
    offset: number,
  ): Promise<unknown[]> {
    const fallbackQuery = `
      SELECT id, author_id, title, description, images, likes, comments, created_at,
             post_type, metadata, ride_id, item_id
      FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2
    `;
    const fallbackRes = await this.pool.query(fallbackQuery, [limit, offset]);

    return fallbackRes.rows.map((row: Record<string, unknown>) => ({
      ...row,
      author: { id: row.author_id, name: "", avatar_url: "" },
      task: null,
      is_liked: false,
      ride_data: null,
      item_data: null,
    }));
  }

  async getUserPosts(
    userId: string,
    limitArg: string,
    viewerId?: string,
  ): Promise<GetUserPostsResult> {
    try {
      await this.ensurePostsTable();
      await this.ensureLikesCommentsTable();

      const limit = Number.parseInt(limitArg, 10) || DEFAULT_LIMIT;
      const postLikesExists = await this.checkPostLikesTableExists();
      const includeIsLiked = Boolean(viewerId && postLikesExists);

      const query = this.buildUserPostsSelectQuery(includeIsLiked);
      const params = includeIsLiked
        ? [userId, limit, viewerId]
        : [userId, limit];
      const { rows } = await this.pool.query(query, params);

      return { success: true, data: rows };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get user posts error", {
        message: errorMessage,
        userId,
        limit: limitArg,
        viewerId,
      });
      return {
        success: false,
        error: `Failed to get user posts: ${errorMessage}`,
      };
    }
  }

  private buildUserPostsSelectQuery(includeIsLiked: boolean): string {
    const isLikedFragment = includeIsLiked
      ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) as is_liked`
      : `false as is_liked`;

    return `
      SELECT
        p.id, p.author_id, p.task_id, p.ride_id, p.item_id,
        p.title, p.description, p.images, p.likes, p.comments,
        p.post_type, p.metadata, p.created_at, p.updated_at,
        CASE 
          WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', COALESCE(u.name, ''), 'avatar_url', COALESCE(u.avatar_url, ''))
          ELSE json_build_object('id', p.author_id, 'name', '', 'avatar_url', '')
        END as author,
        CASE WHEN t.id IS NOT NULL THEN json_build_object(
          'id', t.id, 'title', t.title, 'description', t.description,
          'status', t.status, 'estimated_hours', t.estimated_hours, 'due_date', t.due_date,
          'assignees', (
            SELECT json_agg(json_build_object('id', u_assignee.id, 'name', u_assignee.name, 'avatar', u_assignee.avatar_url))
            FROM user_profiles u_assignee WHERE u_assignee.id = ANY(t.assignees)
          )
        ) ELSE NULL END as task,
        CASE WHEN r.id IS NOT NULL THEN json_build_object(
          'id', r.id, 'from_location', r.from_location, 'to_location', r.to_location,
          'departure_time', r.departure_time, 'available_seats', r.available_seats,
          'price_per_seat', r.price_per_seat, 'status', r.status
        ) ELSE NULL END as ride_data,
        CASE WHEN i.id IS NOT NULL THEN json_build_object('id', i.id, 'title', i.title, 'status', i.status)
        ELSE NULL END as item_data,
        ${isLikedFragment}
      FROM posts p
      LEFT JOIN user_profiles u ON p.author_id = u.id
      LEFT JOIN tasks t ON p.task_id = t.id
      LEFT JOIN rides r ON p.ride_id = r.id
      LEFT JOIN items i ON p.item_id = i.id
      WHERE p.author_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `;
  }

  async updatePost(
    postId: string,
    body: UpdatePostBody,
    userId: string,
  ): Promise<UpdatePostResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];
      if (post.author_id !== userId) {
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
        `INSERT INTO user_activities (user_id, activity_type, activity_data) VALUES ($1, $2, $3)`,
        [
          userId,
          "post_updated",
          JSON.stringify({
            post_id: postId,
            updated_fields: Object.keys(body).filter((k) => k !== "user_id"),
          }),
        ],
      );

      await client.query("COMMIT");

      await this.clearPostCaches(postId);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Update post error", errorMessage);
      return {
        success: false,
        error: `Failed to update post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  async hidePost(postId: string, userId: string): Promise<HideUnhideResult> {
    const client = await this.pool.connect();
    try {
      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];
      if (post.author_id !== userId) {
        return {
          success: false,
          error: "Permission denied. You can only hide your own posts.",
        };
      }

      await client.query(
        `UPDATE posts SET status = 'hidden', updated_at = NOW() WHERE id = $1`,
        [postId],
      );

      await client.query(
        `INSERT INTO user_activities (user_id, activity_type, activity_data) VALUES ($1, $2, $3)`,
        [userId, "post_hidden", JSON.stringify({ post_id: postId })],
      );

      await this.clearPostCaches(postId);

      return {
        success: true,
        data: { status: "hidden", post_id: postId },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Hide post error", errorMessage);
      return {
        success: false,
        error: `Failed to hide post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  async unhidePost(postId: string, userId: string): Promise<HideUnhideResult> {
    const client = await this.pool.connect();
    try {
      const postResult = await client.query(
        "SELECT * FROM posts WHERE id = $1",
        [postId],
      );

      if (postResult.rows.length === 0) {
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];
      if (post.author_id !== userId) {
        return {
          success: false,
          error: "Permission denied. You can only unhide your own posts.",
        };
      }

      await client.query(
        `UPDATE posts SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [postId],
      );

      await client.query(
        `INSERT INTO user_activities (user_id, activity_type, activity_data) VALUES ($1, $2, $3)`,
        [userId, "post_unhidden", JSON.stringify({ post_id: postId })],
      );

      await this.clearPostCaches(postId);

      return {
        success: true,
        data: { status: "active", post_id: postId },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Unhide post error", errorMessage);
      return {
        success: false,
        error: `Failed to unhide post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  async deletePost(postId: string, userId: string): Promise<DeletePostResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const postResult = await client.query(
        `SELECT p.*, u.roles 
         FROM posts p
         LEFT JOIN user_profiles u ON p.author_id = u.id
         WHERE p.id = $1`,
        [postId],
      );

      if (postResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      const userResult = await client.query(
        "SELECT roles FROM user_profiles WHERE id = $1",
        [userId],
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const userRoles = userResult.rows[0].roles || [];
      const isSuperAdmin = userRoles.includes("super_admin");
      const isOwner = post.author_id === userId;

      if (!isOwner && !isSuperAdmin) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error:
            "Permission denied. You can only delete your own posts or be a super admin.",
        };
      }

      this.logger.log(
        `Deleting post ${postId} (type: ${post.post_type}) by user ${userId} (owner: ${isOwner}, admin: ${isSuperAdmin})`,
      );

      const { deletionStrategy, relatedEntityDeleted } =
        await runPostDeletionSideEffects(client, postId, post);

      const postRemoved = await isPostRowAbsent(client, postId);
      if (!postRemoved) {
        await client.query("ROLLBACK");
        this.logger.error(
          `Post ${postId} still present after deletion attempt (type: ${post.post_type})`,
        );
        return {
          success: false,
          error:
            "Post could not be removed. Please try again or contact support.",
        };
      }

      await client.query(
        `INSERT INTO user_activities (user_id, activity_type, activity_data) VALUES ($1, $2, $3)`,
        [
          userId,
          "post_deleted",
          JSON.stringify({
            post_id: postId,
            post_type: post.post_type,
            deletion_strategy: deletionStrategy,
            related_entity_deleted: relatedEntityDeleted,
            is_admin_action: isSuperAdmin && !isOwner,
          }),
        ],
      );

      await client.query("COMMIT");

      await this.clearPostCaches(postId);

      const message = relatedEntityDeleted
        ? `Post and related ${post.post_type} deleted successfully`
        : "Post deleted successfully";

      return {
        success: true,
        data: {
          post_id: postId,
          post_type: post.post_type,
          deletion_strategy: deletionStrategy,
          message,
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
      this.logger.error("Delete post error", {
        message: errorMessage,
        postId,
        userId,
      });
      return {
        success: false,
        error: `Failed to delete post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }

  private async clearPostCaches(postId: string): Promise<void> {
    await this.redisCache.delete(`post_${postId}`);
    await this.redisCache.invalidatePattern("posts_*");
    await this.redisCache.invalidatePattern("user_posts_*");
  }
}
