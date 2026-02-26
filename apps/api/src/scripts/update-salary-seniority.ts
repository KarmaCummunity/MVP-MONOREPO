#!/usr/bin/env ts-node
/**
 * Update Salary and Seniority Script
 *
 * Purpose: Updates all existing users in user_profiles table with:
 * - salary = 0 (if NULL)
 * - seniority_start_date = CURRENT_DATE (if NULL)
 *
 * Usage:
 *   ts-node src/scripts/update-salary-seniority.ts
 */

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

async function updateSalaryAndSeniority() {
  try {
    await client.connect();
    console.log("🔌 Connected to DB\n");

    // Check if columns exist
    const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name IN ('salary', 'seniority_start_date')
        `);

    const existingColumns = columnsCheck.rows.map((r) => r.column_name);

    if (!existingColumns.includes("salary")) {
      console.log("📝 Adding salary column...");
      await client.query(`
                ALTER TABLE user_profiles 
                ADD COLUMN salary DECIMAL(10,2) DEFAULT 0
            `);
      console.log("✅ Added salary column\n");
    } else {
      console.log("✅ salary column already exists");
    }

    if (!existingColumns.includes("seniority_start_date")) {
      console.log("📝 Adding seniority_start_date column...");
      await client.query(`
                ALTER TABLE user_profiles 
                ADD COLUMN seniority_start_date DATE DEFAULT CURRENT_DATE
            `);
      console.log("✅ Added seniority_start_date column\n");
    } else {
      console.log("✅ seniority_start_date column already exists\n");
    }

    // Count users to update
    const countResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN salary IS NULL THEN 1 END) as null_salary,
                COUNT(CASE WHEN seniority_start_date IS NULL THEN 1 END) as null_seniority
            FROM user_profiles
        `);

    const { total, null_salary, null_seniority } = countResult.rows[0];
    console.log(`📊 Total users: ${total}`);
    console.log(`   Users with NULL salary: ${null_salary}`);
    console.log(`   Users with NULL seniority_start_date: ${null_seniority}\n`);

    // Update salary to 0 if NULL
    if (parseInt(String(null_salary), 10) > 0) {
      console.log("💰 Updating salary to 0 for NULL values...");
      const salaryResult = await client.query(`
                UPDATE user_profiles 
                SET salary = 0
                WHERE salary IS NULL
            `);
      console.log(
        `✅ Updated ${salaryResult.rowCount} users with salary = 0\n`,
      );
    } else {
      console.log("✅ All users already have salary set\n");
    }

    // Update seniority_start_date to CURRENT_DATE if NULL
    if (parseInt(String(null_seniority), 10) > 0) {
      console.log(
        "📅 Updating seniority_start_date to CURRENT_DATE for NULL values...",
      );
      const seniorityResult = await client.query(`
                UPDATE user_profiles 
                SET seniority_start_date = CURRENT_DATE
                WHERE seniority_start_date IS NULL
            `);
      console.log(
        `✅ Updated ${seniorityResult.rowCount} users with seniority_start_date = CURRENT_DATE\n`,
      );
    } else {
      console.log("✅ All users already have seniority_start_date set\n");
    }

    // Verify updates
    const verifyResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN salary IS NULL THEN 1 END) as null_salary,
                COUNT(CASE WHEN seniority_start_date IS NULL THEN 1 END) as null_seniority,
                AVG(salary) as avg_salary,
                MIN(seniority_start_date) as earliest_seniority,
                MAX(seniority_start_date) as latest_seniority
            FROM user_profiles
        `);

    const verify = verifyResult.rows[0];
    console.log("📊 Verification:");
    console.log(`   Total users: ${verify.total}`);
    console.log(`   Users with NULL salary: ${verify.null_salary}`);
    console.log(
      `   Users with NULL seniority_start_date: ${verify.null_seniority}`,
    );
    console.log(
      `   Average salary: ₪${parseFloat(verify.avg_salary || 0).toFixed(2)}`,
    );
    console.log(
      `   Earliest seniority date: ${verify.earliest_seniority || "N/A"}`,
    );
    console.log(
      `   Latest seniority date: ${verify.latest_seniority || "N/A"}\n`,
    );

    console.log("✅ Update completed successfully! 🎉\n");
  } catch (error) {
    console.error("❌ Error updating salary and seniority:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔌 Disconnected from DB");
  }
}

// Run the update
updateSalaryAndSeniority();
