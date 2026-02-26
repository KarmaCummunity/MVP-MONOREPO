import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import {
  UserProfileService,
  UpdateUserBody,
} from "../services/user-profile.service";

@Controller("api/users")
export class UsersProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get("search")
  async searchUsers(@Query("q") query: string) {
    return this.userProfileService.searchUsers(query);
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
}
