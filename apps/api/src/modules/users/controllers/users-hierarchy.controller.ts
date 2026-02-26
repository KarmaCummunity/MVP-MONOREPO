import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { UserHierarchyService } from "../services/user-hierarchy.service";

@Controller("api/users")
export class UsersHierarchyController {
  constructor(private readonly userHierarchyService: UserHierarchyService) {}

  @Post(":id/set-manager")
  @UseGuards(JwtAuthGuard)
  async setManager(
    @Param("id") id: string,
    @Body()
    body: { managerId: string | null | undefined; requestingUserId?: string },
  ) {
    return this.userHierarchyService.setManager(id, body);
  }

  /**
   * Manage hierarchy: Add or Remove subordinate
   * POST /api/users/:id/hierarchy/manage
   * Body: { action: 'add' | 'remove', managerId: string }
   */
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

  @Get(":id/hierarchy")
  async getUserHierarchy(@Param("id") id: string) {
    return this.userHierarchyService.getUserHierarchy(id);
  }
}
