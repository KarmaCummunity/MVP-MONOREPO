// File overview:
// - Purpose: Validation DTOs for ItemsController endpoints.
// - Used by: POST /api/:collection (UpsertItemDto), GET /api/:collection?userId=...&q=... (QueryByUserDto).
// - Fields: `id`, `userId`, and arbitrary JSON `data` for upsert; `userId` and optional `q` for list query.
import { IsObject, IsOptional, IsString } from "class-validator";

export class UpsertItemDto {
  @IsString()
  id!: string; // itemId

  @IsString()
  userId!: string;

  @IsObject()
  data!: Record<string, unknown>;
}

export class QueryByUserDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
