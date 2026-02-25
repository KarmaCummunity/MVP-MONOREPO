import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller";
import { PlacesController } from "./controllers/places.controller";
import { RateLimitController } from "./controllers/rate-limit.controller";
import { RedisTestController } from "./controllers/redis-test.controller";
import { RedisModule } from "../redis/redis.module";
import { RedisCacheModule } from "../redis/redis-cache.module";
import { AuthModule } from "../modules/auth/auth.module";

@Module({
  imports: [RedisModule, RedisCacheModule, AuthModule],
  controllers: [
    HealthController,
    PlacesController,
    RateLimitController,
    ...(process.env.NODE_ENV !== "production" ? [RedisTestController] : []),
  ],
})
export class SharedModule {}
