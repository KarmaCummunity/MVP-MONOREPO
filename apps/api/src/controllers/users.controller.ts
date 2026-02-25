// File overview:
// - Purpose: Users API for register/login (relational), get/update profile, list users, activities/stats, and follow/unfollow.
// - Reached from: Routes under '/api/users'.
// - Provides: Endpoints for CRUD-like operations and analytics; uses Redis caching for profiles/lists.
// - Storage: `user_profiles`, `user_follows`, `user_activities` (and joins to donations/rides).

// TODO: CRITICAL - This file is too long (509 lines). Split into multiple services:
//   - UserService for business logic
//   - UserProfileService for profile operations
//   - UserStatsService for analytics
//   - UserFollowService for follow/unfollow logic
// TODO: Add comprehensive DTO validation for all endpoints
// TODO: Implement proper pagination with cursor-based approach instead of offset
// TODO: Add comprehensive error handling with proper HTTP status codes
// TODO: Standardize response format across all endpoints
// TODO: Add proper database constraint validation and conflict handling
// TODO: Implement soft deletes instead of hard deletes where applicable
// TODO: Add comprehensive logging and monitoring
// TODO: Add unit and integration tests for all endpoints
// TODO: Optimize database queries - many N+1 query problems
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
  Logger,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtService } from "../auth/jwt.service";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import * as admin from "firebase-admin";

type UserSettings = {
  language?: string;
  dark_mode?: boolean;
  darkMode?: boolean;
  notifications_enabled?: boolean;
  notificationsEnabled?: boolean;
  privacy?: string;
  [key: string]: unknown;
};

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

type HierarchyTreeNode = {
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

type RegisterUserBody = {
  email: string;
  password?: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  settings?: UserSettings;
  firebase_uid?: string;
  id?: string;
};

type LoginUserBody = {
  email: string;
  password?: string;
};

type FollowBody = {
  follower_id: string;
};

type UpdateUserBody = {
  password?: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  settings?: UserSettings;
  firebase_uid?: string;
  roles?: string[];
  parent_manager_id?: string;
  hierarchy_level?: number | null;
};

type StatsRow = {
  [key: string]: number | string | null;
};

type StatsQueryResult = {
  rows: StatsRow[];
};

type ResolveUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  roles: string[] | null;
  settings: UserSettings | null;
  created_at: string | Date;
  last_active: string | Date;
  firebase_uid?: string | null;
  google_id?: string | null;
};

type FirebaseProviderInfo = {
  providerId: string;
  uid?: string | null;
};

