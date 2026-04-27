// File overview:
// - Purpose: CRUD for group tasks (admin app)
// - Routes: /api/tasks (GET, POST), /api/tasks/:id (GET, PATCH, DELETE)
// - Storage: PostgreSQL tasks table (schema.sql)
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
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { UserResolutionService } from "../services/user-resolution.service";
import { ItemsService } from "../items/items.service";
import { JwtAuthGuard, AdminAuthGuard } from "../auth/guards/jwt-auth.guard";
import { randomUUID } from "crypto";

type TaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "archived"
  | "stuck"
  | "testing";
type TaskPriority = "none" | "low" | "medium" | "high" | "critical" | "urgent";

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

function parseCategoryQueryParam(
  raw: string | string[] | undefined,
): string[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  return (
    Array.isArray(raw)
      ? raw.flatMap((s) => String(s).split(","))
      : String(raw).split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
}

const TASK_STATUS_VALUES: TaskStatus[] = [
  "open",
  "in_progress",
  "done",
  "archived",
  "stuck",
  "testing",
];

type TasksListSort =
  | "created_desc"
  | "created_asc"
  | "priority_status"
  | "due_asc"
  | "due_desc"
  | "updated_desc";

function parseStatusQueryParam(
  raw: string | string[] | undefined,
): TaskStatus[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parts = (
    Array.isArray(raw)
      ? raw.flatMap((s) => String(s).split(","))
      : String(raw).split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const allowed = new Set<string>(TASK_STATUS_VALUES);
  const parsed = parts.filter((p) => allowed.has(p)) as TaskStatus[];
  return parsed.length ? parsed : undefined;
}

const TASK_PRIORITY_VALUES: TaskPriority[] = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
];

/** Ascending sort key: lower = more urgent (listed first). */
const SQL_PRIORITY_ORDER_ASC = `CASE priority WHEN 'urgent' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 WHEN 'none' THEN 5 ELSE 6 END`;

const SQL_PRIORITY_ORDER_ASC_T = `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 WHEN 'none' THEN 5 ELSE 6 END`;

function parsePriorityQueryParam(
  raw: string | string[] | undefined,
): TaskPriority[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parts = (
    Array.isArray(raw)
      ? raw.flatMap((s) => String(s).split(","))
      : String(raw).split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const allowed = new Set<string>(TASK_PRIORITY_VALUES);
  const parsed = parts.filter((p) => allowed.has(p)) as TaskPriority[];
  return parsed.length ? parsed : undefined;
}

function orderByClause(sort: TasksListSort | undefined): string {
  switch (sort) {
    case "created_asc":
      return "ORDER BY t.created_at ASC NULLS LAST, t.id ASC";
    case "priority_status":
      return `ORDER BY 
          ${SQL_PRIORITY_ORDER_ASC_T} ASC,
          CASE t.status 
            WHEN 'in_progress' THEN 0 
            WHEN 'stuck' THEN 1 
            WHEN 'open' THEN 2 
            WHEN 'testing' THEN 3 
            WHEN 'done' THEN 4 
            WHEN 'archived' THEN 5 
            ELSE 6 
          END ASC,


          t.created_at DESC`;

    case "due_asc":
      return "ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC, t.id ASC";
    case "due_desc":
      return "ORDER BY t.due_date DESC NULLS LAST, t.created_at DESC, t.id DESC";
    case "updated_desc":
      return "ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC, t.id DESC";
    case "created_desc":
    default:
      return "ORDER BY t.created_at DESC NULLS LAST, t.id DESC";
  }
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
          priority VARCHAR(20) NOT NULL DEFAULT 'medium',
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

      // Widen priority column for values like critical, urgent (legacy VARCHAR(10))
      try {
        await this.pool.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'priority'
                AND character_maximum_length IS NOT NULL AND character_maximum_length < 20
            ) THEN
              ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR(20);
            END IF;
          END $$;
        `);
      } catch (e) {
        this.logger.warn("⚠️ Could not widen tasks.priority column:", e);
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
    @Query("status") status?: string | string[],
    @Query("priority") priority?: string | string[],
    @Query("category") category?: string,
    @Query("assignee") assignee?: string,
    @Query("q") searchQuery?: string,
    @Query("sort") sortParam?: string,
    @Query("limit") limitParam?: string,
    @Query("offset") offsetParam?: string,
  ) {
    try {
      // Ensure table exists before querying
      await this.ensureTasksTable();

      // Parse limit and offset - handle 0 correctly
      const limitNum = limitParam ? parseInt(String(limitParam), 10) : 100;
      const offsetNum = offsetParam ? parseInt(String(offsetParam), 10) : 0;
      const limit = Math.min(
        Math.max(isNaN(limitNum) ? 100 : limitNum, 1),
        500,
      );
      const offset = Math.max(isNaN(offsetNum) ? 0 : offsetNum, 0);

      const statusList = parseStatusQueryParam(status);
      const priorityList = parsePriorityQueryParam(priority);
      const categoryList = parseCategoryQueryParam(category);
      const sortValues: TasksListSort[] = [
        "created_desc",
        "created_asc",
        "priority_status",
        "due_asc",
        "due_desc",
        "updated_desc",
      ];
      const sort: TasksListSort = sortValues.includes(
        sortParam as TasksListSort,
      )
        ? (sortParam as TasksListSort)
        : "priority_status";

      const statusCachePart =
        statusList && statusList.length > 0 ? statusList.join(",") : "all";
      const priorityCachePart =
        priorityList && priorityList.length > 0
          ? priorityList.join(",")
          : "all";

      // Build cache key from query parameters (include search query if present)
      const cacheKey = `tasks_list_${statusCachePart}_${priorityCachePart}_${category || "all"}_${assignee || "all"}_${searchQuery || "all"}_${sort}_${limit}_${offset}`;

      // Cache restored - race condition was fixed by awaiting cache clearing in create/update/delete
      // Try to get from cache (but don't fail if Redis is unavailable)
      let cached = null;
      try {
        cached = await this.redisCache.get(cacheKey);
      } catch (cacheError) {
        this.logger.warn("Redis cache error (non-fatal):", cacheError);
      }

      if (cached) {
        this.logger.log("✅ Returning cached tasks list");
        return { success: true, data: cached };
      }

      const filters: string[] = [];
      const params: unknown[] = [];

      if (statusList && statusList.length > 0) {
        if (statusList.length === 1) {
          params.push(statusList[0]);
          filters.push(`status = $${params.length}`);
        } else {
          params.push(statusList);
          filters.push(`status = ANY($${params.length}::text[])`);
        }
      }

      if (priorityList && priorityList.length > 0) {
        if (priorityList.length === 1) {
          params.push(priorityList[0]);
          filters.push(`priority = $${params.length}`);
        } else {
          params.push(priorityList);
          filters.push(`priority = ANY($${params.length}::text[])`);
        }
      }

      if (categoryList && categoryList.length > 0) {
        if (categoryList.length === 1) {
          params.push(categoryList[0]);
          filters.push(`category = $${params.length}`);
        } else {
          params.push(categoryList);
          filters.push(`category = ANY($${params.length}::text[])`);
        }
      }

      if (assignee) {
        // Assume assignee is UUID for now. If email, we'd need to resolve it.
        // Ideally we resolve it to be safe.
        // But for performance, let's assume UUID if it looks like one.
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let assigneeUuid = assignee;

        if (!uuidRegex.test(assignee)) {
          // Try to resolve if not UUID (e.g. email)
          const resolved = await this.resolveUserIdToUUID(assignee);
          if (resolved) {
            this.logger.log(
              `👤 Resolved list filter assignee ${assignee} -> ${resolved}`,
            );
            assigneeUuid = resolved;
          } else {
            this.logger.warn(
              `⚠️ Could not resolve list filter assignee: ${assignee}`,
            );
          }
        }

        params.push(assigneeUuid);
        // "assigneeUuid = ANY(assignees)" checks if uuid is in the array
        // Cast both sides to UUID to ensure type compatibility
        filters.push(`$${params.length}::UUID = ANY(assignees::UUID[])`);
      }

      // Add text search if query parameter is provided
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        params.push(searchTerm);
        const searchParamIndex = params.length;
        filters.push(
          `(title ILIKE $${searchParamIndex} OR description ILIKE $${searchParamIndex})`,
        );
      }

      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

      // Check if task_time_logs table exists
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_time_logs'
        )
      `);
      const hasTimeLogs = tableExists.rows[0].exists;

      const actualHoursSubquery = hasTimeLogs
        ? `COALESCE((SELECT SUM(actual_hours)::NUMERIC FROM task_time_logs WHERE task_id = t.id), 0) as actual_hours`
        : `0::NUMERIC as actual_hours`;

      const sql = `
        SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, t.estimated_hours, t.created_at, t.updated_at,
            (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false)) 
             FROM user_profiles u 
             WHERE u.id::text = t.created_by::text 
                OR u.firebase_uid = t.created_by::text
                OR u.google_id = t.created_by::text
             LIMIT 1) as creator_details,
            (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false))) 
             FROM user_profiles u WHERE u.id = ANY(t.assignees::UUID[])) as assignees_details,
            (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id) as subtask_count,
            (SELECT json_build_object('id', pt.id, 'title', pt.title) 
             FROM tasks pt WHERE pt.id = t.parent_task_id) as parent_task_details,
            ${actualHoursSubquery}
        FROM tasks t
        ${where}
        ${orderByClause(sort)}
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `;
      params.push(limit, offset);

      this.logger.log(
        `🚀 Executing LIST SQL:`,
        sql.replace(/\s+/g, " ").trim(),
      );
      this.logger.log(`params:`, params);

      const { rows } = await this.pool.query(sql, params);
      this.logger.log(`✅ Found ${rows.length} tasks`);

      // Try to cache the result (but don't fail if Redis is unavailable)
      try {
        await this.redisCache.set(cacheKey, rows, 10 * 60);
      } catch (cacheError) {
        this.logger.warn("Redis cache set error (non-fatal):", cacheError);
      }

      return { success: true, data: rows };
    } catch (error) {
      this.logger.error("Error listing tasks:", error);

      // Check if error is about missing table/columns
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("does not exist") ||
        errorMessage.includes("column")
      ) {
        return {
          success: false,
          error:
            "Database table structure issue. Please contact administrator or check server logs.",
        };
      }

      return {
        success: false,
        error: errorMessage || "Failed to list tasks",
      };
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
            (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false)) 
             FROM user_profiles u 
             WHERE u.id::text = t.created_by::text 
                OR u.firebase_uid = t.created_by::text
                OR u.google_id = t.created_by::text
             LIMIT 1) as creator_details,
            (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false))) 
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
          (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false)) 
           FROM user_profiles u WHERE u.id = CAST(t.created_by AS UUID)) as creator_details,
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false))) 
           FROM user_profiles u WHERE u.id = ANY(t.assignees::UUID[])) as assignees_details,
          (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id) as subtask_count,
          COALESCE((SELECT SUM(actual_hours)::NUMERIC FROM task_time_logs WHERE task_id = t.id), 0) as actual_hours
        FROM tasks t
        WHERE t.parent_task_id = $1
        ORDER BY 
          ${SQL_PRIORITY_ORDER_ASC} ASC,
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
          (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false)) 
           FROM user_profiles u WHERE u.id = CAST(tt.created_by AS UUID)) as creator_details,
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'email_verified', COALESCE(u.email_verified, false))) 
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

  @Post()
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async createTask(@Body() body: CreateTaskDto) {
    try {
      // Ensure table exists before inserting
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

      // Validate status
      // Validate status
      if (status && !TASK_STATUS_VALUES.includes(status)) {
        return { success: false, error: "Invalid status value" };
      }

      // Validate priority
      if (priority && !TASK_PRIORITY_VALUES.includes(priority)) {
        return { success: false, error: "Invalid priority value" };
      }

      this.logger.log(`📝 POST /api/tasks payload:`, JSON.stringify(body));

      // Resolve created_by to UUID - REQUIRED field
      let createdByUuid: string | null = null;
      if (created_by) {
        const resolutionStart = Date.now();
        createdByUuid = await this.resolveUserIdToUUID(created_by);
        this.logger.log(
          `👤 Resolved created_by ${created_by} to ${createdByUuid} in ${Date.now() - resolutionStart}ms`,
        );
        if (!createdByUuid) {
          return {
            success: false,
            error: "Could not resolve created_by user - invalid user ID",
          };
        }
      } else {
        this.logger.log(
          `❌ No created_by provided in payload - this is required`,
        );
        return {
          success: false,
          error: "created_by is required - every task must have a creator",
        };
      }

      this.logger.log(`👤 Final createdByUuid:`, createdByUuid);

      // Validate and parse due_date if provided
      let parsedDueDate = null;
      if (due_date) {
        if (typeof due_date === "string") {
          const date = new Date(due_date);
          if (isNaN(date.getTime())) {
            return { success: false, error: "Invalid due_date format" };
          }
          parsedDueDate = date.toISOString();
        } else {
          parsedDueDate = due_date;
        }
      }

      // Convert emails to UUIDs if assigneesEmails is provided
      let assigneeUUIDs: string[] = [];

      // If assigneesEmails is provided (array of emails), convert to UUIDs
      if (Array.isArray(assigneesEmails) && assigneesEmails.length > 0) {
        this.logger.log(
          "📧 Processing assigneesEmails (POST):",
          assigneesEmails,
        );
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
      }
      // Otherwise, use assignees if provided (should be UUIDs)
      else if (Array.isArray(assignees) && assignees.length > 0) {
        this.logger.log("👥 Processing assignees (POST):", assignees);
        assigneeUUIDs = assignees;
      }

      // DEFAULT ASSIGNEES: If no assignees provided, assign to creator + super admin
      if (assigneeUUIDs.length === 0) {
        this.logger.log(
          "📋 No assignees provided - setting default (creator + super admin)",
        );

        // Add creator as assignee
        if (createdByUuid) {
          assigneeUUIDs.push(createdByUuid);
        }

        // Add super admin if different from creator
        const superAdminId = await this.getSuperAdminId();
        if (superAdminId && superAdminId !== createdByUuid) {
          assigneeUUIDs.push(superAdminId);
        }

        this.logger.log("📋 Default assignees set:", assigneeUUIDs);
      }

      // HIERARCHY PERMISSION CHECK: Verify creator can assign to all assignees
      for (const assigneeId of assigneeUUIDs) {
        if (assigneeId !== createdByUuid) {
          const canAssign = await this.canAssignToUser(
            createdByUuid as string,
            assigneeId,
          );
          if (!canAssign) {
            this.logger.log(
              `❌ Permission denied: ${createdByUuid} cannot assign to ${assigneeId}`,
            );
            return {
              success: false,
              error:
                "אין לך הרשאה להקצות משימה למשתמש זה - ניתן להקצות רק לעובדים שלך",
            };
          }
        }
      }
      this.logger.log("✅ Hierarchy permission check passed for all assignees");

      // Validate estimated_hours if provided
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

      // NOTIFICATION: Notify assignees
      if (assigneeUUIDs.length > 0) {
        const timestamp = new Date().toISOString();
        this.logger.log(
          `🔔 Preparing to notify ${assigneeUUIDs.length} assignees...`,
        );

        for (const assigneeId of assigneeUUIDs) {
          try {
            // Check if notifications table exists first (quick safeguard)
            // Actually, just try to create and catch error

            this.logger.log(
              `🔔 Sending new task notification to ${assigneeId}`,
            ); // Log BEFORE attempt

            await this.itemsService.create(
              "notifications",
              assigneeId,
              randomUUID(),
              {
                title: "משימה חדשה",
                body: `הוקצתה לך משימה חדשה: ${newTask.title}`,
                type: "system",
                timestamp,
                read: false,
                userId: assigneeId,
                data: { taskId: newTask.id },
              },
            );
            this.logger.log(`✅ Notification sent to ${assigneeId}`);
          } catch (itemError) {
            this.logger.error(
              `❌ Failed to create notification for ${assigneeId}. It is likely the 'notifications' table does not exist.`,
              itemError,
            );
            // Verify table existence - if it fails here, we should probably auto-create it or warn loudly
          }
        }

        // AUTO-POST: Create posts for task assignment
        // Track post creation results for response
        const postResults = { created: 0, failed: 0, errors: [] as string[] };

        try {
          // Ensure posts table exists before creating posts
          await this.ensurePostsTable();

          // Track who already got a post to avoid duplicates
          const postCreatedFor = new Set<string>();

          // 1. Create post for the CREATOR first (if they exist)
          if (createdByUuid) {
            try {
              await this.pool.query(
                `
                INSERT INTO posts (author_id, task_id, title, description, post_type)
                VALUES ($1, $2, $3, $4, 'task_assignment')
              `,
                [
                  createdByUuid,
                  newTask.id,
                  `יצרת משימה חדשה: ${newTask.title}`,
                  newTask.description
                    ? `יצרת משימה חדשה: ${newTask.description}`
                    : `יצרת משימה חדשה: ${newTask.title}`,
                ],
              );
              postResults.created++;
              postCreatedFor.add(createdByUuid);
              this.logger.log(`✅ Post created for creator ${createdByUuid}`);
            } catch (postError) {
              postResults.failed++;
              const errorMsg =
                postError instanceof Error
                  ? postError.message
                  : "Unknown error";
              postResults.errors.push(
                `Failed for creator ${createdByUuid}: ${errorMsg}`,
              );
              this.logger.error(
                `❌ Failed to create post for creator ${createdByUuid}:`,
                postError,
              );
            }
          }

          // 2. Create posts for ASSIGNEES (skip if already got post as creator)
          this.logger.log(
            `📝 Creating posts for ${assigneeUUIDs.length} assignees...`,
          );
          for (const assigneeId of assigneeUUIDs) {
            // Skip if this assignee already got a post (e.g., they are also the creator)
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
                  newTask.id,
                  `משימה חדשה: ${newTask.title}`,
                  newTask.description
                    ? `הוקצתה לך משימה חדשה: ${newTask.description}`
                    : `הוקצתה לך משימה חדשה: ${newTask.title}`,
                ],
              );
              postResults.created++;
              postCreatedFor.add(assigneeId);
              this.logger.log(`✅ Post created for assignee ${assigneeId}`);
            } catch (postError) {
              postResults.failed++;
              const errorMsg =
                postError instanceof Error
                  ? postError.message
                  : "Unknown error";
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

          // Clear posts cache after creating posts
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

      // Clear task list caches (blocking to prevent race condition)
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

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async updateTask(@Param("id") id: string, @Body() body: UpdateTaskDto) {
    try {
      // Ensure table exists before updating
      await this.ensureTasksTable();

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return { success: false, error: "Invalid task ID format" };
      }

      // Fetch OLD task to compare assignees and check current status
      const oldTaskRes = await this.pool.query(
        "SELECT assignees, status FROM tasks WHERE id = $1",
        [id],
      );
      if (!oldTaskRes.rows[0]) {
        return { success: false, error: "Task not found" };
      }
      const oldAssignees: string[] = oldTaskRes.rows[0]?.assignees || [];
      const oldStatus: string = oldTaskRes.rows[0]?.status || "open";

      // Validate status if provided (keep in sync with TASK_STATUS_VALUES)
      if (body.status && !TASK_STATUS_VALUES.includes(body.status)) {
        return { success: false, error: "Invalid status value" };
      }

      // Check if status is changing to 'done' - require time log (only if table exists)
      if (body.status === "done" && oldStatus !== "done") {
        const tableExists = await this.pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'task_time_logs'
          )
        `);

        if (tableExists.rows[0].exists) {
          // Check if there's a time log for this task
          const timeLogCheck = await this.pool.query(
            "SELECT COUNT(*) as count FROM task_time_logs WHERE task_id = $1",
            [id],
          );
          const hasTimeLog =
            parseInt(timeLogCheck.rows[0]?.count || "0", 10) > 0;
          if (!hasTimeLog) {
            return {
              success: false,
              error:
                "נדרש לרשום שעות עבודה לפני סימון המשימה כבוצעה. אנא מלא את שעות העבודה בפועל.",
              requiresHoursLog: true,
            };
          }
        }
        // If table doesn't exist, skip the time log requirement
      }

      // Validate priority if provided
      if (body.priority && !TASK_PRIORITY_VALUES.includes(body.priority)) {
        return { success: false, error: "Invalid priority value" };
      }

      // Validate and parse due_date if provided
      let parsedDueDate = null;
      if (body.due_date !== undefined && body.due_date !== null) {
        if (typeof body.due_date === "string") {
          const date = new Date(body.due_date);
          if (isNaN(date.getTime())) {
            return { success: false, error: "Invalid due_date format" };
          }
          parsedDueDate = date.toISOString();
        } else {
          parsedDueDate = body.due_date;
        }
      }

      this.logger.log(
        `📝 PATCH /api/tasks/${id} payload:`,
        JSON.stringify(body),
      );

      // Build partial update dynamically
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

      // Handle assigneesEmails conversion to UUIDs if provided
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
        // Handle assignees update explicitly if key exists
        this.logger.log("👥 Processing assignees update:", body.assignees);
        if (Array.isArray(body.assignees)) {
          assigneeUUIDs = body.assignees;
          shouldUpdateAssignees = true;
        }
      }

      // Build SET clause
      for (const key of allowed) {
        if (key === "assignees" || key === "assigneesEmails") {
          // Skip, handled above
          continue;
        }

        if (key === "due_date") {
          // Handle due_date separately with parsed value
          if (body.due_date !== undefined) {
            params.push(parsedDueDate);
            sets.push(`due_date = $${params.length}`);
          }
          continue;
        }

        if (key === "estimated_hours") {
          // Handle estimated_hours separately with validation
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

        // HIERARCHY PERMISSION CHECK: Get the task's created_by and verify permissions
        const taskCreatorRes = await this.pool.query(
          "SELECT created_by FROM tasks WHERE id = $1",
          [id],
        );
        const taskCreatorId = taskCreatorRes.rows[0]?.created_by;

        if (taskCreatorId) {
          // Check permissions for new assignees only (not ones that were already there)
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
                  success: false,
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

      // CHECK NOTIFICATIONS
      if (shouldUpdateAssignees) {
        const newAssignees = updatedTask.assignees || [];
        // Handle case where oldAssignees might be null/undefined or contains nulls
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
                  body: `הוקצתה לך משימה חדשה: ${updatedTask.title}`,
                  type: "system",
                  timestamp,
                  read: false,
                  userId: assigneeId,
                  data: { taskId: updatedTask.id },
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

          // AUTO-POST: Create posts for newly assigned users
          const assignPostResults = { created: 0, failed: 0 };

          try {
            // Ensure posts table exists before creating posts
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
                    updatedTask.id,
                    `משימה חדשה: ${updatedTask.title}`,
                    updatedTask.description
                      ? `הוקצתה לך משימה חדשה: ${updatedTask.description}`
                      : `הוקצתה לך משימה חדשה: ${updatedTask.title}`,
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

            // Clear posts cache after creating posts
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
      }

      // Clear task caches (blocking to prevent race condition)
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
        const task = rows[0];
        // AUTO-POST: Create posts for task completion
        const completionPostResults = { created: 0, failed: 0 };

        try {
          // Ensure posts table exists before creating posts
          await this.ensurePostsTable();

          this.logger.log(
            `📝 Creating completion posts for task ${task.id}...`,
          );

          // 1. Post for creator
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

          // 2. Post for assignees
          if (task.assignees && task.assignees.length > 0) {
            for (const assigneeId of task.assignees) {
              if (assigneeId !== task.created_by) {
                // Avoid duplicate if assigned to creator
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

          // Clear posts cache after creating posts
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
