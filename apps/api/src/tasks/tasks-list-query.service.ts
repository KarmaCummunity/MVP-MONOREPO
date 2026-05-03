import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { UserResolutionService } from "../services/user-resolution.service";
import type { TaskPriority, TaskStatus, TasksListSort } from "./tasks.types";
import { collapseSqlForLog, orderByClause } from "./tasks-query-params";

/**
 * Task list SQL construction, filtering, and Redis cache write for list results.
 */
@Injectable()
export class TasksListQueryService {
  private readonly logger = new Logger(TasksListQueryService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly userResolutionService: UserResolutionService,
  ) {}

  private async resolveUserIdToUUID(userId: string): Promise<string | null> {
    return this.userResolutionService.resolveUserId(userId, {
      throwOnNotFound: false,
      cacheResult: true,
      logError: false,
    });
  }

  appendListStatusPriorityCategoryFilters(
    statusList: TaskStatus[] | undefined,
    priorityList: TaskPriority[] | undefined,
    categoryList: string[] | undefined,
    filters: string[],
    params: unknown[],
  ): void {
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
  }

  private async appendListAssigneeFilter(
    assignee: string | undefined,
    filters: string[],
    params: unknown[],
  ): Promise<void> {
    if (!assignee) {
      return;
    }
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let assigneeUuid = assignee;

    if (!uuidRegex.test(assignee)) {
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
    filters.push(`$${params.length}::UUID = ANY(assignees::UUID[])`);
  }

  async loadTasksListRowsFromDatabase(params: {
    cacheKey: string;
    sort: TasksListSort;
    limit: number;
    offset: number;
    statusList: TaskStatus[] | undefined;
    priorityList: TaskPriority[] | undefined;
    categoryList: string[] | undefined;
    assignee: string | undefined;
    searchQuery: string | undefined;
  }): Promise<{ success: true; data: unknown[] }> {
    const {
      cacheKey,
      sort,
      limit,
      offset,
      statusList,
      priorityList,
      categoryList,
      assignee,
      searchQuery,
    } = params;

    const filters: string[] = [];
    const sqlParams: unknown[] = [];

    this.appendListStatusPriorityCategoryFilters(
      statusList,
      priorityList,
      categoryList,
      filters,
      sqlParams,
    );

    await this.appendListAssigneeFilter(assignee, filters, sqlParams);

    if (searchQuery?.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      sqlParams.push(searchTerm);
      const searchParamIndex = sqlParams.length;
      filters.push(
        `(title ILIKE $${searchParamIndex} OR description ILIKE $${searchParamIndex})`,
      );
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

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
        LIMIT $${sqlParams.length + 1}
        OFFSET $${sqlParams.length + 2}
      `;
    sqlParams.push(limit, offset);

    this.logger.log(`🚀 Executing LIST SQL:`, collapseSqlForLog(sql));
    this.logger.log(`params:`, sqlParams);

    const { rows } = await this.pool.query(sql, sqlParams);
    this.logger.log(`✅ Found ${rows.length} tasks`);

    try {
      await this.redisCache.set(cacheKey, rows, 10 * 60);
    } catch (cacheError) {
      this.logger.warn("Redis cache set error (non-fatal):", cacheError);
    }

    return { success: true, data: rows };
  }
}
