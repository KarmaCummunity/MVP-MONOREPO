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
import { Request } from "express";
import { PostsService } from "../services/posts.service";
import { PostsLikesService } from "../services/posts-likes.service";
import { PostsCommentsService } from "../services/posts-comments.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { SessionTokenPayload } from "../../auth/jwt.service";
import { LikeBody } from "../dto/like.dto";
import { CommentBody, UpdateCommentBody } from "../dto/comment.dto";
import { UpdatePostBody } from "../dto/update-post.dto";

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

@Controller("api/posts")
export class PostsController {
  private readonly logger = new Logger(PostsController.name);

  constructor(
    private readonly postsService: PostsService,
    private readonly postsLikesService: PostsLikesService,
    private readonly postsCommentsService: PostsCommentsService,
  ) {
    this.logger.log("PostsController initialized");
  }

  private getUserIdFromRequest(req: Request): string | undefined {
    const payload = req.user as SessionTokenPayload | undefined;
    const fallback = payload as unknown as Record<string, unknown> | undefined;
    const raw = payload?.userId ?? fallback?.id ?? fallback?.sub;
    return typeof raw === "string" ? raw : undefined;
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
    return this.postsService.getPosts(
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
    return this.postsService.getUserPosts(userId, limitArg, viewerId);
  }

  @Post(":postId/like")
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param("postId") postId: string, @Body() body: LikeBody) {
    const { user_id } = body;
    if (!user_id) {
      return { success: false, error: "user_id is required" };
    }
    return this.postsLikesService.toggleLike(postId, user_id);
  }

  @Get(":postId/likes")
  async getPostLikes(
    @Param("postId") postId: string,
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
  ) {
    const limit = Number.parseInt(limitArg, 10) || DEFAULT_LIMIT;
    const offset = Number.parseInt(offsetArg, 10) || DEFAULT_OFFSET;
    return this.postsLikesService.getPostLikes(postId, limit, offset);
  }

  @Get(":postId/likes/check/:userId")
  async checkUserLiked(
    @Param("postId") postId: string,
    @Param("userId") userId: string,
  ) {
    return this.postsLikesService.checkUserLiked(postId, userId);
  }

  @Post(":postId/comments")
  @UseGuards(JwtAuthGuard)
  async addComment(@Param("postId") postId: string, @Body() body: CommentBody) {
    return this.postsCommentsService.addComment(postId, body);
  }

  @Get(":postId/comments")
  async getPostComments(
    @Param("postId") postId: string,
    @Query("limit") limitArg: string,
    @Query("offset") offsetArg: string,
    @Query("viewer_id") viewerId?: string,
  ) {
    const limit = Number.parseInt(limitArg, 10) || DEFAULT_LIMIT;
    const offset = Number.parseInt(offsetArg, 10) || DEFAULT_OFFSET;
    return this.postsCommentsService.getPostComments(
      postId,
      limit,
      offset,
      viewerId,
    );
  }

  @Put(":postId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Body() body: UpdateCommentBody,
  ) {
    return this.postsCommentsService.updateComment(postId, commentId, body);
  }

  @Delete(":postId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Query("user_id") userId: string,
  ) {
    return this.postsCommentsService.deleteComment(postId, commentId, userId);
  }

  @Post(":postId/comments/:commentId/like")
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(
    @Param("postId") postId: string,
    @Param("commentId") commentId: string,
    @Body() body: LikeBody,
  ) {
    return this.postsCommentsService.toggleCommentLike(postId, commentId, body);
  }

  @Put(":postId")
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param("postId") postId: string,
    @Body() body: UpdatePostBody,
    @Req() req: Request,
  ) {
    const userId = this.getUserIdFromRequest(req) ?? body.user_id;
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    return this.postsService.updatePost(postId, body, userId);
  }

  @Post(":postId/hide")
  @UseGuards(JwtAuthGuard)
  async hidePost(
    @Param("postId") postId: string,
    @Body() body: { user_id?: string },
    @Req() req: Request,
  ) {
    const userId = this.getUserIdFromRequest(req) ?? body.user_id;
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    return this.postsService.hidePost(postId, userId);
  }

  @Post(":postId/unhide")
  @UseGuards(JwtAuthGuard)
  async unhidePost(
    @Param("postId") postId: string,
    @Body() body: { user_id?: string },
    @Req() req: Request,
  ) {
    const userId = this.getUserIdFromRequest(req) ?? body.user_id;
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    return this.postsService.unhidePost(postId, userId);
  }

  @Delete(":postId")
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param("postId") postId: string, @Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }
    return this.postsService.deletePost(postId, userId);
  }
}
