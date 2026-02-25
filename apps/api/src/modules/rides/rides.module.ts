import { Module } from "@nestjs/common";
import { RidesController } from "./controllers/rides.controller";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule],
  controllers: [RidesController],
})
export class RidesModule {}
