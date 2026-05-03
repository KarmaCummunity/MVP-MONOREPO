// Types and SQL fragments for tasks API (extracted from legacy controller; behavior unchanged).

/** Raw Nest query param value (single or repeated keys). */
export type QueryParamRaw = string | string[] | undefined;

export type TaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "archived"
  | "stuck"
  | "testing";

export type TaskPriority =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "urgent";

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string | Date;
  assignees?: string[];
  assigneesEmails?: string[];
  tags?: string[];
  checklist?: unknown;
  created_by?: string;
  parent_task_id?: string;
  estimated_hours?: number;
}

/** Value for PATCH `due_date` (clear with `null`, or set ISO / Date). */
export type TaskDueDatePatch = string | Date | null;

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: TaskDueDatePatch;
  assignees?: string[];
  assigneesEmails?: string[];
  tags?: string[];
  checklist?: unknown;
  estimated_hours?: number | null;
}

/** Normalized `due_date` bound into PATCH / INSERT clauses. */
export type ParsedDueDateSqlParam = string | Date | null;

/** Result of parsing `due_date` on task create. */
export type CreateTaskDueDateParseResult =
  | { success: false; error: string }
  | { parsed: ParsedDueDateSqlParam };

/** Result of parsing `estimated_hours` on task create. */
export type CreateTaskEstimatedHoursParseResult =
  | { success: false; error: string }
  | { parsed: number | null };

/** PATCH due_date parsing (invalid string vs OK). */
export type UpdateTaskDueDateParseResult =
  | { success: false; error: string }
  | { parsed: ParsedDueDateSqlParam };

export interface LogTaskHoursDto {
  hours: number;
  user_id: string;
}

export const TASK_STATUS_VALUES: TaskStatus[] = [
  "open",
  "in_progress",
  "done",
  "archived",
  "stuck",
  "testing",
];

export type TasksListSort =
  | "created_desc"
  | "created_asc"
  | "priority_status"
  | "due_asc"
  | "due_desc"
  | "updated_desc";

export const TASK_PRIORITY_VALUES: TaskPriority[] = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
];

/** Ascending sort key: lower = more urgent (listed first). */
export const SQL_PRIORITY_ORDER_ASC = `CASE priority WHEN 'urgent' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 WHEN 'none' THEN 5 ELSE 6 END`;

export const SQL_PRIORITY_ORDER_ASC_T = `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 WHEN 'none' THEN 5 ELSE 6 END`;
