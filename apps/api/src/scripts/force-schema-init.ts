#!/usr/bin/env ts-node
// Manual script to force schema initialization on Railway
// Run this if database.init.ts doesn't run automatically on deployment

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

/** Split SQL file content into executable statements (handles quotes, $tags$, comments). */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = "";
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const char = sql[i];

    // Handle single quoted strings
    if (char === "'") {
      currentStatement += char;
      i++;
      while (i < len) {
        currentStatement += sql[i];
        if (sql[i] === "'") {
          if (i + 1 < len && sql[i + 1] === "'") {
            currentStatement += sql[i + 1];
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Handle dollar quoted strings
    if (char === "$") {
      const tagMatch = sql.substring(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (tagMatch) {
        const tag = tagMatch[1];
        currentStatement += tag;
        i += tag.length;
        const closeIndex = sql.indexOf(tag, i);
        if (closeIndex !== -1) {
          currentStatement += sql.substring(i, closeIndex + tag.length);
          i = closeIndex + tag.length;
        } else {
          currentStatement += sql.substring(i);
          i = len;
        }
        continue;
      }
    }

    // Handle comments
    if (char === "-" && i + 1 < len && sql[i + 1] === "-") {
      const newlineIndex = sql.indexOf("\n", i);
      if (newlineIndex !== -1) {
        currentStatement += sql.substring(i, newlineIndex + 1);
        i = newlineIndex + 1;
      } else {
        currentStatement += sql.substring(i);
        i = len;
      }
      continue;
    }

    if (char === "/" && i + 1 < len && sql[i + 1] === "*") {
      const closeIndex = sql.indexOf("*/", i + 2);
      if (closeIndex !== -1) {
        currentStatement += sql.substring(i, closeIndex + 2);
        i = closeIndex + 2;
      } else {
        currentStatement += sql.substring(i);
        i = len;
      }
      continue;
    }

    // Handle semicolon
    if (char === ";") {
      currentStatement += char;
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      currentStatement = "";
      i++;
      continue;
    }

    currentStatement += char;
    i++;
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

async function forceSchemaInit() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable not set");
    process.exit(1);
  }

  console.log("🔧 Connecting to database...");
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to database");

    try {
      // Find and run schema files
      const schemaPaths = [
        path.join(__dirname, "../database/schema.sql"),
        path.join(__dirname, "../database/challenges-schema.sql"),
        path.join(
          __dirname,
          "../database/community-group-challenges-schema.sql",
        ),
      ];

      for (const schemaPath of schemaPaths) {
        if (!fs.existsSync(schemaPath)) {
          console.warn(`⚠️  Schema file not found: ${schemaPath}`);
          continue;
        }

        console.log(`\n📄 Running schema: ${path.basename(schemaPath)}`);
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        const statements = splitSqlStatements(schemaSql);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.trim()) {
            try {
              await client.query(statement.trim());
              console.log(
                `  ✅ Statement ${i + 1}/${statements.length} executed`,
              );
            } catch (e) {
              const err = e as Error;
              console.error(`  ❌ Failed at statement #${i + 1}:`);
              console.error(
                `  Statement preview: ${statement.substring(0, 100)}...`,
              );
              console.error(`  Error: ${err.message}`);
              // Continue with other statements
            }
          }
        }

        console.log(`✅ Completed: ${path.basename(schemaPath)}`);
      }

      console.log("\n✅ Schema initialization complete!");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Schema initialization failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

forceSchemaInit().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
