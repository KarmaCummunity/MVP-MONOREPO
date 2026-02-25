// File overview:
// - Purpose: CRUD עבור ניהול אנשים בקהילה - רשומות של אנשים והתפקיד/התרומה שלהם
// - Routes: /api/community-members (GET, POST), /api/community-members/:id (GET, PATCH, DELETE)
// - Storage: PostgreSQL טבלת community_members (schema.sql)
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Logger,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";

type MemberStatus = "active" | "inactive";

interface CreateMemberDto {
  name: string;
  role: string; // התפקיד/התרומה שלו לקהילה
  description?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  status?: MemberStatus;
  created_by?: string;
}

interface UpdateMemberDto {
  name?: string;
  role?: string;
  description?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  status?: MemberStatus;
}

@Controller("/api/community-members")
export class CommunityMembersController {
  private readonly logger = new Logger(CommunityMembersController.name);
  private readonly CACHE_TTL = 10 * 60; // 10 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  /**
   * Resolve any user identifier (email, firebase_uid, UUID string) to UUID
   * This ensures all user IDs are converted to UUID format before use
   * NOTE: We only use our own UUID (user_profiles.id) for user identification
   */
  private async resolveUserIdToUUID(userId: string): Promise<string | null> {
    if (!userId) {
      return null;
    }

    // Check if it's already a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userId)) {
      // Verify it exists in user_profiles
      const result = await this.pool.query(
        `SELECT id FROM user_profiles WHERE id = $1::uuid LIMIT 1`,
        [userId],
      );
      if (result.rows.length > 0) {
        return userId;
      }
    }

    // Try to find user by email or firebase_uid ONLY
    const result = await this.pool.query(
      `SELECT id FROM user_profiles 
       WHERE LOWER(email) = LOWER($1) 
          OR firebase_uid = $1 
          OR id::text = $1
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    return null;
  }

  /**
   * Ensure community_members table exists, create it if missing
   */
  private async ensureTable() {
    try {
      const checkTable = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'community_members'
        );
      `);

      const tableExists = checkTable.rows[0].exists;

      if (!tableExists) {
        this.logger.log("📋 Creating community_members table...");

        // Create extension if needed
        try {
          await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        } catch (extError) {
          this.logger.warn(
            "⚠️ Could not create uuid-ossp extension:",
            extError,
          );
        }

        // Create the table
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS community_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL,
            description TEXT,
            contact_info JSONB,
            status VARCHAR(20) DEFAULT 'active',
            created_by UUID, -- REFERENCES user_profiles(id), -- UUID to match user_profiles.id type
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);

