/**
 * PostgreSQL SSL/TLS options for `pg` with server certificate verification enabled.
 * Prefer PG_SSL_CA or PGSSLROOTCERT when the provider uses a private CA chain.
 */
import * as fs from "node:fs";

/** True when SSL should be used for the Pool (env flags or sslmode=require in URL). */
export function isPgSslEnabled(connectionString?: string | null): boolean {
  const sslFlag =
    process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE;
  const fromEnv =
    sslFlag !== undefined &&
    sslFlag !== "" &&
    /^(1|true|require)$/i.test(String(sslFlag));
  const fromUrl =
    !!connectionString && /sslmode=require/i.test(connectionString);
  return fromEnv || fromUrl;
}

/**
 * TLS options with rejectUnauthorized: true (addresses Sonar/server-verification rules).
 * Optional CA bundle path avoids MITM while staying compatible with managed Postgres.
 */
export function buildVerifiedPgSslOptions(): {
  rejectUnauthorized: true;
  ca?: string;
} {
  const caPath = process.env.PG_SSL_CA || process.env.PGSSLROOTCERT;
  let ca: string | undefined;
  if (caPath) {
    try {
      if (fs.existsSync(caPath)) {
        ca = fs.readFileSync(caPath, "utf8");
      }
    } catch {
      // Rely on default trust store if CA file is unreadable
    }
  }
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}
