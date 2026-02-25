// File overview:
// - Purpose: Provide a global PostgreSQL `Pool` via DI token `PG_POOL` with flexible env config (Railway/local).
// - Reached from: Imported by `AppModule` and any provider/controller injecting `PG_POOL`.
// - Env inputs: `DATABASE_URL` (preferred) or discrete POSTGRES_* / PG* vars and optional SSL flags.
// - Provides: `PG_POOL` provider; exports for use across the app.

// TODO: Add database connection health checks and retry logic
// TODO: Implement proper connection pooling configuration (max connections, idle timeout)
// TODO: Add database migration management system
// TODO: Add proper error handling for database connection failures
// TODO: Add database performance monitoring and logging
// TODO: Implement database transaction management service
// TODO: Add database backup and recovery mechanisms
// TODO: Add environment-specific database configurations
// TODO: Implement database connection graceful shutdown
// TODO: Add database query performance profiling in development mode
import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";

export const PG_POOL = "PG_POOL";

function isSslEnabled(
  sslFlag: string | undefined,
  connectionString?: string,
): boolean {
  if (sslFlag && /^(1|true|require)$/i.test(sslFlag)) return true;
  if (connectionString && /sslmode=require/i.test(connectionString))
    return true;
  return false;
}

function createPoolFromConnectionString(connectionString: string): Pool {
  const sslFlag =
    process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE;
  const sslEnabled = isSslEnabled(sslFlag, connectionString);

  return new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

function validateDatabasePassword(password: string | undefined): void {
  if (!password) {
    console.error("❌ FATAL: Database password is required!");
    console.error(
      "   Set POSTGRES_PASSWORD or PGPASSWORD environment variable",
    );
    console.error("   Or use DATABASE_URL connection string");
    throw new Error("Database password is required. Check your .env file.");
  }
}

function createPoolFromEnvVars(): Pool {
  const host = process.env.POSTGRES_HOST || process.env.PGHOST || "localhost";
  const port = Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5435);
  const user = process.env.POSTGRES_USER || process.env.PGUSER || "kc";
  const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
  const database = process.env.POSTGRES_DB || process.env.PGDATABASE || "kc_db";

  validateDatabasePassword(password);

  const sslFlag =
    process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE;
  const sslEnabled = isSslEnabled(sslFlag);

  return new Pool({
    host,
    port,
    user,
    password,
    database,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (connectionString) {
          return createPoolFromConnectionString(connectionString);
        }
        return createPoolFromEnvVars();
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
