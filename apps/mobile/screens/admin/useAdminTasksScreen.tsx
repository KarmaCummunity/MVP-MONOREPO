import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import colors from '../../globals/colors';
import { rowDirection } from '../../globals/responsive';
import apiService, { ApiResponse } from '../../utils/apiService';
import { toastService } from '../../utils/toastService';
import { useUser } from '../../stores/userStore';
import { useAdminProtection } from '../../hooks/useAdminProtection';
import { taskFilterStateToApiTaskFilters, type TaskFilterState } from '../../utils/taskFilterQuery';
import type { AdminTask, TaskPriority, TaskStatus, TasksListSort, User, PersistedAdminTasksHeader } from './adminTasksScreen.types';
import {
  ADMIN_TASKS_FILTER_STORAGE_KEY,
  TASK_LIST_SORT_OPTIONS,
  TASK_STATUSES_EXCLUDING_DONE,
} from './adminTasksScreen.constants';
import {
  buildCreateTaskRequestBody,
  buildPersistedAdminTaskFilterKeys,
  mapCreateTaskApiErrorMessage,
  parseAdminTaskHeaderFilters,
  parseCreateTaskDueDate,
  parseCreateTaskEstimatedHours,
} from './adminTasksScreen.utils';
import { styles } from './adminTasksScreen.styles';
import { AdminTaskListRow } from './AdminTaskListRow';

export function useAdminTasksScreen() {
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
    category: 'פיתוח',
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
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
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
      setFilterCategories([...new Set(parsed.categories)]);
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
        setFilterCategories([...new Set(parsed.categories)]);
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
        filterCategories,
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
    filterCategories,
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
      ...(filterCategories.length > 0 ? { category: filterCategories } : {}),
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
  }, [query, filterStatuses, listSort, filterPriorities, filterCategories, filterAssignee, includeDoneWhenNoStatusFilter, selectedUser]);

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
  }, [query, filterStatuses, listSort, filterPriorities, filterCategories, filterAssignee, includeDoneWhenNoStatusFilter, persistedHydrated, fetchTasks]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'open',
      category: 'פיתוח',
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
      category: parentTask.category || 'פיתוח',
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
    if (!formData.title.trim()) {
      const msg = 'נא להזין כותרת למשימה';
      toastService.showError(msg);
      return;
    }

    // Validate created_by is available
    if (!selectedUser?.id) {
      const msg = 'שגיאה: לא ניתן לזהות את המשתמש הנוכחי. נסה להתחבר מחדש.';
      setError(msg);
      toastService.showError(msg);
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const dueParsed = parseCreateTaskDueDate(formData.due_date.trim());
      if (!dueParsed.ok) {
        setError(dueParsed.message);
        toastService.showError(dueParsed.message);
        setCreating(false);
        return;
      }
      const parsedEstimatedHours = parseCreateTaskEstimatedHours(formData.estimated_hours);
      const body = buildCreateTaskRequestBody(formData, selectedUser.id, dueParsed.iso, parsedEstimatedHours);

      console.log('📤 Creating task with payload:', body);

      const res: ApiResponse<AdminTask> = await apiService.createTask(body);
      if (!res.success) {
        const msg = mapCreateTaskApiErrorMessage(res.error);
        setError(msg);
        toastService.showError(msg);
      } else if (res.data) {
        if (formData.parent_task_id) {
          await checkAndUpdateParentStatus(formData.parent_task_id);
        }
        await fetchTasks();
        resetForm();
        setShowForm(false);
        toastService.showSuccess('המשימה נוצרה בהצלחה');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      const msg = 'שגיאה ביצירת משימה - נסה שוב';
      setError(msg);
      toastService.showError(msg);
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
        toastService.showSuccess('סטטוס המשימה עודכן');
      } else {
        const msg = res.error || 'שגיאה בעדכון סטטוס המשימה';
        setError(msg);
        toastService.showError(msg);
      }
    } catch (err) {
      console.error('Error toggling task status:', err);
      const msg = 'שגיאה בעדכון סטטוס המשימה - נסה שוב';
      setError(msg);
      toastService.showError(msg);
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveHours = async (hours: number) => {
    if (!pendingTaskId || !selectedUser?.id) {
      const msg = 'משתמש לא זוהה';
      toastService.showError(msg);
      throw new Error(msg);
    }

    // Log hours first
    const logRes = await apiService.logTaskHours(pendingTaskId, hours, selectedUser.id);
    if (!logRes.success) {
      const msg = logRes.error || 'שגיאה ברישום שעות';
      toastService.showError(msg);
      throw new Error(msg);
    }

    // Then update status to done
    const updateRes = await apiService.updateTask(pendingTaskId, { status: 'done' });
    if (!updateRes.success) {
      const msg = updateRes.error || 'שגיאה בעדכון סטטוס המשימה';
      toastService.showError(msg);
      throw new Error(msg);
    }

    // Refresh tasks
    await fetchTasks();

    // Close modal and reset state
    setShowHoursModal(false);
    setPendingTaskId(null);
    setPendingTask(null);
    toastService.showSuccess('המשימה סומנה כבוצעה והשעות נרשמו');
  };

  const openEdit = (task: AdminTask) => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      category: task.category || 'פיתוח',
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
          const msg = 'תאריך לא תקין - אנא השתמש בפורמט YYYY-MM-DD';
          setError(msg);
          toastService.showError(msg);
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
        toastService.showSuccess('המשימה עודכנה בהצלחה');
      } else if (res.error?.includes('הרשאה')) {
        const msg = 'אין לך הרשאה להקצות משימה למשתמשים אלה. ניתן להקצות משימות רק לעובדים שלך.';
        setError(msg);
        toastService.showError(msg);
      } else {
        const msg = res.error || 'שגיאה בעדכון משימה';
        setError(msg);
        toastService.showError(msg);
      }
    } catch (err) {
      console.error('Error updating task:', err);
      const msg = 'שגיאה בעדכון משימה - נסה שוב';
      setError(msg);
      toastService.showError(msg);
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
        toastService.showSuccess('המשימה נמחקה בהצלחה');
      } else {
        const msg = res.error || 'שגיאה במחיקת משימה';
        setError(msg);
        toastService.showError(msg);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      const msg = 'שגיאה במחיקת משימה - נסה שוב';
      setError(msg);
      toastService.showError(msg);
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

  const closeHoursModal = () => {
    setShowHoursModal(false);
    setPendingTaskId(null);
    setPendingTask(null);
  };

  return {
    navigation,
    t,
    viewOnly,
    loading,
    setHeaderHeight,
    maxListHeight,
    handleHeaderSearch,
    searchBarRemountKey,
    query,
    hasPersistedSnapshot,
    filterAssignee,
    filterStatuses,
    filterPriorities,
    includeDoneWhenNoStatusFilter,
    listSort,
    rootTasksForList,
    renderItem,
    listHeaderBelowSearch,
    showForm,
    setShowForm,
    formData,
    setFormData,
    editingId,
    saveEdit,
    createTask,
    resetForm,
    showHoursModal,
    handleSaveHours,
    closeHoursModal,
    pendingTask,
  };
}
