import { Module } from "@nestjs/common";
import { StatsController } from "./controllers/stats.controller";
import { StatsQueriesService } from "./services/stats-queries.service";
import { StatsMapperService } from "./services/stats-mapper.service";
import { ComputedStatsService } from "./services/computed-stats.service";
import { StatsFacadeService } from "./services/stats-facade.service";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
  controllers: [StatsController],
  providers: [
    StatsQueriesService,
    StatsMapperService,
    ComputedStatsService,
    StatsFacadeService,
  ],
  exports: [
    StatsQueriesService,
    StatsMapperService,
    ComputedStatsService,
    StatsFacadeService,
  ],
})
export class StatsModule {}
