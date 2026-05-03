// Script to add image_url column to community_group_challenges table
import { Pool } from "pg";
import * as path from "node:path";
import * as fs from "node:fs";
import * as dotenv from "dotenv";

// Load .env from KC-MVP-server directory
const envPath = path.join(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ Loaded .env from:", envPath);
} else {
  dotenv.config();
  console.log("✅ Using default .env");
}

async function addImageUrlColumn() {
  // Use DATABASE_URL if available, otherwise build from individual vars
  const connectionString = process.env.DATABASE_URL;
  const config = connectionString
    ? { connectionString }
    : {
        host: process.env.POSTGRES_HOST || process.env.PGHOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432),
        user: process.env.POSTGRES_USER || process.env.PGUSER || "kc",
        password:
          process.env.POSTGRES_PASSWORD ||
          process.env.PGPASSWORD ||
          "kc_password",
        database: process.env.POSTGRES_DB || process.env.PGDATABASE || "kc_db",
      };

  const pool = new Pool(config);

  try {
    console.log(
      "🔧 Adding image_url column to community_group_challenges table...",
    );
    console.log(
      "📍 Database config:",
      connectionString ? "Using DATABASE_URL" : config,
    );

    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'community_group_challenges' AND column_name = 'image_url'
          ) THEN
              ALTER TABLE community_group_challenges ADD COLUMN image_url TEXT;
              RAISE NOTICE 'Column image_url added successfully';
          ELSE
              RAISE NOTICE 'Column image_url already exists';
          END IF;
      END $$;
    `);

    console.log("✅ Migration completed successfully!");

    // Verify the column exists
    const verify = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'community_group_challenges' 
      AND column_name = 'image_url'
    `);

    if (verify.rows.length > 0) {
      console.log("✅ Verified: image_url column exists");
      console.log("   Type:", verify.rows[0].data_type);
    } else {
      console.error("❌ Column still not found after migration!");
    }
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

(async () => {
  try {
    await addImageUrlColumn();
    console.log("✨ Done!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
})();
