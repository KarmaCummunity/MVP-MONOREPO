// File overview:
// - Purpose: Service for Items Delivery operations with database queries and Redis caching
// - Used by: ItemsDeliveryController
// - Provides: CRUD operations for items, search with filters, and item requests management
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import {
  CreateItemDto,
  UpdateItemDto,
  ItemFiltersDto,
  CreateItemRequestDto,
  UpdateItemRequestDto,
} from "./dto/items.dto";
import { randomBytes } from "crypto";

@Injectable()
export class ItemsDeliveryService {
  private readonly logger = new Logger(ItemsDeliveryService.name);
  private readonly CACHE_TTL = 5 * 60; // 5 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  // ==================== Items CRUD ====================

  async createItem(createItemDto: CreateItemDto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Generate ID if not provided or if provided ID is a timestamp
      // This ensures we always have a proper ID format like "item_1234567890_abc123"
      // Similar to how rides work - the backend generates the ID, not the frontend
      let itemId = (createItemDto as unknown as { id?: string }).id;
      if (!itemId || /^\d{10,13}$/.test(itemId)) {
        // If ID is missing or is a timestamp (only digits, 10-13 chars), generate a proper ID
        // S2245: Use crypto.randomBytes instead of Math.random for ID generation
        itemId = `item_${Date.now()}_${randomBytes(6).toString("hex")}`;
        this.logger.log(
          `Generated new item ID (was timestamp or missing): ${itemId}`,
        );
      } else {
        this.logger.log(`Using provided item ID: ${itemId}`);
      }

      // Verify ID format before using
      if (!itemId || itemId.length < 10) {
        throw new Error(
          "Invalid item ID format - ID must be at least 10 characters",
        );
      }

      this.logger.log(
        `Creating item with ID: ${itemId}, Type: ${typeof itemId}`,
      );

      const { rows } = await client.query(
        `
        INSERT INTO items (
          id, owner_id, title, description, category, condition, location,
          price, images, tags, quantity, delivery_method, metadata, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `,
        [
          itemId,
          createItemDto.owner_id,
          createItemDto.title,
          createItemDto.description || null,
          createItemDto.category,
          createItemDto.condition || null,
          createItemDto.location
            ? JSON.stringify(createItemDto.location)
            : null,
          createItemDto.price ?? 0,
          createItemDto.images || [],
          createItemDto.tags || [],
          createItemDto.quantity || 1,
          createItemDto.delivery_method || null,
          createItemDto.metadata
            ? JSON.stringify(createItemDto.metadata)
            : null,
          createItemDto.expires_at ? new Date(createItemDto.expires_at) : null,
        ],
      );

      const createdItem = rows[0];
      this.logger.log(`Created item - ID: ${createdItem.id}`);

      // CRITICAL: Verify the ID is correct before using it
      if (!createdItem.id || createdItem.id.length < 10) {
        this.logger.error("CRITICAL: Item ID is invalid!", createdItem);
        throw new Error(
          "Failed to create item - invalid ID returned from database",
        );
      }

      // Auto-create a corresponding post for this item
      // This allows likes/comments to work on items in the feed
      try {
        const price = createItemDto.price ?? 0;
        const postType = price > 0 ? "item" : "donation";
        const postTitle = createItemDto.title;
        const postDescription = createItemDto.description || "";

        // Ensure item_id is the full item ID, not just timestamp
        const itemIdForPost = createdItem.id;
        this.logger.log(`Creating post with item_id: ${itemIdForPost}`);

        await client.query(
          `
          INSERT INTO posts (author_id, item_id, title, description, images, post_type, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            createItemDto.owner_id,
            itemIdForPost, // Use the full item ID
            postTitle,
            postDescription,
            createItemDto.images || [],
            postType,
            JSON.stringify({
              item_id: itemIdForPost, // Store full ID in metadata too
              category: createItemDto.category,
              price: price,
              condition: createItemDto.condition,
            }),
          ],
        );

        // Verify the post was created correctly
        const { rows: verifyRows } = await client.query(
          `
          SELECT id, item_id, post_type FROM posts 
          WHERE item_id = $1 AND post_type = $2
          ORDER BY created_at DESC LIMIT 1
        `,
          [itemIdForPost, postType],
        );

        if (verifyRows.length > 0) {
          this.logger.log(
            `Verified post created with item_id: ${verifyRows[0].item_id}`,
          );
        } else {
          this.logger.error("Failed to verify post creation - post not found!");
        }

        this.logger.log(`Auto-created post for item: ${createdItem.id}`);
      } catch (postError) {
        this.logger.warn(
          `Failed to auto-create post for item (continuing): ${postError}`,
        );
        // Don't fail the item creation if post creation fails
      }

      await client.query("COMMIT");

      // Invalidate cache
      await this.invalidateItemCaches();

      return { success: true, data: createdItem };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Create item error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create item",
      };
    } finally {
      client.release();
    }
  }

  async getItemById(id: string) {
    const cacheKey = `item:${id}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT i.*, up.name as owner_name, up.avatar_url as owner_avatar, up.city as owner_city
      FROM items i
      LEFT JOIN user_profiles up ON (i.owner_id::text = up.id::text OR i.owner_id::text = up.firebase_uid)
      WHERE i.id = $1
    `,
      [id],
    );

    if (rows.length === 0) {
      return { success: false, error: "Item not found" };
    }

    await this.redisCache.set(cacheKey, rows[0], this.CACHE_TTL);
    return { success: true, data: rows[0] };
  }

  async listItems(filters: ItemFiltersDto) {
    // Build cache key from filters
    const cacheKey = `items_list:${JSON.stringify(filters)}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    // Build query
    // Note: owner_id can be either UUID (id) or Firebase UID (firebase_uid)
    let query = `
      SELECT i.*, up.name as owner_name, up.avatar_url as owner_avatar
      FROM items i
      LEFT JOIN user_profiles up ON (i.owner_id::text = up.id::text OR i.owner_id::text = up.firebase_uid)
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      params.push(filters.status);
    } else {
      query += ` AND i.status = 'available'`;
    }

    if (filters.category) {
      paramCount++;
      query += ` AND i.category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.condition) {
      paramCount++;
      query += ` AND i.condition = $${paramCount}`;
      params.push(filters.condition);
    }

    if (filters.city) {
      paramCount++;
      query += ` AND (i.location->>'city' = $${paramCount} OR up.city = $${paramCount})`;
      params.push(filters.city);
    }

    if (filters.min_price !== undefined) {
      paramCount++;
      query += ` AND i.price >= $${paramCount}`;
      params.push(filters.min_price);
    }

    if (filters.max_price !== undefined) {
      paramCount++;
      query += ` AND i.price <= $${paramCount}`;
      params.push(filters.max_price);
    }

    if (filters.owner_id) {
      paramCount++;
      query += ` AND i.owner_id::text = $${paramCount}`;
      params.push(filters.owner_id);
    }

    // Full-text search
    if (filters.search) {
      paramCount++;
      query += ` AND (
        i.title ILIKE $${paramCount} OR
        i.description ILIKE $${paramCount} OR
        EXISTS (
          SELECT 1 FROM unnest(i.tags) AS tag
          WHERE tag ILIKE $${paramCount}
        )
      )`;
      params.push(`%${filters.search}%`);
    }

    // Sorting
    // S2077: Whitelist sortBy/sortOrder to prevent SQL injection
    const sortBy = filters.sort_by || "created_at";
    const sortOrder = filters.sort_order || "desc";
    const allowedSortColumns = [
      "created_at",
      "price",
      "title",
      "quantity",
      "updated_at",
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    query += ` ORDER BY i.${safeSortBy} ${safeSortOrder}`;

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const { rows } = await this.pool.query(query, params);

    await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);
    return { success: true, data: rows };
  }

  async updateItem(id: string, updateItemDto: UpdateItemDto) {
    const client = await this.pool.connect();
    try {
      const updateFields: string[] = [];
      const params: unknown[] = [];
      let paramCount = 0;

      if (updateItemDto.title !== undefined) {
        paramCount++;
        updateFields.push(`title = $${paramCount}`);
        params.push(updateItemDto.title);
      }
      if (updateItemDto.description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        params.push(updateItemDto.description);
      }
      if (updateItemDto.category !== undefined) {
        paramCount++;
        updateFields.push(`category = $${paramCount}`);
        params.push(updateItemDto.category);
      }
      if (updateItemDto.condition !== undefined) {
        paramCount++;
        updateFields.push(`condition = $${paramCount}`);
        params.push(updateItemDto.condition);
      }
      if (updateItemDto.location !== undefined) {
        paramCount++;
        updateFields.push(`location = $${paramCount}::jsonb`);
        params.push(JSON.stringify(updateItemDto.location));
      }
      if (updateItemDto.price !== undefined) {
        paramCount++;
        updateFields.push(`price = $${paramCount}`);
        params.push(updateItemDto.price);
      }
      if (updateItemDto.images !== undefined) {
        paramCount++;
        updateFields.push(`images = $${paramCount}`);
        params.push(updateItemDto.images);
      }
      if (updateItemDto.tags !== undefined) {
        paramCount++;
        updateFields.push(`tags = $${paramCount}`);
        params.push(updateItemDto.tags);
      }
      if (updateItemDto.quantity !== undefined) {
        paramCount++;
        updateFields.push(`quantity = $${paramCount}`);
        params.push(updateItemDto.quantity);
      }
      if (updateItemDto.status !== undefined) {
        paramCount++;
        updateFields.push(`status = $${paramCount}`);
        params.push(updateItemDto.status);
      }
      if (updateItemDto.delivery_method !== undefined) {
        paramCount++;
        updateFields.push(`delivery_method = $${paramCount}`);
        params.push(updateItemDto.delivery_method);
      }
      if (updateItemDto.metadata !== undefined) {
        paramCount++;
        updateFields.push(`metadata = $${paramCount}::jsonb`);
        params.push(JSON.stringify(updateItemDto.metadata));
      }
      if (updateItemDto.expires_at !== undefined) {
        paramCount++;
        updateFields.push(`expires_at = $${paramCount}`);
        params.push(
          updateItemDto.expires_at ? new Date(updateItemDto.expires_at) : null,
        );
      }

      if (updateFields.length === 0) {
        return { success: false, error: "No fields to update" };
      }

      paramCount++;
      updateFields.push(`updated_at = NOW()`);
      params.push(id);

      const { rows } = await client.query(
        `
        UPDATE items
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `,
        params,
      );

      if (rows.length === 0) {
        return { success: false, error: "Item not found" };
      }

      await this.invalidateItemCaches();
      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Update item error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update item",
      };
    } finally {
      client.release();
    }
  }

