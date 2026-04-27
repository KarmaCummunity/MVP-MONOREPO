import type { PoolClient } from "pg";
import type { Logger } from "@nestjs/common";
import { scalarForLog } from "./posts-scalar-for-log.util";

type PostRow = Record<string, unknown>;

function fkForDelete(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/**
 * Delete a ride or item row by FK when present; otherwise delete the post row only.
 * Single implementation to satisfy duplication / stringification rules.
 */
export async function deleteLinkedEntityPost(
  client: PoolClient,
  post: PostRow,
  postId: string,
  kind: "ride" | "item",
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  const fkKey = kind === "ride" ? "ride_id" : "item_id";
  const fk = fkForDelete(post[fkKey]);

  if (!fk) {
    await client.query("DELETE FROM posts WHERE id = $1", [postId]);
    return { deletionStrategy: "post_only", relatedEntityDeleted: false };
  }

  const deleteSql =
    kind === "ride"
      ? "DELETE FROM rides WHERE id = $1"
      : "DELETE FROM items WHERE id = $1";
  await client.query(deleteSql, [fk]);

  const idLog = scalarForLog(post[fkKey]);
  logger.log(`✅ Deleted ${kind} ${idLog} (post auto-deleted via CASCADE)`);

  return {
    deletionStrategy: kind === "ride" ? "ride_cascade" : "item_cascade",
    relatedEntityDeleted: true,
  };
}

export async function deleteTaskPostOnly(
  client: PoolClient,
  post: PostRow,
  postId: string,
  logger: Logger,
): Promise<{ deletionStrategy: string; relatedEntityDeleted: boolean }> {
  await client.query("DELETE FROM posts WHERE id = $1", [postId]);
  logger.log(
    `✅ Deleted task post ${postId} (task ${scalarForLog(post.task_id)} preserved)`,
  );
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
      return deleteLinkedEntityPost(client, post, postId, "ride", logger);
    case "item":
    case "donation":
      return deleteLinkedEntityPost(client, post, postId, "item", logger);
    case "task_completion":
    case "task_assignment":
      return deleteTaskPostOnly(client, post, postId, logger);
    default:
      return deleteGeneralPost(client, postId, logger);
  }
}
