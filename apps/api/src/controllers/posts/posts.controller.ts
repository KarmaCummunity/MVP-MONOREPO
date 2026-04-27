import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PostsFeedService } from "./posts-feed.service";
import { PostsLikesService } from "./posts-likes.service";
import { PostsCommentsService } from "./posts-comments.service";
import { PostsCommentsMutationsService } from "./posts-comments-mutations.service";
import { PostsCommentLikesActionsService } from "./posts-comment-likes-actions.service";
import { PostsUpdateService } from "./posts-update.service";
import { PostsVisibilityService } from "./posts-visibility.service";
import { PostsDeleteService } from "./posts-delete.service";
import type { CommentBody, LikeBody, UpdateCommentBody } from "./posts.types";

@Controller("api/posts")
export class PostsController {
  private readonly logger = new Logger(PostsController.name);

  constructor(
    private readonly feed: PostsFeedService,
    private readonly likes: PostsLikesService,
    private readonly comments: PostsCommentsService,
    private readonly commentMutations: PostsCommentsMutationsService,
    private readonly commentLikesActions: PostsCommentLikesActionsService,
    private readonly update: PostsUpdateService,
    private readonly visibility: PostsVisibilityService,
    private readonly postsDelete: PostsDeleteService,
  ) {
    this.logger.log("🔄 PostsController initialized");
  }

  @Get()
  async getPosts(
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
    @Query("user_id") userId?: string,
    @Query("post_type") postType?: string,
    @Query("item_id") itemId?: string,
    @Query("ride_id") rideId?: string,
  ) {
    return this.feed.getPosts(
      limitArg,
      offsetArg,
      userId,
      postType,
      itemId,
      rideId,
    );
  }

  @Get("user/:userId")
  async getUserPosts(
    @Param("userId") userId: string,
    @Query("limit") limitArg: string,
    @Query("viewer_id") viewerId?: string,
  ) {
    return this.feed.getUserPosts(userId, limitArg, viewerId);
  }

  @Post(":postId/like")
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param("postId") postId: string, @Body() body: LikeBody) {
    return this.likes.toggleLike(postId, body);
  }

  @Get(":postId/likes")
  async getPostLikes(
    @Param("postId") postId: string,
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
  ) {
    return this.likes.getPostLikes(postId, limitArg, offsetArg);
  }

  @Get(":postId/likes/check/:userId")
  async checkUserLiked(
    @Param("postId") postId: string,
    @Param("userId") userId: string,
  ) {
    return this.likes.checkUserLiked(postId, userId);
  }

  @Post(":postId/comments")
  @UseGuards(JwtAuthGuard)
  async addComment(@Param("postId") postId: string, @Body() body: CommentBody) {
    return this.commentMutations.addComment(postId, body);
  }

  @Get(":postId/comments")
  async getPostComments(
    @Param("postId") postId: string,
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
    @Query("viewer_id") viewerId?: string,
  ) {
    return this.comments.getPostComments(postId, limitArg, offsetArg, viewerId);
  }

  @Put(":postId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Body() body: UpdateCommentBody,
  ) {
    return this.comments.updateComment(postId, commentId, body);
  }

  @Delete(":postId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Query("user_id") userId: string,
  ) {
    return this.commentMutations.deleteComment(postId, commentId, userId);
  }

  @Post(":postId/comments/:commentId/like")
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Body() body: LikeBody,
  ) {
    return this.commentLikesActions.toggleCommentLike(postId, commentId, body);
  }

  @Put(":postId")
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param("postId") postId: string,
    @Body()
    body: {
      user_id?: string;
      title?: string;
      description?: string;
      image?: string;
    },
    @Req() req: Request,
  ) {
    return this.update.updatePost(postId, body, req);
  }

  @Post(":postId/hide")
  @UseGuards(JwtAuthGuard)
  async hidePost(
    @Param("postId") postId: string,
    @Body() body: { user_id?: string },
    @Req() req: Request,
  ) {
    return this.visibility.hidePost(postId, body, req);
  }

  @Post(":postId/unhide")
  @UseGuards(JwtAuthGuard)
  async unhidePost(
    @Param("postId") postId: string,
    @Body() body: { user_id?: string },
    @Req() req: Request,
  ) {
    return this.visibility.unhidePost(postId, body, req);
  }

  @Delete(":postId")
  @UseGuards(JwtAuthGuard)
  async deletePostHandler(
    @Param("postId") postId: string,
    @Req() req: Request,
  ) {
    return this.postsDelete.deletePost(postId, req);
  }
}
