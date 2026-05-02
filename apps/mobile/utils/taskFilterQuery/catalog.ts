import type { TaskFilterCategoryMeta } from './types';
import {
  TASK_LIST_CATEGORY_VALUES,
  TASK_LIST_STATUS_VALUES,
} from '../../screens/admin/adminTasksScreen.constants';

/**
 * Default registry: add entries here or pass a custom list to {@link buildFilterQuery}.
 */
export const DEFAULT_TASK_FILTER_CATEGORIES: readonly TaskFilterCategoryMeta[] = [
  {
    id: 'status',
    filterType: 'multiSelect',
    field: 'status',
    allowedValues: [...TASK_LIST_STATUS_VALUES],
  },
  {
    id: 'priority',
    filterType: 'multiSelect',
    field: 'priority',
    allowedValues: ['low', 'medium', 'high'],
  },
  {
    id: 'ownership',
    filterType: 'singleSelect',
    field: 'ownership',
    allowedValues: ['mine', 'all', 'unassigned'],
  },
  {
    id: 'assignee',
    filterType: 'multiSelect',
    field: 'assigneeUserId',
  },
  {
    id: 'dueDate',
    filterType: 'range',
    field: 'dueDate',
  },
  {
    id: 'category',
    filterType: 'multiSelect',
    field: 'category',
    allowedValues: [...TASK_LIST_CATEGORY_VALUES],
  },
  {
    id: 'textSearch',
    filterType: 'text',
    field: 'searchText',
  },
] as const;

export function taskFilterCategoryMap(
  categories: readonly TaskFilterCategoryMeta[] = DEFAULT_TASK_FILTER_CATEGORIES,
): ReadonlyMap<string, TaskFilterCategoryMeta> {
  return new Map(categories.map((c) => [c.id, c]));
}
