import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import type { ParsedDueDateSqlParam, UpdateTaskDto } from "./tasks.types";
import { TasksPermissionsService } from "./tasks-permissions.service";
import { TasksSideEffectsService } from "./tasks-side-effects.service";

/**
 * PATCH mutation: SQL set builders, assignee resolution on patch, and orchestrated side effects.
 */
@Injectable()
export class TasksPatchMutationService {
  private readonly logger = new Logger(TasksPatchMutationService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly permissions: TasksPermissionsService,
    private readonly sideEffects: TasksSideEffectsService,
  ) {}

  private async evaluateMarkDoneTimeLogRequirement(
    taskId: string,
    body: UpdateTaskDto,
    oldStatus: string,
  ): Promise<{
    success: false;
    error: string;
    requiresHoursLog?: boolean;
  } | null> {
    if (body.status !== "done" || oldStatus === "done") {
      return null;
    }

    const tableExists = await this.pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'task_time_logs'
          )
        `);

    if (!tableExists.rows[0].exists) {
      return null;
    }

    const timeLogCheck = await this.pool.query(
      "SELECT COUNT(*) as count FROM task_time_logs WHERE task_id = $1",
      [taskId],
    );
    const hasTimeLog =
      Number.parseInt(timeLogCheck.rows[0]?.count || "0", 10) > 0;
    if (hasTimeLog) {
      return null;
    }

    return {
      success: false,
      error:
        "נדרש לרשום שעות עבודה לפני סימון המשימה כבוצעה. אנא מלא את שעות העבודה בפועל.",
      requiresHoursLog: true,
    };
  }

  private appendUpdateTaskScalarSets(
    body: UpdateTaskDto,
    parsedDueDate: ParsedDueDateSqlParam,
    sets: string[],
    params: unknown[],
  ): { success: false; error: string } | null {
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

    for (const key of allowed) {
      if (key === "assignees" || key === "assigneesEmails") {
        continue;
      }
      const err = this.appendOnePatchScalarField(
        key,
        body,
        parsedDueDate,
        sets,
        params,
      );
      if (err) {
        return err;
      }
    }
    return null;
  }

  private appendOnePatchScalarField(
    key:
      | "title"
      | "description"
      | "status"
      | "priority"
      | "category"
      | "due_date"
      | "tags"
      | "checklist"
      | "estimated_hours",
    body: UpdateTaskDto,
    parsedDueDate: ParsedDueDateSqlParam,
    sets: string[],
    params: unknown[],
  ): { success: false; error: string } | null {
    if (key === "due_date") {
      this.appendDueDatePatchToSets(body, parsedDueDate, sets, params);
      return null;
    }
    if (key === "estimated_hours") {
      return this.appendEstimatedHoursPatchToSets(body, sets, params);
    }
    this.appendGenericScalarPatchToSets(key, body, sets, params);
    return null;
  }

  private appendDueDatePatchToSets(
    body: UpdateTaskDto,
    parsedDueDate: ParsedDueDateSqlParam,
    sets: string[],
    params: unknown[],
  ): void {
    if (body.due_date !== undefined) {
      params.push(parsedDueDate);
      sets.push(`due_date = $${params.length}`);
    }
  }

  private appendEstimatedHoursPatchToSets(
    body: UpdateTaskDto,
    sets: string[],
    params: unknown[],
  ): { success: false; error: string } | null {
    if (body.estimated_hours === undefined) {
      return null;
    }
    let parsedHours: number | null = null;
    if (body.estimated_hours !== null) {
      const hours = Number.parseFloat(String(body.estimated_hours));
      if (Number.isNaN(hours) || hours < 0) {
        return {
          success: false,
          error: "estimated_hours must be a non-negative number",
        };
      }
      parsedHours = hours;
    }
    params.push(parsedHours);
    sets.push(`estimated_hours = $${params.length}::NUMERIC`);
    return null;
  }

  private appendGenericScalarPatchToSets(
    key:
      | "title"
      | "description"
      | "status"
      | "priority"
      | "category"
      | "tags"
      | "checklist",
    body: UpdateTaskDto,
    sets: string[],
    params: unknown[],
  ): void {
    if (!(key in body)) {
      return;
    }
    let value: unknown = body[key as keyof UpdateTaskDto];
    if (key === "tags") {
      value = Array.isArray(body.tags) ? body.tags : [];
    }
    params.push(value);
    const idx = params.length;
    if (key === "tags") {
      sets.push(`tags = $${idx}::TEXT[]`);
    } else if (key === "checklist") {
      sets.push(`checklist = $${idx}::JSONB`);
    } else {
      sets.push(`${key} = $${idx}`);
    }
  }

  async collectAssigneesFromPatchBody(body: UpdateTaskDto): Promise<{
    assigneeUUIDs: string[];
    shouldUpdateAssignees: boolean;
  }> {
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

    return { assigneeUUIDs, shouldUpdateAssignees };
  }

  private async verifyHierarchyForPatchAssignees(
    taskCreatorId: string,
    oldAssignees: string[],
    assigneeUUIDs: string[],
  ): Promise<{ success: false; error: string } | null> {
    const oldAssigneeSet = new Set((oldAssignees || []).filter(Boolean));
    const newlyAddedAssignees = assigneeUUIDs.filter(
      (uid: string) => !oldAssigneeSet.has(uid),
    );

    for (const assigneeId of newlyAddedAssignees) {
      if (assigneeId === taskCreatorId) {
        continue;
      }
      const canAssign = await this.permissions.canAssignToUser(
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
    this.logger.log(
      "✅ Hierarchy permission check passed for updated assignees",
    );
    return null;
  }

  async validateMarkDoneRequiresTimeLog(
    taskId: string,
    body: UpdateTaskDto,
    oldStatus: string,
  ): Promise<{
    success: false;
    error: string;
    requiresHoursLog?: boolean;
  } | null> {
    return this.evaluateMarkDoneTimeLogRequirement(taskId, body, oldStatus);
  }

  async applyTaskPatchMutation(
    id: string,
    body: UpdateTaskDto,
    oldAssignees: string[],
    parsedDueDate: ParsedDueDateSqlParam,
  ): Promise<
    | { success: false; error: string }
    | { success: true; data: Record<string, unknown> }
  > {
    const sets: string[] = [];
    const params: unknown[] = [];

    const { assigneeUUIDs, shouldUpdateAssignees } =
      await this.collectAssigneesFromPatchBody(body);

    const scalarErr = this.appendUpdateTaskScalarSets(
      body,
      parsedDueDate,
      sets,
      params,
    );
    if (scalarErr) {
      return scalarErr;
    }

    if (shouldUpdateAssignees) {
      this.logger.log("👥 Updating assignees to set:", assigneeUUIDs);

      const taskCreatorRes = await this.pool.query(
        "SELECT created_by FROM tasks WHERE id = $1",
        [id],
      );
      const taskCreatorId = taskCreatorRes.rows[0]?.created_by;

      if (taskCreatorId) {
        const hierErr = await this.verifyHierarchyForPatchAssignees(
          taskCreatorId,
          oldAssignees,
          assigneeUUIDs,
        );
        if (hierErr) {
          return hierErr;
        }
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
      const oldAssigneeSet = new Set((oldAssignees || []).filter(Boolean));
      const addedAssignees = newAssignees.filter(
        (uid: string) => !oldAssigneeSet.has(uid),
      );

      this.logger.log("🔔 Notification check:", {
        safeOld: [...oldAssigneeSet],
        new: newAssignees,
        added: addedAssignees,
      });

      if (addedAssignees.length > 0) {
        await this.sideEffects.runUpdateTaskNewAssigneeSideEffects(
          updatedTask,
          addedAssignees,
        );
      }
    }

    try {
      await this.redisCache.delete(`task_${id}`);
      await this.sideEffects.clearTaskCaches();
      this.logger.log("✅ Task caches cleared after update");
    } catch (cacheErr) {
      this.logger.warn(
        "Error clearing caches after task update (non-fatal):",
        cacheErr,
      );
    }

    if (rows.length > 0 && body.status === "done") {
      await this.sideEffects.runUpdateTaskCompletionPosts(rows[0]);
    }

    return { success: true, data: rows[0] };
  }
}
