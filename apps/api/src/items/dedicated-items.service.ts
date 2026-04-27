// File overview:
// - Purpose: Service for dedicated items table with separate columns (not JSONB)
// - Provides: CRUD operations for items with all fields as separate database columns
// - External deps: PostgreSQL connection pool
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { CreateItemDto, UpdateItemDto } from "./dto/dedicated-item.dto";
import { randomBytes } from "crypto";

@Injectable()
export class DedicatedItemsService {
  private readonly logger = new Logger(DedicatedItemsService.name);
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Resolve any user identifier (email, firebase_uid, google_id, UUID string) to UUID
   * This ensures all user IDs are converted to UUID format before use
   */
  private async resolveUserIdToUUID(userId: string): Promise<string> {
    if (!userId) {
      throw new Error("User ID is required");
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

    // Try to find user by email, firebase_uid, or google_id
    const result = await this.pool.query(
      `SELECT id FROM user_profiles 
       WHERE LOWER(email) = LOWER($1) 
          OR firebase_uid = $1 
          OR google_id = $1 
          OR id::text = $1
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    throw new Error(`User not found: ${userId}`);
  }

  /**
   * Create a new item with all fields as separate columns
   */
  async createItem(dto: CreateItemDto) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Resolve owner_id to UUID - this ensures we always use UUID
      const ownerUuid = await this.resolveUserIdToUUID(dto.owner_id);

      // Get owner name for logging
      const ownerResult = await client.query(
        `SELECT name FROM user_profiles WHERE id = $1::uuid LIMIT 1`,
        [ownerUuid],
      );
      const ownerName = ownerResult.rows[0]?.name || "ללא שם";

      // Generate ID if not provided or if provided ID is a timestamp
      // This ensures we always have a proper ID format like "item_1234567890_abc123"
      // Similar to how rides work - the backend generates the ID, not the frontend
      let itemId = dto.id;
      if (!itemId || /^\d{10,13}$/.test(itemId)) {
        // If ID is missing or is a timestamp (only digits, 10-13 chars), generate a proper ID
        // S2245: Use crypto.randomBytes instead of Math.random for secure ID generation
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
        `Creating item: ${itemId} ${dto.title} - Owner: ${ownerName} (${ownerUuid})`,
      );

      const result = await client.query(
        `INSERT INTO items (
          id, owner_id, title, description, category, condition,
          city, address, coordinates, price, image_base64, rating,
          tags, quantity, delivery_method, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING *`,
        [
          itemId,
          ownerUuid,
          dto.title,
          dto.description || "",
          dto.category,
          dto.condition || "used",
          dto.city || "",
          dto.address || "",
          dto.coordinates || "",
          dto.price || 0,
          dto.image_base64 || null,
          dto.rating || 0,
          dto.tags || "",
          dto.quantity || 1,
          dto.delivery_method || "pickup",
          dto.status || "available",
        ],
      );

      const createdItem = result.rows[0];

      // Auto-create a corresponding post for this item
      // This allows likes/comments to work on items in the feed
      try {
        const postType = dto.price && dto.price > 0 ? "item" : "donation";
        const postTitle = dto.title;
        const postDescription = dto.description || "";

        // Get first image from base64 if exists
        const images = dto.image_base64 ? [dto.image_base64] : [];

        await client.query(
          `
          INSERT INTO posts (author_id, item_id, title, description, images, post_type, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            ownerUuid,
            createdItem.id,
            postTitle,
            postDescription,
            images,
            postType,
            JSON.stringify({
              item_id: createdItem.id,
              category: dto.category,
              intent: dto.intent || "give",
              price: dto.price || 0,
              condition: dto.condition,
              city: dto.city,
            }),
          ],
        );

        this.logger.log(`Auto-created post for item: ${createdItem.id}`);
      } catch (postError) {
        this.logger.warn(
          `Failed to auto-create post for item (continuing): ${postError}`,
        );
        // Don't fail the item creation if post creation fails
      }

      await client.query("COMMIT");

      this.logger.log(
        `Item created: ${result.rows[0].id} - Owner: ${ownerName} (${ownerUuid})`,
      );
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK").catch(() => void 0); // Ignore rollback errors
      this.logger.error("Error creating item:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all items for a specific owner (not deleted)
   */
  async getItemsByOwner(ownerId: string) {
    const client = await this.pool.connect();
    try {
      // Resolve owner_id to UUID
      const ownerUuid = await this.resolveUserIdToUUID(ownerId);

      this.logger.debug(`Fetching items for owner: ${ownerUuid}`);

      const result = await client.query(
        `SELECT * FROM items 
         WHERE owner_id = $1::uuid AND is_deleted = FALSE 
         ORDER BY created_at DESC`,
        [ownerUuid],
      );

      this.logger.debug(
        `Found ${result.rows.length} items for owner: ${ownerUuid}`,
      );
      return result.rows;
    } catch (error) {
      this.logger.error("Error fetching items by owner:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a single item by ID (not deleted)
   */
  async getItemById(id: string) {
    const client = await this.pool.connect();
    try {
      this.logger.debug(`Fetching item: ${id}`);

      const result = await client.query(
        `SELECT * FROM items WHERE id = $1 AND is_deleted = FALSE`,
        [id],
      );

      if (result.rows.length === 0) {
        this.logger.debug(`Item not found: ${id}`);
        return null;
      }

      this.logger.debug(`Item found: ${id}`);
      return result.rows[0];
    } catch (error) {
      this.logger.error("Error fetching item by ID:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an item
   */
  async updateItem(id: string, dto: UpdateItemDto) {
    const client = await this.pool.connect();
    try {
      this.logger.debug(`Updating item: ${id}`);

      const fields = [];
      const values = [];
      let paramCount = 1;

      // Dynamically build UPDATE query based on provided fields
      Object.entries(dto).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        this.logger.debug("No fields to update");
        return this.getItemById(id);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE items SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`;
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        this.logger.debug(`Item not found for update: ${id}`);
        return null;
      }

      this.logger.log(`Item updated: ${id}`);
      return result.rows[0];
    } catch (error) {
      this.logger.error("Error updating item:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete an item (set is_deleted = true)
   */
  async softDeleteItem(id: string) {
    const client = await this.pool.connect();
    try {
      this.logger.debug(`Soft deleting item: ${id}`);

      const result = await client.query(
        `UPDATE items 
         SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() 
         WHERE id = $1 AND is_deleted = FALSE
         RETURNING *`,
        [id],
      );

      if (result.rows.length === 0) {
        this.logger.debug(`Item not found or already deleted: ${id}`);
        return { success: false, message: "Item not found or already deleted" };
      }

      this.logger.log(`Item soft deleted: ${id}`);
      return { success: true, message: "Item deleted", item: result.rows[0] };
    } catch (error) {
      this.logger.error("Error soft deleting item:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all items by category (not deleted)
   */
  async getItemsByCategory(category: string) {
    const client = await this.pool.connect();
    try {
      this.logger.debug(`Fetching items by category: ${category}`);

      const result = await client.query(
        `SELECT * FROM items 
         WHERE category = $1 AND is_deleted = FALSE 
         ORDER BY created_at DESC`,
        [category],
      );

      this.logger.debug(
        `Found ${result.rows.length} items for category: ${category}`,
      );
      return result.rows;
    } catch (error) {
      this.logger.error("Error fetching items by category:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search items by title or description
   */
  async searchItems(searchTerm: string) {
    const client = await this.pool.connect();
    try {
      this.logger.debug(`Searching items: ${searchTerm}`);

      const result = await client.query(
        `SELECT * FROM items 
         WHERE (title ILIKE $1 OR description ILIKE $1) 
         AND is_deleted = FALSE 
         ORDER BY created_at DESC`,
        [`%${searchTerm}%`],
      );

      this.logger.debug(
        `Found ${result.rows.length} items matching: ${searchTerm}`,
      );
      return result.rows;
    } catch (error) {
      this.logger.error("Error searching items:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}
