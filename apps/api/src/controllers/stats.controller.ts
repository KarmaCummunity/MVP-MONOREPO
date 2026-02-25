import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
  Inject,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtAuthGuard, AdminAuthGuard } from "../auth/jwt-auth.guard";
import { ComputedStatsService, CommunityStats } from "../services/stats";

@Controller("api/stats")
export class StatsController {
  private readonly logger = new Logger(StatsController.name);
  private readonly CACHE_TTL = 10 * 60;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly computedStatsService: ComputedStatsService,
  ) {}

  @Get("community")
  async getCommunityStats(
    @Query("city") city?: string,
    @Query("period") period?: string,
    @Query("forceRefresh") forceRefresh?: string,
  ): Promise<{
    success: boolean;
    data?: CommunityStats;
    error?: string;
    message?: string;
  }> {
    try {
      const cacheKey = this.buildCacheKey("community_stats", city, period);
      const cachedStats = await this.tryGetCachedStats(cacheKey, forceRefresh);

      if (cachedStats) {
        return { success: true, data: cachedStats };
      }

      const stats = await this.fetchCommunityStatsFromDb(city, period);
      await this.computedStatsService.addComputedStats(stats, city);
      await this.tryCacheStats(cacheKey, stats);

      return { success: true, data: stats };
    } catch (error) {
      this.logger.error("Error in getCommunityStats:", error);
      return {
        success: false,
        error: "Failed to fetch community stats",
        message: error instanceof Error ? error.message : "Unknown error",
        data: {},
      };
    }
  }

  @Get("community/version")
  async getCommunityStatsVersion(@Query("city") city?: string): Promise<{
    success: boolean;
    data?: { version: string; timestamp: number };
  }> {
    try {
      const cacheKey = `community_stats_version_${city || "global"}`;
      const cached = await this.redisCache.get<{
        version: string;
        timestamp: number;
      }>(cacheKey);

      if (cached) {
        return { success: true, data: cached };
      }

      const version = {
        version: `v${Date.now()}`,
        timestamp: Date.now(),
      };

      await this.redisCache.set(cacheKey, version, this.CACHE_TTL);
      return { success: true, data: version };
    } catch (error) {
      this.logger.error("Error getting stats version:", error);
      return { success: false };
    }
  }

  @Get("community/trends")
  async getCommunityTrends(
    @Query("stat_type") statType: string,
    @Query("days") daysParam?: string,
  ) {
    if (!statType) {
      return { success: false, error: "stat_type is required" };
    }

    const days = Math.min(parseInt(daysParam || "30", 10), 365);
    const cacheKey = `community_trends_${statType}_${days}`;

    try {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { rows } = await this.pool.query(
        `
        SELECT date_period, SUM(stat_value) as value
        FROM community_stats
        WHERE stat_type = $1 AND date_period >= CURRENT_DATE - $2::INTEGER
        GROUP BY date_period
        ORDER BY date_period ASC
      `,
        [statType, days],
      );

      await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching trends:", error);
      return { success: false, error: "Failed to fetch trends" };
    }
  }

  @Get("community/cities")
  async getStatsByCity(@Query("stat_type") statType?: string) {
    const cacheKey = `city_stats_${statType || "all"}`;

    try {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const query = statType
        ? `
          SELECT city, SUM(stat_value) as total
          FROM community_stats
          WHERE stat_type = $1 AND city IS NOT NULL
          GROUP BY city
          ORDER BY total DESC
          LIMIT 20
        `
        : `
          SELECT city, COUNT(DISTINCT id) as total_users
          FROM user_profiles
          WHERE city IS NOT NULL AND city <> ''
          GROUP BY city
          ORDER BY total_users DESC
          LIMIT 20
        `;

      const params = statType ? [statType] : [];
      const { rows } = await this.pool.query(query, params);

      await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching city stats:", error);
      return { success: false, error: "Failed to fetch city stats" };
    }
  }

  @Post("track-visit")
  async trackSiteVisit() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
        INSERT INTO community_stats (stat_type, stat_value, date_period)
        VALUES ('site_visits', 1, CURRENT_DATE)
        ON CONFLICT (stat_type, date_period, COALESCE(city, ''))
        DO UPDATE SET stat_value = community_stats.stat_value + 1, updated_at = NOW()
      `,
      );

      await client.query("COMMIT");
      return { success: true, message: "Visit tracked" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Error tracking visit:", error);
      return { success: false, error: "Failed to track visit" };
    } finally {
      client.release();
    }
  }

  @Post("increment")
  @UseGuards(AdminAuthGuard)
  async incrementStat(
    @Body() body: { stat_type: string; city?: string; value?: number },
  ) {
    if (!body.stat_type) {
      return { success: false, error: "stat_type is required" };
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const value = body.value || 1;
      await client.query(
        `
        INSERT INTO community_stats (stat_type, stat_value, date_period, city)
        VALUES ($1, $2, CURRENT_DATE, $3)
        ON CONFLICT (stat_type, date_period, COALESCE(city, ''))
        DO UPDATE SET stat_value = community_stats.stat_value + $2, updated_at = NOW()
      `,
        [body.stat_type, value, body.city || null],
      );

      await client.query("COMMIT");
      await this.invalidateStatsCache();

      return { success: true, message: "Stat incremented" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Error incrementing stat:", error);
      return { success: false, error: "Failed to increment stat" };
    } finally {
      client.release();
    }
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  async getDashboardStats() {
    const cacheKey = "dashboard_stats";

    try {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const stats = await this.fetchCommunityStatsFromDb();
      await this.computedStatsService.addComputedStats(stats);

      const dashboardData = {
        users: {
          total: stats.total_users?.value || 0,
          active: stats.weekly_active_users?.value || 0,
          new_this_week: stats.new_users_this_week?.value || 0,
        },
        donations: {
          total: stats.total_donations?.value || 0,
          active: stats.active_donations?.value || 0,
          this_week: stats.donations_this_week?.value || 0,
        },
        rides: {
          total: stats.total_rides?.value || 0,
          active: stats.active_rides?.value || 0,
          this_week: stats.rides_this_week?.value || 0,
        },
        tasks: {
          total: stats.total_tasks?.value || 0,
          completed: stats.completed_tasks?.value || 0,
          in_progress: stats.in_progress_tasks?.value || 0,
        },
      };

      await this.redisCache.set(cacheKey, dashboardData, 5 * 60);
      return { success: true, data: dashboardData };
    } catch (error) {
      this.logger.error("Error fetching dashboard stats:", error);
      return { success: false, error: "Failed to fetch dashboard stats" };
    }
  }

  @Get("real-time")
  async getRealTimeStats() {
    const cacheKey = "real_time_stats";

    try {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const [usersResult, activitiesResult] = await Promise.all([
        this.pool.query(`
          SELECT COUNT(DISTINCT id) as online_users
          FROM user_profiles
          WHERE last_active >= NOW() - INTERVAL '15 minutes'
        `),
        this.pool.query(`
          SELECT COUNT(*) as recent_activities
          FROM user_activities
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        `),
      ]);

      const realTimeData = {
        online_users: parseInt(usersResult.rows[0]?.online_users || "0", 10),
        recent_activities: parseInt(
          activitiesResult.rows[0]?.recent_activities || "0",
          10,
        ),
        last_updated: new Date().toISOString(),
      };

      await this.redisCache.set(cacheKey, realTimeData, 60);
      return { success: true, data: realTimeData };
    } catch (error) {
      this.logger.error("Error fetching real-time stats:", error);
      return { success: false, error: "Failed to fetch real-time stats" };
    }
  }

  @Post("community/reset")
  @UseGuards(AdminAuthGuard)
  async resetCommunityStats() {
    try {
      await this.invalidateStatsCache();
      return { success: true, message: "Stats cache cleared" };
    } catch (error) {
      this.logger.error("Error resetting stats:", error);
      return { success: false, error: "Failed to reset stats" };
    }
  }

  private buildCacheKey(
    prefix: string,
    city?: string,
    period?: string,
  ): string {
    return `${prefix}_${city || "global"}_${period || "current"}`;
  }

  private async tryGetCachedStats(
    cacheKey: string,
    forceRefresh?: string,
  ): Promise<CommunityStats | null> {
    if (forceRefresh === "true") {
      await this.tryClearCache(cacheKey);
      return null;
    }

    try {
      return await this.redisCache.get<CommunityStats>(cacheKey);
    } catch (cacheError) {
      this.logger.warn("Cache get error, continuing to database:", cacheError);
      return null;
    }
  }

  private async tryClearCache(cacheKey: string): Promise<void> {
    try {
      await this.redisCache.delete(cacheKey);
    } catch (cacheError) {
      this.logger.warn("Cache delete error:", cacheError);
    }
  }

  private async tryCacheStats(
    cacheKey: string,
    stats: CommunityStats,
  ): Promise<void> {
    try {
      await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);
    } catch (cacheError) {
      this.logger.warn("Cache set error:", cacheError);
    }
  }

  private buildDateFilter(period?: string): string {
    switch (period) {
      case "week":
        return "AND date_period >= CURRENT_DATE - INTERVAL '7 days'";
      case "month":
        return "AND date_period >= CURRENT_DATE - INTERVAL '30 days'";
      case "year":
        return "AND date_period >= CURRENT_DATE - INTERVAL '365 days'";
      default:
        return "";
    }
  }

  private async fetchCommunityStatsFromDb(
    city?: string,
    period?: string,
  ): Promise<CommunityStats> {
    const dateFilter = this.buildDateFilter(period);
    const params: unknown[] = [];

    let query = `
      SELECT 
        stat_type,
        SUM(stat_value) as total_value,
        COUNT(DISTINCT date_period) as days_tracked
      FROM community_stats
      WHERE 1=1 ${dateFilter}
    `;

    if (city) {
      query += " AND city = $1";
      params.push(city);
    }

    query += " GROUP BY stat_type";

    const { rows } = await this.pool.query(query, params);

    const stats: CommunityStats = {};
    rows.forEach(
      (row: {
        stat_type: string;
        total_value: string;
        days_tracked: string;
      }) => {
        stats[row.stat_type] = {
          value: parseInt(row.total_value, 10) || 0,
          days_tracked: parseInt(row.days_tracked, 10) || 1,
        };
      },
    );

    return stats;
  }

  private async invalidateStatsCache(): Promise<void> {
    try {
      await this.redisCache.invalidatePattern("community_stats*");
      await this.redisCache.invalidatePattern("computed_stats*");
      await this.redisCache.invalidatePattern("dashboard_stats*");
      await this.redisCache.invalidatePattern("city_stats*");
    } catch (error) {
      this.logger.warn("Error invalidating cache:", error);
    }
  }
}
