import type { PoolClient } from "pg";
import type { Logger } from "@nestjs/common";

type PostRow = Record<string, unknown>;

export async function deleteRideLinkedPost(
  client: PoolClient,
  post: PostRow,
  postId: string,
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  if (post.ride_id) {
    await client.query("DELETE FROM rides WHERE id = $1", [post.ride_id]);
    logger.log(
      `✅ Deleted ride ${post.ride_id} (post auto-deleted via CASCADE)`,
    );
    return { deletionStrategy: "ride_cascade", relatedEntityDeleted: true };
  }
  await client.query("DELETE FROM posts WHERE id = $1", [postId]);
  return { deletionStrategy: "post_only", relatedEntityDeleted: false };
}

export async function deleteItemLinkedPost(
  client: PoolClient,
  post: PostRow,
  postId: string,
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  if (post.item_id) {
    await client.query("DELETE FROM items WHERE id = $1", [post.item_id]);
    logger.log(
      `✅ Deleted item ${post.item_id} (post auto-deleted via CASCADE)`,
    );
    return { deletionStrategy: "item_cascade", relatedEntityDeleted: true };
  }
  await client.query("DELETE FROM posts WHERE id = $1", [postId]);
  return { deletionStrategy: "post_only", relatedEntityDeleted: false };
}

export async function deleteTaskPostOnly(
  client: PoolClient,
  post: PostRow,
  postId: string,
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  await client.query("DELETE FROM posts WHERE id = $1", [postId]);
  logger.log(`✅ Deleted task post ${postId} (task ${post.task_id} preserved)`);
  return { deletionStrategy: "post_only", relatedEntityDeleted: false };
}

export async function deleteGeneralPost(
  client: PoolClient,
  postId: string,
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  await client.query("DELETE FROM posts WHERE id = $1", [postId]);
  logger.log(`✅ Deleted general post ${postId}`);
  return { deletionStrategy: "post_only", relatedEntityDeleted: false };
}

export async function runPostDeletionByType(
  client: PoolClient,
  post: PostRow,
  postId: string,
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  const postType = post.post_type as string;
  switch (postType) {
    case "ride":
      return deleteRideLinkedPost(client, post, postId, logger);
    case "item":
    case "donation":
      return deleteItemLinkedPost(client, post, postId, logger);
    case "task_completion":
    case "task_assignment":
      return deleteTaskPostOnly(client, post, postId, logger);
    default:
      return deleteGeneralPost(client, postId, logger);
  }
}
