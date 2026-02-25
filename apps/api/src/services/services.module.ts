import { Module } from "@nestjs/common";
import { UserResolutionService } from "./user-resolution.service";
import { DatabaseModule } from "../database/database.module";
import { RedisCacheModule } from "../redis/redis-cache.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule],
  providers: [UserResolutionService],
  exports: [UserResolutionService],
})
export class ServicesModule {}
