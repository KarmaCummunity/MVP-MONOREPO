/**
 * @file ContactSection
 * @description Section with contact options
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
import { WHATSAPP_URL, WHATSAPP_GROUP_URL, CONTACT_EMAIL, INSTAGRAM_KARMA_URL } from '../../constants';

export const ContactSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-contact" title={t('legacy.contact.title')} subtitle={t('legacy.contact.subtitle')} style={styles.sectionAltBackground}>
      <View style={styles.contactRow}>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.success }]}
          onPress={() => { logger.info('LandingSite', 'Click - whatsapp direct'); Linking.openURL(WHATSAPP_URL); }}
        >
          <Ionicons name="logo-whatsapp" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
          <Text style={styles.contactButtonText}>{t('legacy.contact.whatsapp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.info }]}
          onPress={() => { logger.info('LandingSite', 'Click - email'); Linking.openURL(`mailto:${CONTACT_EMAIL}`); }}
        >
          <Ionicons name="mail-outline" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
          <Text style={styles.contactButtonText}>{t('legacy.contact.email')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.secondary }]}
          onPress={() => { logger.info('LandingSite', 'Click - instagram'); Linking.openURL(INSTAGRAM_KARMA_URL); }}
        >
          <Ionicons name="logo-instagram" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
          <Text style={styles.contactButtonText}>{t('legacy.contact.instagram')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.success }]}
          onPress={() => { logger.info('LandingSite', 'Click - whatsapp group'); Linking.openURL(WHATSAPP_GROUP_URL); }}
        >
          <Ionicons name="chatbubbles-outline" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
          <Text style={styles.contactButtonText}>{t('legacy.contact.whatsappGroup')}</Text>
        </TouchableOpacity>
      </View>
    </Section>
  );
};
