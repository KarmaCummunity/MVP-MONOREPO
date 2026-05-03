import type {
  CreateTaskDueDateParseResult,
  CreateTaskEstimatedHoursParseResult,
  ParsedDueDateSqlParam,
  TaskPriority,
  TaskStatus,
  UpdateTaskDueDateParseResult,
  UpdateTaskDto,
} from "./tasks.types";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "./tasks.types";

export function validateCreateTaskTitleAndEnums(
  title: unknown,
  status: unknown,
  priority: unknown,
): { success: false; error: string } | null {
  if (!title || typeof title !== "string" || !title.trim()) {
    return {
      success: false,
      error: "title is required and cannot be empty",
    };
  }
  if (status && !TASK_STATUS_VALUES.includes(status as TaskStatus)) {
    return { success: false, error: "Invalid status value" };
  }
  if (priority && !TASK_PRIORITY_VALUES.includes(priority as TaskPriority)) {
    return { success: false, error: "Invalid priority value" };
  }
  return null;
}

export function parseCreateTaskDueDate(
  due_date: string | Date | null | undefined,
): CreateTaskDueDateParseResult {
  if (due_date === null || due_date === undefined) {
    return { parsed: null };
  }
  if (typeof due_date === "string") {
    const date = new Date(due_date);
    if (Number.isNaN(date.getTime())) {
      return { success: false, error: "Invalid due_date format" };
    }
    return { parsed: date.toISOString() };
  }
  return { parsed: due_date };
}

export function parseCreateTaskEstimatedHours(
  estimated_hours: number | null | undefined,
): CreateTaskEstimatedHoursParseResult {
  if (estimated_hours === null || estimated_hours === undefined) {
    return { parsed: null };
  }
  const hours = Number.parseFloat(String(estimated_hours));
  if (Number.isNaN(hours) || hours < 0) {
    return {
      success: false,
      error: "estimated_hours must be a non-negative number",
    };
  }
  return { parsed: hours };
}

export function parseUpdateTaskDueDateFromBody(
  body: UpdateTaskDto,
): UpdateTaskDueDateParseResult {
  let parsedDueDate: ParsedDueDateSqlParam = null;
  if (body.due_date !== undefined && body.due_date !== null) {
    if (typeof body.due_date === "string") {
      const date = new Date(body.due_date);
      if (Number.isNaN(date.getTime())) {
        return { success: false, error: "Invalid due_date format" };
      }
      parsedDueDate = date.toISOString();
    } else {
      parsedDueDate = body.due_date;
    }
  }
  return { parsed: parsedDueDate };
}
