import type { TaskPriority, TaskStatus, TasksListSort } from './adminTasksScreen.types';

export const TASK_LIST_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: 'פתוחה' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'stuck', label: 'תקוע' },
  { value: 'testing', label: 'בבדיקה' },
  { value: 'done', label: 'בוצעה' },
  { value: 'archived', label: 'בארכיון' },
];

/** Status values for API / filters — keep in sync with {@link TASK_LIST_STATUS_OPTIONS}. */
export const TASK_LIST_STATUS_VALUES: TaskStatus[] = TASK_LIST_STATUS_OPTIONS.map((o) => o.value);

export const TASK_LIST_CATEGORY_OPTIONS = [
  { value: 'פיתוח', label: 'פיתוח' },
  { value: 'שיווק', label: 'שיווק' },
  { value: 'שת״פ', label: 'שת״פ' },
  { value: 'ניהול', label: 'ניהול' },
  { value: 'עיצוב', label: 'עיצוב' },
  { value: 'אחר', label: 'אחר' },
  { value: 'דיווח', label: 'דיווח' },
  { value: 'תרומת מידע', label: 'תרומת מידע' },
];

/** Category strings stored on tasks — keep in sync with {@link TASK_LIST_CATEGORY_OPTIONS}. */
export const TASK_LIST_CATEGORY_VALUES: string[] = TASK_LIST_CATEGORY_OPTIONS.map((o) => o.value);

/** Priority values for API, filters, and form — order is display order (least to most pressing). */
export const TASK_LIST_PRIORITY_VALUES: TaskPriority[] = [
  'none',
  'low',
  'medium',
  'high',
  'critical',
  'urgent',
];

export const TASK_LIST_SORT_OPTIONS: { value: TasksListSort; label: string }[] = [
  { value: 'created_desc', label: 'נוסף לאחרונה' },
  { value: 'created_asc', label: 'נוסף ראשון' },
  { value: 'priority_status', label: 'עדיפות וסטטוס' },
  { value: 'due_asc', label: 'תאריך יעד (מהקרוב)' },
  { value: 'due_desc', label: 'תאריך יעד (מהרחוק)' },
  { value: 'updated_desc', label: 'עודכן לאחרונה' },
];

export const ADMIN_TASKS_FILTER_OPTIONS: string[] = [
  'task_assign_me',
  ...TASK_LIST_STATUS_OPTIONS.map((o) => `task_status_${o.value}`),
  ...TASK_LIST_CATEGORY_OPTIONS.map((o) => `task_category_${o.value}`),
  ...TASK_LIST_PRIORITY_VALUES.map((p) => `task_priority_${p}`),
];


export const ADMIN_TASKS_SORT_OPTIONS: string[] = TASK_LIST_SORT_OPTIONS.map((o) => o.value);

export const ADMIN_TASKS_FILTER_STORAGE_KEY = '@admin_tasks_filters_v1';

/** Per-user key so web/mobile browsers do not reuse another session's filters from legacy storage. */
export function getAdminTasksFilterStorageKey(userId: string | undefined): string {
  return userId ? `${ADMIN_TASKS_FILTER_STORAGE_KEY}:${userId}` : ADMIN_TASKS_FILTER_STORAGE_KEY;
}

export const TASK_STATUSES_EXCLUDING_DONE: TaskStatus[] = TASK_LIST_STATUS_OPTIONS
  .map((o) => o.value)
  .filter((s) => s !== 'done');
