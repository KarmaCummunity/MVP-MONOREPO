import { Module } from "@nestjs/common";
import { UserResolutionService } from "./user-resolution.service";
import { UserAuthService } from "./user-auth.service";
import { UserProfileService } from "./user-profile.service";
import { UserFollowService } from "./user-follow.service";
import { UserStatsService } from "./user-stats.service";
import { UserHierarchyService } from "./user-hierarchy.service";
import { DatabaseModule } from "../database/database.module";
import { RedisCacheModule } from "../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
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
export class ServicesModule {}
