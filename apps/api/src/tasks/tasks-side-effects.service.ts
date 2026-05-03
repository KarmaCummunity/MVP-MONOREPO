import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { ItemsService } from "../items/items.service";
import { TasksSchemaService } from "./tasks-schema.service";
import {
  hasNonCreatorPerformer,
  isSoloSelfComplete,
  resolvePerformerIdsForTaskCompletion,
} from "./task-completion-participants";

/**
 * Notifications, assignment/completion posts, and related cache invalidation.
 */
@Injectable()
export class TasksSideEffectsService {
  private readonly logger = new Logger(TasksSideEffectsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly redisCache: RedisCacheService,
    private readonly itemsService: ItemsService,
    private readonly schema: TasksSchemaService,
  ) {}

  /** Stable compare for UUID strings from DB vs clients (case / whitespace). */
  private normalizeUserId(id: string): string {
    return id.trim().toLowerCase();
  }

  /** True when at least one assignee is not the task creator (delegation / multi-assignee). */
  private isDelegatedAssignment(
    assigneeUUIDs: string[],
    createdByUuid: string | null,
  ): boolean {
    if (!createdByUuid) {
      return false;
    }
    const c = this.normalizeUserId(createdByUuid);
    return assigneeUUIDs.some((id) => this.normalizeUserId(id) !== c);
  }