  async deleteItem(id: string) {
    const client = await this.pool.connect();
    try {
      const { rowCount } = await client.query(
        `
        DELETE FROM items WHERE id = $1
      `,
        [id],
      );

      if (rowCount === 0) {
        return { success: false, error: "Item not found" };
      }

      await this.invalidateItemCaches();
      return { success: true, message: "Item deleted successfully" };
    } catch (error) {
      this.logger.error("Delete item error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete item",
      };
    } finally {
      client.release();
    }
  }

  // ==================== Item Requests ====================

  async createItemRequest(createRequestDto: CreateItemRequestDto) {
    const client = await this.pool.connect();
    try {
      // Check if item exists and is available
      const itemCheck = await client.query(
        `
        SELECT id, status, owner_id FROM items WHERE id = $1
      `,
        [createRequestDto.item_id],
      );

      if (itemCheck.rows.length === 0) {
        return { success: false, error: "Item not found" };
      }

      if (itemCheck.rows[0].status !== "available") {
        return { success: false, error: "Item is not available" };
      }

      // Check if requester is not the owner
      if (itemCheck.rows[0].owner_id === createRequestDto.requester_id) {
        return { success: false, error: "Cannot request your own item" };
      }

      // Check for existing pending request
      const existingRequest = await client.query(
        `
        SELECT id FROM item_requests
        WHERE item_id = $1 AND requester_id = $2 AND status = 'pending'
      `,
        [createRequestDto.item_id, createRequestDto.requester_id],
      );

      if (existingRequest.rows.length > 0) {
        return {
          success: false,
          error: "You already have a pending request for this item",
        };
      }

      const { rows } = await client.query(
        `
        INSERT INTO item_requests (
          item_id, requester_id, message, proposed_time,
          delivery_method, meeting_location
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          createRequestDto.item_id,
          createRequestDto.requester_id,
          createRequestDto.message || null,
          createRequestDto.proposed_time
            ? new Date(createRequestDto.proposed_time)
            : null,
          createRequestDto.delivery_method || null,
          createRequestDto.meeting_location
            ? JSON.stringify(createRequestDto.meeting_location)
            : null,
        ],
      );

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Create item request error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create request",
      };
    } finally {
      client.release();
    }
  }

  async getItemRequests(
    itemId?: string,
    userId?: string,
    role: "owner" | "requester" = "requester",
  ) {
    let query = `
      SELECT ir.*, 
             i.title as item_title, i.owner_id,
             up_requester.name as requester_name, up_requester.avatar_url as requester_avatar,
             up_owner.name as owner_name, up_owner.avatar_url as owner_avatar
      FROM item_requests ir
      JOIN items i ON ir.item_id = i.id
      LEFT JOIN user_profiles up_requester ON (ir.requester_id::text = up_requester.id::text OR ir.requester_id::text = up_requester.firebase_uid)
      LEFT JOIN user_profiles up_owner ON (i.owner_id::text = up_owner.id::text OR i.owner_id::text = up_owner.firebase_uid)
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramCount = 0;

    if (itemId) {
      paramCount++;
      query += ` AND ir.item_id = $${paramCount}`;
      params.push(itemId);
    }

    if (userId) {
      if (role === "owner") {
        paramCount++;
        query += ` AND i.owner_id = $${paramCount}`;
        params.push(userId);
      } else {
        paramCount++;
        query += ` AND ir.requester_id = $${paramCount}`;
        params.push(userId);
      }
    }

    query += ` ORDER BY ir.created_at DESC`;

    const { rows } = await this.pool.query(query, params);
    return { success: true, data: rows };
  }

  private async handleStatusUpdate(
    client: import("pg").PoolClient,
    request: { item_id: string },
    newStatus: string,
    isOwner: boolean,
    isRequester: boolean,
  ): Promise<{ allowed: boolean; error?: string }> {
    if (newStatus === "approved" || newStatus === "rejected") {
      if (!isOwner) {
        return {
          allowed: false,
          error: "Only owner can approve/reject requests",
        };
      }
    } else if (newStatus === "cancelled") {
      if (!isRequester) {
        return {
          allowed: false,
          error: "Only requester can cancel their request",
        };
      }
    }

    if (newStatus === "approved") {
      await client.query(`UPDATE items SET status = 'reserved' WHERE id = $1`, [
        request.item_id,
      ]);
    } else if (newStatus === "completed") {
      await client.query(
        `UPDATE items SET status = 'delivered' WHERE id = $1`,
        [request.item_id],
      );
    } else if (newStatus === "rejected" || newStatus === "cancelled") {
      await client.query(
        `UPDATE items SET status = 'available' WHERE id = $1`,
        [request.item_id],
      );
    }

    return { allowed: true };
  }

  private buildUpdateFields(
    updateRequestDto: UpdateItemRequestDto,
    isOwner: boolean,
  ): { fields: string[]; params: unknown[]; error?: string } {
    const updateFields: string[] = [];
    const params: unknown[] = [];
    let paramCount = 0;

    if (updateRequestDto.status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(updateRequestDto.status);
    }

    if (updateRequestDto.message !== undefined) {
      paramCount++;
      updateFields.push(`message = $${paramCount}`);
      params.push(updateRequestDto.message);
    }

    if (updateRequestDto.proposed_time !== undefined) {
      paramCount++;
      updateFields.push(`proposed_time = $${paramCount}`);
      params.push(
        updateRequestDto.proposed_time
          ? new Date(updateRequestDto.proposed_time)
          : null,
      );
    }

    if (updateRequestDto.owner_response !== undefined) {
      if (!isOwner) {
        return { fields: [], params: [], error: "Only owner can set response" };
      }
      paramCount++;
      updateFields.push(`owner_response = $${paramCount}`);
      params.push(updateRequestDto.owner_response);
    }

    updateFields.push(`updated_at = NOW()`);
    return { fields: updateFields, params };
  }

  async updateItemRequest(
    requestId: string,
    updateRequestDto: UpdateItemRequestDto,
    userId: string,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const requestCheck = await client.query(
        `
        SELECT ir.*, i.owner_id, i.status as item_status
        FROM item_requests ir
        JOIN items i ON ir.item_id = i.id
        WHERE ir.id = $1
      `,
        [requestId],
      );

      if (requestCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Request not found" };
      }

      const request = requestCheck.rows[0];
      const isOwner = request.owner_id === userId;
      const isRequester = request.requester_id === userId;

      if (!isOwner && !isRequester) {
        await client.query("ROLLBACK");
        return { success: false, error: "Unauthorized" };
      }

      if (updateRequestDto.status !== undefined) {
        const statusResult = await this.handleStatusUpdate(
          client,
          request,
          updateRequestDto.status,
          isOwner,
          isRequester,
        );
        if (!statusResult.allowed) {
          await client.query("ROLLBACK");
          return { success: false, error: statusResult.error };
        }
      }

      const updateResult = this.buildUpdateFields(updateRequestDto, isOwner);
      if (updateResult.error) {
        await client.query("ROLLBACK");
        return { success: false, error: updateResult.error };
      }

      if (updateResult.fields.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "No fields to update" };
      }

      updateResult.params.push(requestId);
      const { rows } = await client.query(
        `
        UPDATE item_requests
        SET ${updateResult.fields.join(", ")}
        WHERE id = $${updateResult.params.length}
        RETURNING *
      `,
        updateResult.params,
      );

      await client.query("COMMIT");
      await this.invalidateItemCaches();
      return { success: true, data: rows[0] };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Update item request error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update request",
      };
    } finally {
      client.release();
    }
  }

  // ==================== Cache Management ====================

  private async invalidateItemCaches() {
    const patterns = ["items_list:*", "item:*"];
    for (const pattern of patterns) {
      const keys = await this.redisCache.getKeys(pattern);
      for (const key of keys) {
        await this.redisCache.delete(key);
      }
    }
  }
}
