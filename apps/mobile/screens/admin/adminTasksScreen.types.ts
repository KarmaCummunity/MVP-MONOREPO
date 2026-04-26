export type TaskStatus = 'open' | 'in_progress' | 'done' | 'archived' | 'stuck' | 'testing';
export type TaskPriority = 'low' | 'medium' | 'high';

export type TasksListSort =
  | 'created_desc'
  | 'created_asc'
  | 'priority_status'
  | 'due_asc'
  | 'due_desc'
  | 'updated_desc';

export type PersistedAdminTasksHeader = Readonly<{
  query: string;
  filterKeys: string[];
  sortKey: TasksListSort;
}>;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export type AdminTask = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  due_date?: string | null;
  assignees: string[];
  assignees_details?: User[];
  creator_details?: User;
  tags: string[];
  checklist?: { id: string; text: string; done: boolean }[];
  created_by?: string | null;
  parent_task_id?: string | null;
  parent_task_details?: { id: string; title: string } | null;
  subtask_count?: number;
  level?: number;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminCreateTaskFormFields = {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  due_date: string;
  assignees: User[];
  tagsText: string;
  parent_task_id: string;
  estimated_hours: string;
};

export type AdminTaskListRowProps = {
  item: AdminTask;
  isSubtask?: boolean;
  level?: number;
  expandedTasks: Set<string>;
  subtasks: Record<string, AdminTask[]>;
  loadingSubtasks: string | null;
  updating: string | null;
  deleting: string | null;
  viewOnly: boolean;
  onToggleDone: (t: AdminTask) => void;
  onOpenEdit: (t: AdminTask) => void;
  onCreateSubtask: (t: AdminTask) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtasks: (id: string) => void;
};
