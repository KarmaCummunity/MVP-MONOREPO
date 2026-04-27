import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { rowDirection } from '../../globals/responsive';
import type { AdminTask, AdminTaskListRowProps } from './adminTasksScreen.types';
import {
  canonicalTaskCategory,
  formatTaskListPriorityHebrew,
  formatTaskListStatusHebrew,
  taskHoursToNumber,
} from './adminTasksScreen.utils';
import { styles } from './adminTasksScreen.styles';

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

export function AdminTaskListRow(p: AdminTaskListRowProps) {
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
            
            {item.category ? (
              <View style={[styles.badge, styles.categoryBadge]}>
                <Text style={styles.badgeText}>{canonicalTaskCategory(item.category)}</Text>
              </View>
            ) : null}

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
