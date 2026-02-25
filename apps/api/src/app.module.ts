// File overview:
// - Purpose: Root Nest module wiring configuration with enhanced security features.
// - Reached from: `main.ts` NestFactory.create(AppModule).
// - Provides: Feature modules for health, places, auth, donations, rides, users, stats, etc.
// - Imports: ConfigModule, DatabaseModule, RedisModule, ThrottlerModule (rate limiting).
// - Providers: `DatabaseInit` runs schema/compat setup on startup.
// - Security: Global rate limiting enabled via ThrottlerModule to prevent abuse.
//
// Refactored per docs/refactoring/MONOREPO_REFACTORING_PLAN.md Phase 1

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

// Database and caching modules
import { DatabaseModule } from "./database/database.module";
import { DatabaseInit } from "./database/database.init";
import { RedisModule } from "./redis/redis.module";
import { RedisCacheModule } from "./redis/redis-cache.module";

// Feature modules
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ItemsModule } from "./modules/items/items.module";
import { DonationsModule } from "./modules/donations/donations.module";
import { RidesModule } from "./modules/rides/rides.module";
import { PostsModule } from "./modules/posts/posts.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ChallengesModule } from "./modules/challenges/challenges.module";
import { ChatModule } from "./modules/chat/chat.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SyncModule } from "./modules/sync/sync.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [
    // Global configuration module - makes env variables available everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting module - prevents abuse by limiting requests per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Database and caching
    DatabaseModule,
    RedisModule,
    RedisCacheModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ItemsModule,
    DonationsModule,
    RidesModule,
    PostsModule,
    StatsModule,
    AdminModule,
    ChallengesModule,
    ChatModule,
    NotificationsModule,
    SyncModule,
    SharedModule,
  ],
  providers: [
    // Database initialization - creates tables and runs migrations on startup
    DatabaseInit,
  ],
})
export class AppModule {}
