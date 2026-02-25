/**
 * @file HowItWorksSection
 * @description Section explaining the process flow
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

export const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-how" title={t('legacy.howItWorks.title')} subtitle={t('legacy.howItWorks.subtitle')}>
      <Text style={styles.paragraph}>{t('legacy.howItWorks.intro')}</Text>
      <View style={styles.stepsRow}>
        <View style={styles.stepCard}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <Ionicons name="person-add-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.info} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>{t('legacy.howItWorks.step1Title')}</Text>
          <Text style={styles.stepText}>{t('legacy.howItWorks.step1Text')}</Text>
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <Ionicons name="create-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.accent} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>{t('legacy.howItWorks.step2Title')}</Text>
          <Text style={styles.stepText}>{t('legacy.howItWorks.step2Text')}</Text>
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Ionicons name="search-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.accent} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>{t('legacy.howItWorks.step3Title')}</Text>
          <Text style={styles.stepText}>{t('legacy.howItWorks.step3Text')}</Text>
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepNumberBadge}>
            <Text style={styles.stepNumber}>4</Text>
          </View>
          <Ionicons name="chatbubble-ellipses-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.secondary} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>{t('legacy.howItWorks.step4Title')}</Text>
          <Text style={styles.stepText}>{t('legacy.howItWorks.step4Text')}</Text>
        </View>
        <View style={[styles.stepCard, { backgroundColor: colors.greenBright + '12', borderColor: colors.greenBright + '40' }]}>
          <View style={[styles.stepNumberBadge, { backgroundColor: colors.greenBright }]}>
            <Text style={styles.stepNumber}>5</Text>
          </View>
          <Ionicons name="heart-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.greenBright} style={styles.stepIcon} />
          <Text style={styles.stepTitle}>{t('legacy.howItWorks.step5Title')}</Text>
          <Text style={styles.stepText}>{t('legacy.howItWorks.step5Text')}</Text>
        </View>
      </View>
      <View style={styles.howItWorksNote}>
        <Ionicons name="information-circle-outline" size={IS_MOBILE_WEB ? 18 : 24} color={colors.info} />
        <Text style={styles.howItWorksNoteText}>{t('legacy.howItWorks.note')}</Text>
      </View>
    </Section>
  );
};
