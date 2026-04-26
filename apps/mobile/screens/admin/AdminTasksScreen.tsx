import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, Image, SafeAreaView, Platform, StatusBar, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import colors from '../../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../../globals/constants';
import { rowDirection } from '../../globals/responsive';
import { Ionicons } from '@expo/vector-icons';
import apiService, { ApiResponse } from '../../utils/apiService';
import { useUser } from '../../stores/userStore';
import { useAdminProtection } from '../../hooks/useAdminProtection';
import UserSelector from '../../components/UserSelector';
import TaskHoursModal from '../../components/TaskHoursModal';
import HeaderComp from '../../components/HeaderComp';
import { taskFilterStateToApiTaskFilters, type TaskFilterState } from '../../utils/taskFilterQuery';

type TaskStatus = 'open' | 'in_progress' | 'done' | 'archived' | 'stuck' | 'testing';
type TaskPriority = 'low' | 'medium' | 'high';

type TasksListSort =
  | 'created_desc'
  | 'created_asc'
  | 'priority_status'
  | 'due_asc'
  | 'due_desc'
  | 'updated_desc';

const TASK_LIST_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: 'פתוחה' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'stuck', label: 'תקוע' },
  { value: 'testing', label: 'בבדיקה' },
  { value: 'done', label: 'בוצעה' },
  { value: 'archived', label: 'בארכיון' },
];

const TASK_LIST_SORT_OPTIONS: { value: TasksListSort; label: string }[] = [
  { value: 'created_desc', label: 'נוסף לאחרונה' },
  { value: 'created_asc', label: 'נוסף ראשון' },
  { value: 'priority_status', label: 'עדיפות וסטטוס' },
  { value: 'due_asc', label: 'תאריך יעד (מהקרוב)' },
  { value: 'due_desc', label: 'תאריך יעד (מהרחוק)' },
  { value: 'updated_desc', label: 'עודכן לאחרונה' },
];

/** When no explicit status chips are selected, completed tasks are hidden unless this key is on. */
const FILTER_KEY_SHOW_COMPLETED = 'task_show_completed';

const ADMIN_TASKS_FILTER_OPTIONS: string[] = [
  'task_assign_me',
  FILTER_KEY_SHOW_COMPLETED,
  ...TASK_LIST_STATUS_OPTIONS.map((o) => `task_status_${o.value}`),
  'task_priority_high',
  'task_priority_medium',
  'task_priority_low',
];

const ADMIN_TASKS_SORT_OPTIONS: string[] = TASK_LIST_SORT_OPTIONS.map((o) => o.value);

const ADMIN_TASKS_FILTER_STORAGE_KEY = '@admin_tasks_filters_v1';

const TASK_STATUSES_EXCLUDING_DONE: TaskStatus[] = TASK_LIST_STATUS_OPTIONS
  .map((o) => o.value)
  .filter((s) => s !== 'done');

function parseAdminTaskHeaderFilters(filterKeys: string[] | undefined): {
  assignee: 'all' | 'me';
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  includeDoneWhenNoStatusFilter: boolean;
} {
  const statuses: TaskStatus[] = [];
  const priorities: TaskPriority[] = [];
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
  }
  return { assignee, statuses, priorities, includeDoneWhenNoStatusFilter };
}

function formatTaskListPriorityHebrew(priority: string): string {
  if (priority === 'high') return 'גבוהה';
  if (priority === 'medium') return 'בינונית';
  return 'נמוכה';
}

function formatTaskListStatusHebrew(status: string): string {
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

function taskHoursToNumber(hours: unknown): number {
  return Number.parseFloat(String(hours));
}

function buildPersistedAdminTaskFilterKeys(
  assignee: 'all' | 'me',
  statuses: TaskStatus[],
  priorities: TaskPriority[],
  includeDoneWhenNoStatusFilter: boolean,
): string[] {
  const keys: string[] = [];
  if (assignee === 'me') {
    keys.push('task_assign_me');
  }
  if (includeDoneWhenNoStatusFilter) {
    keys.push(FILTER_KEY_SHOW_COMPLETED);
  }
  const dedupStatuses = [...new Set(statuses)];
  for (const s of dedupStatuses) {
    keys.push(`task_status_${s}`);
  }
  const dedupPri = [...new Set(priorities)];
  for (const p of dedupPri) {
    keys.push(`task_priority_${p}`);
  }
  return keys;
}

type PersistedAdminTasksHeader = Readonly<{
  query: string;
  filterKeys: string[];
  sortKey: TasksListSort;
}>;

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

type AdminTask = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  due_date?: string | null;
  assignees: string[]; // UUIDs
  assignees_details?: User[]; // Full objects
  creator_details?: User;
  tags: string[];
  checklist?: { id: string; text: string; done: boolean }[];
  created_by?: string | null;
  parent_task_id?: string | null;
  parent_task_details?: { id: string; title: string } | null;
  subtask_count?: number;
  level?: number; // Depth level (0 = root, 1 = subtask, 2 = sub-subtask, etc.)
  estimated_hours?: number | null;
  actual_hours?: number | null;
  created_at?: string;
  updated_at?: string;
};

