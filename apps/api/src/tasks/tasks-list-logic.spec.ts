import { TasksListQueryService } from "./tasks-list-query.service";
import { Pool } from "pg";
import { RedisCacheService } from "../redis/redis-cache.service";
import { UserResolutionService } from "../services/user-resolution.service";

describe("TasksListQueryService Logic", () => {
  let service: TasksListQueryService;
  let mockPool: Partial<Pool>;
  let mockRedis: Partial<RedisCacheService>;
  let mockUserRes: Partial<UserResolutionService>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], exists: true }),
    };
    mockRedis = {
      set: jest.fn(),
    };
    mockUserRes = {
      resolveUserId: jest.fn(),
    };
    service = new TasksListQueryService(
      mockPool as Pool,
      mockRedis as RedisCacheService,
      mockUserRes as UserResolutionService,
    );
  });

  it("applies parent_task_id IS NULL when no filters are present", async () => {
    // Mock the table exists check
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ exists: true }],
    });
    // Mock the main query
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
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

    const lastCall = (mockPool.query as jest.Mock).mock.calls.find(
      (call) => call[0].includes("SELECT") && call[0].includes("FROM tasks"),
    );
    expect(lastCall[0]).toContain("parent_task_id IS NULL");
  });

  it("does NOT apply parent_task_id IS NULL when search is present", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ exists: true }],
    });
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
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

    const lastCall = (mockPool.query as jest.Mock).mock.calls.find(
      (call) => call[0].includes("SELECT") && call[0].includes("FROM tasks"),
    );
    expect(lastCall[0]).not.toContain("parent_task_id IS NULL");
    expect(lastCall[0]).toContain("ILIKE");
  });

  it("does NOT apply parent_task_id IS NULL when priority filter is present", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ exists: true }],
    });
    (mockPool.query as jest.Mock).mockResolvedValueOnce({
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

    const lastCall = (mockPool.query as jest.Mock).mock.calls.find(
      (call) => call[0].includes("SELECT") && call[0].includes("FROM tasks"),
    );
    expect(lastCall[0]).not.toContain("parent_task_id IS NULL");
    expect(lastCall[0]).toContain("priority = $1");
  });
});
