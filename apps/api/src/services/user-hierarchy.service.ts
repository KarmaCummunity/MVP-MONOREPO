import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, type PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { KC_ROOT_ADMIN_EMAIL_FALLBACK } from "../config/kc-root-admin.defaults";

type SimpleUserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  parent_manager_id?: string | null;
};

type ManagerChainRow = {
  id: string;
  parent_manager_id: string | null;
  depth: number;
};

type RequestingUserRow = {
  id: string;
  email: string;
  roles: string[] | null;
  hierarchy_level: number | null;
};

type TargetUserRow = {
  id: string;
  name: string | null;
  email: string;
  roles: string[] | null;
  parent_manager_id: string | null;
  hierarchy_level: number | null;
};

type HierarchyUserRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  parent_manager_id: string | null;
  roles: string[] | null;
  level: number;
  salary: number;
  seniority_start_date: string;
  is_super_admin: boolean;
};

export type HierarchyTreeNode = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  level: number;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isVolunteer: boolean;
  salary: number;
  seniority_start_date: string;
  children: HierarchyTreeNode[];
};

@Injectable()
export class UserHierarchyService {
  private readonly logger = new Logger(UserHierarchyService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly configService: ConfigService,
  ) {}

  private getRootAdminEmail(): string {
    return (this.configService.get<string>("ROOT_ADMIN_EMAIL") || "")
      .toLowerCase()
      .trim();
  }

  /** Canonical root manager email: env `ROOT_ADMIN_EMAIL`, else KC default (single org identity). */
  private resolveRootAdminEmail(): string {
    const fromEnv = this.getRootAdminEmail();
    return fromEnv || KC_ROOT_ADMIN_EMAIL_FALLBACK.toLowerCase().trim();
  }

  /**
   * Prevents pulling a strict *ancestor* (your manager chain) under yourself.
   * If the requester already sits on the manager path above the target (direct
   * manager or higher), the operation is allowed — including volunteers who are
   * already linked to a manager below the requester.
   */
  private async assertRequesterMayPullTargetUnderSelf(
    client: PoolClient,
    requestingAdminId: string,
    targetUserId: string,
    targetParentId: string | null,
    isSuperAdmin: boolean,
    blockErrorHebrew: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (isSuperAdmin) {
      return { ok: true };
    }
    const requesterIsOnPathAboveTarget =
      targetParentId === requestingAdminId ||
      (
        await client.query(
          `
          WITH RECURSIVE up_from_target AS (
            SELECT id, parent_manager_id, 1 AS depth
            FROM user_profiles
            WHERE id = $1
            UNION ALL
            SELECT p.id, p.parent_manager_id, u.depth + 1
            FROM user_profiles p
            INNER JOIN up_from_target u ON p.id = u.parent_manager_id
            WHERE u.depth < 100
          )
          SELECT 1 FROM up_from_target WHERE id = $2 LIMIT 1
        `,
          [targetUserId, requestingAdminId],
        )
      ).rows.length > 0;

    if (requesterIsOnPathAboveTarget) {
      return { ok: true };
    }

    const { rows: ancestorHit } = await client.query(
      `
      WITH RECURSIVE ancestors_of_requester AS (
        SELECT id, parent_manager_id, 1 AS depth
        FROM user_profiles
        WHERE id = $1
        UNION ALL
        SELECT p.id, p.parent_manager_id, a.depth + 1
        FROM user_profiles p
        INNER JOIN ancestors_of_requester a ON p.id = a.parent_manager_id
        WHERE a.depth < 100
      )
      SELECT 1 FROM ancestors_of_requester WHERE id = $2 LIMIT 1
    `,
      [requestingAdminId, targetUserId],
    );

    if (ancestorHit.length > 0) {
      return { ok: false, error: blockErrorHebrew };
    }
    return { ok: true };
  }

  private isManagerAssignmentCleared(
    managerId: string | null | undefined,
  ): boolean {
    return (
      managerId === null ||
      managerId === undefined ||
      managerId === "null" ||
      managerId === ""
    );
  }

  private async setManagerRemoveReportingLine(
    id: string,
    rootEmail: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const { rows: currentUser } = await this.pool.query(
      "SELECT parent_manager_id FROM user_profiles WHERE id = $1",
      [id],
    );

    if (currentUser.length === 0) {
      this.logger.log(`[setManager] User not found: ${id}`);
      return { success: false, error: "User not found" };
    }

    const currentManagerId = currentUser[0].parent_manager_id;
    this.logger.log(
      `[setManager] Removing manager assignment for user ${id}, current manager: ${currentManagerId}`,
    );

    const { rows: userData } = await this.pool.query(
      "SELECT roles, email FROM user_profiles WHERE id = $1",
      [id],
    );
    const isAdmin =
      userData.length > 0 &&
      ((userData[0].roles || []).includes("admin") ||
        (userData[0].roles || []).includes("super_admin"));
    const isRootAdmin =
      userData.length > 0 &&
      rootEmail &&
      (userData[0].email || "").toLowerCase().trim() === rootEmail;

    let newRoles = Array.isArray(userData[0]?.roles)
      ? [...userData[0].roles]
      : [];

    newRoles = newRoles.filter((r: string) => r !== "volunteer");

    if (isAdmin && !isRootAdmin) {
      newRoles = newRoles.filter(
        (r: string) => r !== "admin" && r !== "super_admin",
      );
      this.logger.log(
        `[setManager] ⚠️ Removing admin roles from user ${id} because manager assignment was removed (admin must have a manager)`,
      );
    }

    await this.pool.query(
      `
          UPDATE user_profiles 
          SET 
            parent_manager_id = NULL, 
            updated_at = NOW(),
            roles = $1::text[]
          WHERE id = $2
        `,
      [newRoles, id],
    );

    await this.redisCache.delete(`user_profile_${id}`);
    await this.redisCache.invalidatePattern("users_list*");

    this.logger.log(`✅ Manager removed: ${id} no longer reports to anyone`);
    return { success: true, message: "שיוך מנהל הוסר בהצלחה" };
  }

