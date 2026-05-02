// TaskItem.tsx
'use strict';

import React, { useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../globals/types';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = memo((props) => {
  const { task, onToggleComplete, onEditTask, onDeleteTask } = props;

  const getPriorityColor = useCallback((priority: Task['priority']): string => {
    switch (priority) {
      case 'High':
        return colors.error;
      case 'Medium':
        return colors.warning;
      case 'Low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  }, []);

  const getPriorityIcon = useCallback((priority: Task['priority']): string => {
    switch (priority) {
      case 'High':
        return 'alert-circle';
      case 'Medium':
        return 'time';
      case 'Low':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  }, []);

  const getStatusColor = useCallback((completed: boolean): string => {
    return completed ? colors.success : colors.textSecondary;
  }, []);

  const formatDate = useCallback((date: Date): string => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `איחור של ${Math.abs(diffDays)} ימים`;
    } else if (diffDays === 0) {
      return 'היום';
    } else if (diffDays === 1) {
      return 'מחר';
    } else {
      return `בעוד ${diffDays} ימים`;
    }
  }, []);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'מחיקת משימה',
      `האם אתה בטוח שברצונך למחוק את המשימה "${task.title}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => onDeleteTask(task.id)
        }
      ]
    );
  }, [task, onDeleteTask]);

  const handleEditPress = useCallback(() => {
    onEditTask(task);
  }, [task, onEditTask]);

  const handleTogglePress = useCallback(() => {
    onToggleComplete(task.id);
  }, [task.id, onToggleComplete]);

  return (
    <TouchableOpacity
      style={[styles.container, task.completed && styles.completedContainer]}
      onPress={handleEditPress}
      activeOpacity={0.7}
    >
      {/* Priority Indicator */}
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(task.priority) }]} />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                task.completed && styles.completedTitle,
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            {task.description && (
              <Text
                style={[styles.description, task.completed && styles.completedText]}
                numberOfLines={1}
              >
                {task.description}
              </Text>
            )}
          </View>

          {/* Priority Badge */}
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
            <Ionicons name={getPriorityIcon(task.priority) as any} size={12} color={getPriorityColor(task.priority)} />
            <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
              {task.priority}
            </Text>
          </View>
        </View>

        {/* Meta Information */}
        <View style={styles.metaContainer}>
          {task.dueDate && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, task.completed && styles.completedText]}>
                {formatDate(task.dueDate)}
              </Text>
            </View>
          )}

          {task.category && (
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, task.completed && styles.completedText]}>
                {task.category}
              </Text>
            </View>
          )}

          {task.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, task.completed && styles.completedText]}>
                {task.location}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {task.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {task.tags.length > 3 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{task.tags.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {/* Toggle Switch */}
        <Switch
          value={task.completed}
          onValueChange={handleTogglePress}
          trackColor={{ false: colors.border, true: getStatusColor(true) + '40' }}
          thumbColor={task.completed ? getStatusColor(true) : colors.white}
          ios_backgroundColor={colors.border}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={handleEditPress}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="create-outline" size={18} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeletePress}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

TaskItem.displayName = 'TaskItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  completedContainer: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  description: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  completedText: {
    color: colors.textSecondary,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    marginLeft: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 4,
  },
  metaText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingLeft: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 15,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: colors.secondary + '10',
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
  },
});

export default TaskItem; 