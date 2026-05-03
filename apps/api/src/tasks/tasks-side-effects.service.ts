import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { PG_POOL } from "../database/database.module";
import { RedisCacheService } from "../redis/redis-cache.service";
import { ItemsService } from "../items/items.service";
import { TasksSchemaService } from "./tasks-schema.service";

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

      if (createdByUuid) {
        await this.insertCreatorAssignmentPostForNewTask(
          newTask,
          createdByUuid,
          postCreatedFor,
          postResults,
        );
      }

      await this.insertAssigneesAssignmentPostsForNewTask(
        newTask,
        assigneeUUIDs,
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

    await this.sendNewTaskNotificationsToAssignees(
      newTask,
      assigneeUUIDs,
      timestamp,
    );
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

  private async insertCreatorTaskCompletionPost(task: {
    id: string;
    title: string;
    description: string | null;
    created_by: string;
  }): Promise<boolean> {
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
      this.logger.log(
        `✅ Completion post created for creator ${task.created_by}`,
      );
      return true;
    } catch (creatorPostError) {
      this.logger.error(
        `❌ Failed to create completion post for creator ${task.created_by}:`,
        creatorPostError,
      );
      return false;
    }
  }

  private async insertAssigneeTaskCompletionPosts(task: {
    id: string;
    title: string;
    description: string | null;
    created_by: string | null;
    assignees: string[];
  }): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const assigneeId of task.assignees) {
      if (assigneeId === task.created_by) {
        continue;
      }
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
        created++;
        this.logger.log(
          `✅ Completion post created for assignee ${assigneeId}`,
        );
      } catch (assigneePostError) {
        failed++;
        this.logger.error(
          `❌ Failed to create completion post for assignee ${assigneeId}:`,
          assigneePostError,
        );
      }
    }
    return { created, failed };
  }

  async runUpdateTaskCompletionPosts(task: {
    id: string;
    title: string;
    description: string | null;
    created_by: string | null;
    assignees: string[] | null;
  }): Promise<void> {
    const completionPostResults = { created: 0, failed: 0 };

    try {
      await this.schema.ensurePostsTable();

      this.logger.log(`📝 Creating completion posts for task ${task.id}...`);

      if (task.created_by) {
        const ok = await this.insertCreatorTaskCompletionPost({
          ...task,
          created_by: task.created_by,
        });
        if (ok) {
          completionPostResults.created++;
        } else {
          completionPostResults.failed++;
        }
      }

      if (task.assignees && task.assignees.length > 0) {
        const assigneeResults = await this.insertAssigneeTaskCompletionPosts({
          id: task.id,
          title: task.title,
          description: task.description,
          created_by: task.created_by,
          assignees: task.assignees,
        });
        completionPostResults.created += assigneeResults.created;
        completionPostResults.failed += assigneeResults.failed;
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
}
