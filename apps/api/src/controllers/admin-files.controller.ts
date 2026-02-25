import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Inject,
  UseGuards,
  Request,
  Logger,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtAuthGuard, AdminAuthGuard } from "../auth/jwt-auth.guard";

interface CreateFileDto {
  name: string;
  url: string;
  mime_type?: string;
  size?: number;
  folder_path?: string; // e.g. "Finance", "HR" or "/"
  uploaded_by?: string;
}

@Controller("/api/admin-files")
export class AdminFilesController {
  private readonly logger = new Logger(AdminFilesController.name);
  private readonly CACHE_TTL = 10 * 60; // 10 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
  ) {}

  private async ensureTable() {
    try {
      const checkTable = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'general_files'
        );
      `);

      if (!checkTable.rows[0].exists) {
        this.logger.log("Creating general_files table...");
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS general_files (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            url TEXT NOT NULL,
            mime_type VARCHAR(100),
            size BIGINT,
            folder_path VARCHAR(255) DEFAULT '/',
            uploaded_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);

        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_general_files_folder ON general_files (folder_path)",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_general_files_created_at ON general_files (created_at DESC)",
        );

        this.logger.log("general_files table created successfully");
      }
    } catch (error) {
      this.logger.error("Error ensuring general_files table:", error);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getFiles(
    @Query("folder") folder?: string,
    @Query("search") search?: string,
  ) {
    await this.ensureTable();

    // Normalize folder path to ensure it starts/ends correctly if needed.
    // For now, exact match or strict hierarchy.
    const targetFolder = folder || "/";

    const cacheKey = `admin_files_list_${targetFolder}_${search || ""}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    try {
      let query = `SELECT * FROM general_files WHERE 1=1`;
      const params: unknown[] = [];
      let paramIndex = 1;

      // Filter by folder if not searching globally
      if (!search) {
        query += ` AND folder_path = $${paramIndex}`;
        params.push(targetFolder);
        paramIndex++;
      } else {
        query += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const { rows } = await this.pool.query(query, params);
      await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching admin files:", error);
      return { success: false, error: "Failed to fetch files", data: [] };
    }
  }

  @Get("folders")
  @UseGuards(JwtAuthGuard)
  async getFolders() {
    await this.ensureTable();
    try {
      // Get distinct folders
      const { rows } = await this.pool.query(`
        SELECT DISTINCT folder_path FROM general_files ORDER BY folder_path
      `);
      return { success: true, data: rows.map((r) => r.folder_path) };
    } catch (_error) {
      return { success: false, error: "Failed to fetch folders", data: [] };
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async uploadFile(
    @Body() dto: CreateFileDto,
    @Request() req: import("express").Request,
  ) {
    await this.ensureTable();

    try {
      if (!dto.name || !dto.url) {
        return { success: false, error: "Name and URL are required" };
      }

      // Validate file size if provided (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (dto.size && dto.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        };
      }

      let userId: string | null = req.user?.userId || null;
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!userId || !uuidRegex.test(userId)) {
        // Try to resolve from body if available and valid
        if (dto.uploaded_by && uuidRegex.test(dto.uploaded_by)) {
          userId = dto.uploaded_by;
        } else {
          this.logger.warn(
            `uploadFile: Invalid or missing userId, setting to NULL. Received: ${userId}`,
          );
          userId = null;
        }
      }

      const { rows } = await this.pool.query(
        `INSERT INTO general_files (name, url, mime_type, size, folder_path, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          dto.name,
          dto.url,
          dto.mime_type || null,
          dto.size || 0,
          dto.folder_path || "/",
          userId,
        ],
      );

      await this.redisCache.invalidatePattern("admin_files_list_*");
      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error saving file metadata:", error);
      return { success: false, error: "Failed to save file metadata" };
    }
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async deleteFile(@Param("id") id: string) {
    await this.ensureTable();

    try {
      // In a real implementation, we would also delete the file from storage (S3/Firebase).
      // Here we only delete the metadata record.
      const { rows } = await this.pool.query(
        `DELETE FROM general_files WHERE id = $1 RETURNING id`,
        [id],
      );
      if (rows.length === 0) return { success: false, error: "File not found" };

      await this.redisCache.invalidatePattern("admin_files_list_*");
      return { success: true, message: "File deleted successfully" };
    } catch (error) {
      this.logger.error("Error deleting file:", error);
      return { success: false, error: "Failed to delete file" };
    }
  }
}
