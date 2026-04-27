#!/usr/bin/env ts-node
// Manual script to force schema initialization on Railway
// Run this if database.init.ts doesn't run automatically on deployment

import { Pool } from "pg";
import * as fs from "node:fs";
import * as path from "node:path";

function flushStatement(statements: string[], current: string): string {
  const trimmed = current.trim();
  if (trimmed) {
    statements.push(trimmed);
  }
  return "";
}

/** Advance past a single-quoted SQL literal; handles doubled quotes (''). */
function consumeSingleQuotedString(
  sql: string,
  start: number,
  prefix: string,
): { i: number; current: string } {
  let cur = prefix + sql[start];
  let i = start + 1;
  const len = sql.length;
  while (i < len) {
    cur += sql[i];
    if (sql[i] === "'") {
      if (i + 1 < len && sql[i + 1] === "'") {
        cur += sql[i + 1];
        i += 2;
        continue;
      }
      i += 1;
      break;
    }
    i += 1;
  }
  return { i, current: cur };
}

/** Advance past a dollar-quoted block ($tag$...$tag$). */
function consumeDollarQuotedString(
  sql: string,
  start: number,
  prefix: string,
): { consumed: boolean; i: number; current: string } {
  const tagMatch = sql.substring(start).match(/^(\$[a-zA-Z0-9_]*\$)/);
  if (!tagMatch) {
    return { consumed: false, i: start, current: prefix };
  }
  const tag = tagMatch[1];
  let cur = prefix + tag;
  let i = start + tag.length;
  const closeIndex = sql.indexOf(tag, i);
  if (closeIndex !== -1) {
    cur += sql.substring(i, closeIndex + tag.length);
    i = closeIndex + tag.length;
  } else {
    cur += sql.substring(i);
    i = sql.length;
  }
  return { consumed: true, i, current: cur };
}

function consumeLineComment(
  sql: string,
  start: number,
  prefix: string,
): { consumed: boolean; i: number; current: string } {
  if (sql[start] !== "-" || start + 1 >= sql.length || sql[start + 1] !== "-") {
    return { consumed: false, i: start, current: prefix };
  }
  const newlineIndex = sql.indexOf("\n", start);
  if (newlineIndex !== -1) {
    return {
      consumed: true,
      i: newlineIndex + 1,
      current: prefix + sql.substring(start, newlineIndex + 1),
    };
  }
  return {
    consumed: true,
    i: sql.length,
    current: prefix + sql.substring(start),
  };
}

function consumeBlockComment(
  sql: string,
  start: number,
  prefix: string,
): { consumed: boolean; i: number; current: string } {
  if (sql[start] !== "/" || start + 1 >= sql.length || sql[start + 1] !== "*") {
    return { consumed: false, i: start, current: prefix };
  }
  const closeIndex = sql.indexOf("*/", start + 2);
  if (closeIndex !== -1) {
    return {
      consumed: true,
      i: closeIndex + 2,
      current: prefix + sql.substring(start, closeIndex + 2),
    };
  }
  return {
    consumed: true,
    i: sql.length,
    current: prefix + sql.substring(start),
  };
}

/**
 * Split SQL file text into statements on semicolons outside quotes and comments.
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const char = sql[i];

    if (char === "'") {
      const r = consumeSingleQuotedString(sql, i, current);
      i = r.i;
      current = r.current;
      continue;
    }

    if (char === "$") {
      const dq = consumeDollarQuotedString(sql, i, current);
      if (dq.consumed) {
        i = dq.i;
        current = dq.current;
        continue;
      }
    }

    const line = consumeLineComment(sql, i, current);
    if (line.consumed) {
      i = line.i;
      current = line.current;
      continue;
    }

    const block = consumeBlockComment(sql, i, current);
    if (block.consumed) {
      i = block.i;
      current = block.current;
      continue;
    }

    if (char === ";") {
      current += char;
      current = flushStatement(statements, current);
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  flushStatement(statements, current);
  return statements;
}

function schemaFilePaths(): string[] {
  return [
    path.join(__dirname, "../database/schema.sql"),
    path.join(__dirname, "../database/challenges-schema.sql"),
    path.join(__dirname, "../database/community-group-challenges-schema.sql"),
  ];
}

async function runSchemaFile(
  client: import("pg").PoolClient,
  schemaPath: string,
): Promise<void> {
  if (!fs.existsSync(schemaPath)) {
    console.warn(`⚠️  Schema file not found: ${schemaPath}`);
    return;
  }

  console.log(`\n📄 Running schema: ${path.basename(schemaPath)}`);
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSqlStatements(schemaSql);

  for (let idx = 0; idx < statements.length; idx += 1) {
    const statement = statements[idx];
    if (!statement.trim()) {
      continue;
    }
    try {
      await client.query(statement.trim());
      console.log(`  ✅ Statement ${idx + 1}/${statements.length} executed`);
    } catch (e) {
      const err = e as Error;
      console.error(`  ❌ Failed at statement #${idx + 1}:`);
      console.error(`  Statement preview: ${statement.substring(0, 100)}...`);
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log(`✅ Completed: ${path.basename(schemaPath)}`);
}

async function forceSchemaInit(): Promise<void> {
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
      for (const schemaPath of schemaFilePaths()) {
        await runSchemaFile(client, schemaPath);
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
