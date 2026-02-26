import { Module } from "@nestjs/common";
import { PostsController } from "./controllers/posts.controller";
import { PostsSchemaService } from "./posts-schema.service";
import { PostsService } from "./services/posts.service";
import { PostsLikesService } from "./services/posts-likes.service";
import { PostsCommentsService } from "./services/posts-comments.service";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
  controllers: [PostsController],
  providers: [
    PostsSchemaService,
    PostsService,
    PostsLikesService,
    PostsCommentsService,
  ],
})
export class PostsModule {}
