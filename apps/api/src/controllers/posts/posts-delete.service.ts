import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { Request } from "express";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import { safeRollback } from "./posts-pg-rollback.util";
import { runPostDeletionByType } from "./posts-delete.helpers";
import { sessionUserIdString } from "./posts-session-user.util";

type PostRow = Record<string, unknown>;

type PermissionResult =
  | { allowed: true; isSuperAdmin: boolean; isOwner: boolean }
  | { allowed: false; error: string };

@Injectable()
export class PostsDeleteService {
  private readonly logger = new Logger(PostsDeleteService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  private async loadPostForDelete(client: PoolClient, postId: string) {
    return client.query(
      `SELECT p.*, u.roles 
                 FROM posts p
                 LEFT JOIN user_profiles u ON p.author_id = u.id
                 WHERE p.id = $1`,
      [postId],
    );
  }

  private async resolvePermission(
    client: PoolClient,
    userId: string,
    post: PostRow,
  ): Promise<PermissionResult> {
    const userResult = await client.query(
      "SELECT roles FROM user_profiles WHERE id = $1",
      [userId],
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { allowed: false, error: "User not found" };
    }

    const userRoles = userResult.rows[0].roles || [];
    const isSuperAdmin = userRoles.includes("super_admin");
    const isOwner = post.author_id === userId;

    if (!isOwner && !isSuperAdmin) {
      await client.query("ROLLBACK");
      return {
        allowed: false,
        error:
          "Permission denied. You can only delete your own posts or be a super admin.",
      };
    }

    return { allowed: true, isSuperAdmin, isOwner };
  }

  async deletePost(postId: string, req: Request) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const userId = sessionUserIdString(req.user);
      if (!userId) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not authenticated" };
      }

      const postResult = await this.loadPostForDelete(client, postId);

      if (postResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Post not found" };
      }

      const post = postResult.rows[0];

      const perm = await this.resolvePermission(client, userId, post);
      if (!perm.allowed) {
        return { success: false, error: perm.error };
      }

      this.logger.log(
        `🗑️ Deleting post ${postId} (type: ${post.post_type}) by user ${userId} (owner: ${perm.isOwner}, admin: ${perm.isSuperAdmin})`,
      );

      const { deletionStrategy, relatedEntityDeleted } =
        await runPostDeletionByType(client, post, postId, this.logger);

      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [
          userId,
          "post_deleted",
          JSON.stringify({
            post_id: postId,
            post_type: post.post_type,
            deletion_strategy: deletionStrategy,
            related_entity_deleted: relatedEntityDeleted,
            is_admin_action: perm.isSuperAdmin && !perm.isOwner,
          }),
        ],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(`post_${postId}`);
      await this.redisCache.invalidatePattern("posts_*");
      await this.redisCache.invalidatePattern("user_posts_*");

      return {
        success: true,
        data: {
          post_id: postId,
          post_type: post.post_type,
          deletion_strategy: deletionStrategy,
          message: relatedEntityDeleted
            ? `Post and related ${post.post_type} deleted successfully`
            : "Post deleted successfully",
        },
      };
    } catch (error) {
      await safeRollback(client, this.logger);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Delete post error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId: sessionUserIdString(req.user),
      });
      return {
        success: false,
        error: `Failed to delete post: ${errorMessage}`,
      };
    } finally {
      client.release();
    }
  }
}
