import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { UserResolutionService } from "../services/user-resolution.service";
import { SQL_PRIORITY_ORDER_ASC } from "./tasks.types";

/**
 * Single-task reads, subtasks, tree, and hours report (unchanged SQL / caching behavior).
 */
@Injectable()
export class TasksReadService {
  private readonly logger = new Logger(TasksReadService.name);

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

  async getTaskById(
    id: string,
  ): Promise<
    { success: true; data: unknown } | { success: false; error: string }
  > {
    const cacheKey = `task_${id}`;

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

    try {
      await this.redisCache.set(cacheKey, rows[0], 15 * 60);
    } catch (cacheError) {
      this.logger.warn("Redis cache set error (non-fatal):", cacheError);
    }

    return { success: true, data: rows[0] };
  }

  async getSubtasks(
    parentId: string,
  ): Promise<
    { success: true; data: unknown[] } | { success: false; error: string }
  > {
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
  }

  async getTaskTree(
    rootId: string,
  ): Promise<
    { success: true; data: unknown[] } | { success: false; error: string }
  > {
    const { rows } = await this.pool.query(
      `
        WITH RECURSIVE task_tree AS (
          SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, 
            t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, 
            t.estimated_hours, t.created_by, t.created_at, t.updated_at,
            0 as level,
            ARRAY[t.id] as path
          FROM tasks t
          WHERE t.id = $1
          
          UNION ALL
          
          SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.category, 
            t.due_date, t.assignees, t.tags, t.checklist, t.parent_task_id, 
            t.estimated_hours, t.created_by, t.created_at, t.updated_at,
            tt.level + 1,
            tt.path || t.id
          FROM tasks t
          INNER JOIN task_tree tt ON t.parent_task_id = tt.id
          WHERE tt.level < 10
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

    this.logger.log(`🌳 Found ${rows.length} tasks in tree for root ${rootId}`);
    return { success: true, data: rows };
  }

  async getHoursReport(managerId: string): Promise<
    | {
        success: true;
        data: {
          manager_hours: number;
          team_total_hours: number;
          by_task: Array<{
            task_id: unknown;
            task_title: unknown;
            hours: number;
          }>;
          by_period: Array<{ period: unknown; hours: number }>;
          by_user: Array<{
            user_id: unknown;
            user_name: unknown;
            hours: number;
          }>;
        };
      }
    | { success: false; error: string }
  > {
    try {
      const tableExists = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_time_logs'
        )
      `);

      if (!tableExists.rows[0].exists) {
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

      const managerUuid = await this.resolveUserIdToUUID(managerId);
      if (!managerUuid) {
        return { success: false, error: "Invalid manager ID" };
      }

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

      const managerHoursRes = await this.pool.query(
        `
        SELECT COALESCE(SUM(actual_hours), 0)::NUMERIC as total_hours
        FROM task_time_logs
        WHERE user_id = $1
      `,
        [managerUuid],
      );
      const managerHours = Number.parseFloat(
        managerHoursRes.rows[0]?.total_hours || "0",
      );

      const teamHoursRes = await this.pool.query(
        `
        SELECT COALESCE(SUM(actual_hours), 0)::NUMERIC as total_hours
        FROM task_time_logs
        WHERE user_id = ANY($1::UUID[])
      `,
        [teamUserIds],
      );
      const teamTotalHours = Number.parseFloat(
        teamHoursRes.rows[0]?.total_hours || "0",
      );

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
          hours: Number.parseFloat((row.hours as string) || "0"),
        })),
        by_period: hoursByPeriodRes.rows.map(
          (row: Record<string, unknown>) => ({
            period: row.period,
            hours: Number.parseFloat((row.hours as string) || "0"),
          }),
        ),
        by_user: hoursByUserRes.rows.map((row: Record<string, unknown>) => ({
          user_id: row.user_id,
          user_name: row.user_name,
          hours: Number.parseFloat((row.hours as string) || "0"),
        })),
      };

      return { success: true, data: report };
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
