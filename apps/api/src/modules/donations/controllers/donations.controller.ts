// File overview:
// - Purpose: Donations API for categories, CRUD, listing, and stats; updates community/user stats and caches.
// - Reached from: Routes under '/api/donations'.
// - Provides: Create/update/delete donation, list with filters, per-user donations, category endpoints, summary stats.
// - Storage: `donations`, `donation_categories`, `user_profiles`, `community_stats`; Redis caches with TTL.
// - Future improvements: Split into DonationsCategoryService, DonationsService, DonationsStatsService.
//   Add class-validator DTOs, cursor-based pagination, and Swagger decorators.
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

interface CreateDonationDto {
  donor_id: string;
  recipient_id?: string;
  organization_id?: string;
  category_id: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  type: string;
  status?: string;
  is_recurring?: boolean;
  isRecurring?: boolean;
  location?: Record<string, unknown>;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

interface UpdateDonationDto {
  title?: string;
  description?: string;
  amount?: number;
  status?: string;
  is_recurring?: boolean;
  isRecurring?: boolean;
  location?: Record<string, unknown>;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

@Controller("api/donations")
export class DonationsController {
  private readonly logger = new Logger(DonationsController.name);
  private readonly CACHE_TTL = 10 * 60;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  private buildDonationCacheKey(
    type?: string,
    category?: string,
    city?: string,
    status?: string,
    limit?: string,
    offset?: string,
    search?: string,
  ): string {
    return `donations_${type || "all"}_${category || "all"}_${city || "all"}_${status || "active"}_${limit || "50"}_${offset || "0"}_${search || ""}`;
  }

  private buildDonationsWhereClause(
    type?: string,
    category?: string,
    city?: string,
    status?: string,
    search?: string,
  ): { whereClauses: string[]; params: unknown[] } {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (type) {
      whereClauses.push(`d.type = $${params.length + 1}`);
      params.push(type);
    }
    if (category) {
      whereClauses.push(`dc.slug = $${params.length + 1}`);
      params.push(category);
    }
    if (city) {
      const paramIndex = params.length + 1;
      whereClauses.push(
        `(d.location->>'city' = $${paramIndex} OR up.city = $${paramIndex})`,
      );
      params.push(city);
    }
    if (status) {
      whereClauses.push(`d.status = $${params.length + 1}`);
      params.push(status);
    } else {
      whereClauses.push(`d.status = 'active'`);
    }
    if (search) {
      const paramIndex = params.length + 1;
      whereClauses.push(
        `(d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`,
      );
      params.push(`%${search}%`);
    }

    return { whereClauses, params };
  }

  /**
   * Get all donation categories with caching
   * Cache TTL: 30 minutes (categories are static data that rarely changes)
   */
  @Get("categories")
  async getCategories() {
    const cacheKey = "donation_categories_all";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(`
      SELECT id, slug, name_he, name_en, description_he, description_en, 
             icon, color, is_active, sort_order
      FROM donation_categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC, name_he ASC
    `);

    // Cache for 30 minutes - categories are static data
    await this.redisCache.set(cacheKey, rows, 30 * 60);
    return { success: true, data: rows };
  }

  /**
   * Get a single donation category by slug with caching
   * Cache TTL: 30 minutes (categories are static data)
   */
  @Get("categories/:slug")
  async getCategoryBySlug(@Param("slug") slug: string) {
    const cacheKey = `donation_category_${slug}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT * FROM donation_categories WHERE slug = $1 AND is_active = true
    `,
      [slug],
    );

    if (rows.length === 0) {
      return { success: false, error: "Category not found" };
    }

