import { Controller, Get, Param, Query } from "@nestjs/common";
import { UserStatsService } from "../services/user-stats.service";

@Controller("api/users")
export class UsersStatsController {
  constructor(private readonly userStatsService: UserStatsService) {}

  @Get("stats/summary")
  async getUsersSummary() {
    return this.userStatsService.getUsersSummary();
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
}
