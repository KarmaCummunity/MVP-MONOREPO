import { TasksListQueryService } from "./tasks-list-query.service";
import type { Pool } from "pg";
import { RedisCacheService } from "../redis/redis-cache.service";
import { UserResolutionService } from "../services/user-resolution.service";

describe("TasksListQueryService Logic", () => {
  let service: TasksListQueryService;
  let mockPool: Pool;
  let mockRedis: Partial<RedisCacheService>;
  let mockUserRes: Partial<UserResolutionService>;
  let mockQuery: jest.MockedFunction<
    (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>
  >;

  beforeEach(() => {
    mockQuery = jest.fn().mockResolvedValue({ rows: [], exists: true });
    mockPool = {
      query: mockQuery as unknown as Pool["query"],
    } as Pool;
    mockRedis = {
      set: jest.fn(),
    };
    mockUserRes = {
      resolveUserId: jest.fn(),
    };
    service = new TasksListQueryService(
      mockPool,
      mockRedis as RedisCacheService,
      mockUserRes as UserResolutionService,
    );
  });

  it("applies parent_task_id IS NULL when no filters are present", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ exists: true }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    await service.loadTasksListRowsFromDatabase({
      cacheKey: "test",
      sort: "created_desc",
      limit: 50,
      offset: 0,
      statusList: [],
      priorityList: [],
      categoryList: [],
      assignee: undefined,
      searchQuery: undefined,
    });

    const lastCall = mockQuery.mock.calls.find(
      (call): call is [string, unknown[]] =>
        typeof call[0] === "string" &&
        call[0].includes("SELECT") &&
        call[0].includes("FROM tasks"),
    );
    if (!lastCall) {
      throw new Error("Expected a SELECT FROM tasks query call");
    }
    expect(lastCall[0]).toContain("parent_task_id IS NULL");
  });

  it("does NOT apply parent_task_id IS NULL when search is present", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ exists: true }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    await service.loadTasksListRowsFromDatabase({
      cacheKey: "test",
      sort: "created_desc",
      limit: 50,
      offset: 0,
      statusList: [],
      priorityList: [],
      categoryList: [],
      assignee: undefined,
      searchQuery: "find me",
    });

    const lastCall = mockQuery.mock.calls.find(
      (call): call is [string, unknown[]] =>
        typeof call[0] === "string" &&
        call[0].includes("SELECT") &&
        call[0].includes("FROM tasks"),
    );
    if (!lastCall) {
      throw new Error("Expected a SELECT FROM tasks query call");
    }
    expect(lastCall[0]).not.toContain("parent_task_id IS NULL");
    expect(lastCall[0]).toContain("ILIKE");
  });

  it("does NOT apply parent_task_id IS NULL when priority filter is present", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ exists: true }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    await service.loadTasksListRowsFromDatabase({
      cacheKey: "test",
      sort: "created_desc",
      limit: 50,
      offset: 0,
      statusList: [],
      priorityList: ["high"],
      categoryList: [],
      assignee: undefined,
      searchQuery: undefined,
    });

    const lastCall = mockQuery.mock.calls.find(
      (call): call is [string, unknown[]] =>
        typeof call[0] === "string" &&
        call[0].includes("SELECT") &&
        call[0].includes("FROM tasks"),
    );
    if (!lastCall) {
      throw new Error("Expected a SELECT FROM tasks query call");
    }
    expect(lastCall[0]).not.toContain("parent_task_id IS NULL");
    expect(lastCall[0]).toContain("priority = $1");
  });
});
