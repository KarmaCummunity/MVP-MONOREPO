/**
 * @file Section Component
 * @description Reusable section wrapper with title and decorator
 * @module Landing/Components
 */

import React from 'react';
import { View, Text } from 'react-native';
import { IS_WEB } from '../constants';

/** Normalize section id for DOM (section-xxx format for scroll navigation) */
const toSectionDomId = (id?: string) => (id?.startsWith('section-') ? id : id ? `section-${id}` : undefined);
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
}) => {
  const domId = toSectionDomId(id);
  return (
  <View
    style={[styles.section, style]}
    nativeID={domId}
    {...(IS_WEB && domId ? { id: domId } : {})}
  >
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.titleDecorator} />
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children || null}
  </View>
  );
};
