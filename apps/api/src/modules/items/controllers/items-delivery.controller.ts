// File overview:
// - Purpose: Items Delivery API for creating, listing, updating, and managing item delivery requests
// - Reached from: Routes under '/api/items'
// - Provides: CRUD for items, search with filters, and item request workflow management
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Logger,
} from "@nestjs/common";
import { ItemsDeliveryService } from "../services/items-delivery.service";
import {
  CreateItemDto,
  UpdateItemDto,
  ItemFiltersDto,
  CreateItemRequestDto,
  UpdateItemRequestDto,
} from "../dto/items.dto";

@Controller("api/items-delivery")
export class ItemsDeliveryController {
  private readonly logger = new Logger(ItemsDeliveryController.name);
  constructor(private readonly itemsDeliveryService: ItemsDeliveryService) {}

  // ==================== Items CRUD ====================

  @Post()
  async createItem(@Body() body: Record<string, unknown>) {
    try {
      // Manual validation and transformation
      const createItemDto: CreateItemDto = {
        owner_id: body.owner_id as string,
        title: body.title as string,
        description: (body.description as string) || undefined,
        category: body.category as string,
        condition: (body.condition as string) || undefined,
        location: (body.location as Record<string, unknown>) || undefined,
        price:
          body.price !== undefined && body.price !== null
            ? Number(body.price)
            : undefined,
        images: (body.images as string[]) || [],
        tags: (body.tags as string[]) || [],
        quantity:
          body.quantity !== undefined && body.quantity !== null
            ? Number(body.quantity)
            : undefined,
        delivery_method: (body.delivery_method as string) || undefined,
        metadata: (body.metadata as Record<string, unknown>) || undefined,
        expires_at: (body.expires_at as string) || undefined,
      };

      // Basic validation
      if (
        !createItemDto.owner_id ||
        !createItemDto.title ||
        !createItemDto.category
      ) {
        return {
          success: false,
          error:
            "Missing required fields: owner_id, title, and category are required",
        };
      }

      return this.itemsDeliveryService.createItem(createItemDto);
    } catch (error) {
      this.logger.error("Error in createItem:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create item",
      };
    }
  }

  @Get("search")
  async searchItems(
    @Query("category") category?: string,
    @Query("condition") condition?: string,
    @Query("status") status?: string,
    @Query("city") city?: string,
    @Query("min_price") min_price?: string,
    @Query("max_price") max_price?: string,
    @Query("search") search?: string,
    @Query("owner_id") owner_id?: string,
    @Query("sort_by") sort_by?: string,
    @Query("sort_order") sort_order?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const validatedFilters: ItemFiltersDto = {
      category: category || undefined,
      condition: condition || undefined,
      status: status || undefined,
      city: city || undefined,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      search: search || undefined,
      owner_id: owner_id || undefined,
      sort_by: sort_by || undefined,
      sort_order: sort_order || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    try {
      return await this.itemsDeliveryService.listItems(validatedFilters);
    } catch (error) {
      this.logger.error("Error in searchItems:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search items",
      };
    }
  }

  @Get("user/:userId")
  async getUserItems(
    @Param("userId") userId: string,
    @Query("category") category?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const validatedFilters: ItemFiltersDto = {
      category: category || undefined,
      status: status || undefined,
      owner_id: userId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    return this.itemsDeliveryService.listItems(validatedFilters);
  }

  @Get()
  async listItems(
    @Query("category") category?: string,
    @Query("condition") condition?: string,
    @Query("status") status?: string,
    @Query("city") city?: string,
    @Query("min_price") min_price?: string,
    @Query("max_price") max_price?: string,
    @Query("search") search?: string,
    @Query("owner_id") owner_id?: string,
    @Query("sort_by") sort_by?: string,
    @Query("sort_order") sort_order?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    try {
      const validatedFilters: ItemFiltersDto = {
        category: category || undefined,
        condition: condition || undefined,
        status: status || undefined,
        city: city || undefined,
        min_price: min_price ? Number(min_price) : undefined,
        max_price: max_price ? Number(max_price) : undefined,
        search: search || undefined,
        owner_id: owner_id || undefined,
        sort_by: sort_by || undefined,
        sort_order: sort_order || undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      };
      return this.itemsDeliveryService.listItems(validatedFilters);
    } catch (error) {
      this.logger.error("Error in listItems:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list items",
      };
    }
  }

  @Get(":id")
  async getItemById(@Param("id") id: string) {
    return this.itemsDeliveryService.getItemById(id);
  }

  @Put(":id")
  async updateItem(
    @Param("id") id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsDeliveryService.updateItem(id, updateItemDto);
  }

  @Delete(":id")
  async deleteItem(@Param("id") id: string) {
    return this.itemsDeliveryService.deleteItem(id);
  }

  // ==================== Item Requests ====================

  @Post(":id/reserve")
  async reserveItem(
    @Param("id") itemId: string,
    @Body() createRequestDto: Omit<CreateItemRequestDto, "item_id">,
  ) {
    return this.itemsDeliveryService.createItemRequest({
      ...createRequestDto,
      item_id: itemId,
    });
  }

  @Post("requests")
  async createItemRequest(@Body() createRequestDto: CreateItemRequestDto) {
    return this.itemsDeliveryService.createItemRequest(createRequestDto);
  }

  @Get("requests")
  async getItemRequests(
    @Query("itemId") itemId?: string,
    @Query("userId") userId?: string,
    @Query("role") role: "owner" | "requester" = "requester",
  ) {
    return this.itemsDeliveryService.getItemRequests(itemId, userId, role);
  }

  @Put("requests/:requestId")
  async updateItemRequest(
    @Param("requestId") requestId: string,
    @Body() updateRequestDto: UpdateItemRequestDto,
    @Query("userId") userId: string,
  ) {
    if (!userId) {
      return { success: false, error: "userId query parameter is required" };
    }
    // snyk ignore javascript/Sqli: service uses parameterized queries
    return this.itemsDeliveryService.updateItemRequest(
      requestId,
      updateRequestDto,
      userId,
    );
  }

  @Post(":id/deliver")
  async markAsDelivered(
    @Param("id") itemId: string,
    @Body() body: { userId: string; requestId?: string },
  ) {
    // Mark item as delivered
    const updateResult = await this.itemsDeliveryService.updateItem(itemId, {
      status: "delivered",
    });

    // If there's a requestId, mark it as completed
    if (body.requestId) {
      await this.itemsDeliveryService.updateItemRequest(
        body.requestId,
        { status: "completed" },
        body.userId,
      );
    }

    return updateResult;
  }
}
