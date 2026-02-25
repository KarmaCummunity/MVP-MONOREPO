// File overview:
// - Purpose: CRUD עבור משימות קבוצתיות למנהל האפליקציה
// - Routes: /api/tasks (GET, POST), /api/tasks/:id (GET, PATCH, DELETE)
// - Storage: PostgreSQL טבלת tasks (schema.sql)
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import { RedisCacheService } from "../../../redis/redis-cache.service";
import { UserResolutionService } from "../../users/services/user-resolution.service";
import { ItemsService } from "../../items/items.service";
import { JwtAuthGuard, AdminAuthGuard } from "../../auth/jwt-auth.guard";
import { randomUUID } from "crypto";

type TaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "archived"
  | "stuck"
  | "testing"
  | "reports";
type TaskPriority = "low" | "medium" | "high";

interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string | Date;
  assignees?: string[];
  assigneesEmails?: string[];
  tags?: string[];
  checklist?: unknown;
  created_by?: string;
  parent_task_id?: string;
  estimated_hours?: number;
}

interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string | Date | null;
  assignees?: string[];
  assigneesEmails?: string[];
  tags?: string[];
  checklist?: unknown;
  estimated_hours?: number | null;
}

interface LogTaskHoursDto {
  hours: number;
  user_id: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  due_date?: string;
  assignees?: string[];
  tags?: string[];
  checklist?: unknown;
  parent_task_id?: string;
  estimated_hours?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

@Controller("/api/tasks")
export class TasksController {
  private readonly logger = new Logger(TasksController.name);
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly userResolutionService: UserResolutionService,
    private readonly itemsService: ItemsService,
  ) {}

  private parsePaginationParams(
    limitParam?: string,
    offsetParam?: string,
  ): { limit: number; offset: number } {
    const limitNum = limitParam ? parseInt(String(limitParam), 10) : 100;
    const offsetNum = offsetParam ? parseInt(String(offsetParam), 10) : 0;
    const limit = Math.min(Math.max(isNaN(limitNum) ? 100 : limitNum, 1), 500);
    const offset = Math.max(isNaN(offsetNum) ? 0 : offsetNum, 0);
    return { limit, offset };
  }

  private buildTaskCacheKey(
    status?: TaskStatus,
    priority?: TaskPriority,
    category?: string,
    assignee?: string,
    searchQuery?: string,
    limit?: number,
    offset?: number,
  ): string {
    return `tasks_list_${status || "all"}_${priority || "all"}_${category || "all"}_${assignee || "all"}_${searchQuery || "all"}_${limit}_${offset}`;
  }

  private async buildTaskFilters(
    status?: TaskStatus,
    priority?: TaskPriority,
    category?: string,
    assignee?: string,
    searchQuery?: string,
  ): Promise<{ filters: string[]; params: unknown[] }> {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      filters.push(`priority = $${params.length}`);
    }
    if (category) {
      params.push(category);
      filters.push(`category = $${params.length}`);
    }
    if (assignee) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let assigneeUuid = assignee;

