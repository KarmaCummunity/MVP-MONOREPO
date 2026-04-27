import type { Logger } from "@nestjs/common";
import type { Pool } from "pg";

/**
 * SQL functions and triggers for post/comment like counts.
 */
export async function ensureLikesCommentsFunctionsAndTriggers(
  pool: Pool,
  logger: Logger,
): Promise<void> {
  logger.log("📝 Ensuring SQL functions exist...");

  await pool.query(`
                CREATE OR REPLACE FUNCTION update_post_likes_count()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        UPDATE posts SET likes = likes + 1, updated_at = NOW() WHERE id = NEW.post_id;
                        RETURN NEW;
                    ELSIF TG_OP = 'DELETE' THEN
                        UPDATE posts SET likes = GREATEST(0, likes - 1), updated_at = NOW() WHERE id = OLD.post_id;
                        RETURN OLD;
                    END IF;
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;
            `);

  await pool.query(`
                CREATE OR REPLACE FUNCTION update_post_comments_count()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        UPDATE posts SET comments = comments + 1, updated_at = NOW() WHERE id = NEW.post_id;
                        RETURN NEW;
                    ELSIF TG_OP = 'DELETE' THEN
                        UPDATE posts SET comments = GREATEST(0, comments - 1), updated_at = NOW() WHERE id = OLD.post_id;
                        RETURN OLD;
                    END IF;
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;
            `);

  await pool.query(`
                CREATE OR REPLACE FUNCTION update_comment_likes_count()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        UPDATE post_comments SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = NEW.comment_id;
                        RETURN NEW;
                    ELSIF TG_OP = 'DELETE' THEN
                        UPDATE post_comments SET likes_count = GREATEST(0, likes_count - 1), updated_at = NOW() WHERE id = OLD.comment_id;
                        RETURN OLD;
                    END IF;
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;
            `);

  logger.log("✅ SQL functions ensured");

  logger.log("📝 Ensuring triggers exist...");

  await pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
                CREATE TRIGGER trigger_update_post_likes_count
                    AFTER INSERT OR DELETE ON post_likes
                    FOR EACH ROW
                    EXECUTE FUNCTION update_post_likes_count();
            `);

  await pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON post_comments;
                CREATE TRIGGER trigger_update_post_comments_count
                    AFTER INSERT OR DELETE ON post_comments
                    FOR EACH ROW
                    EXECUTE FUNCTION update_post_comments_count();
            `);

  await pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
                CREATE TRIGGER trigger_update_comment_likes_count
                    AFTER INSERT OR DELETE ON comment_likes
                    FOR EACH ROW
                    EXECUTE FUNCTION update_comment_likes_count();
            `);

  await pool
    .query(
      `
                DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
                CREATE TRIGGER update_post_comments_updated_at 
                    BEFORE UPDATE ON post_comments 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column();
            `,
    )
    .catch(() => {
      logger.log(
        "⚠️ update_updated_at_column function not found, skipping trigger",
      );
    });

  logger.log("✅ Triggers ensured");
}
