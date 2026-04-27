import type { PoolClient } from "pg";

type CommentRow = { user_id: string; text: string };
type UserNameRow = { name: string | null };

export async function fetchCommentForLike(
  client: PoolClient,
  commentId: string,
  postId: string,
): Promise<CommentRow | null> {
  const commentCheck = await client.query(
    "SELECT id, user_id, text FROM post_comments WHERE id = $1 AND post_id = $2",
    [commentId, postId],
  );
  return commentCheck.rows.length > 0
    ? (commentCheck.rows[0] as CommentRow)
    : null;
}

export async function fetchUserNameForLike(
  client: PoolClient,
  userId: string,
): Promise<UserNameRow | null> {
  const userCheck = await client.query(
    "SELECT id, name FROM user_profiles WHERE id = $1",
    [userId],
  );
  return userCheck.rows.length > 0 ? (userCheck.rows[0] as UserNameRow) : null;
}

export async function commentLikeExists(
  client: PoolClient,
  commentId: string,
  userId: string,
): Promise<boolean> {
  const existingLike = await client.query(
    "SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
    [commentId, userId],
  );
  return existingLike.rows.length > 0;
}

export async function removeCommentLike(
  client: PoolClient,
  commentId: string,
  userId: string,
): Promise<void> {
  await client.query(
    "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
    [commentId, userId],
  );
}

export async function insertCommentLike(
  client: PoolClient,
  commentId: string,
  userId: string,
): Promise<void> {
  await client.query(
    "INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)",
    [commentId, userId],
  );
}

function commentPreview(text: string): string {
  return `${text.substring(0, 30)}${text.length > 30 ? "..." : ""}`;
}

export async function notifyCommentAuthorOfLike(
  client: PoolClient,
  comment: CommentRow,
  liker: UserNameRow,
  userId: string,
  postId: string,
  commentId: string,
): Promise<void> {
  if (comment.user_id === userId) {
    return;
  }
  const likerName = liker.name || "משתמש";
  const preview = commentPreview(comment.text);
  await client.query(
    `
                        INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
                VALUES($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    `,
    [
      comment.user_id,
      "לייק לתגובה!",
      `${likerName} אהב / ה את התגובה שלך: "${preview}"`,
      "like",
      postId,
      { liker_id: userId, post_id: postId, comment_id: commentId },
    ],
  );
}

export async function syncCommentLikesCount(
  client: PoolClient,
  commentId: string,
): Promise<number> {
  const countResult = await client.query(
    "SELECT COUNT(*)::int as count FROM comment_likes WHERE comment_id = $1",
    [commentId],
  );
  const likesCount = countResult.rows[0]?.count || 0;
  await client.query(
    "UPDATE post_comments SET likes_count = $1, updated_at = NOW() WHERE id = $2",
    [likesCount, commentId],
  );
  return likesCount;
}
