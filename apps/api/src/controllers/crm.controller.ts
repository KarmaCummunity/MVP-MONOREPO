import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Inject,
  Logger,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";

interface CreateContactDto {
  name: string;
  capabilities?: string;
  desire?: string;
  time_availability?: string;
  source?: string; // Where they came from
  referrer?: string; // Who brought them
  status?: "active" | "inactive";
  created_by?: string;
}

interface UpdateContactDto {
  name?: string;
  capabilities?: string;
  desire?: string;
  time_availability?: string;
  source?: string;
  referrer?: string;
  status?: "active" | "inactive";
}

@Controller("/api/crm")
export class CrmController {
  private readonly logger = new Logger(CrmController.name);
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
          AND table_name = 'crm_contacts'
        );
      `);

      if (!checkTable.rows[0].exists) {
        this.logger.log("📋 Creating crm_contacts table...");
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS crm_contacts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            capabilities TEXT,
            desire TEXT,
            time_availability TEXT,
            source VARCHAR(255),
            referrer VARCHAR(255),
            status VARCHAR(20) DEFAULT 'active',
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);

        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_crm_contacts_name ON crm_contacts (name)",
        );
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts (status)",
        );

        // Trigger for updated_at
        await this.pool.query(`
           DO $$
           BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_crm_contacts_updated_at') THEN
                   CREATE TRIGGER update_crm_contacts_updated_at 
                   BEFORE UPDATE ON crm_contacts 
                   FOR EACH ROW 
                   EXECUTE FUNCTION update_updated_at_column();
               END IF;
           END
           $$;
        `);

        this.logger.log("✅ crm_contacts table created successfully");
      }
    } catch (error) {
      this.logger.error("❌ Error ensuring crm_contacts table:", error);
    }
  }

  @Get()
  async getAllContacts(
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    await this.ensureTable();

    const cacheKey = `crm_contacts_list_${status || "all"}_${search || ""}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    try {
      let query = `SELECT * FROM crm_contacts WHERE 1=1`;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR capabilities ILIKE $${paramIndex} OR source ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      const { rows } = await this.pool.query(query, params);
      await this.redisCache.set(cacheKey, rows, this.CACHE_TTL);

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error fetching CRM contacts:", error);
      return { success: false, error: "Failed to fetch contacts", data: [] };
    }
  }

  @Post()
  async createContact(@Body() dto: CreateContactDto) {
    await this.ensureTable();

    try {
      if (!dto.name) {
        return { success: false, error: "Name is required" };
      }

      // Simple handling for created_by - assuming it's passed as UUID or handled by frontend
      // In a real scenario, we'd validate the user UUID.

      const { rows } = await this.pool.query(
        `INSERT INTO crm_contacts (name, capabilities, desire, time_availability, source, referrer, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::UUID)
         RETURNING *`,
        [
          dto.name,
          dto.capabilities || null,
          dto.desire || null,
          dto.time_availability || null,
          dto.source || null,
          dto.referrer || null,
          dto.status || "active",
          dto.created_by || null, // Assuming UUID string or null
        ],
      );

      await this.redisCache.invalidatePattern("crm_contacts_list_*");
      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error creating CRM contact:", error);
      return { success: false, error: "Failed to create contact" };
    }
  }

  @Patch(":id")
  async updateContact(@Param("id") id: string, @Body() dto: UpdateContactDto) {
    await this.ensureTable();

    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (dto.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(dto.name);
        paramIndex++;
      }
      if (dto.capabilities !== undefined) {
        updates.push(`capabilities = $${paramIndex}`);
        params.push(dto.capabilities);
        paramIndex++;
      }
      if (dto.desire !== undefined) {
        updates.push(`desire = $${paramIndex}`);
        params.push(dto.desire);
        paramIndex++;
      }
      if (dto.time_availability !== undefined) {
        updates.push(`time_availability = $${paramIndex}`);
        params.push(dto.time_availability);
        paramIndex++;
      }
      if (dto.source !== undefined) {
        updates.push(`source = $${paramIndex}`);
        params.push(dto.source);
        paramIndex++;
      }
      if (dto.referrer !== undefined) {
        updates.push(`referrer = $${paramIndex}`);
        params.push(dto.referrer);
        paramIndex++;
      }
      if (dto.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(dto.status);
        paramIndex++;
      }

      if (updates.length === 0)
        return { success: false, error: "No fields to update" };

      params.push(id);
      const { rows } = await this.pool.query(
        `UPDATE crm_contacts SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        params,
      );

      if (rows.length === 0)
        return { success: false, error: "Contact not found" };

      await this.redisCache.invalidatePattern("crm_contacts_list_*");
      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error updating CRM contact:", error);
      return { success: false, error: "Failed to update contact" };
    }
  }

  @Delete(":id")
  async deleteContact(@Param("id") id: string) {
    await this.ensureTable();

    try {
      const { rows } = await this.pool.query(
        `DELETE FROM crm_contacts WHERE id = $1 RETURNING id`,
        [id],
      );
      if (rows.length === 0)
        return { success: false, error: "Contact not found" };

      await this.redisCache.invalidatePattern("crm_contacts_list_*");
      return { success: true, message: "Contact deleted successfully" };
    } catch (error) {
      this.logger.error("Error deleting CRM contact:", error);
      return { success: false, error: "Failed to delete contact" };
    }
  }
}