@Controller("api/users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  // TODO: Move constants to a dedicated constants file
  // TODO: Make cache TTL configurable through environment variables
  // TODO: Implement different TTL values for different types of data
  private readonly CACHE_TTL = 15 * 60; // 15 minutes

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Root admin email from env - the only protected user (cannot be demoted/modified). */
  private getRootAdminEmail(): string {
    return (this.configService.get<string>("ROOT_ADMIN_EMAIL") || "")
      .toLowerCase()
      .trim();
  }

  // ================================================================
  // Phase 2+ Methods: Admin Hierarchy, Complex RBAC, Analytics
  // Disabled for MVP — DO NOT DELETE. Re-enable per roadmap phases.
  // ================================================================
  /**
   * Ensure salary and seniority_start_date columns exist in user_profiles table
   * Creates them if missing (idempotent)
   */
  private async ensureSalarySeniorityColumns(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        // Check if columns exist
        const checkResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND column_name IN ('salary', 'seniority_start_date', 'parent_manager_id')
        `);

        const existingColumns = checkResult.rows.map((r) => r.column_name);

        if (!existingColumns.includes("salary")) {
          this.logger.log("📋 Adding salary column to user_profiles...");
          await client.query(`
            ALTER TABLE user_profiles 
            ADD COLUMN salary DECIMAL(10,2) DEFAULT 0
          `);
          this.logger.log("✅ Added salary column");
        }

        if (!existingColumns.includes("seniority_start_date")) {
          this.logger.log(
            "📋 Adding seniority_start_date column to user_profiles...",
          );
          await client.query(`
            ALTER TABLE user_profiles 
            ADD COLUMN seniority_start_date DATE DEFAULT CURRENT_DATE
          `);
          this.logger.log("✅ Added seniority_start_date column");
        }

        if (!existingColumns.includes("parent_manager_id")) {
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
      // Don't throw - allow fallback query to work
    }
  }

  /**
   * Search users for autocomplete (lightweight)
   * GET /api/users/search?q=...
   */
  @Get("search")
  async searchUsers(@Query("q") query: string) {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    try {
      const { rows } = await this.pool.query(
        `
        SELECT id, name, email, avatar_url, roles
        FROM user_profiles
        WHERE (name ILIKE $1 OR email ILIKE $1)
        AND is_active = true
        LIMIT 20
      `,
        [`%${query}%`],
      );

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Search users error:", error);
      return { success: false, error: "Failed to search users" };
    }
  }

  /**
   * Set parent manager for a user
   * POST /api/users/:id/set-manager
   * Body: { managerId: string | null, requestingUserId?: string }
   */
  @Post(":id/set-manager")
  @UseGuards(JwtAuthGuard)
  async setManager(
    @Param("id") id: string,
    @Body()
    body: { managerId: string | null | undefined; requestingUserId?: string },
  ) {
    try {
      const { managerId, requestingUserId } = body;

      this.logger.log(
        `[setManager] Setting manager for user ${id}: managerId=${managerId} (type: ${typeof managerId}), requestingUserId=${requestingUserId}`,
      );
      this.logger.log(`[setManager] Full body:`, JSON.stringify(body));

      // Permission check: only admin or super admin can change manager assignments
      if (requestingUserId) {
        const { rows: reqUser } = await this.pool.query(
          `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
          [requestingUserId],
        );

        if (reqUser.length > 0) {
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
        }
      }

      // CRITICAL: Protect root admin (from env) - cannot be changed
      const rootEmail = this.getRootAdminEmail();
      const { rows: targetUserCheck } = await this.pool.query(
        "SELECT email FROM user_profiles WHERE id = $1",
        [id],
      );

      if (
        rootEmail &&
        targetUserCheck.length > 0 &&
        (targetUserCheck[0].email || "").toLowerCase().trim() === rootEmail
      ) {
        this.logger.log(
          `[setManager] ❌ BLOCKED: Attempt to modify root admin`,
        );
        return {
          success: false,
          error: "לא ניתן לשנות את המנהל הראשי - הוא המנהל הראשי",
        };
      }

      // If managerId is null or undefined, we're removing the manager assignment
      if (
        managerId === null ||
        managerId === undefined ||
        managerId === "null" ||
        managerId === ""
      ) {
        // Check current state
        const { rows: currentUser } = await this.pool.query(
          "SELECT parent_manager_id FROM user_profiles WHERE id = $1",
          [id],
        );

        if (currentUser.length === 0) {
          this.logger.log(`[setManager] User not found: ${id}`);
          return { success: false, error: "User not found" };
        }

        // Logic: When removing a manager assignment:
        // - If user is NOT an admin, remove 'volunteer' role (becomes regular user)
        // - If user IS an admin, remove 'admin' role too (admin must have a manager, except root admin)
        const currentManagerId = currentUser[0].parent_manager_id;
        this.logger.log(
          `[setManager] Removing manager assignment for user ${id}, current manager: ${currentManagerId}`,
        );

        // Check if user is an admin
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

        // Build new roles array
        let newRoles = Array.isArray(userData[0]?.roles)
          ? [...userData[0].roles]
          : [];

        // Remove volunteer role
        newRoles = newRoles.filter((r: string) => r !== "volunteer");

        // If admin (and not root admin), remove admin roles too (admin must have a manager)
        if (isAdmin && !isRootAdmin) {
          newRoles = newRoles.filter(
            (r: string) => r !== "admin" && r !== "super_admin",
          );
          this.logger.log(
            `[setManager] ⚠️ Removing admin roles from user ${id} because manager assignment was removed (admin must have a manager)`,
          );
        }

        // Update: remove manager, and update roles
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

        // Invalidate caches to ensure fresh data
        await this.redisCache.delete(`user_profile_${id}`);
        await this.redisCache.invalidatePattern("users_list*");
        this.logger.log(
          `[setManager] Invalidated cache for user ${id} and all user lists`,
        );

        this.logger.log(
          `✅ Manager removed: ${id} no longer reports to anyone`,
        );
        return { success: true, message: "שיוך מנהל הוסר בהצלחה" };
      }

      // Prevent validation loop (user cannot be their own manager)
      if (managerId === id) {
        return { success: false, error: "User cannot be their own manager" };
      }

      // Check if manager exists
      const { rows: checkManager } = await this.pool.query(
        "SELECT id, email, parent_manager_id FROM user_profiles WHERE id = $1",
        [managerId],
      );
      if (checkManager.length === 0) {
        return { success: false, error: "Manager not found" };
      }

      const managerEmail = checkManager[0].email;
      const managerCurrentParent = checkManager[0].parent_manager_id;

      // CRITICAL FIX: If the proposed manager is the root admin (from env),
      // ensure it has NO parent_manager_id (cannot be subordinate to anyone)
      if (
        rootEmail &&
        (managerEmail || "").toLowerCase().trim() === rootEmail &&
        managerCurrentParent !== null
      ) {
        this.logger.log(
          `[setManager] 🔧 FIXING: Root admin has parent_manager_id=${managerCurrentParent}, removing it...`,
        );
        await this.pool.query(
          `
          UPDATE user_profiles 
          SET parent_manager_id = NULL, updated_at = NOW()
          WHERE id = $1
        `,
          [managerId],
        );
        this.logger.log(
          `[setManager] ✅ Fixed: Root admin no longer has a parent manager`,
        );
        // Invalidate cache
        await this.redisCache.delete(`user_profile_${managerId}`);
        await this.redisCache.invalidatePattern("users_list*");
      }

      // SPECIAL CASE: If assigning to root admin (from env), skip cycle check
      if (
        rootEmail &&
        (managerEmail || "").toLowerCase().trim() === rootEmail
      ) {
        this.logger.log(
          `[setManager] ✅ Assigning to root admin - skipping cycle check`,
        );
        // Proceed directly to assignment (skip cycle detection)
      } else {
        // Full cycle detection using recursive CTE
        // Check if 'id' (subordinate) appears anywhere in managerId's hierarchy chain
        // This prevents: user → ... → manager → user (circular)

        // First, get current hierarchy info for debugging
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

        // Get the full chain from managerId going up to see what we're checking
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
            -- Base case: start from the proposed manager
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $1
            
            UNION ALL
            
            -- Recursive: go up the chain
            SELECT u.id, u.parent_manager_id, mc.depth + 1
            FROM user_profiles u
            INNER JOIN manager_chain mc ON u.id = mc.parent_manager_id
            WHERE mc.depth < 100 AND u.parent_manager_id IS NOT NULL
          )
          SELECT id, depth FROM manager_chain WHERE id = $2 LIMIT 1
        `,
          [managerId, id],
        );

        this.logger.log(
          `[setManager] 🔄 Checking for hierarchy cycle: Would user ${id} becoming subordinate of ${managerId} create a cycle?`,
        );
        this.logger.log(`[setManager] 🔍 Cycle check result:`, cycleCheck);

        if (cycleCheck.length > 0) {
          // Get user details for better error message
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
          const managerInfo = userDetailsTyped.find(
            (u) => u.id === managerId,
          ) || {
            id: managerId,
            name: null,
            email: null,
          };

          const userName = userInfo.name || userInfo.email || id;
          const managerName =
            managerInfo.name || managerInfo.email || managerId;

          this.logger.log(
            `❌ [setManager] CYCLE DETECTED: Cannot assign ${managerName} as manager of ${userName}`,
          );
          this.logger.log(
            `   Reason: ${userName} is already in the management chain above ${managerName}`,
          );
          this.logger.log(
            `   This would create a circular chain: ${userName} → ... → ${managerName} → ${userName}`,
          );
          return {
            success: false,
            error: `לא ניתן להגדיר את ${managerName} כמנהל של ${userName} - זה יוצר מחזור בהיררכיה כי ${userName} כבר נמצא בשרשרת הניהול מעל ${managerName}`,
          };
        }

        this.logger.log(`[setManager] ✅ No upward cycle found`);
      }

      // Check reverse direction - if manager is subordinate of user
      if (
        !rootEmail ||
        (managerEmail || "").toLowerCase().trim() !== rootEmail
      ) {
        const { rows: reverseCheck } = await this.pool.query(
          `
          WITH RECURSIVE subordinate_tree AS (
            -- Base case: direct subordinates of user
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE parent_manager_id = $2
            
            UNION ALL
            
            -- Recursive: subordinates of subordinates
            SELECT u.id, u.parent_manager_id, st.depth + 1
            FROM user_profiles u
            INNER JOIN subordinate_tree st ON u.parent_manager_id = st.id
            WHERE st.depth < 100
          )
          SELECT 1 FROM subordinate_tree WHERE id = $1 LIMIT 1
        `,
          [managerId, id],
        );

        this.logger.log(
          `[setManager] 🔄 Checking reverse: Is ${managerId} a subordinate of ${id}?`,
        );

        if (reverseCheck.length > 0) {
          // Get user details for better error message
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
          const managerName =
            managerInfo.name || managerInfo.email || managerId;

          this.logger.log(
            `❌ [setManager] REVERSE CYCLE DETECTED: ${managerName} is currently a subordinate of ${userName}`,
          );
          this.logger.log(
            `   Cannot assign ${managerName} as manager of ${userName} - would create cycle`,
          );
          return {
            success: false,
            error: `לא ניתן להגדיר את ${managerName} כמנהל של ${userName} - ${managerName} כבר כפוף ל-${userName}`,
          };
        }

        this.logger.log(
          `[setManager] ✅ No reverse cycle found - proceeding with assignment`,
        );
      } else {
        this.logger.log(
          `[setManager] ✅ Skipping reverse cycle check (root admin cannot be subordinate)`,
        );
      }

      this.logger.log(
        `[setManager] 📝 Before UPDATE: user=${id}, new parent_manager_id=${managerId}`,
      );

      // CRITICAL CHECK: Admin must have a manager (except root admin)
      // If user is an admin and we're removing their manager, we should have already removed admin role
      // But let's also check: if user is an admin and doesn't have a manager, that's invalid
      const { rows: userCheck } = await this.pool.query(
        "SELECT roles, email FROM user_profiles WHERE id = $1",
        [id],
      );

      if (userCheck.length > 0) {
        const userRoles = Array.isArray(userCheck[0].roles)
          ? userCheck[0].roles
          : [];
        const isAdmin =
          userRoles.includes("admin") || userRoles.includes("super_admin");
        const isRootAdmin =
          rootEmail &&
          (userCheck[0].email || "").toLowerCase().trim() === rootEmail;

        // If user is an admin (and not root admin), they MUST have a manager
        if (isAdmin && !isRootAdmin && !managerId) {
          this.logger.log(
            `[setManager] ❌ BLOCKED: Admin ${id} cannot exist without a manager (except root admin)`,
          );
          return {
            success: false,
            error:
              "מנהל חייב להיות משויך למנהל מעליו (חוץ מהמנהל הראשי). אם ברצונך להסיר את השיוך, המשתמש יהפוך למשתמש רגיל.",
          };
        }
      }

      // Logic: When a user is assigned a manager, they automatically become a 'volunteer'.
      // If they're already an admin, they keep admin role (every manager is also a volunteer).
      // Update to set manager AND ensure 'volunteer' role (keep admin if exists)
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
        [managerId, id],
      );

      // Invalidate caches to ensure fresh data
      await this.redisCache.delete(`user_profile_${id}`);
      await this.redisCache.delete(`user_profile_${managerId}`);
      await this.redisCache.invalidatePattern("users_list*");
      this.logger.log(
        `[setManager] ♻️ Invalidated cache for users ${id} and ${managerId} and all user lists`,
      );

      this.logger.log(`✅ Manager set: ${id} now reports to ${managerId}`);
      this.logger.log(
        `[setManager] 📊 Updated: parent_manager_id=${managerId}`,
      );

      return { success: true, message: "Manager updated successfully" };
    } catch (error) {
      this.logger.error("Set manager error:", error);
      return { success: false, error: "Failed to set manager" };
    }
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
    const client = await this.pool.connect();
    try {
      const { action, managerId } = body;
      await client.query("BEGIN");

      // CRITICAL: Protect root admin (from env)
      const rootEmail = this.getRootAdminEmail();
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
        this.logger.log(
          `[manageHierarchy] ❌ BLOCKED: Attempt to modify root admin`,
        );
        return {
          success: false,
          error: "לא ניתן לשנות את המנהל הראשי - הוא המנהל הראשי",
        };
      }

      if (action === "add") {
        // Full cycle detection using recursive CTE
        // Check if subordinateId appears anywhere in managerId's hierarchy chain (upwards)
        // This prevents: A → B → C → A cycles at any depth
        const { rows: cycleCheck } = await client.query(
          `
          WITH RECURSIVE manager_chain AS (
            -- Base case: start from the proposed manager
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $1
            
            UNION ALL
            
            -- Recursive: go up the chain
            SELECT u.id, u.parent_manager_id, mc.depth + 1
            FROM user_profiles u
            INNER JOIN manager_chain mc ON u.id = mc.parent_manager_id
            WHERE mc.depth < 100  -- Prevent infinite loops in case of existing cycles
          )
          SELECT 1 FROM manager_chain WHERE id = $2 LIMIT 1
        `,
          [managerId, subordinateId],
        );

        this.logger.log(
          `[manageHierarchy] 🔄 Checking for hierarchy cycle: Would ${subordinateId} → ${managerId} create a cycle?`,
        );

        if (cycleCheck.length > 0) {
          await client.query("ROLLBACK");
          this.logger.log(
            `❌ [manageHierarchy] CYCLE DETECTED: ${subordinateId} is already in the management chain ABOVE ${managerId}`,
          );
          return {
            success: false,
            error:
              "Cannot create hierarchy cycle - this would create a circular management chain",
          };
        }

        this.logger.log(`[manageHierarchy] ✅ No upward cycle found`);

        // Also check if subordinate would become manager of someone in their own chain
        const { rows: reverseCheck } = await client.query(
          `
          WITH RECURSIVE subordinate_chain AS (
            -- Base case: start from the subordinate
            SELECT id, parent_manager_id, 1 as depth
            FROM user_profiles
            WHERE id = $2
            
            UNION ALL
            
            -- Recursive: go up the chain
            SELECT u.id, u.parent_manager_id, sc.depth + 1
            FROM user_profiles u
            INNER JOIN subordinate_chain sc ON u.id = sc.parent_manager_id
            WHERE sc.depth < 100
          )
          SELECT 1 FROM subordinate_chain WHERE id = $1 LIMIT 1
        `,
          [managerId, subordinateId],
        );

        this.logger.log(
          `[manageHierarchy] 🔄 Checking reverse: Is ${managerId} in hierarchy chain of ${subordinateId}?`,
        );

        if (reverseCheck.length > 0) {
          await client.query("ROLLBACK");
          this.logger.log(
            `❌ [manageHierarchy] REVERSE CYCLE DETECTED: ${managerId} is already in management chain of ${subordinateId}`,
          );
          return {
            success: false,
            error:
              "Cannot assign - this user is already in your management chain",
          };
        }

        this.logger.log(
          `[manageHierarchy] ✅ No reverse cycle found - proceeding with assignment`,
        );

        await client.query(
          `
          UPDATE user_profiles 
          SET parent_manager_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
          [managerId, subordinateId],
        );

        await client.query("COMMIT");
        this.logger.log(
          `✅ Hierarchy updated: ${subordinateId} now reports to ${managerId}`,
        );
        return { success: true, message: "Subordinate added successfully" };
      } else if (action === "remove") {
        // Validate that they are currently managed by this manager
        const { rows: currentCheck } = await client.query(
          "SELECT parent_manager_id, name, email FROM user_profiles WHERE id = $1",
          [subordinateId],
        );
        if (currentCheck[0]?.parent_manager_id !== managerId) {
          await client.query("ROLLBACK");
          return { success: false, error: "User is not your subordinate" };
        }

        const subordinateName =
          currentCheck[0]?.name || currentCheck[0]?.email || "Unknown";

        // 1. Get tasks that will be transferred (for notification and logging)
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
        this.logger.log(
          `📋 Found ${transferCount} active tasks to transfer from ${subordinateId} to ${managerId}`,
        );

        // 2. Remove manager link
        await client.query(
          `
          UPDATE user_profiles 
          SET parent_manager_id = NULL, updated_at = NOW()
          WHERE id = $1
        `,
          [subordinateId],
        );

        // 3. Transfer active tasks (assignees) from subordinate to manager
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

          this.logger.log(
            `✅ Transferred ${transferCount} tasks from ${subordinateName} to manager ${managerId}`,
          );

          // Log the transfer details
          this.logger.log(
            "📝 Transferred tasks:",
            tasksToTransfer
              .map((t) => `${t.id.substring(0, 8)}: ${t.title} (${t.priority})`)
              .join(", "),
          );
        }

        await client.query("COMMIT");

        // 4. Create notification for manager about transferred tasks (non-blocking)
        if (transferCount > 0) {
          try {
            // Insert notification directly to the database
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
            this.logger.log(
              `🔔 Notification sent to manager ${managerId} about ${transferCount} transferred tasks`,
            );
          } catch (notifError) {
            this.logger.warn(
              "Failed to create transfer notification (non-fatal):",
              notifError,
            );
          }
        }

        return {
          success: true,
          message: `Subordinate removed and ${transferCount} tasks transferred`,
          data: { transferredTasks: transferCount },
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

  /**
   * Promote a user to admin role with hierarchy validation
   * POST /api/users/:id/promote-admin
   * Body: { requestingAdminId: string }
   *
   * Rules:
   * 1. The requesting admin must be an admin
   * 2. The target user must NOT already be an admin under someone else
   * 3. The target user must NOT be a manager above the requesting admin
   * 4. The target user will be set as subordinate of the requesting admin
   */
  @Post(":id/promote-admin")
  @UseGuards(JwtAuthGuard)
  async promoteToAdmin(
    @Param("id") targetUserId: string,
    @Body() body: { requestingAdminId: string },
  ) {
    const client = await this.pool.connect();
    try {
      const { requestingAdminId } = body;

      this.logger.log(
        `[promoteToAdmin] 📝 Request: targetUserId=${targetUserId}, requestingAdminId=${requestingAdminId}`,
      );

      if (!requestingAdminId) {
        return { success: false, error: "requestingAdminId is required" };
      }

      await client.query("BEGIN");

      // 1. Verify requesting user exists and is an admin
      const { rows: requestingUser } = await client.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [requestingAdminId],
      );

      this.logger.log(`[promoteToAdmin] 🔍 Requesting user lookup:`, {
        requestingAdminId,
        found: requestingUser.length > 0,
        user: requestingUser[0] || null,
      });

      if (requestingUser.length === 0) {
        await client.query("ROLLBACK");
        this.logger.log(
          `[promoteToAdmin] ❌ Requesting user not found: ${requestingAdminId}`,
        );
        return { success: false, error: "Requesting user not found" };
      }

      const isSuperAdmin = (requestingUser[0].roles || []).includes(
        "super_admin",
      );
      const isAdmin =
        (requestingUser[0].roles || []).includes("admin") || isSuperAdmin;

      this.logger.log(`[promoteToAdmin] 🔐 Authorization check:`, {
        email: requestingUser[0].email,
        roles: requestingUser[0].roles,
        isSuperAdmin,
        isAdmin,
      });

      if (!isAdmin) {
        await client.query("ROLLBACK");
        this.logger.log(
          `[promoteToAdmin] ❌ Authorization denied - not an admin`,
        );
        return {
          success: false,
          error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
        };
      }

      // 2. Get target user info
      const { rows: targetUser } = await client.query(
        `SELECT id, name, email, roles, parent_manager_id FROM user_profiles WHERE id = $1`,
        [targetUserId],
      );

      if (targetUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      // CRITICAL: Protect root admin (from env)
      const rootEmail = this.getRootAdminEmail();
      if (
        rootEmail &&
        (targetUser[0].email || "").toLowerCase().trim() === rootEmail
      ) {
        await client.query("ROLLBACK");
        this.logger.log(
          `[promoteToAdmin] ❌ BLOCKED: Attempt to modify root admin`,
        );
        return {
          success: false,
          error: "לא ניתן לשנות הרשאות למנהל הראשי - הוא המנהל הראשי",
        };
      }

      const targetIsAlreadyAdmin =
        (targetUser[0].roles || []).includes("admin") ||
        (targetUser[0].roles || []).includes("super_admin");

      // 3. Check if target is already an admin under someone else
      if (targetIsAlreadyAdmin && targetUser[0].parent_manager_id) {
        if (targetUser[0].parent_manager_id !== requestingAdminId) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: "משתמש זה כבר מנהל תחת מישהו אחר - לא ניתן להעביר",
          };
        }
        // Already an admin under requesting admin - nothing to do
        await client.query("ROLLBACK");
        return { success: true, message: "משתמש זה כבר מנהל תחתיך" };
      }

      // 4. Check if target is in the management chain above the requesting admin
      // (Cannot promote your own manager or their managers)
      if (!isSuperAdmin) {
        const { rows: chainCheck } = await client.query(
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
          [requestingAdminId, targetUserId],
        );

        if (chainCheck.length > 0) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: "לא ניתן להפוך את המנהל שלך או מנהלים מעליו למנהל תחתיך",
          };
        }
      }

      // 5. All checks passed - promote the user to admin
      // Add 'admin' role (and 'volunteer' if not exists - every manager is also a volunteer)
      const currentRoles = Array.isArray(targetUser[0].roles)
        ? targetUser[0].roles
        : [];
      // Ensure unique roles and add admin + volunteer
      const uniqueRoles = new Set(currentRoles);
      uniqueRoles.add("admin");
      uniqueRoles.add("volunteer"); // Every manager is also a volunteer
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

      // Invalidate caches to ensure fresh data on next request
      await this.redisCache.delete(`user_profile_${targetUserId}`);
      await this.redisCache.delete(`user_profile_${requestingAdminId}`);
      await this.redisCache.invalidatePattern("users_list*");
      this.logger.log(
        `[promoteToAdmin] ♻️ Invalidated cache for users ${targetUserId} and ${requestingAdminId}`,
      );

      this.logger.log(
        `✅ User ${targetUserId} promoted to admin under ${requestingAdminId}`,
      );
      this.logger.log(
        `[promoteToAdmin] 📊 Updated: roles=${JSON.stringify(newRoles)}, parent_manager_id=${requestingAdminId}`,
      );

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

  /**
   * Demote an admin to regular user or volunteer (remove admin role)
   * POST /api/users/:id/demote-admin
   * Body: { requestingAdminId: string, convertToVolunteer?: boolean }
   *
   * Rules:
   * 1. The requesting admin must be an admin
   * 2. Can only demote admins that are YOUR subordinates
   * 3. Super admin can demote anyone except themselves
   * 4. If convertToVolunteer is true, user becomes volunteer under requesting admin
   */
  @Post(":id/demote-admin")
  @UseGuards(JwtAuthGuard)
  async demoteAdmin(
    @Param("id") targetUserId: string,
    @Body() body: { requestingAdminId: string; convertToVolunteer?: boolean },
  ) {
    const client = await this.pool.connect();
    try {
      const { requestingAdminId, convertToVolunteer = false } = body;

      this.logger.log(
        `[demoteAdmin] 📝 Request: targetUserId=${targetUserId}, requestingAdminId=${requestingAdminId}, convertToVolunteer=${convertToVolunteer}`,
      );

      if (!requestingAdminId) {
        return { success: false, error: "requestingAdminId is required" };
      }

      await client.query("BEGIN");

      // 1. Verify requesting user exists and is an admin
      const { rows: requestingUser } = await client.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [requestingAdminId],
      );

      this.logger.log(`[demoteAdmin] 🔍 Requesting user lookup:`, {
        requestingAdminId,
        found: requestingUser.length > 0,
        user: requestingUser[0] || null,
      });

      if (requestingUser.length === 0) {
        await client.query("ROLLBACK");
        this.logger.log(
          `[demoteAdmin] ❌ Requesting user not found: ${requestingAdminId}`,
        );
        return { success: false, error: "Requesting user not found" };
      }

      const isSuperAdmin = (requestingUser[0].roles || []).includes(
        "super_admin",
      );
      const isAdmin =
        (requestingUser[0].roles || []).includes("admin") || isSuperAdmin;

      this.logger.log(`[demoteAdmin] 🔐 Authorization check:`, {
        email: requestingUser[0].email,
        roles: requestingUser[0].roles,
        isSuperAdmin,
        isAdmin,
      });

      if (!isAdmin) {
        await client.query("ROLLBACK");
        this.logger.log(`[demoteAdmin] ❌ Authorization denied - not an admin`);
        return {
          success: false,
          error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
        };
      }

      // 2. Get target user info
      const { rows: targetUser } = await client.query(
        `SELECT id, name, email, roles, parent_manager_id FROM user_profiles WHERE id = $1`,
        [targetUserId],
      );

      if (targetUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      // CRITICAL: Protect root admin (from env)
      const rootEmail = this.getRootAdminEmail();
      if (
        rootEmail &&
        (targetUser[0].email || "").toLowerCase().trim() === rootEmail
      ) {
        await client.query("ROLLBACK");
        this.logger.log(
          `[demoteAdmin] ❌ BLOCKED: Attempt to modify root admin`,
        );
        return {
          success: false,
          error: "לא ניתן לשנות הרשאות למנהל הראשי - הוא המנהל הראשי",
        };
      }

      // 3. Check authorization - can only demote your own subordinates
      if (!isSuperAdmin) {
        // Check if target is a direct subordinate OR in the subordinate tree
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

        if (subordinateCheck.length === 0) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: "ניתן להסיר הרשאות מנהל רק ממנהלים שתחתיך",
          };
        }
      }

      // 4. Remove admin role and handle conversion
      const currentRoles = Array.isArray(targetUser[0].roles)
        ? targetUser[0].roles
        : [];
      const hasParentManager = !!targetUser[0].parent_manager_id;

      // Remove admin and super_admin roles
      let newRoles = currentRoles.filter(
        (r: string) => r !== "admin" && r !== "super_admin",
      );

      let newParentManagerId: string | null = null;

      if (convertToVolunteer) {
        // Convert to volunteer: set parent_manager_id to requesting admin and add volunteer role
        newParentManagerId = requestingAdminId;
        if (!newRoles.includes("volunteer")) {
          newRoles.push("volunteer");
        }
        this.logger.log(
          `[demoteAdmin] 🔄 Converting to volunteer under ${requestingAdminId}`,
        );
      } else {
        // Regular demotion: if no parent_manager_id, remove volunteer role (becomes regular user)
        // If has parent_manager_id, keep it and keep volunteer role (they're still a volunteer)
        if (!hasParentManager) {
          newRoles = newRoles.filter((r: string) => r !== "volunteer");
          newParentManagerId = null;
        } else {
          // Keep existing parent_manager_id and volunteer role
          newParentManagerId = targetUser[0].parent_manager_id;
          if (!newRoles.includes("volunteer")) {
            newRoles.push("volunteer");
          }
        }
      }

      this.logger.log(
        `[demoteAdmin] 📝 Before UPDATE: target=${targetUserId}, hasParent=${hasParentManager}, convertToVolunteer=${convertToVolunteer}, currentRoles=${JSON.stringify(currentRoles)}, newRoles=${JSON.stringify(newRoles)}, newParentManagerId=${newParentManagerId}`,
      );

      // Update: remove admin roles, set parent_manager_id, and update volunteer role
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

      // Invalidate caches to ensure fresh data on next request
      await this.redisCache.delete(`user_profile_${targetUserId}`);
      await this.redisCache.delete(`user_profile_${requestingAdminId}`);
      await this.redisCache.invalidatePattern("users_list*");
      this.logger.log(
        `[demoteAdmin] ♻️ Invalidated cache for users ${targetUserId} and ${requestingAdminId}`,
      );

      this.logger.log(
        `✅ User ${targetUserId} demoted from admin by ${requestingAdminId}`,
      );
      this.logger.log(
        `[demoteAdmin] 📊 Updated: roles=${JSON.stringify(newRoles)}, parent_manager_id=${newParentManagerId}`,
      );

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

  /**
   * Promote a user to volunteer role
   * POST /api/users/:id/promote-volunteer
   * Body: { requestingAdminId: string }
   *
   * Rules:
   * 1. The requesting admin must be a manager (hierarchy_level >= 1)
   * 2. The target user must NOT already be a volunteer under someone else
   * 3. The target user will be set as subordinate of the requesting admin
   * 4. Adds 'volunteer' role (keeps 'admin' if exists)
   */
  @Post(":id/promote-volunteer")
  @UseGuards(JwtAuthGuard)
  async promoteToVolunteer(
    @Param("id") targetUserId: string,
    @Body() body: { requestingAdminId: string },
  ) {
    const client = await this.pool.connect();
    try {
      const { requestingAdminId } = body;

      this.logger.log(
        `[promoteToVolunteer] 📝 Request: targetUserId=${targetUserId}, requestingAdminId=${requestingAdminId}`,
      );

      if (!requestingAdminId) {
        return { success: false, error: "requestingAdminId is required" };
      }

      await client.query("BEGIN");

      // 1. Verify requesting user exists and is a manager
      let requestingUser: RequestingUserRow[];
      try {
        const result = await client.query(
          `SELECT id, email, roles, hierarchy_level FROM user_profiles WHERE id = $1`,
          [requestingAdminId],
        );
        requestingUser = result.rows as RequestingUserRow[];
      } catch (err) {
        const error = err as Error;
        // Fallback: if hierarchy_level column doesn't exist yet
        if (error.message && error.message.includes("hierarchy_level")) {
          const result = await client.query(
            `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
            [requestingAdminId],
          );
          requestingUser = result.rows.map(
            (row): RequestingUserRow => ({
              ...(row as { id: string; email: string; roles: string[] | null }),
              hierarchy_level: null,
            }),
          );
        } else {
          throw error;
        }
      }

      if (requestingUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "Requesting user not found" };
      }

      // SEC-003.1: Use RBAC roles instead of hardcoded emails
      const isSuperAdmin = (requestingUser[0].roles || []).includes(
        "super_admin",
      );
      const isAdmin =
        (requestingUser[0].roles || []).includes("admin") || isSuperAdmin;
      const hierarchyLevel = requestingUser[0].hierarchy_level;

      // Only managers (hierarchy_level >= 1) can promote to volunteer
      // If hierarchy_level is null (migration not run), allow if isAdmin
      if (!isAdmin || (hierarchyLevel === null && !isSuperAdmin && !isAdmin)) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: "אין לך הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל",
        };
      }

      // 2. Get target user info
      let targetUser: TargetUserRow[];
      try {
        const result = await client.query(
          `SELECT id, name, email, roles, parent_manager_id, hierarchy_level FROM user_profiles WHERE id = $1`,
          [targetUserId],
        );
        targetUser = result.rows as TargetUserRow[];
      } catch (err) {
        const error = err as Error;
        // Fallback: if hierarchy_level column doesn't exist yet
        if (error.message && error.message.includes("hierarchy_level")) {
          const result = await client.query(
            `SELECT id, name, email, roles, parent_manager_id FROM user_profiles WHERE id = $1`,
            [targetUserId],
          );
          targetUser = result.rows.map(
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
        } else {
          throw error;
        }
      }

      if (targetUser.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      // CRITICAL: Protect root admin — use env var, not hardcoded email
      const rootEmail = this.getRootAdminEmail();
      if (rootEmail && targetUser[0].email === rootEmail) {
        await client.query("ROLLBACK");
        this.logger.log(
          `[promoteToVolunteer] ❌ BLOCKED: Attempt to modify root admin (${rootEmail})`,
        );
        return {
          success: false,
          error: "לא ניתן לשנות הרשאות למנהל הראשי - הוא המנהל הראשי",
        };
      }

      // SEC-003.1: Use RBAC roles instead of hardcoded emails

      // 3. Check if target is already a volunteer under someone else
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

      // 4. Check for cycles (same as promoteToAdmin)
      if (!isSuperAdmin) {
        const { rows: chainCheck } = await client.query(
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
          [requestingAdminId, targetUserId],
        );

        if (chainCheck.length > 0) {
          await client.query("ROLLBACK");
          return {
            success: false,
            error: "לא ניתן להפוך את המנהל שלך או מנהלים מעליו למתנדב תחתיך",
          };
        }
      }

      // 5. All checks passed - promote to volunteer
      const currentRoles = Array.isArray(targetUser[0].roles)
        ? targetUser[0].roles
        : [];
      const uniqueRoles = new Set(currentRoles);
      uniqueRoles.add("volunteer");
      const newRoles = Array.from(uniqueRoles);

      // Set parent_manager_id and add volunteer role
      // hierarchy_level will be calculated automatically by trigger
      await client.query(
        `
        UPDATE user_profiles 
        SET roles = $1::text[], parent_manager_id = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [newRoles, requestingAdminId, targetUserId],
      );

      await client.query("COMMIT");

      // Invalidate caches
      await this.redisCache.delete(`user_profile_${targetUserId}`);
      await this.redisCache.delete(`user_profile_${requestingAdminId}`);
      await this.redisCache.invalidatePattern("users_list*");
      this.logger.log(
        `[promoteToVolunteer] ♻️ Invalidated cache for users ${targetUserId} and ${requestingAdminId}`,
      );

      this.logger.log(
        `✅ User ${targetUserId} promoted to volunteer under ${requestingAdminId}`,
      );
      this.logger.log(
        `[promoteToVolunteer] 📊 Updated: roles=${JSON.stringify(newRoles)}, parent_manager_id=${requestingAdminId}`,
      );

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

  /**
   * Get users eligible for admin promotion by a specific admin
   * GET /api/users/eligible-for-promotion/:adminId
   * Returns users that can be promoted by this admin
   */
  @Get("eligible-for-promotion/:adminId")
  async getEligibleForPromotion(@Param("adminId") adminId: string) {
    try {
      // Get admin info
      const { rows: adminRows } = await this.pool.query(
        `SELECT id, email, roles FROM user_profiles WHERE id = $1`,
        [adminId],
      );

      if (adminRows.length === 0) {
        return { success: false, error: "Admin not found" };
      }

      // SEC-003.1: Use RBAC roles instead of hardcoded emails
      const isSuperAdmin = (adminRows[0].roles || []).includes("super_admin");

      // Get all users who are NOT:
      // 1. The requesting admin themselves
      // 2. Already admins under someone else (unless super admin)
      // 3. In the management chain above the requesting admin
      // 4. Super admin

      let query: string;
      let params: (string | number | boolean | null)[];

      if (isSuperAdmin) {
        // Super admin can promote anyone who isn't already an admin OR is an orphan admin
        query = `
          SELECT id, name, email, avatar_url, roles, parent_manager_id
          FROM user_profiles
          WHERE id != $1
          AND email NOT IN ('navesarussi@gmail.com', 'karmacommunity2.0@gmail.com')
          AND (
            -- Not an admin yet
            NOT ('admin' = ANY(roles) OR 'super_admin' = ANY(roles))
            -- OR is an admin without a parent (orphan admin - can be reassigned)
            OR (('admin' = ANY(roles) OR 'super_admin' = ANY(roles)) AND parent_manager_id IS NULL)
          )
          ORDER BY name
        `;
        params = [adminId];
      } else {
        // Regular admins can only promote users who:
        // - Are not admins yet
        // - Are not in their management chain above them
        query = `
          WITH RECURSIVE manager_chain AS (
            -- Get all managers above requesting admin
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
          AND u.email NOT IN ('navesarussi@gmail.com', 'karmacommunity2.0@gmail.com')
          -- Not already an admin under someone else
          AND NOT (
            ('admin' = ANY(u.roles) OR 'super_admin' = ANY(u.roles))
            AND u.parent_manager_id IS NOT NULL
            AND u.parent_manager_id != $1
          )
          -- Not in management chain above
          AND u.id NOT IN (SELECT id FROM manager_chain)
          ORDER BY u.name
        `;
        params = [adminId];
      }

      const { rows } = await this.pool.query(query, params);

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Get eligible for promotion error:", error);
      return { success: false, error: "Failed to get eligible users" };
    }
  }

  /**
   * Get full admin hierarchy tree starting from super admin
   * GET /api/users/hierarchy/tree
   * Returns a nested tree structure of all managers
   * NOTE: This route MUST be defined BEFORE :id/hierarchy to avoid route conflict
   */
  @Get("hierarchy/tree")
  async getFullHierarchyTree() {
    try {
      // Ensure columns exist before querying
      await this.ensureSalarySeniorityColumns();

      // First, get the ROOT admin (karmacommunity2.0@gmail.com) - the KING
      const { rows: rootAdminRows } = await this.pool.query(`
        SELECT id, name, email, avatar_url, roles
        FROM user_profiles
        WHERE email = 'karmacommunity2.0@gmail.com'
        LIMIT 1
      `);

      if (rootAdminRows.length === 0) {
        return {
          success: false,
          error: "Root admin (karmacommunity2.0@gmail.com) not found",
        };
      }

      // Try query with salary/seniority fields, fallback if columns don't exist
      let allUsers: HierarchyUserRow[];
      try {
        const result = await this.pool.query(`
          WITH RECURSIVE hierarchy AS (
            -- Base case: ROOT admin (karmacommunity2.0@gmail.com) - the KING
            SELECT 
              id, name, email, avatar_url, 
              NULL::UUID as parent_manager_id,  -- CRITICAL: Root admin ALWAYS has NULL
              roles, salary, seniority_start_date,
              0 as level,
              ARRAY[id] as path
            FROM user_profiles
            WHERE email = 'karmacommunity2.0@gmail.com'
            
            UNION ALL
            
            -- Recursive: all subordinates
            SELECT 
              u.id, u.name, u.email, u.avatar_url, u.parent_manager_id, u.roles, u.salary, u.seniority_start_date,
              h.level + 1,
              h.path || u.id
            FROM user_profiles u
            INNER JOIN hierarchy h ON u.parent_manager_id = h.id
            WHERE h.level < 10  -- Max depth to prevent infinite loops
              AND u.email != 'karmacommunity2.0@gmail.com'  -- Prevent root admin from appearing twice
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
            CASE WHEN email = 'karmacommunity2.0@gmail.com' THEN true 
                 WHEN email = 'navesarussi@gmail.com' THEN true 
                 ELSE false END as is_super_admin
          FROM hierarchy
          ORDER BY level, name
        `);
        allUsers = result.rows as HierarchyUserRow[];
      } catch (err) {
        const error = err as Error;
        // If columns don't exist, use query without them
        if (error.message && error.message.includes("salary")) {
          this.logger.warn(
            "Salary/seniority columns not found, using fallback query",
          );
          const result = await this.pool.query(`
            WITH RECURSIVE hierarchy AS (
              -- Base case: ROOT admin (karmacommunity2.0@gmail.com) - the KING
              SELECT 
                id, name, email, avatar_url, 
                NULL::UUID as parent_manager_id,  -- CRITICAL: Root admin ALWAYS has NULL
                roles,
                0::DECIMAL(10,2) as salary,
                CURRENT_DATE::DATE as seniority_start_date,
                0 as level,
                ARRAY[id] as path
              FROM user_profiles
              WHERE email = 'karmacommunity2.0@gmail.com'
              
              UNION ALL
              
              -- Recursive: all subordinates
              SELECT 
                u.id, u.name, u.email, u.avatar_url, u.parent_manager_id, u.roles,
                0::DECIMAL(10,2) as salary,
                CURRENT_DATE::DATE as seniority_start_date,
                h.level + 1,
                h.path || u.id
              FROM user_profiles u
              INNER JOIN hierarchy h ON u.parent_manager_id = h.id
              WHERE h.level < 10  -- Max depth to prevent infinite loops
                AND u.email != 'karmacommunity2.0@gmail.com'  -- Prevent root admin from appearing twice
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
              CASE WHEN email = 'karmacommunity2.0@gmail.com' THEN true 
                   WHEN email = 'navesarussi@gmail.com' THEN true 
                   ELSE false END as is_super_admin
            FROM hierarchy
            ORDER BY level, name
          `);
          allUsers = result.rows as HierarchyUserRow[];
        } else {
          throw error;
        }
      }

      // Build nested tree structure with cycle detection
      // We use a Set to track visited IDs in the current branch
      const buildTree = (
        parentId: string | null,
        level: number,
        visitedIds: Set<string> = new Set(),
      ): HierarchyTreeNode[] => {
        // Safety break for deep recursion
        if (level > 20) return [];

        return (
          allUsers
            .filter((user) => {
              if (level === 0) {
                // Root level: only the ROOT admin (karmacommunity2.0@gmail.com) - the KING
                return user.email === "karmacommunity2.0@gmail.com";
              }
              return user.parent_manager_id === parentId;
            })
            // Filter out users we've already visited in this branch to prevent cycles
            .filter((user) => !visitedIds.has(user.id))
            .map((user) => {
              // Create a new set for the next level including current user
              const nextVisitedIds = new Set(visitedIds);
              nextVisitedIds.add(user.id);

              const userRoles = Array.isArray(user.roles) ? user.roles : [];
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                level: user.level,
                isSuperAdmin: user.is_super_admin,
                isAdmin:
                  userRoles.includes("admin") ||
                  userRoles.includes("super_admin"),
                isVolunteer:
                  userRoles.includes("volunteer") &&
                  !(
                    userRoles.includes("admin") ||
                    userRoles.includes("super_admin")
                  ),
                salary: user.salary || 0,
                seniority_start_date:
                  user.seniority_start_date ||
                  new Date().toISOString().split("T")[0],
                children: buildTree(user.id, level + 1, nextVisitedIds),
              };
            })
        );
      };

      const tree = buildTree(null, 0);

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

  /**
   * Get direct subordinates and their sub-tree (hierarchy)
   * GET /api/users/:id/hierarchy
   */
  @Get(":id/hierarchy")
  async getUserHierarchy(@Param("id") id: string) {
    try {
      // Recursive CTE to get full hierarchy
      const { rows } = await this.pool.query(
        `
        WITH RECURSIVE subordinates AS (
          -- Base case: direct subordinates
          SELECT id, name, email, avatar_url, parent_manager_id, 1 as level
          FROM user_profiles
          WHERE parent_manager_id = $1
          
          UNION ALL
          
          -- Recursive member: subordinates of subordinates
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
  // ================================================================
  // End Phase 2+ Admin Hierarchy & RBAC block
  // ================================================================

  @Post("register")
  async registerUser(@Body() userData: RegisterUserBody) {
    // TODO: Replace 'any' with proper DTO interface
    // TODO: Add comprehensive input validation (email format, password strength)
    // TODO: Add rate limiting to prevent spam registrations
    // TODO: Add email verification flow before account activation
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const normalizedEmail = userData.email.toLowerCase().trim();

      // Check if user already exists in user_profiles table
      const { rows: existingUsers } = await client.query(
        `SELECT id FROM user_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail],
      );

      if (existingUsers.length > 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User already exists" };
      }

      // Hash password if provided
      let passwordHash = null;
      if (userData.password) {
        passwordHash = await argon2.hash(userData.password);
      }

      const PRE_APPROVED_ADMINS = [
        "mahalalel100@gmail.com",
        "matan7491@gmail.com",
        "ichai1306@gmail.com",
        "lianbh2004@gmail.com",
        "navesarussi@gmail.com",
        "karmacommunity2.0@gmail.com",
      ];

      const shouldBeAdmin = PRE_APPROVED_ADMINS.includes(normalizedEmail);
      const initialRoles = shouldBeAdmin ? ["user", "admin"] : ["user"];

      const nowIso = new Date().toISOString();
      // Insert user into user_profiles table with UUID
      // Include firebase_uid if provided (for Firebase authentication)
      const { rows: newUser } = await client.query(
        `
        INSERT INTO user_profiles (
          email, name, phone, avatar_url, bio, password_hash,
          karma_points, join_date, is_active, last_active,
          city, country, interests, roles, email_verified, settings, firebase_uid
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb, $17)
        RETURNING id
      `,
        [
          normalizedEmail,
          userData.name || normalizedEmail.split("@")[0],
          userData.phone || "+9720000000",
          userData.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "User")}&background=random`,
          userData.bio || "משתמש חדש בקארמה קומיוניטי",
          passwordHash,
          0, // karma_points
          nowIso, // join_date
          true, // is_active
          nowIso, // last_active
          userData.city || "ישראל", // city
          userData.country || "Israel", // country
          userData.interests || [], // interests
          initialRoles, // roles
          false, // email_verified
          JSON.stringify(
            userData.settings || {
              language: "he",
              dark_mode: false,
              notifications_enabled: true,
              privacy: "public",
            },
          ), // settings
          userData.firebase_uid || userData.id || null, // firebase_uid - use id if it's a Firebase UID
        ],
      );

      const userId = newUser[0].id;

      await client.query("COMMIT");

      // Clear statistics cache when new user is registered
      // This ensures totalUsers and other user-related stats are refreshed immediately
      await this.redisCache.clearStatsCaches();

      // Fetch the created user to return full data
      const { rows: createdUser } = await client.query(
        `SELECT id, email, name, phone, avatar_url, bio, city, country, interests, roles, settings, created_at, parent_manager_id
         FROM user_profiles WHERE id = $1`,
        [userId],
      );

      // Return user data in the expected format
      const user = {
        id: createdUser[0].id,
        email: createdUser[0].email,
        name: createdUser[0].name,
        phone: createdUser[0].phone,
        avatar_url: createdUser[0].avatar_url,
        bio: createdUser[0].bio || "",
        karma_points: 0,
        join_date: createdUser[0].created_at,
        is_active: true,
        last_active: nowIso,
        city: createdUser[0].city || "",
        country: createdUser[0].country || "Israel",
        interests: createdUser[0].interests || [],
        roles: createdUser[0].roles || ["user"],
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        total_donations_amount: 0,
        total_volunteer_hours: 0,
        email_verified: false,
        parent_manager_id: createdUser[0].parent_manager_id || null,
        settings: createdUser[0].settings || {},
      };

      return { success: true, data: user };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Register user error:", error);
      return { success: false, error: "Failed to register user" };
    } finally {
      client.release();
    }
  }

  @Post("login")
  async loginUser(@Body() loginData: LoginUserBody) {
    try {
      const normalizedEmail = loginData.email.toLowerCase().trim();

      // Use user_profiles table
      const { rows } = await this.pool.query(
        `SELECT id, email, name, phone, avatar_url, bio, password_hash, 
                karma_points, join_date, is_active, last_active, parent_manager_id,
                city, country, interests, roles, settings, created_at
         FROM user_profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail],
      );

      if (rows.length === 0) {
        return { success: false, error: "User not found" };
      }

      const user = rows[0];

      // Auto-grant admin role for pre-approved emails (Self-healing)
      const PRE_APPROVED_ADMINS = [
        "mahalalel100@gmail.com",
        "matan7491@gmail.com",
        "ichai1306@gmail.com",
        "lianbh2004@gmail.com",
        "navesarussi@gmail.com",
        "karmacommunity2.0@gmail.com",
      ];

      const shouldBeAdmin = PRE_APPROVED_ADMINS.includes(normalizedEmail);
      const currentRoles: string[] = user.roles || [];

      if (shouldBeAdmin && !currentRoles.includes("admin")) {
        await this.pool.query(
          `UPDATE user_profiles SET roles = array_append(roles, 'admin') WHERE id = $1`,
          [user.id],
        );
        user.roles = [...currentRoles, "admin"];
      }

      // Verify password if provided
      if (loginData.password && user.password_hash) {
        const isValid = await argon2.verify(
          user.password_hash,
          loginData.password,
        );
        if (!isValid) {
          return { success: false, error: "Invalid password" };
        }
      }

      // Update last active
      await this.pool.query(
        `UPDATE user_profiles SET last_active = NOW(), updated_at = NOW() WHERE id = $1`,
        [user.id],
      );

      // Return user data in the expected format
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        bio: user.bio || "",
        karma_points: user.karma_points || 0,
        join_date: user.join_date || user.created_at,
        is_active: user.is_active !== false,
        last_active: new Date().toISOString(),
        city: user.city || "",
        country: user.country || "Israel",
        interests: user.interests || [],
        roles: user.roles || ["user"],
        posts_count: 0, // TODO: Calculate from actual data
        followers_count: 0, // TODO: Calculate from actual data
        following_count: 0, // TODO: Calculate from actual data
        total_donations_amount: 0,
        total_volunteer_hours: 0,
        email_verified: user.email_verified || false,
        parent_manager_id: user.parent_manager_id || null,
        settings: user.settings || {},
      };

      return { success: true, data: userResponse };
    } catch (error) {
      this.logger.error("Login user error:", error);
      return { success: false, error: "Login failed" };
    }
  }

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    try {
      this.logger.log(`[UsersController] getUserById called with id: ${id}`);

      // Normalize email to lowercase for consistent lookup
      // This matches the normalization used in auth.controller.ts
      const normalizedId = id.includes("@")
        ? String(id).trim().toLowerCase()
        : id;

      this.logger.log(`[UsersController] Normalized id: ${normalizedId}`);

      const cacheKey = `user_profile_${normalizedId}`;

      // Try to get from cache, but handle Redis errors gracefully
      let cached = null;
      try {
        cached = await this.redisCache.get(cacheKey);
        if (cached) {
          this.logger.log(`[UsersController] Cache hit for ${normalizedId}`);
          return { success: true, data: cached };
        }
        this.logger.log(`[UsersController] Cache miss for ${normalizedId}`);
      } catch (cacheError) {
        this.logger.warn(
          `[UsersController] Redis cache error (non-fatal):`,
          cacheError,
        );
        // Continue without cache - don't fail the request
      }

      // Use user_profiles table - support UUID, email, firebase_uid, or google_id lookups
      this.logger.log(
        `[UsersController] Querying database for ${normalizedId}`,
      );

      // Try query with google_id first, if it fails (column doesn't exist), try without it
      let rows: ResolveUserRow[];
      try {
        const result = await this.pool.query(
          `
          SELECT 
            id,
            email,
            COALESCE(name, 'ללא שם') as name,
            phone,
            COALESCE(avatar_url, '') as avatar_url,
            COALESCE(bio, '') as bio,
            -- CRITICAL: Root admin ALWAYS has parent_manager_id = NULL
            CASE 
              WHEN email = 'karmacommunity2.0@gmail.com' THEN NULL
              ELSE parent_manager_id
            END as parent_manager_id,
            COALESCE(karma_points, 0) as karma_points,
            COALESCE(join_date, created_at) as join_date,
            COALESCE(is_active, true) as is_active,
            COALESCE(last_active, updated_at) as last_active,
            COALESCE(city, '') as city,
            COALESCE(country, 'Israel') as country,
            COALESCE(interests, ARRAY[]::TEXT[]) as interests,
            COALESCE(roles, ARRAY['user']::TEXT[]) as roles,
            COALESCE(posts_count, 0) as posts_count,
            COALESCE(followers_count, 0) as followers_count,
            COALESCE(following_count, 0) as following_count,
            0 as total_donations_amount,
            0 as total_volunteer_hours,
            COALESCE(email_verified, false) as email_verified,
            COALESCE(settings, '{}'::jsonb) as settings
          FROM user_profiles 
          WHERE id::text = $1 
             OR LOWER(email) = LOWER($1)
             OR firebase_uid = $1
             OR google_id = $1
          LIMIT 1
        `,
          [normalizedId],
        );
        rows = result.rows;
        this.logger.log(
          `[UsersController] Database query returned ${rows.length} rows`,
        );
      } catch (err) {
        const error = err as Error;
        // If google_id column doesn't exist, try without it
        if (error.message && error.message.includes("google_id")) {
          this.logger.log(
            `[UsersController] Retrying query without google_id column`,
          );
          const result = await this.pool.query(
            `
            SELECT 
              id,
              email,
              COALESCE(name, 'ללא שם') as name,
              phone,
              COALESCE(avatar_url, '') as avatar_url,
              COALESCE(bio, '') as bio,
              -- CRITICAL: Root admin ALWAYS has parent_manager_id = NULL
              CASE 
                WHEN email = 'karmacommunity2.0@gmail.com' THEN NULL
                ELSE parent_manager_id
              END as parent_manager_id,
              COALESCE(karma_points, 0) as karma_points,
              COALESCE(join_date, created_at) as join_date,
              COALESCE(is_active, true) as is_active,
              COALESCE(last_active, updated_at) as last_active,
              COALESCE(city, '') as city,
              COALESCE(country, 'Israel') as country,
              COALESCE(interests, ARRAY[]::TEXT[]) as interests,
              COALESCE(roles, ARRAY['user']::TEXT[]) as roles,
              COALESCE(posts_count, 0) as posts_count,
              COALESCE(followers_count, 0) as followers_count,
              COALESCE(following_count, 0) as following_count,
              0 as total_donations_amount,
              0 as total_volunteer_hours,
              COALESCE(email_verified, false) as email_verified,
              COALESCE(settings, '{}'::jsonb) as settings
            FROM user_profiles 
            WHERE id::text = $1 
               OR LOWER(email) = LOWER($1)
               OR firebase_uid = $1
            LIMIT 1
          `,
            [normalizedId],
          );
          rows = result.rows;
          this.logger.log(
            `[UsersController] Retry query returned ${rows.length} rows`,
          );
        } else {
          throw error;
        }
      }

      if (rows.length === 0) {
        this.logger.log(`[UsersController] User not found for ${normalizedId}`);
        return { success: false, error: "User not found" };
      }

      const user = rows[0];
      this.logger.log(
        `[UsersController] User found: ${user.email} (${user.id})`,
      );

      // Try to cache the result, but don't fail if Redis is down
      try {
        await this.redisCache.set(cacheKey, user, this.CACHE_TTL);
        this.logger.log(`[UsersController] User cached successfully`);
      } catch (cacheError) {
        this.logger.warn(
          `[UsersController] Failed to cache user (non-fatal):`,
          cacheError,
        );
        // Continue - caching failure shouldn't fail the request
      }

      return { success: true, data: user };
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `[UsersController] getUserById error for id ${id}:`,
        error,
      );
      this.logger.error(`[UsersController] Error stack:`, error?.stack);
      return {
        success: false,
        error: "Failed to get user",
        details: error?.message || "Unknown error",
      };
    }
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param("id") id: string,
    @Body() updateData: UpdateUserBody,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Get existing user data from user_profiles
      const { rows: existingRows } = await client.query(
        `
        SELECT id, email, name, phone, avatar_url, bio, password_hash,
               city, country, interests, settings, roles, created_at
        FROM user_profiles 
        WHERE id::text = $1 OR LOWER(email) = LOWER($1) OR firebase_uid = $1 OR google_id = $1
        LIMIT 1
      `,
        [id],
      );

      if (existingRows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, error: "User not found" };
      }

      const existingUser = existingRows[0];
      const userId = existingUser.id;

      // CRITICAL: Protect root admin - karmacommunity2.0@gmail.com is the KING
      if (existingUser.email === "karmacommunity2.0@gmail.com") {
        // Allow updates to name, avatar, etc. but block changes to roles, parent_manager_id, hierarchy_level
        if (
          updateData.roles !== undefined ||
          updateData.parent_manager_id !== undefined ||
          updateData.hierarchy_level !== undefined
        ) {
          await client.query("ROLLBACK");
          this.logger.log(
            `[updateUser] ❌ BLOCKED: Attempt to modify root admin roles/hierarchy (karmacommunity2.0@gmail.com)`,
          );
          return {
            success: false,
            error:
              "לא ניתן לשנות הרשאות או היררכיה למנהל הראשי - הוא המנהל הראשי",
          };
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: (string | number | boolean | string[] | null)[] = [];
      let paramCount = 1;

      if (updateData.password) {
        const passwordHash = await argon2.hash(updateData.password);
        updateFields.push(`password_hash = $${paramCount++}`);
        updateValues.push(passwordHash);
      }
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updateData.name);
      }
      if (updateData.phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        updateValues.push(updateData.phone);
      }
      if (updateData.avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramCount++}`);
        updateValues.push(updateData.avatar_url);
      }
      if (updateData.bio !== undefined) {
        updateFields.push(`bio = $${paramCount++}`);
        updateValues.push(updateData.bio);
      }
      if (updateData.city !== undefined) {
        updateFields.push(`city = $${paramCount++}`);
        updateValues.push(updateData.city);
      }
      if (updateData.country !== undefined) {
        updateFields.push(`country = $${paramCount++}`);
        updateValues.push(updateData.country);
      }
      if (updateData.interests !== undefined) {
        updateFields.push(`interests = $${paramCount++}`);
        updateValues.push(updateData.interests);
      }
      if (updateData.settings !== undefined) {
        updateFields.push(`settings = $${paramCount++}::jsonb`);
        updateValues.push(
          JSON.stringify({ ...existingUser.settings, ...updateData.settings }),
        );
      }
      if (updateData.firebase_uid !== undefined) {
        updateFields.push(`firebase_uid = $${paramCount++}`);
        updateValues.push(updateData.firebase_uid);
      }
      if (updateData.roles !== undefined) {
        // SEC-003.1: Use ROOT_ADMIN_EMAIL env var instead of hardcoded emails
        const rootAdminEmail = this.getRootAdminEmail();
        const superAdminEmails = rootAdminEmail ? [rootAdminEmail] : [];
        if (
          superAdminEmails.includes(existingUser.email?.toLowerCase() || "")
        ) {
          // Instead of throwing error, we just ignore the roles update for this user to be safe but not break other updates
          this.logger.warn(
            `Attempted to modify roles of Super Admin (${existingUser.email}) - Ignoring role update.`,
          );
        } else {
          updateFields.push(`roles = $${paramCount++}::text[]`);
          updateValues.push(updateData.roles);
        }
      }

      // Always update last_active and updated_at
      updateFields.push(`last_active = NOW()`, `updated_at = NOW()`);

      if (updateFields.length > 2) {
        // More than just last_active and updated_at
        updateValues.push(userId);
        await client.query(
          `
          UPDATE user_profiles 
          SET ${updateFields.join(", ")}
          WHERE id = $${paramCount}
        `,
          updateValues,
        );
      } else {
        // Only update last_active
        await client.query(
          `
          UPDATE user_profiles 
          SET last_active = NOW(), updated_at = NOW()
          WHERE id = $1
        `,
          [userId],
        );
      }

      await client.query("COMMIT");

      // Fetch updated user
      const { rows: updatedRows } = await client.query(
        `
        SELECT id, email, name, phone, avatar_url, bio, karma_points, join_date,
               is_active, last_active, city, country, interests, roles, 
               posts_count, followers_count, following_count, email_verified, settings, created_at
        FROM user_profiles WHERE id = $1
      `,
        [userId],
      );

      // Clear cache to ensure fresh data after update
      await this.redisCache.delete(`user_profile_${id}`);
      await this.redisCache.delete(`user_profile_${userId}`);
      await this.redisCache.invalidatePattern("users_list*");

      const updatedUser = updatedRows[0];

      // Return user data in the expected format
      const user = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        avatar_url: updatedUser.avatar_url,
        bio: updatedUser.bio || "",
        karma_points: updatedUser.karma_points || 0,
        join_date: updatedUser.join_date || updatedUser.created_at,
        is_active: updatedUser.is_active !== false,
        last_active: updatedUser.last_active,
        city: updatedUser.city || "",
        country: updatedUser.country || "Israel",
        interests: updatedUser.interests || [],
        roles: updatedUser.roles || ["user"],
        posts_count: updatedUser.posts_count || 0,
        followers_count: updatedUser.followers_count || 0,
        following_count: updatedUser.following_count || 0,
        total_donations_amount: 0,
        total_volunteer_hours: 0,
        email_verified: updatedUser.email_verified || false,
        settings: updatedUser.settings || {},
      };

      return { success: true, data: user };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Update user error:", error);
      return { success: false, error: "Failed to update user" };
    } finally {
      client.release();
    }
  }

  @Get()
  async getUsers(
    @Query("city") city?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("forceRefresh") forceRefresh?: string,
  ) {
    // TODO: Implement proper cache key structure and versioning
    // TODO: Add cache invalidation strategy when users are updated
    // TODO: Implement cache warming for frequently accessed data
    const cacheKey = `users_list_${city || "all"}_${search || ""}_${limit || "50"}_${offset || "0"}`;

    // Skip cache if forceRefresh is requested
    const shouldForceRefresh = forceRefresh === "true" || forceRefresh === "1";

    if (!shouldForceRefresh) {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        this.logger.log(
          `[getUsers] 📦 Returning cached data for key: ${cacheKey}`,
        );
        return { success: true, data: cached };
      }
    } else {
      this.logger.log(
        `[getUsers] 🔄 Force refresh requested, bypassing cache for key: ${cacheKey}`,
      );
    }

    // Unified query: Get all users from both user_profiles and users (legacy) tables
    // טבלה מאוחדת: כל המשתמשים מ-user_profiles ו-users (legacy)
    const params: (string | number)[] = [];
    let paramCount = 0;

    // Build WHERE conditions for filtering
    let whereConditions = "";

    if (city) {
      paramCount++;
      whereConditions += ` AND u.city ILIKE $${paramCount}`;
      params.push(`%${city}%`);
    }

    if (search) {
      paramCount++;
      whereConditions += ` AND (u.name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Build pagination
    let limitClause = "";
    let offsetClause = "";

    if (limit) {
      paramCount++;
      limitClause = `LIMIT $${paramCount}`;
      params.push(parseInt(limit));
    } else {
      limitClause = `LIMIT 50`;
    }

    if (offset) {
      paramCount++;
      offsetClause = `OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    // Main query: Get users from user_profiles only (legacy users table no longer used)
    // Includes manager details (name, email, avatar) via subquery
    // Includes hierarchy_level for hierarchy management (if column exists)
    // CRITICAL: Root admin (karmacommunity2.0@gmail.com) ALWAYS has parent_manager_id = NULL
    let query: string;
    let rows = [];
    try {
      // Try query with hierarchy_level (if migration ran)
      query = `
        SELECT 
          u.id::text as id,
          COALESCE(u.name, 'ללא שם') as name,
          COALESCE(u.avatar_url, '') as avatar_url,
          COALESCE(u.city, '') as city,
          COALESCE(u.karma_points, 0) as karma_points,
          COALESCE(u.last_active, u.updated_at) as last_active,
          COALESCE(u.total_donations_amount, 0) as total_donations_amount,
          COALESCE(u.total_volunteer_hours, 0) as total_volunteer_hours,
          COALESCE(u.join_date, u.created_at) as join_date,
          COALESCE(u.bio, '') as bio,
          COALESCE(u.roles, ARRAY['user']::text[]) as roles,
          u.email,
          u.is_active,
          u.created_at,
          -- CRITICAL: Root admin ALWAYS has parent_manager_id = NULL (enforced)
          CASE 
            WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL::text
            ELSE u.parent_manager_id::text
          END as parent_manager_id,
          u.hierarchy_level,
          -- Only show manager_details if NOT root admin and has parent_manager_id
          CASE 
            WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL
            ELSE (SELECT json_build_object(
              'id', m.id::text,
              'name', COALESCE(m.name, 'ללא שם'),
              'email', m.email,
              'avatar_url', COALESCE(m.avatar_url, '')
            )::jsonb FROM user_profiles m WHERE m.id = u.parent_manager_id)
          END::jsonb as manager_details
        FROM user_profiles u
        WHERE u.email IS NOT NULL AND u.email <> ''
          ${whereConditions}
        ORDER BY u.karma_points DESC, u.last_active DESC, u.join_date DESC
        ${limitClause}
        ${offsetClause}
      `;
      const result = await this.pool.query(query, params);
      rows = result.rows;
    } catch (err) {
      const error = err as Error;
      // Fallback: if hierarchy_level column doesn't exist yet (migration not run)
      // OR if there's a type conversion error (jsonb/json)
      if (
        error.message &&
        (error.message.includes("hierarchy_level") ||
          error.message.includes("could not convert type jsonb"))
      ) {
        this.logger.warn("[getUsers] Using fallback query:", error.message);
        query = `
          SELECT 
            u.id::text as id,
            COALESCE(u.name, 'ללא שם') as name,
            COALESCE(u.avatar_url, '') as avatar_url,
            COALESCE(u.city, '') as city,
            COALESCE(u.karma_points, 0) as karma_points,
            COALESCE(u.last_active, u.updated_at) as last_active,
            COALESCE(u.total_donations_amount, 0) as total_donations_amount,
            COALESCE(u.total_volunteer_hours, 0) as total_volunteer_hours,
            COALESCE(u.join_date, u.created_at) as join_date,
            COALESCE(u.bio, '') as bio,
            COALESCE(u.roles, ARRAY['user']::text[]) as roles,
            u.email,
            u.is_active,
            u.created_at,
            -- CRITICAL: Root admin ALWAYS has parent_manager_id = NULL (enforced)
            CASE 
              WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL::text
              ELSE u.parent_manager_id::text
            END as parent_manager_id,
            NULL::INTEGER as hierarchy_level,  -- Not available yet
            -- Only show manager_details if NOT root admin and has parent_manager_id
            CASE 
              WHEN u.email = 'karmacommunity2.0@gmail.com' THEN NULL
              ELSE (SELECT json_build_object(
                'id', m.id::text,
                'name', COALESCE(m.name, 'ללא שם'),
                'email', m.email,
                'avatar_url', COALESCE(m.avatar_url, '')
              )::jsonb FROM user_profiles m WHERE m.id = u.parent_manager_id)
            END::jsonb as manager_details
          FROM user_profiles u
          WHERE u.email IS NOT NULL AND u.email <> ''
            ${whereConditions}
          ORDER BY u.karma_points DESC, u.last_active DESC, u.join_date DESC
          ${limitClause}
          ${offsetClause}
        `;
        const result = await this.pool.query(query, params);
        rows = result.rows;
      } else {
        throw error;
      }
    }

    // Log for debugging
    this.logger.log(
      `[UsersController] getUsers returned ${rows.length} users from unified table`,
    );

    // Cache for 20 minutes - user lists are relatively static
    await this.redisCache.set(cacheKey, rows, 20 * 60);
    return { success: true, data: rows };
  }

  // ================================================================
  // Phase 2+ Analytics Methods (kept active — non-breaking for MVP)
  // ================================================================

  @Get(":id/activities")
  async getUserActivities(
    @Param("id") userId: string,
    @Query("limit") limit?: string,
  ) {
    const cacheKey = `user_activities_${userId}_${limit || "50"}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(
      `
      SELECT activity_type, activity_data, created_at
      FROM user_activities 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
      [userId, parseInt(limit || "50")],
    );

    await this.redisCache.set(cacheKey, rows, 5 * 60);
    return { success: true, data: rows };
  }

  /**
   * Get user statistics with partial caching optimization
   */
  @Get(":id/stats")
  async getUserStats(@Param("id") userId: string) {
    const cacheKey = `user_stats_${userId}`;
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    // Try to get individual cached stats using batch get for better performance
    const donationStatsKey = `user_stats_donations_${userId}`;
    const rideStatsKey = `user_stats_rides_${userId}`;
    const bookingStatsKey = `user_stats_bookings_${userId}`;

    const cachedStats = await this.redisCache.getMultiple([
      donationStatsKey,
      rideStatsKey,
      bookingStatsKey,
    ]);

    let donationStats: StatsQueryResult;
    let rideStats: StatsQueryResult;
    let bookingStats: StatsQueryResult;

    // Get donation stats (from cache or DB)
    if (cachedStats.get(donationStatsKey)) {
      donationStats = {
        rows: [cachedStats.get(donationStatsKey) as StatsRow],
      };
    } else {
      const result = await this.pool.query(
        `
        SELECT 
          COUNT(*) as total_donations,
          SUM(CASE WHEN type = 'money' THEN amount ELSE 0 END) as total_money_donated,
          COUNT(CASE WHEN type = 'time' THEN 1 END) as volunteer_activities,
          COUNT(CASE WHEN type = 'trump' THEN 1 END) as rides_offered
        FROM donations
        WHERE donor_id = $1
      `,
        [userId],
      );
      donationStats = result;
      await this.redisCache.set(
        donationStatsKey,
        result.rows[0],
        this.CACHE_TTL,
      );
    }

    // Get ride stats (from cache or DB)
    if (cachedStats.get(rideStatsKey)) {
      rideStats = { rows: [cachedStats.get(rideStatsKey) as StatsRow] };
    } else {
      const result = await this.pool.query(
        `
        SELECT 
          COUNT(*) as rides_created,
          SUM(available_seats) as total_seats_offered,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides
        FROM rides
        WHERE driver_id = $1
      `,
        [userId],
      );
      rideStats = result;
      await this.redisCache.set(rideStatsKey, result.rows[0], this.CACHE_TTL);
    }

    // Get booking stats (from cache or DB)
    if (cachedStats.get(bookingStatsKey)) {
      bookingStats = {
        rows: [cachedStats.get(bookingStatsKey) as StatsRow],
      };
    } else {
      const result = await this.pool.query(
        `
        SELECT 
          COUNT(*) as rides_booked,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_bookings
        FROM ride_bookings
        WHERE passenger_id = $1
      `,
        [userId],
      );
      bookingStats = result;
      await this.redisCache.set(
        bookingStatsKey,
        result.rows[0],
        this.CACHE_TTL,
      );
    }

    const stats = {
      donations: donationStats.rows[0],
      rides: rideStats.rows[0],
      bookings: bookingStats.rows[0],
    };

    // Cache the combined result
    await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);
    return { success: true, data: stats };
  }
  // End Phase 2+ Analytics block (getUserActivities, getUserStats)

  @Post(":id/follow")
  @UseGuards(JwtAuthGuard)
  async followUser(
    @Param("id") userId: string,
    @Body() followData: FollowBody,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert follow relationship
      await client.query(
        `
        INSERT INTO user_follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `,
        [followData.follower_id, userId],
      );

      // Update follower counts
      await client.query(
        `
        UPDATE user_profiles 
        SET followers_count = (
          SELECT COUNT(*) FROM user_follows WHERE following_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [userId],
      );

      await client.query(
        `
        UPDATE user_profiles 
        SET following_count = (
          SELECT COUNT(*) FROM user_follows WHERE follower_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [followData.follower_id],
      );

      // Track activity
      await client.query(
        `
        INSERT INTO user_activities (user_id, activity_type, activity_data)
        VALUES ($1, $2, $3)
      `,
        [
          followData.follower_id,
          "user_followed",
          JSON.stringify({ followed_user_id: userId }),
        ],
      );

      await client.query("COMMIT");

      // Clear relevant caches
      await this.redisCache.delete(`user_profile_${userId}`);
      await this.redisCache.delete(`user_profile_${followData.follower_id}`);

      return { success: true, message: "User followed successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Follow user error:", error);
      return { success: false, error: "Failed to follow user" };
    } finally {
      client.release();
    }
  }

  @Delete(":id/follow")
  @UseGuards(JwtAuthGuard)
  async unfollowUser(
    @Param("id") userId: string,
    @Body() unfollowData: FollowBody,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Remove follow relationship
      await client.query(
        `
        DELETE FROM user_follows 
        WHERE follower_id = $1 AND following_id = $2
      `,
        [unfollowData.follower_id, userId],
      );

      // Update follower counts
      await client.query(
        `
        UPDATE user_profiles 
        SET followers_count = (
          SELECT COUNT(*) FROM user_follows WHERE following_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [userId],
      );

      await client.query(
        `
        UPDATE user_profiles 
        SET following_count = (
          SELECT COUNT(*) FROM user_follows WHERE follower_id = user_profiles.id
        )
        WHERE id = $1
      `,
        [unfollowData.follower_id],
      );

      await client.query("COMMIT");

      // Clear relevant caches
      await this.redisCache.delete(`user_profile_${userId}`);
      await this.redisCache.delete(`user_profile_${unfollowData.follower_id}`);

      return { success: true, message: "User unfollowed successfully" };
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Unfollow user error:", error);
      return { success: false, error: "Failed to unfollow user" };
    } finally {
      client.release();
    }
  }

  // Phase 2+ Analytics: getUsersSummary (Disabled for MVP — DO NOT DELETE)
  // @Get('stats/summary')
  // async getUsersSummary() { ... }
  @Get("stats/summary")
  async getUsersSummary() {
    const cacheKey = "users_summary_stats";
    const cached = await this.redisCache.get(cacheKey);

    if (cached) {
      return { success: true, data: cached };
    }

    const { rows } = await this.pool.query(`
    SELECT 
      COUNT(DISTINCT LOWER(email)) as total_users,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
      COUNT(CASE WHEN last_active >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active_users,
      COUNT(CASE WHEN last_active >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active_users,
      COUNT(CASE WHEN join_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month,
      AVG(karma_points) as avg_karma_points,
      SUM(total_donations_amount) as total_platform_donations
    FROM user_profiles
    WHERE email IS NOT NULL AND email <> ''
  `);

    const stats = rows[0];
    await this.redisCache.set(cacheKey, stats, this.CACHE_TTL);

    return { success: true, data: stats };
  }

  /**
   * Resolve user ID from firebase_uid, google_id, or email to UUID
   * This endpoint is used by the client to get the database UUID when they have Firebase UID or Google ID
   * It performs SMART LINKING: if a user exists by email but lacks the external ID, it updates the record.
   */
  @Post("resolve-id")
  async resolveUserId(
    @Body() body: { firebase_uid?: string; google_id?: string; email?: string },
  ) {
    const { firebase_uid, google_id, email } = body;

    // Use a clearer logging for debugging
    this.logger.log("🔍 ResolveUserId called with:", {
      firebase_uid,
      google_id,
      email,
    });

    if (!firebase_uid && !google_id && !email) {
      return {
        success: false,
        error: "Must provide firebase_uid, google_id, or email",
      };
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Try to find user by ANY of the identifiers
      // Priorities: Database UUID (not passed here), Firebase UID, Google ID, Email
      let query = `
        SELECT id, email, name, avatar_url, roles, settings, created_at, last_active, firebase_uid, google_id
        FROM user_profiles 
        WHERE false 
      `;
      const params = [];
      let paramCount = 1;

      if (firebase_uid) {
        query += ` OR firebase_uid = $${paramCount++}`;
        params.push(firebase_uid);
      }
      if (google_id) {
        // Only if google_id column exists (handled by try/catch in query execution if column missing, but we assume it exists from init)
        query += ` OR google_id = $${paramCount++}`;
        params.push(google_id);
      }
      if (email) {
        query += ` OR LOWER(email) = LOWER($${paramCount++})`;
        params.push(email);
      }

      query += ` LIMIT 1`;

      let rows = [];
      try {
        const result = await client.query(query, params);
        rows = result.rows;
      } catch (err) {
        // Fallback if google_id column doesn't exist yet
        if ((err as Error).message?.includes("google_id")) {
          this.logger.warn(
            "⚠️ Google ID column missing in resolve-id, retrying without it",
          );
          // Retry without google_id logic
          let fallbackQuery = `SELECT id, email, name, avatar_url, roles, settings, created_at, last_active, firebase_uid FROM user_profiles WHERE false`;
          const fallbackParams = [];
          let fbCount = 1;
          if (firebase_uid) {
            fallbackQuery += ` OR firebase_uid = $${fbCount++}`;
            fallbackParams.push(firebase_uid);
          }
          if (email) {
            fallbackQuery += ` OR LOWER(email) = LOWER($${fbCount++})`;
            fallbackParams.push(email);
          }

          const fallbackResult = await client.query(
            fallbackQuery,
            fallbackParams,
          );
          rows = fallbackResult.rows;
        } else {
          throw err;
        }
      }

      if (rows.length === 0) {
        this.logger.log("❌ User not found for resolution:", {
          firebase_uid,
          google_id,
          email,
        });
        // User not found - if we have firebase_uid, try to create user from Firebase
        if (firebase_uid) {
          try {
            // Try to get user info from Firebase Admin SDK
            // Note: This requires Firebase Admin SDK to be initialized
            // If not available, we'll just return error
            if (admin.apps.length > 0) {
              try {
                const firebaseUser = await admin.auth().getUser(firebase_uid);
                if (firebaseUser.email) {
                  // Create user in user_profiles
                  const normalizedEmail = firebaseUser.email
                    .toLowerCase()
                    .trim();
                  const providerData = firebaseUser.providerData as
                    | FirebaseProviderInfo[]
                    | undefined;
                  const googleProvider = providerData?.find(
                    (p) => p.providerId === "google.com",
                  );
                  const googleId = googleProvider?.uid || null;

                  const creationTime = firebaseUser.metadata.creationTime
                    ? new Date(firebaseUser.metadata.creationTime)
                    : new Date();
                  const lastSignInTime = firebaseUser.metadata.lastSignInTime
                    ? new Date(firebaseUser.metadata.lastSignInTime)
                    : creationTime;

                  try {
                    const { rows: newUser } = await client.query(
                      `INSERT INTO user_profiles (
                        firebase_uid, google_id, email, name, avatar_url, bio,
                        karma_points, join_date, is_active, last_active,
                        city, country, interests, roles, email_verified, settings
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::jsonb)
                      RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
                      [
                        firebaseUser.uid,
                        googleId,
                        normalizedEmail,
                        firebaseUser.displayName ||
                          normalizedEmail.split("@")[0] ||
                          "User",
                        firebaseUser.photoURL ||
                          "https://i.pravatar.cc/150?img=1",
                        "משתמש חדש בקארמה קומיוניטי",
                        0,
                        creationTime,
                        true,
                        lastSignInTime,
                        "ישראל",
                        "Israel",
                        [],
                        ["user"],
                        firebaseUser.emailVerified || false,
                        JSON.stringify({
                          language: "he",
                          dark_mode: false,
                          notifications_enabled: true,
                          privacy: "public",
                        }),
                      ],
                    );
                    await client.query("COMMIT");
                    this.logger.log(
                      `✨ Auto-created user from Firebase: ${normalizedEmail} (${firebaseUser.uid})`,
                    );

                    // Generate JWT tokens for the new user
                    const tokenPair = await this.jwtService.createTokenPair({
                      id: newUser[0].id,
                      email: newUser[0].email,
                      roles: newUser[0].roles || ["user"],
                    });

                    return {
                      success: true,
                      tokens: {
                        accessToken: tokenPair.accessToken,
                        refreshToken: tokenPair.refreshToken,
                        expiresIn: tokenPair.expiresIn,
                        refreshExpiresIn: tokenPair.refreshExpiresIn,
                      },
                      user: {
                        id: newUser[0].id,
                        email: newUser[0].email,
                        name: newUser[0].name,
                        avatar: newUser[0].avatar_url,
                        roles: newUser[0].roles || ["user"],
                        settings: newUser[0].settings || {},
                        createdAt: newUser[0].created_at,
                        lastActive: newUser[0].last_active,
                      },
                    };
                  } catch (insertError_: unknown) {
                    const insertError = insertError_ as Error;
                    // If google_id column doesn't exist, try without it
                    if (
                      insertError.message &&
                      insertError.message.includes("google_id")
                    ) {
                      const { rows: newUser } = await client.query(
                        `INSERT INTO user_profiles (
                          firebase_uid, email, name, avatar_url, bio,
                          karma_points, join_date, is_active, last_active,
                          city, country, interests, roles, email_verified, settings
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], $13::text[], $14, $15::jsonb)
                        RETURNING id, email, name, avatar_url, roles, settings, created_at, last_active`,
                        [
                          firebaseUser.uid,
                          normalizedEmail,
                          firebaseUser.displayName ||
                            normalizedEmail.split("@")[0] ||
                            "User",
                          firebaseUser.photoURL ||
                            "https://i.pravatar.cc/150?img=1",
                          "משתמש חדש בקארמה קומיוניטי",
                          0,
                          creationTime,
                          true,
                          lastSignInTime,
                          "ישראל",
                          "Israel",
                          [],
                          ["user"],
                          firebaseUser.emailVerified || false,
                          JSON.stringify({
                            language: "he",
                            dark_mode: false,
                            notifications_enabled: true,
                            privacy: "public",
                          }),
                        ],
                      );
                      await client.query("COMMIT");
                      this.logger.log(
                        `✨ Auto-created user from Firebase (without google_id): ${normalizedEmail} (${firebaseUser.uid})`,
                      );

                      // Generate JWT tokens for the new user
                      const tokenPair = await this.jwtService.createTokenPair({
                        id: newUser[0].id,
                        email: newUser[0].email,
                        roles: newUser[0].roles || ["user"],
                      });

                      return {
                        success: true,
                        tokens: {
                          accessToken: tokenPair.accessToken,
                          refreshToken: tokenPair.refreshToken,
                          expiresIn: tokenPair.expiresIn,
                          refreshExpiresIn: tokenPair.refreshExpiresIn,
                        },
                        user: {
                          id: newUser[0].id,
                          email: newUser[0].email,
                          name: newUser[0].name,
                          avatar: newUser[0].avatar_url,
                          roles: newUser[0].roles || ["user"],
                          settings: newUser[0].settings || {},
                          createdAt: newUser[0].created_at,
                          lastActive: newUser[0].last_active,
                        },
                      };
                    } else {
                      throw insertError;
                    }
                  }
                }
              } catch (firebaseError) {
                this.logger.warn(
                  "⚠️ Could not fetch user from Firebase Admin SDK:",
                  firebaseError,
                );
                // Continue to return error
              }
            }
          } catch {
            // Firebase Admin SDK not available - that's okay, continue
            this.logger.warn(
              "⚠️ Firebase Admin SDK not available for auto-creation",
            );
          }
        }

        await client.query("ROLLBACK");
        this.logger.log("❌ User not found for resolution");
        return { success: false, error: "User not found" };
      }

      const user = rows[0];

      // Log which identifier was used to find the user
      let resolvedBy = "unknown";
      if (firebase_uid && user.firebase_uid === firebase_uid) {
        resolvedBy = "firebase_uid";
      } else if (google_id && user.google_id === google_id) {
        resolvedBy = "google_id";
      } else if (email && user.email?.toLowerCase() === email.toLowerCase()) {
        resolvedBy = "email";
      }
      this.logger.log(`✅ User resolved by ${resolvedBy}:`, {
        email: user.email,
        id: user.id,
      });

      let needsUpdate = false;
      const updateFields: string[] = [];
      const updateValues = [];
      let upCount = 1;

      // 2. Alert on account linking (found by email, but missing external ID)
      if (firebase_uid && user.firebase_uid !== firebase_uid) {
        if (!user.firebase_uid) {
          this.logger.log(
            `🔗 Linking User ${user.email} to Firebase UID: ${firebase_uid}`,
          );
          updateFields.push(`firebase_uid = $${upCount++}`);
          updateValues.push(firebase_uid);
          needsUpdate = true;
        } else {
          this.logger.warn(
            `⚠️ Conflict: User ${user.email} has different Firebase UID (${user.firebase_uid}) than provided (${firebase_uid})`,
          );
        }
      }

      if (google_id && user.google_id !== google_id) {
        // Check if row has google_id property (it might not if column missing)
        // We assume if we are here, we want to try updating it.
        if (!user.google_id) {
          this.logger.log(
            `🔗 Linking User ${user.email} to Google ID: ${google_id}`,
          );
          updateFields.push(`google_id = $${upCount++}`);
          updateValues.push(google_id);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        try {
          // Append ID for WHERE clause
          updateValues.push(user.id);
          const updateQuery = `
            UPDATE user_profiles 
            SET ${updateFields.join(", ")}, updated_at = NOW()
            WHERE id = $${upCount}
          `;
          await client.query(updateQuery, updateValues);
          this.logger.log("✅ User linked successfully");
        } catch (updateErr) {
          this.logger.error("❌ Failed to link user account:", updateErr);
          // Non-fatal? Maybe. But safer to rollback if linking fails.
          // actually, if we fail to link, we should probably still return the user found by email,
          // but logging the error is important.
        }
      }

      await client.query("COMMIT");

      // Clear cache for this user
      await this.redisCache.delete(`user_profile_${user.id}`);
      if (user.firebase_uid)
        await this.redisCache.delete(`user_profile_${user.firebase_uid}`);
      if (user.email)
        await this.redisCache.delete(`user_profile_${user.email}`);

      // Generate JWT tokens for authenticated session
      const tokenPair = await this.jwtService.createTokenPair({
        id: user.id,
        email: user.email,
        roles: user.roles || ["user"],
      });

      return {
        success: true,
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          refreshExpiresIn: tokenPair.refreshExpiresIn,
        },
        user: {
          id: user.id, // UUID - this is the primary identifier
          email: user.email,
          name: user.name,
          avatar: user.avatar_url,
          roles: user.roles || ["user"],
          settings: user.settings || {},
          createdAt: user.created_at,
          lastActive: user.last_active,
        },
      };
    } catch (err) {
      const error = err as Error;
      await client.query("ROLLBACK");
      this.logger.error("❌ Error in resolveUserId:", error);
      return {
        success: false,
        error: error.message || "Failed to resolve user ID",
      };
    } finally {
      client.release();
    }
  }
}
