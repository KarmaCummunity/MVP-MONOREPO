import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChallengeType, DailyTrackerChallenge } from '../../globals/types';

interface EditEntryModalProps {
  visible: boolean;
  challenge: DailyTrackerChallenge | null;
  date: string;
  existingValue?: number;
  existingNotes?: string;
  onClose: () => void;
  onSave: (value: number, notes: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  visible,
  challenge,
  date,
  existingValue,
  existingNotes,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t } = useTranslation(['challenges', 'common']);
  const [value, setValue] = useState<number>(existingValue ?? 0);
  const [notes, setNotes] = useState<string>(existingNotes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && challenge) {
      const nextValue = existingValue ?? (challenge.type === 'BOOLEAN' ? 0 : 0);
      const nextNotes = existingNotes ?? '';
      setValue(nextValue);
      setNotes(nextNotes);
      if (__DEV__) {
        console.log('[EditEntryModal] Opened with values:', { date, existingValue, nextValue, existingNotes: existingNotes?.slice(0, 20) });
      }
    }
  }, [visible, date, existingValue, existingNotes, challenge?.id]);

  if (!challenge) return null;

  const handleSave = async () => {
    if (__DEV__) console.log('[EditEntryModal] Save clicked:', { value, notes });
    setSaving(true);
    try {
      await onSave(value, notes);
      // onSave should handle closing the modal and refreshing data
    } catch (error) {
      if (__DEV__) console.error('[EditEntryModal] Error saving:', error);
      Alert.alert(t('editEntry.saveErrorTitle'), t('editEntry.saveErrorMessage'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t('editEntry.deleteTitle'),
      t('editEntry.deleteMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: async () => {
            if (onDelete) {
              setSaving(true);
              try {
                await onDelete();
                onClose();
              } catch (error) {
                Alert.alert(t('editEntry.deleteErrorTitle'), t('editEntry.deleteErrorMessage'));
              } finally {
                setSaving(false);
              }
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString + 'T00:00:00');
    return d.toLocaleDateString('he-IL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderValueInput = () => {
    if (challenge.type === 'BOOLEAN') {
      return (
        <View style={styles.booleanContainer}>
          <Text style={styles.label}>{t('challenges:fields.value')}</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {value === 1 ? '✓' : '✗'}
            </Text>
            <Switch
              value={value === 1}
              onValueChange={(val) => setValue(val ? 1 : 0)}
              trackColor={{ false: '#F44336', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      );
    }

    if (challenge.type === 'NUMERIC') {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('challenges:fields.value')}</Text>
          <TextInput
            style={styles.input}
            value={value.toString()}
            onChangeText={(text) => {
              const num = parseFloat(text);
              setValue(isNaN(num) ? 0 : num);
            }}
            keyboardType="numeric"
            placeholder={t('challenges:fields.valuePlaceholder')}
          />
          {challenge.goal_value && (
            <Text style={styles.hint}>
              {challenge.goal_direction === 'minimize' ? '< ' : '≥ '}
              {challenge.goal_value}
            </Text>
          )}
        </View>
      );
    }

    if (challenge.type === 'DURATION') {
      const hours = Math.floor(value / 60);
      const minutes = value % 60;

      return (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('challenges:fields.goalValueMinutes')}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>H</Text>
              <TextInput
                style={styles.input}
                value={hours.toString()}
                onChangeText={(text) => {
                  const h = parseInt(text) || 0;
                  setValue(h * 60 + minutes);
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>M</Text>
              <TextInput
                style={styles.input}
                value={minutes.toString()}
                onChangeText={(text) => {
                  const m = parseInt(text) || 0;
                  setValue(hours * 60 + m);
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
          {challenge.goal_value && (
            <Text style={styles.hint}>
              {t('editEntry.goalMinutes', { value: challenge.goal_value })}
            </Text>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{challenge.title}</Text>
            <Text style={styles.dateText}>{formatDate(date)}</Text>

            {renderValueInput()}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('fields.notes')}</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('fields.notesPlaceholder')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.buttonTextCancel}>{t('common:cancel')}</Text>
              </TouchableOpacity>

              {existingValue !== undefined && onDelete && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonDelete]}
                  onPress={handleDelete}
                  disabled={saving}
                >
                  <Text style={styles.buttonTextDelete}>{t('common:delete')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.buttonTextSave}>
                  {saving ? t('editEntry.saving') : t('editEntry.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  notesInput: {
    height: 80,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  booleanContainer: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#F5F5F5',
  },
  buttonDelete: {
    backgroundColor: '#FFEBEE',
  },
  buttonSave: {
    backgroundColor: '#4CAF50',
  },
  buttonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDelete: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSave: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
