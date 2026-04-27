import type { AdminCreateTaskFormFields, TaskPriority, TaskStatus } from './adminTasksScreen.types';
import { FILTER_KEY_SHOW_COMPLETED, TASK_LIST_STATUS_OPTIONS } from './adminTasksScreen.constants';

export function parseAdminTaskHeaderFilters(filterKeys: string[] | undefined): {
  assignee: 'all' | 'me';
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  categories: string[];
  includeDoneWhenNoStatusFilter: boolean;
} {
  const statuses: TaskStatus[] = [];
  const priorities: TaskPriority[] = [];
  const categories: string[] = [];
  let assignee: 'all' | 'me' = 'all';
  let includeDoneWhenNoStatusFilter = false;
  for (const key of filterKeys ?? []) {
    if (key === 'task_assign_me') {
      assignee = 'me';
    }
    if (key === FILTER_KEY_SHOW_COMPLETED) {
      includeDoneWhenNoStatusFilter = true;
    }
    if (key.startsWith('task_status_')) {
      const raw = key.slice('task_status_'.length) as TaskStatus;
      if (TASK_LIST_STATUS_OPTIONS.some((o) => o.value === raw)) {
        statuses.push(raw);
      }
    }
    if (key.startsWith('task_priority_')) {
      const raw = key.slice('task_priority_'.length) as TaskPriority;
      if (raw === 'high' || raw === 'medium' || raw === 'low') {
        priorities.push(raw);
      }
    }
    if (key.startsWith('task_category_')) {
      const raw = key.slice('task_category_'.length);
      categories.push(raw);
    }
  }
  // With any status chip, the API ignores "show completed"; keep state/storage consistent.
  if (statuses.length > 0) {
    includeDoneWhenNoStatusFilter = false;
  }
  return { assignee, statuses, priorities, categories, includeDoneWhenNoStatusFilter };
}

/** Drop redundant "show completed" when any status chip is selected (same as fetch semantics). */
export function sanitizeAdminTasksHeaderFilterKeys(filterKeys: string[]): string[] {
  const hasStatusChip = filterKeys.some((k) => k.startsWith('task_status_'));
  if (!hasStatusChip) {
    return [...filterKeys];
  }
  return filterKeys.filter((k) => k !== FILTER_KEY_SHOW_COMPLETED);
}

export function formatTaskListPriorityHebrew(priority: string): string {
  if (priority === 'high') return 'גבוהה';
  if (priority === 'medium') return 'בינונית';
  return 'נמוכה';
}

export function formatTaskListStatusHebrew(status: string): string {
  switch (status) {
    case 'open':
      return 'פתוחה';
    case 'in_progress':
      return 'בתהליך';
    case 'stuck':
      return 'תקוע';
    case 'testing':
      return 'בבדיקה';
    case 'done':
      return 'בוצעה';
    default:
      return 'בארכיון';
  }
}

export function taskHoursToNumber(hours: unknown): number {
  return Number.parseFloat(String(hours));
}

export function buildPersistedAdminTaskFilterKeys(
  assignee: 'all' | 'me',
  statuses: TaskStatus[],
  priorities: TaskPriority[],
  categories: string[],
  includeDoneWhenNoStatusFilter: boolean,
): string[] {
  const keys: string[] = [];
  if (assignee === 'me') {
    keys.push('task_assign_me');
  }
  const dedupStatuses = [...new Set(statuses)];
  if (includeDoneWhenNoStatusFilter && dedupStatuses.length === 0) {
    keys.push(FILTER_KEY_SHOW_COMPLETED);
  }
  for (const s of dedupStatuses) {
    keys.push(`task_status_${s}`);
  }
  const dedupPri = [...new Set(priorities)];
  for (const p of dedupPri) {
    keys.push(`task_priority_${p}`);
  }
  const dedupCat = [...new Set(categories)];
  for (const c of dedupCat) {
    keys.push(`task_category_${c}`);
  }
  return keys;
}

export function parseCreateTaskDueDate(
  dueDateTrimmed: string,
): { ok: true; iso: string | null } | { ok: false; message: string } {
  if (!dueDateTrimmed) {
    return { ok: true, iso: null };
  }
  const date = new Date(dueDateTrimmed);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: 'תאריך לא תקין - אנא השתמש בפורמט YYYY-MM-DD' };
  }
  return { ok: true, iso: date.toISOString() };
}

export function parseCreateTaskEstimatedHours(estimatedHoursField: string): number | null {
  if (!estimatedHoursField?.trim()) {
    return null;
  }
  const hours = Number.parseFloat(estimatedHoursField.trim());
  if (Number.isNaN(hours) || hours <= 0) {
    return null;
  }
  return hours;
}

export function buildCreateTaskRequestBody(
  form: AdminCreateTaskFormFields,
  createdBy: string,
  parsedDueDate: string | null,
  parsedEstimatedHours: number | null,
) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    status: form.status,
    category: form.category || null,
    due_date: parsedDueDate,
    assignees: form.assignees.map((u) => u.id),
    tags: form.tagsText.trim()
      ? form.tagsText.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
    created_by: createdBy,
    parent_task_id: form.parent_task_id || null,
    estimated_hours: parsedEstimatedHours,
  };
}

export function mapCreateTaskApiErrorMessage(error: string | undefined): string {
  if (error?.includes('הרשאה')) {
    return 'אין לך הרשאה להקצות משימה למשתמשים אלה. ניתן להקצות משימות רק לעובדים שלך.';
  }
  return error || 'שגיאה ביצירת משימה';
}
