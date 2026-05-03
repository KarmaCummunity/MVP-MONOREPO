import { Client } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function exportData() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL missing");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("✅ Connected to database for export");

    // Get all public tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'migrations%'
    `);

    const tables = res.rows.map((row) => row.table_name as string);
    console.log(
      `Found ${tables.length} tables to export: ${tables.join(", ")}`,
    );

    const exportDir = path.join(process.cwd(), "data-export");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Validate each table name to prevent path traversal: only allow safe identifier chars.
    const safeTableNamePattern = /^[a-zA-Z0-9_]+$/;

    for (const table of tables) {
      if (!safeTableNamePattern.test(table)) {
        console.warn(`⚠️  Skipping table with unsafe name: "${table}"`);
        continue;
      }
      console.log(`Exporting table: ${table}...`);
      const tableData = await client.query(`SELECT * FROM "${table}"`);
      // Use path.basename to ensure no directory traversal in the filename.
      const safeFilename = path.basename(`${table}.json`);
      fs.writeFileSync(
        path.join(exportDir, safeFilename),
        JSON.stringify(tableData.rows, null, 2),
      );
    }

    console.log(`✅ Export completed! Data saved to ${exportDir}`);
  } catch (err) {
    console.error("❌ Export failed:", err);
  } finally {
    await client.end();
  }
}

exportData();
