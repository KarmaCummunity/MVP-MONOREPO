import type { AdminCreateTaskFormFields, AdminTask, TaskPriority, TaskStatus } from './adminTasksScreen.types';

/** True when list query is narrowed by search text or header filters (not default "all tasks" view). */
export function hasActiveAdminTaskListFilters(
  query: string,
  filterAssignee: 'all' | 'me',
  filterStatuses: TaskStatus[],
  filterPriorities: TaskPriority[],
  filterCategories: string[],
): boolean {
  return (
    query.trim().length > 0
    || filterAssignee === 'me'
    || filterStatuses.length > 0
    || filterPriorities.length > 0
    || filterCategories.length > 0
  );
}
import { TASK_LIST_CATEGORY_OPTIONS, TASK_LIST_STATUS_OPTIONS } from './adminTasksScreen.constants';

const CANONICAL_CATEGORY_VALUES = new Set(TASK_LIST_CATEGORY_OPTIONS.map((o) => o.value));

/** Legacy English/slug categories from older clients → Hebrew values used in admin form & list. */
const LEGACY_CATEGORY_TO_CANONICAL: Record<string, string> = {
  knowledge_offer: 'תרומת מידע',
  report: 'דיווח',
  moderation: 'דיווח',
};

/** Single label for category badge and form — matches {@link TASK_LIST_CATEGORY_OPTIONS} where possible. */
export function canonicalTaskCategory(category: string | null | undefined): string {
  const c = category?.trim() || '';
  if (!c) return '';
  if (CANONICAL_CATEGORY_VALUES.has(c)) return c;
  return LEGACY_CATEGORY_TO_CANONICAL[c] ?? c;
}

/** Normalize API payloads: legacy `reports` status and slug categories. */
export function normalizeAdminTaskFromApi(task: AdminTask): AdminTask {
  const rawStatus = String(task.status);
  let nextStatus: TaskStatus;
  let category = task.category ?? undefined;

  if (rawStatus === 'reports') {
    nextStatus = 'open';
    const cat = String(category ?? '').trim();
    if (!cat || cat === 'report' || cat === 'moderation') {
      category = 'דיווח';
    }
  } else if (TASK_LIST_STATUS_OPTIONS.some((o) => o.value === rawStatus)) {
    nextStatus = rawStatus as TaskStatus;
  } else {
    nextStatus = 'open';
  }

  const canonCat = canonicalTaskCategory(category);
  return { ...task, status: nextStatus, category: canonCat || null };
}

export function parseAdminTaskHeaderFilters(filterKeys: string[] | undefined): {
  assignee: 'all' | 'me';
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  categories: string[];
} {
  const statuses: TaskStatus[] = [];
  const priorities: TaskPriority[] = [];
  const categories: string[] = [];
  let assignee: 'all' | 'me' = 'all';
  for (const key of filterKeys ?? []) {
    if (key === 'task_assign_me') {
      assignee = 'me';
    }
    if (key.startsWith('task_status_')) {
      const raw = key.slice('task_status_'.length);
      if (raw === 'reports') {
        categories.push('דיווח');
      } else {
        const statusRaw = raw as TaskStatus;
        if (TASK_LIST_STATUS_OPTIONS.some((o) => o.value === statusRaw)) {
          statuses.push(statusRaw);
        }
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
  return { assignee, statuses, priorities, categories };
}

/** No longer needed as "show completed" is removed. */
export function sanitizeAdminTasksHeaderFilterKeys(filterKeys: string[]): string[] {
  return [...filterKeys];
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
    case 'archived':
      return 'בארכיון';
    default:
      return status || 'לא ידוע';
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
): string[] {
  const keys: string[] = [];
  if (assignee === 'me') {
    keys.push('task_assign_me');
  }
  const dedupStatuses = [...new Set(statuses)];
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
