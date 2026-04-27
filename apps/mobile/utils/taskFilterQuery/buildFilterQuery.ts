import { DEFAULT_TASK_FILTER_CATEGORIES, taskFilterCategoryMap } from './catalog';
import type {
  BuildFilterQueryOptions,
  FilterAndGroup,
  FilterAtomicClause,
  FilterOrGroup,
  FilterQueryJson,
  FilterQueryRoot,
  TaskCategorySelection,
  TaskFilterCategoryMeta,
  TaskFilterDateRangeSelection,
  TaskFilterListSelection,
  TaskFilterState,
  TaskFilterTextSelection,
} from './types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isDateRangeSelection(
  meta: TaskFilterCategoryMeta,
  value: TaskCategorySelection,
): value is TaskFilterDateRangeSelection {
  return meta.filterType === 'range' && isPlainObject(value) && ('min' in value || 'max' in value);
}

function isTextSelection(
  meta: TaskFilterCategoryMeta,
  value: TaskCategorySelection,
): value is TaskFilterTextSelection {
  return meta.filterType === 'text' && isPlainObject(value) && typeof (value as TaskFilterTextSelection).text === 'string';
}

function isListSelection(value: TaskCategorySelection): value is TaskFilterListSelection {
  return Array.isArray(value);
}

function filterAllowed(meta: TaskFilterCategoryMeta, raw: readonly string[]): string[] {
  if (!meta.allowedValues?.length) {
    return raw.filter((s) => s.length > 0);
  }
  const allowed = new Set(meta.allowedValues);
  return raw.filter((s) => allowed.has(s));
}

function listToAtoms(
  meta: TaskFilterCategoryMeta,
  values: readonly string[],
  options: BuildFilterQueryOptions,
): FilterAtomicClause[] {
  const field = meta.field;
  const cleaned = filterAllowed(meta, [...values]);
  if (cleaned.length === 0) {
    return [];
  }

  if (meta.id === 'ownership') {
    const v = cleaned[0];
    if (v === 'all' || v === undefined) {
      return [];
    }
    if (v === 'mine') {
      const uid = options.currentUserId;
      if (!uid) {
        return [];
      }
      return [{ kind: 'eq', field: 'assigneeUserId', value: uid }];
    }
    if (v === 'unassigned') {
      return [{ kind: 'eq', field: 'ownership', value: 'unassigned' }];
    }
    return [];
  }

  if (meta.filterType === 'singleSelect') {
    const v = cleaned[0];
    return v ? [{ kind: 'eq', field, value: v }] : [];
  }

  if (cleaned.length === 1) {
    return [{ kind: 'eq', field, value: cleaned[0] }];
  }
  // Multi-select: alternatives are OR (each value is its own eq; caller wraps in OR group).
  return cleaned.map((value) => ({ kind: 'eq', field, value } as const));
}

function rangeToAtoms(meta: TaskFilterCategoryMeta, range: TaskFilterDateRangeSelection): FilterAtomicClause[] {
  const field = meta.field;
  const out: FilterAtomicClause[] = [];
  if (range.min !== undefined && range.min.length > 0) {
    out.push({ kind: 'gte', field, value: range.min });
  }
  if (range.max !== undefined && range.max.length > 0) {
    out.push({ kind: 'lte', field, value: range.max });
  }
  return out;
}

function textToAtoms(meta: TaskFilterCategoryMeta, sel: TaskFilterTextSelection): FilterAtomicClause[] {
  const t = sel.text.trim();
  if (!t) {
    return [];
  }
  return [{ kind: 'contains', field: meta.field, value: t }];
}

function categoryToGroup(
  meta: TaskFilterCategoryMeta,
  value: TaskCategorySelection,
  options: BuildFilterQueryOptions,
): FilterAtomicClause | FilterOrGroup | FilterAndGroup | null {
  if (meta.filterType === 'range') {
    if (!isDateRangeSelection(meta, value)) {
      return null;
    }
    const atoms = rangeToAtoms(meta, value);
    if (atoms.length === 0) {
      return null;
    }
    if (atoms.length === 1) {
      return atoms[0];
    }
    return { op: 'and', clauses: atoms };
  }

  if (meta.filterType === 'text') {
    if (!isTextSelection(meta, value)) {
      return null;
    }
    const atoms = textToAtoms(meta, value);
    return atoms[0] ?? null;
  }

  if (!isListSelection(value)) {
    return null;
  }

  if (meta.filterType === 'singleSelect' || meta.id === 'ownership') {
    const atoms = listToAtoms(meta, value, options);
    return atoms[0] ?? null;
  }

  const atoms = listToAtoms(meta, value, options);
  if (atoms.length === 0) {
    return null;
  }
  if (atoms.length === 1) {
    return atoms[0];
  }
  return { op: 'or', clauses: atoms };
}

/** Collapse nested AND from range into flat AND at root. */
function flattenRangeAnd(
  node: FilterAtomicClause | FilterOrGroup | FilterAndGroup,
): ReadonlyArray<FilterAtomicClause | FilterOrGroup | FilterAndGroup> {
  if (node && 'op' in node && node.op === 'and' && Array.isArray(node.clauses)) {
    return node.clauses as FilterAtomicClause[];
  }
  return [node];
}

/**
 * Builds a canonical query tree: each active category becomes one AND operand;
 * multiple values in the same list category become OR (never AND on the same field for alternatives).
 */
export function buildFilterQuery(
  state: TaskFilterState,
  options: BuildFilterQueryOptions = {},
): FilterQueryRoot {
  const categories = options.categories ?? DEFAULT_TASK_FILTER_CATEGORIES;
  const byId = taskFilterCategoryMap(categories);
  const clauses: Array<FilterAtomicClause | FilterOrGroup | FilterAndGroup> = [];

  for (const meta of categories) {
    const raw = state[meta.id];
    if (raw === undefined) {
      continue;
    }
    const group = categoryToGroup(meta, raw, options);
    if (group === null) {
      continue;
    }
    if (!byId.has(meta.id)) {
      continue;
    }
    clauses.push(...flattenRangeAnd(group));
  }

  return { op: 'and', clauses };
}

function atomicToJson(c: FilterAtomicClause): FilterQueryJson {
  switch (c.kind) {
    case 'eq':
      return { op: 'eq', field: c.field, value: c.value };
    case 'in':
      return { op: 'in', field: c.field, values: c.values };
    case 'gte':
      return { op: 'gte', field: c.field, value: c.value };
    case 'lte':
      return { op: 'lte', field: c.field, value: c.value };
    case 'contains':
      return { op: 'contains', field: c.field, value: c.value };
    default: {
      const _exhaustive: never = c;
      return _exhaustive;
    }
  }
}

/** JSON-friendly tree (e.g. POST body, Elasticsearch bool query generation). */
function groupToJson(c: FilterAtomicClause | FilterOrGroup | FilterAndGroup): FilterQueryJson {
  if ('op' in c && c.op === 'or') {
    return { op: 'or', clauses: c.clauses.map(atomicToJson) };
  }
  if ('op' in c && c.op === 'and' && c.clauses.length > 0 && c.clauses.every((x) => 'kind' in x)) {
    return { op: 'and', clauses: (c as FilterAndGroup).clauses.map(atomicToJson) };
  }
  return atomicToJson(c as FilterAtomicClause);
}

export function filterQueryToJson(root: FilterQueryRoot): FilterQueryJson {
  const parts: FilterQueryJson[] = [];
  for (const c of root.clauses) {
    parts.push(groupToJson(c));
  }
  if (parts.length === 0) {
    return { op: 'and', clauses: [] };
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return { op: 'and', clauses: parts };
}
