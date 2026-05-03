// File overview:
// - Purpose: Provide a global Redis client via DI token `REDIS` using ioredis with Railway-friendly config.
// - Reached from: Imported by `AppModule` and `RedisCacheModule`.
// - Env inputs: `REDIS_URL`/`REDIS_PUBLIC_URL`/Upstash vars or host/port + TLS flags.
// - Provides: Connection with logging hooks; masks secrets in logs.
// src/redis/redis.module.ts
import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS = "REDIS";

/** Railway injects REDIS_URL; host/port fragments are easy to misconfigure — require the URL here. */
function isRailwayRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_PROJECT_ID,
  );
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        // Check if Redis is configured - if not, return null (optional Redis)
        const redisUrl =
          process.env.REDIS_URL ||
          process.env.REDIS_PUBLIC_URL ||
          process.env.UPSTASH_REDIS_URL;
        const internalHost =
          process.env.REDIS_HOST ||
          process.env.REDISHOST ||
          process.env.UPSTASH_REDIS_HOST;
        const internalPort =
          process.env.REDIS_PORT ||
          process.env.REDISPORT ||
          process.env.UPSTASH_REDIS_PORT;

        if (isRailwayRuntime()) {
          // On Railway, ONLY use REDIS_URL — never fall back to REDIS_HOST/REDIS_PORT.
          // Railway injects REDIS_HOST=redis.railway.internal (the generic hostname for a
          // service named "redis"), but if the actual Redis service has a different name
          // (e.g. KC-PROD-Rdis → kc-prod-rdis.railway.internal) that hostname won't resolve.
          // The REDIS_URL reference variable always points to the correct service endpoint.
          if (!redisUrl) {
            // eslint-disable-next-line no-console
            console.warn(
              "[redis] ⚠️  Railway detected but REDIS_URL is not set — running without Redis.",
            );
            // eslint-disable-next-line no-console
            console.warn(
              "[redis] 💡 In Railway Dashboard, add a Redis service and link it to this service so REDIS_URL is injected.",
            );
            return null;
          }
          // Validate that REDIS_URL does not contain the generic railway.internal hostname.
          // If it does, the Redis service name likely doesn't match "redis" and the URL
          // was constructed from REDIS_HOST rather than a proper service reference variable.
          try {
            const parsedUrl = new URL(redisUrl);
            if (parsedUrl.hostname === "redis.railway.internal") {
              // eslint-disable-next-line no-console
              console.warn(
                "[redis] ⚠️  REDIS_URL points to redis.railway.internal which may not resolve.",
              );
              // eslint-disable-next-line no-console
              console.warn(
                "[redis] 💡 Ensure REDIS_URL is set as a reference variable to your Redis service (not a hardcoded hostname).",
              );
              // eslint-disable-next-line no-console
              console.warn(
                "[redis] 💡 In Railway Dashboard: Variables → REDIS_URL → set value to ${{Redis.REDIS_URL}} (replace 'Redis' with your service name).",
              );
            }
          } catch {
            // ignore URL parse errors
          }
        }

        // If no Redis configuration is provided, return null (Redis is optional)
        if (!redisUrl && (!internalHost || !internalPort)) {
          // eslint-disable-next-line no-console
          console.warn(
            "[redis] ⚠️  No Redis configuration found - running without Redis cache",
          );
          // eslint-disable-next-line no-console
          console.warn(
            "[redis] 💡 To enable Redis, set REDIS_URL environment variable",
          );
          return null;
        }

        // On Railway, skip the host/port fallback entirely — REDIS_URL is required.
        // Using REDIS_HOST on Railway risks connecting to the wrong hostname (e.g.
        // redis.railway.internal instead of kc-prod-rdis.railway.internal).
        if (isRailwayRuntime() && !redisUrl) {
          return null;
        }

        // Railway Redis may expose rediss:// or REDIS_TLS=true
        const tlsEnabledEnv =
          String(
            process.env.REDIS_TLS || process.env.REDIS_SSL || "",
          ).toLowerCase() === "true";

        const commonOptions = {
          username:
            process.env.REDIS_USERNAME ||
            process.env.REDISUSER ||
            process.env.UPSTASH_REDIS_USERNAME ||
            undefined,
          password:
            process.env.REDIS_PASSWORD ||
            process.env.REDISPASSWORD ||
            process.env.UPSTASH_REDIS_PASSWORD ||
            undefined,
          connectTimeout: 15000,
          // Prevent a single slow command from blocking the event loop indefinitely
          commandTimeout: 5000,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy: (times: number) => Math.min(times * 200, 2000),
          reconnectOnError: (err: Error) =>
            /READONLY|ETIMEDOUT|ECONNRESET/i.test(err.message),
          family: 4,
          // Disable offline queue to prevent memory issues
          enableOfflineQueue: false,
          // Limit retry attempts to prevent infinite loops
          lazyConnect: false,
        } as const;

        // ALWAYS prefer a single connection URL when available (most reliable)
        if (redisUrl) {
          let enableTls = tlsEnabledEnv;
          try {
            const parsed = new URL(redisUrl);
            const isRediss = parsed.protocol === "rediss:";
            if (isRediss) enableTls = true;
          } catch {
            // ignore parse errors – fall back to env flag only
          }

          const client = new Redis(redisUrl, {
            tls: enableTls ? {} : undefined,
            ...commonOptions,
          });
          attachRedisLogging(client, maskRedisUrl(redisUrl));
          return client;
        }

        // Fallback to host/port configuration
        const host = internalHost || "localhost";
        const client = new Redis({
          host,
          port: Number(internalPort),
          tls: tlsEnabledEnv ? {} : undefined,
          ...commonOptions,
        });
        attachRedisLogging(client, `redis://${host}:${internalPort}`);
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}

function maskRedisUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "*".repeat(3);
    return u.toString();
  } catch {
    return url.replace(/:(?:[^@/]+)@/, ":***@");
  }
}

function attachRedisLogging(client: Redis, target: string) {
  // eslint-disable-next-line no-console
  console.log(`[redis] connecting to ${target}`);
  client.on("connect", () => {
    // eslint-disable-next-line no-console
    console.log("[redis] socket connected");
  });
  client.on("ready", async () => {
    // eslint-disable-next-line no-console
    console.log("[redis] ready");

    // Attempt to fix MISCONF error for dev environments
    try {
      // eslint-disable-next-line no-console
      console.log(
        "[redis] attempting to disable stop-writes-on-bgsave-error...",
      );
      await client.config("SET", "stop-writes-on-bgsave-error", "no");
      // eslint-disable-next-line no-console
      console.log("[redis] successfully disabled stop-writes-on-bgsave-error");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[redis] failed to disable stop-writes-on-bgsave-error (might be restricted):",
        err instanceof Error ? err.message : String(err),
      );
    }
  });
  client.on("end", () => {
    // eslint-disable-next-line no-console
    console.log("[redis] connection ended");
  });
  client.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[redis] error", err.message);
  });
}
