/**
 * Profile "Tagged" tab placeholder (coming soon).
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../globals/colors';
import { profileStyles } from './profileStyles';

type Props = {
  onHeightChange?: (height: number) => void;
};

export default function ProfileTaggedTab({ onHeightChange }: Props) {
  const { t } = useTranslation(['profile']);
  return (
    <View
      style={[profileStyles.tabContentPlaceholder, { height: 400 }]}
      onLayout={(e) => onHeightChange?.(Math.max(400, e.nativeEvent.layout.height))}
    >
      <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
      <Text style={profileStyles.placeholderText}>{t('profile:taggedComingSoon')}</Text>
    </View>
  );
}
