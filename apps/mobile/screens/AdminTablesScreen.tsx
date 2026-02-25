import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { apiService, ApiResponse } from '../utils/apiService';
import { useAdminProtection } from '../hooks/useAdminProtection';

interface AdminTablesScreenProps {
  navigation: NavigationProp<AdminStackParamList>;
}

interface TableColumn {
  id: string;
  name: string;
  data_type: 'text' | 'number' | 'date';
  is_required: boolean;
  display_order: number;
}

interface AdminTable {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at: string;
  columns?: TableColumn[];
  row_count?: number;
}

interface ColumnForm {
  name: string;
  data_type: 'text' | 'number' | 'date';
  is_required: boolean;
}

export default function AdminTablesScreen({ navigation }: AdminTablesScreenProps) {
  useAdminProtection();
  const { selectedUser } = useUser();
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    columns: [] as ColumnForm[],
  });

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.adminTables.getAll() as ApiResponse<AdminTable[]>;
      if (res.success && res.data) {
        setTables(res.data);
      } else {
        Alert.alert('שגיאה', res.error || 'לא ניתן לטעון טבלאות');
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת טבלאות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      columns: [],
    });
  };

  const addColumn = () => {
    setFormData({
      ...formData,
      columns: [
        ...formData.columns,
        { name: '', data_type: 'text', is_required: false },
      ],
    });
  };

  const removeColumn = (index: number) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index),
    });
  };

  const updateColumn = (index: number, field: keyof ColumnForm, value: any) => {
    const newColumns = [...formData.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setFormData({ ...formData, columns: newColumns });
  };

  const handleCreateTable = async () => {
    if (!formData.name.trim()) {
      Alert.alert('שגיאה', 'שם הטבלה הוא חובה');
      return;
    }

    if (formData.columns.length === 0) {
      Alert.alert('שגיאה', 'חייב להגדיר לפחות עמודה אחת');
      return;
    }

    // Validate columns
    for (const col of formData.columns) {
      if (!col.name.trim()) {
        Alert.alert('שגיאה', 'כל העמודות צריכות שם');
        return;
      }
    }

    // Check for duplicate column names
    const columnNames = formData.columns.map(c => c.name.trim());
    if (new Set(columnNames).size !== columnNames.length) {
      Alert.alert('שגיאה', 'לא ניתן להגדיר עמודות עם אותו שם');
      return;
    }

    setCreating(true);
    try {
      const res = await apiService.adminTables.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        columns: formData.columns.map((col, index) => ({
          name: col.name.trim(),
          data_type: col.data_type,
          is_required: col.is_required,
          display_order: index,
        })),
      }) as ApiResponse<AdminTable>;

      if (res.success && res.data) {
        setShowCreateModal(false);
        resetForm();
        // Refresh tables list
        await fetchTables();
      } else {
        Alert.alert('שגיאה', res.error || 'שגיאה ביצירת טבלה');
      }
    } catch (error) {
      console.error('Error creating table:', error);
      Alert.alert('שגיאה', 'שגיאה ביצירת טבלה');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = (table: AdminTable) => {
    Alert.alert('מחיקת טבלה', `למחוק את הטבלה "${table.name}"?\nפעולה זו תמחק גם את כל הרשומות בטבלה.`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          setDeleting(table.id);
          try {
            const res = await apiService.adminTables.delete(table.id);
            if (res.success) {
              Alert.alert('הצלחה', 'טבלה נמחקה בהצלחה');
              await fetchTables();
            } else {
              Alert.alert('שגיאה', res.error || 'שגיאה במחיקת טבלה');
            }
          } catch (error) {
            console.error('Error deleting table:', error);
            Alert.alert('שגיאה', 'שגיאה במחיקת טבלה');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const handleTablePress = (table: AdminTable) => {
    (navigation as any).navigate('AdminTableRows', { tableId: table.id, tableName: table.name });
  };

  const renderTableItem = ({ item }: { item: AdminTable }) => (
    <TouchableOpacity
      style={styles.tableCard}
      onPress={() => handleTablePress(item)}
      disabled={deleting === item.id}
    >
      <View style={styles.tableHeader}>
        <View style={styles.tableInfo}>
          <Text style={styles.tableName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.tableDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteTable(item)}
          disabled={deleting === item.id}
        >
          {deleting === item.id ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.tableMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="grid-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {item.columns?.length || 0} עמודות
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="list-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {item.row_count || 0} רשומות
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {new Date(item.created_at).toLocaleDateString('he-IL')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>טבלאות דינמיות</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color={colors.white} />
          <Text style={styles.addText}>טבלה חדשה</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(item) => item.id}
          renderItem={renderTableItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTables} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="grid-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>אין טבלאות</Text>
              <Text style={styles.emptySubtext}>לחץ על &quot;טבלה חדשה&quot; כדי להתחיל</Text>
            </View>
          }
        />
      )}

      {/* Create Table Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>טבלה חדשה</Text>

              <TextInput
                style={styles.input}
                placeholder="שם הטבלה *"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="תיאור (אופציונלי)"
                placeholderTextColor={colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <View style={styles.columnsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>עמודות</Text>
                  <TouchableOpacity style={styles.addColumnBtn} onPress={addColumn}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.addColumnText}>הוסף עמודה</Text>
                  </TouchableOpacity>
                </View>

                {formData.columns.map((column, index) => (
                  <View key={index} style={styles.columnCard}>
                    <View style={styles.columnHeader}>
                      <Text style={styles.columnNumber}>עמודה {index + 1}</Text>
                      <TouchableOpacity onPress={() => removeColumn(index)}>
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="שם עמודה *"
                      placeholderTextColor={colors.textSecondary}
                      value={column.name}
                      onChangeText={(text) => updateColumn(index, 'name', text)}
                    />

                    <View style={styles.row}>
                      <View style={styles.pickerContainer}>
                        <Text style={styles.label}>סוג נתון</Text>
                        <View style={styles.pickerRow}>
                          {(['text', 'number', 'date'] as const).map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.pickerOption,
                                column.data_type === type && styles.pickerOptionActive,
                              ]}
                              onPress={() => updateColumn(index, 'data_type', type)}
                            >
                              <Text
                                style={[
                                  styles.pickerOptionText,
                                  column.data_type === type && styles.pickerOptionTextActive,
                                ]}
                              >
                                {type === 'text' ? 'טקסט' : type === 'number' ? 'מספר' : 'תאריך'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          column.is_required && styles.checkboxActive,
                        ]}
                        onPress={() => updateColumn(index, 'is_required', !column.is_required)}
                      >
                        <Ionicons
                          name={column.is_required ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={column.is_required ? colors.primary : colors.textSecondary}
                        />
                        <Text style={styles.checkboxLabel}>חובה</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {formData.columns.length === 0 && (
                  <Text style={styles.emptyColumnsText}>אין עמודות. לחץ על &quot;הוסף עמודה&quot; כדי להתחיל.</Text>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalBtnText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalSave]}
                  onPress={handleCreateTable}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalBtnText}>צור</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    gap: 8,
  },
  addText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: FontSizes.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    paddingBottom: 100,
  },
  tableCard: {
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  tableInfo: {
    flex: 1,
    marginRight: LAYOUT_CONSTANTS.SPACING.SM,
  },
  tableName: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tableDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: 4,
  },
  tableMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT_CONSTANTS.SPACING.MD,
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    paddingTop: LAYOUT_CONSTANTS.SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT_CONSTANTS.SPACING.XL * 2,
  },
  emptyText: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
  },
  emptySubtext: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.LG,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    maxHeight: '90%',
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
    }),
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  columnsSection: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  sectionTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addColumnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addColumnText: {
    color: colors.primary,
    fontWeight: '600',
  },
  columnCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    borderWidth: 1,
    borderColor: colors.border,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  columnNumber: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: LAYOUT_CONSTANTS.SPACING.MD,
  },
  pickerContainer: {
    flex: 1,
  },
  label: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'right',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerOptionText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  pickerOptionTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  checkboxActive: {},
  checkboxLabel: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
  },
  emptyColumnsText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: LAYOUT_CONSTANTS.SPACING.MD,
    marginTop: LAYOUT_CONSTANTS.SPACING.LG,
  },
  modalBtn: {
    flex: 1,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSave: {
    backgroundColor: colors.primary,
  },
  modalBtnText: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.white,
  },
});

