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

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        // 1) Prefer a single DATABASE_URL (Railway Postgres addon exposes this)
        const connectionString = process.env.DATABASE_URL;
        if (connectionString) {
          const sslFlag =
            process.env.PG_SSL ||
            process.env.POSTGRES_SSL ||
            process.env.PGSSLMODE;
          const sslEnabled =
            (sslFlag && /^(1|true|require)$/i.test(sslFlag)) ||
            /sslmode=require/i.test(connectionString);

          return new Pool({
            connectionString,
            ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
            // Disable prepared statements to avoid schema caching issues
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          });
        }

        // 2) Fall back to discrete env vars. Support both POSTGRES_* and PG* (Railway style)
        const host =
          process.env.POSTGRES_HOST || process.env.PGHOST || "localhost";
        const port = Number(
          process.env.POSTGRES_PORT || process.env.PGPORT || 5432,
        );
        const user = process.env.POSTGRES_USER || process.env.PGUSER || "kc";
        const password =
          process.env.POSTGRES_PASSWORD ||
          process.env.PGPASSWORD ||
          "kc_password";
        const database =
          process.env.POSTGRES_DB || process.env.PGDATABASE || "kc_db";
        const sslFlag =
          process.env.PG_SSL ||
          process.env.POSTGRES_SSL ||
          process.env.PGSSLMODE;
        const sslEnabled = sslFlag
          ? /^(1|true|require)$/i.test(sslFlag)
          : false;

        return new Pool({
          host,
          port,
          user,
          password,
          database,
          ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
          // Disable prepared statements to avoid schema caching issues
          max: 20, // Maximum number of clients in the pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
