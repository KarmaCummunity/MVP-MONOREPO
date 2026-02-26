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

import { Logger } from "@nestjs/common";
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const logger = new Logger("VerifySeparation");

async function verifySeparation() {
  const environment = process.env.ENVIRONMENT || "unknown";
  const databaseUrl = process.env.DATABASE_URL;

  logger.log(
    `Checking environment separation for: ${environment.toUpperCase()}`,
  );

  if (!databaseUrl) {
    logger.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    logger.log("Connected to database");

    const dbInfo = extractDbInfo(databaseUrl);
    logger.log("Database info:");
    logger.log(`  Host: ${dbInfo.host}`);
    logger.log(`  Database: ${dbInfo.database}`);

    if (environment === "development") {
      if (
        dbInfo.host.includes("localhost") ||
        dbInfo.host.includes("127.0.0.1") ||
        dbInfo.host.includes("postgres-a3d6beef") ||
        dbInfo.database.includes("dev") ||
        dbInfo.database.includes("test")
      ) {
        logger.log("This looks like a Development database");
      } else if (
        dbInfo.host.includes("railway.app") ||
        dbInfo.host.includes("production") ||
        (!dbInfo.host.includes("localhost") &&
          !dbInfo.host.includes("127.0.0.1"))
      ) {
        logger.error("This looks like a PRODUCTION database!");
        logger.error(
          "You are checking development but connected to production!",
        );
        logger.error(`  Host: ${dbInfo.host}`);
        logger.error(`  Database: ${dbInfo.database}`);
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
        logger.log("This looks like a Production database");
      } else if (
        dbInfo.host.includes("localhost") ||
        dbInfo.host.includes("127.0.0.1") ||
        dbInfo.database.includes("dev") ||
        dbInfo.database.includes("test")
      ) {
        logger.error("This looks like a DEVELOPMENT database!");
        logger.error(
          "You are checking production but connected to development!",
        );
        logger.error(`  Host: ${dbInfo.host}`);
        logger.error(`  Database: ${dbInfo.database}`);
        process.exit(1);
      }
    }

    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    const tableCount = parseInt(tablesResult.rows[0].count, 10);
    logger.log(`Table count: ${tableCount}`);

    const usersResult = await client
      .query("SELECT COUNT(*) as count FROM user_profiles")
      .catch(() => ({ rows: [{ count: 0 }] }));
    const userCount = parseInt(usersResult.rows[0].count, 10);
    logger.log(`User count: ${userCount}`);

    const postsResult = await client
      .query("SELECT COUNT(*) as count FROM posts")
      .catch(() => ({ rows: [{ count: 0 }] }));
    const postCount = parseInt(postsResult.rows[0].count, 10);
    logger.log(`Post count: ${postCount}`);

    const donationsResult = await client
      .query("SELECT COUNT(*) as count FROM donations")
      .catch(() => ({ rows: [{ count: 0 }] }));
    const donationCount = parseInt(donationsResult.rows[0].count, 10);
    logger.log(`Donation count: ${donationCount}`);

    logger.log("Summary:");
    logger.log(`  Environment: ${environment.toUpperCase()}`);
    logger.log(`  Tables: ${tableCount}`);
    logger.log(`  Users: ${userCount}`);
    logger.log(`  Posts: ${postCount}`);
    logger.log(`  Donations: ${donationCount}`);

    if (environment === "development" && userCount > 100) {
      logger.log("Many users in dev environment. Consider cleaning old data.");
    }

    if (environment === "production" && userCount === 0) {
      logger.warn("No users in production environment. Is this expected?");
    }
  } catch (error) {
    logger.error("Error:", error);
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
