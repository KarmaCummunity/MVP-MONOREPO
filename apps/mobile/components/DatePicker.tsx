import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { Ionicons as Icon } from '@expo/vector-icons';
import { I18nManager } from 'react-native';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

// Helper function to format date to Hebrew locale
const formatDate = (date: Date | null): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Helper function to validate and create Date
const ensureValidDate = (date: Date | null | undefined): Date => {
  if (!date) return new Date();
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  return new Date();
};

export default function DatePicker({
  value,
  onChange,
  placeholder,
  label,
  minimumDate,
  maximumDate,
  disabled = false,
}: DatePickerProps) {
  const { t } = useTranslation(['common', 'trump']);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => ensureValidDate(value));
  const [showNativePicker, setShowNativePicker] = useState(false);

  // Update selected date when value prop changes
  useEffect(() => {
    const validDate = ensureValidDate(value);
    setSelectedDate(validDate);
  }, [value]);

  const handleOpen = () => {
    if (disabled) return;
    const validDate = ensureValidDate(value);
    setSelectedDate(validDate);
    
    if (Platform.OS === 'web') {
      setIsVisible(true);
    } else {
      // On mobile, show native picker
      setShowNativePicker(true);
    }
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setShowNativePicker(false);
  };

  const handleNativeDateChange = (event: any, date?: Date) => {
    setShowNativePicker(false);
    if (Platform.OS === 'android') {
      // Android closes automatically
    }
    if (date) {
      onChange(date);
    }
  };

  // Generate date options for custom picker (web)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();
  const days = Array.from(
    { length: daysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );

  const handleYearChange = (year: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    // Adjust day if needed (e.g., Feb 29 -> Feb 28)
    const maxDay = daysInMonth(year, newDate.getMonth());
    if (newDate.getDate() > maxDay) {
      newDate.setDate(maxDay);
    }
    setSelectedDate(newDate);
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(month);
    // Adjust day if needed
    const maxDay = daysInMonth(newDate.getFullYear(), month);
    if (newDate.getDate() > maxDay) {
      newDate.setDate(maxDay);
    }
    setSelectedDate(newDate);
  };

  const handleDayChange = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const displayValue = formatDate(value ? ensureValidDate(value) : null);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {Platform.OS === 'web' ? (
        <>
          <TouchableOpacity
            style={[styles.dateButton, disabled && styles.disabled]}
            onPress={handleOpen}
            disabled={disabled}
          >
            <Text style={[styles.dateText, !displayValue && styles.placeholderText]}>
              {displayValue || placeholder || t('trump:ui.selectDate') || 'בחר תאריך'}
            </Text>
            <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
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
                  <Text style={styles.modalTitle}>
                    {placeholder || t('trump:ui.selectDate') || 'בחר תאריך'}
                  </Text>
                  <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                    <Icon name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.pickerContainer}>
                  {/* Year Picker */}
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>{t('common:date.year') || 'שנה'}</Text>
                    <ScrollView
                      style={styles.pickerScroll}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={40}
                    >
                      {years.map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.pickerItem,
                            selectedYear === year && styles.selectedItem,
                          ]}
                          onPress={() => handleYearChange(year)}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              selectedYear === year && styles.selectedItemText,
                            ]}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Month Picker */}
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>{t('common:date.month') || 'חודש'}</Text>
                    <ScrollView
                      style={styles.pickerScroll}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={40}
                    >
                      {months.map((month, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.pickerItem,
                            selectedMonth === index && styles.selectedItem,
                          ]}
                          onPress={() => handleMonthChange(index)}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              selectedMonth === index && styles.selectedItemText,
                            ]}
                          >
                            {month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Day Picker */}
                  <View style={styles.pickerColumn}>
                    <Text style={styles.pickerLabel}>{t('common:date.day') || 'יום'}</Text>
                    <ScrollView
                      style={styles.pickerScroll}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={40}
                    >
                      {days.map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.pickerItem,
                            selectedDay === day && styles.selectedItem,
                          ]}
                          onPress={() => handleDayChange(day)}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              selectedDay === day && styles.selectedItemText,
                            ]}
                          >
                            {day}
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
        </>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.dateButton, disabled && styles.disabled]}
            onPress={handleOpen}
            disabled={disabled}
          >
            <Text style={[styles.dateText, !displayValue && styles.placeholderText]}>
              {displayValue || placeholder || t('trump:ui.selectDate') || 'בחר תאריך'}
            </Text>
            <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {showNativePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleNativeDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
      )}
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
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  dateButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.moneyInputBackground,
    borderWidth: 1,
    borderColor: colors.moneyFormBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  dateText: {
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
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
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pickerLabel: {
    fontSize: FontSizes.small,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  pickerScroll: {
    height: 150,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 2,
    minWidth: 60,
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
  modalFooter: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: I18nManager.isRTL ? 0 : 6,
    marginLeft: I18nManager.isRTL ? 6 : 0,
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
    marginLeft: I18nManager.isRTL ? 0 : 6,
    marginRight: I18nManager.isRTL ? 6 : 0,
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



