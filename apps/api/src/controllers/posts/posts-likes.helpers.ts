import type { PoolClient } from "pg";

type PostLikeRow = { author_id: string; title: string; post_type: string };
type UserNameRow = { name: string | null };

function postTypeHebrew(postType: string): string {
  return postType === "task_completion" ? "השלמת משימה" : "פוסט";
}

export async function fetchPostForLike(
  client: PoolClient,
  postId: string,
): Promise<PostLikeRow | null> {
  const postCheck = await client.query(
    "SELECT id, author_id, title, post_type FROM posts WHERE id = $1",
    [postId],
  );
  return postCheck.rows.length > 0 ? (postCheck.rows[0] as PostLikeRow) : null;
}

export async function fetchUserNameRow(
  client: PoolClient,
  userId: string,
): Promise<UserNameRow | null> {
  const userCheck = await client.query(
    "SELECT id, name FROM user_profiles WHERE id = $1",
    [userId],
  );
  return userCheck.rows.length > 0 ? (userCheck.rows[0] as UserNameRow) : null;
}

export async function removePostLike(
  client: PoolClient,
  postId: string,
  userId: string,
): Promise<void> {
  await client.query(
    "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
    [postId, userId],
  );
}

export async function insertPostLike(
  client: PoolClient,
  postId: string,
  userId: string,
): Promise<void> {
  await client.query(
    "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
    [postId, userId],
  );
}

export async function notifyPostAuthorOfLike(
  client: PoolClient,
  post: PostLikeRow,
  liker: UserNameRow,
  userId: string,
  postId: string,
): Promise<void> {
  if (post.author_id === userId) {
    return;
  }
  const likerName = liker.name || "משתמש";
  const postType = postTypeHebrew(post.post_type);
  await client.query(
    `
                        INSERT INTO user_notifications(user_id, title, content, notification_type, related_id, metadata)
                VALUES($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    `,
    [
      post.author_id,
      "לייק חדש!",
      `${likerName} אהב / ה את ה${postType} שלך: "${post.title}"`,
      "like",
      postId,
      { liker_id: userId, post_id: postId },
    ],
  );
}

export async function syncPostLikesCount(
  client: PoolClient,
  postId: string,
): Promise<number> {
  const countResult = await client.query(
    "SELECT COUNT(*)::int as count FROM post_likes WHERE post_id = $1",
    [postId],
  );
  const likesCount = countResult.rows[0]?.count || 0;
  await client.query(
    "UPDATE posts SET likes = $1, updated_at = NOW() WHERE id = $2",
    [likesCount, postId],
  );
  return likesCount;
}

export async function postLikeExists(
  client: PoolClient,
  postId: string,
  userId: string,
): Promise<boolean> {
  const existingLike = await client.query(
    "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
    [postId, userId],
  );
  return existingLike.rows.length > 0;
}
