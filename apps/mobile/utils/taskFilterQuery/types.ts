/**
 * Task filter query engine — shared types.
 * Categories combine with AND across keys; multiple values in one category use OR.
 */

export type FilterCategoryKind = 'multiSelect' | 'singleSelect' | 'range' | 'text';

/** Logical field name used when translating to SQL / Prisma / ES. */
export type TaskFilterField =
  | 'status'
  | 'priority'
  | 'ownership'
  | 'assigneeUserId'
  | 'dueDate'
  | 'category'
  | 'searchText';

export type TaskFilterCategoryId =
  | 'status'
  | 'priority'
  | 'ownership'
  | 'assignee'
  | 'dueDate'
  | 'category'
  | 'textSearch';

/** Selection for list-based categories (OR within the category). */
export type TaskFilterListSelection = readonly string[];

/** Inclusive due-date bounds (typically ISO date strings). */
export type TaskFilterDateRangeSelection = Readonly<{
  min?: string;
  max?: string;
}>;

export type TaskFilterTextSelection = Readonly<{
  text: string;
}>;

/**
 * Per-category value shape depends on {@link TaskFilterCategoryMeta.filterType}.
 * List types use string[]; range uses bounds object; text uses { text }.
 */
export type TaskCategorySelection =
  | TaskFilterListSelection
  | TaskFilterDateRangeSelection
  | TaskFilterTextSelection;

export type TaskFilterState = Partial<Readonly<Record<TaskFilterCategoryId, TaskCategorySelection>>>;

export type TaskFilterCategoryMeta = Readonly<{
  id: TaskFilterCategoryId;
  filterType: FilterCategoryKind;
  /** Target field for query translators. */
  field: TaskFilterField;
  /** Optional: restrict allowed list values (omit to allow any non-empty string). */
  allowedValues?: readonly string[];
}>;

/** One atomic predicate after normalization. */
export type FilterAtomicClause = Readonly<
  | { kind: 'eq'; field: TaskFilterField; value: string }
  | { kind: 'in'; field: TaskFilterField; values: readonly string[] }
  | { kind: 'gte'; field: TaskFilterField; value: string }
  | { kind: 'lte'; field: TaskFilterField; value: string }
  | { kind: 'contains'; field: TaskFilterField; value: string }
>;

/** OR of atomics for one category (alternatives). */
export type FilterOrGroup = Readonly<{
  op: 'or';
  clauses: readonly FilterAtomicClause[];
}>;

/** AND of atomics within one category (e.g. due date min and max together). */
export type FilterAndGroup = Readonly<{
  op: 'and';
  clauses: readonly FilterAtomicClause[];
}>;

/** Top-level: AND of per-category groups. */
export type FilterQueryRoot = Readonly<{
  op: 'and';
  clauses: ReadonlyArray<FilterAtomicClause | FilterOrGroup | FilterAndGroup>;
}>;

/** Serializable AST for clients, URL state, or backend bridges. */
export type FilterQueryJson =
  | { op: 'and'; clauses: readonly FilterQueryJson[] }
  | { op: 'or'; clauses: readonly FilterQueryJson[] }
  | { op: 'eq'; field: TaskFilterField; value: string }
  | { op: 'in'; field: TaskFilterField; values: readonly string[] }
  | { op: 'gte'; field: TaskFilterField; value: string }
  | { op: 'lte'; field: TaskFilterField; value: string }
  | { op: 'contains'; field: TaskFilterField; value: string };

export type BuildFilterQueryOptions = Readonly<{
  /** Current user id for resolving ownership = mine. */
  currentUserId?: string;
  /** Override default category definitions. */
  categories?: readonly TaskFilterCategoryMeta[];
}>;
