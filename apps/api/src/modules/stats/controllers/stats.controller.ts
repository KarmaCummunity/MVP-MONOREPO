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
import { PG_POOL } from "../../../database/database.module";
import { JwtAuthGuard, AdminAuthGuard } from "../../auth/jwt-auth.guard";
import { StatsFacadeService, CommunityStats } from "../services/index";

@Controller("api/stats")
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly statsFacade: StatsFacadeService,
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
    return this.statsFacade.getCommunityStats(city, period, forceRefresh);
  }

  @Get("community/version")
  async getCommunityStatsVersion(@Query("city") city?: string) {
    return this.statsFacade.getCommunityStatsVersion(city);
  }

  @Get("community/trends")
  async getCommunityTrends(
    @Query("stat_type") statType: string,
    @Query("days") daysParam?: string,
  ) {
    return this.statsFacade.getCommunityTrends(statType, daysParam);
  }

  @Get("community/cities")
  async getStatsByCity(@Query("stat_type") statType?: string) {
    return this.statsFacade.getStatsByCity(statType);
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
      const value = body.value ?? 1;
      await client.query(
        `
        INSERT INTO community_stats (stat_type, stat_value, date_period, city)
        VALUES ($1, $2, CURRENT_DATE, $3)
        ON CONFLICT (stat_type, date_period, COALESCE(city, ''))
        DO UPDATE SET stat_value = community_stats.stat_value + $2, updated_at = NOW()
      `,
        [body.stat_type, value, body.city ?? null],
      );
      await client.query("COMMIT");
      await this.statsFacade.invalidateStatsCache();
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
    return this.statsFacade.getDashboardStats();
  }

  @Get("real-time")
  async getRealTimeStats() {
    return this.statsFacade.getRealTimeStats();
  }

  @Post("community/reset")
  @UseGuards(AdminAuthGuard)
  async resetCommunityStats() {
    return this.statsFacade.resetCommunityStats();
  }
}
