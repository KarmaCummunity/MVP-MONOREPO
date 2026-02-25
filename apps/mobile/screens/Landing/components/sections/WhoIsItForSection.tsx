/**
 * @file WhoIsItForSection
 * @description Section explaining target audience
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { Section } from '../Section';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';

interface WhoIsItForSectionProps {
  onDonate: () => void;
}

export const WhoIsItForSection: React.FC<WhoIsItForSectionProps> = ({ onDonate }) => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-who" title={t('legacy.who.title')} subtitle={t('legacy.who.subtitle')} style={styles.sectionAltBackground}>
      <Text style={styles.paragraph}>
        <Text style={styles.emphasis}>{t('legacy.who.introEmphasis')}</Text> {t('legacy.who.introRest')}
      </Text>
      <View style={styles.whoContent}>
        <View style={styles.whoMainCard}>
          <Ionicons name="people-outline" size={IS_MOBILE_WEB ? 32 : 48} color={colors.info} style={styles.whoMainIcon} />
          <Text style={styles.splitTitle}>{t('legacy.who.individualsTitle')}</Text>
          <Text style={styles.paragraph}>{t('legacy.who.individualsText')}</Text>
          <View style={styles.iconBullets}>
            <View style={styles.iconBulletRow}><Ionicons name="gift-outline" size={IS_MOBILE_WEB ? 14 : 18} color={colors.secondary} /><Text style={styles.iconBulletText}>{t('legacy.who.bullet1')}</Text></View>
            <View style={styles.iconBulletRow}><Ionicons name="time-outline" size={IS_MOBILE_WEB ? 14 : 18} color={colors.accent} /><Text style={styles.iconBulletText}>{t('legacy.who.bullet2')}</Text></View>
            <View style={styles.iconBulletRow}><Ionicons name="school-outline" size={IS_MOBILE_WEB ? 14 : 18} color={colors.info} /><Text style={styles.iconBulletText}>{t('legacy.who.bullet3')}</Text></View>
            <View style={styles.iconBulletRow}><Ionicons name="heart-outline" size={IS_MOBILE_WEB ? 14 : 18} color={colors.greenBright} /><Text style={styles.iconBulletText}>{t('legacy.who.bullet4')}</Text></View>
            <View style={styles.iconBulletRow}><Ionicons name="people-outline" size={IS_MOBILE_WEB ? 14 : 18} color={colors.success} /><Text style={styles.iconBulletText}>{t('legacy.who.bullet5')}</Text></View>
          </View>

          <TouchableOpacity
            style={styles.donationCtaButton}
            onPress={onDonate}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={IS_MOBILE_WEB ? 18 : 24} color={colors.white} />
            <Text style={styles.donationCtaButtonText}>{t('legacy.who.donateButton')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.whoFutureCard}>
          <Ionicons name="business-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.textSecondary} style={styles.whoFutureIcon} />
          <Text style={styles.whoFutureTitle}>{t('legacy.who.orgsTitle')}</Text>
          <Text style={styles.whoFutureText}>{t('legacy.who.orgsText')}</Text>
        </View>
      </View>
    </Section>
  );
};
