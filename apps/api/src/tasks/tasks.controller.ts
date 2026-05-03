// File overview:
// - Purpose: HTTP layer for group tasks (admin app); delegates to tasks/* services.
// - Routes: /api/tasks (GET, POST), /api/tasks/:id (GET, PATCH, DELETE)
// - Storage: PostgreSQL tasks table (schema.sql)
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { UserResolutionService } from "../services/user-resolution.service";
import { JwtAuthGuard, AdminAuthGuard } from "../auth/guards/jwt-auth.guard";
import type {
  CreateTaskDto,
  LogTaskHoursDto,
  TasksListSort,
  UpdateTaskDto,
} from "./tasks.types";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "./tasks.types";
import {
  parseCategoryQueryParam,
  parseListTasksPagination,
  parsePriorityQueryParam,
  parseStatusQueryParam,
  pickFirstQueryValue,
} from "./tasks-query-params";
import {
  parseCreateTaskDueDate,
  parseCreateTaskEstimatedHours,
  parseUpdateTaskDueDateFromBody,
  validateCreateTaskTitleAndEnums,
} from "./tasks-validation";
import { TasksSchemaService } from "./tasks-schema.service";
import { TasksListQueryService } from "./tasks-list-query.service";
import { TasksCreatePrepService } from "./tasks-create-prep.service";
import { TasksSideEffectsService } from "./tasks-side-effects.service";
import { TasksPatchMutationService } from "./tasks-patch-mutation.service";
import { TasksReadService } from "./tasks-read.service";

