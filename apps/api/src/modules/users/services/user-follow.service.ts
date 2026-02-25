import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";

export type FollowBody = {
  follower_id: string;
};

@Injectable()
export class UserFollowService {
  private readonly logger = new Logger(UserFollowService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  async followUser(
    userId: string,
    followData: FollowBody,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
        INSERT INTO user_follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `,
        [followData.follower_id, userId],
      );

      await client.query(
        `
        UPDATE user_profiles 
        SET followers_count = (
          SELECT COUNT(*) FROM user_follows WHERE following_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [userId],
      );

      await client.query(
        `
        UPDATE user_profiles 
        SET following_count = (
          SELECT COUNT(*) FROM user_follows WHERE follower_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [followData.follower_id],
      );

      await client.query(
        `
        INSERT INTO user_activities (user_id, activity_type, activity_data)
        VALUES ($1, $2, $3)
      `,
        [
          followData.follower_id,
          "user_followed",
          JSON.stringify({ followed_user_id: userId }),
        ],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(`user_profile_${userId}`);
      await this.redisCache.delete(`user_profile_${followData.follower_id}`);

      return { success: true, message: "User followed successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Follow user error:", error);
      return { success: false, error: "Failed to follow user" };
    } finally {
      client.release();
    }
  }

  async unfollowUser(
    userId: string,
    unfollowData: FollowBody,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
        DELETE FROM user_follows 
        WHERE follower_id = $1 AND following_id = $2
      `,
        [unfollowData.follower_id, userId],
      );

      await client.query(
        `
        UPDATE user_profiles 
        SET followers_count = (
          SELECT COUNT(*) FROM user_follows WHERE following_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [userId],
      );

      await client.query(
        `
        UPDATE user_profiles 
        SET following_count = (
          SELECT COUNT(*) FROM user_follows WHERE follower_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [unfollowData.follower_id],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(`user_profile_${userId}`);
      await this.redisCache.delete(`user_profile_${unfollowData.follower_id}`);

      return { success: true, message: "User unfollowed successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Unfollow user error:", error);
      return { success: false, error: "Failed to unfollow user" };
    } finally {
      client.release();
    }
  }
}
