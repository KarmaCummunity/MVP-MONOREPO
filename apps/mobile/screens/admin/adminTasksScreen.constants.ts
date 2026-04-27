import type { TaskStatus, TasksListSort } from './adminTasksScreen.types';

export const TASK_LIST_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: 'פתוחה' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'stuck', label: 'תקוע' },
  { value: 'testing', label: 'בבדיקה' },
  { value: 'done', label: 'בוצעה' },
  { value: 'archived', label: 'בארכיון' },
];

export const TASK_LIST_CATEGORY_OPTIONS = [
  { value: 'פיתוח', label: 'פיתוח' },
  { value: 'שיווק', label: 'שיווק' },
  { value: 'שת״פ', label: 'שת״פ' },
  { value: 'ניהול', label: 'ניהול' },
  { value: 'עיצוב', label: 'עיצוב' },
  { value: 'אחר', label: 'אחר' },
];

export const TASK_LIST_SORT_OPTIONS: { value: TasksListSort; label: string }[] = [
  { value: 'created_desc', label: 'נוסף לאחרונה' },
  { value: 'created_asc', label: 'נוסף ראשון' },
  { value: 'priority_status', label: 'עדיפות וסטטוס' },
  { value: 'due_asc', label: 'תאריך יעד (מהקרוב)' },
  { value: 'due_desc', label: 'תאריך יעד (מהרחוק)' },
  { value: 'updated_desc', label: 'עודכן לאחרונה' },
];

/** When no explicit status chips are selected, completed tasks are hidden unless this key is on. */
export const FILTER_KEY_SHOW_COMPLETED = 'task_show_completed';

export const ADMIN_TASKS_FILTER_OPTIONS: string[] = [
  'task_assign_me',
  FILTER_KEY_SHOW_COMPLETED,
  ...TASK_LIST_STATUS_OPTIONS.map((o) => `task_status_${o.value}`),
  ...TASK_LIST_CATEGORY_OPTIONS.map((o) => `task_category_${o.value}`),
  'task_priority_high',
  'task_priority_medium',
  'task_priority_low',
];

export const ADMIN_TASKS_SORT_OPTIONS: string[] = TASK_LIST_SORT_OPTIONS.map((o) => o.value);

export const ADMIN_TASKS_FILTER_STORAGE_KEY = '@admin_tasks_filters_v1';

export const TASK_STATUSES_EXCLUDING_DONE: TaskStatus[] = TASK_LIST_STATUS_OPTIONS
  .map((o) => o.value)
  .filter((s) => s !== 'done');
