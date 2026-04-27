import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, SafeAreaView, Platform, StatusBar } from 'react-native';
import colors from '../../globals/colors';
import { Ionicons } from '@expo/vector-icons';
import UserSelector from '../../components/UserSelector';
import TaskHoursModal from '../../components/TaskHoursModal';
import HeaderComp from '../../components/HeaderComp';
import type { TaskPriority, TaskStatus } from './adminTasksScreen.types';
import {
  ADMIN_TASKS_FILTER_OPTIONS,
  ADMIN_TASKS_SORT_OPTIONS,
  TASK_LIST_CATEGORY_OPTIONS,
} from './adminTasksScreen.constants';
import { buildPersistedAdminTaskFilterKeys, sanitizeAdminTasksHeaderFilterKeys } from './adminTasksScreen.utils';
import { styles, stylesWithListContent } from './adminTasksScreen.styles';
import { AdminTasksPickerField } from './AdminTasksPickerField';
import { useAdminTasksScreen } from './useAdminTasksScreen';
import { useToast } from '../../utils/toastService';

export default function AdminTasksScreen() {
  const { ToastComponent } = useToast();
  const {
    navigation,
    t,
    viewOnly,
    setHeaderHeight,
    maxListHeight,
    handleHeaderSearch,
    searchBarRemountKey,
    query,
    hasPersistedSnapshot,
    filterAssignee,
    filterStatuses,
    filterPriorities,
    filterCategories,
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
    listLoading,
  } = useAdminTasksScreen();

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
              ? sanitizeAdminTasksHeaderFilterKeys(
                buildPersistedAdminTaskFilterKeys(
                  filterAssignee,
                  filterStatuses,
                  filterPriorities,
                  filterCategories,
                ),
              )
              : undefined
          }
          sanitizeSelectedFilters={sanitizeAdminTasksHeaderFilterKeys}
          initialSelectedSorts={hasPersistedSnapshot ? [listSort] : undefined}
        />
      </View>
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
            listLoading ? null : <Text style={styles.emptyText}>{t('admin:tasks.noTasks')}</Text>
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
            <Text style={styles.modalTitle}>{editingId ? t('admin:tasks.editTask') : t('admin:tasks.newTask')}</Text>

            <TextInput style={styles.modalInput} placeholder={t('admin:tasks.title')} value={formData.title} onChangeText={(v) => setFormData({ ...formData, title: v })} />
            <TextInput style={[styles.modalInput, { height: 60 }]} placeholder={t('admin:tasks.description')} multiline value={formData.description} onChangeText={(v) => setFormData({ ...formData, description: v })} />

            <View style={styles.row2}>
              <AdminTasksPickerField
                label={t('admin:tasks.priority')}
                value={formData.priority}
                onChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
                options={[
                  { value: 'high', label: t('search:filters.task_priority_high').replace('עדיפות: ', '').replace('Priority: ', '') },
                  { value: 'medium', label: t('search:filters.task_priority_medium').replace('עדיפות: ', '').replace('Priority: ', '') },
                  { value: 'low', label: t('search:filters.task_priority_low').replace('עדיפות: ', '').replace('Priority: ', '') },
                ]}
              />
              <AdminTasksPickerField
                label={t('admin:tasks.status')}
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v as TaskStatus })}
                options={[
                  { value: 'open', label: t('search:filters.task_status_open').replace('סטטוס: ', '').replace('Status: ', '') },
                  { value: 'in_progress', label: t('search:filters.task_status_in_progress').replace('סטטוס: ', '').replace('Status: ', '') },
                  { value: 'stuck', label: t('search:filters.task_status_stuck').replace('סטטוס: ', '').replace('Status: ', '') },
                  { value: 'testing', label: t('search:filters.task_status_testing').replace('סטטוס: ', '').replace('Status: ', '') },
                  { value: 'done', label: t('search:filters.task_status_done').replace('סטטוס: ', '').replace('Status: ', '') },
                  { value: 'archived', label: t('search:filters.task_status_archived').replace('סטטוס: ', '').replace('Status: ', '') },
                ]}


              />
            </View>

            <AdminTasksPickerField
              label={t('admin:tasks.category')}
              value={formData.category}
              onChange={(v) => setFormData({ ...formData, category: v })}
              options={TASK_LIST_CATEGORY_OPTIONS}
            />

            <UserSelector
              selectedUsers={formData.assignees}
              onSelect={(u) => setFormData({ ...formData, assignees: [...formData.assignees, u] })}
              onRemove={(id) => setFormData({ ...formData, assignees: formData.assignees.filter(u => u.id !== id) })}
            />

            <TextInput style={styles.modalInput} placeholder={t('admin:tasks.tags')} value={formData.tagsText} onChangeText={(v) => setFormData({ ...formData, tagsText: v })} />

            <TextInput
              style={styles.modalInput}
              placeholder={t('admin:tasks.estimatedHours')}
              value={formData.estimated_hours}
              onChangeText={(v) => setFormData({ ...formData, estimated_hours: v })}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => { setShowForm(false); resetForm(); }}>
                <Text style={styles.modalBtnText}>{t('admin:tasks.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={editingId ? saveEdit : createTask}>
                <Text style={styles.modalBtnText}>{editingId ? t('admin:tasks.save') : t('admin:tasks.create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TaskHoursModal
        visible={showHoursModal}
        onClose={closeHoursModal}
        onSave={handleSaveHours}
        estimatedHours={pendingTask?.estimated_hours || null}
        taskTitle={pendingTask?.title}
      />

      {!viewOnly && (
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowForm(true); }}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
      {ToastComponent}
    </SafeAreaView>
  );
}
