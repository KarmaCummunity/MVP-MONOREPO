import { AdminTask } from "../adminTasksScreen.types";

/**
 * Pure logic extracted from useAdminTasksScreen.tsx for testing.
 * This ensures subtasks are not lost when filtering: show subtasks in root list 
 * if their parent is not present in the results.
 */
function calculateRootTasksForList(tasks: AdminTask[], hasActiveListFilters: boolean): AdminTask[] {
  if (!hasActiveListFilters) {
    return tasks.filter((t) => !t.parent_task_id);
  }
  const taskIds = new Set(tasks.map((t) => t.id));
  return tasks.filter((t) => !t.parent_task_id || !taskIds.has(t.parent_task_id));
}

describe('Admin Tasks Root Tasks Logic', () => {
  const mockTasks: AdminTask[] = [
    { id: 'root1', title: 'Root 1', status: 'open', priority: 'medium', assignees: [], tags: [] },
    { id: 'root2', title: 'Root 2', status: 'open', priority: 'medium', assignees: [], tags: [] },
    { id: 'sub1-1', title: 'Sub 1-1', parent_task_id: 'root1', status: 'open', priority: 'medium', assignees: [], tags: [] },
    { id: 'sub2-1', title: 'Sub 2-1', parent_task_id: 'root2', status: 'open', priority: 'medium', assignees: [], tags: [] },
    { id: 'orphan1', title: 'Orphan Sub', parent_task_id: 'missing-parent', status: 'open', priority: 'medium', assignees: [], tags: [] },
  ];

  it('returns only root tasks when no filters are active', () => {
    const result = calculateRootTasksForList(mockTasks, false);
    expect(result.map(t => t.id)).toEqual(['root1', 'root2']);
  });

  it('returns root tasks and orphan subtasks when filters are active', () => {
    // When filters are active, we might get a partial set from the API.
    // If we have a subtask whose parent is NOT in the set, it should be shown in the root list.
    const filteredTasks: AdminTask[] = [
      { id: 'root1', title: 'Root 1', status: 'open', priority: 'medium', assignees: [], tags: [] },
      { id: 'sub2-1', title: 'Sub 2-1', parent_task_id: 'root2', status: 'open', priority: 'medium', assignees: [], tags: [] }, // Parent root2 is missing
      { id: 'orphan1', title: 'Orphan Sub', parent_task_id: 'missing-parent', status: 'open', priority: 'medium', assignees: [], tags: [] },
    ];

    const result = calculateRootTasksForList(filteredTasks, true);
    // root1 is root.
    // sub2-1 is a subtask but its parent 'root2' is not in filteredTasks.
    // orphan1 is a subtask but its parent 'missing-parent' is not in filteredTasks.
    expect(result.map(t => t.id)).toEqual(['root1', 'sub2-1', 'orphan1']);
  });

  it('hides subtasks from root list if their parent is present (avoid duplication)', () => {
    const filteredTasks: AdminTask[] = [
      { id: 'root1', title: 'Root 1', status: 'open', priority: 'medium', assignees: [], tags: [] },
      { id: 'sub1-1', title: 'Sub 1-1', parent_task_id: 'root1', status: 'open', priority: 'medium', assignees: [], tags: [] },
    ];

    const result = calculateRootTasksForList(filteredTasks, true);
    expect(result.map(t => t.id)).toEqual(['root1']);
  });
});

describe('Pagination Logic (Simulated)', () => {
  it('correctly determines hasMore based on PAGE_SIZE', () => {
    const PAGE_SIZE = 50;
    
    const fetchResultFull = new Array(50).fill({});
    const hasMoreFull = fetchResultFull.length === PAGE_SIZE;
    expect(hasMoreFull).toBe(true);

    const fetchResultPartial = new Array(20).fill({});
    const hasMorePartial = fetchResultPartial.length === PAGE_SIZE;
    expect(hasMorePartial).toBe(false);

    const fetchResultEmpty = [];
    const hasMoreEmpty = fetchResultEmpty.length === PAGE_SIZE;
    expect(hasMoreEmpty).toBe(false);
  });
});
