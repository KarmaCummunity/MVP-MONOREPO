import { Injectable, Logger, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import {
  ComputedStatsService,
  CommunityStats,
  StatsQueriesService,
} from "./index";

const CACHE_TTL = 10 * 60;
const DASHBOARD_CACHE_TTL = 5 * 60;
const REAL_TIME_CACHE_TTL = 60;

export interface StatsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable()
export class StatsFacadeService {
  private readonly logger = new Logger(StatsFacadeService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly computedStatsService: ComputedStatsService,
    private readonly queriesService: StatsQueriesService,
  ) {}

  async getCommunityStats(
    city?: string,
    period?: string,
    forceRefresh?: string,
  ): Promise<StatsApiResponse<CommunityStats>> {
    const cacheKey = this.buildCacheKey("community_stats", city, period);
    const cached = await this.getCachedOrNull<CommunityStats>(
      cacheKey,
      forceRefresh,
    );
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const stats = await this.fetchCommunityStatsFromDb(city, period);
      await this.computedStatsService.addComputedStats(stats, city);
      await this.setCache(cacheKey, stats, CACHE_TTL);
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error("Error in getCommunityStats:", error);
      return {
        success: false,
        error: "Failed to fetch community stats",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getCommunityStatsVersion(
    city?: string,
  ): Promise<StatsApiResponse<{ version: string; timestamp: number }>> {
    const cacheKey = `community_stats_version_${city || "global"}`;
    const cached = await this.redisCache.get<{
      version: string;
      timestamp: number;
    }>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const version = {
        version: `v${Date.now()}`,
        timestamp: Date.now(),
      };
      await this.redisCache.set(cacheKey, version, CACHE_TTL);
      return { success: true, data: version };
    } catch (error) {
      this.logger.error("Error getting stats version:", error);
      return { success: false };
    }
  }

  async getCommunityTrends(
    statType: string,
    daysParam?: string,
  ): Promise<StatsApiResponse<unknown>> {
    if (!statType) {
      return { success: false, error: "stat_type is required" };
    }

    const days = Math.min(parseInt(daysParam || "30", 10), 365);
    const cacheKey = `community_trends_${statType}_${days}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const rows = await this.queriesService.getCommunityTrends(statType, days);
      await this.redisCache.set(cacheKey, rows, CACHE_TTL);
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching trends:", error);
      return { success: false, error: "Failed to fetch trends" };
    }
  }

  async getStatsByCity(statType?: string): Promise<StatsApiResponse<unknown>> {
    const cacheKey = `city_stats_${statType || "all"}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const rows = await this.queriesService.getCityStats(statType);
      await this.redisCache.set(cacheKey, rows, CACHE_TTL);
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching city stats:", error);
      return { success: false, error: "Failed to fetch city stats" };
    }
  }

  async getDashboardStats(): Promise<StatsApiResponse<unknown>> {
    const cacheKey = "dashboard_stats";
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const stats = await this.fetchCommunityStatsFromDb();
      await this.computedStatsService.addComputedStats(stats);
      const dashboardData = this.buildDashboardData(stats);
      await this.redisCache.set(cacheKey, dashboardData, DASHBOARD_CACHE_TTL);
      return { success: true, data: dashboardData };
    } catch (error) {
      this.logger.error("Error fetching dashboard stats:", error);
      return { success: false, error: "Failed to fetch dashboard stats" };
    }
  }

  async getRealTimeStats(): Promise<StatsApiResponse<unknown>> {
    const cacheKey = "real_time_stats";
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    try {
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
        online_users: parseInt(
          String(usersResult.rows[0]?.online_users ?? "0"),
          10,
        ),
        recent_activities: parseInt(
          String(activitiesResult.rows[0]?.recent_activities ?? "0"),
          10,
        ),
        last_updated: new Date().toISOString(),
      };

      await this.redisCache.set(cacheKey, realTimeData, REAL_TIME_CACHE_TTL);
      return { success: true, data: realTimeData };
    } catch (error) {
      this.logger.error("Error fetching real-time stats:", error);
      return { success: false, error: "Failed to fetch real-time stats" };
    }
  }

  async resetCommunityStats(): Promise<StatsApiResponse<null>> {
    try {
      await this.invalidateStatsCache();
      return { success: true, message: "Stats cache cleared" };
    } catch (error) {
      this.logger.error("Error resetting stats:", error);
      return { success: false, error: "Failed to reset stats" };
    }
  }

  getCacheTtl(): number {
    return CACHE_TTL;
  }

  async invalidateStatsCache(): Promise<void> {
    try {
      await this.redisCache.invalidatePattern("community_stats*");
      await this.redisCache.invalidatePattern("computed_stats*");
      await this.redisCache.invalidatePattern("dashboard_stats*");
      await this.redisCache.invalidatePattern("city_stats*");
    } catch (error) {
      this.logger.warn("Error invalidating cache:", error);
    }
  }

  private buildCacheKey(
    prefix: string,
    city?: string,
    period?: string,
  ): string {
    return `${prefix}_${city || "global"}_${period || "current"}`;
  }

  private async getCachedOrNull<T>(
    cacheKey: string,
    forceRefresh?: string,
  ): Promise<T | null> {
    if (forceRefresh === "true") {
      await this.clearCacheKey(cacheKey);
      return null;
    }
    try {
      return await this.redisCache.get<T>(cacheKey);
    } catch (cacheError) {
      this.logger.warn("Cache get error, continuing to database:", cacheError);
      return null;
    }
  }

  private async clearCacheKey(cacheKey: string): Promise<void> {
    try {
      await this.redisCache.delete(cacheKey);
    } catch (cacheError) {
      this.logger.warn("Cache delete error:", cacheError);
    }
  }

  private async setCache(
    cacheKey: string,
    value: unknown,
    ttl: number,
  ): Promise<void> {
    try {
      await this.redisCache.set(cacheKey, value, ttl);
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
    const rows = await this.queriesService.fetchCommunityStats(
      city,
      dateFilter,
    );

    const stats: CommunityStats = {};
    for (const row of rows) {
      const statType = String(row.stat_type || "");
      const totalValue = String(row.total_value || "0");
      const daysTracked = String(row.days_tracked || "1");

      if (statType) {
        stats[statType] = {
          value: parseInt(totalValue, 10) || 0,
          days_tracked: parseInt(daysTracked, 10) || 1,
        };
      }
    }
    return stats;
  }

  private buildDashboardData(stats: CommunityStats): Record<string, unknown> {
    return {
      users: {
        total: stats.total_users?.value ?? 0,
        active: stats.weekly_active_users?.value ?? 0,
        new_this_week: stats.new_users_this_week?.value ?? 0,
      },
      donations: {
        total: stats.total_donations?.value ?? 0,
        active: stats.active_donations?.value ?? 0,
        this_week: stats.donations_this_week?.value ?? 0,
      },
      rides: {
        total: stats.total_rides?.value ?? 0,
        active: stats.active_rides?.value ?? 0,
        this_week: stats.rides_this_week?.value ?? 0,
      },
      tasks: {
        total: stats.total_tasks?.value ?? 0,
        completed: stats.completed_tasks?.value ?? 0,
        in_progress: stats.in_progress_tasks?.value ?? 0,
      },
    };
  }
}
