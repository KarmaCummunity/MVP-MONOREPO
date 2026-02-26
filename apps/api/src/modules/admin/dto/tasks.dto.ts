export type TaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "archived"
  | "stuck"
  | "testing"
  | "reports";

export type TaskPriority = "low" | "medium" | "high";

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

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  due_date?: string | Date | null;
  assignees?: string[];
  assigneesEmails?: string[];
  tags?: string[];
  checklist?: unknown;
  estimated_hours?: number | null;
}

export interface LogTaskHoursDto {
  hours: number;
  user_id: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  due_date?: string;
  assignees?: string[];
  tags?: string[];
  checklist?: unknown;
  parent_task_id?: string;
  estimated_hours?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
