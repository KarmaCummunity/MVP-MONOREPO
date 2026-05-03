#!/usr/bin/env ts-node
/**
 * Environment Variables Validation Script
 *
 * Purpose: Validates that all required environment variables are set correctly
 * and that the environment configuration matches the expected setup.
 *
 * This helps prevent critical errors like:
 * - Connecting dev server to production database
 * - Using the same JWT secret in different environments
 * - Missing CORS configuration
 *
 * Usage:
 *   ts-node src/scripts/check-environment.ts
 *   or
 *   npm run check:env
 */

import * as dotenv from "dotenv";

// Load .env file if exists
dotenv.config();

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

const result: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
  info: [],
};

console.log("🔍 בודק משתני סביבה...\n");

// ========================================
// 1. Check ENVIRONMENT and NODE_ENV
// ========================================
const environment = process.env.ENVIRONMENT;
const nodeEnv = process.env.NODE_ENV;

if (!environment) {
  result.valid = false;
  result.errors.push(
    "❌ ENVIRONMENT לא מוגדר! צריך להיות development או production",
  );
} else {
  result.info.push(`✅ ENVIRONMENT: ${environment}`);

  if (environment !== "development" && environment !== "production") {
    result.valid = false;
    result.errors.push(
      `❌ ENVIRONMENT="${environment}" לא תקין! צריך להיות development או production`,
    );
  }
}

if (!nodeEnv) {
  result.warnings.push("⚠️  NODE_ENV לא מוגדר (מומלץ להגדיר)");
} else {
  result.info.push(`✅ NODE_ENV: ${nodeEnv}`);

  if (environment && nodeEnv !== environment) {
    result.warnings.push(
      `⚠️  NODE_ENV (${nodeEnv}) שונה מ-ENVIRONMENT (${environment})`,
    );
  }
}

// ========================================
// 2. Check DATABASE_URL
// ========================================
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  result.valid = false;
  result.errors.push("❌ DATABASE_URL לא מוגדר!");
} else {
  result.info.push("✅ DATABASE_URL מוגדר");

  // Check if DATABASE_URL matches environment
  if (environment === "development") {
    // DEV should use: postgres-a3d6beef or password mmWLXgvXF...
    if (
      databaseUrl.includes("mmWLXgvXF") ||
      databaseUrl.includes("postgres-a3d6beef")
    ) {
      result.info.push(
        "✅ DATABASE_URL נראה כמו של Development (סיסמה או host נכונים)",
      );
    } else if (databaseUrl.includes("RHkhivARk")) {
      result.valid = false;
      result.errors.push(
        "🚨 DATABASE_URL נראה כמו של PRODUCTION! אתה בסביבת DEV!",
      );
    } else {
      result.warnings.push(
        "⚠️  לא יכול לאמת שה-DATABASE_URL שייך ל-development",
      );
    }
  } else if (environment === "production") {
    // PROD should use: password RHkhivARk...
    if (databaseUrl.includes("RHkhivARk")) {
      result.info.push("✅ DATABASE_URL נראה כמו של Production (סיסמה נכונה)");
    } else if (databaseUrl.includes("mmWLXgvXF")) {
      result.valid = false;
      result.errors.push(
        "🚨 DATABASE_URL נראה כמו של DEVELOPMENT! אתה בסביבת PRODUCTION!",
      );
    } else {
      result.warnings.push(
        "⚠️  לא יכול לאמת שה-DATABASE_URL שייך ל-production",
      );
    }
  }
}

// ========================================
// 3. Check REDIS_URL
// ========================================
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  result.warnings.push("⚠️  REDIS_URL לא מוגדר (Redis לא יעבוד)");
} else {
  result.info.push("✅ REDIS_URL מוגדר");

  // Check if Redis is shared (same password in both environments)
  if (redisUrl.includes("deQMolmzgWZsqeAkiEpZPFvejfGjenEm")) {
    result.warnings.push(
      "⚠️  Redis משותף בין הסביבות! מומלץ ליצור Redis נפרד לכל סביבה",
    );
  } else if (
    environment === "development" &&
    redisUrl.includes("ggCVffISJOmdiIHAXBSQpsQCPfaFbaOR")
  ) {
    result.info.push("✅ Redis נפרד ל-Development");
  }
}

