import { Module } from "@nestjs/common";
import { SyncController } from "./controllers/sync.controller";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SyncController],
})
export class SyncModule {}
