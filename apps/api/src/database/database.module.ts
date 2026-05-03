// File overview:
// - Purpose: Provide a global PostgreSQL `Pool` via DI token `PG_POOL` with flexible env config (Railway/local).
// - Reached from: Imported by `AppModule` and any provider/controller injecting `PG_POOL`.
// - Env inputs: `DATABASE_URL` (preferred) or discrete POSTGRES_* / PG* vars and optional SSL flags.
// - Provides: `PG_POOL` provider; exports for use across the app.
import { Global, Module } from "@nestjs/common";
import { Pool } from "pg";
import { buildVerifiedPgSslOptions, isPgSslEnabled } from "./pgSslOptions";

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
          const sslEnabled = isPgSslEnabled(connectionString);

          return new Pool({
            connectionString,
            ssl: sslEnabled ? buildVerifiedPgSslOptions() : undefined,
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
          process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || "";
        const database =
          process.env.POSTGRES_DB || process.env.PGDATABASE || "kc_db";
        const sslEnabled = isPgSslEnabled(null);

        return new Pool({
          host,
          port,
          user,
          password,
          database,
          ssl: sslEnabled ? buildVerifiedPgSslOptions() : undefined,
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
