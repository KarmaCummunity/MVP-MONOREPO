// Test database helper — isolated test DB connection utilities
import { Pool } from "pg";
import * as fs from "node:fs";
import * as path from "node:path";

/** Create a Pool for the test database (set TEST_DATABASE_URL in env). */
export async function createTestDatabase(): Promise<Pool> {
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://test@127.0.0.1:5432/postgres";

  const pool = new Pool({ connectionString: testDbUrl });

  try {
    await pool.query("SELECT 1");
    console.log("✅ Test database connected");
  } catch (error) {
    console.error("❌ Failed to connect to test database:", error);
    throw error;
  }

  return pool;
}

/** Drop all tables in public schema (does not drop the database). */
export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  try {
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log("✅ Test database cleaned");
  } catch (error) {
    console.error("❌ Failed to cleanup test database:", error);
    throw error;
  }
}

/** Close the test database pool. */
export async function closeTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
  console.log("✅ Test database connection closed");
}

/** Run schema.sql against the test database (creates tables). */
export async function initializeTestDatabaseSchema(pool: Pool): Promise<void> {
  const schemaPath = path.join(__dirname, "../../src/database/schema.sql");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, "utf8");

  await pool.query(schema);
  console.log("✅ Test database schema initialized");
}
