import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './adminTasksScreen.styles';

export type AdminTasksPickerOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: AdminTasksPickerOption[];
};

export function AdminTasksPickerField({ label, value, onChange, options }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((opt) => (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} style={[styles.chip, value === opt.value && styles.chipActive]}>
            <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