// ========================================
// 4. Check CORS_ORIGIN
// ========================================
const corsOrigin = process.env.CORS_ORIGIN;

if (!corsOrigin) {
  result.warnings.push("⚠️  CORS_ORIGIN לא מוגדר (עלול לגרום לבעיות CORS)");
} else {
  result.info.push("✅ CORS_ORIGIN מוגדר");

  if (environment === "development") {
    if (
      corsOrigin.includes("dev.karma-community-kc.com") ||
      corsOrigin.includes("localhost")
    ) {
      result.info.push("✅ CORS_ORIGIN כולל דומיינים של development");
    } else {
      result.warnings.push(
        "⚠️  CORS_ORIGIN לא כולל dev.karma-community-kc.com או localhost",
      );
    }

    if (
      corsOrigin.includes("karma-community-kc.com") &&
      !corsOrigin.includes("dev.")
    ) {
      result.warnings.push("⚠️  CORS_ORIGIN כולל דומיין production בסביבת dev");
    }
  } else if (environment === "production") {
    if (
      corsOrigin.includes("karma-community-kc.com") &&
      !corsOrigin.includes("dev.")
    ) {
      result.info.push("✅ CORS_ORIGIN כולל דומיין production");
    } else {
      result.warnings.push("⚠️  CORS_ORIGIN לא כולל karma-community-kc.com");
    }

    if (corsOrigin.includes("localhost") || corsOrigin.includes("dev.")) {
      result.warnings.push(
        "⚠️  CORS_ORIGIN כולל דומיינים של development בסביבת production!",
      );
    }
  }
}

// ========================================
// 5. Check JWT_SECRET
// ========================================
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  result.valid = false;
  result.errors.push("❌ JWT_SECRET לא מוגדר! אימות לא יעבוד!");
} else if (jwtSecret.length < 32) {
  result.valid = false;
  result.errors.push(
    `❌ JWT_SECRET קצר מדי (${jwtSecret.length} תווים). צריך לפחות 32 תווים!`,
  );
} else {
  result.info.push(`✅ JWT_SECRET מוגדר (${jwtSecret.length} תווים)`);
}

// ========================================
// 6. Check PORT
// ========================================
const port = process.env.PORT;

if (!port) {
  result.warnings.push("⚠️  PORT לא מוגדר (ישתמש בברירת מחדל)");
} else {
  result.info.push(`✅ PORT: ${port}`);
}

// ========================================
// 7. Check Google OAuth
// ========================================
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (!googleClientId) {
  result.warnings.push(
    "⚠️  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID לא מוגדר (Google OAuth לא יעבוד)",
  );
} else {
  result.info.push("✅ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID מוגדר");
}

// ========================================
// Print Results
// ========================================
console.log("\n" + "=".repeat(60));
console.log("תוצאות בדיקה:");
console.log("=".repeat(60) + "\n");

// Info messages
if (result.info.length > 0) {
  console.log("📋 מידע:");
  result.info.forEach((msg) => console.log(`  ${msg}`));
  console.log("");
}

// Warnings
if (result.warnings.length > 0) {
  console.log("⚠️  אזהרות:");
  result.warnings.forEach((msg) => console.log(`  ${msg}`));
  console.log("");
}

// Errors
if (result.errors.length > 0) {
  console.log("❌ שגיאות קריטיות:");
  result.errors.forEach((msg) => console.log(`  ${msg}`));
  console.log("");
}

// Final verdict
console.log("=".repeat(60));
if (result.valid && result.warnings.length === 0) {
  console.log("✅ כל משתני הסביבה תקינים! 🎉");
} else if (result.valid) {
  console.log("⚠️  יש אזהרות, אבל אפשר להמשיך");
} else {
  console.log("❌ יש שגיאות קריטיות! תקן אותן לפני שממשיך!");
  process.exit(1);
}
console.log("=".repeat(60) + "\n");

// Exit with appropriate code
process.exit(result.valid ? 0 : 1);
