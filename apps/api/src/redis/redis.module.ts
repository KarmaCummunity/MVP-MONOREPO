// File overview:
// - Purpose: Provide a global Redis client via DI token `REDIS` using ioredis with Railway-friendly config.
// - Reached from: Imported by `AppModule` and `RedisCacheModule`.
// - Env inputs: `REDIS_URL`/`REDIS_PUBLIC_URL`/Upstash vars or host/port + TLS flags.
// - Provides: Connection with logging hooks; masks secrets in logs.
// src/redis/redis.module.ts
import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS = "REDIS";

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
