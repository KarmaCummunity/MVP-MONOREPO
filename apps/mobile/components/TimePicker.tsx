import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { Ionicons as Icon } from '@expo/vector-icons';

interface TimePickerProps {
  value: string;
  onTimeChange: (time: string) => void;
  placeholder?: string;
  label?: string;
}

export default function TimePicker({ 
  value, 
  onTimeChange, 
  placeholder,
  label,
}: TimePickerProps) {
  const { t } = useTranslation(['common']);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState('00');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleOpen = () => {
    if (value) {
      const [hour, minute] = value.split(':');
      setSelectedHour(hour || '00');
      setSelectedMinute(minute || '00');
    }
    setIsVisible(true);
  };

  const handleConfirm = () => {
    const timeString = `${selectedHour}:${selectedMinute}`;
    onTimeChange(timeString);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      
      <TouchableOpacity style={styles.timeButton} onPress={handleOpen}>
        <Text style={[styles.timeText, !value && styles.placeholderText]}>
          {value || placeholder || t('common:time.selectTime')}
        </Text>
        <Icon name="time-outline" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder || t('common:time.selectTime')}</Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>{t('common:time.hours')}</Text>
                <ScrollView 
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                >
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        selectedHour === hour && styles.selectedItem
                      ]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedHour === hour && styles.selectedItemText
                      ]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerSeparator}>
                <Text style={styles.separatorText}>:</Text>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>{t('common:time.minutes')}</Text>
                <ScrollView 
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={50}
                >
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.pickerItem,
                        selectedMinute === minute && styles.selectedItem
                      ]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedMinute === minute && styles.selectedItemText
                      ]}>
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>{t('common:confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',

  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  timeText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '85%',
    maxWidth: 300,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: FontSizes.small,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  pickerScroll: {
    height: 100,
  },
  pickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: colors.secondary,
  },
  pickerItemText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  selectedItemText: {
    color: colors.white,
    fontWeight: '600',
  },
  pickerSeparator: {
    paddingHorizontal: 10,
  },
  separatorText: {
    fontSize: FontSizes.heading1,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 6,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: FontSizes.body,
    color: colors.white,
    fontWeight: '600',
  },
}); 