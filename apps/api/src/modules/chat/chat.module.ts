import { Module } from "@nestjs/common";
import { ChatController } from "./controllers/chat.controller";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule, UsersModule],
  controllers: [ChatController],
})
export class ChatModule {}
