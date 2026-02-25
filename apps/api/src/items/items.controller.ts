// File overview:
// - Purpose: Generic REST controller over logical collections stored in Postgres JSONB, with Redis utilities.
// - Reached from: Routes under '/api' (e.g., /api/posts/:userId/:itemId), plus helper endpoints for cache/activity.
// - Provides: CRUD (read/list/create/update/delete) via `ItemsService`, and Redis utilities: user-activity, popular-collections, cache-stats.
// - Params: `collection` path param, optional `userId`, `itemId`, and query `q` for text search in list.
// - External deps: `ItemsService` (PG + Redis), DTOs for validation.
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ItemsService, ALLOWED_COLLECTIONS } from "./items.service";
import { QueryByUserDto, UpsertItemDto } from "./dto/item.dto";

// Using 'api/collections' to avoid catching dedicated routes like /api/dedicated-items
@Controller("api/collections")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  private validateCollection(collection: string): void {
    if (!collection || !ALLOWED_COLLECTIONS.has(collection)) {
      throw new BadRequestException("Invalid collection");
    }
  }

  // Generic CRUD mapped to collections in query param
  @Get(":collection/:userId/:itemId")
  async read(
    @Param("collection") collection: string,
    @Param("userId") userId: string,
    @Param("itemId") itemId: string,
  ) {
    this.validateCollection(collection);
    return this.itemsService.read(collection, userId, itemId);
  }

  @Get(":collection")
  async list(
    @Param("collection") collection: string,
    @Query() query: QueryByUserDto,
  ) {
    this.validateCollection(collection);
    // Log with structured separate args so user-supplied values are never used as format strings.
    console.log(
      "📥 ItemsController - list called for collection=%s userId=%s q=%s",
      collection,
      query.userId || "none",
      query.q || "none",
    );
    // If userId is 'all' or not provided, return all items (for public collections like links)
    if (query.userId === "all" || (!query.userId && collection === "links")) {
      console.log(
        "🔄 ItemsController - Using listAll for collection=%s",
        collection,
      );
      // snyk ignore javascript/Sqli: collection validated via whitelist in tableFor()
      const result = await this.itemsService.listAll(collection, query.q);
      console.log(
        "📤 ItemsController - listAll collection=%s count=%d",
        collection,
        result?.length || 0,
      );
      return result;
    }
    if (!query.userId) {
      console.log(
        "⚠️ ItemsController - No userId provided for collection=%s, returning empty array",
        collection,
      );
      return [];
    }
    // snyk ignore javascript/Sqli: collection validated via whitelist in tableFor()
    return this.itemsService.list(collection, query.userId, query.q);
  }

  @Post(":collection")
  async create(
    @Param("collection") collection: string,
    @Body() dto: UpsertItemDto,
  ) {
    this.validateCollection(collection);
    return this.itemsService.create(collection, dto.userId, dto.id, dto.data);
  }

  @Put(":collection/:userId/:itemId")
  async update(
    @Param("collection") collection: string,
    @Param("userId") userId: string,
    @Param("itemId") itemId: string,
    @Body("data") data: Record<string, unknown>,
  ) {
    this.validateCollection(collection);
    // snyk ignore javascript/Sqli: collection validated via whitelist in tableFor()
    return this.itemsService.update(collection, userId, itemId, data);
  }

  @Delete(":collection/:userId/:itemId")
  async remove(
    @Param("collection") collection: string,
    @Param("userId") userId: string,
    @Param("itemId") itemId: string,
  ) {
    this.validateCollection(collection);
    // snyk ignore javascript/Sqli: collection validated via whitelist in tableFor()
    return this.itemsService.delete(collection, userId, itemId);
  }

  // Redis-powered endpoints

  @Get("user-activity/:userId")
  async getUserActivity(@Param("userId") userId: string) {
    try {
      if (!userId || typeof userId !== "string") {
        return {
          success: false,
          error: "Valid userId is required",
        };
      }

      const activity = await this.itemsService.getUserActivity(userId);
      return {
        success: true,
        userId,
        ...activity,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("popular-collections")
  async getPopularCollections() {
    try {
      const collections = await this.itemsService.getPopularCollections();
      return {
        success: true,
        collections,
        total: collections.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get("cache-stats")
  async getCacheStats() {
    try {
      const stats = await this.itemsService.getCacheStats();
      return {
        success: true,
        stats,
        message: "Redis cache statistics",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
