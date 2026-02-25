/**
 * @file Section Component
 * @description Reusable section wrapper with title and decorator
 * @module Landing/Components
 */

import React from 'react';
import { View, Text } from 'react-native';
import { IS_WEB } from '../constants';
import type { SectionProps } from '../types';
import { styles } from '../styles';

/**
 * Section Component
 * Standardized section wrapper with title, decorator line, and optional subtitle
 * 
 * @component
 * @example
 * ```tsx
 * <Section id="vision" title={t('landing:...')} subtitle={t('landing:...')}>
 *   <Text>Content here</Text>
 * </Section>
 * ```
 */
export const Section: React.FC<SectionProps> = ({ 
  id, 
  title, 
  subtitle, 
  children, 
  style 
}) => (
  <View
    style={[styles.section, style]}
    nativeID={id}
    {...(IS_WEB && id ? { id } : {})}
  >
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.titleDecorator} />
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children || null}
  </View>
);
