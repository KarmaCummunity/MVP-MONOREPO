import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { INSTAGRAM_URL, IS_MOBILE_WEB as isMobileWeb } from '../constants';
import { logger } from '../../../utils/loggerService';

export const ContactSection = () => (
  <Section id="section-contact" title="דברו איתנו והצטרפו לקהילה שעושה טוב" subtitle="נשמח לשמוע מכם, לקבל פידבק או או ביקורת וכמובן לחבר אתכם לקהילה" style={styles.sectionAltBackground}>
    <View style={styles.contactRow}>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.success }]} onPress={() => { logger.info('LandingSite', 'Click - whatsapp direct'); Linking.openURL('https://wa.me/972528616878'); }}>
        <Ionicons name="logo-whatsapp" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>שלחו לי ווטסאפ</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.info }]} onPress={() => { logger.info('LandingSite', 'Click - email'); Linking.openURL('mailto:navesarussi@gmail.com'); }}>
        <Ionicons name="mail-outline" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>שלחו לי מייל</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.secondary }]} onPress={() => { logger.info('LandingSite', 'Click - instagram'); Linking.openURL(INSTAGRAM_URL); }}>
        <Ionicons name="logo-instagram" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>עקבו באינסטגרם</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.success }]} onPress={() => { logger.info('LandingSite', 'Click - whatsapp group'); Linking.openURL('https://chat.whatsapp.com/Hi2TpFcO5huKVKarvecz00'); }}>
        <Ionicons name="chatbubbles-outline" color={colors.white} size={isMobileWeb ? 14 : 18} /><Text style={styles.contactButtonText}>הצטרפו לקבוצת ווטסאפ</Text>
      </TouchableOpacity>
    </View>
  </Section>
);

