// Extracted from ProfileScreen — Tagged tab placeholder.
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { styles } from './profileScreen.styles';
export const TaggedRoute = ({ onHeightChange }: { onHeightChange?: (height: number) => void }) => {
  return (
    <View
      style={[styles.tabContentPlaceholder, { height: 400 }]}
      onLayout={(e) => onHeightChange && onHeightChange(Math.max(400, e.nativeEvent.layout.height))}
    >
      <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
      <Text style={styles.placeholderText}>תיוגים יהיה פעיל בהמשך</Text>
    </View>
  );
};
