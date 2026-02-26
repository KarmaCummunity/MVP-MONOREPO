import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { UserFollowService, FollowBody } from "../services/user-follow.service";

@Controller("api/users")
export class UsersFollowController {
  constructor(private readonly userFollowService: UserFollowService) {}

  @Post(":id/follow")
  @UseGuards(JwtAuthGuard)
  async followUser(
    @Param("id") userId: string,
    @Body() followData: FollowBody,
  ) {
    return this.userFollowService.followUser(userId, followData);
  }

  @Delete(":id/follow")
  @UseGuards(JwtAuthGuard)
  async unfollowUser(
    @Param("id") userId: string,
    @Body() unfollowData: FollowBody,
  ) {
    return this.userFollowService.unfollowUser(userId, unfollowData);
  }
}
