import type {
  QueryParamRaw,
  TaskPriority,
  TaskStatus,
  TasksListSort,
} from "./tasks.types";
import {
  SQL_PRIORITY_ORDER_ASC_T,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from "./tasks.types";

export function parseCategoryQueryParam(
  raw: QueryParamRaw,
): string[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  return (
    Array.isArray(raw)
      ? raw.flatMap((s) => String(s).split(","))
      : String(raw).split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseStatusQueryParam(
  raw: QueryParamRaw,
): TaskStatus[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parts = (
    Array.isArray(raw)
      ? raw.flatMap((s) => String(s).split(","))
      : String(raw).split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const allowed = new Set<string>(TASK_STATUS_VALUES);
  const parsed = parts.filter((p) => allowed.has(p)) as TaskStatus[];
  return parsed.length ? parsed : undefined;
}

export function parsePriorityQueryParam(
  raw: QueryParamRaw,
): TaskPriority[] | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parts = (
    Array.isArray(raw)
      ? raw.flatMap((s) => String(s).split(","))
      : String(raw).split(",")
  )
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const allowed = new Set<string>(TASK_PRIORITY_VALUES);
  const parsed = parts.filter((p) => allowed.has(p)) as TaskPriority[];
  return parsed.length ? parsed : undefined;
}

export function orderByClause(sort: TasksListSort | undefined): string {
  switch (sort) {
    case "created_asc":
      return "ORDER BY t.created_at ASC NULLS LAST, t.id ASC";
    case "priority_status":
      return `ORDER BY 
          ${SQL_PRIORITY_ORDER_ASC_T} ASC,
          CASE t.status 
            WHEN 'in_progress' THEN 0 
            WHEN 'stuck' THEN 1 
            WHEN 'open' THEN 2 
            WHEN 'testing' THEN 3 
            WHEN 'done' THEN 4 
            WHEN 'archived' THEN 5 
            ELSE 6 
          END ASC,


          t.created_at DESC`;

    case "due_asc":
      return "ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC, t.id ASC";
    case "due_desc":
      return "ORDER BY t.due_date DESC NULLS LAST, t.created_at DESC, t.id DESC";
    case "updated_desc":
      return "ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC, t.id DESC";
    case "created_desc":
    default:
      return "ORDER BY t.created_at DESC NULLS LAST, t.id DESC";
  }
}

export function pickFirstQueryValue(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  return Array.isArray(raw) ? raw[0] : raw;
}

export function parseListTasksPagination(
  limitParam?: string,
  offsetParam?: string,
): { limit: number; offset: number } {
  const limitNum = limitParam ? Number.parseInt(String(limitParam), 10) : 100;
  const offsetNum = offsetParam ? Number.parseInt(String(offsetParam), 10) : 0;
  const limit = Math.min(
    Math.max(Number.isNaN(limitNum) ? 100 : limitNum, 1),
    500,
  );
  const offset = Math.max(Number.isNaN(offsetNum) ? 0 : offsetNum, 0);
  return { limit, offset };
}

/** Log-friendly single-line SQL (`replaceAll` needs ES2021+ lib; see Sonar S7781). */
export function collapseSqlForLog(sql: string): string {
  return sql.replace(/\s+/g, " ").trim(); // NOSONAR S7781 — replaceAll requires ES2021+ lib
}
