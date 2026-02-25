import { Client } from "pg";
import * as dotenv from "dotenv";
import path from "path";

// Try loading env from multiple locations
dotenv.config({ path: path.resolve(__dirname, "../../.env") }); // KC-MVP-server/.env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // KC/DEV/.env

console.log("🔍 Checking Environment...");
if (process.env.DATABASE_URL) {
  console.log(
    "✅ DATABASE_URL found:",
    process.env.DATABASE_URL.replace(/:[^:]+@/, ":****@"),
  );
} else {
  console.error("❌ DATABASE_URL is missing!");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runDebug() {
  try {
    await client.connect();
    console.log("🔌 Connected to DB");

    // Check Tasks Table
    const tasksRes = await client.query(`
      SELECT count(*) as count FROM tasks;
    `);
    console.log(`📊 Tasks count: ${tasksRes.rows[0].count}`);

    // Check Notifications Table
    const notifRes = await client.query(`
      SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
      );
    `);
    const notifExists = notifRes.rows[0].exists;
    console.log(`🔔 Notifications table exists: ${notifExists}`);

    if (notifExists) {
      const colRes = await client.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'
      `);
      console.log(
        "  Columns:",
        colRes.rows.map((r) => r.column_name).join(", "),
      );
    } else {
      console.log("🛠 Creating notifications table...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            user_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, item_id)
        );
       `);
      console.log("✅ Created.");
    }
  } catch (err) {
    console.error("❌ DB Error:", err);
  } finally {
    await client.end();
  }
}

runDebug();
