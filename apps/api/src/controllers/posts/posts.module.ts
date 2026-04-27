import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { RedisCacheModule } from "../../redis/redis-cache.module";
import { AuthModule } from "../../auth/auth.module";
import { PostsController } from "./posts.controller";
import { PostsSchemaService } from "./posts-schema.service";
import { PostsFeedService } from "./posts-feed.service";
import { PostsLikesService } from "./posts-likes.service";
import { PostsCommentsService } from "./posts-comments.service";
import { PostsCommentsMutationsService } from "./posts-comments-mutations.service";
import { PostsCommentLikesActionsService } from "./posts-comment-likes-actions.service";
import { PostsUpdateService } from "./posts-update.service";
import { PostsVisibilityService } from "./posts-visibility.service";
import { PostsDeleteService } from "./posts-delete.service";

@Module({
  imports: [DatabaseModule, RedisCacheModule, AuthModule],
  controllers: [PostsController],
  providers: [
    PostsSchemaService,
    PostsFeedService,
    PostsLikesService,
    PostsCommentsService,
    PostsCommentsMutationsService,
    PostsCommentLikesActionsService,
    PostsUpdateService,
    PostsVisibilityService,
    PostsDeleteService,
  ],
})
export class PostsModule {}
