import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../database/database.module";
import { RedisCacheService } from "../../redis/redis-cache.service";
import { PostsSchemaService } from "./posts-schema.service";
import type { LikeBody } from "./posts.types";
import { parseCountTotal, parseLimitOffset } from "./posts-pagination.util";
import { safeRollback } from "./posts-pg-rollback.util";
import {
  fetchPostForLike,
  fetchUserNameRow,
  insertPostLike,
  notifyPostAuthorOfLike,
  postLikeExists,
  removePostLike,
  syncPostLikesCount,
} from "./posts-likes.helpers";

@Injectable()
export class PostsLikesService {
  private readonly logger = new Logger(PostsLikesService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly schema: PostsSchemaService,
  ) {}

  private async runToggleLikeTx(
    client: PoolClient,
    postId: string,
    userId: string,
  ) {
    const post = await fetchPostForLike(client, postId);
    if (!post) {
      await client.query("ROLLBACK");
      return { success: false as const, error: "Post not found" };
    }

    const user = await fetchUserNameRow(client, userId);
    if (!user) {
      await client.query("ROLLBACK");
      return { success: false as const, error: "User not found" };
    }

    const hadLike = await postLikeExists(client, postId, userId);
    if (hadLike) {
      await removePostLike(client, postId, userId);
    } else {
      await insertPostLike(client, postId, userId);
      await notifyPostAuthorOfLike(client, post, user, userId, postId);
    }

    const likesCount = await syncPostLikesCount(client, postId);
    await client.query("COMMIT");

    return {
      success: true as const,
      data: {
        post_id: postId,
        is_liked: !hadLike,
        likes_count: likesCount,
      },
    };
  }

  async toggleLike(postId: string, body: LikeBody) {
    const client = await this.pool.connect();
    try {
      await this.schema.ensureLikesCommentsTable();

      const { user_id } = body;
      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      await client.query("BEGIN");
      const result = await this.runToggleLikeTx(client, postId, user_id);
      if (!result.success) {
        return result;
      }

      await this.redisCache.delete(`post_likes_${postId} `);
      return result;
    } catch (error) {
      await safeRollback(client, this.logger);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Toggle like error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId: body?.user_id,
      });
      return {
        success: false,
        error: `Failed to toggle like: ${errorMessage} `,
      };
    } finally {
      client.release();
    }
  }

  async getPostLikes(postId: string, limitArg: string, offsetArg: string) {
    try {
      await this.schema.ensureLikesCommentsTable();

      const { limit, offset } = parseLimitOffset(limitArg, offsetArg, {
        limit: 50,
        offset: 0,
      });

      const { rows } = await this.pool.query(
        `
                SELECT
                pl.id,
                    pl.created_at,
                    json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'avatar_url', u.avatar_url
                    ) as user
                FROM post_likes pl
                JOIN user_profiles u ON pl.user_id = u.id
                WHERE pl.post_id = $1
                ORDER BY pl.created_at DESC
                LIMIT $2 OFFSET $3
            `,
        [postId, limit, offset],
      );

      const countResult = await this.pool.query(
        "SELECT COUNT(*) as total FROM post_likes WHERE post_id = $1",
        [postId],
      );

      return {
        success: true,
        data: rows,
        total: parseCountTotal(countResult.rows[0]?.total),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Get post likes error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        limit: limitArg,
        offset: offsetArg,
      });
      return {
        success: false,
        error: `Failed to get likes: ${errorMessage} `,
      };
    }
  }

  async checkUserLiked(postId: string, userId: string) {
    try {
      await this.schema.ensureLikesCommentsTable();

      const result = await this.pool.query(
        "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2) as is_liked",
        [postId, userId],
      );

      return {
        success: true,
        data: {
          post_id: postId,
          user_id: userId,
          is_liked: result.rows[0]?.is_liked || false,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Check user liked error:", {
        message: errorMessage,
        stack: errorStack,
        postId,
        userId,
      });
      return {
        success: false,
        error: `Failed to check like status: ${errorMessage} `,
      };
    }
  }
}