      if (!uuidRegex.test(assignee)) {
        const resolved = await this.resolveUserIdToUUID(assignee);
        if (resolved) {
          this.logger.log(`👤 Resolved assignee ${assignee} -> ${resolved}`);
          assigneeUuid = resolved;
        } else {
          this.logger.warn(`⚠️ Could not resolve assignee: ${assignee}`);
        }
      }
      params.push(assigneeUuid);
      filters.push(`$${params.length}::UUID = ANY(assignees::UUID[])`);
    }
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      params.push(searchTerm);
      filters.push(
        `(title ILIKE $${params.length} OR description ILIKE $${params.length})`,
      );
    }

    return { filters, params };
  }

  private async getActualHoursSubquery(): Promise<string> {
    const tableExists = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'task_time_logs'
      )
    `);
    const hasTimeLogs = tableExists.rows[0].exists;
    return hasTimeLogs
      ? `COALESCE((SELECT SUM(actual_hours)::NUMERIC FROM task_time_logs WHERE task_id = t.id), 0) as actual_hours`
      : `0::NUMERIC as actual_hours`;
  }

  /**
   * Resolve any user identifier (email, firebase_uid, google_id, UUID string) to UUID
   * Now delegates to UserResolutionService for consistency
   */
  private async resolveUserIdToUUID(userId: string): Promise<string | null> {
    return this.userResolutionService.resolveUserId(userId, {
      throwOnNotFound: false,
      cacheResult: true,
      logError: false,
    });
  }

  /**
   * Ensure posts table exists with correct schema, create/migrate if needed
   * This is a fallback in case schema.sql wasn't run or table has legacy structure
   */
  private async ensurePostsTable() {
    try {
      // Check if posts table exists and has correct structure
      const tableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'posts'
        ) AS exists;
      `);

      if (tableCheck.rows[0]?.exists) {
        // Check if it has the correct structure (author_id column)
        const columnCheck = await this.pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'author_id'
          ) AS exists;
        `);

        if (!columnCheck.rows[0]?.exists) {
          // Legacy table exists with wrong structure - drop and recreate
          this.logger.log(
            "⚠️  Detected legacy posts table structure - recreating with correct schema",
          );
          await this.pool.query("DROP TABLE IF EXISTS posts CASCADE;");
        } else {
          // Table exists with correct structure
          return;
        }
      }

      // Create posts table with correct schema
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          images TEXT[],
          likes INTEGER DEFAULT 0,
          comments INTEGER DEFAULT 0,
          post_type VARCHAR(50) DEFAULT 'task_completion',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // SEC-002.4: Create indexes individually — no string interpolation in SQL
      const indexQueries = [
        "CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id)",
        "CREATE INDEX IF NOT EXISTS idx_posts_task_id ON posts(task_id)",
        "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type)",
      ];

      for (const q of indexQueries) {
        try {
          await this.pool.query(q);
        } catch {
          // index may already exist
        }
      }

      // Create trigger for updated_at
      try {
        await this.pool.query(`
          DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
          CREATE TRIGGER update_posts_updated_at 
            BEFORE UPDATE ON posts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        `);
      } catch {
        this.logger.log(
          "⚠️ Could not create update_posts_updated_at trigger (function might not exist)",
        );
      }

      this.logger.log("✅ Posts table ensured with correct schema");
    } catch (error) {
      this.logger.error("❌ Failed to ensure posts table:", error);
      // Don't throw - allow code to continue, but log the error
    }
  }

  /**
   * Ensure tasks table exists, create it if missing
   * This is a fallback in case schema.sql wasn't run
   */
  private async ensureTasksTable() {
    try {
      // 1. Ensure TASKS table exists (Idempotent)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          priority VARCHAR(10) NOT NULL DEFAULT 'medium',
          category VARCHAR(50),
          due_date TIMESTAMPTZ,
          assignees UUID[] DEFAULT ARRAY[]::UUID[],
          tags TEXT[] DEFAULT ARRAY[]::TEXT[],
          checklist JSONB,
          created_by UUID, -- REFERENCES user_profiles(id)
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // 2. Ensure estimated_hours column exists (for existing tables)
      try {
        await this.pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tasks' AND column_name = 'estimated_hours'
            ) THEN
              ALTER TABLE tasks ADD COLUMN estimated_hours NUMERIC(10,2);
              -- Set default value of 0 for existing tasks
              UPDATE tasks SET estimated_hours = 0 WHERE estimated_hours IS NULL;
            END IF;
          END $$;
        `);
      } catch (e) {
        this.logger.warn("⚠️ Could not ensure estimated_hours column:", e);
      }

      // 3. Ensure INDEXES (Idempotent)
      // SEC-002.4: Create indexes individually — no string interpolation in SQL
      const indexQueries = [
        "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_assignees_gin ON tasks USING GIN (assignees)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin ON tasks USING GIN (tags)",
      ];
      for (const q of indexQueries) {
        try {
          await this.pool.query(q);
        } catch {
          /* ignore */
        }
      }

      // 4. Ensure task_time_logs table exists
      try {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS task_time_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
            actual_hours NUMERIC(10,2) NOT NULL CHECK (actual_hours > 0),
            logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(task_id, user_id)
          )
        `);

        // Create indexes for task_time_logs
        await this.pool.query(
          `CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id)`,
        );
        await this.pool.query(
          `CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id)`,
        );
        await this.pool.query(
          `CREATE INDEX IF NOT EXISTS idx_task_time_logs_logged_at ON task_time_logs(logged_at DESC)`,
        );
      } catch (e) {
        this.logger.warn("⚠️ Could not ensure task_time_logs table:", e);
      }

      // 5. Ensure NOTIFICATIONS table (Idempotent)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            user_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, item_id)
        );
      `);
    } catch (error) {
      this.logger.error("❌ Error ensuring tables (non-fatal):", error);
      // Do not throw. If standard tables exist, we can proceed.
    }
  }

  /**
   * Get the root admin user ID from ROOT_ADMIN_EMAIL env var
   * SEC-003.1: No hardcoded emails — uses env var
   */
  private async getSuperAdminId(): Promise<string | null> {
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
  private async canAssignToUser(
    managerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    try {
      // If assigning to self, always allowed
      if (managerId === targetUserId) {
        return true;
      }

      // SEC-003.1: Check if manager is super_admin by role, not by email
      const { rows: superCheck } = await this.pool.query(
        `SELECT 1 FROM user_profiles WHERE id = $1 AND 'super_admin' = ANY(roles)`,
        [managerId],
      );
      if (superCheck.length > 0) {
        return true;
      }

      // Check if targetUser is in manager's hierarchy (recursive - all levels down)
      const { rows } = await this.pool.query(
        `
        WITH RECURSIVE subordinates AS (
          -- Base case: direct subordinates of manager
          SELECT id, 1 as depth FROM user_profiles WHERE parent_manager_id = $1
          UNION ALL
          -- Recursive: subordinates of subordinates
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
      // On error, deny assignment to be safe
      return false;
    }
  }

  /**
   * List tasks with filtering and pagination
   * Cache TTL: 10 minutes (tasks change moderately frequently)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listTasks(
    @Query("status") status?: TaskStatus,
    @Query("priority") priority?: TaskPriority,
    @Query("category") category?: string,
    @Query("assignee") assignee?: string,
    @Query("q") searchQuery?: string,
    @Query("limit") limitParam?: string,
    @Query("offset") offsetParam?: string,
  ) {
    try {
      await this.ensureTasksTable();

      const { limit, offset } = this.parsePaginationParams(
        limitParam,
        offsetParam,
      );
      const cacheKey = this.buildTaskCacheKey(
        status,
        priority,
        category,
        assignee,
        searchQuery,
        limit,
        offset,
      );

      try {
        const cached = await this.redisCache.get(cacheKey);
        if (cached) {
          this.logger.log("✅ Returning cached tasks list");
          return { success: true, data: cached };
        }
      } catch (cacheError) {
        this.logger.warn("Redis cache error (non-fatal):", cacheError);
      }

      const { filters, params } = await this.buildTaskFilters(
        status,
        priority,
        category,
        assignee,
        searchQuery,
      );
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const actualHoursSubquery = await this.getActualHoursSubquery();

      const sql = `
        SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, t.estimated_hours, t.created_at, t.updated_at,
            (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) 
             FROM user_profiles u WHERE u.id::text = t.created_by::text OR u.firebase_uid = t.created_by::text OR u.google_id = t.created_by::text LIMIT 1) as creator_details,
            (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url)) 
             FROM user_profiles u WHERE u.id = ANY(t.assignees::UUID[])) as assignees_details,
            (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id) as subtask_count,
            (SELECT json_build_object('id', pt.id, 'title', pt.title) FROM tasks pt WHERE pt.id = t.parent_task_id) as parent_task_details,
            ${actualHoursSubquery}
        FROM tasks t
        ${where}
        ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC, status ASC, created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      params.push(limit, offset);

      this.logger.log(
        `🚀 Executing LIST SQL:`,
        sql.replace(/\s+/g, " ").trim(),
      );
      const { rows } = await this.pool.query(sql, params);
      this.logger.log(`✅ Found ${rows.length} tasks`);

      try {
        await this.redisCache.set(cacheKey, rows, 10 * 60);
      } catch (cacheError) {
        this.logger.warn("Redis cache set error (non-fatal):", cacheError);
      }

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error listing tasks:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("does not exist") ||
        errorMessage.includes("column")
      ) {
        return {
          success: false,
          error:
            "Database table structure issue. Please contact administrator.",
        };
      }
      return { success: false, error: errorMessage || "Failed to list tasks" };
    }
  }

  /**
   * Manual endpoint to create tasks table
   * Useful for production when automatic creation fails
   * GET /api/tasks/init-table
   */
  @Get("init-table")
  @UseGuards(AdminAuthGuard)
  async initTasksTable() {
    try {
      await this.ensureTasksTable();
      return {
        success: true,
        message: "Tasks table initialized successfully",
      };
    } catch (error) {
      this.logger.error("Failed to initialize tasks table:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize tasks table",
      };
    }
  }

  /**
   * Get a single task by ID
   * Cache TTL: 15 minutes
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getTask(@Param("id") id: string) {
    try {
      // Ensure table exists before querying
      await this.ensureTasksTable();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return { success: false, error: "Invalid task ID format" };
      }

      const cacheKey = `task_${id}`;

      // Try to get from cache (but don't fail if Redis is unavailable)
      let cached = null;
      try {
        cached = await this.redisCache.get(cacheKey);
      } catch (cacheError) {
        this.logger.warn("Redis cache error (non-fatal):", cacheError);
      }

      if (cached) {
        return { success: true, data: cached };
      }

      const { rows } = await this.pool.query(
        `SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, t.due_date, t.assignees, t.tags, t.checklist, t.created_by, t.parent_task_id, t.estimated_hours, t.created_at, t.updated_at,
            (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) 
             FROM user_profiles u 
             WHERE u.id::text = t.created_by::text 
                OR u.firebase_uid = t.created_by::text
                OR u.google_id = t.created_by::text
             LIMIT 1) as creator_details,
            (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url)) 
             FROM user_profiles u WHERE u.id = ANY(t.assignees::UUID[])) as assignees_details,
            COALESCE((SELECT SUM(actual_hours)::NUMERIC FROM task_time_logs WHERE task_id = t.id), 0) as actual_hours
         FROM tasks t WHERE t.id = $1`,
        [id],
      );
      if (!rows.length) {
        return { success: false, error: "Task not found" };
      }

      // Try to cache the result (but don't fail if Redis is unavailable)
      try {
        await this.redisCache.set(cacheKey, rows[0], 15 * 60);
      } catch (cacheError) {
        this.logger.warn("Redis cache set error (non-fatal):", cacheError);
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error getting task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get task",
      };
    }
  }

  /**
   * Get subtasks of a specific task
   * GET /api/tasks/:id/subtasks
   */
  @Get(":id/subtasks")
  @UseGuards(JwtAuthGuard)
  async getSubtasks(@Param("id") parentId: string) {
    try {
      await this.ensureTasksTable();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(parentId)) {
        return { success: false, error: "Invalid task ID format" };
      }

      const { rows } = await this.pool.query(
        `
        SELECT 
          t.id, t.title, t.description, t.status, t.priority, t.category, 
          t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, t.estimated_hours,
          t.created_at, t.updated_at,
          (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) 
           FROM user_profiles u WHERE u.id = CAST(t.created_by AS UUID)) as creator_details,
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url)) 
           FROM user_profiles u WHERE u.id = ANY(t.assignees::UUID[])) as assignees_details,
          (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id) as subtask_count,
          COALESCE((SELECT SUM(actual_hours)::NUMERIC FROM task_time_logs WHERE task_id = t.id), 0) as actual_hours
        FROM tasks t
        WHERE t.parent_task_id = $1
        ORDER BY 
          CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC,
          created_at DESC
      `,
        [parentId],
      );

      this.logger.log(`📋 Found ${rows.length} subtasks for task ${parentId}`);
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error getting subtasks:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get subtasks",
      };
    }
  }

  /**
   * Get full task tree (recursive - all subtasks at all levels)
   * GET /api/tasks/:id/tree
   */
  @Get(":id/tree")
  @UseGuards(JwtAuthGuard)
  async getTaskTree(@Param("id") rootId: string) {
    try {
      await this.ensureTasksTable();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(rootId)) {
        return { success: false, error: "Invalid task ID format" };
      }

      // Use recursive CTE to get all subtasks at all levels
      const { rows } = await this.pool.query(
        `
        WITH RECURSIVE task_tree AS (
          -- Base case: the root task
          SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, 
            t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, 
            t.estimated_hours, t.created_by, t.created_at, t.updated_at,
            0 as level,
            ARRAY[t.id] as path
          FROM tasks t
          WHERE t.id = $1
          
          UNION ALL
          
          -- Recursive: get children
          SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, 
            t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, 
            t.estimated_hours, t.created_by, t.created_at, t.updated_at,
            tt.level + 1,
            tt.path || t.id
          FROM tasks t
          INNER JOIN task_tree tt ON t.parent_task_id = tt.id
          WHERE tt.level < 10  -- Max depth to prevent infinite loops
        )
        SELECT 
          tt.*,
          (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) 
           FROM user_profiles u WHERE u.id = CAST(tt.created_by AS UUID)) as creator_details,
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url)) 
           FROM user_profiles u WHERE u.id = ANY(tt.assignees::UUID[])) as assignees_details,
          (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = tt.id) as subtask_count
        FROM task_tree tt
        ORDER BY tt.path
      `,
        [rootId],
      );

      this.logger.log(
        `🌳 Found ${rows.length} tasks in tree for root ${rootId}`,
      );
      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error getting task tree:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get task tree",
      };
    }
  }

  private async resolveCreatedBy(
    created_by?: string | null,
  ): Promise<{ uuid: string | null; error?: string }> {
    if (!created_by) {
      this.logger.log(
        `❌ No created_by provided in payload - this is required`,
      );
      return {
        uuid: null,
        error: "created_by is required - every task must have a creator",
      };
    }

    const resolutionStart = Date.now();
    const createdByUuid = await this.resolveUserIdToUUID(created_by);
    this.logger.log(
      `👤 Resolved created_by ${created_by} to ${createdByUuid} in ${Date.now() - resolutionStart}ms`,
    );

    if (!createdByUuid) {
      return {
        uuid: null,
        error: "Could not resolve created_by user - invalid user ID",
      };
    }

    return { uuid: createdByUuid };
  }

  private async resolveTaskAssignees(
    assignees: string[],
    assigneesEmails: string[],
    createdByUuid: string,
  ): Promise<string[]> {
    let assigneeUUIDs: string[] = [];

    if (Array.isArray(assigneesEmails) && assigneesEmails.length > 0) {
      this.logger.log("📧 Processing assigneesEmails (POST):", assigneesEmails);
      const emailList = assigneesEmails.filter(
        (e) => typeof e === "string" && e.trim(),
      );
      if (emailList.length > 0) {
        const emailQuery = `
          SELECT id FROM user_profiles 
          WHERE email = ANY($1::TEXT[])
        `;
        const { rows: userRows } = await this.pool.query(emailQuery, [
          emailList,
        ]);
        assigneeUUIDs = userRows.map((row) => row.id);
        this.logger.log("📧 Resolved emails to UUIDs:", assigneeUUIDs);
      }
    } else if (Array.isArray(assignees) && assignees.length > 0) {
      this.logger.log("👥 Processing assignees (POST):", assignees);
      assigneeUUIDs = assignees;
    }

    if (assigneeUUIDs.length === 0) {
      this.logger.log(
        "📋 No assignees provided - setting default (creator + super admin)",
      );

      if (createdByUuid) {
        assigneeUUIDs.push(createdByUuid);
      }

      const superAdminId = await this.getSuperAdminId();
      if (superAdminId && superAdminId !== createdByUuid) {
        assigneeUUIDs.push(superAdminId);
      }

      this.logger.log("📋 Default assignees set:", assigneeUUIDs);
    }

    return assigneeUUIDs;
  }

  private async verifyCreatorPermissions(
    createdByUuid: string,
    assigneeUUIDs: string[],
  ): Promise<{ allowed: boolean; error?: string }> {
    for (const assigneeId of assigneeUUIDs) {
      if (assigneeId !== createdByUuid) {
        const canAssign = await this.canAssignToUser(createdByUuid, assigneeId);
        if (!canAssign) {
          this.logger.log(
            `❌ Permission denied: ${createdByUuid} cannot assign to ${assigneeId}`,
          );
          return {
            allowed: false,
            error:
              "אין לך הרשאה להקצות משימה למשתמש זה - ניתן להקצות רק לעובדים שלך",
          };
        }
      }
    }
    this.logger.log("✅ Hierarchy permission check passed for all assignees");
    return { allowed: true };
  }

  private async notifyTaskAssignees(
    assigneeUUIDs: string[],
    task: Task,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `🔔 Preparing to notify ${assigneeUUIDs.length} assignees...`,
    );

    for (const assigneeId of assigneeUUIDs) {
      try {
        this.logger.log(`🔔 Sending new task notification to ${assigneeId}`);

        await this.itemsService.create(
          "notifications",
          assigneeId,
          randomUUID(),
          {
            title: "משימה חדשה",
            body: `הוקצתה לך משימה חדשה: ${task.title}`,
            type: "system",
            timestamp,
            read: false,
            userId: assigneeId,
            data: { taskId: task.id },
          },
        );
        this.logger.log(`✅ Notification sent to ${assigneeId}`);
      } catch (itemError) {
        this.logger.error(
          `❌ Failed to create notification for ${assigneeId}. It is likely the 'notifications' table does not exist.`,
          itemError,
        );
      }
    }
  }

  private async createNewTaskPosts(
    createdByUuid: string,
    assigneeUUIDs: string[],
    task: Task,
  ): Promise<void> {
    const postResults = { created: 0, failed: 0, errors: [] as string[] };

    try {
      await this.ensurePostsTable();

      const postCreatedFor = new Set<string>();

      if (createdByUuid) {
        try {
          await this.pool.query(
            `
            INSERT INTO posts (author_id, task_id, title, description, post_type)
            VALUES ($1, $2, $3, $4, 'task_assignment')
          `,
            [
              createdByUuid,
              task.id,
              `יצרת משימה חדשה: ${task.title}`,
              task.description
                ? `יצרת משימה חדשה: ${task.description}`
                : `יצרת משימה חדשה: ${task.title}`,
            ],
          );
          postResults.created++;
          postCreatedFor.add(createdByUuid);
          this.logger.log(`✅ Post created for creator ${createdByUuid}`);
        } catch (postError) {
          postResults.failed++;
          const errorMsg =
            postError instanceof Error ? postError.message : "Unknown error";
          postResults.errors.push(
            `Failed for creator ${createdByUuid}: ${errorMsg}`,
          );
          this.logger.error(
            `❌ Failed to create post for creator ${createdByUuid}:`,
            postError,
          );
        }
      }

      this.logger.log(
        `📝 Creating posts for ${assigneeUUIDs.length} assignees...`,
      );
      for (const assigneeId of assigneeUUIDs) {
        if (postCreatedFor.has(assigneeId)) {
          this.logger.log(
            `⏭️ Skipping post for ${assigneeId} - already created as creator`,
          );
          continue;
        }

        try {
          await this.pool.query(
            `
            INSERT INTO posts (author_id, task_id, title, description, post_type)
            VALUES ($1, $2, $3, $4, 'task_assignment')
          `,
            [
              assigneeId,
              task.id,
              `משימה חדשה: ${task.title}`,
              task.description
                ? `הוקצתה לך משימה חדשה: ${task.description}`
                : `הוקצתה לך משימה חדשה: ${task.title}`,
            ],
          );
          postResults.created++;
          postCreatedFor.add(assigneeId);
          this.logger.log(`✅ Post created for assignee ${assigneeId}`);
        } catch (postError) {
          postResults.failed++;
          const errorMsg =
            postError instanceof Error ? postError.message : "Unknown error";
          postResults.errors.push(`Failed for ${assigneeId}: ${errorMsg}`);
          this.logger.error(
            `❌ Failed to create post for assignee ${assigneeId}:`,
            postError,
          );
        }
      }

      this.logger.log(
        `📊 Post creation summary: ${postResults.created} created, ${postResults.failed} failed`,
      );

      if (postResults.created > 0) {
        try {
          await this.clearPostsCaches();
          this.logger.log("✅ Posts caches cleared after post creation");
        } catch (cacheErr) {
          this.logger.warn(
            "Error clearing posts caches after creation (non-fatal):",
            cacheErr,
          );
        }
      }
    } catch (tableError) {
      this.logger.error("❌ Failed to ensure posts table:", tableError);
      postResults.errors.push("Posts table initialization failed");
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async createTask(@Body() body: CreateTaskDto) {
    try {
      await this.ensureTasksTable();

      const {
        title,
        description = null,
        status = "open",
        priority = "medium",
        category = null,
        due_date = null,
        assignees = [],
        assigneesEmails = [],
        tags = [],
        checklist = null,
        created_by = null,
        parent_task_id = null,
        estimated_hours = null,
      } = body || {};

      if (!title || typeof title !== "string" || !title.trim()) {
        return {
          success: false,
          error: "title is required and cannot be empty",
        };
      }

      const statusValidation = this.validateTaskStatus(status as TaskStatus);
      if (!statusValidation.valid) {
        return { success: false, error: statusValidation.error };
      }

      const priorityValidation = this.validateTaskPriority(
        priority as TaskPriority,
      );
      if (!priorityValidation.valid) {
        return { success: false, error: priorityValidation.error };
      }

      this.logger.log(`📝 POST /api/tasks payload:`, JSON.stringify(body));

      const createdByResult = await this.resolveCreatedBy(created_by);
      if (!createdByResult.uuid) {
        return { success: false, error: createdByResult.error };
      }
      const createdByUuid = createdByResult.uuid;

      this.logger.log(`👤 Final createdByUuid:`, createdByUuid);

      const dueDateValidation = this.validateAndParseDueDate(due_date);
      if (!dueDateValidation.valid) {
        return { success: false, error: dueDateValidation.error };
      }
      const parsedDueDate = dueDateValidation.parsedDate;

      const assigneeUUIDs = await this.resolveTaskAssignees(
        assignees,
        assigneesEmails,
        createdByUuid,
      );

      const permissionCheck = await this.verifyCreatorPermissions(
        createdByUuid,
        assigneeUUIDs,
      );
      if (!permissionCheck.allowed) {
        return { success: false, error: permissionCheck.error };
      }

      let parsedEstimatedHours = null;
      if (estimated_hours !== null && estimated_hours !== undefined) {
        const hours = parseFloat(String(estimated_hours));
        if (isNaN(hours) || hours < 0) {
          return {
            success: false,
            error: "estimated_hours must be a non-negative number",
          };
        }
        parsedEstimatedHours = hours;
      }

      const sql = `
        INSERT INTO tasks (title, description, status, priority, category, due_date, assignees, tags, checklist, created_by, parent_task_id, estimated_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7::UUID[], $8::TEXT[], $9::JSONB, $10::UUID, $11::UUID, $12::NUMERIC)
        RETURNING id, title, description, status, priority, category, due_date, assignees, tags, checklist, created_by, parent_task_id, estimated_hours, created_at, updated_at
      `;
      const params = [
        title.trim(),
        description,
        status,
        priority,
        category,
        parsedDueDate,
        assigneeUUIDs,
        Array.isArray(tags) ? tags : [],
        checklist,
        createdByUuid,
        parent_task_id || null,
        parsedEstimatedHours,
      ];

      this.logger.log(
        `🚀 Executing INSERT SQL with params:`,
        JSON.stringify(params),
      );

      const { rows } = await this.pool.query(sql, params);
      const newTask = rows[0];
      this.logger.log("✅ Task inserted successfully:", newTask.id);

      if (assigneeUUIDs.length > 0) {
        await this.notifyTaskAssignees(assigneeUUIDs, newTask);
        await this.createNewTaskPosts(createdByUuid, assigneeUUIDs, newTask);
      }

      try {
        await this.clearTaskCaches();
        this.logger.log("✅ Task caches cleared after creation");
      } catch (cacheErr) {
        this.logger.warn(
          "Error clearing caches after task creation (non-fatal):",
          cacheErr,
        );
      }

      return { success: true, data: newTask };
    } catch (error) {
      this.logger.error("Error creating task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create task",
      };
    }
  }

  /**
   * Log hours worked on a task
   * POST /api/tasks/:id/log-hours
   * Note: Must be before @Patch(':id') to ensure proper route matching
   */
  @Post(":id/log-hours")
  @UseGuards(JwtAuthGuard)
  async logTaskHours(
    @Param("id") taskId: string,
    @Body() body: LogTaskHoursDto,
  ) {
    try {
      // Ensure task_time_logs table exists
      await this.ensureTasksTable();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(taskId)) {
        return { success: false, error: "Invalid task ID format" };
      }

      const { hours, user_id } = body || {};

      if (!hours || typeof hours !== "number" || hours <= 0) {
        return { success: false, error: "hours must be a positive number" };
      }

      if (!user_id) {
        return { success: false, error: "user_id is required" };
      }

      // Resolve user_id to UUID
      const userIdUuid = await this.resolveUserIdToUUID(user_id);
      if (!userIdUuid) {
        return { success: false, error: "Invalid user_id" };
      }

      // Verify task exists
      const taskCheck = await this.pool.query(
        "SELECT id FROM tasks WHERE id = $1",
        [taskId],
      );
      if (!taskCheck.rows[0]) {
        return { success: false, error: "Task not found" };
      }

      // Check if table exists before inserting
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_time_logs'
        )
      `);

      if (!tableExists.rows[0].exists) {
        return {
          success: false,
          error: "Time logging is not available - table not initialized",
        };
      }

      // Insert or update time log (using ON CONFLICT for unique constraint)
      const { rows } = await this.pool.query(
        `
        INSERT INTO task_time_logs (task_id, user_id, actual_hours, logged_at)
        VALUES ($1, $2, $3::NUMERIC, NOW())
        ON CONFLICT (task_id, user_id)
        DO UPDATE SET actual_hours = EXCLUDED.actual_hours, logged_at = NOW()
        RETURNING id, task_id, user_id, actual_hours, logged_at, created_at
      `,
        [taskId, userIdUuid, hours],
      );

      // Clear task cache
      try {
        await this.redisCache.delete(`task_${taskId}`);
        await this.clearTaskCaches();
      } catch (cacheError) {
        this.logger.warn("Redis cache delete error (non-fatal):", cacheError);
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error logging task hours:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to log task hours",
      };
    }
  }

  private validateTaskId(id: string): { valid: boolean; error?: string } {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { valid: false, error: "Invalid task ID format" };
    }
    return { valid: true };
  }

  private validateTaskStatus(status?: TaskStatus): {
    valid: boolean;
    error?: string;
  } {
    if (
      status &&
      !["open", "in_progress", "done", "archived", "stuck", "testing"].includes(
        status,
      )
    ) {
      return { valid: false, error: "Invalid status value" };
    }
    return { valid: true };
  }

  private validateTaskPriority(priority?: TaskPriority): {
    valid: boolean;
    error?: string;
  } {
    if (priority && !["low", "medium", "high"].includes(priority)) {
      return { valid: false, error: "Invalid priority value" };
    }
    return { valid: true };
  }

  private validateAndParseDueDate(dueDate?: string | Date | null): {
    valid: boolean;
    parsedDate: string | null;
    error?: string;
  } {
    if (dueDate === undefined || dueDate === null) {
      return { valid: true, parsedDate: null };
    }
    if (typeof dueDate === "string") {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        return {
          valid: false,
          parsedDate: null,
          error: "Invalid due_date format",
        };
      }
      return { valid: true, parsedDate: date.toISOString() };
    }
    return { valid: true, parsedDate: dueDate.toISOString() };
  }

  private async checkTimeLogRequirement(
    taskId: string,
    newStatus?: string,
    oldStatus?: string,
  ): Promise<{ required: boolean; error?: string }> {
    if (newStatus === "done" && oldStatus !== "done") {
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_time_logs'
        )
      `);

      if (tableExists.rows[0].exists) {
        const timeLogCheck = await this.pool.query(
          "SELECT COUNT(*) as count FROM task_time_logs WHERE task_id = $1",
          [taskId],
        );
        const hasTimeLog = parseInt(timeLogCheck.rows[0]?.count || "0", 10) > 0;
        if (!hasTimeLog) {
          return {
            required: true,
            error:
              "נדרש לרשום שעות עבודה לפני סימון המשימה כבוצעה. אנא מלא את שעות העבודה בפועל.",
          };
        }
      }
    }
    return { required: false };
  }

  private async processAssignees(
    body: UpdateTaskDto,
  ): Promise<{ shouldUpdate: boolean; assigneeUUIDs: string[] }> {
    let shouldUpdateAssignees = false;
    let assigneeUUIDs: string[] = [];

    if ("assigneesEmails" in body && Array.isArray(body.assigneesEmails)) {
      this.logger.log("📧 Processing assigneesEmails update");
      const emailList = body.assigneesEmails.filter(
        (e) => typeof e === "string" && e.trim(),
      );
      if (emailList.length > 0) {
        const emailQuery = `
          SELECT id FROM user_profiles 
          WHERE email = ANY($1::TEXT[])
        `;
        const { rows: userRows } = await this.pool.query(emailQuery, [
          emailList,
        ]);
        assigneeUUIDs = userRows.map((row) => row.id);
      }
      shouldUpdateAssignees = true;
    } else if ("assignees" in body) {
      this.logger.log("👥 Processing assignees update:", body.assignees);
      if (Array.isArray(body.assignees)) {
        assigneeUUIDs = body.assignees;
        shouldUpdateAssignees = true;
      }
    }

    return { shouldUpdate: shouldUpdateAssignees, assigneeUUIDs };
  }

  private async verifyAssigneePermissions(
    taskId: string,
    assigneeUUIDs: string[],
    oldAssignees: string[],
  ): Promise<{ allowed: boolean; error?: string }> {
    const taskCreatorRes = await this.pool.query(
      "SELECT created_by FROM tasks WHERE id = $1",
      [taskId],
    );
    const taskCreatorId = taskCreatorRes.rows[0]?.created_by;

    if (taskCreatorId) {
      const safeOldAssignees = (oldAssignees || []).filter(Boolean);
      const newlyAddedAssignees = assigneeUUIDs.filter(
        (uid: string) => !safeOldAssignees.includes(uid),
      );

      for (const assigneeId of newlyAddedAssignees) {
        if (assigneeId !== taskCreatorId) {
          const canAssign = await this.canAssignToUser(
            taskCreatorId,
            assigneeId,
          );
          if (!canAssign) {
            this.logger.log(
              `❌ Permission denied: ${taskCreatorId} cannot assign to ${assigneeId}`,
            );
            return {
              allowed: false,
              error:
                "אין לך הרשאה להקצות משימה למשתמש זה - ניתן להקצות רק לעובדים שלך",
            };
          }
        }
      }
      this.logger.log(
        "✅ Hierarchy permission check passed for updated assignees",
      );
    }

    return { allowed: true };
  }

  private async sendNotificationsToNewAssignees(
    addedAssignees: string[],
    task: Task,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `🔔 Found ${addedAssignees.length} new assignees to notify...`,
    );

    for (const assigneeId of addedAssignees) {
      try {
        this.logger.log(`🔔 Sending notification to ${assigneeId}`);
        await this.itemsService.create(
          "notifications",
          assigneeId,
          randomUUID(),
          {
            title: "משימה חדשה",
            body: `הוקצתה לך משימה חדשה: ${task.title}`,
            type: "system",
            timestamp,
            read: false,
            userId: assigneeId,
            data: { taskId: task.id },
          },
        );
        this.logger.log(`✅ Notification sent to ${assigneeId}`);
      } catch (err) {
        this.logger.error(
          `❌ Failed to create notification for ${assigneeId}`,
          err,
        );
      }
    }
  }

  private async createAssignmentPosts(
    addedAssignees: string[],
    task: Task,
  ): Promise<void> {
    const assignPostResults = { created: 0, failed: 0 };

    try {
      await this.ensurePostsTable();

      this.logger.log(
        `📝 Creating posts for ${addedAssignees.length} newly assigned users...`,
      );
      for (const assigneeId of addedAssignees) {
        try {
          await this.pool.query(
            `
            INSERT INTO posts (author_id, task_id, title, description, post_type)
            VALUES ($1, $2, $3, $4, 'task_assignment')
          `,
            [
              assigneeId,
              task.id,
              `משימה חדשה: ${task.title}`,
              task.description
                ? `הוקצתה לך משימה חדשה: ${task.description}`
                : `הוקצתה לך משימה חדשה: ${task.title}`,
            ],
          );
          assignPostResults.created++;
          this.logger.log(
            `✅ Post created for newly assigned user ${assigneeId}`,
          );
        } catch (postError) {
          assignPostResults.failed++;
          this.logger.error(
            `❌ Failed to create post for assignee ${assigneeId}:`,
            postError,
          );
        }
      }
      this.logger.log(
        `📊 Assignment post summary: ${assignPostResults.created} created, ${assignPostResults.failed} failed`,
      );

      if (assignPostResults.created > 0) {
        try {
          await this.clearPostsCaches();
          this.logger.log(
            "✅ Posts caches cleared after assignment post creation",
          );
        } catch (cacheErr) {
          this.logger.warn(
            "Error clearing posts caches after assignment (non-fatal):",
            cacheErr,
          );
        }
      }
    } catch (tableError) {
      this.logger.error(
        "❌ Failed to ensure posts table for assignment posts:",
        tableError,
      );
    }
  }

  private async createCompletionPosts(task: Task): Promise<void> {
    const completionPostResults = { created: 0, failed: 0 };

    try {
      await this.ensurePostsTable();

      this.logger.log(`📝 Creating completion posts for task ${task.id}...`);

      if (task.created_by) {
        try {
          await this.pool.query(
            `
            INSERT INTO posts (author_id, task_id, title, description, post_type)
            VALUES ($1, $2, $3, $4, 'task_completion')
          `,
            [
              task.created_by,
              task.id,
              `משימה הושלמה: ${task.title}`,
              task.description
                ? `המשימה "${task.title}" הושלמה בהצלחה! ${task.description}`
                : `המשימה "${task.title}" הושלמה בהצלחה!`,
            ],
          );
          completionPostResults.created++;
          this.logger.log(
            `✅ Completion post created for creator ${task.created_by}`,
          );
        } catch (creatorPostError) {
          completionPostResults.failed++;
          this.logger.error(
            `❌ Failed to create completion post for creator ${task.created_by}:`,
            creatorPostError,
          );
        }
      }

      if (task.assignees && task.assignees.length > 0) {
        for (const assigneeId of task.assignees) {
          if (assigneeId !== task.created_by) {
            try {
              await this.pool.query(
                `
                INSERT INTO posts (author_id, task_id, title, description, post_type)
                VALUES ($1, $2, $3, $4, 'task_completion')
              `,
                [
                  assigneeId,
                  task.id,
                  `ביצעתי משימה: ${task.title}`,
                  task.description
                    ? `השלמתי את המשימה "${task.title}" בהצלחה! ${task.description}`
                    : `השלמתי את המשימה "${task.title}" בהצלחה!`,
                ],
              );
              completionPostResults.created++;
              this.logger.log(
                `✅ Completion post created for assignee ${assigneeId}`,
              );
            } catch (assigneePostError) {
              completionPostResults.failed++;
              this.logger.error(
                `❌ Failed to create completion post for assignee ${assigneeId}:`,
                assigneePostError,
              );
            }
          }
        }
      }
      this.logger.log(
        `📊 Completion post summary: ${completionPostResults.created} created, ${completionPostResults.failed} failed`,
      );

      if (completionPostResults.created > 0) {
        try {
          await this.clearPostsCaches();
          this.logger.log(
            "✅ Posts caches cleared after completion post creation",
          );
        } catch (cacheErr) {
          this.logger.warn(
            "Error clearing posts caches after completion (non-fatal):",
            cacheErr,
          );
        }
      }
    } catch (tableError) {
      this.logger.error(
        "❌ Failed to ensure posts table for completion posts:",
        tableError,
      );
    }
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async updateTask(@Param("id") id: string, @Body() body: UpdateTaskDto) {
    try {
      await this.ensureTasksTable();

      const idValidation = this.validateTaskId(id);
      if (!idValidation.valid) {
        return { success: false, error: idValidation.error };
      }

      const oldTaskRes = await this.pool.query(
        "SELECT assignees, status FROM tasks WHERE id = $1",
        [id],
      );
      if (!oldTaskRes.rows[0]) {
        return { success: false, error: "Task not found" };
      }
      const oldAssignees: string[] = oldTaskRes.rows[0]?.assignees || [];
      const oldStatus: string = oldTaskRes.rows[0]?.status || "open";

      const statusValidation = this.validateTaskStatus(body.status);
      if (!statusValidation.valid) {
        return { success: false, error: statusValidation.error };
      }

      const timeLogCheck = await this.checkTimeLogRequirement(
        id,
        body.status,
        oldStatus,
      );
      if (timeLogCheck.required) {
        return {
          success: false,
          error: timeLogCheck.error,
          requiresHoursLog: true,
        };
      }

      const priorityValidation = this.validateTaskPriority(body.priority);
      if (!priorityValidation.valid) {
        return { success: false, error: priorityValidation.error };
      }

      const dueDateValidation = this.validateAndParseDueDate(body.due_date);
      if (!dueDateValidation.valid) {
        return { success: false, error: dueDateValidation.error };
      }
      const parsedDueDate = dueDateValidation.parsedDate;

      this.logger.log(
        `📝 PATCH /api/tasks/${id} payload:`,
        JSON.stringify(body),
      );

      const allowed = [
        "title",
        "description",
        "status",
        "priority",
        "category",
        "due_date",
        "assignees",
        "assigneesEmails",
        "tags",
        "checklist",
        "estimated_hours",
      ] as const;
      const sets: string[] = [];
      const params: unknown[] = [];

      const { shouldUpdate: shouldUpdateAssignees, assigneeUUIDs } =
        await this.processAssignees(body);

      for (const key of allowed) {
        if (key === "assignees" || key === "assigneesEmails") {
          continue;
        }

        if (key === "due_date") {
          if (body.due_date !== undefined) {
            params.push(parsedDueDate);
            sets.push(`due_date = $${params.length}`);
          }
          continue;
        }

        if (key === "estimated_hours") {
          if (body.estimated_hours !== undefined) {
            let parsedHours = null;
            if (body.estimated_hours !== null) {
              const hours = parseFloat(String(body.estimated_hours));
              if (isNaN(hours) || hours < 0) {
                return {
                  success: false,
                  error: "estimated_hours must be a non-negative number",
                };
              }
              parsedHours = hours;
            }
            params.push(parsedHours);
            sets.push(`estimated_hours = $${params.length}::NUMERIC`);
          }
          continue;
        }

        if (key in body) {
          params.push(
            key === "tags"
              ? Array.isArray(body[key])
                ? body[key]
                : []
              : body[key],
          );
          const idx = params.length;
          if (key === "tags") {
            sets.push(`tags = $${idx}::TEXT[]`);
          } else if (key === "checklist") {
            sets.push(`checklist = $${idx}::JSONB`);
          } else {
            sets.push(`${key} = $${idx}`);
          }
        }
      }

      if (shouldUpdateAssignees) {
        this.logger.log("👥 Updating assignees to set:", assigneeUUIDs);

        const permissionCheck = await this.verifyAssigneePermissions(
          id,
          assigneeUUIDs,
          oldAssignees,
        );
        if (!permissionCheck.allowed) {
          return { success: false, error: permissionCheck.error };
        }

        params.push(assigneeUUIDs);
        sets.push(`assignees = $${params.length}::UUID[]`);
      }

      if (!sets.length) {
        return { success: false, error: "No valid fields to update" };
      }

      params.push(id);
      const sql = `
        UPDATE tasks SET ${sets.join(", ")}, updated_at = NOW()
        WHERE id = $${params.length}
        RETURNING id, title, description, status, priority, category, due_date, assignees, tags, checklist, created_by, parent_task_id, estimated_hours, created_at, updated_at
      `;

      this.logger.log("🚀 Executing SQL:", sql, params);

      const { rows } = await this.pool.query(sql, params);
      if (!rows.length) {
        return { success: false, error: "Task not found" };
      }

      const updatedTask = rows[0];

      if (shouldUpdateAssignees) {
        const newAssignees = updatedTask.assignees || [];
        const safeOldAssignees = (oldAssignees || []).filter(Boolean);
        const addedAssignees = newAssignees.filter(
          (uid: string) => !safeOldAssignees.includes(uid),
        );

        this.logger.log("🔔 Notification check:", {
          safeOld: safeOldAssignees,
          new: newAssignees,
          added: addedAssignees,
        });

        if (addedAssignees.length > 0) {
          await this.sendNotificationsToNewAssignees(
            addedAssignees,
            updatedTask,
          );
          await this.createAssignmentPosts(addedAssignees, updatedTask);
        }
      }

      try {
        await this.redisCache.delete(`task_${id}`);
        await this.clearTaskCaches();
        this.logger.log("✅ Task caches cleared after update");
      } catch (cacheErr) {
        this.logger.warn(
          "Error clearing caches after task update (non-fatal):",
          cacheErr,
        );
      }

      if (rows.length > 0 && body.status === "done") {
        await this.createCompletionPosts(rows[0]);
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      this.logger.error("Error updating task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update task",
      };
    }
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async deleteTask(@Param("id") id: string) {
    try {
      // Ensure table exists before deleting
      await this.ensureTasksTable();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return { success: false, error: "Invalid task ID format" };
      }

      const { rowCount } = await this.pool.query(
        "DELETE FROM tasks WHERE id = $1",
        [id],
      );
      if (!rowCount) {
        return { success: false, error: "Task not found" };
      }

      // Try to clear task caches (but don't fail if Redis is unavailable)
      try {
        await this.redisCache.delete(`task_${id}`);
        await this.clearTaskCaches();
      } catch (cacheError) {
        this.logger.warn("Redis cache delete error (non-fatal):", cacheError);
      }

      return { success: true, message: "Task deleted" };
    } catch (error) {
      this.logger.error("Error deleting task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete task",
      };
    }
  }

  /**
   * Clear all task-related caches
   * Called after create/update/delete operations to ensure data consistency
   */
  private async clearTaskCaches() {
    try {
      await this.redisCache.invalidatePattern("tasks_list_*");
    } catch (cacheError) {
      this.logger.warn(
        "Redis cache invalidation error (non-fatal):",
        cacheError,
      );
    }
  }

  /**
   * Clear all posts-related caches
   * Called after creating posts to ensure data consistency
   */
  private async clearPostsCaches() {
    try {
      await this.redisCache.invalidatePattern("posts_list_*");
      await this.redisCache.invalidatePattern("user_posts_*");
    } catch (cacheError) {
      this.logger.warn(
        "Redis cache invalidation error for posts (non-fatal):",
        cacheError,
      );
    }
  }

  /**
   * Get hours report for a manager and their team
   * GET /api/tasks/hours-report/:managerId
   */
  @Get("hours-report/:managerId")
  @UseGuards(JwtAuthGuard)
  async getHoursReport(@Param("managerId") managerId: string) {
    try {
      // Ensure task_time_logs table exists
      await this.ensureTasksTable();

      // Check if task_time_logs table exists
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_time_logs'
        )
      `);

      if (!tableExists.rows[0].exists) {
        // Table doesn't exist - return empty report
        return {
          success: true,
          data: {
            manager_hours: 0,
            team_total_hours: 0,
            by_task: [],
            by_period: [],
            by_user: [],
          },
        };
      }

      // Resolve managerId to UUID
      const managerUuid = await this.resolveUserIdToUUID(managerId);
      if (!managerUuid) {
        return { success: false, error: "Invalid manager ID" };
      }

      // Get all subordinates (recursive)
      const { rows: subordinates } = await this.pool.query(
        `
        WITH RECURSIVE subordinates AS (
          SELECT id, name, email
          FROM user_profiles
          WHERE parent_manager_id = $1
          
          UNION ALL
          
          SELECT u.id, u.name, u.email
          FROM user_profiles u
          INNER JOIN subordinates s ON u.parent_manager_id = s.id
        )
        SELECT id, name, email FROM subordinates
      `,
        [managerUuid],
      );

      const teamUserIds = [
        managerUuid,
        ...subordinates.map((s: { id: string }) => s.id),
      ];

      // Get manager's own hours
      const managerHoursRes = await this.pool.query(
        `
        SELECT COALESCE(SUM(actual_hours), 0)::NUMERIC as total_hours
        FROM task_time_logs
        WHERE user_id = $1
      `,
        [managerUuid],
      );
      const managerHours = parseFloat(
        managerHoursRes.rows[0]?.total_hours || "0",
      );

      // Get team total hours
      const teamHoursRes = await this.pool.query(
        `
        SELECT COALESCE(SUM(actual_hours), 0)::NUMERIC as total_hours
        FROM task_time_logs
        WHERE user_id = ANY($1::UUID[])
      `,
        [teamUserIds],
      );
      const teamTotalHours = parseFloat(
        teamHoursRes.rows[0]?.total_hours || "0",
      );

      // Get hours by task
      const hoursByTaskRes = await this.pool.query(
        `
        SELECT 
          t.id as task_id,
          t.title as task_title,
          COALESCE(SUM(ttl.actual_hours), 0)::NUMERIC as hours
        FROM tasks t
        INNER JOIN task_time_logs ttl ON t.id = ttl.task_id
        WHERE ttl.user_id = ANY($1::UUID[])
        GROUP BY t.id, t.title
        ORDER BY hours DESC
      `,
        [teamUserIds],
      );

      // Get hours by period (month)
      const hoursByPeriodRes = await this.pool.query(
        `
        SELECT 
          TO_CHAR(logged_at, 'YYYY-MM') as period,
          COALESCE(SUM(actual_hours), 0)::NUMERIC as hours
        FROM task_time_logs
        WHERE user_id = ANY($1::UUID[])
        GROUP BY TO_CHAR(logged_at, 'YYYY-MM')
        ORDER BY period DESC
        LIMIT 12
      `,
        [teamUserIds],
      );

      // Get hours by user
      const hoursByUserRes = await this.pool.query(
        `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          COALESCE(SUM(ttl.actual_hours), 0)::NUMERIC as hours
        FROM user_profiles u
        LEFT JOIN task_time_logs ttl ON u.id = ttl.user_id
        WHERE u.id = ANY($1::UUID[])
        GROUP BY u.id, u.name
        ORDER BY hours DESC
      `,
        [teamUserIds],
      );

      const report = {
        manager_hours: managerHours,
        team_total_hours: teamTotalHours,
        by_task: hoursByTaskRes.rows.map((row: Record<string, unknown>) => ({
          task_id: row.task_id,
          task_title: row.task_title,
          hours: parseFloat((row.hours as string) || "0"),
        })),
        by_period: hoursByPeriodRes.rows.map(
          (row: Record<string, unknown>) => ({
            period: row.period,
            hours: parseFloat((row.hours as string) || "0"),
          }),
        ),
        by_user: hoursByUserRes.rows.map((row: Record<string, unknown>) => ({
          user_id: row.user_id,
          user_name: row.user_name,
          hours: parseFloat((row.hours as string) || "0"),
        })),
      };

      return { success: true, data: report };
    } catch (error) {
      this.logger.error("Error getting hours report:", error);
      // Return empty report on error instead of failing
      return {
        success: true,
        data: {
          manager_hours: 0,
          team_total_hours: 0,
          by_task: [],
          by_period: [],
          by_user: [],
        },
      };
    }
  }
}
