// File overview:
// - Purpose: Root Nest module wiring configuration with enhanced security features.
// - Reached from: `main.ts` NestFactory.create(AppModule).
// - Provides: Controllers for health, places, chat, auth, donations, rides, users, stats.
// - Imports: ConfigModule, DatabaseModule, RedisModule, AuthModule, ThrottlerModule (rate limiting).
// - Providers: `DatabaseInit` runs schema/compat setup on startup.
// - Security: Global rate limiting enabled via ThrottlerModule to prevent abuse.
//
// SECURITY IMPROVEMENTS:
// ✅ Added ThrottlerModule for global rate limiting (60 requests per minute per IP)
// ✅ ConfigModule configured as global for easy environment variable access
// ✅ Structured imports with proper organization
//
// TODO: Add proper module organization - group related controllers into feature modules
// TODO: Add health check module with proper database/redis connectivity checks
// TODO: Implement proper module imports/exports structure
// TODO: Add API versioning support
// TODO: Add comprehensive logging module (Winston, etc.)
// TODO: Add API documentation module (Swagger/OpenAPI)
// TODO: Remove test controllers from production builds
// TODO: Add metrics and monitoring module (Prometheus, etc.)

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

// Database and caching modules
import { DatabaseModule } from "./database/database.module";
import { DatabaseInit } from "./database/database.init";
import { RedisModule } from "./redis/redis.module";
import { RedisCacheModule } from "./redis/redis-cache.module";

// Authentication module
import { AuthModule } from "./auth/auth.module";
import { ItemsModule } from "./items/items.module";
import { ServicesModule } from "./services/services.module";

// Controllers
import { HealthController } from "./controllers/health.controller";
import { PlacesController } from "./controllers/places.controller";
import { ChatController } from "./controllers/chat.controller";
import { AuthController } from "./controllers/auth.controller";
import { SessionController } from "./controllers/session.controller";
import { RateLimitController } from "./controllers/rate-limit.controller";
import { DonationsController } from "./controllers/donations.controller";
import { RidesController } from "./controllers/rides.controller";
import { UsersController } from "./controllers/users.controller";
import { StatsController } from "./controllers/stats.controller";
import { RedisTestController } from "./controllers/redis-test.controller";
import { TasksController } from "./controllers/tasks.controller";
import { ChallengesController } from "./controllers/challenges.controller";
import { CommunityGroupChallengesController } from "./controllers/community-group-challenges.controller";
import { ItemsDeliveryController } from "./controllers/items-delivery.controller";
import { ItemsDeliveryService } from "./controllers/items-delivery.service";
import { CommunityMembersController } from "./controllers/community-members.controller";
import { SyncController } from "./controllers/sync.controller";
import { CrmController } from "./controllers/crm.controller";
import { AdminFilesController } from "./controllers/admin-files.controller";
import { AdminTablesController } from "./controllers/admin-tables.controller";
import { PostsController } from "./controllers/posts.controller";
import { NotificationsController } from "./controllers/notifications.controller";
import { AdminTablesService } from "./services/admin-tables.service";

@Module({
  imports: [
    // Global configuration module - makes env variables available everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting module - prevents abuse by limiting requests per IP
    // Default: 60 requests per minute per IP address
    // Can be overridden per controller/route with @Throttle() decorator
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (1 minute)
        limit: 60, // Maximum number of requests in the time window
      },
    ]),

    // Database and caching
    DatabaseModule,
    RedisModule,
    RedisCacheModule,

    // Feature modules
    AuthModule,
    ItemsModule,
    ServicesModule, // User resolution and other shared services
  ],
  controllers: [
    // Core functionality
    HealthController, // Health check endpoints
    PlacesController, // Google Places API integration

    // Authentication and session management
    AuthController, // User registration, login, Google OAuth
    SessionController, // Session management

    // Communication
    ChatController, // Chat and messaging

    // Main features
    DonationsController, // Donation CRUD operations
    RidesController, // Ride sharing functionality
    ItemsDeliveryController, // Items delivery and search
    UsersController, // User profile management
    PostsController, // Posts management
    NotificationsController, // Notifications management

    // Analytics and monitoring
    StatsController, // Statistics and analytics
    RateLimitController, // Rate limit status endpoint
    TasksController, // Task management
    ChallengesController, // Personal challenges/timers for admins
    CommunityGroupChallengesController, // Community group challenges
    CommunityMembersController, // Community members management
    SyncController, // Firebase users sync
    CrmController, // CRM / Relationship management
    AdminFilesController, // Admin shared files
    AdminTablesController, // Admin dynamic tables

    // H2: Test controllers only loaded in non-production
    ...(process.env.NODE_ENV !== "production" ? [RedisTestController] : []),
  ],
  providers: [
    // Database initialization - creates tables and runs migrations on startup
    DatabaseInit,
    // Items delivery service
    ItemsDeliveryService,
    // Admin tables service
    AdminTablesService,
  ],
})
export class AppModule {}