        // Create indexes
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_community_members_name ON community_members (name)",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members (role)",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members (status)",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_community_members_created_at ON community_members (created_at DESC)",
        );

        // Create trigger function if it doesn't exist
        await this.pool.query(`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ language 'plpgsql'
        `);

        // Create trigger
        await this.pool.query(
          "DROP TRIGGER IF EXISTS update_community_members_updated_at ON community_members",
        );
        await this.pool.query(`
          CREATE TRIGGER update_community_members_updated_at 
          BEFORE UPDATE ON community_members 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
        `);

        this.logger.log("✅ community_members table created successfully");
      }
    } catch (error) {
      this.logger.error("❌ Error ensuring community_members table:", error);
      // Don't throw - let the query fail naturally if table doesn't exist
    }
  }

  @Get()
  async getAllMembers(
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    await this.ensureTable();

    const cacheKey = `community_members_list_${status || "all"}_${search || ""}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    try {
      let query = `
        SELECT 
          id,
          name,
          role,
          description,
          contact_info,
          status,
          created_by,
          created_at,
          updated_at
        FROM community_members
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR role ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const { rows } = await this.pool.query(query, params);

      await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching community members:", error);
      return {
        success: false,
        error: "Failed to fetch community members",
        data: [],
      };
    }
  }

  @Get(":id")
  async getMemberById(@Param("id") id: string) {
    await this.ensureTable();

    const cacheKey = `community_member_${id}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const { rows } = await this.pool.query(
        `SELECT 
          id,
          name,
          role,
          description,
          contact_info,
          status,
          created_by,
          created_at,
          updated_at
        FROM community_members 
        WHERE id = $1`,
        [id],
      );

      if (rows.length === 0) {
        return {
          success: false,
          error: "Member not found",
        };
      }

      await this.redisCache.set(cacheKey, rows[0], this.CACHE_TTL);

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error fetching community member:", error);
      return {
        success: false,
        error: "Failed to fetch community member",
      };
    }
  }

  @Post()
  async createMember(@Body() dto: CreateMemberDto) {
    await this.ensureTable();

    try {
      // Validate required fields
      if (!dto.name || !dto.role) {
        return {
          success: false,
          error: "Name and role are required",
        };
      }

      // Resolve created_by to UUID if provided
      let createdByUuid: string | null = null;
      if (dto.created_by) {
        createdByUuid = await this.resolveUserIdToUUID(dto.created_by);
        if (!createdByUuid) {
          this.logger.warn(
            `⚠️ Could not resolve created_by user: ${dto.created_by}`,
          );
        }
      }

      const { rows } = await this.pool.query(
        `INSERT INTO community_members (name, role, description, contact_info, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6::UUID)
         RETURNING 
           id,
           name,
           role,
           description,
           contact_info,
           status,
           created_by,
           created_at,
           updated_at`,
        [
          dto.name,
          dto.role,
          dto.description || null,
          dto.contact_info ? JSON.stringify(dto.contact_info) : null,
          dto.status || "active",
          createdByUuid,
        ],
      );

      // Invalidate cache
      await this.redisCache.invalidatePattern("community_members_list_*");

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error creating community member:", error);
      return {
        success: false,
        error: "Failed to create community member",
      };
    }
  }

  @Patch(":id")
  async updateMember(@Param("id") id: string, @Body() dto: UpdateMemberDto) {
    await this.ensureTable();

    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (dto.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(dto.name);
        paramIndex++;
      }

      if (dto.role !== undefined) {
        updates.push(`role = $${paramIndex}`);
        params.push(dto.role);
        paramIndex++;
      }

      if (dto.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        params.push(dto.description);
        paramIndex++;
      }

      if (dto.contact_info !== undefined) {
        updates.push(`contact_info = $${paramIndex}`);
        params.push(JSON.stringify(dto.contact_info));
        paramIndex++;
      }

      if (dto.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(dto.status);
        paramIndex++;
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: "No fields to update",
        };
      }

      params.push(id);
      const { rows } = await this.pool.query(
        `UPDATE community_members 
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING 
           id,
           name,
           role,
           description,
           contact_info,
           status,
           created_by,
           created_at,
           updated_at`,
        params,
      );

      if (rows.length === 0) {
        return {
          success: false,
          error: "Member not found",
        };
      }

      // Invalidate cache
      await this.redisCache.delete(`community_member_${id}`);
      await this.redisCache.invalidatePattern("community_members_list_*");

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error updating community member:", error);
      return {
        success: false,
        error: "Failed to update community member",
      };
    }
  }

  @Delete(":id")
  async deleteMember(@Param("id") id: string) {
    await this.ensureTable();

    try {
      const { rows } = await this.pool.query(
        `DELETE FROM community_members 
         WHERE id = $1
         RETURNING id`,
        [id],
      );

      if (rows.length === 0) {
        return {
          success: false,
          error: "Member not found",
        };
      }

      // Invalidate cache
      await this.redisCache.delete(`community_member_${id}`);
      await this.redisCache.invalidatePattern("community_members_list_*");

      return { success: true, message: "Member deleted successfully" };
    } catch (error) {
      this.logger.error("Error deleting community member:", error);
      return {
        success: false,
        error: "Failed to delete community member",
      };
    }
  }
}
