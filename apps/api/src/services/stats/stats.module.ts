import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { StatsQueriesService } from "./stats-queries.service";
import { StatsMapperService } from "./stats-mapper.service";
import { ComputedStatsService } from "./computed-stats.service";

@Module({
  imports: [DatabaseModule, RedisCacheModule],
  providers: [StatsQueriesService, StatsMapperService, ComputedStatsService],
  exports: [StatsQueriesService, StatsMapperService, ComputedStatsService],
})
export class StatsModule {}