type AdminCreateTaskFormFields = {
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

function parseCreateTaskDueDate(
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

function parseCreateTaskEstimatedHours(estimatedHoursField: string): number | null {
  if (!estimatedHoursField?.trim()) {
    return null;
  }
  const hours = Number.parseFloat(estimatedHoursField.trim());
  if (Number.isNaN(hours) || hours <= 0) {
    return null;
  }
  return hours;
}

function buildCreateTaskRequestBody(
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

function mapCreateTaskApiErrorMessage(error: string | undefined): string {
  if (error?.includes('הרשאה')) {
    return 'אין לך הרשאה להקצות משימה למשתמשים אלה. ניתן להקצות משימות רק לעובדים שלך.';
  }
  return error || 'שגיאה ביצירת משימה';
}

type AdminTaskListRowProps = {
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

function TaskItemAssigneesBlock({ item }: { item: AdminTask }) {
  if (item.assignees_details && item.assignees_details.length > 0) {
    return (
      <View style={styles.assigneesContent}>
        <Text style={styles.assigneeText} numberOfLines={1}>
          משוייך ל: {item.assignees_details.map((u) => u.name).join(', ')}
        </Text>
        <View style={styles.avatarsRow}>
          {item.assignees_details.slice(0, 3).map((u, i) => (
            <Image
              key={u.id}
              source={{ uri: u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}` }}
              style={[styles.avatarSmall, { marginStart: i > 0 ? -10 : 0, zIndex: 3 - i }]}
            />
          ))}
          {item.assignees_details.length > 3 && (
            <View style={[styles.avatarSmall, styles.moreAvatar]}>
              <Text style={styles.moreAvatarText}>+{item.assignees_details.length - 3}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }
  return <Text style={styles.unassignedText}>⚠️ המשימה לא שוייכה לאף אחד</Text>;
}

function TaskItemHoursBlock({ item }: { item: AdminTask }) {
  const showEstimated = item.estimated_hours && taskHoursToNumber(item.estimated_hours) > 0;
  const showActual = item.actual_hours && taskHoursToNumber(item.actual_hours) > 0;
  if (!showEstimated && !showActual) {
    return null;
  }
  return (
    <View style={[styles.hoursRow, { flexDirection: rowDirection('row-reverse') }]}>
      {showEstimated && (
        <View style={[styles.badge, styles.hoursBadge]}>
          <Ionicons name="time-outline" size={12} color={colors.info} />
          <Text style={styles.hoursText}>
            מוערך: {taskHoursToNumber(item.estimated_hours).toFixed(1)} שעות
          </Text>
        </View>
      )}
      {showActual && (
        <View style={[styles.badge, styles.hoursBadge, styles.actualHoursBadge]}>
          <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
          <Text style={[styles.hoursText, { color: colors.success }]}>
            בוצע: {taskHoursToNumber(item.actual_hours).toFixed(1)} שעות
          </Text>
        </View>
      )}
    </View>
  );
}

function TaskItemActionRow({
  item,
  deleting,
  onOpenEdit,
  onCreateSubtask,
  onDeleteTask,
}: {
  item: AdminTask;
  deleting: string | null;
  onOpenEdit: (t: AdminTask) => void;
  onCreateSubtask: (t: AdminTask) => void;
  onDeleteTask: (id: string) => void;
}) {
  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenEdit(item)}>
        <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
        <Text style={styles.actionText}>ערוך</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onCreateSubtask(item)}>
        <Ionicons name="add-circle-outline" size={18} color={colors.info} />
        <Text style={[styles.actionText, { color: colors.info }]}>תת-משימה</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onDeleteTask(item.id)}
        disabled={deleting === item.id}
      >
        {deleting === item.id ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>מחק</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function AdminTaskListRow(p: AdminTaskListRowProps) {
  const {
    item,
    isSubtask = false,
    level = 0,
    expandedTasks,
    subtasks,
    loadingSubtasks,
    updating,
    deleting,
    viewOnly,
    onToggleDone,
    onOpenEdit,
    onCreateSubtask,
    onDeleteTask,
    onToggleSubtasks,
  } = p;
  const isDone = item.status === 'done';
  const hasSubtasks = (item.subtask_count || 0) > 0;
  const isExpanded = expandedTasks.has(item.id);
  const taskSubtasks = subtasks[item.id] || [];
  const taskLevel = item.level ?? level;
  const rowFr = rowDirection('row-reverse');

  return (
    <View>
      <View
        style={[
          styles.taskItem,
          { flexDirection: rowFr },
          isDone && styles.taskItemDone,
          isSubtask && styles.subtaskItem,
          isSubtask && { marginStart: taskLevel * 16 },
        ]}
      >
        {isSubtask && (
          <View style={styles.subtaskIndicator}>
            <Ionicons name="return-down-forward" size={16} color={colors.info} />
            <Text style={styles.levelText}>דרגה {taskLevel}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onToggleDone(item)}
          disabled={updating === item.id}
        >
          {updating === item.id ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Ionicons
              name={isDone ? 'checkbox' : 'square-outline'}
              size={24}
              color={isDone ? colors.success : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          {item.parent_task_details && (
            <View style={styles.parentBadge}>
              <Ionicons name="git-branch-outline" size={12} color={colors.info} />
              <Text style={styles.parentText}>
                תת-משימה של: {item.parent_task_details.title}
              </Text>
            </View>
          )}

          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={[styles.metaRow, { flexDirection: rowFr }]}>
            <View style={[styles.badge, styles[`priority_${item.priority}` as const]]}>
              <Text style={styles.badgeText}>
                {formatTaskListPriorityHebrew(item.priority)}
              </Text>
            </View>

            <View style={[styles.badge, styles[`status_${item.status}` as const]]}>
              <Text style={styles.badgeText}>
                {formatTaskListStatusHebrew(item.status)}
              </Text>
            </View>

            {hasSubtasks && (
              <TouchableOpacity
                style={[styles.badge, styles.subtaskBadge]}
                onPress={() => onToggleSubtasks(item.id)}
              >
                {loadingSubtasks === item.id ? (
                  <ActivityIndicator size="small" color={colors.info} />
                ) : (
                  <>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={colors.info}
                    />
                    <Text style={styles.subtaskBadgeText}>
                      {item.subtask_count} תת-משימות
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.assigneesContainer}>
              <TaskItemAssigneesBlock item={item} />
            </View>
          </View>

          <TaskItemHoursBlock item={item} />

          {item.creator_details && (
            <Text style={styles.creatorText}>
              {'נוצר ע"י'} {item.creator_details.name}
            </Text>
          )}

          {!viewOnly && (
            <TaskItemActionRow
              item={item}
              deleting={deleting}
              onOpenEdit={onOpenEdit}
              onCreateSubtask={onCreateSubtask}
              onDeleteTask={onDeleteTask}
            />
          )}
        </View>
      </View>

      {isExpanded && taskSubtasks.length > 0 && (
        <View style={styles.subtasksList}>
          {taskSubtasks.map((subtask) => (
            <View key={subtask.id}>
              <AdminTaskListRow
                {...p}
                item={subtask}
                isSubtask
                level={taskLevel + 1}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AdminTasksScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['common', 'search']);
  const routeParams = (route.params as any) || {};
  const viewOnly = routeParams?.viewOnly === true;
  useAdminProtection(true);
  const { selectedUser } = useUser();

  // Ensure top bar and bottom bar are visible in view-only mode
  useFocusEffect(
    React.useCallback(() => {
      if (viewOnly) {
        navigation.setParams({
          hideTopBar: false,
          hideBottomBar: false,
        });
      }
    }, [viewOnly, navigation])
  );
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCreating] = useState<boolean>(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'open' as TaskStatus,
    category: 'development',
    due_date: '',
    assignees: [] as User[],
    tagsText: '' as string,
    parent_task_id: '' as string,
    estimated_hours: '' as string,
  });

  // Task Hours Modal State
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<AdminTask | null>(null);

  const [query, setQuery] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<TaskStatus[]>([]);
  const [listSort, setListSort] = useState<TasksListSort>('created_desc');
  const [filterPriorities, setFilterPriorities] = useState<TaskPriority[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'me'>('all');
  const [includeDoneWhenNoStatusFilter, setIncludeDoneWhenNoStatusFilter] = useState(false);
  const [persistedHydrated, setPersistedHydrated] = useState(false);
  const [hasPersistedSnapshot, setHasPersistedSnapshot] = useState(false);
  const [searchBarRemountKey, setSearchBarRemountKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [subtasks, setSubtasks] = useState<Record<string, AdminTask[]>>({});
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [headerHeight, setHeaderHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
    ? screenHeight - tabBarHeight - headerHeight
    : undefined;
  const [loadingSubtasks, setLoadingSubtasks] = useState<string | null>(null);
  const fetchTasksSeqRef = useRef(0);

  useEffect(() => {
    console.log('📋 Tasks List Updated in Component:', tasks.map(t => `${t.id.substring(0, 8)}:${t.title}`).join(', '));
  }, [tasks]);

  // Root tasks only; order matches API (driven by listSort)
  const rootTasksForList = useMemo(
    () => tasks.filter((t) => !t.parent_task_id),
    [tasks],
  );

  const handleHeaderSearch = useCallback(
    (searchQuery: string, filterKeys?: string[], sortKeys?: string[]) => {
      setQuery(searchQuery);
      const parsed = parseAdminTaskHeaderFilters(filterKeys);
      setFilterAssignee(parsed.assignee);
      setFilterStatuses([...new Set(parsed.statuses)]);
      setFilterPriorities([...new Set(parsed.priorities)]);
      setIncludeDoneWhenNoStatusFilter(parsed.includeDoneWhenNoStatusFilter);
      const nextSort = sortKeys?.[0];
      if (nextSort && TASK_LIST_SORT_OPTIONS.some((o) => o.value === nextSort)) {
        setListSort(nextSort as TasksListSort);
      } else if (sortKeys?.length === 0) {
        setListSort('created_desc');
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let hadSnapshot = false;
      try {
        const raw = await AsyncStorage.getItem(ADMIN_TASKS_FILTER_STORAGE_KEY);
        if (cancelled) {
          return;
        }
        if (!raw?.trim()) {
          setPersistedHydrated(true);
          return;
        }
        hadSnapshot = true;
        const data = JSON.parse(raw) as Partial<PersistedAdminTasksHeader>;
        if (typeof data.query === 'string') {
          setQuery(data.query);
        }
        const parsed = parseAdminTaskHeaderFilters(
          Array.isArray(data.filterKeys) ? data.filterKeys : undefined,
        );
        setFilterAssignee(parsed.assignee);
        setFilterStatuses([...new Set(parsed.statuses)]);
        setFilterPriorities([...new Set(parsed.priorities)]);
        setIncludeDoneWhenNoStatusFilter(parsed.includeDoneWhenNoStatusFilter);
        if (data.sortKey && TASK_LIST_SORT_OPTIONS.some((o) => o.value === data.sortKey)) {
          setListSort(data.sortKey as TasksListSort);
        }
      } catch {
        // ignore corrupt storage
      } finally {
        if (!cancelled) {
          if (hadSnapshot) {
            setHasPersistedSnapshot(true);
            setSearchBarRemountKey((k) => k + 1);
          }
          setPersistedHydrated(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!persistedHydrated) {
      return;
    }
    const payload: PersistedAdminTasksHeader = {
      query,
      filterKeys: buildPersistedAdminTaskFilterKeys(
        filterAssignee,
        filterStatuses,
        filterPriorities,
        includeDoneWhenNoStatusFilter,
      ),
      sortKey: listSort,
    };
    const t = setTimeout(() => {
      AsyncStorage.setItem(ADMIN_TASKS_FILTER_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [
    persistedHydrated,
    query,
    filterAssignee,
    filterStatuses,
    filterPriorities,
    includeDoneWhenNoStatusFilter,
    listSort,
  ]);

  const fetchTasks = useCallback(async () => {
    const seq = ++fetchTasksSeqRef.current;
    setLoading(true);
    setError(null);
    const explicitStatusSelected = filterStatuses.length > 0;
    let effectiveStatuses: TaskStatus[] | undefined;
    if (explicitStatusSelected) {
      effectiveStatuses = [...new Set(filterStatuses)];
    } else if (includeDoneWhenNoStatusFilter) {
      effectiveStatuses = undefined;
    } else {
      effectiveStatuses = TASK_STATUSES_EXCLUDING_DONE;
    }

    const filterState: TaskFilterState = {
      ...(query.trim() ? { textSearch: { text: query } } : {}),
      ...(effectiveStatuses !== undefined && effectiveStatuses.length > 0
        ? { status: effectiveStatuses }
        : {}),
      ...(filterPriorities.length > 0 ? { priority: filterPriorities } : {}),
      ownership: filterAssignee === 'me' ? ['mine'] : ['all'],
    };
    const apiFilters = taskFilterStateToApiTaskFilters(filterState, {
      currentUserId: selectedUser?.id,
      sort: listSort,
    });
    console.log('🔄 Fetching tasks...', { filterState, apiFilters, selectedUserId: selectedUser?.id });
    try {
      const res: ApiResponse<AdminTask[]> = await apiService.getTasks(apiFilters);
      if (seq !== fetchTasksSeqRef.current) {
        return;
      }
      console.log('✅ Fetch tasks response:', res.success, res.data?.length);
      if (!res.success) {
        setError(res.error || 'שגיאה בטעינת משימות');
      } else {
        setTasks(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      if (seq === fetchTasksSeqRef.current) {
        setError('שגיאה בטעינת משימות - נסה שוב');
      }
    } finally {
      if (seq === fetchTasksSeqRef.current) {
        setLoading(false);
      }
    }
  }, [query, filterStatuses, listSort, filterPriorities, filterAssignee, includeDoneWhenNoStatusFilter, selectedUser]);

  useEffect(() => {
    if (!persistedHydrated) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (query) {
      timeout = setTimeout(() => fetchTasks(), 500);
    } else {
      fetchTasks();
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [query, filterStatuses, listSort, filterPriorities, filterAssignee, includeDoneWhenNoStatusFilter, persistedHydrated, fetchTasks]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'open',
      category: 'development',
      due_date: '',
      assignees: [],
      tagsText: '',
      parent_task_id: '',
      estimated_hours: '',
    });
    setEditingId(null);
  };

  const checkAndUpdateParentStatus = async (taskId: string) => {
    // Check if task has incomplete subtasks, if so, set to 'stuck'
    try {
      const res = await apiService.getSubtasks(taskId);
      if (res.success && res.data && res.data.length > 0) {
        // If there are any subtasks, automatically set parent to 'stuck'
        const hasIncompleteSubtasks = res.data.some((st: AdminTask) => st.status !== 'done');
        if (hasIncompleteSubtasks) {
          console.log(`⚠️ Setting task ${taskId} to 'stuck' - has incomplete subtasks`);
          await apiService.updateTask(taskId, { status: 'stuck' as TaskStatus });
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to check parent status:', err);
    }
    return false;
  };

  const toggleSubtasks = async (taskId: string) => {
    if (expandedTasks.has(taskId)) {
      // Collapse
      const newExpanded = new Set(expandedTasks);
      newExpanded.delete(taskId);
      setExpandedTasks(newExpanded);
    } else {
      // Expand and load subtasks
      setLoadingSubtasks(taskId);
      try {
        const res = await apiService.getSubtasks(taskId);
        if (res.success && res.data) {
          setSubtasks(prev => ({ ...prev, [taskId]: res.data }));
          // Check if parent should be marked as stuck
          const updated = await checkAndUpdateParentStatus(taskId);
          if (updated) {
            // Refresh tasks if status was updated
            await fetchTasks();
          }
        }
        const newExpanded = new Set(expandedTasks);
        newExpanded.add(taskId);
        setExpandedTasks(newExpanded);
      } catch (err) {
        console.error('Failed to load subtasks:', err);
      } finally {
        setLoadingSubtasks(null);
      }
    }
  };

  const createSubtask = (parentTask: AdminTask) => {
    setFormData({
      title: '',
      description: '',
      priority: parentTask.priority,
      status: 'open',
      category: parentTask.category || 'development',
      due_date: '',
      assignees: parentTask.assignees_details || [],
      tagsText: '',
      parent_task_id: parentTask.id,
      estimated_hours: '',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const createTask = async () => {
    if (!formData.title.trim()) return;

    // Validate created_by is available
    if (!selectedUser?.id) {
      setError('שגיאה: לא ניתן לזהות את המשתמש הנוכחי. נסה להתחבר מחדש.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const dueParsed = parseCreateTaskDueDate(formData.due_date.trim());
      if (!dueParsed.ok) {
        setError(dueParsed.message);
        setCreating(false);
        return;
      }
      const parsedEstimatedHours = parseCreateTaskEstimatedHours(formData.estimated_hours);
      const body = buildCreateTaskRequestBody(formData, selectedUser.id, dueParsed.iso, parsedEstimatedHours);

      console.log('📤 Creating task with payload:', body);

      const res: ApiResponse<AdminTask> = await apiService.createTask(body);
      if (!res.success) {
        setError(mapCreateTaskApiErrorMessage(res.error));
      } else if (res.data) {
        if (formData.parent_task_id) {
          await checkAndUpdateParentStatus(formData.parent_task_id);
        }
        await fetchTasks();
        resetForm();
        setShowForm(false);
      }
    } catch (err) {
      console.error('Error creating task:', err);
      setError('שגיאה ביצירת משימה - נסה שוב');
    } finally {
      setCreating(false);
    }
  };

  const toggleDone = async (task: AdminTask) => {
    // If trying to mark as done, check if hours are logged first
    if (task.status !== 'done') {
      // Open hours modal first
      setPendingTaskId(task.id);
      setPendingTask(task);
      setShowHoursModal(true);
      return;
    }

    // If unmarking as done, just update status
    setUpdating(task.id);
    setError(null);
    try {
      const res: ApiResponse<AdminTask> = await apiService.updateTask(task.id, { status: 'open' });
      if (res.success && res.data) {
        await fetchTasks();
      } else {
        setError(res.error || 'שגיאה בעדכון סטטוס המשימה');
      }
    } catch (err) {
      console.error('Error toggling task status:', err);
      setError('שגיאה בעדכון סטטוס המשימה - נסה שוב');
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveHours = async (hours: number) => {
    if (!pendingTaskId || !selectedUser?.id) {
      throw new Error('משתמש לא זוהה');
    }

    // Log hours first
    const logRes = await apiService.logTaskHours(pendingTaskId, hours, selectedUser.id);
    if (!logRes.success) {
      throw new Error(logRes.error || 'שגיאה ברישום שעות');
    }

    // Then update status to done
    const updateRes = await apiService.updateTask(pendingTaskId, { status: 'done' });
    if (!updateRes.success) {
      throw new Error(updateRes.error || 'שגיאה בעדכון סטטוס המשימה');
    }

    // Refresh tasks
    await fetchTasks();

    // Close modal and reset state
    setShowHoursModal(false);
    setPendingTaskId(null);
    setPendingTask(null);
  };

  const openEdit = (task: AdminTask) => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      category: task.category || 'development',
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '',
      assignees: task.assignees_details || [],
      tagsText: (task.tags || []).join(', '),
      parent_task_id: task.parent_task_id || '',
      estimated_hours: (task.estimated_hours !== null && task.estimated_hours !== undefined && task.estimated_hours > 0) ? String(task.estimated_hours) : '',
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setUpdating(editingId);
    setError(null);
    try {
      let parsedDueDate = null;
      if (formData.due_date.trim()) {
        const date = new Date(formData.due_date);
        if (Number.isNaN(date.getTime())) {
          setError('תאריך לא תקין - אנא השתמש בפורמט YYYY-MM-DD');
          setUpdating(null);
          return;
        }
        parsedDueDate = date.toISOString();
      }

      // Parse estimated_hours
      let parsedEstimatedHours = null;
      if (formData.estimated_hours && formData.estimated_hours.trim()) {
        const hours = Number.parseFloat(formData.estimated_hours.trim());
        if (!Number.isNaN(hours) && hours > 0) {
          parsedEstimatedHours = hours;
        }
      }

      const body: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || null,
        due_date: parsedDueDate,
        tags: formData.tagsText ? formData.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
        assignees: formData.assignees.map(u => u.id),
        estimated_hours: parsedEstimatedHours,
      };

      const res = await apiService.updateTask(editingId, body);
      if (res.success && res.data) {
        await fetchTasks();
        setShowForm(false);
        resetForm();
        setEditingId(null);
      } else if (res.error?.includes('הרשאה')) {
        setError('אין לך הרשאה להקצות משימה למשתמשים אלה. ניתן להקצות משימות רק לעובדים שלך.');
      } else {
        setError(res.error || 'שגיאה בעדכון משימה');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      setError('שגיאה בעדכון משימה - נסה שוב');
    } finally {
      setUpdating(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    setDeleting(taskId);
    setError(null);
    try {
      const res = await apiService.deleteTask(taskId);
      if (res.success) {
        await fetchTasks();
      } else {
        setError(res.error || 'שגיאה במחיקת משימה');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('שגיאה במחיקת משימה - נסה שוב');
    } finally {
      setDeleting(null);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: AdminTask }) => (
      <AdminTaskListRow
        item={item}
        expandedTasks={expandedTasks}
        subtasks={subtasks}
        loadingSubtasks={loadingSubtasks}
        updating={updating}
        deleting={deleting}
        viewOnly={viewOnly}
        onToggleDone={toggleDone}
        onOpenEdit={openEdit}
        onCreateSubtask={createSubtask}
        onDeleteTask={deleteTask}
        onToggleSubtasks={toggleSubtasks}
      />
    ),
    [
      expandedTasks,
      subtasks,
      loadingSubtasks,
      updating,
      deleting,
      viewOnly,
      toggleDone,
      openEdit,
      createSubtask,
      deleteTask,
      toggleSubtasks,
    ],
  );

  const listHeaderBelowSearch = () => (
    <View>
      <Text style={styles.header}>ניהול משימות וצוות</Text>
      {loading ? (
        <View style={[styles.loadingBanner, { flexDirection: rowDirection('row') }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingBannerText}>טוען משימות…</Text>
        </View>
      ) : null}
      {error ? (
        <Text style={styles.errorBanner}>{error}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      <View
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
          }
        }}
      >
        <HeaderComp
          mode={false}
          menuOptions={[t('common:back')]}
          onToggleMode={() => {}}
          onSelectMenuItem={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          placeholder={t('search:adminTasksSearchPlaceholder')}
          filterOptions={ADMIN_TASKS_FILTER_OPTIONS}
          sortOptions={ADMIN_TASKS_SORT_OPTIONS}
          searchData={[]}
          onSearch={handleHeaderSearch}
          hideModeToggle
          searchBarRemountKey={searchBarRemountKey}
          initialSearchText={hasPersistedSnapshot ? query : undefined}
          initialSelectedFilters={
            hasPersistedSnapshot
              ? buildPersistedAdminTaskFilterKeys(
                filterAssignee,
                filterStatuses,
                filterPriorities,
                includeDoneWhenNoStatusFilter,
              )
              : undefined
          }
          initialSelectedSorts={hasPersistedSnapshot ? [listSort] : undefined}
        />
      </View>
      {/* List container - limited height on web to ensure scrolling works */}
      <View style={[
        styles.listWrapper,
        Platform.OS === 'web' && maxListHeight ? {
          maxHeight: maxListHeight,
        } : undefined
      ]}>
        <FlatList
          data={rootTasksForList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            stylesWithListContent.listContent,
            Platform.OS === 'web' && { paddingBottom: 120 }
          ]}
          ListHeaderComponent={listHeaderBelowSearch}
          ListEmptyComponent={
            loading ? null : <Text style={styles.emptyText}>אין משימות כרגע</Text>
          }
          scrollEnabled={true}
          nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={Platform.OS !== 'web'}
          style={styles.flatList}
        />
      </View>

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'עריכת משימה' : 'משימה חדשה'}</Text>

            <TextInput style={styles.modalInput} placeholder="כותרת" value={formData.title} onChangeText={(v) => setFormData({ ...formData, title: v })} />
            <TextInput style={[styles.modalInput, { height: 60 }]} placeholder="תיאור" multiline value={formData.description} onChangeText={(v) => setFormData({ ...formData, description: v })} />

            <View style={styles.row2}>
              <PickerField
                label="עדיפות"
                value={formData.priority}
                onChange={(v: string) => setFormData({ ...formData, priority: v as TaskPriority })}
                options={[
                  { value: 'high', label: 'גבוהה' },
                  { value: 'medium', label: 'בינונית' },
                  { value: 'low', label: 'נמוכה' },
                ]}
              />
              <PickerField
                label="סטטוס"
                value={formData.status}
                onChange={(v: string) => setFormData({ ...formData, status: v as TaskStatus })}
                options={[
                  { value: 'open', label: 'פתוחה' },
                  { value: 'in_progress', label: 'בתהליך' },
                  { value: 'stuck', label: 'תקוע' },
                  { value: 'testing', label: 'בבדיקה' },
                  { value: 'done', label: 'בוצעה' },
                ]}
              />
            </View>

            {/* User Selector for Assignees */}
            <UserSelector
              selectedUsers={formData.assignees}
              onSelect={(u) => setFormData({ ...formData, assignees: [...formData.assignees, u] })}
              onRemove={(id) => setFormData({ ...formData, assignees: formData.assignees.filter(u => u.id !== id) })}
            />

            <TextInput style={styles.modalInput} placeholder="תגיות (מופרדות אות)" value={formData.tagsText} onChangeText={(v) => setFormData({ ...formData, tagsText: v })} />

            <TextInput
              style={styles.modalInput}
              placeholder="זמן עבודה מוערך בשעות (אופציונלי)"
              value={formData.estimated_hours}
              onChangeText={(v) => setFormData({ ...formData, estimated_hours: v })}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => { setShowForm(false); resetForm(); }}>
                <Text style={styles.modalBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={editingId ? saveEdit : createTask}>
                <Text style={styles.modalBtnText}>{editingId ? 'שמור' : 'צור'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TaskHoursModal
        visible={showHoursModal}
        onClose={() => {
          setShowHoursModal(false);
          setPendingTaskId(null);
          setPendingTask(null);
        }}
        onSave={handleSaveHours}
        estimatedHours={pendingTask?.estimated_hours || null}
        taskTitle={pendingTask?.title}
      />

      {!viewOnly && (
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowForm(true); }}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// Sub-components
function PickerField({ label, value, onChange, options }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((opt: any) => (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} style={[styles.chip, value === opt.value && styles.chipActive]}>
            <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      height: '100vh' as any,
    } : {
      padding: LAYOUT_CONSTANTS.SPACING.LG,
    }),
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  loadingBanner: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingBannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorBanner: {
    color: colors.error,
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: 'bold',
    writingDirection: 'rtl',
  },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, writingDirection: 'rtl' },

  taskItem: { padding: 12, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  taskItemDone: { opacity: 0.6 },
  checkbox: { marginEnd: 12, paddingTop: 4 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'right' },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', marginBottom: 6 },

  metaRow: { alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 12, color: colors.textSecondary },
  priority_high: { backgroundColor: colors.pinkLight, borderColor: colors.pinkLight },
  priority_medium: { backgroundColor: colors.warningLight, borderColor: colors.warningLight },
  priority_low: { backgroundColor: colors.successLight, borderColor: colors.successLight },

  status_open: { backgroundColor: colors.infoLight, borderColor: colors.info },
  status_in_progress: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  status_stuck: { backgroundColor: colors.errorLight, borderColor: colors.error },
  status_testing: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  status_done: { backgroundColor: colors.successLight, borderColor: colors.success },
  status_archived: { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },

  avatarsRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatarSmall: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.white },
  moreAvatar: { backgroundColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' },
  moreAvatarText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },

  creatorText: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },

  hoursRow: { alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
  },
  actualHoursBadge: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  hoursText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '600',
  },

  actionsRow: { flexDirection: 'row-reverse', gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: colors.textPrimary },

  assigneesContainer: { marginTop: 4 },
  assigneesContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  assigneeText: { fontSize: 12, color: colors.textSecondary },
  unassignedText: { fontSize: 12, color: colors.error, fontWeight: 'bold' },

  // Subtask styles
  subtaskItem: {
    marginEnd: 24,
    borderStartWidth: 3,
    borderStartColor: colors.info,
    backgroundColor: '#F0F8FF',
  },
  subtaskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 10,
    color: colors.info,
    fontWeight: '600',
  },
  subtasksList: {
    marginTop: 8,
    gap: 8,
  },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
  },
  subtaskBadgeText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '600',
  },
  parentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    backgroundColor: colors.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  parentText: {
    fontSize: 10,
    color: colors.info,
  },

  flatList: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto' as any,
      WebkitOverflowScrolling: 'touch' as any,
    }),
  },
  addButton: {
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : { position: 'absolute' }),
    end: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    zIndex: 1000
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.background, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 16, color: colors.textPrimary },
  modalInput: { height: 44, backgroundColor: colors.backgroundSecondary, borderRadius: 8, paddingHorizontal: 12, textAlign: 'right', marginBottom: 12, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  pickerLabel: { textAlign: 'right', marginBottom: 4, color: colors.textSecondary },
  pickerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.infoLight, borderColor: colors.info },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalCancel: { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
  modalSave: { backgroundColor: colors.primary },
  modalBtnText: { color: colors.white, fontWeight: 'bold' },
});

// Define listContent outside StyleSheet.create() because it needs dynamic Platform check
const listContentStyle = Platform.OS === 'web' ? {
  paddingBottom: 100,
  gap: 12,
  paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
  paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
} : {
  paddingBottom: 100,
  gap: 12,
};

// Merge with base styles
const stylesWithListContent = {
  ...styles,
  listContent: listContentStyle,
};
