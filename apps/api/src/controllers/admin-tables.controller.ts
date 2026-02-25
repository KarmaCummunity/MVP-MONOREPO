// File overview:
// - Purpose: CRUD for Admin Dynamic Tables
// - Routes: /api/admin/tables (GET, POST), /api/admin/tables/:id (GET, PUT, DELETE), /api/admin/tables/:id/rows (GET, POST), /api/admin/tables/:id/rows/:rowId (PUT, DELETE)
// - Storage: PostgreSQL tables admin_tables, admin_table_columns, admin_table_rows
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  AdminTablesService,
  CreateTableDto,
  UpdateTableDto,
  CreateRowDto,
  UpdateRowDto,
} from "../services/admin-tables.service";
import { AdminAuthGuard } from "../auth/jwt-auth.guard";

@Controller("/api/admin/tables")
@UseGuards(AdminAuthGuard)
export class AdminTablesController {
  constructor(private readonly adminTablesService: AdminTablesService) {}

  @Get()
  async getAllTables() {
    try {
      const tables = await this.adminTablesService.getAllTables();
      return { success: true, data: tables };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה בטעינת טבלאות" };
    }
  }

  @Get(":id")
  async getTableById(
    @Param("id") id: string,
    @Query("includeRows") includeRows?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    try {
      const includeRowsBool = includeRows === "true";
      const pagination =
        includeRowsBool && page && limit
          ? {
              page: parseInt(page) || 1,
              limit: parseInt(limit) || 50,
            }
          : undefined;

      const table = await this.adminTablesService.getTableById(
        id,
        includeRowsBool,
        pagination,
      );
      return { success: true, data: table };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה בטעינת טבלה" };
    }
  }

  @Post()
  async createTable(
    @Body() dto: CreateTableDto,
    @Request() req: import("express").Request,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return { success: false, error: "משתמש לא מזוהה" };
      }

      if (!dto.name || !dto.name.trim()) {
        return { success: false, error: "שם הטבלה הוא חובה" };
      }

      if (!dto.columns || dto.columns.length === 0) {
        return { success: false, error: "חייב להגדיר לפחות עמודה אחת" };
      }

      const table = await this.adminTablesService.createTable(dto, userId);
      return { success: true, data: table };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה ביצירת טבלה" };
    }
  }

  @Put(":id")
  async updateTable(
    @Param("id") id: string,
    @Body() dto: UpdateTableDto,
    @Request() req: import("express").Request,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return { success: false, error: "משתמש לא מזוהה" };
      }

      const table = await this.adminTablesService.updateTable(id, dto, userId);
      return { success: true, data: table };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה בעדכון טבלה" };
    }
  }

  @Delete(":id")
  async deleteTable(@Param("id") id: string) {
    try {
      await this.adminTablesService.deleteTable(id);
      return { success: true, message: "טבלה נמחקה בהצלחה" };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה במחיקת טבלה" };
    }
  }

  @Get(":id/rows")
  async getTableRows(
    @Param("id") tableId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    try {
      const pagination =
        page && limit
          ? {
              page: parseInt(page) || 1,
              limit: parseInt(limit) || 50,
            }
          : undefined;

      const result = await this.adminTablesService.getTableRows(
        tableId,
        pagination,
      );
      return { success: true, data: result };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה בטעינת רשומות" };
    }
  }

  @Post(":id/rows")
  async createRow(
    @Param("id") tableId: string,
    @Body() dto: CreateRowDto,
    @Request() req: import("express").Request,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return { success: false, error: "משתמש לא מזוהה" };
      }

      if (!dto.data || typeof dto.data !== "object") {
        return { success: false, error: "נתונים לא תקינים" };
      }

      const row = await this.adminTablesService.createRow(tableId, dto, userId);
      return { success: true, data: row };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה ביצירת רשומה" };
    }
  }

  @Put(":id/rows/:rowId")
  async updateRow(
    @Param("id") tableId: string,
    @Param("rowId") rowId: string,
    @Body() dto: UpdateRowDto,
    @Request() req: import("express").Request,
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return { success: false, error: "משתמש לא מזוהה" };
      }

      if (!dto.data || typeof dto.data !== "object") {
        return { success: false, error: "נתונים לא תקינים" };
      }

      const row = await this.adminTablesService.updateRow(
        tableId,
        rowId,
        dto,
        userId,
      );
      return { success: true, data: row };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה בעדכון רשומה" };
    }
  }

  @Delete(":id/rows/:rowId")
  async deleteRow(@Param("id") tableId: string, @Param("rowId") rowId: string) {
    try {
      await this.adminTablesService.deleteRow(tableId, rowId);
      return { success: true, message: "רשומה נמחקה בהצלחה" };
    } catch (error_: unknown) {
      const error = error_ as Error;
      return { success: false, error: error.message || "שגיאה במחיקת רשומה" };
    }
  }
}
