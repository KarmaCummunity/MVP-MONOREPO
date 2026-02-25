import { Injectable, Inject, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";

type StatsRow = {
  [key: string]: number | string | null;
};

type StatsQueryResult = {
  rows: StatsRow[];
};

@Injectable()
export class UserStatsService {
  private readonly logger = new Logger(UserStatsService.name);
  private readonly CACHE_TTL = 15 * 60; // 15 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  async getUserActivities(
    userId: string,
    limit?: string,
  ): Promise<{ success: boolean; data?: unknown }> {
    const cacheKey = `user_activities_${userId}_${limit || "50"}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT activity_type, activity_data, created_at
      FROM user_activities 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [userId, parseInt(limit || "50")],
    );

    await this.redisCache.set(cacheKey, rows, 5 * 60);
    return { success: true, data: rows };
  }

  async getUserStats(
    userId: string,
  ): Promise<{ success: boolean; data?: unknown }> {
    const cacheKey = `user_stats_${userId}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const donationStatsKey = `user_stats_donations_${userId}`;
    const rideStatsKey = `user_stats_rides_${userId}`;
    const bookingStatsKey = `user_stats_bookings_${userId}`;

    const cachedStats = await this.redisCache.getMultiple([
      donationStatsKey,
      rideStatsKey,
      bookingStatsKey,
    ]);

    let donationStats: StatsQueryResult;
    let rideStats: StatsQueryResult;
    let bookingStats: StatsQueryResult;

    if (cachedStats.get(donationStatsKey)) {
      donationStats = {
        rows: [cachedStats.get(donationStatsKey) as StatsRow],
      };
    } else {
      const result = await this.pool.query(
        `
        SELECT 
          COUNT(*) as total_donations,
          SUM(CASE WHEN type = 'money' THEN amount ELSE 0 END) as total_money_donated,
          COUNT(CASE WHEN type = 'time' THEN 1 END) as volunteer_activities,
          COUNT(CASE WHEN type = 'trump' THEN 1 END) as rides_offered
        FROM donations
        WHERE donor_id = $1
      `,
        [userId],
      );
      donationStats = result as StatsQueryResult;
      await this.redisCache.set(
        donationStatsKey,
        result.rows[0],
        this.CACHE_TTL,
      );
    }

    if (cachedStats.get(rideStatsKey)) {
      rideStats = { rows: [cachedStats.get(rideStatsKey) as StatsRow] };
    } else {
      const result = await this.pool.query(
        `
        SELECT 
          COUNT(*) as rides_created,
          SUM(available_seats) as total_seats_offered,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides
        FROM rides
        WHERE driver_id = $1
      `,
        [userId],
      );
      rideStats = result as StatsQueryResult;
      await this.redisCache.set(rideStatsKey, result.rows[0], this.CACHE_TTL);
    }

    if (cachedStats.get(bookingStatsKey)) {
      bookingStats = {
        rows: [cachedStats.get(bookingStatsKey) as StatsRow],
      };
    } else {
      const result = await this.pool.query(
        `
        SELECT 
          COUNT(*) as rides_booked,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_bookings
        FROM ride_bookings
        WHERE passenger_id = $1
      `,
        [userId],
      );
      bookingStats = result as StatsQueryResult;
      await this.redisCache.set(
        bookingStatsKey,
        result.rows[0],
        this.CACHE_TTL,
      );
    }

    const stats = {
      donations: donationStats.rows[0],
      rides: rideStats.rows[0],
      bookings: bookingStats.rows[0],
    };

    await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);
    return { success: true, data: stats };
  }

  async getUsersSummary(): Promise<{ success: boolean; data?: unknown }> {
    const cacheKey = "users_summary_stats";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(`
    SELECT 
      COUNT(DISTINCT LOWER(email)) as total_users,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
      COUNT(CASE WHEN last_active >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active_users,
      COUNT(CASE WHEN last_active >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active_users,
      COUNT(CASE WHEN join_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month,
      AVG(karma_points) as avg_karma_points,
      SUM(total_donations_amount) as total_platform_donations
    FROM user_profiles
    WHERE email IS NOT NULL AND email <> ''
  `);

    const stats = rows[0];
    await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);

    return { success: true, data: stats };
  }
}
