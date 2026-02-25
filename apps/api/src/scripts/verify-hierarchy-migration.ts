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

async function verifyMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log("🔍 Verifying hierarchy migration...\n");

    // Check if hierarchy_level column exists
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
        AND column_name = 'hierarchy_level'
    `);
    console.log("✅ hierarchy_level column exists:", colCheck.rows.length > 0);

    // Check root admin
    const rootAdmin = await client.query(`
      SELECT email, hierarchy_level, parent_manager_id 
      FROM user_profiles 
      WHERE email = 'karmacommunity2.0@gmail.com'
    `);
    if (rootAdmin.rows.length > 0) {
      const admin = rootAdmin.rows[0];
      console.log("\n✅ Root admin (karmacommunity2.0@gmail.com):");
      console.log(
        "   - hierarchy_level:",
        admin.hierarchy_level,
        admin.hierarchy_level === 0 ? "✅" : "❌",
      );
      console.log(
        "   - parent_manager_id:",
        admin.parent_manager_id,
        admin.parent_manager_id === null ? "✅" : "❌",
      );
    } else {
      console.log("⚠️ Root admin not found");
    }

    // Check super admins
    const superAdmins = await client.query(`
      SELECT email, hierarchy_level, parent_manager_id 
      FROM user_profiles 
      WHERE email IN ('navesarussi@gmail.com', 'mahalalel100@gmail.com')
    `);
    console.log("\n✅ Super admins:");
    superAdmins.rows.forEach((r: Record<string, unknown>) => {
      console.log(`   - ${r.email}:`);
      console.log(
        "     - hierarchy_level:",
        r.hierarchy_level,
        r.hierarchy_level === 1 ? "✅" : "❌",
      );
      console.log(
        "     - has_parent:",
        r.parent_manager_id !== null ? "✅" : "❌",
      );
    });

    // Check history table
    const historyCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'user_hierarchy_history'
    `);
    console.log("\n✅ History table exists:", historyCheck.rows[0].count > 0);

    // Check trigger
    const triggerCheck = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_update_hierarchy_level'
    `);
    console.log("✅ Trigger exists:", triggerCheck.rows.length > 0);

    // Check function
    const functionCheck = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'calculate_hierarchy_level'
    `);
    console.log("✅ Function exists:", functionCheck.rows.length > 0);

    console.log("\n✅ Migration verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
