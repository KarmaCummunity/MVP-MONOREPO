import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    type StyleProp,
    type ViewStyle,
    type TextStyle,
    type ImageStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../globals/colors";
import { useTranslation } from "react-i18next";



export type TaskStatus =
    | "open"
    | "in_progress"
    | "done"
    | "archived"
    | "stuck"
    | "testing"
    | "reports";
export type TaskPriority = "low" | "medium" | "high";

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
    assignees: string[]; // UUIDs
    assignees_details?: User[]; // Full objects
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

interface AdminTaskItemProps {
    item: AdminTask;
    isSubtask?: boolean;
    level?: number;
    viewOnly?: boolean;
    updating?: string | null;
    deleting?: string | null;
    loadingSubtasks?: string | null;
    expandedTasks: Set<string>;
    subtasks: Record<string, AdminTask[]>;
    onToggleDone: (task: AdminTask) => void;
    onToggleSubtasks: (taskId: string) => void;
    onOpenEdit: (task: AdminTask) => void;
    onCreateSubtask: (parentTask: AdminTask) => void;
    onDeleteTask: (taskId: string) => void;
}

const AdminTaskItem: React.FC<AdminTaskItemProps> = ({
    item,
    isSubtask = false,
    level = 0,
    viewOnly = false,
    updating = null,
    deleting = null,
    loadingSubtasks = null,
    expandedTasks,
    subtasks,
    onToggleDone,
    onToggleSubtasks,
    onOpenEdit,
    onCreateSubtask,
    onDeleteTask,
}) => {
    const { t } = useTranslation("admin");
    const isDone = item.status === "done";
    const hasSubtasks = (item.subtask_count || 0) > 0;
    const isExpanded = expandedTasks.has(item.id);
    const taskSubtasks = subtasks[item.id] || [];
    const taskLevel = item.level ?? level;

    // Type-safe style evaluation
    const getPriorityStyle = (priority: TaskPriority) => {
        switch (priority) {
            case "high": return styles.priority_high;
            case "medium": return styles.priority_medium;
            case "low": return styles.priority_low;
            default: return {};
        }
    };

    const getStatusStyle = (status: TaskStatus) => {
        switch (status) {
            case "open": return styles.status_open;
            case "in_progress": return styles.status_in_progress;
            case "done": return styles.status_done;
            case "stuck": return styles.status_stuck;
            case "testing": return styles.status_testing;
            case "archived": return styles.status_archived;
            case "reports": return styles.status_reports;
            default: return {};
        }
    };

    return (
        <View>
            <View
                style={[
                    styles.taskItem,
                    isDone && styles.taskItemDone,
                    isSubtask ? styles.subtaskItem : null,
                    isSubtask ? { marginRight: taskLevel * 16 } : null,
                ]}
            >
                {/* Subtask Indicator */}
                {isSubtask && (
                    <View style={styles.subtaskIndicator}>
                        <Ionicons
                            name="return-down-forward"
                            size={16}
                            color={colors.info}
                        />
                        <Text style={styles.levelText}>{t("tasks.levelLabel", { n: taskLevel })}</Text>
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
                            name={isDone ? "checkbox" : "square-outline"}
                            size={24}
                            color={isDone ? colors.success : colors.textSecondary}
                        />
                    )}
                </TouchableOpacity>
                <View style={styles.taskContent}>
                    {/* Parent Task Reference */}
                    {item.parent_task_details && (
                        <View style={styles.parentBadge}>
                            <Ionicons
                                name="git-branch-outline"
                                size={12}
                                color={colors.info}
                            />
                            <Text style={styles.parentText}>
                                {t("tasks.subtaskOf", { title: item.parent_task_details.title })}
                            </Text>
                        </View>
                    )}

                    <Text
                        style={[styles.taskTitle, isDone ? styles.taskTitleDone : null]}
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>
                    {item.description ? (
                        <Text style={styles.description} numberOfLines={2}>
                            {item.description}
                        </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                        {/* Priority Badge */}
                        <View
                            style={[
                                styles.badge,
                                getPriorityStyle(item.priority),
                            ]}
                        >
                            <Text style={styles.badgeText}>
                                {item.priority === "high"
                                    ? t("tasks.high")
                                    : item.priority === "medium"
                                        ? t("tasks.medium")
                                        : t("tasks.low")}
                            </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                            style={[styles.badge, getStatusStyle(item.status)]}
                        >
                            <Text style={styles.badgeText}>
                                {t(`tasks.${item.status}`)}
                            </Text>
                        </View>

                        {/* Subtasks Count Badge */}
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
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={12}
                                            color={colors.info}
                                        />
                                        <Text style={styles.subtaskBadgeText}>
                                            {t("tasks.subtasksCount", { count: item.subtask_count })}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* Assignees */}
                        <View style={styles.assigneesContainer}>
                            {item.assignees_details && item.assignees_details.length > 0 ? (
                                <View style={styles.assigneesContent}>
                                    <Text style={styles.assigneeText} numberOfLines={1}>
                                        {t("tasks.assignedTo")}{" "}
                                        {item.assignees_details.map((u) => u.name).join(", ")}
                                    </Text>
                                    <View style={styles.avatarsRow}>
                                        {item.assignees_details.slice(0, 3).map((u, i) => (
                                            <Image
                                                key={u.id}
                                                source={{
                                                    uri:
                                                        u.avatar_url ||
                                                        `https://ui-avatars.com/api/?name=${u.name}`,
                                                }}
                                                style={[
                                                    styles.avatarSmall,
                                                    { marginRight: i > 0 ? -10 : 0, zIndex: 3 - i },
                                                ]}
                                            />
                                        ))}
                                        {item.assignees_details.length > 3 && (
                                            <View style={[styles.avatarSmall as ViewStyle, styles.moreAvatar]}>
                                                <Text style={styles.moreAvatarText}>
                                                    +{item.assignees_details.length - 3}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.unassignedText}>
                                    {t("tasks.unassigned")}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Hours Display */}
                    {((item.estimated_hours &&
                        Number(item.estimated_hours) > 0) ||
                        (item.actual_hours &&
                            Number(item.actual_hours) > 0)) && (
                            <View style={styles.hoursRow}>
                                {item.estimated_hours &&
                                    Number(item.estimated_hours) > 0 && (
                                        <View style={[styles.badge, styles.hoursBadge]}>
                                            <Ionicons
                                                name="time-outline"
                                                size={12}
                                                color={colors.info}
                                            />
                                            <Text style={styles.hoursText}>
                                                {t("tasks.estimatedHours", { hours: Number(item.estimated_hours).toFixed(1) })}
                                            </Text>
                                        </View>
                                    )}
                                {item.actual_hours &&
                                    Number(item.actual_hours) > 0 && (
                                        <View
                                            style={[
                                                styles.badge,
                                                styles.hoursBadge,
                                                styles.actualHoursBadge,
                                            ]}
                                        >
                                            <Ionicons
                                                name="checkmark-circle-outline"
                                                size={12}
                                                color={colors.success}
                                            />
                                            <Text
                                                style={[styles.hoursText, { color: colors.success }] as StyleProp<TextStyle>}
                                            >
                                                {t("tasks.actualHours", { hours: Number(item.actual_hours).toFixed(1) })}
                                            </Text>
                                        </View>
                                    )}
                            </View>
                        )}

                    {item.creator_details && (
                        <Text style={styles.creatorText}>
                            {t("tasks.createdBy")} {item.creator_details.name}
                        </Text>
                    )}

                    {!viewOnly && (
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onOpenEdit(item)}
                            >
                                <Ionicons
                                    name="create-outline"
                                    size={18}
                                    color={colors.textPrimary}
                                />
                                <Text style={styles.actionText}>{t("tasks.edit")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onCreateSubtask(item)}
                            >
                                <Ionicons
                                    name="add-circle-outline"
                                    size={18}
                                    color={colors.info}
                                />
                                <Text style={[styles.actionText, { color: colors.info }] as StyleProp<TextStyle>}>
                                    {t("tasks.subtask")}
                                </Text>
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
                                        <Ionicons
                                            name="trash-outline"
                                            size={18}
                                            color={colors.error}
                                        />
                                        <Text
                                            style={[styles.actionText, { color: colors.error }] as StyleProp<TextStyle>}
                                        >
                                            {t("tasks.delete")}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Subtasks List */}
            {isExpanded && taskSubtasks.length > 0 && (
                <View style={styles.subtasksList}>
                    {taskSubtasks.map((subtask) => (
                        <View key={subtask.id}>
                            <AdminTaskItem
                                item={subtask}
                                isSubtask={true}
                                level={taskLevel + 1}
                                viewOnly={viewOnly}
                                updating={updating}
                                deleting={deleting}
                                loadingSubtasks={loadingSubtasks}
                                expandedTasks={expandedTasks}
                                subtasks={subtasks}
                                onToggleDone={onToggleDone}
                                onToggleSubtasks={onToggleSubtasks}
                                onOpenEdit={onOpenEdit}
                                onCreateSubtask={onCreateSubtask}
                                onDeleteTask={onDeleteTask}
                            />
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    taskItem: {
        flexDirection: "row-reverse",
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    } as ViewStyle,
    taskItemDone: {
        backgroundColor: "#f9f9f9",
        opacity: 0.8,
    } as ViewStyle,
    subtaskItem: {
        marginTop: -8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingLeft: 32,
    } as ViewStyle,
    subtaskIndicator: {
        flexDirection: "row-reverse",
        alignItems: "center",
        marginBottom: 4,
    } as ViewStyle,
    levelText: {
        fontSize: 10,
        color: colors.info,
        marginRight: 4,
    } as TextStyle,
    checkbox: {
        marginLeft: 12,
        marginTop: 2,
    } as ViewStyle,
    taskContent: {
        flex: 1,
        alignItems: "flex-end",
    } as ViewStyle,
    parentBadge: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: colors.info + "10",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    } as ViewStyle,
    parentText: {
        fontSize: 10,
        color: colors.info,
        marginRight: 4,
    } as TextStyle,
    taskTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.textPrimary,
        textAlign: "right",
        marginBottom: 4,
    } as TextStyle,
    taskTitleDone: {
        textDecorationLine: "line-through",
        color: colors.textSecondary,
    } as TextStyle,
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "right",
        marginBottom: 8,
    } as TextStyle,
    metaRow: {
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 8,
    } as ViewStyle,
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 6,
        marginBottom: 4,
    } as ViewStyle,
    badgeText: {
        fontSize: 10,
        fontWeight: "600",
    } as TextStyle,
    priority_high: {
        backgroundColor: colors.error + "20",
    } as ViewStyle,
    priority_medium: {
        backgroundColor: colors.warning + "20",
    } as ViewStyle,
    priority_low: {
        backgroundColor: colors.success + "20",
    } as ViewStyle,
    status_open: {
        backgroundColor: colors.info + "20",
    } as ViewStyle,
    status_in_progress: {
        backgroundColor: colors.primary + "20",
    } as ViewStyle,
    status_done: {
        backgroundColor: colors.success + "20",
    } as ViewStyle,
    status_stuck: {
        backgroundColor: colors.error + "20",
    } as ViewStyle,
    status_testing: {
        backgroundColor: "#673AB720",
    } as ViewStyle,
    status_archived: {
        backgroundColor: "#9E9E9E20",
    } as ViewStyle,
    status_reports: {
        backgroundColor: "#FF572220",
    } as ViewStyle,
    subtaskBadge: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: colors.info + "10",
    } as ViewStyle,
    subtaskBadgeText: {
        fontSize: 10,
        color: colors.info,
        marginRight: 4,
    } as TextStyle,
    assigneesContainer: {
        marginLeft: 12,
    } as ViewStyle,
    assigneesContent: {
        flexDirection: "row-reverse",
        alignItems: "center",
    } as ViewStyle,
    assigneeText: {
        fontSize: 10,
        color: colors.textSecondary,
        marginLeft: 8,
    } as TextStyle,
    avatarsRow: {
        flexDirection: "row-reverse",
    } as ViewStyle,
    avatarSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.white,
    } as ImageStyle,
    moreAvatar: {
        backgroundColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 0,
    } as ViewStyle,
    moreAvatarText: {
        fontSize: 8,
        color: colors.textSecondary,
        fontWeight: "bold",
    } as TextStyle,
    unassignedText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontStyle: "italic",
    } as TextStyle,
    hoursRow: {
        flexDirection: "row-reverse",
        marginBottom: 8,
    } as ViewStyle,
    hoursBadge: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: colors.info + "10",
    } as ViewStyle,
    actualHoursBadge: {
        backgroundColor: colors.success + "10",
    } as ViewStyle,
    hoursText: {
        fontSize: 10,
        color: colors.info,
        marginRight: 4,
    } as TextStyle,
    creatorText: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 8,
    } as TextStyle,
    actionsRow: {
        flexDirection: "row-reverse",
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        width: "100%",
        justifyContent: "space-between",
    } as ViewStyle,
    actionBtn: {
        flexDirection: "row-reverse",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
    } as ViewStyle,
    actionText: {
        fontSize: 12,
        marginRight: 6,
        color: colors.textPrimary,
    } as TextStyle,
    subtasksList: {
        marginRight: 16,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        paddingRight: 8,
        marginBottom: 12,
    } as ViewStyle,
});

export default AdminTaskItem;
