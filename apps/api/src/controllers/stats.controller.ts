// File overview:
// - Purpose: Stats/analytics endpoints for community, trends, city-level, category/user analytics, dashboard, and real-time metrics.
// - Reached from: Routes under '/api/stats'.
// - Provides: Aggregations over `community_stats`, donations/rides/users; caches responses with TTL; cache invalidation helpers.
//
// Future improvements:
// - Split into specialized services (CommunityStatsService, TrendsAnalyticsService, UserStatsService, DashboardStatsService)
// - Add DTO validation for all query parameters
// - Implement pagination for large datasets
// - Replace hardcoded SQL queries with proper query builder
// - Add authorization for sensitive stats
// - Add comprehensive unit tests for statistical calculations
// - Implement data privacy and anonymization
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  Inject,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtAuthGuard, AdminAuthGuard } from "../auth/guards/jwt-auth.guard";

interface StatMetric {
  value: number;
  days_tracked: number;
}

interface CommunityStats {
  [key: string]: StatMetric | undefined;
  site_visits?: StatMetric;
  total_users?: StatMetric;
  active_members?: StatMetric;
  daily_active_users?: StatMetric;
  weekly_active_users?: StatMetric;
  new_users_this_week?: StatMetric;
  new_users_this_month?: StatMetric;
  total_organizations?: StatMetric;
  cities_with_users?: StatMetric;
  total_donations?: StatMetric;
  donations_this_week?: StatMetric;
  donations_this_month?: StatMetric;
  active_donations?: StatMetric;
  completed_donations?: StatMetric;
  money_donations?: StatMetric;
  item_donations?: StatMetric;
  service_donations?: StatMetric;
  volunteer_hours?: StatMetric;
  total_money_donated?: StatMetric;
  recurring_donations_amount?: StatMetric;
  unique_donors?: StatMetric;
  total_rides?: StatMetric;
  rides_this_week?: StatMetric;
  rides_this_month?: StatMetric;
  active_rides?: StatMetric;
  completed_rides?: StatMetric;
  total_seats_offered?: StatMetric;
  unique_drivers?: StatMetric;
  total_events?: StatMetric;
  events_this_week?: StatMetric;
  events_this_month?: StatMetric;
  active_events?: StatMetric;
  completed_events?: StatMetric;
  total_event_attendees?: StatMetric;
  virtual_events?: StatMetric;
  total_activities?: StatMetric;
  activities_today?: StatMetric;
  activities_this_week?: StatMetric;
  total_logins?: StatMetric;
  donation_activities?: StatMetric;
  chat_activities?: StatMetric;
  active_users_tracked?: StatMetric;
  total_messages?: StatMetric;
  total_conversations?: StatMetric;
  messages_this_week?: StatMetric;
  group_conversations?: StatMetric;
  direct_conversations?: StatMetric;
  total_tasks?: StatMetric;
  completed_tasks?: StatMetric;
  open_tasks?: StatMetric;
  in_progress_tasks?: StatMetric;
  completed_tasks_this_week?: StatMetric;
  completed_tasks_this_month?: StatMetric;
  avg_donation_amount?: StatMetric;
  avg_seats_per_ride?: StatMetric;
  user_engagement_rate?: StatMetric;
  total_contributions?: StatMetric;
}

interface MetricsRow {
  [key: string]: unknown;
}

