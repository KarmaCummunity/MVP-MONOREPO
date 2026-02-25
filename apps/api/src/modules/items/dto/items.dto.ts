// File overview:
// - Purpose: DTOs for Items Delivery API endpoints with validation
// - Used by: ItemsDeliveryController for creating, updating, and filtering items
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  Min,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class CreateItemDto {
  @IsString()
  owner_id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  location?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === null || value === undefined ? undefined : Number(value),
  )
  price?: number;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === null || value === undefined ? undefined : Number(value),
  )
  quantity?: number;

  @IsOptional()
  @IsString()
  delivery_method?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  expires_at?: string;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsEnum([
    "furniture",
    "clothes",
    "electronics",
    "general",
    "books",
    "toys",
    "sports",
    "kitchen",
    "other",
  ])
  category?: string;

  @IsOptional()
  @IsEnum(["new", "like_new", "used", "for_parts"])
  condition?: string;

  @IsOptional()
  @IsObject()
  location?: {
    city?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(["available", "reserved", "delivered", "expired", "cancelled"])
  status?: string;

  @IsOptional()
  @IsEnum(["pickup", "delivery", "shipping"])
  delivery_method?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  expires_at?: string;
}

export class ItemFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      value === "undefined" ||
      value === "null"
    ) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  min_price?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      value === "undefined" ||
      value === "null"
    ) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  max_price?: number;

  @IsOptional()
  @IsString()
  search?: string; // Full-text search query

  @IsOptional()
  @IsString()
  owner_id?: string;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsString()
  sort_order?: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      value === "undefined" ||
      value === "null"
    ) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      value === "undefined" ||
      value === "null"
    ) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  offset?: number;
}

export class CreateItemRequestDto {
  @IsString()
  item_id!: string;

  @IsString()
  requester_id!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  proposed_time?: string;

  @IsOptional()
  @IsEnum(["pickup", "delivery", "shipping"])
  delivery_method?: string;

  @IsOptional()
  @IsObject()
  meeting_location?: {
    address?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
}

export class UpdateItemRequestDto {
  @IsOptional()
  @IsEnum([
    "pending",
    "approved",
    "rejected",
    "scheduled",
    "completed",
    "cancelled",
  ])
  status?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  proposed_time?: string;

  @IsOptional()
  @IsString()
  owner_response?: string;
}
