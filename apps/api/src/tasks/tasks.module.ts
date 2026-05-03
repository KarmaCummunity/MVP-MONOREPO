import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { RedisCacheModule } from "../redis/redis-cache.module";
import { ItemsModule } from "../items/items.module";
import { ServicesModule } from "../services/services.module";
import { AuthModule } from "../auth/auth.module";
import { TasksController } from "./tasks.controller";
import { TasksSchemaService } from "./tasks-schema.service";
import { TasksPermissionsService } from "./tasks-permissions.service";
import { TasksListQueryService } from "./tasks-list-query.service";
import { TasksSideEffectsService } from "./tasks-side-effects.service";
import { TasksPatchMutationService } from "./tasks-patch-mutation.service";
import { TasksCreatePrepService } from "./tasks-create-prep.service";
import { TasksReadService } from "./tasks-read.service";

@Module({
  imports: [
    DatabaseModule,
    RedisCacheModule,
    ItemsModule,
    ServicesModule,
    AuthModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksSchemaService,
    TasksPermissionsService,
    TasksListQueryService,
    TasksSideEffectsService,
    TasksPatchMutationService,
    TasksCreatePrepService,
    TasksReadService,
  ],
})
export class TasksModule {}
