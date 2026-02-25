/**
 * @file ProblemsSection
 * @description Section explaining the problems KC solves
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

export const ProblemsSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-problems" title={t('legacy.problems.title')} subtitle={t('legacy.problems.subtitle')}>
      <View style={styles.problemsContent}>
        <View style={styles.problemCard}>
          <Ionicons name="copy-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.accent} style={styles.problemIcon} />
          <Text style={styles.problemTitle}>{t('legacy.problems.card1Title')}</Text>
          <Text style={styles.problemText}>{t('legacy.problems.card1Text')}</Text>
        </View>

        <View style={styles.problemCard}>
          <Ionicons name="people-circle-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.info} style={styles.problemIcon} />
          <Text style={styles.problemTitle}>{t('legacy.problems.card2Title')}</Text>
          <Text style={styles.problemText}>{t('legacy.problems.card2Text')}</Text>
        </View>

        <View style={styles.problemCard}>
          <Ionicons name="ban-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.secondary} style={styles.problemIcon} />
          <Text style={styles.problemTitle}>{t('legacy.problems.card3Title')}</Text>
          <Text style={styles.problemText}>{t('legacy.problems.card3Text')}</Text>
        </View>
      </View>
    </Section>
  );
};
