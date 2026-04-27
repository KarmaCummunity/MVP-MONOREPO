import type { Logger } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { CommentBody } from "./posts.types";

type PostRow = { author_id: string; title: string; post_type: string };
type UserRow = { name: string | null };

export function parseAddCommentInput(
  body: CommentBody,
): { ok: true; user_id: string; text: string } | { ok: false; error: string } {
  const { user_id, text } = body;
  if (!user_id) {
    return { ok: false, error: "user_id is required" };
  }
  if (!text || text.trim().length === 0) {
    return { ok: false, error: "Comment text is required" };
  }
  if (text.length > 2000) {
    return {
      ok: false,
      error: "Comment text is too long (max 2000 characters)",
    };
  }
  return { ok: true, user_id, text: text.trim() };
}

export async function loadPostForCommentOrFail(
  client: PoolClient,
  postId: string,
  logger: Logger,
): Promise<PostRow | null> {
  logger.log(`[addComment] Checking existence of post ${postId}`);
  const postCheck = await client.query(
    "SELECT id, author_id, title, post_type FROM posts WHERE id = $1",
    [postId],
  );
  logger.log(
    `[addComment] Post check result: ${postCheck.rows.length} rows found`,
  );
  if (postCheck.rows.length > 0) {
    return postCheck.rows[0] as PostRow;
  }
  const debugCheck = await client.query("SELECT id FROM posts LIMIT 5");
  logger.log("[addComment] Debug - First 5 posts in DB:", debugCheck.rows);
  await client.query("ROLLBACK");
  return null;
}

export async function loadCommentAuthorOrFail(
  client: PoolClient,
  userId: string,
): Promise<UserRow | null> {
  const userCheck = await client.query(
    "SELECT id, name FROM user_profiles WHERE id = $1",
    [userId],
  );
  if (userCheck.rows.length === 0) {
    await client.query("ROLLBACK");
    return null;
  }
  return userCheck.rows[0] as UserRow;
}

function postTypeHebrew(postType: string): string {
  return postType === "task_completion" ? "השלמת משימה" : "פוסט";
}

function commentSnippet(text: string): string {
  return `${text.substring(0, 30)}${text.length > 30 ? "..." : ""}`;
}

export async function insertCommentAndReturnRow(
  client: PoolClient,
  postId: string,
  userId: string,
  text: string,
): Promise<Record<string, unknown> | null> {
  const { rows } = await client.query(
    `
                INSERT INTO post_comments(post_id, user_id, text)
                VALUES($1, $2, $3)
                RETURNING id, post_id, user_id, text, likes_count, created_at, updated_at
                    `,
    [postId, userId, text],
  );
  if (!rows || rows.length === 0) {
    await client.query("ROLLBACK");
    return null;
  }
  return rows[0] as Record<string, unknown>;
}

export async function fetchCommentUserProfile(
  client: PoolClient,
  userId: string,
) {
  const userResult = await client.query(
    `
                SELECT id, name, avatar_url FROM user_profiles WHERE id = $1
                    `,
    [userId],
  );
  return userResult.rows[0] || null;
}

export async function refreshPostCommentsCount(
  client: PoolClient,
  postId: string,
): Promise<number> {
  const countResult = await client.query(
    "SELECT COUNT(*)::int as count FROM post_comments WHERE post_id = $1",
    [postId],
  );
  const commentsCount = countResult.rows[0]?.count || 0;
  await client.query(
    "UPDATE posts SET comments = $1, updated_at = NOW() WHERE id = $2",
    [commentsCount, postId],
  );
  return commentsCount;
}

export async function notifyPostAuthorOfNewComment(
  client: PoolClient,
  post: PostRow,
  user: UserRow,
  userId: string,
  postId: string,
  text: string,
  commentId: unknown,
): Promise<void> {
  if (post.author_id === userId) {
    return;
  }
  const commenterName = user.name || "משתמש";
  const postType = postTypeHebrew(post.post_type);
  const snippet = commentSnippet(text);
  await client.query(
    `
                    INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
                VALUES($1, $2, $3, $4, $5, $6)
                `,
    [
      post.author_id,
      "תגובה חדשה!",
      `${commenterName} הגיב / ה על ה${postType} שלך: "${snippet}"`,
      "comment",
      postId,
      { commenter_id: userId, post_id: postId, comment_id: commentId },
    ],
  );
}
