// File overview:
// - Purpose: Service for Admin Dynamic Tables management
// - Used by: AdminTablesController
// - Provides: CRUD operations for tables, columns, and rows with validation
import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

export interface CreateColumnDto {
  name: string;
  data_type: "text" | "number" | "date";
  is_required?: boolean;
  display_order?: number;
}

export interface CreateTableDto {
  name: string;
  description?: string;
  columns: CreateColumnDto[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTableDto {
  name?: string;
  description?: string;
  columns?: CreateColumnDto[];
  metadata?: Record<string, unknown>;
}

export interface CreateRowDto {
  data: Record<string, unknown>;
}

export interface UpdateRowDto {
  data: Record<string, unknown>;
}

@Injectable()
export class AdminTablesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Ensure admin tables exist, create if needed
   */
  private async ensureTables() {
    try {
      // Check if admin_tables exists
      const checkTable = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admin_tables'
        );
      `);

      if (!checkTable.rows[0].exists) {
        console.log("📋 Creating admin_tables tables...");

        // Create admin_tables
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS admin_tables (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by UUID,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Create admin_table_columns
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS admin_table_columns (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            table_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'number', 'date')),
            is_required BOOLEAN DEFAULT false,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_table_column_name UNIQUE (table_id, name)
          );
        `);

        // Create admin_table_rows
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS admin_table_rows (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            table_id UUID NOT NULL,
            data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by UUID,
            updated_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Create indexes
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_tables_created_by ON admin_tables(created_by);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_tables_created_at ON admin_tables(created_at DESC);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_table_columns_table_id ON admin_table_columns(table_id);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_table_columns_display_order ON admin_table_columns(table_id, display_order);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_table_rows_table_id ON admin_table_rows(table_id);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_table_rows_created_by ON admin_table_rows(created_by);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_table_rows_created_at ON admin_table_rows(table_id, created_at DESC);",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_admin_table_rows_data_gin ON admin_table_rows USING GIN (data);",
        );

        // Create triggers for updated_at
        await this.pool.query(`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ language 'plpgsql';
        `);

        await this.pool.query(`
          DROP TRIGGER IF EXISTS update_admin_tables_updated_at ON admin_tables;
          CREATE TRIGGER update_admin_tables_updated_at 
          BEFORE UPDATE ON admin_tables 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        await this.pool.query(`
          DROP TRIGGER IF EXISTS update_admin_table_rows_updated_at ON admin_table_rows;
          CREATE TRIGGER update_admin_table_rows_updated_at 
          BEFORE UPDATE ON admin_table_rows 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        console.log("✅ admin_tables tables created successfully");
      }
    } catch (error) {
      console.error("❌ Error ensuring admin_tables tables:", error);
      throw error;
    }
  }

  /**
   * Validate row data according to column definitions
   */
  private validateRowData(
    columns: CreateColumnDto[],
    data: Record<string, unknown>,
  ): { valid: boolean; error?: string } {
    for (const column of columns) {
      const value = data[column.name];

      // Check required fields
      if (
        column.is_required &&
        (value === undefined || value === null || value === "")
      ) {
        return { valid: false, error: `שדה חובה: ${column.name}` };
      }

      // Skip validation if value is empty and not required
      if (value === undefined || value === null || value === "") {
        continue;
      }

      // Validate data types
      switch (column.data_type) {
        case "text":
          if (typeof value !== "string") {
            return {
              valid: false,
              error: `שדה ${column.name} חייב להיות טקסט`,
            };
          }
          break;
        case "number":
          if (typeof value !== "number" && isNaN(Number(value))) {
            return {
              valid: false,
              error: `שדה ${column.name} חייב להיות מספר`,
            };
          }
          break;
        case "date": {
          const dateValue =
            value instanceof Date ? value : new Date(value as string | number);
          if (isNaN(dateValue.getTime())) {
            return {
              valid: false,
              error: `שדה ${column.name} חייב להיות תאריך תקין`,
            };
          }
          break;
        }
        default:
          return {
            valid: false,
            error: `סוג נתון לא נתמך: ${column.data_type}`,
          };
      }
    }

    return { valid: true };
  }

  /**
   * Normalize row data according to column data types
   */
  private normalizeRowData(
    columns: CreateColumnDto[],
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    for (const column of columns) {
      const value = data[column.name];

      if (value === undefined || value === null || value === "") {
        if (!column.is_required) {
          normalized[column.name] = null;
        }
        continue;
      }

      switch (column.data_type) {
        case "text":
          normalized[column.name] = String(value);
          break;
        case "number":
          normalized[column.name] = Number(value);
          break;
        case "date": {
          const dateValue =
            value instanceof Date ? value : new Date(value as string | number);
          normalized[column.name] = dateValue.toISOString();
          break;
        }
        default:
          normalized[column.name] = value;
      }
    }

    return normalized;
  }

  /**
   * Create a new table with columns
   */
  async createTable(dto: CreateTableDto, userId: string) {
    await this.ensureTables();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Validate columns
      if (!dto.columns || dto.columns.length === 0) {
        throw new Error("חייב להגדיר לפחות עמודה אחת");
      }

      // Check for duplicate column names
      const columnNames = dto.columns.map((c) => c.name);
      if (new Set(columnNames).size !== columnNames.length) {
        throw new Error("לא ניתן להגדיר עמודות עם אותו שם");
      }

      // Insert table
      const tableResult = await client.query(
        `INSERT INTO admin_tables (name, description, created_by, metadata)
         VALUES ($1, $2, $3::UUID, $4::jsonb)
         RETURNING *`,
        [
          dto.name,
          dto.description || null,
          userId,
          JSON.stringify(dto.metadata || {}),
        ],
      );

      const table = tableResult.rows[0];

      // Insert columns
      for (let i = 0; i < dto.columns.length; i++) {
        const column = dto.columns[i];
        await client.query(
          `INSERT INTO admin_table_columns (table_id, name, data_type, is_required, display_order)
           VALUES ($1::UUID, $2, $3, $4, $5)`,
          [
            table.id,
            column.name,
            column.data_type,
            column.is_required || false,
            column.display_order !== undefined ? column.display_order : i,
          ],
        );
      }

      // Fetch columns
      const columnsResult = await client.query(
        `SELECT * FROM admin_table_columns WHERE table_id = $1::UUID ORDER BY display_order, created_at`,
        [table.id],
      );

      await client.query("COMMIT");

      return {
        ...table,
        columns: columnsResult.rows,
      };
    } catch (err) {
      const error = err as Error;
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all tables with their columns
   */
  async getAllTables() {
    await this.ensureTables();
    try {
      const tablesResult = await this.pool.query(
        `SELECT * FROM admin_tables ORDER BY created_at DESC`,
      );

      const tables = tablesResult.rows;

      // Fetch columns for each table
      for (const table of tables) {
        const columnsResult = await this.pool.query(
          `SELECT * FROM admin_table_columns WHERE table_id = $1::UUID ORDER BY display_order, created_at`,
          [table.id],
        );
        table.columns = columnsResult.rows;

        // Get row count
        const countResult = await this.pool.query(
          `SELECT COUNT(*) as count FROM admin_table_rows WHERE table_id = $1::UUID`,
          [table.id],
        );
        table.row_count = parseInt(countResult.rows[0].count);
      }

      return tables;
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה בטעינת טבלאות: ${error.message}`);
    }
  }

  /**
   * Get table by ID with columns and optionally rows
   */
  async getTableById(
    id: string,
    includeRows = false,
    pagination?: { page: number; limit: number },
  ) {
    await this.ensureTables();
    try {
      const tableResult = await this.pool.query(
        `SELECT * FROM admin_tables WHERE id = $1::UUID`,
        [id],
      );

      if (tableResult.rows.length === 0) {
        throw new Error("טבלה לא נמצאה");
      }

      const table = tableResult.rows[0];

      // Fetch columns
      const columnsResult = await this.pool.query(
        `SELECT * FROM admin_table_columns WHERE table_id = $1::UUID ORDER BY display_order, created_at`,
        [id],
      );
      table.columns = columnsResult.rows;

      // Fetch rows if requested
      if (includeRows) {
        let rowsQuery = `SELECT * FROM admin_table_rows WHERE table_id = $1::UUID ORDER BY created_at DESC`;
        const params: unknown[] = [id];

        if (pagination) {
          rowsQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
          params.push(
            pagination.limit,
            (pagination.page - 1) * pagination.limit,
          );
        }

        const rowsResult = await this.pool.query(rowsQuery, params);
        table.rows = rowsResult.rows;

        // Get total count
        const countResult = await this.pool.query(
          `SELECT COUNT(*) as count FROM admin_table_rows WHERE table_id = $1::UUID`,
          [id],
        );
        table.total_rows = parseInt(countResult.rows[0].count);
      }

      return table;
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה בטעינת טבלה: ${error.message}`);
    }
  }

  /**
   * Update table structure
   */
  async updateTable(id: string, dto: UpdateTableDto, _userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Check if table exists
      const tableCheck = await client.query(
        `SELECT id FROM admin_tables WHERE id = $1::UUID`,
        [id],
      );

      if (tableCheck.rows.length === 0) {
        throw new Error("טבלה לא נמצאה");
      }

      // Update table fields
      if (
        dto.name ||
        dto.description !== undefined ||
        dto.metadata !== undefined
      ) {
        const updates: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (dto.name) {
          updates.push(`name = $${paramIndex++}`);
          params.push(dto.name);
        }
        if (dto.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          params.push(dto.description || null);
        }
        if (dto.metadata !== undefined) {
          updates.push(`metadata = $${paramIndex++}::jsonb`);
          params.push(JSON.stringify(dto.metadata));
        }

        if (updates.length > 0) {
          params.push(id);
          await client.query(
            `UPDATE admin_tables SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex}::UUID`,
            params,
          );
        }
      }

      // Update columns if provided
      if (dto.columns) {
        // Validate columns
        if (dto.columns.length === 0) {
          throw new Error("חייב להגדיר לפחות עמודה אחת");
        }

        const columnNames = dto.columns.map((c) => c.name);
        if (new Set(columnNames).size !== columnNames.length) {
          throw new Error("לא ניתן להגדיר עמודות עם אותו שם");
        }

        // Delete existing columns
        await client.query(
          `DELETE FROM admin_table_columns WHERE table_id = $1::UUID`,
          [id],
        );

        // Insert new columns
        for (let i = 0; i < dto.columns.length; i++) {
          const column = dto.columns[i];
          await client.query(
            `INSERT INTO admin_table_columns (table_id, name, data_type, is_required, display_order)
             VALUES ($1::UUID, $2, $3, $4, $5)`,
            [
              id,
              column.name,
              column.data_type,
              column.is_required || false,
              column.display_order !== undefined ? column.display_order : i,
            ],
          );
        }

        // Note: Existing rows are not automatically updated - their data might become invalid
        // This is intentional - admins should be careful when changing table structure
      }

      await client.query("COMMIT");

      // Fetch updated table
      return await this.getTableById(id, false);
    } catch (err) {
      const error = err as Error;
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete table (CASCADE will delete columns and rows)
   */
  async deleteTable(id: string) {
    try {
      const result = await this.pool.query(
        `DELETE FROM admin_tables WHERE id = $1::UUID RETURNING id`,
        [id],
      );

      if (result.rows.length === 0) {
        throw new Error("טבלה לא נמצאה");
      }

      return { success: true };
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה במחיקת טבלה: ${error.message}`);
    }
  }

  /**
   * Get table rows with pagination
   */
  async getTableRows(
    tableId: string,
    pagination?: { page: number; limit: number },
  ) {
    try {
      let query = `SELECT * FROM admin_table_rows WHERE table_id = $1::UUID ORDER BY created_at DESC`;
      const params: unknown[] = [tableId];

      if (pagination) {
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(pagination.limit, (pagination.page - 1) * pagination.limit);
      }

      const rowsResult = await this.pool.query(query, params);

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM admin_table_rows WHERE table_id = $1::UUID`,
        [tableId],
      );

      return {
        rows: rowsResult.rows,
        total: parseInt(countResult.rows[0].count),
        page: pagination?.page || 1,
        limit: pagination?.limit || rowsResult.rows.length,
      };
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה בטעינת רשומות: ${error.message}`);
    }
  }

  /**
   * Create a new row
   */
  async createRow(tableId: string, dto: CreateRowDto, userId: string) {
    try {
      // Get table columns
      const columnsResult = await this.pool.query(
        `SELECT * FROM admin_table_columns WHERE table_id = $1::UUID ORDER BY display_order`,
        [tableId],
      );

      if (columnsResult.rows.length === 0) {
        throw new Error("טבלה לא נמצאה או שאין בה עמודות");
      }

      const columns = columnsResult.rows;

      // Validate row data
      const validation = this.validateRowData(columns, dto.data);
      if (!validation.valid) {
        throw new Error(validation.error || "נתונים לא תקינים");
      }

      // Normalize row data
      const normalizedData = this.normalizeRowData(columns, dto.data);

      // Insert row
      const result = await this.pool.query(
        `INSERT INTO admin_table_rows (table_id, data, created_by)
         VALUES ($1::UUID, $2::jsonb, $3::UUID)
         RETURNING *`,
        [tableId, JSON.stringify(normalizedData), userId],
      );

      return result.rows[0];
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה ביצירת רשומה: ${error.message}`);
    }
  }

  /**
   * Update a row
   */
  async updateRow(
    tableId: string,
    rowId: string,
    dto: UpdateRowDto,
    userId: string,
  ) {
    try {
      // Get table columns
      const columnsResult = await this.pool.query(
        `SELECT * FROM admin_table_columns WHERE table_id = $1::UUID ORDER BY display_order`,
        [tableId],
      );

      if (columnsResult.rows.length === 0) {
        throw new Error("טבלה לא נמצאה או שאין בה עמודות");
      }

      const columns = columnsResult.rows;

      // Validate row data
      const validation = this.validateRowData(columns, dto.data);
      if (!validation.valid) {
        throw new Error(validation.error || "נתונים לא תקינים");
      }

      // Normalize row data
      const normalizedData = this.normalizeRowData(columns, dto.data);

      // Update row
      const result = await this.pool.query(
        `UPDATE admin_table_rows 
         SET data = $1::jsonb, updated_by = $2::UUID, updated_at = NOW()
         WHERE id = $3::UUID AND table_id = $4::UUID
         RETURNING *`,
        [JSON.stringify(normalizedData), userId, rowId, tableId],
      );

      if (result.rows.length === 0) {
        throw new Error("רשומה לא נמצאה");
      }

      return result.rows[0];
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה בעדכון רשומה: ${error.message}`);
    }
  }

  /**
   * Delete a row
   */
  async deleteRow(tableId: string, rowId: string) {
    try {
      const result = await this.pool.query(
        `DELETE FROM admin_table_rows 
         WHERE id = $1::UUID AND table_id = $2::UUID 
         RETURNING id`,
        [rowId, tableId],
      );

      if (result.rows.length === 0) {
        throw new Error("רשומה לא נמצאה");
      }

      return { success: true };
    } catch (err) {
      const error = err as Error;
      throw new Error(`שגיאה במחיקת רשומה: ${error.message}`);
    }
  }
}
