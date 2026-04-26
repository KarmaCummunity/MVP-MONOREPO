import React, { createElement } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import {
  INSTAGRAM_EMBED_URL,
  INSTAGRAM_URL,
  IS_MOBILE_WEB as isMobileWeb,
  IS_WEB as isWeb,
} from '../constants';
import { logger } from '../../../utils/loggerService';

function InstagramWebIframe() {
  return createElement('iframe', {
    title: 'Instagram',
    src: INSTAGRAM_EMBED_URL,
    style: {
      width: '100%',
      height: '100%',
      minHeight: isMobileWeb ? 500 : 600,
      border: 'none',
      borderRadius: isMobileWeb ? 12 : 16,
      display: 'block',
    },
    loading: 'lazy' as const,
    allowFullScreen: true,
  });
}

export const InstagramSection = () => {
  const openInstagram = () => {
    logger.info('LandingSite', 'Click - instagram from section');
    void Linking.openURL(INSTAGRAM_URL);
  };

  return (
    <Section id="section-instagram" title="עקבו אחרינו באינסטגרם" subtitle="תמונות וסרטונים מהקהילה שלנו" style={styles.sectionAltBackground}>
      <View style={styles.instagramContainer}>
        {isWeb ? (
          <>
            <View style={styles.instagramWebViewContainer}>
              <InstagramWebIframe />
            </View>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.secondary, marginTop: 16, alignSelf: 'center' }]}
              onPress={openInstagram}
            >
              <Ionicons name="logo-instagram" color={colors.white} size={isMobileWeb ? 14 : 18} />
              <Text style={styles.contactButtonText}>פתח באינסטגרם</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.instagramFallback}>
            <Ionicons name="logo-instagram" size={isMobileWeb ? 48 : 64} color={colors.secondary} />
            <Text style={styles.instagramFallbackText}>
              עקבו אחרינו באינסטגרם
            </Text>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.secondary }]}
              onPress={openInstagram}
            >
              <Ionicons name="logo-instagram" color={colors.white} size={isMobileWeb ? 14 : 18} />
              <Text style={styles.contactButtonText}>פתח באינסטגרם</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Section>
  );
};

