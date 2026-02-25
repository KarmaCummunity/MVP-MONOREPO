/**
 * Script to add google_id column to user_profiles table
 * Run with: npm run add:google-id or ts-node -r tsconfig-paths/register src/scripts/add-google-id-column.ts
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function addGoogleIdColumn() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const pool = new Pool({ connectionString });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("📝 Checking if google_id column exists...");

    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'google_id'
    `);

    if (columnCheck.rows.length === 0) {
      console.log("📝 google_id column does not exist, creating it...");
      await client.query(`
        ALTER TABLE user_profiles ADD COLUMN google_id TEXT;
      `);
      console.log("✅ google_id column created");
    } else {
      console.log("✅ google_id column already exists");
    }

    // Check if unique constraint exists
    const constraintCheck = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'user_profiles_google_id_key'
    `);

    if (constraintCheck.rows.length === 0) {
      console.log(
        "📝 google_id unique constraint does not exist, creating it...",
      );
      await client.query(`
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_google_id_key UNIQUE (google_id);
      `);
      console.log("✅ google_id unique constraint created");
    } else {
      console.log("✅ google_id unique constraint already exists");
    }

    // Check if index exists
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_google_id'
    `);

    if (indexCheck.rows.length === 0) {
      console.log("📝 google_id index does not exist, creating it...");
      await client.query(`
        CREATE INDEX idx_user_profiles_google_id ON user_profiles (google_id) WHERE google_id IS NOT NULL;
      `);
      console.log("✅ google_id index created");
    } else {
      console.log("✅ google_id index already exists");
    }

    await client.query("COMMIT");
    console.log("✅ All operations completed successfully");
  } catch (err) {
    const error = err as Error;
    await client.query("ROLLBACK");
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addGoogleIdColumn()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
