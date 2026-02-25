// File overview:
// - Purpose: Generic JSONB CRUD over multiple logical collections (users, posts, donations, rides, etc.) with Redis caching and activity tracking.
// - Reached from: `ItemsController` endpoints under '/api'.
// - Provides: create/read/update/delete/list with safe collection mapping; activity counters and cache stats via Redis.
// - Storage: Postgres tables named after collections with (user_id, item_id, data JSONB) + indexes.
// - Cache keys: item:{collection}:{userId}:{itemId}, list:{collection}:{userId}, activity:{userId}, daily_activity:{userId}:{YYYY-MM-DD}, popular_collections:*.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { PG_POOL } from "../../database/database.module";
import { Pool } from "pg";
import { RedisCacheService } from "../../redis/redis-cache.service";
import type { UserActivity } from "./user-activity";
import pgFormat from "pg-format";

/** Allowlist of collection names; used for validation to prevent SQL injection. */
export const ALLOWED_COLLECTIONS = new Set([
  "users",
  "posts",
  "followers",
  "following",
  "chats",
  "messages",
  "notifications",
  "bookmarks",
  "donations",
  "items",
  "tasks",
  "settings",
  "media",
  "blocked_users",
  "message_reactions",
  "typing_status",
  "read_receipts",
  "voice_messages",
  "conversation_metadata",
  "rides",
  "organizations",
  "org_applications",
  "links",
  "analytics",
  "stats",
  "community_stats",
  "challenges",
  "deleted_challenges",
  "challenge_reset_logs",
  "challenge_record_breaks",
  "challenge_global_stats",
]);

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);
  private readonly CACHE_TTL = 5 * 60; // 5 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  private tableFor(collection: string): string {
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      throw new Error(`Unknown collection: ${collection}`);
    }
    // deepcode ignore SQL: validated against whitelist above
    return collection;
  }

  async create(
    collection: string,
    userId: string,
    itemId: string,
    data: Record<string, unknown>,
  ) {
    const table = this.tableFor(collection);
    const client = await this.pool.connect();
    try {
      // Add activity tracking (safely)
      try {
        await this.trackUserActivity(userId, "create", collection, itemId);
      } catch (err) {
        this.logger.warn("⚠️ Failed to track user activity (non-fatal):", err);
      }

      const query = pgFormat(
        `INSERT INTO %I (user_id, item_id, data, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_id, item_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        table,
      );
      await client.query(query, [userId, itemId, data]);

      // Cache the created item (safely)
      try {
        const cacheKey = `item:${collection}:${userId}:${itemId}`;
        await this.redisCache.set(cacheKey, data, this.CACHE_TTL);
      } catch (err) {
        this.logger.warn("⚠️ Failed to cache created item (non-fatal):", err);
      }

      // Invalidate list cache for this user and collection (safely)
      try {
        await this.invalidateListCache(collection, userId);
      } catch (err) {
        this.logger.warn(
          "⚠️ Failed to invalidate list cache (non-fatal):",
          err,
        );
      }

      // Track popular collections (safely)
      try {
        await this.incrementCollectionCounter(collection);
      } catch (err) {
        this.logger.warn(
          "⚠️ Failed to increment collection counter (non-fatal):",
          err,
        );
      }

      return { ok: true };
    } finally {
      client.release();
    }
  }

  async read(collection: string, userId: string, itemId: string) {
    // Try cache first
    const cacheKey = `item:${collection}:${userId}:${itemId}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      // Track cache hit
      await this.trackUserActivity(userId, "read_cached", collection, itemId);
      return cached;
    }

    // Cache miss - get from database
    const table = this.tableFor(collection);
    const query = pgFormat(
      `SELECT data FROM %I WHERE user_id = $1 AND item_id = $2 LIMIT 1`,
      table,
    );
    const { rows } = await this.pool.query(query, [userId, itemId]);

    const data = rows.length > 0 ? rows[0].data : null;

    if (data) {
      // Cache the result
      await this.redisCache.set(cacheKey, data, this.CACHE_TTL);
      // Track cache miss
      await this.trackUserActivity(userId, "read_db", collection, itemId);
    }

    return data;
  }

  async update(
    collection: string,
    userId: string,
    itemId: string,
    data: Record<string, unknown>,
  ) {
    const table = this.tableFor(collection);
    const query = pgFormat(
      `UPDATE %I SET data = jsonb_strip_nulls(data || $1::jsonb), updated_at = NOW()
       WHERE user_id = $2 AND item_id = $3`,
      table,
    );
    const { rowCount } = await this.pool.query(query, [data, userId, itemId]);
    return { ok: (rowCount ?? 0) > 0 };
  }

  async delete(collection: string, userId: string, itemId: string) {
    const table = this.tableFor(collection);
    this.logger.log(
      `🗑️  DELETE Request - table: ${table}, userId: ${userId}, itemId: ${itemId}`,
    );

    // First check if item exists
    const checkQuery = pgFormat(
      `SELECT * FROM %I WHERE user_id = $1 AND item_id = $2`,
      table,
    );
    const checkResult = await this.pool.query(checkQuery, [userId, itemId]);
    this.logger.log(`🔍 Item exists check: ${checkResult.rowCount} rows found`);

    const deleteQuery = pgFormat(
      `DELETE FROM %I WHERE user_id = $1 AND item_id = $2`,
      table,
    );
    const { rowCount } = await this.pool.query(deleteQuery, [userId, itemId]);
    this.logger.log(`✅ DELETE result: ${rowCount} rows deleted`);

    // Invalidate cache
    await this.invalidateListCache(collection, userId);
    const cacheKey = `item:${collection}:${userId}:${itemId}`;
    await this.redisCache.delete(cacheKey);

    return { ok: (rowCount ?? 0) > 0, deleted: rowCount };
  }

  async list(collection: string, userId: string, q?: string) {
    const table = this.tableFor(collection);
    if (q) {
      const query = pgFormat(
        `SELECT data FROM %I
         WHERE user_id = $1 AND (data::text ILIKE $2)
         ORDER BY COALESCE((data->>'timestamp')::timestamptz, NOW()) DESC`,
        table,
      );
      const { rows } = await this.pool.query(query, [userId, `%${q}%`]);
      return rows.map((r: { data: Record<string, unknown> }) => r.data);
    }
    const query = pgFormat(
      `SELECT data FROM %I
       WHERE user_id = $1
       ORDER BY COALESCE((data->>'timestamp')::timestamptz, NOW()) DESC`,
      table,
    );
    const { rows } = await this.pool.query(query, [userId]);
    return rows.map((r: { data: Record<string, unknown> }) => r.data);
  }

  // List all items from all users (for public collections like links)
  async listAll(collection: string, q?: string) {
    const table = this.tableFor(collection);
    this.logger.log(
      `🔍 ItemsService - listAll for ${collection}, table: ${table}, q: ${q || "none"}`,
    );

    if (q) {
      const query = pgFormat(
        `SELECT data FROM %I
         WHERE (data::text ILIKE $1)
         ORDER BY COALESCE((data->>'createdAt')::timestamptz, (data->>'timestamp')::timestamptz, NOW()) DESC`,
        table,
      );
      const { rows } = await this.pool.query(query, [`%${q}%`]);
      this.logger.log(
        `📊 ItemsService - listAll with query found ${rows.length} items`,
      );
      return rows.map((r: { data: Record<string, unknown> }) => r.data);
    }
    const query = pgFormat(
      `SELECT data FROM %I
       ORDER BY COALESCE((data->>'createdAt')::timestamptz, (data->>'timestamp')::timestamptz, NOW()) DESC`,
      table,
    );
    const { rows } = await this.pool.query(query);
    this.logger.log(`📊 ItemsService - listAll found ${rows.length} items`);
    if (rows.length > 0) {
      this.logger.log(
        `📊 ItemsService - First item sample:`,
        JSON.stringify(rows[0].data, null, 2),
      );
    } else {
      this.logger.log(
        `⚠️ ItemsService - listAll: No rows found for table ${table}`,
      );
      // Debug: Check if table exists and has data
      const countQuery = pgFormat(`SELECT COUNT(*) as count FROM %I`, table);
      const countResult = await this.pool.query(countQuery);
      this.logger.log(
        `📊 ItemsService - Table ${table} has ${countResult.rows[0]?.count || 0} total rows`,
      );
    }
    const result = rows.map((r: { data: Record<string, unknown> }) => r.data);
    this.logger.log(
      `📤 ItemsService - listAll returning ${result.length} items`,
    );
    return result;
  }

  // Redis Helper Functions

  private async trackUserActivity(
    userId: string,
    action: string,
    collection: string,
    itemId: string,
  ) {
    const activityKey = `activity:${userId}`;
    const activity = {
      action,
      collection,
      itemId,
      timestamp: new Date().toISOString(),
    };

    // Get recent activities (max 50)
    const recentActivities =
      (await this.redisCache.get<UserActivity[]>(activityKey)) || [];
    recentActivities.unshift(activity);

    // Keep only last 50 activities
    if (recentActivities.length > 50) {
      recentActivities.splice(50);
    }

    // Store with 1 hour TTL
    await this.redisCache.set(activityKey, recentActivities, 60 * 60);

    // Also increment daily activity counter
    const today = new Date().toISOString().split("T")[0];
    const dailyKey = `daily_activity:${userId}:${today}`;
    await this.redisCache.increment(dailyKey);
  }

  private async invalidateListCache(collection: string, userId: string) {
    const listCacheKey = `list:${collection}:${userId}`;
    await this.redisCache.delete(listCacheKey);
  }

  private async incrementCollectionCounter(collection: string) {
    const counterKey = `popular_collections:${collection}`;
    await this.redisCache.increment(counterKey);
  }

  // Public methods for Redis data access

  async getUserActivity(userId: string) {
    const activityKey = `activity:${userId}`;
    const activities =
      (await this.redisCache.get<UserActivity[]>(activityKey)) || [];

    const today = new Date().toISOString().split("T")[0];
    const dailyKey = `daily_activity:${userId}:${today}`;
    const dailyCount = (await this.redisCache.get<number>(dailyKey)) || 0;

    return {
      recentActivities: activities.slice(0, 10), // Last 10 activities
      totalActivities: activities.length,
      todayActivities: dailyCount,
      lastActivity: activities[0]?.timestamp || null,
    };
  }

  async getPopularCollections() {
    const keys = await this.redisCache.getKeys("popular_collections:*");
    const collections = [];

    for (const key of keys) {
      const collection = key.replace("popular_collections:", "");
      const count = (await this.redisCache.get<number>(key)) || 0;
      collections.push({ collection, count });
    }

    return collections.sort((a, b) => b.count - a.count);
  }

  async getCacheStats() {
    const itemKeys = await this.redisCache.getKeys("item:*");
    const listKeys = await this.redisCache.getKeys("list:*");
    const activityKeys = await this.redisCache.getKeys("activity:*");

    return {
      cachedItems: itemKeys.length,
      cachedLists: listKeys.length,
      userActivities: activityKeys.length,
      totalCacheEntries:
        itemKeys.length + listKeys.length + activityKeys.length,
    };
  }
}
