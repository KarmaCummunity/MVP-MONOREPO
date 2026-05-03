import type { FilterAndGroup, FilterAtomicClause, FilterOrGroup, FilterQueryRoot, TaskFilterField } from './types';

function httpKeyForField(field: TaskFilterField): string {
  if (field === 'assigneeUserId') {
    return 'assignee';
  }
  if (field === 'searchText') {
    return 'q';
  }
  return field;
}

function appendAtomic(params: URLSearchParams, c: FilterAtomicClause): void {
  switch (c.kind) {
    case 'eq': {
      params.append(httpKeyForField(c.field), c.value);
      break;
    }
    case 'in': {
      const key = httpKeyForField(c.field);
      c.values.forEach((v) => params.append(key, v));
      break;
    }
    case 'gte':
      params.append(
        c.field === 'dueDate' ? 'due_after' : `${httpKeyForField(c.field)}_gte`,
        c.value,
      );
      break;
    case 'lte':
      params.append(
        c.field === 'dueDate' ? 'due_before' : `${httpKeyForField(c.field)}_lte`,
        c.value,
      );
      break;
    case 'contains':
      params.append('q', c.value);
      break;
    default: {
      const _e: never = c;
      void _e;
    }
  }
}

function appendGroup(params: URLSearchParams, g: FilterOrGroup | FilterAndGroup): void {
  if (g.op === 'or') {
    g.clauses.forEach((a) => appendAtomic(params, a));
    return;
  }
  g.clauses.forEach((a) => appendAtomic(params, a));
}

/**
 * Maps the logical tree to flat HTTP query keys (repeat keys = OR on server).
 * Convention: search uses `q`; assignee UUID uses `assignee`; due range uses `due_after` / `due_before`.
 */
export function filterQueryToHttpParams(root: FilterQueryRoot): URLSearchParams {
  const params = new URLSearchParams();
  for (const node of root.clauses) {
    if ('op' in node && (node.op === 'or' || node.op === 'and')) {
      appendGroup(params, node);
    } else {
      appendAtomic(params, node as FilterAtomicClause);
    }
  }
  return params;
}
