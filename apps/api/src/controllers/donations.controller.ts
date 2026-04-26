// File overview:
// - Purpose: Donations API for categories, CRUD, listing, and stats; updates community/user stats and caches.
// - Reached from: Routes under '/api/donations'.
// - Provides: Create/update/delete donation, list with filters, per-user donations, category endpoints, summary stats.
// - Storage: `donations`, `donation_categories`, `user_profiles`, `community_stats`; Redis caches with TTL.

// TODO: CRITICAL - This file is long (292+ lines). Split into specialized services:
//   - DonationsCategoryService for category operations
//   - DonationsService for CRUD operations
//   - DonationsStatsService for analytics
//   - DonationsCacheService for cache management
// TODO: Add comprehensive DTO validation for all endpoints with class-validator
// TODO: Implement proper pagination with cursor-based approach
// TODO: Add comprehensive error handling with proper HTTP status codes
// TODO: Implement proper authorization and access control
// TODO: Add comprehensive logging and monitoring for all operations
// TODO: Remove hardcoded cache TTL and make it configurable
// TODO: Add comprehensive unit tests for all donation operations
// TODO: Implement proper data sanitization and validation
// TODO: Add comprehensive API documentation with Swagger decorators
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { SessionTokenPayload } from "../auth/jwt.service";
import type { Request } from "express";
import { ItemsService } from "../items/items.service";
import { randomUUID } from "crypto";

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
  // TODO: Move cache TTL to configuration service
  // TODO: Implement different TTL values for different types of data
  // TODO: Add cache invalidation strategies
  private readonly CACHE_TTL = 10 * 60; // 10 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly itemsService: ItemsService,
  ) {}

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

  private async ensureKnowledgeCommunityLinksTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_community_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT NOT NULL,
        description TEXT,
        link_type VARCHAR(32) NOT NULL DEFAULT 'group',
        created_by_user_id UUID,
        created_by_display TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_knowledge_community_links_created_at
       ON knowledge_community_links (created_at DESC)`,
    );
  }

  private async ensureTasksTableMinimal() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        priority VARCHAR(10) NOT NULL DEFAULT 'medium',
        category VARCHAR(50),
        due_date TIMESTAMPTZ,
        assignees UUID[] DEFAULT ARRAY[]::UUID[],
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        checklist JSONB,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        parent_task_id UUID,
        estimated_hours NUMERIC(10,2)
      )
    `);
  }

  private async getRootAdminUserId(): Promise<string | null> {
    const rootEmail = process.env.ROOT_ADMIN_EMAIL;
    if (!rootEmail?.trim()) {
      return null;
    }
    const { rows } = await this.pool.query(
      `SELECT id FROM user_profiles WHERE lower(trim(email)) = lower(trim($1)) LIMIT 1`,
      [rootEmail.trim()],
    );
    return rows[0]?.id ?? null;
  }

  /** Public: list community knowledge links (newest first). */
  @Get("knowledge/links")
  async listKnowledgeCommunityLinks() {
    try {
      await this.ensureKnowledgeCommunityLinksTable();
      const { rows } = await this.pool.query(
        `SELECT id, url, description,
                link_type AS "linkType",
                created_at AS "createdAt",
                created_by_user_id AS "createdByUserId",
                created_by_display AS "createdByDisplay"
         FROM knowledge_community_links
         ORDER BY created_at DESC
         LIMIT 500`,
      );
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("listKnowledgeCommunityLinks", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list knowledge links",
      };
    }
  }

  /** Public: add a knowledge link (no admin approval). */
  @Post("knowledge/links")
  async createKnowledgeCommunityLink(
    @Body()
    body: {
      url: string;
      description?: string;
      linkType?: string;
      createdByUserId?: string | null;
      displayName?: string | null;
    },
  ) {
    try {
      await this.ensureKnowledgeCommunityLinksTable();
      const raw = typeof body?.url === "string" ? body.url.trim() : "";
      if (!raw || raw.length > 2048) {
        return {
          success: false,
          error: "url is required (max 2048 characters)",
        };
      }
      let normalized = raw;
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
      }
      try {
        // eslint-disable-next-line no-new
        new URL(normalized);
      } catch {
        return { success: false, error: "invalid url" };
      }
      const description =
        typeof body.description === "string"
          ? body.description.trim().slice(0, 500)
          : "";
      const linkType =
        body.linkType === "organization" ? "organization" : "group";
      const displayName =
        typeof body.displayName === "string"
          ? body.displayName.trim().slice(0, 120)
          : null;
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const createdByUserId =
        typeof body.createdByUserId === "string" &&
        uuidRe.test(body.createdByUserId)
          ? body.createdByUserId
          : null;

      const { rows } = await this.pool.query(
        `INSERT INTO knowledge_community_links (url, description, link_type, created_by_user_id, created_by_display)
         VALUES ($1, $2, $3, $4::uuid, $5)
         RETURNING id, url, description,
           link_type AS "linkType",
           created_at AS "createdAt",
           created_by_user_id AS "createdByUserId",
           created_by_display AS "createdByDisplay"`,
        [
          normalized,
          description || null,
          linkType,
          createdByUserId,
          displayName,
        ],
      );
      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("createKnowledgeCommunityLink", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save knowledge link",
      };
    }
  }

  /** Admin: delete a knowledge link. */
  @Delete("knowledge/links/:id")
  @UseGuards(JwtAuthGuard)
  async deleteKnowledgeCommunityLink(
    @Param("id") id: string,
    @Req() req: Request & { user?: SessionTokenPayload },
  ) {
    try {
      const roles = req.user?.roles || [];
      const isAdmin =
        roles.includes("admin") ||
        roles.includes("super_admin") ||
        roles.includes("org_admin");
      if (!isAdmin) {
        return { success: false, error: "Admin access required" };
      }
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(id)) {
        return { success: false, error: "Invalid id" };
      }
      await this.ensureKnowledgeCommunityLinksTable();
      const { rowCount } = await this.pool.query(
        `DELETE FROM knowledge_community_links WHERE id = $1::uuid`,
        [id],
      );
      if (!rowCount) {
        return { success: false, error: "Link not found" };
      }
      return { success: true, message: "deleted" };
    } catch (error) {
      this.logger.error("deleteKnowledgeCommunityLink", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete knowledge link",
      };
    }
  }

  /**
   * Authenticated user: create internal task for root admin (Knowledge offer flow).
   * Lives under donations API so routing is stable (see SRS §2.3.3).
   */
  @Post("knowledge/contribution-request")
  @UseGuards(JwtAuthGuard)
  async createKnowledgeContributionRequest(
    @Body() body: { message?: string },
    @Req() req: Request & { user?: SessionTokenPayload },
  ) {
    try {
      await this.ensureTasksTableMinimal();
      const sessionUser = req.user;
      if (!sessionUser?.userId) {
        return { success: false, error: "Authentication required" };
      }

      const rawMessage =
        typeof body?.message === "string" ? body.message.trim() : "";
      if (rawMessage.length > 4000) {
        return {
          success: false,
          error: "Message too long (max 4000 characters)",
        };
      }

      const superAdminId = await this.getRootAdminUserId();
      if (!superAdminId) {
        this.logger.warn(
          "knowledge/contribution-request: ROOT_ADMIN_EMAIL not configured",
        );
        return {
          success: false,
          error:
            "Server is not configured to receive knowledge requests (missing ROOT_ADMIN_EMAIL)",
        };
      }

      const { rows: profileRows } = await this.pool.query(
        `SELECT id, name, email FROM user_profiles WHERE id = $1::uuid LIMIT 1`,
        [sessionUser.userId],
      );
      const profile = profileRows[0] as
        | { id: string; name: string | null; email: string | null }
        | undefined;
      if (!profile) {
        return { success: false, error: "User profile not found" };
      }

      const requesterLabel =
        profile.name?.trim() || profile.email?.trim() || "משתמש/ת";
      const title = `בקשה לתרומת מידע — ${requesterLabel}`.slice(0, 255);
      const descriptionLines = [
        "משימה שנפתחה ממסך תרומות › ידע (מצב מציע). יש ליצור קשר עם המבקש/ת לתיאום תרומת הידע.",
        "",
        "—— פרטי המבקש/ת ——",
        `מזהה משתמש (UUID): ${profile.id}`,
        `שם: ${profile.name || "—"}`,
        `אימייל: ${profile.email || "—"}`,
        "",
        "—— תוכן / פרטי המידע שהוזנו ——",
        rawMessage.length > 0 ? rawMessage : "(לא הוזן טקסט נוסף בטופס)",
        "",
        "הערה: בעתיד ניתן יהיה לצרף קובץ/סרטון/טקסט ישירות מהאפליקציה.",
      ];
      const description = descriptionLines.join("\n");

      const due = new Date();
      due.setDate(due.getDate() + 14);

      const sql = `
        INSERT INTO tasks (title, description, status, priority, category, due_date, assignees, tags, checklist, created_by, parent_task_id, estimated_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7::UUID[], $8::TEXT[], $9::JSONB, $10::UUID, $11::UUID, $12::NUMERIC)
        RETURNING id, title, description, status, priority, category, due_date, assignees, tags, checklist, created_by, parent_task_id, estimated_hours, created_at, updated_at
      `;
      const assigneeUUIDs = [superAdminId];
      const params = [
        title.trim(),
        description,
        "open",
        "medium",
        "knowledge_offer",
        due.toISOString(),
        assigneeUUIDs,
        ["donations", "knowledge", "volunteer_intent"],
        null,
        profile.id,
        null,
        null,
      ];

      const { rows } = await this.pool.query(sql, params);
      const newTask = rows[0];

      const timestamp = new Date().toISOString();
      try {
        await this.itemsService.create(
          "notifications",
          superAdminId,
          randomUUID(),
          {
            title: "משימה חדשה",
            body: `הוקצתה לך משימה חדשה: ${newTask.title}`,
            type: "system",
            timestamp,
            read: false,
            userId: superAdminId,
            data: { taskId: newTask.id },
          },
        );
      } catch (notifyErr) {
        this.logger.warn(
          "knowledge/contribution-request: notification skipped",
          notifyErr,
        );
      }

      return { success: true, data: newTask };
    } catch (error) {
      this.logger.error("knowledge/contribution-request failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create knowledge contribution request",
      };
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createDonation(@Body() donationData: CreateDonationDto) {
    // TODO: Replace 'any' with proper CreateDonationDTO interface
    // TODO: Add comprehensive input validation and sanitization
    // TODO: Add proper authentication and authorization checks
    // TODO: Implement rate limiting for donation creation
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
    const cacheKey = `donations_${type || "all"}_${category || "all"}_${city || "all"}_${status || "active"}_${limit || "50"}_${offset || "0"}_${search || ""}`;

    // Try cache first
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    let query = `
      SELECT d.*, dc.name_he as category_name, dc.icon as category_icon,
             up.name as donor_name, up.city as donor_city, up.avatar_url as donor_avatar
      FROM donations d
      LEFT JOIN donation_categories dc ON d.category_id = dc.id
      LEFT JOIN user_profiles up ON d.donor_id = up.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      query += ` AND d.type = $${paramCount}`;
      params.push(type);
    }

    if (category) {
      paramCount++;
      query += ` AND dc.slug = $${paramCount}`;
      params.push(category);
    }

    if (city) {
      paramCount++;
      query += ` AND (d.location->>'city' = $${paramCount} OR up.city = $${paramCount})`;
      params.push(city);
    }

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    } else {
      query += ` AND d.status = 'active'`;
    }

    if (search) {
      paramCount++;
      query += ` AND (d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
    } else {
      query += ` LIMIT 50`;
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const { rows } = await this.pool.query(query, params);

    // Cache for 5 minutes
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
    const statType =
      type === "money"
        ? "money_donations"
        : type === "time"
          ? "volunteer_hours"
          : type === "trump"
            ? "rides_completed"
            : "other_donations";

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
