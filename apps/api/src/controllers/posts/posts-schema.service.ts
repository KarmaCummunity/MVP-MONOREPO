import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { ensurePostsTable } from "./posts-schema.ensure-posts-table";
import { ensureLikesCommentsTables } from "./posts-schema.likes-comments-tables";
import { ensureLikesCommentsFunctionsAndTriggers } from "./posts-schema.likes-comments-functions";

@Injectable()
export class PostsSchemaService {
  private readonly logger = new Logger(PostsSchemaService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ensurePostsTable(): Promise<void> {
    await ensurePostsTable(this.pool, this.logger);
  }

  async ensureLikesCommentsTable(): Promise<void> {
    try {
      await ensureLikesCommentsTables(this.pool, this.logger);
      await ensureLikesCommentsFunctionsAndTriggers(this.pool, this.logger);
    } catch (error) {
      this.logger.error("❌ Failed to ensure likes/comments tables:", error);
    }
  }
}
