#!/usr/bin/env ts-node
/**
 * Environment Separation Verification Script
 *
 * Purpose: Verifies that development and production environments are properly separated
 * by checking that they use different databases and have different data.
 *
 * Usage:
 *   # Check development environment
 *   DATABASE_URL="<dev-url>" ENVIRONMENT=development ts-node src/scripts/verify-separation.ts
 *
 *   # Check production environment
 *   DATABASE_URL="<prod-url>" ENVIRONMENT=production ts-node src/scripts/verify-separation.ts
 */

import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function verifySeparation() {
  const environment = process.env.ENVIRONMENT || "unknown";
  const databaseUrl = process.env.DATABASE_URL;

  console.log(`\n🔍 בודק הפרדת סביבות עבור: ${environment.toUpperCase()}\n`);

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL לא מוגדר!");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log("✅ התחבר למסד הנתונים\n");

    // Get database identifier (from connection string)
    const dbInfo = extractDbInfo(databaseUrl);
    console.log("📊 מידע על מסד הנתונים:");
    console.log(`  Host: ${dbInfo.host}`);
    console.log(`  Database: ${dbInfo.database}\n`);

    // Verify environment separation by checking host patterns
    // This checks the database host to ensure you're connecting to the right environment
    if (environment === "development") {
      if (
        dbInfo.host.includes("localhost") ||
        dbInfo.host.includes("127.0.0.1") ||
        dbInfo.host.includes("postgres-a3d6beef") ||
        dbInfo.database.includes("dev") ||
        dbInfo.database.includes("test")
      ) {
        console.log("✅ זה נראה כמו מסד נתונים של Development\n");
      } else if (
        dbInfo.host.includes("railway.app") ||
        dbInfo.host.includes("production") ||
        (!dbInfo.host.includes("localhost") &&
          !dbInfo.host.includes("127.0.0.1"))
      ) {
        console.error("🚨 זה נראה כמו מסד נתונים של PRODUCTION!");
        console.error(
          "   אתה מנסה לבדוק development אבל מחובר ל-production!\n",
        );
        console.error(`   Host: ${dbInfo.host}`);
        console.error(`   Database: ${dbInfo.database}\n`);
        process.exit(1);
      }
    } else if (environment === "production") {
      if (
        dbInfo.host.includes("railway.app") ||
        dbInfo.host.includes("production") ||
        (!dbInfo.host.includes("localhost") &&
          !dbInfo.host.includes("127.0.0.1") &&
          !dbInfo.host.includes("dev"))
      ) {
        console.log("✅ זה נראה כמו מסד נתונים של Production\n");
      } else if (
        dbInfo.host.includes("localhost") ||
        dbInfo.host.includes("127.0.0.1") ||
        dbInfo.database.includes("dev") ||
        dbInfo.database.includes("test")
      ) {
        console.error("🚨 זה נראה כמו מסד נתונים של DEVELOPMENT!");
        console.error(
          "   אתה מנסה לבדוק production אבל מחובר ל-development!\n",
        );
        console.error(`   Host: ${dbInfo.host}`);
        console.error(`   Database: ${dbInfo.database}\n`);
        process.exit(1);
      }
    }

    // Count tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    const tableCount = parseInt(tablesResult.rows[0].count);
    console.log(`📋 מספר טבלאות: ${tableCount}`);

    // Count users
    const usersResult = await client
      .query(
        `
      SELECT COUNT(*) as count FROM user_profiles
    `,
      )
      .catch(() => ({ rows: [{ count: 0 }] }));
    const userCount = parseInt(usersResult.rows[0].count);
    console.log(`👥 מספר משתמשים: ${userCount}`);

    // Count posts
    const postsResult = await client
      .query(
        `
      SELECT COUNT(*) as count FROM posts
    `,
      )
      .catch(() => ({ rows: [{ count: 0 }] }));
    const postCount = parseInt(postsResult.rows[0].count);
    console.log(`📝 מספר פוסטים: ${postCount}`);

    // Count donations
    const donationsResult = await client
      .query(
        `
      SELECT COUNT(*) as count FROM donations
    `,
      )
      .catch(() => ({ rows: [{ count: 0 }] }));
    const donationCount = parseInt(donationsResult.rows[0].count);
    console.log(`💰 מספר תרומות: ${donationCount}`);

    console.log("\n" + "=".repeat(60));
    console.log("סיכום:");
    console.log("=".repeat(60));
    console.log(`סביבה: ${environment.toUpperCase()}`);
    console.log(`טבלאות: ${tableCount}`);
    console.log(`משתמשים: ${userCount}`);
    console.log(`פוסטים: ${postCount}`);
    console.log(`תרומות: ${donationCount}`);
    console.log("=".repeat(60) + "\n");

    // Recommendations
    if (environment === "development" && userCount > 100) {
      console.log("💡 יש הרבה משתמשים בסביבת dev. שקול לנקות נתונים ישנים.\n");
    }

    if (environment === "production" && userCount === 0) {
      console.log("⚠️  אין משתמשים בסביבת production! זה תקין?\n");
    }
  } catch (error) {
    console.error("❌ שגיאה:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function extractDbInfo(url: string): {
  host: string;
  database: string;
} {
  try {
    // Format: postgresql://user:password@host:port/database
    // We extract host and database name, but NOT the password for security
    const match = url.match(
      /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/,
    );
    if (match) {
      return {
        host: match[3],
        database: match[5],
      };
    }
  } catch {
    // Ignore
  }
  return { host: "unknown", database: "unknown" };
}

verifySeparation();
