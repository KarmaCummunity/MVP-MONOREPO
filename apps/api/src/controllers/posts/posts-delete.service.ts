import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import type { Request } from "express";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import type { SessionTokenPayload } from "../../auth/services/jwt.service";

@Injectable()
export class PostsDeleteService {
  private readonly logger = new Logger(PostsDeleteService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  async deletePost(postId: string, req: Request) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const payload = req.user as SessionTokenPayload | undefined;
      const user_id =
        payload?.userId ||
        (payload as unknown as Record<string, unknown>)?.id ||
        (payload as unknown as Record<string, unknown>)?.sub;

      if (!user_id) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not authenticated" };
      }

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
        [user_id],
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const userRoles = userResult.rows[0].roles || [];
      const isSuperAdmin = userRoles.includes("super_admin");
      const isOwner = post.author_id === user_id;

      if (!isOwner && !isSuperAdmin) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error:
            "Permission denied. You can only delete your own posts or be a super admin.",
        };
      }

      this.logger.log(
        `🗑️ Deleting post ${postId} (type: ${post.post_type}) by user ${user_id} (owner: ${isOwner}, admin: ${isSuperAdmin})`,
      );

      let deletionStrategy = "post_only";
      let relatedEntityDeleted = false;

      switch (post.post_type) {
        case "ride":
          if (post.ride_id) {
            await client.query("DELETE FROM rides WHERE id = $1", [
              post.ride_id,
            ]);
            deletionStrategy = "ride_cascade";
            relatedEntityDeleted = true;
            this.logger.log(
              `✅ Deleted ride ${post.ride_id} (post auto-deleted via CASCADE)`,
            );
          } else {
            await client.query("DELETE FROM posts WHERE id = $1", [postId]);
          }
          break;

        case "item":
        case "donation":
          if (post.item_id) {
            await client.query("DELETE FROM items WHERE id = $1", [
              post.item_id,
            ]);
            deletionStrategy = "item_cascade";
            relatedEntityDeleted = true;
            this.logger.log(
              `✅ Deleted item ${post.item_id} (post auto-deleted via CASCADE)`,
            );
          } else {
            await client.query("DELETE FROM posts WHERE id = $1", [postId]);
          }
          break;

        case "task_completion":
        case "task_assignment":
          await client.query("DELETE FROM posts WHERE id = $1", [postId]);
          this.logger.log(
            `✅ Deleted task post ${postId} (task ${post.task_id} preserved)`,
          );
          break;

        default:
          await client.query("DELETE FROM posts WHERE id = $1", [postId]);
          this.logger.log(`✅ Deleted general post ${postId}`);
      }

      await client.query(
        `
                INSERT INTO user_activities (user_id, activity_type, activity_data)
                VALUES ($1, $2, $3)
            `,
        [
          user_id,
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
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.logger.error("Rollback error:", rollbackError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Delete post error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId:
          (req?.user as SessionTokenPayload | undefined)?.userId ||
          (req?.user as unknown as Record<string, unknown>)?.id,
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
