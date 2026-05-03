// Admin quick-create task fields for CreatePostComposerModal (same API as AdminTasksScreen).
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import apiService, { ApiResponse } from '../utils/apiService';
import { toastService } from '../utils/toastService';
import UserSelector from './UserSelector';
import type { AdminTask, TaskPriority, TaskStatus, User } from '../screens/admin/adminTasksScreen.types';
import {
  TASK_LIST_CATEGORY_OPTIONS,
  TASK_LIST_PRIORITY_VALUES,
} from '../screens/admin/adminTasksScreen.constants';
import {
  buildCreateTaskRequestBody,
  mapCreateTaskApiErrorMessage,
  parseCreateTaskDueDate,
  parseCreateTaskEstimatedHours,
} from '../screens/admin/adminTasksScreen.utils';
import { AdminTasksPickerField } from '../screens/admin/AdminTasksPickerField';
import { styles as adminStyles } from '../screens/admin/adminTasksScreen.styles';

export type ComposerTaskFormHandle = {
  submit: () => Promise<void>;
};

type Props = {
  visible: boolean;
  userId: string;
  onCreated: () => void;
  onSubmittingChange?: (busy: boolean) => void;
};

const STATUS_OPTIONS: { value: TaskStatus; labelKey: string }[] = [
  { value: 'open', labelKey: 'search:filters.task_status_open' },
  { value: 'in_progress', labelKey: 'search:filters.task_status_in_progress' },
  { value: 'stuck', labelKey: 'search:filters.task_status_stuck' },
  { value: 'testing', labelKey: 'search:filters.task_status_testing' },
  { value: 'done', labelKey: 'search:filters.task_status_done' },
  { value: 'archived', labelKey: 'search:filters.task_status_archived' },
];

function stripStatusPrefix(label: string): string {
  return label.replace(/^סטטוס:\s*/, '').replace(/^Status:\s*/, '');
}

const ComposerTaskForm = forwardRef<ComposerTaskFormHandle, Props>(function ComposerTaskForm(
  { visible, userId, onCreated, onSubmittingChange },
  ref,
) {
  const { i18n, t } = useTranslation(['common', 'search', 'admin']);
  const isRTL = i18n.language === 'he';
  const textAlign = isRTL ? 'right' : 'left';
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getFieldStyle = (fieldName: string) => [
    composerInput,
    { textAlign },
    focusedField === fieldName && { borderColor: colors.primary, backgroundColor: colors.white }
  ];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('open');
  const [taskCategory, setTaskCategory] = useState('פיתוח');
  const [dueDate, setDueDate] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [assignees, setAssignees] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  const resetFields = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('open');
    setTaskCategory('פיתוח');
    setDueDate('');
    setTagsText('');
    setEstimatedHours('');
    setAssignees([]);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    resetFields();
  }, [visible, userId, resetFields]);

  const runSubmit = useCallback(async () => {
    if (!title.trim()) {
      toastService.showError(t('common:postComposer.titleRequired'));
      return;
    }
    const dueParsed = parseCreateTaskDueDate(dueDate.trim());
    if (!dueParsed.ok) {
      toastService.showError(dueParsed.message);
      return;
    }
    const parsedEstimated = parseCreateTaskEstimatedHours(estimatedHours);
    const body = buildCreateTaskRequestBody(
      {
        title,
        description,
        priority,
        status,
        category: taskCategory,
        due_date: dueDate,
        assignees,
        tagsText,
        parent_task_id: '',
        estimated_hours: estimatedHours,
      },
      userId,
      dueParsed.iso,
      parsedEstimated,
    );

    setSubmitting(true);
    try {
      const res: ApiResponse<AdminTask> = await apiService.createTask(body);
      if (!res.success) {
        toastService.showError(mapCreateTaskApiErrorMessage(res.error));
        return;
      }
      toastService.showSuccess(t('admin:tasks.createSuccessComposer'));
      onCreated();
    } catch {
      toastService.showError(t('common:genericTryAgain'));
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    priority,
    status,
    taskCategory,
    dueDate,
    tagsText,
    estimatedHours,
    assignees,
    userId,
    onCreated,
    t,
  ]);

  useImperativeHandle(ref, () => ({ submit: runSubmit }), [runSubmit]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <TextInput
        style={getFieldStyle('title')}
        placeholder={t('admin:tasks.title')}
        placeholderTextColor={colors.textTertiary}
        value={title}
        onChangeText={setTitle}
        onFocus={() => setFocusedField('title')}
        onBlur={() => setFocusedField(null)}
        editable={!submitting}
      />
      <TextInput
        style={[getFieldStyle('description'), { minHeight: 72, textAlignVertical: 'top' }]}
        placeholder={t('admin:tasks.description')}
        placeholderTextColor={colors.textTertiary}
        value={description}
        onChangeText={setDescription}
        onFocus={() => setFocusedField('description')}
        onBlur={() => setFocusedField(null)}
        multiline
        editable={!submitting}
      />

      <View style={adminStyles.row2}>
        <AdminTasksPickerField
          label={t('admin:tasks.priority')}
          value={priority}
          onChange={(v) => setPriority(v as TaskPriority)}
          options={TASK_LIST_PRIORITY_VALUES.map((p) => ({
            value: p,
            label: t(`admin:tasks.priority_label_${p}`),
          }))}
        />
        <AdminTasksPickerField
          label={t('admin:tasks.status')}
          value={status}
          onChange={(v) => setStatus(v as TaskStatus)}
          options={STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: stripStatusPrefix(t(o.labelKey)),
          }))}
        />
      </View>

      <AdminTasksPickerField
        label={t('admin:tasks.category')}
        value={taskCategory}
        onChange={setTaskCategory}
        options={TASK_LIST_CATEGORY_OPTIONS}
      />

      <UserSelector
        selectedUsers={assignees}
        onSelect={(u) => setAssignees([...assignees, u])}
        onRemove={(id) => setAssignees(assignees.filter((x) => x.id !== id))}
      />

      <TextInput
        style={getFieldStyle('dueDate')}
        placeholder={t('admin:tasks.dueDatePlaceholder')}
        placeholderTextColor={colors.textTertiary}
        value={dueDate}
        onChangeText={setDueDate}
        onFocus={() => setFocusedField('dueDate')}
        onBlur={() => setFocusedField(null)}
        editable={!submitting}
      />
      <TextInput
        style={getFieldStyle('tags')}
        placeholder={t('admin:tasks.tags')}
        placeholderTextColor={colors.textTertiary}
        value={tagsText}
        onChangeText={setTagsText}
        onFocus={() => setFocusedField('tags')}
        onBlur={() => setFocusedField(null)}
        editable={!submitting}
      />
      <TextInput
        style={getFieldStyle('estimatedHours')}
        placeholder={t('admin:tasks.estimatedHours')}
        placeholderTextColor={colors.textTertiary}
        value={estimatedHours}
        onChangeText={setEstimatedHours}
        onFocus={() => setFocusedField('estimatedHours')}
        onBlur={() => setFocusedField(null)}
        keyboardType="decimal-pad"
        editable={!submitting}
      />
    </ScrollView>
  );
});

const composerInput = {
  backgroundColor: colors.surfaceGrayBlue,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 14,
  marginBottom: 16,
  color: colors.textPrimary,
  fontSize: 16,
  borderWidth: 1,
  borderColor: 'transparent',
};

export default ComposerTaskForm;
