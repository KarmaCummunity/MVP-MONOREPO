import { buildFilterQuery } from './buildFilterQuery';
import type { TaskFilterState } from './types';

type TaskStatus = 'open' | 'in_progress' | 'done' | 'archived' | 'stuck' | 'testing';
type TaskPriority = 'low' | 'medium' | 'high';

export type ApiListTasksFilters = Readonly<{
  q?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  category?: string | string[];
  assignee?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}>;

/**
 * Maps {@link TaskFilterState} to the object shape consumed by {@link apiService.getTasks}.
 * Same OR/AND semantics as {@link buildFilterQuery}; only one assignee id is sent (first selected).
 */
export function taskFilterStateToApiTaskFilters(
  state: TaskFilterState,
  options: Readonly<{
    currentUserId?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }> = {},
): ApiListTasksFilters {
  const root = buildFilterQuery(state, { currentUserId: options.currentUserId });
  const out: ApiListTasksFilters = {};
  if (options.sort !== undefined) {
    out.sort = options.sort;
  }
  if (options.limit !== undefined) {
    out.limit = options.limit;
  }
  if (options.offset !== undefined) {
    out.offset = options.offset;
  }

  const statuses: TaskStatus[] = [];
  const priorities: TaskPriority[] = [];
  const categories: string[] = [];
  let assignee: string | undefined;

  for (const node of root.clauses) {
    if ('op' in node && node.op === 'or') {
      for (const c of node.clauses) {
        if (c.kind === 'eq' && c.field === 'status') {
          statuses.push(c.value as TaskStatus);
        }
        if (c.kind === 'eq' && c.field === 'priority') {
          priorities.push(c.value as TaskPriority);
        }
        if (c.kind === 'eq' && c.field === 'category') {
          categories.push(c.value);
        }
        if (c.kind === 'eq' && c.field === 'assigneeUserId' && assignee === undefined) {
          assignee = c.value;
        }
      }
      continue;
    }

    const c = node as { kind: string; field?: string; value?: string };
    if (c.kind === 'eq' && c.field === 'status' && c.value) {
      statuses.push(c.value as TaskStatus);
    }
    if (c.kind === 'eq' && c.field === 'priority' && c.value) {
      priorities.push(c.value as TaskPriority);
    }
    if (c.kind === 'eq' && c.field === 'category' && c.value) {
      categories.push(c.value);
    }
    if (c.kind === 'eq' && c.field === 'assigneeUserId' && c.value) {
      assignee = c.value;
    }
    if (c.kind === 'contains' && c.field === 'searchText' && c.value) {
      out.q = c.value;
    }
  }

  if (statuses.length > 0) {
    out.status = statuses.length === 1 ? statuses[0] : [...new Set(statuses)];
  }
  if (priorities.length > 0) {
    out.priority = priorities.length === 1 ? priorities[0] : [...new Set(priorities)];
  }
  if (categories.length > 0) {
    out.category = categories.length === 1 ? categories[0] : [...new Set(categories)];
  }
  if (assignee !== undefined) {
    out.assignee = assignee;
  }

  return out;
}
