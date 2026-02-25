import { Module } from "@nestjs/common";
import { NotificationsController } from "./controllers/notifications.controller";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