    // Cache for 30 minutes - categories are static data
    await this.redisCache.set(cacheKey, rows[0], 30 * 60);
    return { success: true, data: rows[0] };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createDonation(@Body() donationData: CreateDonationDto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert donation
      const isRecurring =
        donationData.is_recurring ?? donationData.isRecurring ?? false;

      const { rows } = await client.query(
        `
        INSERT INTO donations (
          donor_id, recipient_id, organization_id, category_id, 
          title, description, amount, currency, type, status,
          is_recurring, location, images, tags, metadata, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `,
        [
          donationData.donor_id,
          donationData.recipient_id || null,
          donationData.organization_id || null,
          donationData.category_id,
          donationData.title,
          donationData.description,
          donationData.amount || null,
          donationData.currency || "ILS",
          donationData.type,
          "active",
          isRecurring,
          donationData.location ? JSON.stringify(donationData.location) : null,
          donationData.images || [],
          donationData.tags || [],
          donationData.metadata ? JSON.stringify(donationData.metadata) : null,
          donationData.expires_at || null,
        ],
      );

      const donation = rows[0];

      // Update user stats
      if (donationData.type === "money" && donationData.amount) {
        await client.query(
          `
          UPDATE user_profiles 
          SET total_donations_amount = total_donations_amount + $1,
              updated_at = NOW()
          WHERE id = $2
        `,
          [donationData.amount, donationData.donor_id],
        );
      }

      // Update community stats
      await this.updateCommunityStats(
        client,
        donationData.type,
        donationData.amount || 1,
      );

      // Track user activity
      await client.query(
        `
        INSERT INTO user_activities (user_id, activity_type, activity_data)
        VALUES ($1, $2, $3)
      `,
        [
          donationData.donor_id,
          "donation_created",
          JSON.stringify({
            donation_id: donation.id,
            type: donationData.type,
            amount: donationData.amount,
          }),
        ],
      );

      await client.query("COMMIT");

      // Clear relevant caches
      await this.clearDonationCaches();
      await this.clearCommunityStatsCaches();

      return { success: true, data: donation };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Create donation error:", error);
      return { success: false, error: "Failed to create donation" };
    } finally {
      client.release();
    }
  }

  @Get()
  async getDonations(
    @Query("type") type?: string,
    @Query("category") category?: string,
    @Query("city") city?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("search") search?: string,
  ) {
    const cacheKey = this.buildDonationCacheKey(
      type,
      category,
      city,
      status,
      limit,
      offset,
      search,
    );

    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const baseQuery = `
      SELECT d.*, dc.name_he as category_name, dc.icon as category_icon,
             up.name as donor_name, up.city as donor_city, up.avatar_url as donor_avatar
      FROM donations d
      LEFT JOIN donation_categories dc ON d.category_id = dc.id
      LEFT JOIN user_profiles up ON d.donor_id = up.id
    `;

    const { whereClauses, params } = this.buildDonationsWhereClause(
      type,
      category,
      city,
      status,
      search,
    );

    const parsedLimit = limit ? Number.parseInt(limit, 10) : 50;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : 0;

    const whereClause = ` WHERE ${whereClauses.join(" AND ")}`;
    const orderClause = ` ORDER BY d.created_at DESC`;
    const paginationClause = ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(parsedLimit, parsedOffset);

    const query = baseQuery + whereClause + orderClause + paginationClause;
    const { rows } = await this.pool.query(query, params);

    await this.redisCache.set(cacheKey, rows, 5 * 60);
    return { success: true, data: rows };
  }

  /**
   * Get a single donation by ID with caching
   * Cache TTL: 15 minutes (donations are relatively static but can be updated)
   */
  @Get(":id")
  async getDonationById(@Param("id") id: string) {
    const cacheKey = `donation_${id}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT d.*, dc.name_he as category_name, dc.icon as category_icon,
             up.name as donor_name, up.city as donor_city, up.avatar_url as donor_avatar,
             up.phone as donor_phone, up.email as donor_email
      FROM donations d
      LEFT JOIN donation_categories dc ON d.category_id = dc.id
      LEFT JOIN user_profiles up ON d.donor_id = up.id
      WHERE d.id = $1
    `,
      [id],
    );

    if (rows.length === 0) {
      return { success: false, error: "Donation not found" };
    }

