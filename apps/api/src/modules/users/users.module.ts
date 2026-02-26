import { Module } from "@nestjs/common";
import { UsersAuthController } from "./controllers/users-auth.controller";
import { UsersProfileController } from "./controllers/users-profile.controller";
import { UsersHierarchyController } from "./controllers/users-hierarchy.controller";
import { UsersStatsController } from "./controllers/users-stats.controller";
import { UsersFollowController } from "./controllers/users-follow.controller";
import { UserResolutionService } from "./services/user-resolution.service";
import { UserAuthService } from "./services/user-auth.service";
import { UserProfileService } from "./services/user-profile.service";
import { UserFollowService } from "./services/user-follow.service";
import { UserStatsService } from "./services/user-stats.service";
import { UserHierarchyService } from "./services/user-hierarchy.service";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
  controllers: [
    UsersAuthController,
    UsersProfileController,
    UsersHierarchyController,
    UsersStatsController,
    UsersFollowController,
  ],
  providers: [
    UserResolutionService,
    UserAuthService,
    UserProfileService,
    UserFollowService,
    UserStatsService,
    UserHierarchyService,
  ],
  exports: [
    UserResolutionService,
    UserAuthService,
    UserProfileService,
    UserFollowService,
    UserStatsService,
    UserHierarchyService,
  ],
})
export class UsersModule {}
