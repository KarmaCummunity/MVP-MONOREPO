import type { PoolClient } from "pg";
import {
  isPostRowAbsent,
  runPostDeletionSideEffects,
} from "./post-deletion-side-effects";

function createMockClient(
  handlers: Array<
    (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rowCount?: number; rows: unknown[] }>
  >,
): PoolClient {
  let step = 0;
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    const handler = handlers[step];
    if (!handler) {
      throw new Error(`No mock handler for query step ${step}: ${sql}`);
    }
    step += 1;
    return handler(sql, params);
  }) as unknown as PoolClient["query"];
  return { query } as PoolClient;
}

describe("runPostDeletionSideEffects", () => {
  it("deletes the post when ride_id is set but the ride row is already gone", async () => {
    const postId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const rideId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const client = createMockClient([
      async (sql, params) => {
        expect(sql).toContain("DELETE FROM rides");
        expect(params).toEqual([rideId]);
        return { rowCount: 0, rows: [] };
      },
      async (sql, params) => {
        expect(sql).toContain("DELETE FROM posts");
        expect(params).toEqual([postId]);
        return { rowCount: 1, rows: [] };
      },
    ]);

    const result = await runPostDeletionSideEffects(client, postId, {
      post_type: "ride",
      ride_id: rideId,
    });

    expect(result).toEqual({
      deletionStrategy: "post_only_stale_ride_ref",
      relatedEntityDeleted: false,
    });
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it("does not delete the post row when the ride delete succeeds (CASCADE removes post)", async () => {
    const postId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const rideId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const client = createMockClient([
      async (sql) => {
        expect(sql).toContain("DELETE FROM rides");
        return { rowCount: 1, rows: [] };
      },
    ]);

    const result = await runPostDeletionSideEffects(client, postId, {
      post_type: "ride",
      ride_id: rideId,
    });

    expect(result).toEqual({
      deletionStrategy: "ride_cascade",
      relatedEntityDeleted: true,
    });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it("deletes the post when item_id is set but the item row is already gone", async () => {
    const postId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const itemId = "item-ref-1";
    const client = createMockClient([
      async (sql, params) => {
        expect(sql).toContain("DELETE FROM items");
        expect(params).toEqual([itemId]);
        return { rowCount: 0, rows: [] };
      },
      async (sql, params) => {
        expect(sql).toContain("DELETE FROM posts");
        expect(params).toEqual([postId]);
        return { rowCount: 1, rows: [] };
      },
    ]);

    const result = await runPostDeletionSideEffects(client, postId, {
      post_type: "item",
      item_id: itemId,
    });

    expect(result.deletionStrategy).toBe("post_only_stale_item_ref");
    expect(result.relatedEntityDeleted).toBe(false);
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});

describe("isPostRowAbsent", () => {
  it("returns true when SELECT finds no rows", async () => {
    const client = createMockClient([async () => ({ rows: [] })]);
    await expect(isPostRowAbsent(client, "p1")).resolves.toBe(true);
  });

  it("returns false when a row still exists", async () => {
    const client = createMockClient([async () => ({ rows: [{ x: 1 }] })]);
    await expect(isPostRowAbsent(client, "p1")).resolves.toBe(false);
  });
});
