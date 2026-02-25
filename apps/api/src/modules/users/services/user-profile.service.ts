import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import * as argon2 from "argon2";

export type UserSettings = {
  language?: string;
  dark_mode?: boolean;
  darkMode?: boolean;
  notifications_enabled?: boolean;
  notificationsEnabled?: boolean;
  privacy?: string;
  [key: string]: unknown;
};

export type UpdateUserBody = {
  password?: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  settings?: UserSettings;
  firebase_uid?: string;
  roles?: string[];
  parent_manager_id?: string;
  hierarchy_level?: number | null;
};

type UserProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  [key: string]: unknown;
};

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);
  private readonly CACHE_TTL = 15 * 60; // 15 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly configService: ConfigService,
  ) {}

  private getRootAdminEmail(): string {
    return (this.configService.get<string>("ROOT_ADMIN_EMAIL") || "")
      .toLowerCase()
      .trim();
  }

  async searchUsers(query: string): Promise<{
    success: boolean;
    error?: string;
    data?: unknown;
  }> {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    try {
      const { rows } = await this.pool.query(
        `
        SELECT id, name, email, avatar_url, roles
        FROM user_profiles
        WHERE (name ILIKE $1 OR email ILIKE $1)
        AND is_active = true
        LIMIT 20
      `,
        [`%${query}%`],
      );

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Search users error:", error);
      return { success: false, error: "Failed to search users" };
    }
  }

  async getUserById(id: string): Promise<{
    success: boolean;
    error?: string;
    data?: unknown;
    details?: string;
  }> {
    try {
      this.logger.log(`[UserProfileService] getUserById called with id: ${id}`);

      const normalizedId = id.includes("@")
        ? String(id).trim().toLowerCase()
        : id;

      this.logger.log(`[UserProfileService] Normalized id: ${normalizedId}`);

      const cacheKey = `user_profile_${normalizedId}`;

      let cached = null;
      try {
        cached = await this.redisCache.get(cacheKey);
        if (cached) {
          this.logger.log(`[UserProfileService] Cache hit for ${normalizedId}`);
          return { success: true, data: cached };
        }
        this.logger.log(`[UserProfileService] Cache miss for ${normalizedId}`);
      } catch (cacheError) {
        this.logger.warn(
          `[UserProfileService] Redis cache error (non-fatal):`,
          cacheError,
        );
      }

      this.logger.log(
        `[UserProfileService] Querying database for ${normalizedId}`,
      );

      let rows: UserProfileRow[] = [];
      try {
        const result = await this.pool.query(
          `
          SELECT 
            id,
            email,
            COALESCE(name, 'ללא שם') as name,
            phone,
            COALESCE(avatar_url, '') as avatar_url,
            COALESCE(bio, '') as bio,
            CASE 
              WHEN email = 'karmacommunity2.0@gmail.com' THEN NULL
              ELSE parent_manager_id
            END as parent_manager_id,
            COALESCE(karma_points, 0) as karma_points,
            COALESCE(join_date, created_at) as join_date,
            COALESCE(is_active, true) as is_active,
            COALESCE(last_active, updated_at) as last_active,
            COALESCE(city, '') as city,
            COALESCE(country, 'Israel') as country,
            COALESCE(interests, ARRAY[]::TEXT[]) as interests,
            COALESCE(roles, ARRAY['user']::TEXT[]) as roles,
            COALESCE(posts_count, 0) as posts_count,
            COALESCE(followers_count, 0) as followers_count,
            COALESCE(following_count, 0) as following_count,
            0 as total_donations_amount,
            0 as total_volunteer_hours,
            COALESCE(email_verified, false) as email_verified,
            COALESCE(settings, '{}'::jsonb) as settings
          FROM user_profiles 
          WHERE id::text = $1 
             OR LOWER(email) = LOWER($1)
             OR firebase_uid = $1
             OR google_id = $1
          LIMIT 1
        `,
          [normalizedId],
        );
        rows = result.rows as UserProfileRow[];
        this.logger.log(
          `[UserProfileService] Database query returned ${rows.length} rows`,
        );
      } catch (err) {
        const error = err as Error;
        if (error.message && error.message.includes("google_id")) {
          this.logger.log(
            `[UserProfileService] Retrying query without google_id column`,
          );
          const result = await this.pool.query(
            `
            SELECT 
              id,
              email,
              COALESCE(name, 'ללא שם') as name,
              phone,
              COALESCE(avatar_url, '') as avatar_url,
              COALESCE(bio, '') as bio,
              CASE 
                WHEN email = 'karmacommunity2.0@gmail.com' THEN NULL
                ELSE parent_manager_id
              END as parent_manager_id,
              COALESCE(karma_points, 0) as karma_points,
              COALESCE(join_date, created_at) as join_date,
              COALESCE(is_active, true) as is_active,
              COALESCE(last_active, updated_at) as last_active,
              COALESCE(city, '') as city,
              COALESCE(country, 'Israel') as country,
              COALESCE(interests, ARRAY[]::TEXT[]) as interests,
              COALESCE(roles, ARRAY['user']::TEXT[]) as roles,
              COALESCE(posts_count, 0) as posts_count,
              COALESCE(followers_count, 0) as followers_count,
              COALESCE(following_count, 0) as following_count,
              0 as total_donations_amount,
              0 as total_volunteer_hours,
              COALESCE(email_verified, false) as email_verified,
              COALESCE(settings, '{}'::jsonb) as settings
            FROM user_profiles 
            WHERE id::text = $1 
               OR LOWER(email) = LOWER($1)
               OR firebase_uid = $1
            LIMIT 1
          `,
            [normalizedId],
          );
          rows = result.rows as UserProfileRow[];
          this.logger.log(
            `[UserProfileService] Retry query returned ${rows.length} rows`,
          );
        } else {
          throw error;
        }
      }

      if (rows.length === 0) {
        this.logger.log(
          `[UserProfileService] User not found for ${normalizedId}`,
        );
        return { success: false, error: "User not found" };
      }

      const user = rows[0];
      this.logger.log(
        `[UserProfileService] User found: ${user.email} (${user.id})`,
      );

      try {
        await this.redisCache.set(cacheKey, user, this.CACHE_TTL);
        this.logger.log(`[UserProfileService] User cached successfully`);
      } catch (cacheError) {
        this.logger.warn(
          `[UserProfileService] Failed to cache user (non-fatal):`,
          cacheError,
        );
      }

      return { success: true, data: user };
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `[UserProfileService] getUserById error for id ${id}:`,
        error,
      );
      this.logger.error(`[UserProfileService] Error stack:`, error?.stack);
      return {
        success: false,
        error: "Failed to get user",
        details: error?.message || "Unknown error",
      };
    }
  }

  private validateRootAdminProtection(
    existingUser: UserProfileRow,
    updateData: UpdateUserBody,
  ): { isBlocked: boolean; error?: string } {
    if (existingUser.email === "karmacommunity2.0@gmail.com") {
      if (
        updateData.roles !== undefined ||
        updateData.parent_manager_id !== undefined ||
        updateData.hierarchy_level !== undefined
      ) {
        this.logger.log(
          `[updateUser] ❌ BLOCKED: Attempt to modify root admin roles/hierarchy (karmacommunity2.0@gmail.com)`,
        );
        return {
          isBlocked: true,
          error:
            "לא ניתן לשנות הרשאות או היררכיה למנהל הראשי - הוא המנהל הראשי",
        };
      }
    }
    return { isBlocked: false };
  }

  private async buildUpdateFields(
    updateData: UpdateUserBody,
    existingUser: UserProfileRow,
  ): Promise<{
    fields: string[];
    values: (string | number | boolean | string[] | null)[];
  }> {
    const updateFields: string[] = [];
    const updateValues: (string | number | boolean | string[] | null)[] = [];
    let paramCount = 1;

    if (updateData.password) {
      const passwordHash = await argon2.hash(updateData.password);
      updateFields.push(`password_hash = $${paramCount++}`);
      updateValues.push(passwordHash);
    }
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(updateData.name);
    }
    if (updateData.phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      updateValues.push(updateData.phone);
    }
    if (updateData.avatar_url !== undefined) {
      updateFields.push(`avatar_url = $${paramCount++}`);
      updateValues.push(updateData.avatar_url);
    }
    if (updateData.bio !== undefined) {
      updateFields.push(`bio = $${paramCount++}`);
      updateValues.push(updateData.bio);
    }
    if (updateData.city !== undefined) {
      updateFields.push(`city = $${paramCount++}`);
      updateValues.push(updateData.city);
    }
    if (updateData.country !== undefined) {
      updateFields.push(`country = $${paramCount++}`);
      updateValues.push(updateData.country);
    }
    if (updateData.interests !== undefined) {
      updateFields.push(`interests = $${paramCount++}`);
      updateValues.push(updateData.interests);
    }
    if (updateData.settings !== undefined) {
      updateFields.push(`settings = $${paramCount++}::jsonb`);
      updateValues.push(
        JSON.stringify({
          ...(existingUser.settings || {}),
          ...updateData.settings,
        }),
      );
    }
    if (updateData.firebase_uid !== undefined) {
      updateFields.push(`firebase_uid = $${paramCount++}`);
      updateValues.push(updateData.firebase_uid);
    }
    if (updateData.roles !== undefined) {
      const rootAdminEmail = this.getRootAdminEmail();
      const superAdminEmails = rootAdminEmail ? [rootAdminEmail] : [];
      if (superAdminEmails.includes(existingUser.email?.toLowerCase() || "")) {
        this.logger.warn(
          `Attempted to modify roles of Super Admin (${existingUser.email}) - Ignoring role update.`,
        );
      } else {
        updateFields.push(`roles = $${paramCount++}::text[]`);
        updateValues.push(updateData.roles);
      }
    }

    updateFields.push(`last_active = NOW()`, `updated_at = NOW()`);

    return { fields: updateFields, values: updateValues };
  }

  private formatUserResponse(updatedUser: UserProfileRow) {
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      avatar_url: updatedUser.avatar_url,
      bio: updatedUser.bio || "",
      karma_points: updatedUser.karma_points || 0,
      join_date: updatedUser.join_date || updatedUser.created_at,
      is_active: updatedUser.is_active !== false,
      last_active: updatedUser.last_active,
      city: updatedUser.city || "",
      country: updatedUser.country || "Israel",
      interests: updatedUser.interests || [],
      roles: updatedUser.roles || ["user"],
      posts_count: updatedUser.posts_count || 0,
      followers_count: updatedUser.followers_count || 0,
      following_count: updatedUser.following_count || 0,
      total_donations_amount: 0,
      total_volunteer_hours: 0,
      email_verified: updatedUser.email_verified || false,
      settings: updatedUser.settings || {},
    };
  }

  async updateUser(
    id: string,
    updateData: UpdateUserBody,
  ): Promise<{ success: boolean; error?: string; data?: unknown }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: existingRows } = await client.query(
        `
        SELECT id, email, name, phone, avatar_url, bio, password_hash,
               city, country, interests, settings, roles, created_at
        FROM user_profiles 
        WHERE id::text = $1 OR LOWER(email) = LOWER($1) OR firebase_uid = $1 OR google_id = $1
        LIMIT 1
      `,
        [id],
      );

      if (existingRows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const existingUser = existingRows[0];
      const userId = existingUser.id;

      const protection = this.validateRootAdminProtection(
        existingUser,
        updateData,
      );
      if (protection.isBlocked) {
        await client.query("ROLLBACK");
        return { success: false, error: protection.error };
      }

      const { fields: updateFields, values: updateValues } =
        await this.buildUpdateFields(updateData, existingUser);
      const paramCount = updateValues.length + 1;

      if (updateFields.length > 2) {
        updateValues.push(userId);
        await client.query(
          `UPDATE user_profiles SET ${updateFields.join(", ")} WHERE id = $${paramCount}`,
          updateValues,
        );
      } else {
        await client.query(
          `UPDATE user_profiles SET last_active = NOW(), updated_at = NOW() WHERE id = $1`,
          [userId],
        );
      }

      await client.query("COMMIT");

      const { rows: updatedRows } = await client.query(
        `
        SELECT id, email, name, phone, avatar_url, bio, karma_points, join_date,
               is_active, last_active, city, country, interests, roles, 
               posts_count, followers_count, following_count, email_verified, settings, created_at
        FROM user_profiles WHERE id = $1
      `,
        [userId],
      );

      await this.redisCache.delete(`user_profile_${id}`);
      await this.redisCache.delete(`user_profile_${userId}`);
      await this.redisCache.invalidatePattern("users_list*");

      const user = this.formatUserResponse(updatedRows[0]);

      return { success: true, data: user };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Update user error:", error);
      return { success: false, error: "Failed to update user" };
    } finally {
      client.release();
    }
  }

  async getUsers(params: {
    city?: string;
    search?: string;
    limit?: string;
    offset?: string;
    forceRefresh?: string;
  }): Promise<{ success: boolean; data?: unknown }> {
    const { city, search, limit, offset, forceRefresh } = params;
    const cacheKey = `users_list_${city || "all"}_${search || ""}_${limit || "50"}_${offset || "0"}`;

    const shouldForceRefresh = forceRefresh === "true" || forceRefresh === "1";

    if (!shouldForceRefresh) {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        this.logger.log(
          `[getUsers] 📦 Returning cached data for key: ${cacheKey}`,
        );
        return { success: true, data: cached };
      }
    } else {
      this.logger.log(
        `[getUsers] 🔄 Force refresh requested, bypassing cache for key: ${cacheKey}`,
      );
    }

    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    let whereConditions = "";

    if (city) {
      paramCount++;
      whereConditions += ` AND u.city ILIKE $${paramCount}`;
      queryParams.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      whereConditions += ` AND (u.name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    let limitClause = "";
    let offsetClause = "";

    if (limit) {
      paramCount++;
      limitClause = `LIMIT $${paramCount}`;
      queryParams.push(parseInt(limit, 10));
    } else {
      limitClause = `LIMIT 50`;
    }

    if (offset) {
      paramCount++;
      offsetClause = `OFFSET $${paramCount}`;
      queryParams.push(parseInt(offset, 10));
    }

    let query: string;
    let rows: unknown[] = [];
    try {
      query = `
        SELECT 
          u.id::text as id,
          COALESCE(u.name, 'ללא שם') as name,
          COALESCE(u.avatar_url, '') as avatar_url,
          COALESCE(u.city, '') as city,
          COALESCE(u.karma_points, 0) as karma_points,
          COALESCE(u.last_active, u.updated_at) as last_active,
          COALESCE(u.total_donations_amount, 0) as total_donations_amount,
          COALESCE(u.total_volunteer_hours, 0) as total_volunteer_hours,
          COALESCE(u.join_date, u.created_at) as join_date,
          COALESCE(u.bio, '') as bio,
          COALESCE(u.roles, ARRAY['user']::text[]) as roles,
          u.email,
          u.is_active,
          u.created_at,
          CASE 
            WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL::text
            ELSE u.parent_manager_id::text
          END as parent_manager_id,
          u.hierarchy_level,
          CASE 
            WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL
            ELSE (SELECT json_build_object(
              'id', m.id::text,
              'name', COALESCE(m.name, 'ללא שם'),
              'email', m.email,
              'avatar_url', COALESCE(m.avatar_url, '')
            )::jsonb FROM user_profiles m WHERE m.id = u.parent_manager_id)
          END::jsonb as manager_details
        FROM user_profiles u
        WHERE u.email IS NOT NULL AND u.email <> ''
          ${whereConditions}
        ORDER BY u.karma_points DESC, u.last_active DESC, u.join_date DESC
        ${limitClause}
        ${offsetClause}
      `;
      const result = await this.pool.query(query, queryParams);
      rows = result.rows;
    } catch (err) {
      const error = err as Error;
      if (
        error.message &&
        (error.message.includes("hierarchy_level") ||
          error.message.includes("could not convert type jsonb"))
      ) {
        this.logger.warn("[getUsers] Using fallback query:", error.message);
        query = `
          SELECT 
            u.id::text as id,
            COALESCE(u.name, 'ללא שם') as name,
            COALESCE(u.avatar_url, '') as avatar_url,
            COALESCE(u.city, '') as city,
            COALESCE(u.karma_points, 0) as karma_points,
            COALESCE(u.last_active, u.updated_at) as last_active,
            COALESCE(u.total_donations_amount, 0) as total_donations_amount,
            COALESCE(u.total_volunteer_hours, 0) as total_volunteer_hours,
            COALESCE(u.join_date, u.created_at) as join_date,
            COALESCE(u.bio, '') as bio,
            COALESCE(u.roles, ARRAY['user']::text[]) as roles,
            u.email,
            u.is_active,
            u.created_at,
            CASE 
              WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL::text
              ELSE u.parent_manager_id::text
            END as parent_manager_id,
            NULL::INTEGER as hierarchy_level,
            CASE 
              WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL
              ELSE (SELECT json_build_object(
                'id', m.id::text,
                'name', COALESCE(m.name, 'ללא שם'),
                'email', m.email,
                'avatar_url', COALESCE(m.avatar_url, '')
              )::jsonb FROM user_profiles m WHERE m.id = u.parent_manager_id)
            END::jsonb as manager_details
          FROM user_profiles u
          WHERE u.email IS NOT NULL AND u.email <> ''
            ${whereConditions}
          ORDER BY u.karma_points DESC, u.last_active DESC, u.join_date DESC
          ${limitClause}
          ${offsetClause}
        `;
        const result = await this.pool.query(query, queryParams);
        rows = result.rows;
      } else {
        throw error;
      }
    }

    this.logger.log(
      `[UserProfileService] getUsers returned ${rows.length} users from unified table`,
    );

    await this.redisCache.set(cacheKey, rows, 20 * 60);
    return { success: true, data: rows };
  }
}
