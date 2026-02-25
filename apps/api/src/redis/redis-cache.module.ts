// File overview:
// - Purpose: Wrap and export `RedisCacheService` bound to the global `RedisModule` client.
// - Reached from: Imported wherever caching helpers are needed.
// - Provides: Simple DI module exporting `RedisCacheService`.
import { Module } from "@nestjs/common";
import { RedisCacheService } from "./redis-cache.service";
import { RedisModule } from "./redis.module";

@Module({
  imports: [RedisModule],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
