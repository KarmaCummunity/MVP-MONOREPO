import { Module } from "@nestjs/common";
import { AdminTablesController } from "./controllers/admin-tables.controller";
import { AdminFilesController } from "./controllers/admin-files.controller";
import { CrmController } from "./controllers/crm.controller";
import { TasksController } from "./controllers/tasks.controller";
import { CommunityMembersController } from "./controllers/community-members.controller";
import { AdminTablesService } from "./services/admin-tables.service";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ItemsModule } from "../items/items.module";

@Module({
  imports: [
    DatabaseModule,
    RedisCacheModule,
    AuthModule,
    UsersModule,
    ItemsModule,
  ],
  controllers: [
    AdminTablesController,
    AdminFilesController,
    CrmController,
    TasksController,
    CommunityMembersController,
  ],
  providers: [AdminTablesService],
  exports: [AdminTablesService],
})
export class AdminModule {}
