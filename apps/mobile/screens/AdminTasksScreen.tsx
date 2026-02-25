import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useRoute,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import colors from "../globals/colors";
import { FontSizes, IconSizes, LAYOUT_CONSTANTS } from "../globals/constants";
import { Ionicons } from "@expo/vector-icons";
import apiService, { ApiResponse } from "../src/api/api.service";
import { useUser } from "../stores/userStore";
import { logger } from "../utils/loggerService";
import { useAdminProtection } from "../hooks/useAdminProtection";
import { useTranslation } from "react-i18next";
import type { AdminStackParamList } from "../globals/types";
import AdminTaskItem, { AdminTask, TaskStatus, TaskPriority, User } from "../components/Admin/AdminTaskItem";
import UserSelector from "../components/UserSelector";
import TaskHoursModal from "../components/TaskHoursModal";

/** Cast shared StyleSheet entry to TextStyle for use on Text/TextInput (RN style types are incompatible in strict mode). */
const asTextStyle = (s: StyleProp<ViewStyle>): StyleProp<TextStyle> => s as StyleProp<TextStyle>;

export default function AdminTasksScreen() {
  const { t } = useTranslation("admin");
  const route = useRoute();
  const navigation = useNavigation();
  const routeParams = (route.params as { viewOnly?: boolean } | undefined) ?? {};
  const viewOnly = routeParams?.viewOnly === true;
  useAdminProtection(true);
  const { selectedUser } = useUser();

  // Ensure top bar and bottom bar are visible in view-only mode
  useFocusEffect(
    React.useCallback(() => {
      if (viewOnly) {
        (navigation as import('@react-navigation/native').NavigationProp<AdminStackParamList> & { setParams(p: { hideTopBar?: boolean; hideBottomBar?: boolean }): void }).setParams({
          hideTopBar: false,
          hideBottomBar: false,
        });
      }
    }, [viewOnly, navigation]),
  );
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [_loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [_creating, setCreating] = useState<boolean>(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    status: "open" as TaskStatus,
    category: "development",
    due_date: "",
    assignees: [] as User[],
    tagsText: "" as string,
    parent_task_id: "" as string,
    estimated_hours: "" as string,
  });

  // Task Hours Modal State
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<AdminTask | null>(null);

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [filterCategory, _setFilterCategory] = useState<string | "">("");
  const [filterAssignee, setFilterAssignee] = useState<"all" | "me">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [subtasks, setSubtasks] = useState<Record<string, AdminTask[]>>({});
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [headerHeight, setHeaderHeight] = useState(0);
  const screenHeight =
    Platform.OS === "web" ? Dimensions.get("window").height : undefined;
  const maxListHeight =
    Platform.OS === "web" && screenHeight && headerHeight > 0
      ? screenHeight - tabBarHeight - headerHeight
      : undefined;
  const [loadingSubtasks, setLoadingSubtasks] = useState<string | null>(null);

  useEffect(() => {
    logger.debug("AdminTasksScreen", "Tasks list updated", {
      count: tasks.length,
      ids: tasks.map((t) => t.id.substring(0, 8)).join(","),
    });
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<TaskPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    // Filter out subtasks - only show root level tasks (those without parent_task_id)
    const rootTasks = tasks.filter((t) => !t.parent_task_id);
    return [...rootTasks].sort((a, b) => {
      // First sort by ownership if "My Tasks" is NOT active (to bring mine to top implicitly? No, sticking to date/priority)
      if (a.status === b.status) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      const statusRank: Record<TaskStatus, number> = {
        open: 0,
        in_progress: 1,
        stuck: 1.5,
        testing: 1.7,
        done: 2,
        archived: 3,
        reports: 4,
      };
      return (statusRank[a.status] || 0) - (statusRank[b.status] || 0);
    });
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    logger.debug("AdminTasksScreen", "Fetching tasks", {
      query,
      filterStatus,
      filterPriority,
      filterCategory,
      filterAssignee,
      selectedUserId: selectedUser?.id,
    });
    try {
      const res = (await apiService.getTasks({
        q: query || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        category: filterCategory || undefined,
        assignee: filterAssignee === "me" ? selectedUser?.id : undefined,
      })) as ApiResponse<AdminTask[]>;
      logger.debug("AdminTasksScreen", "Fetch tasks response", {
        success: res.success,
        count: res.data?.length,
      });
      if (!res.success) {
        setError(res.error || t("tasks.loadError"));
      } else {
        setTasks(res.data || []);
      }
    } catch (err) {
      logger.error("AdminTasksScreen", "Error fetching tasks", { err });
      setError(t("tasks.loadError"));
    } finally {
      setLoading(false);
    }
  }, [
    query,
    filterStatus,
    filterPriority,
    filterCategory,
    filterAssignee,
    selectedUser,
    t,
  ]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (query) {
      timeout = setTimeout(() => fetchTasks(), 500);
    } else {
      fetchTasks();
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    query,
    filterStatus,
    filterPriority,
    filterCategory,
    filterAssignee,
    fetchTasks,
  ]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      status: "open",
      category: "development",
      due_date: "",
      assignees: [],
      tagsText: "",
      parent_task_id: "",
      estimated_hours: "",
    });
    setEditingId(null);
  };

  const checkAndUpdateParentStatus = async (taskId: string) => {
    // Check if task has incomplete subtasks, if so, set to 'stuck'
    try {
      const res = await apiService.getSubtasks(taskId);
      const subtasks = Array.isArray(res.data) ? res.data : [];
      if (res.success && subtasks.length > 0) {
        // If there are any subtasks, automatically set parent to 'stuck'
        const hasIncompleteSubtasks = subtasks.some(
          (st: AdminTask) => st.status !== "done",
        );
        if (hasIncompleteSubtasks) {
          logger.warn("AdminTasksScreen", "Setting task to stuck - has incomplete subtasks", {
            taskId,
          });
          await apiService.updateTask(taskId, {
            status: "stuck" as TaskStatus,
          });
          return true;
        }
      }
    } catch (err) {
      logger.error("AdminTasksScreen", "Failed to check parent status", { err });
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
          const data = Array.isArray(res.data) ? res.data : [];
          setSubtasks((prev) => ({ ...prev, [taskId]: data }));
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
        logger.error("AdminTasksScreen", "Failed to load subtasks", { err });
      } finally {
        setLoadingSubtasks(null);
      }
    }
  };

  const createSubtask = (parentTask: AdminTask) => {
    setFormData({
      title: "",
      description: "",
      priority: parentTask.priority,
      status: "open",
      category: parentTask.category || "development",
      due_date: "",
      assignees: parentTask.assignees_details || [],
      tagsText: "",
      parent_task_id: parentTask.id,
      estimated_hours: "",
    });
    setEditingId(null);
    setShowForm(true);
  };

  const validateCreateTask = (): boolean => {
    if (!formData.title.trim()) return false;
    if (!selectedUser?.id) {
      setError(t("tasks.errorIdentifyUser"));
      return false;
    }
    return true;
  };

  const parseDueDate = (): string | null => {
    if (!formData.due_date.trim()) return null;
    const date = new Date(formData.due_date);
    if (Number.isNaN(date.getTime())) {
      setError(t("tasks.errorInvalidDate"));
      return null;
    }
    return date.toISOString();
  };

  const parseEstimatedHours = (): number | null => {
    if (!formData.estimated_hours?.trim()) return null;
    const hours = parseFloat(formData.estimated_hours.trim());
    return !Number.isNaN(hours) && hours > 0 ? hours : null;
  };

  const buildTaskBody = (
    parsedDueDate: string | null,
    parsedEstimatedHours: number | null,
  ) => {
    return {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      status: formData.status,
      category: formData.category || null,
      due_date: parsedDueDate,
      assignees: formData.assignees.map((u) => u.id),
      tags: formData.tagsText.trim()
        ? formData.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
        : [],
      created_by: selectedUser!.id,
      parent_task_id: formData.parent_task_id || null,
      estimated_hours: parsedEstimatedHours,
    };
  };

  const createTask = async () => {
    if (!validateCreateTask()) return;

    const parsedDueDate = parseDueDate();
    if (formData.due_date.trim() && !parsedDueDate) {
      setCreating(false);
      return;
    }

    const parsedEstimatedHours = parseEstimatedHours();
    const body = buildTaskBody(parsedDueDate, parsedEstimatedHours);

    setCreating(true);
    setError(null);
    try {
      logger.debug("AdminTasksScreen", "Creating task", { payload: body });
      const res = (await apiService.createTask(body)) as ApiResponse<AdminTask>;

      if (!res.success) {
        if (res.error?.includes("הרשאה")) {
          setError(t("tasks.errorPermissionAssign"));
        } else {
          setError(res.error || t("tasks.errorCreate"));
        }
      } else if (res.data) {
        if (formData.parent_task_id) {
          await checkAndUpdateParentStatus(formData.parent_task_id);
        }
        await fetchTasks();
        resetForm();
        setShowForm(false);
      }
    } catch (err) {
      logger.error("AdminTasksScreen", "Error creating task", { err });
      setError(t("tasks.errorCreateRetry"));
    } finally {
      setCreating(false);
    }
  };

  const toggleDone = async (task: AdminTask) => {
    // If trying to mark as done, check if hours are logged first
    if (task.status !== "done") {
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
      const res = (await apiService.updateTask(task.id, {
        status: "open",
      })) as ApiResponse<AdminTask>;
      if (res.success && res.data) {
        await fetchTasks();
      } else {
        setError(res.error || t("tasks.errorUpdateStatus"));
      }
    } catch (err) {
      logger.error("AdminTasksScreen", "Error toggling task status", { err });
      setError(t("tasks.errorUpdateStatusRetry"));
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveHours = async (hours: number) => {
    if (!pendingTaskId || !selectedUser?.id) {
      throw new Error(t("tasks.userNotIdentified"));
    }

    // Log hours first
    const logRes = await apiService.logTaskHours(
      pendingTaskId,
      hours,
      selectedUser.id,
    );
    if (!logRes.success) {
      throw new Error(logRes.error || t("tasks.errorRegisterHours"));
    }

    // Then update status to done
    const updateRes = await apiService.updateTask(pendingTaskId, {
      status: "done",
    });
    if (!updateRes.success) {
      throw new Error(updateRes.error || t("tasks.errorUpdateTaskStatus"));
    }

    // Refresh tasks
    await fetchTasks();

    // Close modal and reset state
    setShowHoursModal(false);
    setPendingTaskId(null);
    setPendingTask(null);
  };

  const renderItem = ({
    item,
    isSubtask = false,
    level = 0,
  }: {
    item: AdminTask;
    isSubtask?: boolean;
    level?: number;
  }) => (
    <AdminTaskItem
      item={item}
      isSubtask={isSubtask}
      level={level}
      viewOnly={viewOnly}
      updating={updating}
      deleting={deleting}
      loadingSubtasks={loadingSubtasks}
      expandedTasks={expandedTasks}
      subtasks={subtasks}
      onToggleDone={toggleDone}
      onToggleSubtasks={toggleSubtasks}
      onOpenEdit={openEdit}
      onCreateSubtask={createSubtask}
      onDeleteTask={deleteTask}
    />
  );

  const openEdit = (task: AdminTask) => {
    setFormData({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      category: task.category || "development",
      due_date: task.due_date
        ? new Date(task.due_date).toISOString().slice(0, 10)
        : "",
      assignees: task.assignees_details || [],
      tagsText: (task.tags || []).join(", "),
      parent_task_id: task.parent_task_id || "",
      estimated_hours:
        task.estimated_hours !== null &&
          task.estimated_hours !== undefined &&
          task.estimated_hours > 0
          ? String(task.estimated_hours)
          : "",
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
        if (isNaN(date.getTime())) {
          setError(t("tasks.errorInvalidDate"));
          setUpdating(null);
          return;
        }
        parsedDueDate = date.toISOString();
      }

      // Parse estimated_hours
      let parsedEstimatedHours = null;
      if (formData.estimated_hours && formData.estimated_hours.trim()) {
        const hours = parseFloat(formData.estimated_hours.trim());
        if (!isNaN(hours) && hours > 0) {
          parsedEstimatedHours = hours;
        }
      }

      const body: {
        title: string;
        description: string | null;
        priority: TaskPriority;
        status: TaskStatus;
        category: string | null;
        due_date: string | null;
        tags: string[];
        assignees: string[];
        estimated_hours?: number;
      } = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || null,
        due_date: parsedDueDate,
        tags: formData.tagsText
          ? formData.tagsText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
          : [],
        assignees: formData.assignees.map((u) => u.id),
        estimated_hours: parsedEstimatedHours ?? undefined,
      };

      const res = await apiService.updateTask(editingId, body);
      if (res.success && res.data) {
        await fetchTasks();
        setShowForm(false);
        resetForm();
        setEditingId(null);
      } else {
        // Handle specific permission error
        if (res.error?.includes("הרשאה")) {
          setError(t("tasks.errorPermissionAssign"));
        } else {
          setError(res.error || t("tasks.errorUpdateTask"));
        }
      }
    } catch (err) {
      logger.error("AdminTasksScreen", "Error updating task", { err });
      setError(t("tasks.errorUpdateTaskRetry"));
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
        setError(res.error || t("tasks.errorDeleteTask"));
      }
    } catch (err) {
      logger.error("AdminTasksScreen", "Error deleting task", { err });
      setError(t("tasks.errorDeleteTaskRetry"));
    } finally {
      setDeleting(null);
    }
  };

  const renderHeader = () => (
    <View
      onLayout={(event) => {
        if (Platform.OS === "web") {
          const { height } = event.nativeEvent.layout;
          setHeaderHeight(height);
        }
      }}
    >
      <Text style={asTextStyle(styles.header)}>{t("tasks.headerTitle")}</Text>

      <View style={styles.filtersRow}>
        <TextInput
          style={asTextStyle(styles.input)}
          placeholder={t("tasks.searchPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTasks}>
          <Ionicons name="search-outline" size={IconSizes.xsmall} color={colors.white} />
        </TouchableOpacity>
      </View>

      {error && (
        <Text
          style={{
            color: colors.error,
            textAlign: "right",
            marginBottom: 8,
            fontWeight: "bold",
          }}
        >
          {error}
        </Text>
      )}

      <View style={styles.chipsRow}>
        <FilterChip
          label={t("tasks.assigneeLabel")}
          value={filterAssignee}
          setValue={(v) => setFilterAssignee(v as "all" | "me")}
          options={[
            { value: "all", label: t("tasks.assigneeAll") },
            { value: "me", label: t("tasks.assigneeMe") },
          ]}
        />
        <FilterChip
          label={t("tasks.statusLabel")}
          value={filterStatus}
          setValue={(v) => setFilterStatus(v as "" | TaskStatus)}
          options={[
            { value: "", label: t("tasks.statusAll") },
            { value: "open", label: t("tasks.open") },
            { value: "in_progress", label: t("tasks.in_progress") },
            { value: "stuck", label: t("tasks.stuck") },
            { value: "testing", label: t("tasks.testing") },
            { value: "done", label: t("tasks.done") },
          ]}
        />
        <FilterChip
          label={t("tasks.priorityLabel")}
          value={filterPriority}
          setValue={(v) => setFilterPriority(v as "" | TaskPriority)}
          options={[
            { value: "", label: t("tasks.statusAll") },
            { value: "high", label: t("tasks.high") },
            { value: "medium", label: t("tasks.medium") },
          ]}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        Platform.OS === "web" && { position: "relative" },
      ]}
    >
      <StatusBar
        backgroundColor={colors.backgroundSecondary}
        barStyle="dark-content"
      />
      {/* List container - limited height on web to ensure scrolling works */}
      <View
        style={[
          styles.listWrapper,
          Platform.OS === "web" && maxListHeight
            ? {
              maxHeight: maxListHeight,
            }
            : undefined,
        ]}
      >
        <FlatList
          data={sortedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            stylesWithListContent.listContent,
            Platform.OS === "web" && { paddingBottom: 120 },
          ]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <Text style={asTextStyle(styles.emptyText)}>{t("tasks.emptyText")}</Text>
          }
          scrollEnabled={true}
          nestedScrollEnabled={Platform.OS === "web" ? true : undefined}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={Platform.OS !== "web"}
          style={styles.flatList}
        />
      </View>

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={asTextStyle(styles.modalTitle)}>
              {editingId ? t("tasks.modalTitleEdit") : t("tasks.modalTitleNew")}
            </Text>

            <TextInput
              style={asTextStyle(styles.modalInput)}
              placeholder={t("tasks.placeholderTitle")}
              value={formData.title}
              onChangeText={(v) => setFormData({ ...formData, title: v })}
            />
            <TextInput
              style={asTextStyle([styles.modalInput, { height: 60 }])}
              placeholder={t("tasks.placeholderDescription")}
              multiline
              value={formData.description}
              onChangeText={(v) => setFormData({ ...formData, description: v })}
            />

            <View style={styles.row2}>
              <PickerField
                label={t("tasks.priorityLabel")}
                value={formData.priority}
                onChange={(v: string) =>
                  setFormData({ ...formData, priority: v as TaskPriority })
                }
                options={[
                  { value: "high", label: t("tasks.high") },
                  { value: "medium", label: t("tasks.medium") },
                  { value: "low", label: t("tasks.low") },
                ]}
              />
              <PickerField
                label={t("tasks.statusLabel")}
                value={formData.status}
                onChange={(v: string) =>
                  setFormData({ ...formData, status: v as TaskStatus })
                }
                options={[
                  { value: "open", label: t("tasks.open") },
                  { value: "in_progress", label: t("tasks.in_progress") },
                  { value: "stuck", label: t("tasks.stuck") },
                  { value: "testing", label: t("tasks.testing") },
                  { value: "done", label: t("tasks.done") },
                ]}
              />
            </View>

            {/* User Selector for Assignees */}
            <UserSelector
              selectedUsers={formData.assignees}
              onSelect={(u) =>
                setFormData({
                  ...formData,
                  assignees: [...formData.assignees, u],
                })
              }
              onRemove={(id) =>
                setFormData({
                  ...formData,
                  assignees: formData.assignees.filter((u) => u.id !== id),
                })
              }
            />

            <TextInput
              style={asTextStyle(styles.modalInput)}
              placeholder={t("tasks.placeholderTags")}
              value={formData.tagsText}
              onChangeText={(v) => setFormData({ ...formData, tagsText: v })}
            />

            <TextInput
              style={asTextStyle(styles.modalInput)}
              placeholder={t("tasks.placeholderEstimatedHours")}
              value={formData.estimated_hours}
              onChangeText={(v) =>
                setFormData({ ...formData, estimated_hours: v })
              }
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <Text style={asTextStyle(styles.modalBtnText)}>{t("tasks.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave]}
                onPress={editingId ? saveEdit : createTask}
              >
                <Text style={asTextStyle(styles.modalBtnText)}>
                  {editingId ? t("tasks.save") : t("tasks.create")}
                </Text>
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

type PickerOption = { value: string; label: string };
function PickerField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: PickerOption[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={asTextStyle(styles.pickerLabel)}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((opt: PickerOption) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, value === opt.value && styles.chipActive]}
          >
            <Text
              style={asTextStyle([
                styles.chipText,
                value === opt.value && styles.chipTextActive,
              ])}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FilterChip({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: PickerOption[] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ color: colors.textSecondary }}>{label}:</Text>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {options.map((opt: PickerOption) => (
          <TouchableOpacity
            key={`${label}-${opt.value}`}
            onPress={() => setValue(opt.value)}
            style={[styles.chip, value === opt.value && styles.chipActive]}
          >
            <Text
              style={asTextStyle([
                styles.chipText,
                value === opt.value && styles.chipTextActive,
              ])}
            >
              {opt.label}
            </Text>
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
    position: "relative",
    ...(Platform.OS === "web"
      ? ({ height: "100vh" } as unknown as ViewStyle)
      : {
        padding: LAYOUT_CONSTANTS.SPACING.LG,
      }),
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    fontSize: FontSizes.heading2,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: "right",
  },
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    textAlign: "right",
    color: colors.textPrimary,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginTop: 40,
  },

  taskItem: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskItemDone: { opacity: 0.6 },
  checkbox: { marginRight: 12, paddingTop: 4 },
  taskContent: { flex: 1 },
  taskTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "right",
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 6,
  },

  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { fontSize: 12, color: colors.textSecondary },
  priority_high: {
    backgroundColor: colors.pinkLight,
    borderColor: colors.pinkLight,
  },
  priority_medium: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningLight,
  },
  priority_low: {
    backgroundColor: colors.successLight,
    borderColor: colors.successLight,
  },

  status_open: { backgroundColor: colors.infoLight, borderColor: colors.info },
  status_in_progress: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  status_stuck: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  status_testing: { backgroundColor: colors.successLight, borderColor: colors.success },
  status_done: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  status_archived: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },

  avatarsRow: { flexDirection: "row-reverse", alignItems: "center" },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white,
  },
  moreAvatar: {
    backgroundColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  moreAvatarText: { color: colors.white, fontSize: 10, fontWeight: "bold" },

  creatorText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },

  hoursRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  hoursBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },

  actionsRow: { flexDirection: "row-reverse", gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 12, color: colors.textPrimary },

  assigneesContainer: { marginTop: 4 },
  assigneesContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  assigneeText: { fontSize: 12, color: colors.textSecondary },
  unassignedText: { fontSize: 12, color: colors.error, fontWeight: "bold" },

  // Subtask styles
  subtaskItem: {
    marginLeft: 24,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    backgroundColor: colors.infoLight,
  },
  subtaskIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 8,
    justifyContent: "center",
  },
  levelText: {
    fontSize: 10,
    color: colors.info,
    fontWeight: "600",
  },
  subtasksList: {
    marginTop: 8,
    gap: 8,
  },
  subtaskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
  },
  subtaskBadgeText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: "600",
  },
  parentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    backgroundColor: colors.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  parentText: {
    fontSize: 10,
    color: colors.info,
  },

  flatList: {
    flex: 1,
    ...(Platform.OS === "web" && {
      overflowY: "auto" as const,
      WebkitOverflowScrolling: "touch" as const,
    }),
  },
  addButton: {
    ...(Platform.OS === "web"
      ? { position: "fixed" as const }
      : { position: "absolute" as const }),
    left: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    zIndex: 1000,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 16,
    color: colors.textPrimary,
  },
  modalInput: {
    height: 44,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: "right",
    marginBottom: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row2: { flexDirection: "row", gap: 12, marginBottom: 12 },
  pickerLabel: {
    textAlign: "right",
    marginBottom: 4,
    color: colors.textSecondary,
  },
  pickerOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.infoLight, borderColor: colors.info },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary, fontWeight: "bold" },

  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSave: { backgroundColor: colors.primary },
  modalBtnText: { color: colors.white, fontWeight: "bold" },
}) as Record<string, ViewStyle>;

// Define listContent outside StyleSheet.create() because it needs dynamic Platform check
const listContentStyle =
  Platform.OS === "web"
    ? {
      paddingBottom: 100,
      gap: 12,
      paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
      paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
    }
    : {
      paddingBottom: 100,
      gap: 12,
    };

// Merge with base styles
const stylesWithListContent = {
  ...styles,
  listContent: listContentStyle,
};
