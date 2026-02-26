import { Client } from "pg";
import * as dotenv from "dotenv";
import { format } from "../database/query-builder";

dotenv.config();

async function verify() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL missing");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

    console.log("📊 Database Statistics:\n");

    // Validate table names to prevent SQL injection via pg-format identifier quoting.
    const safeTableNamePattern = /^[a-zA-Z0-9_]+$/;
    let totalRows = 0;
    for (const row of tablesResult.rows) {
      const tableName = row.table_name as string;
      if (!safeTableNamePattern.test(tableName)) {
        console.warn(`⚠️  Skipping table with unsafe name: "${tableName}"`);
        continue;
      }
      const countResult = await client.query(
        format(`SELECT COUNT(*) FROM %I`, tableName),
      );
      const count = parseInt(String(countResult.rows[0].count), 10);

      if (count > 0) {
        console.log(
          `  ✓ ${tableName.padEnd(35, " ")} ${count.toString().padStart(6, " ")} rows`,
        );
        totalRows += count;
      }
    }

    console.log(`\n  Total: ${totalRows} rows across all tables\n`);

    // Check for anonymized emails
    try {
      const emailCheck = await client.query(`
                SELECT email FROM user_profiles 
                WHERE email LIKE '%@dev.test' 
                LIMIT 3
            `);

      if (emailCheck.rows.length > 0) {
        console.log("✅ Emails are anonymized:");
        emailCheck.rows.forEach((r: { email: string }) =>
          console.log(`   - ${r.email}`),
        );
      } else {
        console.log("⚠️  Warning: Emails may not be anonymized!");
      }
    } catch {
      // Table might not exist
    }

    console.log("\n✅ Verification complete!\n");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
