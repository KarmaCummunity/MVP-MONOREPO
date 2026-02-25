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
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker from '../components/DatePicker';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { apiService, ApiResponse } from '../utils/apiService';
import { useAdminProtection } from '../hooks/useAdminProtection';

interface AdminTableRowsScreenProps {
  route: RouteProp<AdminStackParamList, 'AdminTableRows'>;
}

interface TableColumn {
  id: string;
  name: string;
  data_type: 'text' | 'number' | 'date';
  is_required: boolean;
  display_order: number;
}

interface TableRow {
  id: string;
  table_id: string;
  data: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

interface AdminTable {
  id: string;
  name: string;
  description?: string;
  columns: TableColumn[];
}

export default function AdminTableRowsScreen({ route }: AdminTableRowsScreenProps) {
  useAdminProtection();
  const { selectedUser } = useUser();
  const { tableId, tableName } = route.params;

  const [table, setTable] = useState<AdminTable | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [dateValues, setDateValues] = useState<Record<string, Date>>({});

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const res: ApiResponse<AdminTable> = await apiService.adminTables.getById(tableId, true);
      if (res.success && res.data) {
        setTable(res.data);
        setRows(res.data.rows || []);
      } else {
        Alert.alert('שגיאה', res.error || 'לא ניתן לטעון טבלה');
      }
    } catch (error) {
      console.error('Error fetching table:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת טבלה');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  const resetForm = () => {
    if (table) {
      const initialData: Record<string, any> = {};
      const initialDates: Record<string, Date> = {};
      table.columns.forEach((col) => {
        initialData[col.name] = '';
        if (col.data_type === 'date') {
          initialDates[col.name] = new Date();
        }
      });
      setFormData(initialData);
      setDateValues(initialDates);
    }
    setEditingRowId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowRowModal(true);
  };

  const openEditModal = (row: TableRow) => {
    const rowData = { ...row.data };
    const dates: Record<string, Date> = {};
    
    if (table) {
      table.columns.forEach((col) => {
        if (col.data_type === 'date' && rowData[col.name]) {
          dates[col.name] = new Date(rowData[col.name]);
        }
      });
    }

    setFormData(rowData);
    setDateValues(dates);
    setEditingRowId(row.id);
    setShowRowModal(true);
  };

  const updateFormField = (columnName: string, value: any) => {
    setFormData({ ...formData, [columnName]: value });
  };

  const handleSaveRow = async () => {
    if (!table) return;

    // Validate required fields
    for (const col of table.columns) {
      if (col.is_required) {
        const value = formData[col.name];
        if (value === undefined || value === null || value === '') {
          Alert.alert('שגיאה', `שדה חובה: ${col.name}`);
          return;
        }
      }
    }

    // Prepare data
    const rowData: Record<string, any> = {};
    table.columns.forEach((col) => {
      const value = formData[col.name];
      if (value !== undefined && value !== null && value !== '') {
        if (col.data_type === 'number') {
          rowData[col.name] = Number(value);
        } else if (col.data_type === 'date') {
          const dateValue = dateValues[col.name] || new Date(value);
          rowData[col.name] = dateValue.toISOString();
        } else {
          rowData[col.name] = String(value);
        }
      } else if (!col.is_required) {
        rowData[col.name] = null;
      }
    });

    try {
      if (editingRowId) {
        setUpdating(editingRowId);
        const res: ApiResponse<TableRow> = await apiService.adminTables.updateRow(
          tableId,
          editingRowId,
          { data: rowData }
        );
        if (res.success) {
          Alert.alert('הצלחה', 'רשומה עודכנה בהצלחה');
          setShowRowModal(false);
          resetForm();
          await fetchTable();
        } else {
          Alert.alert('שגיאה', res.error || 'שגיאה בעדכון רשומה');
        }
        setUpdating(null);
      } else {
        setCreating(true);
        const res: ApiResponse<TableRow> = await apiService.adminTables.createRow(tableId, {
          data: rowData,
        });
        if (res.success) {
          Alert.alert('הצלחה', 'רשומה נוספה בהצלחה');
          setShowRowModal(false);
          resetForm();
          await fetchTable();
        } else {
          Alert.alert('שגיאה', res.error || 'שגיאה ביצירת רשומה');
        }
        setCreating(false);
      }
    } catch (error) {
      console.error('Error saving row:', error);
      Alert.alert('שגיאה', 'שגיאה בשמירת רשומה');
      if (editingRowId) {
        setUpdating(null);
      } else {
        setCreating(false);
      }
    }
  };

  const handleDeleteRow = (row: TableRow) => {
    Alert.alert('מחיקת רשומה', 'למחוק את הרשומה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          setDeleting(row.id);
          try {
            const res = await apiService.adminTables.deleteRow(tableId, row.id);
            if (res.success) {
              Alert.alert('הצלחה', 'רשומה נמחקה בהצלחה');
              await fetchTable();
            } else {
              Alert.alert('שגיאה', res.error || 'שגיאה במחיקת רשומה');
            }
          } catch (error) {
            console.error('Error deleting row:', error);
            Alert.alert('שגיאה', 'שגיאה במחיקת רשומה');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const renderCell = (value: any, dataType: string) => {
    if (value === null || value === undefined || value === '') {
      return <Text style={styles.cellEmpty}>-</Text>;
    }

    if (dataType === 'date') {
      try {
        const date = new Date(value);
        return <Text style={styles.cellText}>{date.toLocaleDateString('he-IL')}</Text>;
      } catch {
        return <Text style={styles.cellText}>{String(value)}</Text>;
      }
    }

    return <Text style={styles.cellText} numberOfLines={1}>{String(value)}</Text>;
  };

  const renderRow = ({ item: row }: { item: TableRow }) => (
    <TouchableOpacity
      style={styles.tableRow}
      onPress={() => openEditModal(row)}
      disabled={deleting === row.id}
    >
      {table?.columns.map((col) => (
        <View key={col.id} style={styles.cell}>
          {renderCell(row.data[col.name], col.data_type)}
        </View>
      ))}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteRow(row)}
        disabled={deleting === row.id}
      >
        {deleting === row.id ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHeader = () => {
    if (!table) return null;

    return (
      <View style={styles.tableHeader}>
        {table.columns.map((col) => (
          <View key={col.id} style={styles.headerCell}>
            <Text style={styles.headerText}>
              {col.name}
              {col.is_required && <Text style={styles.required}> *</Text>}
            </Text>
          </View>
        ))}
        <View style={styles.headerCell} />
      </View>
    );
  };

  if (loading && !table) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!table) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>טבלה לא נמצאה</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tableName || table.name}</Text>
        {table.description && (
          <Text style={styles.description}>{table.description}</Text>
        )}
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.addText}>רשומה חדשה</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          {renderHeader()}
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>אין רשומות</Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item) => item.id}
              renderItem={renderRow}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Row Modal */}
      <Modal
        visible={showRowModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowRowModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingRowId ? 'עריכת רשומה' : 'רשומה חדשה'}
              </Text>

              {table.columns.map((col) => (
                <View key={col.id} style={styles.formField}>
                  <Text style={styles.label}>
                    {col.name}
                    {col.is_required && <Text style={styles.required}> *</Text>}
                  </Text>

                  {col.data_type === 'date' ? (
                    Platform.OS === 'web' ? (
                      <DatePicker
                        value={dateValues[col.name] || (formData[col.name] ? new Date(formData[col.name]) : null)}
                        onChange={(date) => {
                          if (date) {
                            setDateValues({ ...dateValues, [col.name]: date });
                            updateFormField(col.name, date.toISOString());
                          }
                        }}
                        placeholder="בחר תאריך"
                      />
                    ) : (
                      <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowDatePicker(col.name)}
                      >
                        <Text style={styles.dateText}>
                          {dateValues[col.name]
                            ? dateValues[col.name].toLocaleDateString('he-IL')
                            : formData[col.name]
                            ? new Date(formData[col.name]).toLocaleDateString('he-IL')
                            : 'בחר תאריך'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    )
                  ) : col.data_type === 'number' ? (
                    <TextInput
                      style={styles.input}
                      placeholder={`הכנס ${col.name}`}
                      placeholderTextColor={colors.textSecondary}
                      value={formData[col.name]?.toString() || ''}
                      onChangeText={(text) => updateFormField(col.name, text)}
                      keyboardType="numeric"
                    />
                  ) : (
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder={`הכנס ${col.name}`}
                      placeholderTextColor={colors.textSecondary}
                      value={formData[col.name]?.toString() || ''}
                      onChangeText={(text) => updateFormField(col.name, text)}
                      multiline
                      numberOfLines={col.data_type === 'text' ? 3 : 1}
                    />
                  )}
                </View>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => {
                    setShowRowModal(false);
                    resetForm();
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalSave]}
                  onPress={handleSaveRow}
                  disabled={creating || updating !== null}
                >
                  {creating || updating !== null ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalBtnText}>שמור</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={dateValues[showDatePicker] || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate && showDatePicker) {
              setDateValues({ ...dateValues, [showDatePicker]: selectedDate });
              updateFormField(showDatePicker, selectedDate.toISOString());
            }
            setShowDatePicker(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignSelf: 'flex-start',
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.MD,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
  },
  headerCell: {
    minWidth: 120,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
    borderRightWidth: 1,
    borderRightColor: colors.white + '40',
  },
  headerText: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'right',
  },
  required: {
    color: colors.error,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.MD,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
  },
  cell: {
    minWidth: 120,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  cellEmpty: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  loadingRow: {
    padding: LAYOUT_CONSTANTS.SPACING.XL,
    alignItems: 'center',
  },
  emptyRow: {
    padding: LAYOUT_CONSTANTS.SPACING.XL,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
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
  formField: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    textAlign: 'right',
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

