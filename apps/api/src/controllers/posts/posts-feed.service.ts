import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { PostsSchemaService } from "./posts-schema.service";
import {
  POST_LIST_FROM_JOINS,
  POST_LIST_SELECT_COLUMNS,
} from "./posts-feed.query";
import { parseLimit, parseLimitOffset } from "./posts-pagination.util";

@Injectable()
export class PostsFeedService {
  private readonly logger = new Logger(PostsFeedService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly schema: PostsSchemaService,
  ) {}

  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const res = await this.pool.query(
        `
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = $1 AND table_schema = 'public'
                    ) AS exists;
                `,
        [tableName],
      );
      return Boolean(res.rows[0]?.exists);
    } catch {
      return false;
    }
  }

  private buildListQueryParts(
    userId: string | undefined,
    postLikesExists: boolean,
    postType: string | undefined,
    itemId: string | undefined,
    rideId: string | undefined,
  ): { query: string; params: unknown[] } {
    let query = POST_LIST_SELECT_COLUMNS;
    const whereConditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    whereConditions.push(`(p.status IS NULL OR p.status != 'hidden')`);

    if (postType) {
      whereConditions.push(`p.post_type = $${paramIndex}`);
      params.push(postType);
      paramIndex++;
    }

    if (itemId) {
      whereConditions.push(`p.item_id = $${paramIndex}`);
      params.push(itemId);
      paramIndex++;
    }

    if (rideId) {
      whereConditions.push(`p.ride_id = $${paramIndex}`);
      params.push(rideId);
      paramIndex++;
    }

    const userIdParamIndex = paramIndex;

    if (userId && postLikesExists) {
      query += `,
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${userIdParamIndex}) as is_liked
                `;
      params.push(userId);
    } else {
      query += `,
                    false as is_liked
                `;
    }

    query += POST_LIST_FROM_JOINS;

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    return { query, params };
  }

  private logPostsSample(rows: unknown[]): void {
    if (rows.length === 0) {
      this.logger.warn("⚠️ getPosts returned 0 posts!");
      return;
    }
    const samplePosts = rows.slice(0, 3).map((row) => {
      const p = row as Record<string, unknown>;
      return {
        id: (p.id as string)?.substring(0, 8),
        title: (p.title as string)?.substring(0, 30),
        post_type: p.post_type,
        author_id: (p.author_id as string)?.substring(0, 8),
        has_author: !!p.author,
        author_id_in_author: (p.author as { id?: string })?.id?.substring(0, 8),
      };
    });
    this.logger.log("📋 Sample posts:", samplePosts);
  }

  private async executePostsListQuery(
    query: string,
    params: unknown[],
    limit: number,
    offset: number,
  ) {
    const fullParams = [limit, offset, ...params];
    return this.pool.query(query, fullParams);
  }

  private async fallbackPostsQuery(limit: number, offset: number) {
    const fallbackQuery = `
                        SELECT 
                            id, author_id, title, description, images, likes, comments, created_at,
                            post_type, metadata, ride_id, item_id
                        FROM posts
                        ORDER BY created_at DESC
                        LIMIT $1 OFFSET $2
                    `;
    const fallbackRes = await this.pool.query(fallbackQuery, [limit, offset]);

    return fallbackRes.rows.map((row: Record<string, unknown>) => ({
      ...row,
      author: {
        id: row.author_id,
        name: "משתמש",
        avatar_url: "",
        email_verified: false,
      },
      task: null,
      is_liked: false,
      ride_data: null,
      item_data: null,
    }));
  }

  async getPosts(
    limitArg: string,
    offsetArg: string,
    userId?: string,
    postType?: string,
    itemId?: string,
    rideId?: string,
  ) {
    try {
      await this.schema.ensurePostsTable();
      await this.schema.ensureLikesCommentsTable();

      const { limit, offset } = parseLimitOffset(limitArg, offsetArg, {
        limit: 20,
        offset: 0,
      });

      const postLikesExists = await this.tableExists("post_likes");
      const { query: baseQuery, params: filterParams } =
        this.buildListQueryParts(
          userId,
          postLikesExists,
          postType,
          itemId,
          rideId,
        );

      const query =
        baseQuery +
        `
                ORDER BY p.created_at DESC
                LIMIT $1 OFFSET $2
            `;

      this.logger.log("📝 [getPosts] Executing query with params:", {
        limit,
        offset,
        userId,
        hasUserId: !!userId,
      });

      try {
        const { rows } = await this.executePostsListQuery(
          query,
          filterParams,
          limit,
          offset,
        );
        this.logger.log(
          `✅ [getPosts] Query returned ${rows.length} posts (limit: ${limit}, offset: ${offset})`,
        );

        const taskPostsInResults = rows.filter(
          (p) =>
            p.post_type === "task_assignment" ||
            p.post_type === "task_completion",
        ).length;
        this.logger.log(
          `📊 Task-related posts in results: ${taskPostsInResults}/${rows.length}`,
        );

        this.logPostsSample(rows);

        return { success: true, data: rows };
      } catch (queryError) {
        this.logger.error(`❌ [getPosts] Primary query failed:`, queryError);

        this.logger.log("⚠️ [getPosts] Attempting fallback query...");

        try {
          const mappedRows = await this.fallbackPostsQuery(limit, offset);
          this.logger.log(
            `✅[getPosts] Fallback query returned ${mappedRows.length} posts`,
          );
          return { success: true, data: mappedRows };
        } catch {
          this.logger.warn("⚠️ [getPosts] Fallback query also failed");
          throw queryError;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Get posts error:", errorMessage);
      return {
        success: false,
        error: `Failed to get posts: ${errorMessage} `,
      };
    }
  }

  async getUserPosts(userId: string, limitArg: string, viewerId?: string) {
    try {
      await this.schema.ensurePostsTable();
      await this.schema.ensureLikesCommentsTable();

      const limit = parseLimit(limitArg, 20);

      let query = POST_LIST_SELECT_COLUMNS;

      const postLikesExists = await this.tableExists("post_likes");

      if (viewerId && postLikesExists) {
        query += `,
                    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) as is_liked
                `;
      } else {
        query += `,
                    false as is_liked
                `;
      }

      query += POST_LIST_FROM_JOINS;
      query += `
                WHERE p.author_id = $1
                ORDER BY p.created_at DESC
                LIMIT $2
            `;

      const params = viewerId ? [userId, limit, viewerId] : [userId, limit];
      const { rows } = await this.pool.query(query, params);

      return { success: true, data: rows };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Get user posts error:", {
        message: errorMessage,
        stack: errorStack,
        userId,
        limit: limitArg,
        viewerId,
      });
      return {
        success: false,
        error: `Failed to get user posts: ${errorMessage} `,
      };
    }
  }
}
