/**
 * @file CoreMottosSection
 * @description Section with core guiding principles
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

export const CoreMottosSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-core-mottos" title={t('legacy.coreMottos.title')} subtitle={t('legacy.coreMottos.subtitle')}>
      <View style={styles.coreMottosContainer}>
        <View style={styles.coreMottoItem}>
          <Ionicons name="sparkles" size={IS_MOBILE_WEB ? 24 : 32} color={colors.accent} style={styles.coreMottoIcon} />
          <Text style={styles.coreMottoText}>{t('legacy.coreMottos.motto1')}</Text>
        </View>

        <View style={[styles.coreMottoItem, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '50' }]}>
          <Ionicons name="heart-circle" size={IS_MOBILE_WEB ? 24 : 32} color={colors.greenBright} style={styles.coreMottoIcon} />
          <Text style={styles.coreMottoText}>{t('legacy.coreMottos.motto2')}</Text>
        </View>

        <View style={styles.coreMottoItem}>
          <Ionicons name="swap-horizontal" size={IS_MOBILE_WEB ? 24 : 32} color={colors.info} style={styles.coreMottoIcon} />
          <Text style={styles.coreMottoText}>{t('legacy.coreMottos.motto3')}</Text>
        </View>
      </View>
    </Section>
  );
};