@Controller("/api/tasks")
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly userResolutionService: UserResolutionService,
    private readonly schema: TasksSchemaService,
    private readonly listQuery: TasksListQueryService,
    private readonly createPrep: TasksCreatePrepService,
    private readonly sideEffects: TasksSideEffectsService,
    private readonly patchMutation: TasksPatchMutationService,
    private readonly read: TasksReadService,
  ) {}

  private async resolveUserIdToUUID(userId: string): Promise<string | null> {
    return this.userResolutionService.resolveUserId(userId, {
      throwOnNotFound: false,
      cacheResult: true,
      logError: false,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listTasks(
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    try {
      await this.schema.ensureTasksTable();

      const status = query.status;
      const priority = query.priority;
      const categoryRaw = query.category;
      const assignee = pickFirstQueryValue(query.assignee);
      const searchQuery = pickFirstQueryValue(query.q);
      const sortParam = pickFirstQueryValue(query.sort);
      const limitParam = pickFirstQueryValue(query.limit);
      const offsetParam = pickFirstQueryValue(query.offset);

      const { limit, offset } = parseListTasksPagination(
        limitParam,
        offsetParam,
      );

      const statusList = parseStatusQueryParam(status);
      const priorityList = parsePriorityQueryParam(priority);
      const categoryList = parseCategoryQueryParam(categoryRaw);
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

      const category = pickFirstQueryValue(categoryRaw);

      const cacheKey = `tasks_list_${statusCachePart}_${priorityCachePart}_${category || "all"}_${assignee || "all"}_${searchQuery || "all"}_${sort}_${limit}_${offset}`;

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

      return await this.listQuery.loadTasksListRowsFromDatabase({
        cacheKey,
        sort,
        limit,
        offset,
        statusList,
        priorityList,
        categoryList,
        assignee,
        searchQuery,
      });
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
            "Database table structure issue. Please contact administrator or check server logs.",
        };
      }

      return {
        success: false,
        error: errorMessage || "Failed to list tasks",
      };
    }
  }

  @Get("init-table")
  @UseGuards(AdminAuthGuard)
  async initTasksTable() {
    try {
      await this.schema.ensureTasksTable();
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

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getTask(@Param("id") id: string) {
    try {
      await this.schema.ensureTasksTable();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return { success: false, error: "Invalid task ID format" };
      }

      const result = await this.read.getTaskById(id);
      return result;
    } catch (error) {
      this.logger.error("Error getting task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get task",
      };
    }
  }

  @Get(":id/subtasks")
  @UseGuards(JwtAuthGuard)
  async getSubtasks(@Param("id") parentId: string) {
    try {
      await this.schema.ensureTasksTable();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(parentId)) {
        return { success: false, error: "Invalid task ID format" };
      }

      return await this.read.getSubtasks(parentId);
    } catch (error) {
      this.logger.error("Error getting subtasks:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get subtasks",
      };
    }
  }

  @Get(":id/tree")
  @UseGuards(JwtAuthGuard)
  async getTaskTree(@Param("id") rootId: string) {
    try {
      await this.schema.ensureTasksTable();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(rootId)) {
        return { success: false, error: "Invalid task ID format" };
      }

      return await this.read.getTaskTree(rootId);
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
      await this.schema.ensureTasksTable();

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

      const basicErr = validateCreateTaskTitleAndEnums(title, status, priority);
      if (basicErr) {
        return basicErr;
      }

      this.logger.log(`📝 POST /api/tasks payload:`, JSON.stringify(body));

      const creatorRes =
        await this.createPrep.resolveCreateTaskCreatorUuid(created_by);
      if (!creatorRes.success) {
        return creatorRes;
      }
      const createdByUuid = creatorRes.uuid;

      this.logger.log(`👤 Final createdByUuid:`, createdByUuid);

      const dueRes = parseCreateTaskDueDate(due_date);
      if ("success" in dueRes) {
        return dueRes;
      }
      const parsedDueDate = dueRes.parsed;

      const assigneeUUIDsRes =
        await this.createPrep.gatherCreateTaskAssigneeUUIDs(
          assignees,
          assigneesEmails,
          createdByUuid,
        );
      if (!assigneeUUIDsRes.success) {
        return assigneeUUIDsRes;
      }
      const assigneeUUIDs = assigneeUUIDsRes.uuids;

      const hierErr = await this.createPrep.assertCreateTaskAssigneeHierarchy(
        createdByUuid,
        assigneeUUIDs,
      );
      if (hierErr) {
        return hierErr;
      }

      const hoursRes = parseCreateTaskEstimatedHours(estimated_hours);
      if ("success" in hoursRes) {
        return hoursRes;
      }
      const parsedEstimatedHours = hoursRes.parsed;

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

      await this.sideEffects.runCreateTaskAssigneeSideEffects(
        newTask,
        assigneeUUIDs,
        createdByUuid,
      );

      try {
        await this.sideEffects.clearTaskCaches();
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

  @Post(":id/log-hours")
  @UseGuards(JwtAuthGuard)
  async logTaskHours(
    @Param("id") taskId: string,
    @Body() body: LogTaskHoursDto,
  ) {
    try {
      await this.schema.ensureTasksTable();

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

      const userIdUuid = await this.resolveUserIdToUUID(user_id);
      if (!userIdUuid) {
        return { success: false, error: "Invalid user_id" };
      }

      const taskCheck = await this.pool.query(
        "SELECT id FROM tasks WHERE id = $1",
        [taskId],
      );
      if (!taskCheck.rows[0]) {
        return { success: false, error: "Task not found" };
      }

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

      try {
        await this.redisCache.delete(`task_${taskId}`);
        await this.sideEffects.clearTaskCaches();
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
      await this.schema.ensureTasksTable();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return { success: false, error: "Invalid task ID format" };
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

      if (body.status && !TASK_STATUS_VALUES.includes(body.status)) {
        return { success: false, error: "Invalid status value" };
      }

      const doneErr = await this.patchMutation.validateMarkDoneRequiresTimeLog(
        id,
        body,
        oldStatus,
      );
      if (doneErr) {
        return doneErr;
      }

      if (body.priority && !TASK_PRIORITY_VALUES.includes(body.priority)) {
        return { success: false, error: "Invalid priority value" };
      }

      const dueRes = parseUpdateTaskDueDateFromBody(body);
      if ("success" in dueRes) {
        return dueRes;
      }
      const parsedDueDate = dueRes.parsed;

      this.logger.log(
        `📝 PATCH /api/tasks/${id} payload:`,
        JSON.stringify(body),
      );

      return await this.patchMutation.applyTaskPatchMutation(
        id,
        body,
        oldAssignees,
        parsedDueDate,
      );
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
      await this.schema.ensureTasksTable();

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

      try {
        await this.redisCache.delete(`task_${id}`);
        await this.sideEffects.clearTaskCaches();
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

  @Get("hours-report/:managerId")
  @UseGuards(JwtAuthGuard)
  async getHoursReport(@Param("managerId") managerId: string) {
    try {
      await this.schema.ensureTasksTable();
      return await this.read.getHoursReport(managerId);
    } catch (error) {
      this.logger.error("Error getting hours report:", error);
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
