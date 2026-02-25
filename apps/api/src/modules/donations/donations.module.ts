import { Module } from "@nestjs/common";
import { DonationsController } from "./controllers/donations.controller";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
  controllers: [DonationsController],
})
export class DonationsModule {}
