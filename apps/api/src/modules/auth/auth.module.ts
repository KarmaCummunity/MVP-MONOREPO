// File overview:
// - Purpose: Auth-related providers bundle (session + rate-limit + JWT) and their Redis-backed storage.
// - Reached from: Imported by `AppModule`.
// - Provides: AuthController, SessionController, SessionService, RateLimitService, JwtService, auth guards; exports all for other modules.
import { Module } from "@nestjs/common";
import { AuthController, SessionController } from "./controllers";
import { SessionService } from "./session.service";
import { RateLimitService } from "./rate-limit.service";
import { JwtService } from "./jwt.service";
import { FirebaseAdminService } from "./firebase-admin.service";
import {
  JwtAuthGuard,
  AdminAuthGuard,
  OptionalAuthGuard,
} from "./jwt-auth.guard";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [RedisCacheModule, DatabaseModule],
  controllers: [AuthController, SessionController],
  providers: [
    SessionService,
    RateLimitService,
    JwtService,
    FirebaseAdminService,
    JwtAuthGuard,
    AdminAuthGuard,
    OptionalAuthGuard,
  ],
  exports: [
    SessionService,
    RateLimitService,
    JwtService,
    FirebaseAdminService,
    JwtAuthGuard,
    AdminAuthGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
