/**
 * @file ValuesSection
 * @description Section showcasing community values
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { Section } from '../Section';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';

export const ValuesSection: React.FC = () => {
  const { t } = useTranslation('landing');
  const valuePills = [
    t('legacy.values.pill1'),
    t('legacy.values.pill2'),
    t('legacy.values.pill3'),
    t('legacy.values.pill4'),
    t('legacy.values.pill5'),
    t('legacy.values.pill6'),
  ];
  const commitments = [
    { icon: 'shield-checkmark-outline', textKey: 'legacy.values.commitment1' as const, color: colors.success },
    { icon: 'sparkles-outline', textKey: 'legacy.values.commitment2' as const, color: colors.secondary },
    { icon: 'leaf-outline', textKey: 'legacy.values.commitment3' as const, color: colors.greenBright },
  ];

  return (
    <Section id="section-values" title={t('legacy.values.title')} subtitle={t('legacy.values.subtitle')} style={styles.sectionAltBackground}>
      <Text style={styles.paragraph}>{t('legacy.values.intro')}</Text>
      <View style={styles.valuesRow}>
        {valuePills.map((value) => (
          <View key={value} style={styles.valuePill}>
            <Text style={styles.valuePillText}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.trustList}>
        {commitments.map((item) => (
          <View key={item.textKey} style={styles.trustRow}>
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={IS_MOBILE_WEB ? 14 : 18} color={item.color} />
            <Text style={styles.trustText}>{t(item.textKey)}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
};
