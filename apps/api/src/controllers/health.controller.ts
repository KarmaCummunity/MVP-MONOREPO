// File overview:
// - Purpose: Lightweight health endpoints (root OK and Redis health ping).
// - Reached from: `AppModule` controller wiring at '/' and '/health/redis'.
// - Provides: App status and Redis connectivity check.
import { Controller, Get, Inject } from "@nestjs/common";
import { REDIS } from "../redis/redis.module";
import Redis from "ioredis";

@Controller("/")
export class HealthController {
  constructor(@Inject(REDIS) private readonly redis: Redis | null) {}

  @Get()
  getRoot() {
    return {
      status: "OK",
      message: "Karma Community Nest Server is running!",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health")
  getHealth() {
    // Simple health check that doesn't depend on Redis
    // This is faster and more reliable for Railway health checks
    return {
      status: "OK",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health/redis")
  async getRedisHealth() {
    if (!this.redis) {
      return { ok: false, error: "Redis not configured" };
    }

    try {
      const pong = await this.redis.ping("health");
      return { ok: true, ping: pong };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}
