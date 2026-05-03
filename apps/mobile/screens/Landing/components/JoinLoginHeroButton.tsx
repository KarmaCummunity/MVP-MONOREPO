/**
 * @file JoinLoginHeroButton
 * @description Shared hero CTA: outlined "join us" button that navigates to login flow.
 * Single implementation for Sonar duplication rules and consistent UX.
 */

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { logger } from '../../../utils/loggerService';
import { styles } from '../styles';

export interface JoinLoginHeroButtonProps {
  onPress: () => void;
  isMobileWeb: boolean;
  label: string;
  accessibilityLabel: string;
}

export const JoinLoginHeroButton: React.FC<JoinLoginHeroButtonProps> = ({
  onPress,
  isMobileWeb,
  label,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={[styles.joinLoginButton, { borderColor: colors.info }]}
    onPress={() => {
      logger.info('LandingSite', 'Click - join us login');
      onPress();
    }}
    activeOpacity={0.8}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
  >
    <Ionicons name="person-add-outline" color={colors.info} size={isMobileWeb ? 14 : 18} />
    <Text style={styles.joinLoginButtonText}>{label}</Text>
  </TouchableOpacity>
);