  /**
   * Unique assignee IDs preserving first-seen casing (for DB writes).
   * When delegated, drops the creator so they do not get a performer feed post or notification.
   */
  private assigneeTargetsExcludingCreatorWhenDelegated(
    assigneeUUIDs: string[],
    createdByUuid: string | null,
    delegated: boolean,
  ): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const raw of assigneeUUIDs) {
      const n = this.normalizeUserId(raw);
      if (seen.has(n)) {
        continue;
      }
      seen.add(n);
      deduped.push(raw);
    }
    if (!delegated || !createdByUuid) {
      return deduped;
    }
    const cn = this.normalizeUserId(createdByUuid);
    return deduped.filter((id) => this.normalizeUserId(id) !== cn);
  }

  async clearTaskCaches(): Promise<void> {
    try {
      await this.redisCache.invalidatePattern("tasks_list_*");
    } catch (cacheError) {
      this.logger.warn(
        "Redis cache invalidation error (non-fatal):",
        cacheError,
      );
    }
  }

  async clearPostsCaches(): Promise<void> {
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

  async sendNewTaskNotificationsToAssignees(
    newTask: { id: string; title: string },
    assigneeUUIDs: string[],
    timestamp: string,
  ): Promise<void> {
    for (const assigneeId of assigneeUUIDs) {
      try {
        this.logger.log(`🔔 Sending new task notification to ${assigneeId}`);

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
      }
    }
  }

  private async insertCreatorAssignmentPostForNewTask(
    newTask: { id: string; title: string; description: string | null },
    createdByUuid: string,
    postCreatedFor: Set<string>,
    postResults: { created: number; failed: number; errors: string[] },
  ): Promise<void> {
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

  private async insertAssigneesAssignmentPostsForNewTask(
    newTask: { id: string; title: string; description: string | null },
    assigneeUUIDs: string[],
    postCreatedFor: Set<string>,
    postResults: { created: number; failed: number; errors: string[] },
  ): Promise<void> {
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
          postError instanceof Error ? postError.message : "Unknown error";
        postResults.errors.push(`Failed for ${assigneeId}: ${errorMsg}`);
        this.logger.error(
          `❌ Failed to create post for assignee ${assigneeId}:`,
          postError,
        );
      }
    }
  }

  private async createAssignmentPostsForNewTask(
    newTask: { id: string; title: string; description: string | null },
    assigneeUUIDs: string[],
    createdByUuid: string | null,
  ): Promise<void> {
    const postResults = { created: 0, failed: 0, errors: [] as string[] };

    try {
      await this.schema.ensurePostsTable();

      const postCreatedFor = new Set<string>();

      const delegatedToOthers = this.isDelegatedAssignment(
        assigneeUUIDs,
        createdByUuid,
      );
      const performerAssigneeIds =
        this.assigneeTargetsExcludingCreatorWhenDelegated(
          assigneeUUIDs,
          createdByUuid,
          delegatedToOthers,
        );

      // Solo / self-work: one "יצרת משימה" card on the creator's profile.
      // Delegation: only real performers get feed posts — never the opening manager.
      if (!delegatedToOthers && createdByUuid) {
        await this.insertCreatorAssignmentPostForNewTask(
          newTask,
          createdByUuid,
          postCreatedFor,
          postResults,
        );
      }

      await this.insertAssigneesAssignmentPostsForNewTask(
        newTask,
        performerAssigneeIds,
        postCreatedFor,
        postResults,
      );

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

  async runCreateTaskAssigneeSideEffects(
    newTask: { id: string; title: string; description: string | null },
    assigneeUUIDs: string[],
    createdByUuid: string | null,
  ): Promise<void> {
    if (assigneeUUIDs.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    this.logger.log(
      `🔔 Preparing to notify ${assigneeUUIDs.length} assignees...`,
    );

    const delegatedToOthers = this.isDelegatedAssignment(
      assigneeUUIDs,
      createdByUuid,
    );
    const notifyAssigneeIds = this.assigneeTargetsExcludingCreatorWhenDelegated(
      assigneeUUIDs,
      createdByUuid,
      delegatedToOthers,
    );

    const soleSelfAssignment =
      createdByUuid != null &&
      assigneeUUIDs.length === 1 &&
      this.normalizeUserId(assigneeUUIDs[0]) ===
        this.normalizeUserId(createdByUuid);

    if (!soleSelfAssignment && notifyAssigneeIds.length > 0) {
      await this.sendNewTaskNotificationsToAssignees(
        newTask,
        notifyAssigneeIds,
        timestamp,
      );
    }

    await this.createAssignmentPostsForNewTask(
      newTask,
      assigneeUUIDs,
      createdByUuid,
    );
  }

  async runUpdateTaskNewAssigneeSideEffects(
    updatedTask: {
      id: string;
      title: string;
      description: string | null;
    },
    addedAssignees: string[],
  ): Promise<void> {
    if (addedAssignees.length === 0) {
      return;
    }

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

    const assignPostResults = { created: 0, failed: 0 };

    try {
      await this.schema.ensurePostsTable();

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

  /** Copy shown on the performer's profile when a task is marked done. */
  private performerCompletionPostCopy(task: {
    title: string;
    description: string | null;
  }): { title: string; description: string } {
    const title = `ביצעתי משימה: ${task.title}`;
    const description = task.description
      ? `השלמתי את המשימה "${task.title}" בהצלחה! ${task.description}`
      : `השלמתי את המשימה "${task.title}" בהצלחה!`;
    return { title, description };
  }

  /**
   * Turn the existing assignment post into a completion post when possible
   * (same row → feed continuity); otherwise insert a completion row (legacy / edge cases).
   */
  private async finalizePerformerCompletionPost(
    task: { id: string; title: string; description: string | null },
    performerId: string,
  ): Promise<boolean> {
    const { title, description } = this.performerCompletionPostCopy(task);
    try {
      const updated = await this.pool.query(
        `
        UPDATE posts
        SET title = $3,
            description = $4,
            post_type = 'task_completion',
            updated_at = NOW()
        WHERE task_id = $1
          AND author_id = $2
          AND post_type = 'task_assignment'
          AND (
            title LIKE 'משימה חדשה:%'
            OR title LIKE 'יצרת משימה חדשה:%'
          )
        `,
        [task.id, performerId, title, description],
      );
      if ((updated.rowCount ?? 0) > 0) {
        this.logger.log(
          `✅ Assignment post updated to completion for performer ${performerId}`,
        );
        return true;
      }

      await this.pool.query(
        `
        INSERT INTO posts (author_id, task_id, title, description, post_type)
        VALUES ($1, $2, $3, $4, 'task_completion')
        `,
        [performerId, task.id, title, description],
      );
      this.logger.log(
        `✅ Completion post inserted (no matching assignment row) for performer ${performerId}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `❌ Failed to finalize completion post for performer ${performerId}:`,
        err,
      );
      return false;
    }
  }

  /** When assignees finish the task, close the creator's "יצרת משימה" card without implying they performed it. */
  private creatorMirrorCompletionCopy(task: {
    title: string;
    description: string | null;
  }): { title: string; description: string } {
    const title = `המשימה שהוקצתה הושלמה: ${task.title}`;
    const description = task.description
      ? `משימה שהקצית הושלמה בהצלחה. ${task.description}`
      : `משימה שהקצית הושלמה בהצלחה.`;
    return { title, description };
  }

  private async finalizeCreatorOpenedTaskPostWhenCompletedByOthers(
    task: {
      id: string;
      title: string;
      description: string | null;
      created_by: string | null;
    },
    performerIds: string[],
  ): Promise<boolean> {
    if (!task.created_by || performerIds.length === 0) {
      return false;
    }
    const completedByAssigneesOtherThanCreator = hasNonCreatorPerformer(
      performerIds,
      task.created_by,
    );
    if (!completedByAssigneesOtherThanCreator) {
      return false;
    }

    const { title, description } = this.creatorMirrorCompletionCopy(task);
    try {
      const res = await this.pool.query(
        `
        UPDATE posts
        SET title = $3,
            description = $4,
            post_type = 'task_completion',
            updated_at = NOW()
        WHERE task_id = $1
          AND author_id = $2
          AND post_type = 'task_assignment'
          AND title LIKE 'יצרת משימה חדשה:%'
        `,
        [task.id, task.created_by, title, description],
      );
      if ((res.rowCount ?? 0) > 0) {
        this.logger.log(
          `✅ Creator assignment post closed after task ${task.id} completion`,
        );
        return true;
      }
    } catch (err) {
      this.logger.error(
        `❌ Failed to close creator assignment post for task ${task.id}:`,
        err,
      );
    }
    return false;
  }

  /** Notify task creator when assignees finished the work (not solo self-complete). */
  private async sendTaskCompletedNotificationToCreator(payload: {
    id: string;
    title: string;
    created_by: string | null;
    performerIds: string[];
  }): Promise<void> {
    const { id, title, created_by: creatorId, performerIds } = payload;
    if (!creatorId) {
      return;
    }
    const soloSelfComplete = isSoloSelfComplete(performerIds, creatorId);
    if (soloSelfComplete) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      await this.itemsService.create("notifications", creatorId, randomUUID(), {
        title: "משימה הושלמה",
        body: `המשימה "${title}" סומנה כהושלמה`,
        type: "system",
        timestamp,
        read: false,
        userId: creatorId,
        data: { taskId: id },
      });
      this.logger.log(
        `✅ Task completion notification sent to creator ${creatorId}`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Failed to notify creator ${creatorId} of task completion`,
        err,
      );
    }
  }

  async runUpdateTaskCompletionPosts(task: {
    id: string;
    title: string;
    description: string | null;
    created_by: string | null;
    assignees: string[] | null;
  }): Promise<void> {
    const performerIds = resolvePerformerIdsForTaskCompletion(
      task.assignees ?? [],
      task.created_by,
    );

    let finalized = 0;
    let failed = 0;

    try {
      await this.schema.ensurePostsTable();

      this.logger.log(`📝 Finalizing completion posts for task ${task.id}...`);

      for (const performerId of performerIds) {
        const ok = await this.finalizePerformerCompletionPost(
          task,
          performerId,
        );
        if (ok) {
          finalized++;
        } else {
          failed++;
        }
      }

      const creatorMirrorOk =
        await this.finalizeCreatorOpenedTaskPostWhenCompletedByOthers(
          task,
          performerIds,
        );
      if (creatorMirrorOk) {
        finalized++;
      }

      await this.sendTaskCompletedNotificationToCreator({
        id: task.id,
        title: task.title,
        created_by: task.created_by,
        performerIds,
      });

      this.logger.log(
        `📊 Completion post summary: ${finalized} finalized, ${failed} failed`,
      );

      if (finalized > 0) {
        try {
          await this.clearPostsCaches();
          this.logger.log(
            "✅ Posts caches cleared after completion post finalization",
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
}
