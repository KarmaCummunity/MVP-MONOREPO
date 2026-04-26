// File overview:
// - Purpose: Auth-related providers bundle (session + rate-limit + JWT) and their Redis-backed storage.
// - Reached from: Imported by `AppModule`.
// - Provides: `SessionService`, `RateLimitService`, `JwtService`, auth guards; exports all for controllers.
import { Module } from "@nestjs/common";
import { SessionService } from "./session.service";
import { RateLimitService } from "./rate-limit.service";
import { JwtService } from "./jwt.service";
import { FirebaseAdminService } from "./firebase-admin.service";
import {
  JwtAuthGuard,
  AdminAuthGuard,
  OperatorAuthGuard,
  OptionalAuthGuard,
} from "./jwt-auth.guard";
import { RedisCacheModule } from "../redis/redis-cache.module";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [RedisCacheModule, DatabaseModule],
  providers: [
    SessionService,
    RateLimitService,
    JwtService,
    FirebaseAdminService,
    JwtAuthGuard,
    AdminAuthGuard,
    OperatorAuthGuard,
    OptionalAuthGuard,
  ],
  exports: [
    SessionService,
    RateLimitService,
    JwtService,
    FirebaseAdminService,
    JwtAuthGuard,
    AdminAuthGuard,
    OperatorAuthGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
