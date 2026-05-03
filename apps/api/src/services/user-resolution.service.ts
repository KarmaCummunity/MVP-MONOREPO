import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";

/**
 * UserResolutionService
 *
 * Unified service for resolving user identifiers to UUIDs.
 * Replaces 3 different implementations across the codebase:
 * - chat.controller.ts resolveUserId (throws on not found, has caching)
 * - tasks.controller.ts resolveUserIdToUUID (returns null on not found)
 * - users.controller.ts resolveUserId endpoint (creates user - REMOVED!)
 *
 * This service provides:
 * - Consistent behavior across all controllers
 * - Centralized caching
 * - Support for multiple identifier types (UUID, email, firebase_uid, google_id)
 * - Configurable error handling
 */
@Injectable()
export class UserResolutionService {
  private readonly CACHE_TTL = 10 * 60; // 10 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  /**
   * Resolve user identifier to UUID
   *
   * @param identifier - Can be UUID, email, firebase_uid, or google_id
   * @param options - Resolution options
   * @returns User UUID or null (if throwOnNotFound is false)
   * @throws NotFoundException if user not found and throwOnNotFound is true
   */
  async resolveUserId(
    identifier: string,
    options: {
      throwOnNotFound?: boolean;
      cacheResult?: boolean;
      logError?: boolean;
    } = {},
  ): Promise<string | null> {
    // Default options
    const {
      throwOnNotFound = true,
      cacheResult = true,
      logError = true,
    } = options;

    if (!identifier) {
      if (throwOnNotFound) {
        throw new NotFoundException("User identifier is required");
      }
      return null;
    }

    // Normalize identifier (lowercase for emails)
    const normalizedId = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : identifier.trim();

    // Check if already a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Check cache first
    if (cacheResult) {
      const cacheKey = `user_id_resolve_${normalizedId}`;
      const cached = await this.redisCache.get<string>(cacheKey);
      if (cached && uuidRegex.test(cached)) {
        return cached;
      }
    }

    try {
      // Query database - support UUID, email, firebase_uid ONLY
      // We do NOT use google_id - only our own UUID (user_profiles.id)
      const { rows } = await this.pool.query(
        `
        SELECT id FROM user_profiles
        WHERE id::text = $1
           OR LOWER(email) = LOWER($1)
           OR firebase_uid = $1
        LIMIT 1
      `,
        [normalizedId],
      );

      if (rows.length === 0) {
        if (throwOnNotFound) {
          if (logError) {
            console.warn(
              `User not found for identifier: ${normalizedId.substring(0, 10)}...`,
            );
          }
          throw new NotFoundException(`User not found: ${normalizedId}`);
        }
        return null;
      }

      const uuid = rows[0].id;

      // Cache the result
      if (cacheResult) {
        const cacheKey = `user_id_resolve_${normalizedId}`;
        await this.redisCache.set(cacheKey, uuid, this.CACHE_TTL);
      }

      return uuid;
    } catch (err) {
      const error = err as Error;
      // If it's a NotFoundException we threw, re-throw it
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle database errors
      if (logError) {
        console.error("UserResolutionService - Database error:", error);
      }

      if (throwOnNotFound) {
        throw new NotFoundException(`Failed to resolve user: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Resolve multiple user identifiers to UUIDs in a single operation
   * More efficient than calling resolveUserId multiple times
   *
   * @param identifiers - Array of user identifiers
   * @param options - Resolution options
   * @returns Array of UUIDs in the same order as input (null for not found if throwOnNotFound is false)
   */
  async resolveUserIds(
    identifiers: string[],
    options: {
      throwOnNotFound?: boolean;
      cacheResult?: boolean;
    } = {},
  ): Promise<(string | null)[]> {
    return Promise.all(
      identifiers.map((id) => this.resolveUserId(id, options)),
    );
  }

  /**
   * Link external IDs (firebase_uid) to an existing user
   * Should only be called from authenticated endpoints
   *
   * NOTE: We only link firebase_uid. We do NOT use google_id.
   *
   * @param userId - UUID of the user to update
   * @param externalIds - External IDs to link
   */
  async linkExternalIds(
    userId: string,
    externalIds: {
      firebase_uid?: string;
    },
  ): Promise<void> {
    const updates: string[] = [];
    const values: string[] = [];
    let paramCount = 1;

    if (externalIds.firebase_uid) {
      updates.push(`firebase_uid = $${paramCount++}`);
      values.push(externalIds.firebase_uid);
    }

    if (updates.length === 0) {
      return; // Nothing to update
    }

    values.push(userId);

    try {
      await this.pool.query(
        `
        UPDATE user_profiles
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${paramCount}
      `,
        values,
      );

      // Clear cache for this user
      await this.redisCache.delete(`user_profile_${userId}`);
      if (externalIds.firebase_uid) {
        await this.redisCache.delete(
          `user_id_resolve_${externalIds.firebase_uid}`,
        );
      }
    } catch (error) {
      console.error(
        "UserResolutionService - Failed to link external IDs:",
        error,
      );
      throw error;
    }
  }

  /**
   * Check if a given string is a valid UUID format
   */
  isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
