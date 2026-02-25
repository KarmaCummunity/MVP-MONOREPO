// File overview:
// - Purpose: Reusable About button component that navigates to AboutKarmaCommunityScreen
// - Reached from: TopBarNavigator, SettingsScreen, and any other component that needs an About button
// - Provides: Consistent About button UI and navigation behavior across the app
// - External deps: React Navigation, Ionicons, colors

import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';

interface AboutButtonProps {
  /**
   * Custom style for the button container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Icon size (default: 24)
   */
  iconSize?: number;
  /**
   * Icon color (default: colors.topNavIcon)
   */
  iconColor?: string;
  /**
   * Custom onPress handler (optional, defaults to navigating to AboutKarmaCommunityScreen)
   */
  onPress?: () => void;
}

/**
 * AboutButton - Reusable About button component
 * 
 * This component provides a consistent About button that can be used
 * throughout the app. It navigates to the AboutKarmaCommunityScreen
 * when pressed.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AboutButton />
 * 
 * // With custom styling
 * <AboutButton 
 *   style={{ marginRight: 10 }}
 *   iconSize={28}
 *   iconColor={colors.primary}
 * />
 * ```
 */
export default function AboutButton({
  style,
  iconSize = 24,
  iconColor = colors.topNavIcon,
  onPress,
}: AboutButtonProps) {
  const { t } = useTranslation('common');
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to About screen by default
      navigation.navigate('LandingSiteScreen' as never);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.button, style]}
      activeOpacity={0.7}
      accessibilityLabel={t('accessibility.aboutButton')}
      accessibilityHint={t('accessibility.aboutButtonHint')}
    >
      <Ionicons name="information-circle-outline" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

