// components/TimeInput.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';

// 1. Define Props Interface
interface TimeInputProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
}

// Format time to HH:MM string (locale-agnostic)
const formatTime = (date: Date): string =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// 2. Component
export default function TimeInput({
  value,
  onChange,
  label,
  placeholder,
}: TimeInputProps) {
  const { t } = useTranslation(['common']);
  const [time, setTime] = useState<Date | null>(value || null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setTime(value || null);
  }, [value]);

  const handleChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ): void => {
    setShowPicker(false);
    if (selectedDate) {
      setTime(selectedDate);
      onChange(selectedDate);
    } else {
      setTime(null);
      onChange(null);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {Platform.OS === "web" ? (
        <input
          type="time"
          value={time ? formatTime(time) : ""}
          onChange={(e) => {
            const text = e.target.value; // "HH:MM"
            if (text === "") {
              setTime(null);
              onChange(null);
            } else {
              const [h, m] = text.split(":").map(Number);
              if (!isNaN(h) && !isNaN(m)) {
                const updated = time ? new Date(time) : new Date();
                updated.setHours(h, m, 0, 0);
                setTime(updated);
                onChange(updated);
              }
            }
          }}
          placeholder={placeholder || (t('common:time.selectTime') as string)}
          style={{
            ...styles.input,
            fontSize: 12,
            ...(Platform.OS === 'web' ? { direction: "rtl" } : { writingDirection: "rtl" }),
            appearance: 'auto',
            WebkitAppearance: "none",
            MozAppearance: "none",
            borderRadius: 6,
          }}
        />
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={styles.input}
          >
            <Text style={time ? styles.selectedTimeText : styles.placeholderText}>
              {time ? formatTime(time) : (placeholder || (t('common:time.selectTime') as string))}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              mode="time"
              display="default"
              value={time || new Date()}
              onChange={handleChange}
              is24Hour={true}
            />
          )}
        </>
      )}
    </View>
  );
}

// 3. Styles
const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  input: {
    minWidth: 80,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTimeText: {
    color: colors.black,
    fontSize: 18,
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
});
