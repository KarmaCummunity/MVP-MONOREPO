/**
 * @file Feature Component
 * @description Feature card display with emoji icon
 * @module Landing/Components
 */

import React from 'react';
import { View, Text } from 'react-native';
import colors from '../../../globals/colors';
import type { FeatureProps } from '../types';
import { styles } from '../styles';

/**
 * Feature Component
 * Displays a feature card with emoji, title, and description
 * 
 * @component
 * @example
 * ```tsx
 * <Feature 
 *   emoji="🎯" 
 *   title={t('landing:feature.1.title')} 
 *   text={t('landing:feature.1.text')}
 *   greenAccent={true}
 * />
 * ```
 */
export const Feature: React.FC<FeatureProps> = ({
  emoji,
  title,
  text,
  greenAccent
}) => (
  <View
    style={[
      styles.feature,
      greenAccent && {
        backgroundColor: colors.greenBright + '12',
        borderColor: colors.greenBright + '30'
      }
    ]}
  >
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);
