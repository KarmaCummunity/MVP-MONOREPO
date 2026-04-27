import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";
import {
  createPostsTableFromScratch,
  patchPostsTableColumns,
} from "./posts-schema.ensure-posts-table.migrate";

/**
 * Ensure posts table exists with correct schema, create/migrate if needed.
 */
export async function ensurePostsTable(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'posts' AND table_schema = 'public'
                ) AS exists;
            `);

    if (!tableCheck.rows[0]?.exists) {
      await createPostsTableFromScratch(pool, logger);
      return;
    }

    const columnsCheck = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'posts' AND table_schema = 'public'
                `);

    const columns = columnsCheck.rows.map((r) => r.column_name);

    if (!columns.includes("id") || !columns.includes("author_id")) {
      logger.log("⚠️  Detected legacy posts table structure - recreating...");
      logger.log(`   - Has id column: ${columns.includes("id")}`);
      logger.log(`   - Has author_id column: ${columns.includes("author_id")}`);
      await pool.query("DROP TABLE IF EXISTS posts CASCADE;");
      await createPostsTableFromScratch(pool, logger);
      return;
    }

    await patchPostsTableColumns(pool, logger, columns);
  } catch (error) {
    logger.error("❌ Failed to ensure posts table:", error);
  }
}
