import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

/**
 * Manager hierarchy checks for task assignment (unchanged behavior).
 */
@Injectable()
export class TasksPermissionsService {
  private readonly logger = new Logger(TasksPermissionsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Get the root admin user ID from ROOT_ADMIN_EMAIL env var
   * SEC-003.1: No hardcoded emails — uses env var
   */
  async getSuperAdminId(): Promise<string | null> {
    try {
      const rootEmail = process.env.ROOT_ADMIN_EMAIL;
      if (!rootEmail) {
        this.logger.warn(
          "⚠️ ROOT_ADMIN_EMAIL not set — cannot resolve super admin",
        );
        return null;
      }
      const { rows } = await this.pool.query(
        `SELECT id FROM user_profiles WHERE email = $1 LIMIT 1`,
        [rootEmail],
      );
      return rows[0]?.id || null;
    } catch (error) {
      this.logger.error("❌ Error getting super admin ID:", error);
      return null;
    }
  }

  /**
   * Check if a manager can assign tasks to a specific user
   * Super admin can assign to anyone
   * Other managers can only assign to their direct/indirect subordinates
   */
  async canAssignToUser(
    managerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    try {
      if (managerId === targetUserId) {
        return true;
      }

      const { rows: superCheck } = await this.pool.query(
        `SELECT 1 FROM user_profiles WHERE id = $1 AND 'super_admin' = ANY(roles)`,
        [managerId],
      );
      if (superCheck.length > 0) {
        return true;
      }

      const { rows } = await this.pool.query(
        `
        WITH RECURSIVE subordinates AS (
          SELECT id, 1 as depth FROM user_profiles WHERE parent_manager_id = $1
          UNION ALL
          SELECT u.id, s.depth + 1
          FROM user_profiles u
          INNER JOIN subordinates s ON u.parent_manager_id = s.id
          WHERE s.depth < 100
        )
        SELECT 1 FROM subordinates WHERE id = $2 LIMIT 1
      `,
        [managerId, targetUserId],
      );

      const canAssign = rows.length > 0;
      this.logger.log(
        `🔐 Manager ${managerId} ${canAssign ? "CAN" : "CANNOT"} assign to ${targetUserId}`,
      );
      return canAssign;
    } catch (error) {
      this.logger.error("❌ Error checking hierarchy permissions:", error);
      return false;
    }
  }
}
