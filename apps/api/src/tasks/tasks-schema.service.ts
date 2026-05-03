import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

/**
 * Idempotent DDL for tasks-related tables (fallback when schema.sql was not applied).
 */
@Injectable()
export class TasksSchemaService {
  private readonly logger = new Logger(TasksSchemaService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Ensure posts table exists with correct schema, create/migrate if needed
   * This is a fallback in case schema.sql wasn't run or table has legacy structure
   */
  async ensurePostsTable(): Promise<void> {
    try {
      const tableCheck = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'posts'
        ) AS exists;
      `);

      if (tableCheck.rows[0]?.exists) {
        const columnCheck = await this.pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'author_id'
          ) AS exists;
        `);

        if (columnCheck.rows[0]?.exists) {
          return;
        }
        this.logger.log(
          "⚠️  Detected legacy posts table structure - recreating with correct schema",
        );
        await this.pool.query("DROP TABLE IF EXISTS posts CASCADE;");
      }

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
    }
  }

  /**
   * Ensure tasks table exists, create it if missing
   * This is a fallback in case schema.sql wasn't run
   */
  async ensureTasksTable(): Promise<void> {
    try {
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

      try {
        await this.pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'tasks' AND column_name = 'estimated_hours'
            ) THEN
              ALTER TABLE tasks ADD COLUMN estimated_hours NUMERIC(10,2);
              UPDATE tasks SET estimated_hours = 0 WHERE estimated_hours IS NULL;
            END IF;
          END $$;
        `);
      } catch (e) {
        this.logger.warn("⚠️ Could not ensure estimated_hours column:", e);
      }

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
    }
  }
}
