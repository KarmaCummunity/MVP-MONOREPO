import type { PoolClient, QueryResult } from "pg";

/** Minimal post row shape needed to run deletion side effects. */
export type PostRowForDeletion = {
  post_type: string;
  ride_id?: string | null;
  item_id?: string | null;
  task_id?: string | null;
};

export type PostDeletionSideEffectResult = {
  deletionStrategy: string;
  relatedEntityDeleted: boolean;
};

/**
 * Deletes the post and/or related ride/item according to post_type.
 * If the related ride/item row is already gone, deletes the post explicitly so
 * we never return success while the post row still exists.
 */
export async function runPostDeletionSideEffects(
  client: PoolClient,
  postId: string,
  post: PostRowForDeletion,
): Promise<PostDeletionSideEffectResult> {
  switch (post.post_type) {
    case "ride": {
      if (post.ride_id) {
        const delRide: QueryResult = await client.query(
          "DELETE FROM rides WHERE id = $1",
          [post.ride_id],
        );
        if ((delRide.rowCount ?? 0) > 0) {
          return {
            deletionStrategy: "ride_cascade",
            relatedEntityDeleted: true,
          };
        }
        await client.query("DELETE FROM posts WHERE id = $1", [postId]);
        return {
          deletionStrategy: "post_only_stale_ride_ref",
          relatedEntityDeleted: false,
        };
      }
      await client.query("DELETE FROM posts WHERE id = $1", [postId]);
      return { deletionStrategy: "post_only", relatedEntityDeleted: false };
    }
    case "item":
    case "donation": {
      if (post.item_id) {
        const delItem: QueryResult = await client.query(
          "DELETE FROM items WHERE id = $1",
          [post.item_id],
        );
        if ((delItem.rowCount ?? 0) > 0) {
          return {
            deletionStrategy: "item_cascade",
            relatedEntityDeleted: true,
          };
        }
        await client.query("DELETE FROM posts WHERE id = $1", [postId]);
        return {
          deletionStrategy: "post_only_stale_item_ref",
          relatedEntityDeleted: false,
        };
      }
      await client.query("DELETE FROM posts WHERE id = $1", [postId]);
      return { deletionStrategy: "post_only", relatedEntityDeleted: false };
    }
    case "task_completion":
    case "task_assignment": {
      await client.query("DELETE FROM posts WHERE id = $1", [postId]);
      return { deletionStrategy: "post_only", relatedEntityDeleted: false };
    }
    default: {
      await client.query("DELETE FROM posts WHERE id = $1", [postId]);
      return { deletionStrategy: "post_only", relatedEntityDeleted: false };
    }
  }
}

/** Returns true if no post row exists for the given id (delete succeeded or concurrent delete). */
export async function isPostRowAbsent(
  client: PoolClient,
  postId: string,
): Promise<boolean> {
  const res = await client.query(
    "SELECT 1 AS x FROM posts WHERE id = $1 LIMIT 1",
    [postId],
  );
  return res.rows.length === 0;
}
