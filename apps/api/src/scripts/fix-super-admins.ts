import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment
const envFiles = [".env.production", ".env.development", ".env"];
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

async function fixSuperAdmins() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("🔧 Fixing super admins hierarchy levels...\n");

    // Get root admin ID
    const rootAdmin = await client.query(`
      SELECT id FROM user_profiles WHERE email = 'karmacommunity2.0@gmail.com'
    `);

    if (rootAdmin.rows.length === 0) {
      console.log("❌ Root admin not found");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    const rootAdminId = rootAdmin.rows[0].id;
    console.log("✅ Root admin ID:", rootAdminId);

    // Update super admins
    const result = await client.query(
      `
      UPDATE user_profiles 
      SET hierarchy_level = 1,
          parent_manager_id = $1
      WHERE email IN ('navesarussi@gmail.com', 'mahalalel100@gmail.com')
        AND (parent_manager_id IS DISTINCT FROM $1 OR hierarchy_level IS DISTINCT FROM 1)
      RETURNING email, hierarchy_level, parent_manager_id
    `,
      [rootAdminId],
    );

    console.log(`\n✅ Updated ${result.rows.length} super admin(s):`);
    result.rows.forEach((r: Record<string, unknown>) => {
      console.log(
        `   - ${r.email}: level=${r.hierarchy_level}, parent=${r.parent_manager_id}`,
      );
    });

    await client.query("COMMIT");
    console.log("\n✅ Fix completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Fix failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSuperAdmins().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
