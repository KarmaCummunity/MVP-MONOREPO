// File overview:
// - Purpose: REST controller for dedicated items with separate columns
// - Reached from: Routes under '/api/dedicated-items'
// - Provides: CRUD endpoints for items (create, read, update, delete)
// - External deps: DedicatedItemsService
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { DedicatedItemsService } from "./dedicated-items.service";
import { CreateItemDto, UpdateItemDto } from "./dto/dedicated-item.dto";

@Controller("api/dedicated-items")
export class DedicatedItemsController {
  constructor(private readonly service: DedicatedItemsService) {}

  /**
   * POST /api/dedicated-items
   * Create a new item
   */
  @Post()
  async create(@Body() dto: CreateItemDto) {
    try {
      const item = await this.service.createItem(dto);
      return {
        success: true,
        data: item,
        message: "Item created successfully",
      };
    } catch (error) {
      console.error("Controller: Error creating item:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to create item",
      };
    }
  }

  /**
   * GET /api/dedicated-items/owner/:ownerId
   * Get all items for a specific owner
   */
  @Get("owner/:ownerId")
  async getByOwner(@Param("ownerId") ownerId: string) {
    try {
      const items = await this.service.getItemsByOwner(ownerId);
      return items; // Return array directly for simpler client handling
    } catch (error) {
      console.error("Controller: Error fetching items by owner:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fetch items",
      };
    }
  }

  /**
   * GET /api/dedicated-items/:id
   * Get a single item by ID
   */
  @Get(":id")
  async getById(@Param("id") id: string) {
    try {
      const item = await this.service.getItemById(id);
      if (!item) {
        return {
          success: false,
          error: "Item not found",
          message: "Item not found or has been deleted",
        };
      }
      return {
        success: true,
        data: item,
      };
    } catch (error) {
      console.error("Controller: Error fetching item by ID:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fetch item",
      };
    }
  }

  /**
   * PUT /api/dedicated-items/:id
   * Update an item
   */
  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateItemDto) {
    try {
      const item = await this.service.updateItem(id, dto);
      if (!item) {
        return {
          success: false,
          error: "Item not found",
          message: "Item not found",
        };
      }
      return {
        success: true,
        data: item,
        message: "Item updated successfully",
      };
    } catch (error) {
      console.error("Controller: Error updating item:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to update item",
      };
    }
  }

  /**
   * DELETE /api/dedicated-items/:id
   * Soft delete an item
   */
  @Delete(":id")
  async softDelete(@Param("id") id: string) {
    try {
      const result = await this.service.softDeleteItem(id);
      return result;
    } catch (error) {
      console.error("Controller: Error deleting item:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to delete item",
      };
    }
  }

  /**
   * GET /api/dedicated-items/category/:category
   * Get all items by category
   */
  @Get("category/:category")
  async getByCategory(@Param("category") category: string) {
    try {
      const items = await this.service.getItemsByCategory(category);
      return items;
    } catch (error) {
      console.error("Controller: Error fetching items by category:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fetch items",
      };
    }
  }

  /**
   * GET /api/dedicated-items/search?q=term
   * Search items by title or description
   */
  @Get("search")
  async search(@Query("q") searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim() === "") {
        return {
          success: false,
          error: "Search term required",
          message: "Please provide a search term",
        };
      }
      const items = await this.service.searchItems(searchTerm);
      return items;
    } catch (error) {
      console.error("Controller: Error searching items:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to search items",
      };
    }
  }
}