    // Cache for 15 minutes
    await this.redisCache.set(cacheKey, rows[0], 15 * 60);
    return { success: true, data: rows[0] };
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  async updateDonation(
    @Param("id") id: string,
    @Body() updateData: UpdateDonationDto,
  ) {
    const { rows } = await this.pool.query(
      `
      UPDATE donations 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          amount = COALESCE($3, amount),
          status = COALESCE($4, status),
          is_recurring = COALESCE($5, is_recurring),
          location = COALESCE($6, location),
          images = COALESCE($7, images),
          tags = COALESCE($8, tags),
          metadata = COALESCE($9, metadata),
          expires_at = COALESCE($10, expires_at),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `,
      [
        updateData.title,
        updateData.description,
        updateData.amount,
        updateData.status,
        updateData.is_recurring ?? updateData.isRecurring ?? null,
        updateData.location ? JSON.stringify(updateData.location) : null,
        updateData.images,
        updateData.tags,
        updateData.metadata ? JSON.stringify(updateData.metadata) : null,
        updateData.expires_at,
        id,
      ],
    );

    if (rows.length === 0) {
      return { success: false, error: "Donation not found" };
    }

    // Clear specific donation cache
    await this.redisCache.delete(`donation_${id}`);
    await this.clearDonationCaches();
    return { success: true, data: rows[0] };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async deleteDonation(@Param("id") id: string) {
    // First check if donation exists
    const { rows } = await this.pool.query(
      `
      SELECT id, status FROM donations WHERE id = $1
    `,
      [id],
    );

    if (rows.length === 0) {
      return { success: false, error: "Donation not found" };
    }

    // Delete from database
    const { rowCount } = await this.pool.query(
      `
      DELETE FROM donations WHERE id = $1
    `,
      [id],
    );

    if (rowCount === 0) {
      return { success: false, error: "Failed to delete donation" };
    }

    // Clear specific donation cache
    await this.redisCache.delete(`donation_${id}`);
    // Clear all related caches
    await this.clearDonationCaches();
    await this.clearCommunityStatsCaches();

    return { success: true, message: "Donation deleted successfully" };
  }

  @Get("user/:userId")
  async getUserDonations(@Param("userId") userId: string) {
    const cacheKey = `user_donations_${userId}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT d.*, dc.name_he as category_name, dc.icon as category_icon
      FROM donations d
      LEFT JOIN donation_categories dc ON d.category_id = dc.id
      WHERE d.donor_id = $1
      ORDER BY d.created_at DESC
    `,
      [userId],
    );

    await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
    return { success: true, data: rows };
  }

  /**
   * Donation stats summary for the past 30 days
   */
  @Get("stats/summary")
  async getDonationStats() {
    const cacheKey = "donation_stats_summary";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(`
      SELECT 
        COUNT(*) as total_donations,
        COUNT(DISTINCT donor_id) as unique_donors,
        SUM(CASE WHEN type = 'money' THEN amount ELSE 0 END) as total_money,
        COUNT(CASE WHEN type = 'time' THEN 1 END) as time_donations,
        COUNT(CASE WHEN type = 'trump' THEN 1 END) as ride_donations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_donations,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_donations
      FROM donations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const stats = rows[0];
    await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);
    return { success: true, data: stats };
  }

  private async updateCommunityStats(
    client: PoolClient,
    type: string,
    amount: number,
  ) {
    const statTypeMap: Record<string, string> = {
      money: "money_donations",
      time: "volunteer_hours",
      trump: "rides_completed",
    };
    const statType = statTypeMap[type] ?? "other_donations";

    await client.query(
      `
      INSERT INTO community_stats (stat_type, stat_value, date_period)
      VALUES ($1, $2, CURRENT_DATE)
      ON CONFLICT (stat_type, city, date_period) 
      DO UPDATE SET stat_value = community_stats.stat_value + $2, updated_at = NOW()
    `,
      [statType, amount],
    );
  }

  /**
   * Clear all donation-related caches
   * Called after create/update/delete operations to ensure data consistency
   * Uses invalidatePattern for efficient batch deletion
   */
  private async clearDonationCaches() {
    const patterns = [
      "donations_*", // All donation lists with filters
      "user_donations_*", // User-specific donation lists
      "donation_stats_*", // Donation statistics
      "donation_*", // Individual donation cache
      "donation_category_*", // Individual category cache
    ];

    for (const pattern of patterns) {
      await this.redisCache.invalidatePattern(pattern);
    }

    // Clear categories cache explicitly
    await this.redisCache.delete("donation_categories_all");
  }

  private async clearCommunityStatsCaches() {
    // Use invalidatePattern for better performance
    const patterns = [
      "community_stats_*",
      "community_trends_*",
      "dashboard_stats",
      "real_time_stats",
    ];
    for (const pattern of patterns) {
      await this.redisCache.invalidatePattern(pattern);
    }
  }
}
