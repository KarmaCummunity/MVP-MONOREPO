import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Inject,
  Query,
  Req,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Request } from "express";

@Controller("api/notifications")
@UseGuards(ThrottlerGuard, JwtAuthGuard) // H3/SEC-003.2: Auth required
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  /**
   * Ensure user_notifications table exists
   * Creates it if missing (idempotent)
   */
  private async ensureTableExists(client: PoolClient): Promise<void> {
    try {
      // Ensure uuid-ossp extension exists (required for uuid_generate_v4)
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

      // Check if table exists
      const checkResult = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_notifications'
                );
            `);

      if (!checkResult.rows[0]?.exists) {
        this.logger.log("Creating user_notifications table...");
        await client.query(`
                    CREATE TABLE user_notifications (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        user_id UUID,
                        title VARCHAR(255),
                        content TEXT,
                        notification_type VARCHAR(50),
                        related_id UUID,
                        is_read BOOLEAN DEFAULT false,
                        read_at TIMESTAMPTZ,
                        metadata JSONB,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);

        // Create indexes for better performance
        await client.query(`
                    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id 
                    ON user_notifications(user_id);
                `);
        await client.query(`
                    CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at 
                    ON user_notifications(created_at DESC);
                `);
        await client.query(`
                    CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read 
                    ON user_notifications(user_id, is_read) 
                    WHERE is_read = false;
                `);

        this.logger.log("user_notifications table created successfully");
      }
    } catch (error) {
      this.logger.error("Error ensuring user_notifications table:", error);
      throw error;
    }
  }

  /**
   * SEC-003.2: Validate that the authenticated user owns the resource
   * Admins can access any user's notifications
   */
  private validateOwnership(req: Request, userId: string): void {
    const authUser = req.user;
    if (!authUser) {
      throw new UnauthorizedException("Authentication required");
    }
    const isOwner = authUser.userId === userId;
    const isAdmin =
      authUser.roles?.includes("admin") ||
      authUser.roles?.includes("super_admin");
    if (!isOwner && !isAdmin) {
      this.logger.warn(
        `🚫 Access denied: User ${authUser.userId} tried to access notifications of user ${userId}`,
      );
      throw new ForbiddenException(
        "You can only access your own notifications",
      );
    }
  }

  @Get(":userId")
  async getUserNotifications(
    @Param("userId") userId: string,
    @Query("limit") limit = "50",
    @Query("offset") offset = "0",
    @Req() req: Request,
  ) {
    this.validateOwnership(req, userId);
    this.logger.debug(`getUserNotifications for userId: ${userId}`);

    // Validate UUID format to prevent 500 errors
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      this.logger.warn(`Invalid UUID provided: ${userId}`);
      return { success: false, error: "Invalid user ID format" };
    }

    try {
      const client = await this.pool.connect();
      try {
        await this.ensureTableExists(client);
        const query = `
          SELECT 
            id,
            user_id as "userId",
            title,
            content as body,
            notification_type as type,
            related_id as "relatedId",
            is_read as read,
            metadata as data,
            created_at as timestamp
          FROM user_notifications
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `;

        const { rows } = await client.query(query, [
          userId,
          parseInt(limit),
          parseInt(offset),
        ]);

        return {
          success: true,
          data: rows.map((row) => ({
            ...row,
            // Ensure data includes type for frontend compatibility
            data: {
              ...(row.data || {}),
              type: row.type,
              relatedId: row.relatedId,
            },
          })),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error fetching notifications:", error);
      return { success: false, error: "Failed to fetch notifications" };
    }
  }

  @Post(":userId/read-all")
  async markAllAsRead(@Param("userId") userId: string, @Req() req: Request) {
    this.validateOwnership(req, userId);
    try {
      const client = await this.pool.connect();
      try {
        await this.ensureTableExists(client);
        await client.query(
          "UPDATE user_notifications SET is_read = true, read_at = NOW() WHERE user_id = $1",
          [userId],
        );
        return { success: true };
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error marking all notifications as read:", error);
      return { success: false, error: "Failed to mark notifications as read" };
    }
  }

  @Put(":userId/:notificationId/read")
  async markAsRead(
    @Param("userId") userId: string,
    @Param("notificationId") notificationId: string,
    @Req() req: Request,
  ) {
    this.validateOwnership(req, userId);
    try {
      const client = await this.pool.connect();
      try {
        await this.ensureTableExists(client);
        await client.query(
          "UPDATE user_notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2",
          [notificationId, userId],
        );
        return { success: true };
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error marking notification as read:", error);
      return { success: false, error: "Failed to mark notification as read" };
    }
  }

  @Delete(":userId/:notificationId")
  async deleteNotification(
    @Param("userId") userId: string,
    @Param("notificationId") notificationId: string,
    @Req() req: Request,
  ) {
    this.validateOwnership(req, userId);
    try {
      const client = await this.pool.connect();
      try {
        await this.ensureTableExists(client);
        await client.query(
          "DELETE FROM user_notifications WHERE id = $1 AND user_id = $2",
          [notificationId, userId],
        );
        return { success: true };
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error deleting notification:", error);
      return { success: false, error: "Failed to delete notification" };
    }
  }

  @Delete(":userId")
  async clearAllNotifications(
    @Param("userId") userId: string,
    @Req() req: Request,
  ) {
    this.validateOwnership(req, userId);
    try {
      const client = await this.pool.connect();
      try {
        await this.ensureTableExists(client);
        await client.query(
          "DELETE FROM user_notifications WHERE user_id = $1",
          [userId],
        );
        return { success: true };
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("Error clearing notifications:", error);
      return { success: false, error: "Failed to clear notifications" };
    }
  }
}