@Controller("api/stats")
export class StatsController {
  private readonly logger = new Logger(StatsController.name);
  private readonly CACHE_TTL = 10 * 60; // 10 minutes for stats

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
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
      await this.addComputedStats(stats, city);
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
      WHERE 1=1
    `;

    if (city) {
      query += ` AND city = $1`;
      params.push(city);
    } else {
      query += ` AND city IS NULL`;
    }

    query += dateFilter;
    query += ` GROUP BY stat_type ORDER BY stat_type`;

    const { rows } = await this.pool.query(query, params);

    const stats: CommunityStats = {};
    rows.forEach((row) => {
      stats[row.stat_type] = {
        value: parseInt(row.total_value as string, 10) || 0,
        days_tracked: parseInt(row.days_tracked as string, 10) || 0,
      };
    });

    return stats;
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

  @Get("community/version")
  // Lightweight endpoint to check if stats have changed
  // נקודת קצה קלת משקל לבדיקה אם הסטטיסטיקות השתנו
  async getCommunityStatsVersion(@Query("city") city?: string) {
    try {
      const cacheKey = `community_stats_version_${city || "global"}`;

      // Check cache first (1 minute TTL for version check)
      try {
        const cached = await this.redisCache.get<string>(cacheKey);
        if (cached) {
          return { success: true, version: cached };
        }
      } catch (cacheError) {
        this.logger.warn("Cache get error in version check:", cacheError);
      }

      // Get the latest update timestamp from community_stats
      const query = `
        SELECT MAX(updated_at) as last_update
        FROM community_stats
        ${city ? "WHERE city = $1" : "WHERE city IS NULL"}
      `;

      const params = city ? [city] : [];
      const { rows } = await this.pool.query(query, params);

      // Create version hash from timestamp
      const lastUpdate = rows[0]?.last_update || new Date();
      const version = new Date(lastUpdate).getTime().toString();

      // Cache for 1 minute
      try {
        await this.redisCache.set(cacheKey, version, 60);
      } catch (cacheError) {
        this.logger.warn("Cache set error in version check:", cacheError);
      }

      return { success: true, version };
    } catch (error) {
      this.logger.error("Error in getCommunityStatsVersion:", error);
      return {
        success: false,
        error: "Failed to fetch stats version",
        version: Date.now().toString(), // Return current timestamp as fallback
      };
    }
  }

  @Get("community/trends")
  async getCommunityTrends(
    @Query("stat_type") statType: string,
    @Query("city") city?: string,
    @Query("days") days?: string,
  ) {
    const cacheKey = `community_trends_${statType}_${city || "global"}_${days || "30"}`;
    const cached = await this.redisCache.get<unknown[]>(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const daysBack = parseInt(days || "30", 10);
    let query = `
      SELECT date_period, SUM(stat_value) as value
      FROM community_stats 
        WHERE stat_type = $1
        AND date_period >= CURRENT_DATE - INTERVAL '${daysBack.toString()} days'
    `;

    const params = [statType];
    if (city) {
      query += ` AND city = $2`;
      params.push(city);
    } else {
      query += ` AND city IS NULL`;
    }

    query += ` GROUP BY date_period ORDER BY date_period ASC`;

    const { rows } = await this.pool.query(query, params);

    await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
    return { success: true, data: rows };
  }

  @Get("community/cities")
  async getStatsByCity(@Query("stat_type") statType?: string) {
    const cacheKey = `city_stats_${statType || "all"}`;
    const cached = await this.redisCache.get<unknown[]>(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    let query = `
      SELECT 
        city,
        stat_type,
        SUM(stat_value) as total_value
      FROM community_stats 
      WHERE city IS NOT NULL
    `;

    const params: unknown[] = [];
    if (statType) {
      query += ` AND stat_type = $1`;
      params.push(statType);
    }

    query += ` GROUP BY city, stat_type ORDER BY total_value DESC`;

    const { rows } = await this.pool.query(query, params);

    // Group by city – use Object.create(null) to prevent prototype pollution
    // when row values (city, stat_type) originate from user-controlled query params.
    const citiesData: Record<string, Record<string, number>> = Object.create(
      null,
    );
    rows.forEach((row) => {
      const city = String(row.city);
      const statType = String(row.stat_type);
      if (!Object.prototype.hasOwnProperty.call(citiesData, city)) {
        citiesData[city] = Object.create(null);
      }
      citiesData[city][statType] = parseInt(row.total_value as string, 10);
    });

    await this.redisCache.set(cacheKey, citiesData, this.CACHE_TTL);
    return { success: true, data: citiesData };
  }

  @Post("track-visit")
  async trackSiteVisit() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Track site visit - global stat, no city filter
      await client.query(`
        INSERT INTO community_stats (stat_type, stat_value, city, date_period)
        VALUES ('site_visits', 1, NULL, CURRENT_DATE)
        ON CONFLICT (stat_type, city, date_period) 
        DO UPDATE SET 
          stat_value = community_stats.stat_value + 1,
          updated_at = NOW()
      `);

      // Clear relevant caches
      await this.clearStatsCaches("site_visits", undefined);

      await client.query("COMMIT");
      return { success: true, message: "Site visit tracked successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Track site visit error:", error);
      return { success: false, error: "Failed to track site visit" };
    } finally {
      client.release();
    }
  }

  @Post("increment")
  @UseGuards(AdminAuthGuard)
  async incrementStat(
    @Body() statData: { stat_type: string; value?: number; city?: string },
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Update community stats
      await client.query(
        `
        INSERT INTO community_stats (stat_type, stat_value, city, date_period)
        VALUES ($1, $2, $3, CURRENT_DATE)
        ON CONFLICT (stat_type, city, date_period) 
        DO UPDATE SET 
          stat_value = community_stats.stat_value + $2,
          updated_at = NOW()
      `,
        [statData.stat_type, statData.value || 1, statData.city || null],
      );

      // Clear relevant caches
      await this.clearStatsCaches(statData.stat_type, statData.city);

      await client.query("COMMIT");
      return { success: true, message: "Stat incremented successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Increment stat error:", error);
      return { success: false, error: "Failed to increment stat" };
    } finally {
      client.release();
    }
  }

  @Get("analytics/categories")
  async getCategoryAnalytics() {
    const cacheKey = "category_analytics";
    const cached = await this.redisCache.get<unknown[]>(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    // Get category usage from donations
    const donationsByCategory = await this.pool.query(`
      SELECT 
        dc.slug,
        dc.name_he,
        dc.icon,
        COUNT(d.id) as donation_count,
        SUM(CASE WHEN d.type = 'money' THEN d.amount ELSE 0 END) as total_money,
        COUNT(CASE WHEN d.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as weekly_count,
        COUNT(CASE WHEN d.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_count
      FROM donation_categories dc
      LEFT JOIN donations d ON dc.id = d.category_id
      WHERE dc.is_active = true
      GROUP BY dc.id, dc.slug, dc.name_he, dc.icon
      ORDER BY donation_count DESC
    `);

    // Get category clicks from analytics table (legacy)
    const analyticsData = await this.pool.query(`
      SELECT 
        data->>'categoryId' as category_slug,
        SUM((data->>'count')::integer) as click_count
      FROM analytics 
      WHERE data->>'categoryId' IS NOT NULL
      GROUP BY data->>'categoryId'
    `);

    // Merge data
    const analytics: Record<string, { clicks: number }> = {};
    analyticsData.rows.forEach((row) => {
      analytics[row.category_slug] = {
        clicks: parseInt(row.click_count as string, 10) || 0,
      };
    });

    const categoryStats = donationsByCategory.rows.map(
      (category: MetricsRow) => ({
        ...category,
        clicks: analytics[category.slug as string]?.clicks || 0,
        engagement_score:
          (category.donation_count as number) * 10 +
          (analytics[category.slug as string]?.clicks || 0),
      }),
    );

    // Cache for 20 minutes - analytics are relatively static
    await this.redisCache.set(cacheKey, categoryStats, 20 * 60);
    return { success: true, data: categoryStats };
  }

  @Get("analytics/users")
  @UseGuards(AdminAuthGuard)
  async getUserAnalytics() {
    const cacheKey = "user_analytics";
    const cached = await this.redisCache.get<unknown>(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    // User growth - from user_profiles only (legacy users table no longer used)
    const userGrowth = await this.pool.query(`
      SELECT 
        DATE(join_date) as date,
        COUNT(*) as new_users
      FROM user_profiles
      WHERE email IS NOT NULL AND email <> ''
        AND join_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(join_date)
      ORDER BY date ASC
    `);

    // User activity
    const userActivity = await this.pool.query(`
      SELECT 
        activity_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_activities 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY activity_type
      ORDER BY count DESC
    `);

    // User distribution by city - from user_profiles only
    const usersByCity = await this.pool.query(`
      SELECT 
        city,
        COUNT(*) as user_count
      FROM user_profiles
      WHERE email IS NOT NULL AND email <> ''
        AND city IS NOT NULL 
        AND is_active = true
      GROUP BY city
      ORDER BY user_count DESC
      LIMIT 10
    `);

    const analytics = {
      user_growth: userGrowth.rows,
      user_activity: userActivity.rows,
      users_by_city: usersByCity.rows,
    };

    // Cache for 20 minutes - analytics are relatively static
    await this.redisCache.set(cacheKey, analytics, 20 * 60);
    return { success: true, data: analytics };
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  async getDashboardStats() {
    const cacheKey = "dashboard_stats";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    // Tasks statistics - count by status
    const tasksStats = await this.pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'open' THEN 1 END) as tasks_open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as tasks_in_progress,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as tasks_done,
        COUNT(*) as tasks_total
      FROM tasks
    `);

    // Users and admins statistics
    const usersStats = await this.pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE 
          WHEN 'admin' = ANY(roles) OR 'super_admin' = ANY(roles) 
          THEN 1 
        END) as admins_count,
        COUNT(CASE 
          WHEN NOT ('admin' = ANY(roles) OR 'super_admin' = ANY(roles))
          THEN 1 
        END) as regular_users_count,
        COUNT(CASE 
          WHEN ('admin' = ANY(roles) OR 'super_admin' = ANY(roles)) 
            AND parent_manager_id IS NOT NULL
          THEN 1 
        END) as managers_with_subordinates
      FROM user_profiles
      WHERE email IS NOT NULL AND email <> ''
    `);

    // Volunteer hours statistics - check if table exists first
    let hoursStats: { rows: MetricsRow[] };
    try {
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_time_logs'
        )
      `);

      if (tableExists.rows[0].exists) {
        hoursStats = await this.pool.query(`
          SELECT 
            COALESCE(SUM(actual_hours), 0)::NUMERIC as total_volunteer_hours,
            COUNT(DISTINCT user_id) as users_with_hours,
            COALESCE(
              SUM(CASE 
                WHEN logged_at >= DATE_TRUNC('month', NOW()) 
                THEN actual_hours ELSE 0 
              END), 0
            )::NUMERIC as current_month_hours
          FROM task_time_logs
        `);
      } else {
        // Table doesn't exist - return zero values
        hoursStats = {
          rows: [
            {
              total_volunteer_hours: "0",
              users_with_hours: 0,
              current_month_hours: "0",
            },
          ],
        };
      }
    } catch (error) {
      this.logger.warn(
        "Task time logs table check failed, using zero values:",
        error,
      );
      hoursStats = {
        rows: [
          {
            total_volunteer_hours: "0",
            users_with_hours: 0,
            current_month_hours: "0",
          },
        ],
      };
    }

    const totalHours = parseFloat(
      String(hoursStats.rows[0]?.total_volunteer_hours ?? "0"),
    );
    const usersWithHours = Number(hoursStats.rows[0]?.users_with_hours ?? 0);
    const totalUsers = Number(usersStats.rows[0]?.total_users ?? 0);
    const avgHoursPerUser = totalUsers > 0 ? totalHours / totalUsers : 0;
    const currentMonthHours = parseFloat(
      String(hoursStats.rows[0]?.current_month_hours ?? "0"),
    );

    // Merge all metrics and convert to numbers
    const metrics = {
      // Tasks stats
      tasks_open: Number(tasksStats.rows[0]?.tasks_open ?? 0),
      tasks_in_progress: Number(tasksStats.rows[0]?.tasks_in_progress ?? 0),
      tasks_done: Number(tasksStats.rows[0]?.tasks_done ?? 0),
      tasks_total: Number(tasksStats.rows[0]?.tasks_total ?? 0),

      // Users stats
      total_users: totalUsers,
      admins_count: Number(usersStats.rows[0]?.admins_count ?? 0),
      regular_users_count: Number(usersStats.rows[0]?.regular_users_count ?? 0),
      managers_with_subordinates: Number(
        usersStats.rows[0]?.managers_with_subordinates ?? 0,
      ),

      // Volunteer hours stats
      total_volunteer_hours: totalHours,
      users_with_hours: usersWithHours,
      avg_hours_per_user: Math.round(avgHoursPerUser * 100) / 100, // Round to 2 decimal places
      current_month_hours: currentMonthHours,
    };

    const dashboard = {
      metrics: metrics,
    };

    await this.redisCache.set(cacheKey, dashboard, 5 * 60); // 5 minutes cache
    return { success: true, data: dashboard };
  }

  @Get("real-time")
  async getRealTimeStats() {
    // This endpoint provides frequently updated stats with short cache
    const cacheKey = "real_time_stats";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    // Last hour's activity
    const recentActivity = await this.pool.query(`
      SELECT 
        activity_type,
        COUNT(*) as count
      FROM user_activities 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY activity_type
    `);

    // Current active donations and rides
    const donationsRides = await this.pool.query(`
      SELECT 
        COUNT(CASE WHEN d.status = 'active' THEN 1 END) as active_donations,
        COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_rides
      FROM donations d
      FULL OUTER JOIN rides r ON 1=1
    `);

    // Users online - from user_profiles only
    const usersOnline = await this.pool.query(`
      SELECT 
        COUNT(CASE WHEN last_active >= NOW() - INTERVAL '5 minutes' THEN 1 END) as users_online
      FROM user_profiles
      WHERE email IS NOT NULL AND email <> ''
    `);

    const currentActive = {
      ...donationsRides.rows[0],
      users_online: usersOnline.rows[0].users_online,
    };

    const realTimeData = {
      recent_activity: recentActivity.rows,
      current_active: currentActive,
      last_updated: new Date().toISOString(),
    };

    await this.redisCache.set(cacheKey, realTimeData, 60); // 1 minute cache
    return { success: true, data: realTimeData };
  }

  @Get("details/:statType")
  @UseGuards(JwtAuthGuard)
  async getStatDetails(@Param("statType") statType: string) {
    const cacheKey = `stat_details_${statType}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    let query = "";
    const params: unknown[] = [];

    try {
      switch (statType) {
        case "siteVisits":
          // Get recent site visits with timestamps
          query = `
            SELECT 
              created_at as timestamp,
              NULL as user_agent
            FROM community_stats 
            WHERE stat_type = 'site_visits'
            ORDER BY created_at DESC
            LIMIT 100
          `;
          break;

        case "totalUsers":
          // Get all registered users from both user_profiles and users (legacy) tables
          query = `
            SELECT 
              name,
              email,
              city,
              join_date,
              created_at
            FROM user_profiles 
            WHERE email IS NOT NULL AND email <> ''
            ORDER BY created_at DESC
            LIMIT 500
          `;
          break;

        case "totalMoneyDonated":
          // Get all money donations with donor info
          query = `
            SELECT 
              d.amount,
              d.created_at,
              d.created_at as donation_date,
              up.name as donor_name,
              dc.name_he as category_name
            FROM donations d
            LEFT JOIN user_profiles up ON up.id = d.donor_id
            LEFT JOIN donation_categories dc ON dc.id = d.category_id
            WHERE d.type = 'money' AND d.amount > 0
            ORDER BY d.created_at DESC
            LIMIT 500
          `;
          break;

        case "itemDonations":
          // Get all item donations
          query = `
            SELECT 
              d.title,
              d.title as item_name,
              d.created_at,
              up.name as donor_name
            FROM donations d
            LEFT JOIN user_profiles up ON up.id = d.donor_id
            WHERE d.type = 'item' AND d.status = 'active'
            ORDER BY d.created_at DESC
            LIMIT 500
          `;
          break;

        case "completedRides":
          // Get all completed rides
          query = `
            SELECT 
              r.from_location->>'city' as from_city,
              r.to_location->>'city' as to_city,
              r.departure_time as ride_date,
              r.created_at,
              up.name as driver_name
            FROM rides r
            LEFT JOIN user_profiles up ON up.id = r.driver_id
            WHERE r.status = 'completed'
            ORDER BY r.created_at DESC
            LIMIT 500
          `;
          break;

        case "uniqueDonors":
        case "recurringDonationsAmount":
          // Get recurring donors
          query = `
            SELECT 
              up.name as donor_name,
              d.amount,
              d.created_at as start_date,
              'חודשי' as frequency
            FROM donations d
            INNER JOIN user_profiles up ON up.id = d.donor_id
            WHERE d.is_recurring = true 
              AND d.type = 'money' 
              AND d.status = 'active'
              AND up.is_active = true
            ORDER BY d.amount DESC, d.created_at DESC
            LIMIT 500
          `;
          break;

        case "completedTasks":
          // Get completed community tasks
          // משימות קהילתיות שהושלמו
          query = `
            SELECT 
              t.title,
              t.description,
              t.category,
              t.updated_at,
              t.created_at,
              up.name as completed_by
            FROM tasks t
            LEFT JOIN user_profiles up ON up.id = t.created_by
            WHERE t.status = 'done'
            ORDER BY t.updated_at DESC
            LIMIT 500
          `;
          break;

        default:
          return { success: false, error: "Unknown stat type" };
      }

      const { rows } = await this.pool.query(query, params);

      // Cache for 5 minutes
      await this.redisCache.set(cacheKey, rows, 5 * 60);

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Get stat details error:", error);
      return { success: false, error: "Failed to load stat details" };
    }
  }

  /**
   * Add computed statistics to the stats object
   * Uses individual caching for each query type to optimize performance
   * Each metric type has its own cache key and TTL based on data volatility:
   * - User metrics: 20 minutes (relatively static)
   * - Donation/Ride metrics: 15 minutes (moderate changes)
   * - Activity/Chat metrics: 5 minutes (frequent changes)
   *
   * @param stats - Stats object to populate
   * @param city - Optional city filter for location-based stats
   */
  private async addComputedStats(stats: CommunityStats, city?: string) {
    try {
      const params = city ? [city] : [];
      const userCityCondition = city ? "AND city = $1" : "";
      const donationCityCondition = city
        ? "AND (d.location->>'city' = $1)"
        : "";
      const rideCityCondition = city ? "AND (from_location->>'city' = $1)" : "";
      const eventCityCondition = city ? "AND (location->>'city' = $1)" : "";

      // Generate cache keys for individual queries based on city filter
      const cityKey = city || "global";
      const cacheKeys = {
        userMetrics: `computed_stats_users_${cityKey}`,
        donationMetrics: `computed_stats_donations_${cityKey}`,
        rideMetrics: `computed_stats_rides_${cityKey}`,
        eventMetrics: `computed_stats_events_${cityKey}`,
        activityMetrics: `computed_stats_activities_${cityKey}`,
        chatMetrics: `computed_stats_chat_${cityKey}`,
        siteVisitsMetrics: `computed_stats_site_visits_${cityKey}`,
        taskMetrics: `computed_stats_tasks_${cityKey}`,
      };

      // Try to get all cached metrics at once
      let cachedMetrics = new Map();
      try {
        cachedMetrics = await this.redisCache.getMultiple([
          cacheKeys.userMetrics,
          cacheKeys.donationMetrics,
          cacheKeys.rideMetrics,
          cacheKeys.eventMetrics,
          cacheKeys.activityMetrics,
          cacheKeys.chatMetrics,
          cacheKeys.siteVisitsMetrics,
          cacheKeys.taskMetrics,
        ]);
      } catch (cacheError) {
        this.logger.warn(
          "Cache getMultiple error, continuing without cache:",
          cacheError,
        );
      }

      // Helper function to get cached or execute query
      const getCachedOrQuery = async (
        cacheKey: string,
        queryFn: () => Promise<unknown>,
        ttl: number = 10 * 60,
      ): Promise<{ rows: MetricsRow[] }> => {
        const cached = cachedMetrics.get(cacheKey);
        if (cached) {
          return { rows: [cached as MetricsRow] };
        }
        const result = (await queryFn()) as { rows: MetricsRow[] };
        if (result && result.rows && result.rows.length > 0) {
          await this.redisCache.set(cacheKey, result.rows[0], ttl);
        }
        return result;
      };

      // Basic counts and metrics - with individual caching
      const queries = await Promise.all([
        // User metrics - from user_profiles only (legacy users table no longer used)
        getCachedOrQuery(
          cacheKeys.userMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(DISTINCT LOWER(email)) as total_users,
          COUNT(DISTINCT CASE WHEN is_active = true AND last_active >= NOW() - INTERVAL '30 days' THEN LOWER(email) END) as active_members,
          COUNT(DISTINCT CASE WHEN last_active >= NOW() - INTERVAL '1 day' THEN LOWER(email) END) as daily_active_users,
          COUNT(DISTINCT CASE WHEN last_active >= NOW() - INTERVAL '7 days' THEN LOWER(email) END) as weekly_active_users,
          COUNT(DISTINCT CASE WHEN join_date >= CURRENT_DATE - INTERVAL '7 days' THEN LOWER(email) END) as new_users_this_week,
          COUNT(DISTINCT CASE WHEN join_date >= CURRENT_DATE - INTERVAL '30 days' THEN LOWER(email) END) as new_users_this_month,
          COUNT(DISTINCT CASE WHEN 'org_admin' = ANY(roles) THEN LOWER(email) END) as total_organizations,
          COUNT(DISTINCT city) as cities_with_users
        FROM user_profiles
        WHERE email IS NOT NULL AND email <> ''
          ${userCityCondition}
      `,
              params,
            ),
          20 * 60,
        ), // Cache for 20 minutes - user metrics are relatively static

        // Donation metrics
        getCachedOrQuery(
          cacheKeys.donationMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(*) as total_donations,
          COUNT(CASE WHEN d.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as donations_this_week,
          COUNT(CASE WHEN d.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as donations_this_month,
          COUNT(CASE WHEN d.status = 'active' THEN 1 END) as active_donations,
          COUNT(CASE WHEN d.status = 'completed' THEN 1 END) as completed_donations,
          COUNT(CASE WHEN d.type = 'money' THEN 1 END) as money_donations,
          COUNT(CASE WHEN d.type = 'item' AND d.status = 'active' THEN 1 END) as item_donations,
          COUNT(CASE WHEN d.type = 'service' THEN 1 END) as service_donations,
          COUNT(CASE WHEN d.type = 'time' THEN 1 END) as volunteer_hours,
          SUM(CASE WHEN d.type = 'money' THEN d.amount ELSE 0 END) as total_money_donated,
          SUM(CASE WHEN d.type = 'money' AND d.is_recurring = true AND d.status = 'active' THEN d.amount ELSE 0 END) as recurring_donations_amount,
          COUNT(DISTINCT CASE WHEN d.is_recurring = true AND up.is_active = true THEN d.donor_id END) as unique_donors
        FROM donations d
        LEFT JOIN user_profiles up ON up.id = d.donor_id
        WHERE 1=1 ${donationCityCondition}
      `,
              params,
            ),
          15 * 60,
        ), // Cache for 15 minutes

        // Ride metrics
        getCachedOrQuery(
          cacheKeys.rideMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(*) as total_rides,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as rides_this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as rides_this_month,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rides,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
          SUM(available_seats) as total_seats_offered,
          COUNT(DISTINCT driver_id) as unique_drivers
        FROM rides 
        WHERE 1=1 ${rideCityCondition}
      `,
              params,
            ),
          15 * 60,
        ), // Cache for 15 minutes

        // Event metrics
        getCachedOrQuery(
          cacheKeys.eventMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as events_this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as events_this_month,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_events,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
          SUM(current_attendees) as total_event_attendees,
          COUNT(CASE WHEN is_virtual = true THEN 1 END) as virtual_events
        FROM community_events 
        WHERE 1=1 ${eventCityCondition}
      `,
              params,
            ),
          10 * 60,
        ), // Cache for 10 minutes

        // Activity and engagement metrics
        getCachedOrQuery(
          cacheKeys.activityMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as activities_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as activities_this_week,
          COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as total_logins,
          COUNT(CASE WHEN activity_type = 'donation' THEN 1 END) as donation_activities,
          COUNT(CASE WHEN activity_type = 'chat' THEN 1 END) as chat_activities,
          COUNT(DISTINCT user_id) as active_users_tracked
        FROM user_activities 
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
      `,
              [],
            ),
          5 * 60,
        ), // Cache for 5 minutes - activities change frequently

        // Chat and social metrics
        getCachedOrQuery(
          cacheKeys.chatMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(DISTINCT cm.id) as total_messages,
          COUNT(DISTINCT cc.id) as total_conversations,
          COUNT(CASE WHEN cm.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as messages_this_week,
          COUNT(CASE WHEN cc.type = 'group' THEN 1 END) as group_conversations,
          COUNT(CASE WHEN cc.type = 'direct' THEN 1 END) as direct_conversations
        FROM chat_conversations cc
        LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
        WHERE cm.is_deleted = false
      `,
              [],
            ),
          5 * 60,
        ), // Cache for 5 minutes - chat metrics change frequently

        // Site visits - sum of stat_value (each record can represent multiple visits on the same day)
        // ביקורים באתר - סכום של stat_value (כל רשומה יכולה לייצג מספר ביקורים באותו יום)
        // Note: If there are 4 records with stat_value=1 each, sum will be 4. If 1 record with stat_value=4, sum will also be 4.
        // Apply city filter if provided (site_visits are global, so city is NULL)
        getCachedOrQuery(
          cacheKeys.siteVisitsMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COALESCE(SUM(stat_value), 0) as site_visits
        FROM community_stats 
        WHERE stat_type = 'site_visits'
        ${city ? "AND city IS NULL" : ""}
      `,
              params,
            ),
          5 * 60,
        ), // Cache for 5 minutes

        // Task metrics - community tasks (all tasks are community tasks, not personal)
        // סטטיסטיקות משימות - משימות קהילתיות (כל המשימות הן קהילתיות ולא אישיות)
        getCachedOrQuery(
          cacheKeys.taskMetrics,
          () =>
            this.pool.query(
              `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tasks,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN status = 'done' AND updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as completed_tasks_this_week,
          COUNT(CASE WHEN status = 'done' AND updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as completed_tasks_this_month
        FROM tasks
      `,
              [],
            ),
          10 * 60,
        ), // Cache for 10 minutes
      ]);

      const [
        userMetrics,
        donationMetrics,
        rideMetrics,
        eventMetrics,
        activityMetrics,
        chatMetrics,
        siteVisitsMetrics,
        taskMetrics,
      ] = queries as { rows: MetricsRow[] }[];

      // Helper to get string value safely for parseInt
      const getVal = (row: MetricsRow, key: string): string =>
        String(row[key] ?? "0");

      // Map all computed stats
      const computed: CommunityStats = {
        // User stats
        total_users: {
          value: parseInt(getVal(userMetrics.rows[0], "total_users"), 10),
          days_tracked: 1,
        },
        active_members: {
          value: parseInt(getVal(userMetrics.rows[0], "active_members"), 10),
          days_tracked: 1,
        },
        daily_active_users: {
          value: parseInt(
            getVal(userMetrics.rows[0], "daily_active_users"),
            10,
          ),
          days_tracked: 1,
        },
        weekly_active_users: {
          value: parseInt(
            getVal(userMetrics.rows[0], "weekly_active_users"),
            10,
          ),
          days_tracked: 1,
        },
        new_users_this_week: {
          value: parseInt(
            getVal(userMetrics.rows[0], "new_users_this_week"),
            10,
          ),
          days_tracked: 1,
        },
        new_users_this_month: {
          value: parseInt(
            getVal(userMetrics.rows[0], "new_users_this_month"),
            10,
          ),
          days_tracked: 1,
        },
        total_organizations: {
          value: parseInt(
            getVal(userMetrics.rows[0], "total_organizations"),
            10,
          ),
          days_tracked: 1,
        },
        cities_with_users: {
          value: parseInt(getVal(userMetrics.rows[0], "cities_with_users"), 10),
          days_tracked: 1,
        },

        // Donation stats
        total_donations: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "total_donations"),
            10,
          ),
          days_tracked: 1,
        },
        donations_this_week: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "donations_this_week"),
            10,
          ),
          days_tracked: 1,
        },
        donations_this_month: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "donations_this_month"),
            10,
          ),
          days_tracked: 1,
        },
        active_donations: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "active_donations"),
            10,
          ),
          days_tracked: 1,
        },
        completed_donations: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "completed_donations"),
            10,
          ),
          days_tracked: 1,
        },
        money_donations: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "money_donations"),
            10,
          ),
          days_tracked: 1,
        },
        item_donations: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "item_donations"),
            10,
          ),
          days_tracked: 1,
        },
        service_donations: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "service_donations"),
            10,
          ),
          days_tracked: 1,
        },
        volunteer_hours: {
          value: parseInt(
            getVal(donationMetrics.rows[0], "volunteer_hours"),
            10,
          ),
          days_tracked: 1,
        },
        total_money_donated: {
          value: parseFloat(
            getVal(donationMetrics.rows[0], "total_money_donated"),
          ),
          days_tracked: 1,
        },
        recurring_donations_amount: {
          value: parseFloat(
            getVal(donationMetrics.rows[0], "recurring_donations_amount"),
          ),
          days_tracked: 1,
        },
        unique_donors: {
          value: parseInt(getVal(donationMetrics.rows[0], "unique_donors"), 10),
          days_tracked: 1,
        },

        // Ride stats
        total_rides: {
          value: parseInt(getVal(rideMetrics.rows[0], "total_rides"), 10),
          days_tracked: 1,
        },
        rides_this_week: {
          value: parseInt(getVal(rideMetrics.rows[0], "rides_this_week"), 10),
          days_tracked: 1,
        },
        rides_this_month: {
          value: parseInt(getVal(rideMetrics.rows[0], "rides_this_month"), 10),
          days_tracked: 1,
        },
        active_rides: {
          value: parseInt(getVal(rideMetrics.rows[0], "active_rides"), 10),
          days_tracked: 1,
        },
        completed_rides: {
          value: parseInt(getVal(rideMetrics.rows[0], "completed_rides"), 10),
          days_tracked: 1,
        },
        total_seats_offered: {
          value: parseInt(
            getVal(rideMetrics.rows[0], "total_seats_offered"),
            10,
          ),
          days_tracked: 1,
        },
        unique_drivers: {
          value: parseInt(getVal(rideMetrics.rows[0], "unique_drivers"), 10),
          days_tracked: 1,
        },

        // Event stats
        total_events: {
          value: parseInt(getVal(eventMetrics.rows[0], "total_events"), 10),
          days_tracked: 1,
        },
        events_this_week: {
          value: parseInt(getVal(eventMetrics.rows[0], "events_this_week"), 10),
          days_tracked: 1,
        },
        events_this_month: {
          value: parseInt(
            getVal(eventMetrics.rows[0], "events_this_month"),
            10,
          ),
          days_tracked: 1,
        },
        active_events: {
          value: parseInt(getVal(eventMetrics.rows[0], "active_events"), 10),
          days_tracked: 1,
        },
        completed_events: {
          value: parseInt(getVal(eventMetrics.rows[0], "completed_events"), 10),
          days_tracked: 1,
        },
        total_event_attendees: {
          value: parseInt(
            getVal(eventMetrics.rows[0], "total_event_attendees"),
            10,
          ),
          days_tracked: 1,
        },
        virtual_events: {
          value: parseInt(getVal(eventMetrics.rows[0], "virtual_events"), 10),
          days_tracked: 1,
        },

        // Activity stats
        total_activities: {
          value: parseInt(
            getVal(activityMetrics.rows[0], "total_activities"),
            10,
          ),
          days_tracked: 1,
        },
        activities_today: {
          value: parseInt(
            getVal(activityMetrics.rows[0], "activities_today"),
            10,
          ),
          days_tracked: 1,
        },
        activities_this_week: {
          value: parseInt(
            getVal(activityMetrics.rows[0], "activities_this_week"),
            10,
          ),
          days_tracked: 1,
        },
        total_logins: {
          value: parseInt(getVal(activityMetrics.rows[0], "total_logins"), 10),
          days_tracked: 1,
        },
        donation_activities: {
          value: parseInt(
            getVal(activityMetrics.rows[0], "donation_activities"),
            10,
          ),
          days_tracked: 1,
        },
        chat_activities: {
          value: parseInt(
            getVal(activityMetrics.rows[0], "chat_activities"),
            10,
          ),
          days_tracked: 1,
        },
        active_users_tracked: {
          value: parseInt(
            getVal(activityMetrics.rows[0], "active_users_tracked"),
            10,
          ),
          days_tracked: 1,
        },

        // Chat stats
        total_messages: {
          value: parseInt(getVal(chatMetrics.rows[0], "total_messages"), 10),
          days_tracked: 1,
        },
        total_conversations: {
          value: parseInt(
            getVal(chatMetrics.rows[0], "total_conversations"),
            10,
          ),
          days_tracked: 1,
        },
        messages_this_week: {
          value: parseInt(
            getVal(chatMetrics.rows[0], "messages_this_week"),
            10,
          ),
          days_tracked: 1,
        },
        group_conversations: {
          value: parseInt(
            getVal(chatMetrics.rows[0], "group_conversations"),
            10,
          ),
          days_tracked: 1,
        },
        direct_conversations: {
          value: parseInt(
            getVal(chatMetrics.rows[0], "direct_conversations"),
            10,
          ),
          days_tracked: 1,
        },

        site_visits: stats.site_visits || {
          value: parseInt(getVal(siteVisitsMetrics.rows[0], "site_visits"), 10),
          days_tracked: 1,
        },

        total_tasks: {
          value: parseInt(getVal(taskMetrics.rows[0], "total_tasks"), 10),
          days_tracked: 1,
        },
        completed_tasks: {
          value: parseInt(getVal(taskMetrics.rows[0], "completed_tasks"), 10),
          days_tracked: 1,
        },
        open_tasks: {
          value: parseInt(getVal(taskMetrics.rows[0], "open_tasks"), 10),
          days_tracked: 1,
        },
        in_progress_tasks: {
          value: parseInt(getVal(taskMetrics.rows[0], "in_progress_tasks"), 10),
          days_tracked: 1,
        },
        completed_tasks_this_week: {
          value: parseInt(
            getVal(taskMetrics.rows[0], "completed_tasks_this_week"),
            10,
          ),
          days_tracked: 1,
        },
        completed_tasks_this_month: {
          value: parseInt(
            getVal(taskMetrics.rows[0], "completed_tasks_this_month"),
            10,
          ),
          days_tracked: 1,
        },
      };

      // Add computed stats to the main stats object
      Object.assign(stats, computed);

      // Add derived metrics after base stats are set
      stats.avg_donation_amount = {
        value:
          (stats.money_donations?.value ?? 0) > 0
            ? Math.round(
                (stats.total_money_donated?.value ?? 0) /
                  (stats.money_donations?.value ?? 1),
              )
            : 0,
        days_tracked: 1,
      };
      stats.avg_seats_per_ride = {
        value:
          (stats.total_rides?.value ?? 0) > 0
            ? Math.round(
                (stats.total_seats_offered?.value ?? 0) /
                  (stats.total_rides?.value ?? 1),
              )
            : 0,
        days_tracked: 1,
      };
      stats.user_engagement_rate = {
        value:
          (stats.total_users?.value ?? 0) > 0
            ? Math.round(
                ((stats.weekly_active_users?.value ?? 0) /
                  (stats.total_users?.value ?? 1)) *
                  100,
              )
            : 0,
        days_tracked: 1,
      };

      // Legacy compatibility
      if (!stats.total_contributions) {
        stats.total_contributions = {
          value:
            (stats.money_donations?.value ?? 0) +
            (stats.volunteer_hours?.value ?? 0) +
            (stats.total_rides?.value ?? 0),
          days_tracked: 1,
        };
      }
    } catch (error) {
      this.logger.error("Error in addComputedStats:", error);
      // Set default values for all computed stats to prevent undefined errors
      const defaultStats = {
        total_users: { value: 0, days_tracked: 1 },
        active_members: { value: 0, days_tracked: 1 },
        daily_active_users: { value: 0, days_tracked: 1 },
        weekly_active_users: { value: 0, days_tracked: 1 },
        new_users_this_week: { value: 0, days_tracked: 1 },
        new_users_this_month: { value: 0, days_tracked: 1 },
        total_organizations: { value: 0, days_tracked: 1 },
        cities_with_users: { value: 0, days_tracked: 1 },
        total_donations: { value: 0, days_tracked: 1 },
        donations_this_week: { value: 0, days_tracked: 1 },
        donations_this_month: { value: 0, days_tracked: 1 },
        active_donations: { value: 0, days_tracked: 1 },
        completed_donations: { value: 0, days_tracked: 1 },
        money_donations: { value: 0, days_tracked: 1 },
        item_donations: { value: 0, days_tracked: 1 },
        service_donations: { value: 0, days_tracked: 1 },
        volunteer_hours: { value: 0, days_tracked: 1 },
        total_money_donated: { value: 0, days_tracked: 1 },
        recurring_donations_amount: { value: 0, days_tracked: 1 },
        unique_donors: { value: 0, days_tracked: 1 },
        total_rides: { value: 0, days_tracked: 1 },
        rides_this_week: { value: 0, days_tracked: 1 },
        rides_this_month: { value: 0, days_tracked: 1 },
        active_rides: { value: 0, days_tracked: 1 },
        completed_rides: { value: 0, days_tracked: 1 },
        total_seats_offered: { value: 0, days_tracked: 1 },
        unique_drivers: { value: 0, days_tracked: 1 },
        total_events: { value: 0, days_tracked: 1 },
        events_this_week: { value: 0, days_tracked: 1 },
        events_this_month: { value: 0, days_tracked: 1 },
        active_events: { value: 0, days_tracked: 1 },
        completed_events: { value: 0, days_tracked: 1 },
        total_event_attendees: { value: 0, days_tracked: 1 },
        virtual_events: { value: 0, days_tracked: 1 },
        total_activities: { value: 0, days_tracked: 1 },
        activities_today: { value: 0, days_tracked: 1 },
        activities_this_week: { value: 0, days_tracked: 1 },
        total_logins: { value: 0, days_tracked: 1 },
        donation_activities: { value: 0, days_tracked: 1 },
        chat_activities: { value: 0, days_tracked: 1 },
        active_users_tracked: { value: 0, days_tracked: 1 },
        total_messages: { value: 0, days_tracked: 1 },
        total_conversations: { value: 0, days_tracked: 1 },
        messages_this_week: { value: 0, days_tracked: 1 },
        group_conversations: { value: 0, days_tracked: 1 },
        direct_conversations: { value: 0, days_tracked: 1 },
        site_visits: { value: 0, days_tracked: 1 },
        total_tasks: { value: 0, days_tracked: 1 },
        completed_tasks: { value: 0, days_tracked: 1 },
        open_tasks: { value: 0, days_tracked: 1 },
        in_progress_tasks: { value: 0, days_tracked: 1 },
        completed_tasks_this_week: { value: 0, days_tracked: 1 },
        completed_tasks_this_month: { value: 0, days_tracked: 1 },
        avg_donation_amount: { value: 0, days_tracked: 1 },
        avg_seats_per_ride: { value: 0, days_tracked: 1 },
        user_engagement_rate: { value: 0, days_tracked: 1 },
        total_contributions: { value: 0, days_tracked: 1 },
      };
      Object.assign(stats, defaultStats);
    }
  }

  @Post("community/reset")
  @UseGuards(AdminAuthGuard)
  async resetCommunityStats() {
    try {
      // Delete all community_stats records
      await this.pool.query(`DELETE FROM community_stats`);

      // Clear all stats-related caches
      await this.clearStatsCaches();

      return {
        success: true,
        message: "Community statistics reset successfully",
      };
    } catch (error) {
      this.logger.error("Reset community stats error:", error);
      return { success: false, error: "Failed to reset community statistics" };
    }
  }

  private async clearStatsCaches(_statType?: string, _city?: string) {
    // Use the shared method from RedisCacheService
    await this.redisCache.clearStatsCaches();
  }
}
