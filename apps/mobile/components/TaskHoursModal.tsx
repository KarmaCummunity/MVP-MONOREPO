import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';

interface TaskHoursModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (hours: number) => Promise<void>;
  estimatedHours?: number | null;
  taskTitle?: string;
}

export default function TaskHoursModal({
  visible,
  onClose,
  onSave,
  estimatedHours,
  taskTitle,
}: TaskHoursModalProps) {
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const hoursNum = parseFloat(hours);
    
    if (!hours || isNaN(hoursNum) || hoursNum <= 0) {
      setError('אנא הזן מספר שעות תקין (גדול מ-0)');
      return;
    }

    if (hoursNum > 9999) {
      setError('מספר השעות גדול מדי (מקסימום 9999)');
      return;
    }

    try {
      setSaving(true);
      await onSave(hoursNum);
      setHours('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת השעות');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setHours('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.modalTitle}>רישום שעות עבודה</Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={saving}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {taskTitle && (
              <Text style={styles.taskTitle}>{taskTitle}</Text>
            )}

            {(estimatedHours !== null && estimatedHours !== undefined && estimatedHours > 0) && (
              <View style={styles.estimatedContainer}>
                <Ionicons name="time-outline" size={16} color={colors.info} />
                <Text style={styles.estimatedText}>
                  זמן מוערך: {estimatedHours} שעות
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>כמה זמן המשימה לקחה בשעות?</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="לדוגמה: 2.5"
                placeholderTextColor={colors.textSecondary}
                value={hours}
                onChangeText={(text) => {
                  setHours(text);
                  setError(null);
                }}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>שמור</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.LG,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  closeButton: {
    padding: 4,
  },
  taskTitle: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  estimatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    padding: LAYOUT_CONSTANTS.SPACING.SM,
    backgroundColor: colors.infoLight,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
  },
  estimatedText: {
    fontSize: FontSizes.small,
    color: colors.info,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
  },
  label: {
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
    fontWeight: '600',
  },
  input: {
    height: 50,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    fontSize: FontSizes.heading3,
    color: colors.textPrimary,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: FontSizes.small,
    color: colors.error,
    textAlign: 'right',
    marginTop: LAYOUT_CONSTANTS.SPACING.XS,
  },
  actions: {
    flexDirection: 'row',
    gap: LAYOUT_CONSTANTS.SPACING.MD,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSizes.medium,
    color: colors.white,
    fontWeight: '600',
  },
});