  private async setManagerValidateCyclesAndReverseChain(
    id: string,
    managerId: string,
    managerEmail: string,
    rootEmail: string,
  ): Promise<{ success: false; error: string } | { success: true }> {
    if (rootEmail && (managerEmail || "").toLowerCase().trim() === rootEmail) {
      this.logger.log(
        `[setManager] ✅ Assigning to root admin - skipping cycle check`,
      );
      return { success: true };
    }

    const { rows: currentHierarchy } = await this.pool.query(
      `
          SELECT id, name, email, parent_manager_id 
          FROM user_profiles 
          WHERE id IN ($1, $2)
        `,
      [id, managerId],
    );

    this.logger.log(`[setManager] 🔍 Current hierarchy state:`, {
      userId: id,
      managerId: managerId,
      users: (currentHierarchy as SimpleUserProfile[]).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        parent_manager_id: u.parent_manager_id ?? null,
      })),
    });

    const { rows: managerChainDebug } = await this.pool.query(
      `
          WITH RECURSIVE manager_chain AS (
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $1
            
            UNION ALL
            
            SELECT u.id, u.parent_manager_id, mc.depth + 1
            FROM user_profiles u
            INNER JOIN manager_chain mc ON u.id = mc.parent_manager_id
            WHERE mc.depth < 100 AND u.parent_manager_id IS NOT NULL
          )
          SELECT id, parent_manager_id, depth FROM manager_chain ORDER BY depth
        `,
      [managerId],
    );

    this.logger.log(
      `[setManager] 🔍 Manager chain (going up from ${managerId}):`,
      (managerChainDebug as ManagerChainRow[]).map((m) => ({
        id: m.id,
        parent: m.parent_manager_id,
        depth: m.depth,
      })),
    );

    const { rows: cycleCheck } = await this.pool.query(
      `
          WITH RECURSIVE manager_chain AS (
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $1
            
            UNION ALL
            
            SELECT u.id, u.parent_manager_id, mc.depth + 1
            FROM user_profiles u
            INNER JOIN manager_chain mc ON u.id = mc.parent_manager_id
            WHERE mc.depth < 100 AND u.parent_manager_id IS NOT NULL
          )
          SELECT id, depth FROM manager_chain WHERE id = $2 LIMIT 1
        `,
      [managerId, id],
    );

    if (cycleCheck.length > 0) {
      const { rows: userDetails } = await this.pool.query(
        "SELECT id, name, email FROM user_profiles WHERE id IN ($1, $2)",
        [id, managerId],
      );
      type UserBasicInfo = {
        id: string;
        name: string | null;
        email: string | null;
      };
      const userDetailsTyped = userDetails as UserBasicInfo[];
      const userInfo = userDetailsTyped.find((u) => u.id === id) || {
        id,
        name: null,
        email: null,
      };
      const managerInfo = userDetailsTyped.find((u) => u.id === managerId) || {
        id: managerId,
        name: null,
        email: null,
      };

      const userName = userInfo.name || userInfo.email || id;
      const managerName = managerInfo.name || managerInfo.email || managerId;

      return {
        success: false,
        error: `לא ניתן להגדיר את ${managerName} כמנהל של ${userName} - זה יוצר מחזור בהיררכיה כי ${userName} כבר נמצא בשרשרת הניהול מעל ${managerName}`,
      };
    }

    if (!rootEmail || (managerEmail || "").toLowerCase().trim() !== rootEmail) {
      const { rows: reverseCheck } = await this.pool.query(
        `
          WITH RECURSIVE subordinate_tree AS (
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE parent_manager_id = $2
            
            UNION ALL
            
            SELECT u.id, u.parent_manager_id, st.depth + 1
            FROM user_profiles u
            INNER JOIN subordinate_tree st ON u.parent_manager_id = st.id
            WHERE st.depth < 100
          )
          SELECT 1 FROM subordinate_tree WHERE id = $1 LIMIT 1
        `,
        [managerId, id],
      );

      if (reverseCheck.length > 0) {
        const { rows: userDetails } = await this.pool.query(
          "SELECT id, name, email FROM user_profiles WHERE id IN ($1, $2)",
          [id, managerId],
        );
        const userInfo = userDetails.find((u) => u.id === id) || {
          name: null,
          email: null,
        };
        const managerInfo = userDetails.find((u) => u.id === managerId) || {
          name: null,
          email: null,
        };

        const userName = userInfo.name || userInfo.email || id;
        const managerName = managerInfo.name || managerInfo.email || managerId;

        return {
          success: false,
          error: `לא ניתן להגדיר את ${managerName} כמנהל של ${userName} - ${managerName} כבר כפוף ל-${userName}`,
        };
      }
    }

    return { success: true };
  }

  private buildHierarchyTreeFromRows(
    allUsers: HierarchyUserRow[],
    parentId: string | null,
    level: number,
    visitedIds: Set<string>,
  ): HierarchyTreeNode[] {
    if (level > 20) {
      return [];
    }

    const rootEmail = this.resolveRootAdminEmail();
    return allUsers
      .filter((user) => {
        if (level === 0) {
          return (user.email || "").toLowerCase().trim() === rootEmail;
        }
        return user.parent_manager_id === parentId;
      })
      .filter((user) => !visitedIds.has(user.id))
      .map((user) => {
        const nextVisitedIds = new Set(visitedIds);
        nextVisitedIds.add(user.id);

        const userRoles = Array.isArray(user.roles) ? user.roles : [];
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          level: user.level,
          isSuperAdmin: (user.email || "").toLowerCase().trim() === rootEmail,
          isAdmin:
            userRoles.includes("admin") || userRoles.includes("super_admin"),
          isVolunteer:
            userRoles.includes("volunteer") &&
            !(userRoles.includes("admin") || userRoles.includes("super_admin")),
          salary: user.salary || 0,
          seniority_start_date:
            user.seniority_start_date || new Date().toISOString().split("T")[0],
          children: this.buildHierarchyTreeFromRows(
            allUsers,
            user.id,
            level + 1,
            nextVisitedIds,
          ),
        };
      });
  }

  async ensureSalarySeniorityColumns(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        const checkResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND column_name IN ('salary', 'seniority_start_date', 'parent_manager_id')
        `);

        const existingColumns = new Set(
          checkResult.rows.map((r) => r.column_name as string),
        );

        if (!existingColumns.has("salary")) {
          this.logger.log("📋 Adding salary column to user_profiles...");
          await client.query(`
            ALTER TABLE user_profiles 
            ADD COLUMN salary DECIMAL(10,2) DEFAULT 0
          `);
          this.logger.log("✅ Added salary column");
        }

        if (!existingColumns.has("seniority_start_date")) {
          this.logger.log(
            "📋 Adding seniority_start_date column to user_profiles...",
          );
          await client.query(`
            ALTER TABLE user_profiles 
            ADD COLUMN seniority_start_date DATE DEFAULT CURRENT_DATE
          `);
          this.logger.log("✅ Added seniority_start_date column");
        }

        if (!existingColumns.has("parent_manager_id")) {
          this.logger.log(
            "📋 Adding parent_manager_id column to user_profiles...",
          );
          await client.query(`
            ALTER TABLE user_profiles 
            ADD COLUMN parent_manager_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL
          `);
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_user_profiles_parent_manager ON user_profiles(parent_manager_id)
          `);
          this.logger.log("✅ Added parent_manager_id column");
        }
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("❌ Error ensuring user profile columns:", error);
    }
  }

  private async setManagerEnsureRequesterAdminIfProvided(
    requestingUserId: string | undefined,
  ): Promise<{ success: false; error: string } | null> {
    if (!requestingUserId) {
      return null;
    }
    const { rows: reqUser } = await this.pool.query(
      `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
      [requestingUserId],
    );
    if (reqUser.length === 0) {
      return null;
    }
    const isAdmin =
      (reqUser[0].roles || []).includes("admin") ||
      (reqUser[0].roles || []).includes("super_admin");
    if (!isAdmin) {
      this.logger.log(
        `[setManager] Permission denied for user ${requestingUserId}`,
      );
      return {
        success: false,
        error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
      };
    }
    return null;
  }

  private async setManagerAssertTargetNotRoot(
    id: string,
    rootEmail: string | null,
  ): Promise<{ success: false; error: string } | null> {
    const { rows: targetUserCheck } = await this.pool.query(
      "SELECT email FROM user_profiles WHERE id = $1",
      [id],
    );
    if (
      rootEmail &&
      targetUserCheck.length > 0 &&
      (targetUserCheck[0].email || "").toLowerCase().trim() === rootEmail
    ) {
      this.logger.log(`[setManager] ❌ BLOCKED: Attempt to modify root admin`);
      return {
        success: false,
        error: "לא ניתן לשנות את המנהל הראשי - הוא המנהל הראשי",
      };
    }
    return null;
  }

  private async setManagerNormalizeRootManagerIfNeeded(
    assignManagerId: string,
    managerEmail: string | null,
    managerCurrentParent: string | null,
    rootEmail: string | null,
  ): Promise<void> {
    if (
      !rootEmail ||
      (managerEmail || "").toLowerCase().trim() !== rootEmail ||
      managerCurrentParent === null
    ) {
      return;
    }
    this.logger.log(
      `[setManager] 🔧 FIXING: Root admin has parent_manager_id=${managerCurrentParent}, removing it...`,
    );
    await this.pool.query(
      `
          UPDATE user_profiles 
          SET parent_manager_id = NULL, updated_at = NOW()
          WHERE id = $1
        `,
      [assignManagerId],
    );
    await this.redisCache.delete(`user_profile_${assignManagerId}`);
    await this.redisCache.invalidatePattern("users_list*");
  }

  private async setManagerValidateNonRootAdminRequiresManager(
    id: string,
    assignManagerId: string,
    rootEmail: string | null,
  ): Promise<{ success: false; error: string } | null> {
    const { rows: userCheck } = await this.pool.query(
      "SELECT roles, email FROM user_profiles WHERE id = $1",
      [id],
    );
    if (userCheck.length === 0) {
      return null;
    }
    const userRoles = Array.isArray(userCheck[0].roles)
      ? userCheck[0].roles
      : [];
    const isAdmin =
      userRoles.includes("admin") || userRoles.includes("super_admin");
    const isRootAdmin =
      rootEmail &&
      (userCheck[0].email || "").toLowerCase().trim() === rootEmail;
    if (isAdmin && !isRootAdmin && !assignManagerId) {
      return {
        success: false,
        error:
          "מנהל חייב להיות משויך למנהל מעליו (חוץ מהמנהל הראשי). אם ברצונך להסיר את השיוך, המשתמש יהפוך למשתמש רגיל.",
      };
    }
    return null;
  }

  async setManager(
    id: string,
    body: { managerId: string | null | undefined; requestingUserId?: string },
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { managerId, requestingUserId } = body;

      this.logger.log(
        `[setManager] Setting manager for user ${id}: managerId=${managerId} (type: ${typeof managerId}), requestingUserId=${requestingUserId}`,
      );

      const permissionDenied =
        await this.setManagerEnsureRequesterAdminIfProvided(requestingUserId);
      if (permissionDenied) {
        return permissionDenied;
      }

      const rootEmail = this.resolveRootAdminEmail();
      const rootTargetBlock = await this.setManagerAssertTargetNotRoot(
        id,
        rootEmail,
      );
      if (rootTargetBlock) {
        return rootTargetBlock;
      }

      if (this.isManagerAssignmentCleared(managerId)) {
        return await this.setManagerRemoveReportingLine(id, rootEmail);
      }

      if (managerId === id) {
        return { success: false, error: "User cannot be their own manager" };
      }

      const assignManagerId = managerId as string;

      const { rows: checkManager } = await this.pool.query(
        "SELECT id, email, parent_manager_id FROM user_profiles WHERE id = $1",
        [assignManagerId],
      );
      if (checkManager.length === 0) {
        return { success: false, error: "Manager not found" };
      }

      const managerEmail = checkManager[0].email;
      const managerCurrentParent = checkManager[0].parent_manager_id;

      await this.setManagerNormalizeRootManagerIfNeeded(
        assignManagerId,
        managerEmail,
        managerCurrentParent,
        rootEmail,
      );

      const cycleCheckResult =
        await this.setManagerValidateCyclesAndReverseChain(
          id,
          assignManagerId,
          managerEmail,
          rootEmail,
        );
      if (!cycleCheckResult.success) {
        return cycleCheckResult;
      }

      const adminManagerRule =
        await this.setManagerValidateNonRootAdminRequiresManager(
          id,
          assignManagerId,
          rootEmail,
        );
      if (adminManagerRule) {
        return adminManagerRule;
      }

      await this.pool.query(
        `
        UPDATE user_profiles 
        SET 
          parent_manager_id = $1, 
          updated_at = NOW(),
          roles = (
            SELECT array_agg(DISTINCT role)
            FROM unnest(roles || ARRAY['volunteer']::text[]) AS role
            WHERE role IS NOT NULL
          )
        WHERE id = $2
      `,
        [assignManagerId, id],
      );

      await this.redisCache.delete(`user_profile_${id}`);
      await this.redisCache.delete(`user_profile_${assignManagerId}`);
      await this.redisCache.invalidatePattern("users_list*");

      this.logger.log(
        `✅ Manager set: ${id} now reports to ${assignManagerId}`,
      );
      return { success: true, message: "Manager updated successfully" };
    } catch (error) {
      this.logger.error("Set manager error:", error);
      return { success: false, error: "Failed to set manager" };
    }
  }

  private async manageHierarchyExecuteAdd(
    client: PoolClient,
    managerId: string,
    subordinateId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const { rows: cycleCheck } = await client.query(
      `
          WITH RECURSIVE manager_chain AS (
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $1
            
            UNION ALL
            
            SELECT u.id, u.parent_manager_id, mc.depth + 1
            FROM user_profiles u
            INNER JOIN manager_chain mc ON u.id = mc.parent_manager_id
            WHERE mc.depth < 100
          )
          SELECT 1 FROM manager_chain WHERE id = $2 LIMIT 1
        `,
      [managerId, subordinateId],
    );

    if (cycleCheck.length > 0) {
      return {
        ok: false,
        error:
          "Cannot create hierarchy cycle - this would create a circular management chain",
      };
    }

    const { rows: reverseCheck } = await client.query(
      `
          WITH RECURSIVE subordinate_chain AS (
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $2
            
            UNION ALL
            
            SELECT u.id, u.parent_manager_id, sc.depth + 1
            FROM user_profiles u
            INNER JOIN subordinate_chain sc ON u.id = sc.parent_manager_id
            WHERE sc.depth < 100
          )
          SELECT 1 FROM subordinate_chain WHERE id = $1 LIMIT 1
        `,
      [managerId, subordinateId],
    );

    if (reverseCheck.length > 0) {
      return {
        ok: false,
        error: "Cannot assign - this user is already in your management chain",
      };
    }

    await client.query(
      `
          UPDATE user_profiles 
          SET parent_manager_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
      [managerId, subordinateId],
    );

    return { ok: true };
  }

  private async manageHierarchyExecuteRemove(
    client: PoolClient,
    managerId: string,
    subordinateId: string,
  ): Promise<
    | { ok: true; message: string; data?: { transferredTasks?: number } }
    | { ok: false; error: string }
  > {
    const { rows: currentCheck } = await client.query(
      "SELECT parent_manager_id, name, email FROM user_profiles WHERE id = $1",
      [subordinateId],
    );
    if (currentCheck[0]?.parent_manager_id !== managerId) {
      return { ok: false, error: "User is not your subordinate" };
    }

    const subordinateName =
      currentCheck[0]?.name || currentCheck[0]?.email || "Unknown";

    const { rows: tasksToTransfer } = await client.query(
      `
          SELECT id, title, status, priority
          FROM tasks
          WHERE $1::UUID = ANY(assignees::UUID[]) 
          AND status NOT IN ('done', 'archived')
        `,
      [subordinateId],
    );

    const transferCount = tasksToTransfer.length;

    await client.query(
      `
          UPDATE user_profiles 
          SET parent_manager_id = NULL, updated_at = NOW()
          WHERE id = $1
        `,
      [subordinateId],
    );

    if (transferCount > 0) {
      await client.query(
        `
            UPDATE tasks
            SET assignees = array_replace(assignees::UUID[], $1::UUID, $2::UUID)::UUID[],
                updated_at = NOW()
            WHERE $1::UUID = ANY(assignees::UUID[]) 
            AND status NOT IN ('done', 'archived')
          `,
        [subordinateId, managerId],
      );
    }

    await client.query("COMMIT");

    if (transferCount > 0) {
      try {
        await this.pool.query(
          `
              INSERT INTO notifications (user_id, item_id, data, created_at)
              VALUES ($1, $2, $3, NOW())
              ON CONFLICT (user_id, item_id) DO NOTHING
            `,
          [
            managerId,
            randomUUID(),
            JSON.stringify({
              title: "משימות הועברו אליך",
              body: `${transferCount} משימות הועברו אליך מ${subordinateName} שהוסר מהניהול שלך`,
              type: "system",
              timestamp: new Date().toISOString(),
              read: false,
              data: {
                transferredTaskIds: tasksToTransfer.map((t) => t.id),
                fromUser: subordinateId,
                fromUserName: subordinateName,
                count: transferCount,
              },
            }),
          ],
        );
      } catch (notifError) {
        this.logger.warn(
          "Failed to create transfer notification (non-fatal):",
          notifError,
        );
      }
    }

    return {
      ok: true,
      message: `Subordinate removed and ${transferCount} tasks transferred`,
      data: { transferredTasks: transferCount },
    };
  }

  async manageHierarchy(
    subordinateId: string,
    body: { action: "add" | "remove"; managerId: string },
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    data?: { transferredTasks?: number };
  }> {
    const client = await this.pool.connect();
    try {
      const { action, managerId } = body;
      await client.query("BEGIN");

      const rootEmail = this.resolveRootAdminEmail();
      const { rows: subordinateCheck } = await client.query(
        "SELECT email FROM user_profiles WHERE id = $1",
        [subordinateId],
      );

      if (
        rootEmail &&
        subordinateCheck.length > 0 &&
        (subordinateCheck[0].email || "").toLowerCase().trim() === rootEmail
      ) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "לא ניתן לשנות את המנהל הראשי - הוא המנהל הראשי",
        };
      }

      if (action === "add") {
        const addResult = await this.manageHierarchyExecuteAdd(
          client,
          managerId,
          subordinateId,
        );
        if (!addResult.ok) {
          await client.query("ROLLBACK");
          return { success: false, error: addResult.error };
        }
        await client.query("COMMIT");
        return { success: true, message: "Subordinate added successfully" };
      }

      if (action === "remove") {
        const removeResult = await this.manageHierarchyExecuteRemove(
          client,
          managerId,
          subordinateId,
        );
        if (!removeResult.ok) {
          await client.query("ROLLBACK");
          return { success: false, error: removeResult.error };
        }
        return {
          success: true,
          message: removeResult.message,
          data: removeResult.data,
        };
      }

      await client.query("ROLLBACK");
      return { success: false, error: "Invalid action" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Manage hierarchy error:", error);
      return { success: false, error: "Failed to manage hierarchy" };
    } finally {
      client.release();
    }
  }

  async promoteToAdmin(
    targetUserId: string,
    body: { requestingAdminId: string },
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const client = await this.pool.connect();
    try {
      const { requestingAdminId } = body;

      if (!requestingAdminId) {
        return { success: false, error: "requestingAdminId is required" };
      }

      await client.query("BEGIN");

      const { rows: requestingUser } = await client.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [requestingAdminId],
      );

      if (requestingUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Requesting user not found" };
      }

      const isSuperAdmin = (requestingUser[0].roles || []).includes(
        "super_admin",
      );
      const isAdmin =
        (requestingUser[0].roles || []).includes("admin") || isSuperAdmin;

      if (!isAdmin) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
        };
      }

      const { rows: targetUser } = await client.query(
        `SELECT id, name, email, roles, parent_manager_id FROM user_profiles WHERE id = $1`,
        [targetUserId],
      );

      if (targetUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const rootEmail = this.resolveRootAdminEmail();
      if (
        rootEmail &&
        (targetUser[0].email || "").toLowerCase().trim() === rootEmail
      ) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "לא ניתן לשנות הרשאות למנהל הראשי - הוא המנהל הראשי",
        };
      }

      const targetIsAlreadyAdmin =
        (targetUser[0].roles || []).includes("admin") ||
        (targetUser[0].roles || []).includes("super_admin");

      if (targetIsAlreadyAdmin && targetUser[0].parent_manager_id) {
        if (targetUser[0].parent_manager_id !== requestingAdminId) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: "משתמש זה כבר מנהל תחת מישהו אחר - לא ניתן להעביר",
          };
        }
        await client.query("ROLLBACK");
        return { success: true, message: "משתמש זה כבר מנהל תחתיך" };
      }

      const promoteAdminHierarchy =
        await this.assertRequesterMayPullTargetUnderSelf(
          client,
          requestingAdminId,
          targetUserId,
          targetUser[0].parent_manager_id,
          isSuperAdmin,
          "לא ניתן להפוך את המנהל שלך או מנהלים מעליו למנהל תחתיך",
        );
      if (!promoteAdminHierarchy.ok) {
        await client.query("ROLLBACK");
        return { success: false, error: promoteAdminHierarchy.error };
      }

      const currentRoles = Array.isArray(targetUser[0].roles)
        ? targetUser[0].roles
        : [];
      const uniqueRoles = new Set(currentRoles);
      uniqueRoles.add("admin");
      uniqueRoles.add("volunteer");
      const newRoles = Array.from(uniqueRoles);

      await client.query(
        `
        UPDATE user_profiles 
        SET roles = $1::text[], parent_manager_id = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [newRoles, requestingAdminId, targetUserId],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(`user_profile_${targetUserId}`);
      await this.redisCache.delete(`user_profile_${requestingAdminId}`);
      await this.redisCache.invalidatePattern("users_list*");

      return {
        success: true,
        message: `${targetUser[0].name || targetUser[0].email} הפך למנהל תחתיך`,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Promote to admin error:", error);
      return { success: false, error: "Failed to promote user to admin" };
    } finally {
      client.release();
    }
  }

  private async demoteAdminTargetIsSubordinateOfRequester(
    client: PoolClient,
    requestingAdminId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const { rows: subordinateCheck } = await client.query(
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
      [requestingAdminId, targetUserId],
    );
    return subordinateCheck.length > 0;
  }

  private computeDemoteAdminRolesAndParent(
    convertToVolunteer: boolean,
    hasParentManager: boolean,
    requestingAdminId: string,
    currentRoles: string[],
    targetParentManagerId: string | null,
  ): { newRoles: string[]; newParentManagerId: string | null } {
    let newRoles = currentRoles.filter(
      (r: string) => r !== "admin" && r !== "super_admin",
    );

    if (convertToVolunteer) {
      if (!newRoles.includes("volunteer")) {
        newRoles.push("volunteer");
      }
      return { newRoles, newParentManagerId: requestingAdminId };
    }
    if (hasParentManager) {
      if (!newRoles.includes("volunteer")) {
        newRoles.push("volunteer");
      }
      return { newRoles, newParentManagerId: targetParentManagerId };
    }
    newRoles = newRoles.filter((r: string) => r !== "volunteer");
    return { newRoles, newParentManagerId: null };
  }

  async demoteAdmin(
    targetUserId: string,
    body: { requestingAdminId: string; convertToVolunteer?: boolean },
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const client = await this.pool.connect();
    try {
      const { requestingAdminId, convertToVolunteer = false } = body;

      if (!requestingAdminId) {
        return { success: false, error: "requestingAdminId is required" };
      }

      await client.query("BEGIN");

      const { rows: requestingUser } = await client.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [requestingAdminId],
      );

      if (requestingUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Requesting user not found" };
      }

      const isSuperAdmin = (requestingUser[0].roles || []).includes(
        "super_admin",
      );
      const isAdmin =
        (requestingUser[0].roles || []).includes("admin") || isSuperAdmin;

      if (!isAdmin) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
        };
      }

      const { rows: targetUser } = await client.query(
        `SELECT id, name, email, roles, parent_manager_id FROM user_profiles WHERE id = $1`,
        [targetUserId],
      );

      if (targetUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const rootEmail = this.resolveRootAdminEmail();
      if (
        rootEmail &&
        (targetUser[0].email || "").toLowerCase().trim() === rootEmail
      ) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "לא ניתן לשנות הרשאות למנהל הראשי - הוא המנהל הראשי",
        };
      }

      if (!isSuperAdmin) {
        const isSubordinate =
          await this.demoteAdminTargetIsSubordinateOfRequester(
            client,
            requestingAdminId,
            targetUserId,
          );
        if (!isSubordinate) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: "ניתן להסיר הרשאות מנהל רק ממנהלים שתחתיך",
          };
        }
      }

      const currentRoles = Array.isArray(targetUser[0].roles)
        ? targetUser[0].roles
        : [];
      const hasParentManager = !!targetUser[0].parent_manager_id;

      const { newRoles, newParentManagerId } =
        this.computeDemoteAdminRolesAndParent(
          convertToVolunteer,
          hasParentManager,
          requestingAdminId,
          currentRoles,
          targetUser[0].parent_manager_id,
        );

      await client.query(
        `
        UPDATE user_profiles 
        SET roles = $1::text[], 
            parent_manager_id = $2,
            updated_at = NOW()
        WHERE id = $3
      `,
        [newRoles, newParentManagerId, targetUserId],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(`user_profile_${targetUserId}`);
      await this.redisCache.delete(`user_profile_${requestingAdminId}`);
      await this.redisCache.invalidatePattern("users_list*");

      const message = convertToVolunteer
        ? `הרשאות מנהל הוסרו מ-${targetUser[0].name || targetUser[0].email} והוא הפך למתנדב`
        : `הרשאות מנהל הוסרו מ-${targetUser[0].name || targetUser[0].email}`;

      return {
        success: true,
        message,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Demote admin error:", error);
      return { success: false, error: "Failed to demote admin" };
    } finally {
      client.release();
    }
  }

  private async loadRequestingUserForVolunteerPromotion(
    client: PoolClient,
    requestingAdminId: string,
  ): Promise<RequestingUserRow[]> {
    try {
      const result = await client.query(
        `SELECT id, email, roles, hierarchy_level FROM user_profiles WHERE id = $1`,
        [requestingAdminId],
      );
      return result.rows as RequestingUserRow[];
    } catch (err) {
      const error = err as Error;
      if (!error.message?.includes("hierarchy_level")) {
        throw error;
      }
      const result = await client.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [requestingAdminId],
      );
      return result.rows.map(
        (row): RequestingUserRow => ({
          ...(row as { id: string; email: string; roles: string[] | null }),
          hierarchy_level: null,
        }),
      );
    }
  }

  private async loadTargetUserForVolunteerPromotion(
    client: PoolClient,
    targetUserId: string,
  ): Promise<TargetUserRow[]> {
    try {
      const result = await client.query(
        `SELECT id, name, email, roles, parent_manager_id, hierarchy_level FROM user_profiles WHERE id = $1`,
        [targetUserId],
      );
      return result.rows as TargetUserRow[];
    } catch (err) {
      const error = err as Error;
      if (!error.message?.includes("hierarchy_level")) {
        throw error;
      }
      const result = await client.query(
        `SELECT id, name, email, roles, parent_manager_id FROM user_profiles WHERE id = $1`,
        [targetUserId],
      );
      return result.rows.map(
        (row): TargetUserRow => ({
          ...(row as {
            id: string;
            name: string | null;
            email: string;
            roles: string[] | null;
            parent_manager_id: string | null;
          }),
          hierarchy_level: null,
        }),
      );
    }
  }

  async promoteToVolunteer(
    targetUserId: string,
    body: { requestingAdminId: string },
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const client = await this.pool.connect();
    try {
      const { requestingAdminId } = body;

      if (!requestingAdminId) {
        return { success: false, error: "requestingAdminId is required" };
      }

      await client.query("BEGIN");

      const requestingUser = await this.loadRequestingUserForVolunteerPromotion(
        client,
        requestingAdminId,
      );

      if (requestingUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Requesting user not found" };
      }

      const isSuperAdmin = (requestingUser[0].roles || []).includes(
        "super_admin",
      );
      const isAdmin =
        (requestingUser[0].roles || []).includes("admin") || isSuperAdmin;
      const hierarchyLevel = requestingUser[0].hierarchy_level;

      if (!isAdmin || (hierarchyLevel === null && !isSuperAdmin && !isAdmin)) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
        };
      }

      const targetUser = await this.loadTargetUserForVolunteerPromotion(
        client,
        targetUserId,
      );

      if (targetUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const rootEmail = this.resolveRootAdminEmail();
      if (rootEmail && targetUser[0].email === rootEmail) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "לא ניתן לשנות הרשאות למנהל הראשי - הוא המנהל הראשי",
        };
      }

      const targetIsVolunteer = (targetUser[0].roles || []).includes(
        "volunteer",
      );
      if (
        targetIsVolunteer &&
        targetUser[0].parent_manager_id &&
        targetUser[0].parent_manager_id !== requestingAdminId
      ) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "משתמש זה כבר מתנדב תחת מישהו אחר - לא ניתן להעביר",
        };
      }

      const promoteVolunteerHierarchy =
        await this.assertRequesterMayPullTargetUnderSelf(
          client,
          requestingAdminId,
          targetUserId,
          targetUser[0].parent_manager_id,
          isSuperAdmin,
          "לא ניתן להפוך את המנהל שלך או מנהלים מעליו למתנדב תחתיך",
        );
      if (!promoteVolunteerHierarchy.ok) {
        await client.query("ROLLBACK");
        return { success: false, error: promoteVolunteerHierarchy.error };
      }

      const currentRoles = Array.isArray(targetUser[0].roles)
        ? targetUser[0].roles
        : [];
      const uniqueRoles = new Set(currentRoles);
      uniqueRoles.add("volunteer");
      const newRoles = Array.from(uniqueRoles);

      await client.query(
        `
        UPDATE user_profiles 
        SET roles = $1::text[], parent_manager_id = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [newRoles, requestingAdminId, targetUserId],
      );

      await client.query("COMMIT");

      await this.redisCache.delete(`user_profile_${targetUserId}`);
      await this.redisCache.delete(`user_profile_${requestingAdminId}`);
      await this.redisCache.invalidatePattern("users_list*");

      return {
        success: true,
        message: `${targetUser[0].name || targetUser[0].email} הפך למתנדב תחתיך`,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Promote to volunteer error:", error);
      return { success: false, error: "Failed to promote user to volunteer" };
    } finally {
      client.release();
    }
  }

  async getEligibleForPromotion(
    adminId: string,
  ): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
      const { rows: adminRows } = await this.pool.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [adminId],
      );

      if (adminRows.length === 0) {
        return { success: false, error: "Admin not found" };
      }

      const isSuperAdmin = (adminRows[0].roles || []).includes("super_admin");

      const rootEmail = this.resolveRootAdminEmail();

      let query: string;
      let params: (string | number | boolean | null)[];

      if (isSuperAdmin) {
        query = `
          SELECT id, name, email, avatar_url, roles, parent_manager_id
          FROM user_profiles
          WHERE id != $1
          AND LOWER(TRIM(email)) <> $2
          AND (
            NOT ('admin' = ANY(roles) OR 'super_admin' = ANY(roles))
            OR (('admin' = ANY(roles) OR 'super_admin' = ANY(roles)) AND parent_manager_id IS NULL)
          )
          ORDER BY name
        `;
        params = [adminId, rootEmail];
      } else {
        query = `
          WITH RECURSIVE manager_chain AS (
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $1
            
            UNION ALL
            
            SELECT u.id, u.parent_manager_id, mc.depth + 1
            FROM user_profiles u
            INNER JOIN manager_chain mc ON u.id = mc.parent_manager_id
            WHERE mc.depth < 100
          )
          SELECT u.id, u.name, u.email, u.avatar_url, u.roles, u.parent_manager_id
          FROM user_profiles u
          WHERE u.id != $1
          AND LOWER(TRIM(u.email)) <> $2
          AND NOT (
            ('admin' = ANY(u.roles) OR 'super_admin' = ANY(u.roles))
            AND u.parent_manager_id IS NOT NULL
            AND u.parent_manager_id != $1
          )
          AND u.id NOT IN (SELECT id FROM manager_chain)
          ORDER BY u.name
        `;
        params = [adminId, rootEmail];
      }

      const { rows } = await this.pool.query(query, params);

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Get eligible for promotion error:", error);
      return { success: false, error: "Failed to get eligible users" };
    }
  }

  async getFullHierarchyTree(): Promise<{
    success: boolean;
    error?: string;
    data?: HierarchyTreeNode[];
    totalCount?: number;
  }> {
    try {
      await this.ensureSalarySeniorityColumns();

      const rootEmail = this.resolveRootAdminEmail();

      const { rows: rootAdminRows } = await this.pool.query(
        `
        SELECT id, name, email, avatar_url, roles
        FROM user_profiles
        WHERE LOWER(TRIM(email)) = $1
        LIMIT 1
      `,
        [rootEmail],
      );

      if (rootAdminRows.length === 0) {
        return {
          success: false,
          error: `Root admin (${rootEmail}) not found`,
        };
      }

      let allUsers: HierarchyUserRow[];
      try {
        const result = await this.pool.query(
          `
          WITH RECURSIVE hierarchy AS (
            SELECT 
              id, name, email, avatar_url, 
              NULL::UUID as parent_manager_id,
              roles, salary, seniority_start_date,
              0 as level,
              ARRAY[id] as path
            FROM user_profiles
            WHERE LOWER(TRIM(email)) = $1
            
            UNION ALL
            
            SELECT 
              u.id, u.name, u.email, u.avatar_url, u.parent_manager_id, u.roles, u.salary, u.seniority_start_date,
              h.level + 1,
              h.path || u.id
            FROM user_profiles u
            INNER JOIN hierarchy h ON u.parent_manager_id = h.id
            WHERE h.level < 10
              AND LOWER(TRIM(u.email)) <> $1
          )
          SELECT 
            id::text as id, 
            COALESCE(name, 'ללא שם') as name, 
            email, 
            avatar_url, 
            parent_manager_id::text as parent_manager_id, 
            roles,
            level,
            COALESCE(salary, 0) as salary,
            COALESCE(seniority_start_date::text, CURRENT_DATE::text) as seniority_start_date,
            CASE 
              WHEN LOWER(TRIM(email)) = $1 THEN true 
              ELSE false 
            END as is_super_admin
          FROM hierarchy
          ORDER BY level, name
        `,
          [rootEmail],
        );
        allUsers = result.rows as HierarchyUserRow[];
      } catch (err) {
        const error = err as Error;
        if (error.message?.includes("salary")) {
          const result = await this.pool.query(
            `
            WITH RECURSIVE hierarchy AS (
              SELECT 
                id, name, email, avatar_url, 
                NULL::UUID as parent_manager_id,
                roles,
                0::DECIMAL(10,2) as salary,
                CURRENT_DATE::DATE as seniority_start_date,
                0 as level,
                ARRAY[id] as path
              FROM user_profiles
              WHERE LOWER(TRIM(email)) = $1
              
              UNION ALL
              
              SELECT 
                u.id, u.name, u.email, u.avatar_url, u.parent_manager_id, u.roles,
                0::DECIMAL(10,2) as salary,
                CURRENT_DATE::DATE as seniority_start_date,
                h.level + 1,
                h.path || u.id
              FROM user_profiles u
              INNER JOIN hierarchy h ON u.parent_manager_id = h.id
              WHERE h.level < 10
                AND LOWER(TRIM(u.email)) <> $1
            )
            SELECT 
              id::text as id, 
              COALESCE(name, 'ללא שם') as name, 
              email, 
              avatar_url, 
              parent_manager_id::text as parent_manager_id, 
              roles,
              level,
              0 as salary,
              CURRENT_DATE::text as seniority_start_date,
              CASE 
                WHEN LOWER(TRIM(email)) = $1 THEN true 
                ELSE false 
              END as is_super_admin
            FROM hierarchy
            ORDER BY level, name
          `,
            [rootEmail],
          );
          allUsers = result.rows as HierarchyUserRow[];
        } else {
          throw error;
        }
      }

      const tree = this.buildHierarchyTreeFromRows(
        allUsers,
        null,
        0,
        new Set(),
      );

      this.logger.log(`🌳 Built hierarchy tree with ${allUsers.length} users`);

      return {
        success: true,
        data: tree,
        totalCount: allUsers.length,
      };
    } catch (error) {
      this.logger.error("Get full hierarchy tree error:", error);
      return { success: false, error: "Failed to get hierarchy tree" };
    }
  }

  async getUserHierarchy(
    id: string,
  ): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
      const { rows } = await this.pool.query(
        `
        WITH RECURSIVE subordinates AS (
          SELECT id, name, email, avatar_url, parent_manager_id, 1 as level
          FROM user_profiles
          WHERE parent_manager_id = $1
          
          UNION ALL
          
          SELECT u.id, u.name, u.email, u.avatar_url, u.parent_manager_id, s.level + 1
          FROM user_profiles u
          INNER JOIN subordinates s ON u.parent_manager_id = s.id
        )
        SELECT * FROM subordinates ORDER BY level, name
      `,
        [id],
      );

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Get hierarchy error:", error);
      return { success: false, error: "Failed to get hierarchy" };
    }
  }
}
