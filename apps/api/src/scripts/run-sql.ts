import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Check for different env files
const envFiles = [".env.production", ".env.development", ".env"];
let envLoaded = false;

for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    console.log(`📝 Loading environment from ${file}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("⚠️ No .env files found, falling back to process.env");
}

async function runMigration() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error(
      "❌ Please provide a path to the SQL file: npm run run:sql src/database/your-file.sql",
    );
    process.exit(1);
  }
  if (sqlFile.includes("\0")) {
    console.error("❌ Null byte in path – refusing to run.");
    process.exit(1);
  }

  // Resolve and validate path: must stay inside the project root to prevent path traversal.
  const projectRoot = path.resolve(process.cwd());
  const sqlPath = path.resolve(projectRoot, sqlFile);
  if (!sqlPath.startsWith(projectRoot + path.sep)) {
    console.error(`❌ Path traversal detected. Refusing to read: ${sqlPath}`);
    process.exit(1);
  }

  // Only allow .sql files.
  if (path.extname(sqlPath).toLowerCase() !== ".sql") {
    console.error(
      `❌ Only .sql files are allowed. Got: ${path.extname(sqlPath)}`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  // sqlPath has already been validated: inside projectRoot, .sql extension only.
  const sql = fs.readFileSync(sqlPath, "utf8");
  // Sanity-check: the file should only contain SQL-safe characters; reject if it
  // contains null bytes or other binary content that indicates a non-SQL file.
  if (sql.includes("\0")) {
    console.error(
      "❌ SQL file contains binary/null bytes – refusing to execute.",
    );
    process.exit(1);
  }

  // Use the same logic as database.module.ts
  const connectionString = process.env.DATABASE_URL;
  let pool: Pool;

  if (connectionString) {
    console.log("🔗 Connecting via DATABASE_URL");
    const sslFlag =
      process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE;
    const sslEnabled =
      (sslFlag && /^(1|true|require)$/i.test(sslFlag)) ||
      /sslmode=require/i.test(connectionString);

    pool = new Pool({
      connectionString,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    });
  } else {
    console.log("🔗 Connecting via discrete env vars");

    const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
    if (!password) {
      console.error("❌ Database password is required!");
      console.error(
        "   Set POSTGRES_PASSWORD or PGPASSWORD environment variable",
      );
      console.error("   Or use DATABASE_URL connection string");
      process.exit(1);
    }

    pool = new Pool({
      host: process.env.POSTGRES_HOST || process.env.PGHOST || "localhost",
      port: Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5435),
      user: process.env.POSTGRES_USER || process.env.PGUSER || "kc",
      password,
      database: process.env.POSTGRES_DB || process.env.PGDATABASE || "kc_db",
      ssl:
        process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  const client = await pool.connect();
  try {
    console.log(`🚀 Executing migration: ${sqlFile}`);
    await client.query("BEGIN");

    // Split SQL by semicolon if needed, but pg can handle multi-statement strings
    // However, pg's query() only returns the result of the LAST statement if it's a simple string.
    // For migrations, we usually want to know if it finished.

    await client.query(sql);

    await client.query("COMMIT");
    console.log("✅ Migration executed successfully");

    // Print notices if any (RAISE NOTICE in Postgres)
    // Note: pg doesn't easily expose notices via result, but they are emitted as events
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Listen for notices
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

runMigration().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
