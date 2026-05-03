import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { UserResolutionService } from "../services/user-resolution.service";
import { TasksPermissionsService } from "./tasks-permissions.service";

/**
 * Creator resolution and assignee gathering / hierarchy checks for POST /api/tasks.
 */
@Injectable()
export class TasksCreatePrepService {
  private readonly logger = new Logger(TasksCreatePrepService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly userResolutionService: UserResolutionService,
    private readonly permissions: TasksPermissionsService,
  ) {}

  private async resolveUserIdToUUID(userId: string): Promise<string | null> {
    return this.userResolutionService.resolveUserId(userId, {
      throwOnNotFound: false,
      cacheResult: true,
      logError: false,
    });
  }

  /** Dedupe UUID strings while preserving first-seen casing (for PostgreSQL UUID[]). */
  private dedupeUuidsPreserveOrder(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
      const n = id.trim().toLowerCase();
      if (seen.has(n)) {
        continue;
      }
      seen.add(n);
      out.push(id.trim());
    }
    return out;
  }

  async resolveCreateTaskCreatorUuid(
    created_by: string | null | undefined,
  ): Promise<
    { success: false; error: string } | { success: true; uuid: string }
  > {
    if (!created_by) {
      this.logger.log(
        `❌ No created_by provided in payload - this is required`,
      );
      return {
        success: false,
        error: "created_by is required - every task must have a creator",
      };
    }
    const resolutionStart = Date.now();
    const uuid = await this.resolveUserIdToUUID(created_by);
    this.logger.log(
      `👤 Resolved created_by ${created_by} to ${uuid} in ${Date.now() - resolutionStart}ms`,
    );
    if (!uuid) {
      return {
        success: false,
        error: "Could not resolve created_by user - invalid user ID",
      };
    }
    return { success: true, uuid };
  }

  async gatherCreateTaskAssigneeUUIDs(
    assignees: unknown,
    assigneesEmails: unknown,
    createdByUuid: string,
  ): Promise<
    { success: false; error: string } | { success: true; uuids: string[] }
  > {
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
      const rawList = assignees.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      );
      const resolved: string[] = [];
      for (const raw of rawList) {
        const uuid = await this.resolveUserIdToUUID(raw.trim());
        if (!uuid) {
          return {
            success: false,
            error:
              "Could not resolve one or more assignees to a user profile UUID",
          };
        }
        resolved.push(uuid);
      }
      assigneeUUIDs = this.dedupeUuidsPreserveOrder(resolved);
    }

    if (assigneeUUIDs.length === 0) {
      this.logger.log(
        "📋 No assignees provided - defaulting assignee to task creator",
      );
      assigneeUUIDs.push(createdByUuid);
      this.logger.log("📋 Default assignees set:", assigneeUUIDs);
    }

    return {
      success: true,
      uuids: this.dedupeUuidsPreserveOrder(assigneeUUIDs),
    };
  }

  async assertCreateTaskAssigneeHierarchy(
    createdByUuid: string,
    assigneeUUIDs: string[],
  ): Promise<{ success: false; error: string } | null> {
    for (const assigneeId of assigneeUUIDs) {
      if (assigneeId === createdByUuid) {
        continue;
      }
      const canAssign = await this.permissions.canAssignToUser(
        createdByUuid,
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
    this.logger.log("✅ Hierarchy permission check passed for all assignees");
    return null;
  }
}
