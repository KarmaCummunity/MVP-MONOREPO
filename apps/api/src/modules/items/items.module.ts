// File overview:
// - Purpose: Nest module bundling generic items CRUD, dedicated items table, items delivery, and Redis-based helpers.
// - Reached from: Imported by `AppModule` to expose /api generic collection endpoints.
// - Provides: `ItemsController`, `ItemsService`, `DedicatedItemsController`, `DedicatedItemsService`, `ItemsDeliveryController`, `ItemsDeliveryService`
import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";
import { DedicatedItemsController } from "./dedicated-items.controller";
import { DedicatedItemsService } from "./dedicated-items.service";
import { ItemsDeliveryController } from "./controllers/items-delivery.controller";
import { ItemsDeliveryService } from "./services/items-delivery.service";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [RedisCacheModule, DatabaseModule],
  // IMPORTANT: DedicatedItemsController MUST be before ItemsController
  // because ItemsController has generic /api/:collection routes that would catch everything
  controllers: [
    DedicatedItemsController,
    ItemsController,
    ItemsDeliveryController,
  ],
  providers: [ItemsService, DedicatedItemsService, ItemsDeliveryService],
  exports: [ItemsService, DedicatedItemsService, ItemsDeliveryService],
})
export class ItemsModule {}
