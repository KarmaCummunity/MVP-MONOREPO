import { Client } from "pg";
import * as dotenv from "dotenv";
import path from "path";

// Load env vars
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function checkNotificationsTable() {
  try {
    await client.connect();
    console.log("🔌 Connected to DB");

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
    `);

    if (res.rows.length === 0) {
      console.error('❌ Table "notifications" DOES NOT EXIST!');

      console.log("🛠 Trying to create it now...");
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
      console.log('✅ Created "notifications" table.');
    } else {
      console.log(
        '✅ Table "notifications" exists with columns:',
        res.rows.map((r) => r.column_name).join(", "),
      );
    }
  } catch (err) {
    console.error("❌ Connection or Query Error:", err);
  } finally {
    await client.end();
  }
}

checkNotificationsTable();
