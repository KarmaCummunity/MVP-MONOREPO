/**
 * @file AboutSection
 * @description Section about the community and founder
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { logger } from '../../../../utils/loggerService';
import { Section } from '../Section';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';
import { WHATSAPP_URL, GITHUB_ORG_URL } from '../../constants';

export const AboutSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-about" title={t('legacy.about.title')} subtitle={t('legacy.about.subtitle')}>
      <Text style={styles.paragraph}>{t('legacy.about.para1')}</Text>
      <Text style={styles.paragraph}>{t('legacy.about.para2')}</Text>
      <Text style={[styles.sectionSubTitle, { marginTop: 30 }]}>{t('legacy.about.founderSubtitle')}</Text>
      <Text style={styles.paragraph}>{t('legacy.about.founderPara1')}</Text>
      <Text style={styles.paragraph}>{t('legacy.about.founderPara2')}</Text>

      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.success }]}
          onPress={() => {
            logger.info('LandingSite', 'Click - whatsapp from founder section');
            Linking.openURL(WHATSAPP_URL);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
          <Text style={styles.contactButtonText}>{t('legacy.about.whatsappButton')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.githubLinkContainer}>
        <TouchableOpacity
          style={styles.githubLinkButton}
          onPress={() => { logger.info('LandingSite', 'Click - github org'); Linking.openURL(GITHUB_ORG_URL); }}
        >
          <Ionicons name="logo-github" size={IS_MOBILE_WEB ? 18 : 24} color={colors.textPrimary} />
          <View style={styles.githubLinkTextContainer}>
            <Text style={styles.githubLinkTitle}>{t('legacy.about.githubTitle')}</Text>
            <Text style={styles.githubLinkDescription}>{t('legacy.about.githubDescription')}</Text>
          </View>
          <Ionicons name="arrow-forward-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.info} />
        </TouchableOpacity>
      </View>
    </Section>
  );
};
