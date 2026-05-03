// File overview:
// - Purpose: Users API for register/login (relational), get/update profile, list users, activities/stats, and follow/unfollow.
// - Reached from: Routes under '/api/users'.
// - Delegates to: UserAuthService, UserProfileService, UserHierarchyService, UserStatsService, UserFollowService.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  UserAuthService,
  RegisterUserBody,
  LoginUserBody,
} from "../services/user-auth.service";
import {
  UserProfileService,
  UpdateUserBody,
} from "../services/user-profile.service";
import { UserFollowService, FollowBody } from "../services/user-follow.service";
import { UserStatsService } from "../services/user-stats.service";
import { UserHierarchyService } from "../services/user-hierarchy.service";

@Controller("api/users")
export class UsersController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userAuthService: UserAuthService,
    private readonly userHierarchyService: UserHierarchyService,
    private readonly userStatsService: UserStatsService,
    private readonly userFollowService: UserFollowService,
  ) {}

  @Get("search")
  async searchUsers(@Query("q") query: string) {
    return this.userProfileService.searchUsers(query);
  }

  @Post(":id/set-manager")
  @UseGuards(JwtAuthGuard)
  async setManager(
    @Param("id") id: string,
    @Body()
    body: { managerId: string | null | undefined; requestingUserId?: string },
  ) {
    return this.userHierarchyService.setManager(id, body);
  }

  @Post(":id/hierarchy/manage")
  @UseGuards(JwtAuthGuard)
  async manageHierarchy(
    @Param("id") subordinateId: string,
    @Body() body: { action: "add" | "remove"; managerId: string },
  ) {
    return this.userHierarchyService.manageHierarchy(subordinateId, body);
  }

  @Post(":id/promote-admin")
  @UseGuards(JwtAuthGuard)
  async promoteToAdmin(
    @Param("id") targetUserId: string,
    @Body() body: { requestingAdminId: string },
  ) {
    return this.userHierarchyService.promoteToAdmin(targetUserId, body);
  }

  @Post(":id/demote-admin")
  @UseGuards(JwtAuthGuard)
  async demoteAdmin(
    @Param("id") targetUserId: string,
    @Body() body: { requestingAdminId: string; convertToVolunteer?: boolean },
  ) {
    return this.userHierarchyService.demoteAdmin(targetUserId, body);
  }

  @Post(":id/promote-volunteer")
  @UseGuards(JwtAuthGuard)
  async promoteToVolunteer(
    @Param("id") targetUserId: string,
    @Body() body: { requestingAdminId: string },
  ) {
    return this.userHierarchyService.promoteToVolunteer(targetUserId, body);
  }

  @Get("eligible-for-promotion/:adminId")
  async getEligibleForPromotion(@Param("adminId") adminId: string) {
    return this.userHierarchyService.getEligibleForPromotion(adminId);
  }

  @Get("hierarchy/tree")
  async getFullHierarchyTree() {
    return this.userHierarchyService.getFullHierarchyTree();
  }

  @Get("stats/summary")
  async getUsersSummary() {
    return this.userStatsService.getUsersSummary();
  }

  @Get(":id/hierarchy")
  async getUserHierarchy(@Param("id") id: string) {
    return this.userHierarchyService.getUserHierarchy(id);
  }

  @Post("register")
  async registerUser(@Body() userData: RegisterUserBody) {
    return this.userAuthService.registerUser(userData);
  }

  @Post("login")
  async loginUser(@Body() loginData: LoginUserBody) {
    return this.userAuthService.loginUser(loginData);
  }

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    return this.userProfileService.getUserById(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param("id") id: string,
    @Body() updateData: UpdateUserBody,
  ) {
    return this.userProfileService.updateUser(id, updateData);
  }

  @Get()
  async getUsers(
    @Query("city") city?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("forceRefresh") forceRefresh?: string,
  ) {
    return this.userProfileService.getUsers({
      city,
      search,
      limit,
      offset,
      forceRefresh,
    });
  }

  @Get(":id/activities")
  async getUserActivities(
    @Param("id") userId: string,
    @Query("limit") limit?: string,
  ) {
    return this.userStatsService.getUserActivities(userId, limit);
  }

  @Get(":id/stats")
  async getUserStats(@Param("id") userId: string) {
    return this.userStatsService.getUserStats(userId);
  }

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

  @Post("resolve-id")
  async resolveUserId(
    @Body() body: { firebase_uid?: string; google_id?: string; email?: string },
  ) {
    return this.userAuthService.resolveUserId(body);
  }
}
