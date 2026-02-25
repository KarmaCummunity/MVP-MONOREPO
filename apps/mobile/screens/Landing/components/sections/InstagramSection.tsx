/**
 * @file InstagramSection
 * @description Section with Instagram embed (optional, marked unused - included for completeness)
 * @module Landing/Components/Sections
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { logger } from '../../../../utils/loggerService';
import { Section } from '../Section';
import { IS_MOBILE_WEB, IS_WEB } from '../../constants';
import { styles } from '../../styles';
import { INSTAGRAM_KARMA_URL } from '../../constants';

export const InstagramSection: React.FC = () => {
  const { t } = useTranslation('landing');
  const [webViewKey, setWebViewKey] = useState(0);

  return (
    <Section id="section-instagram" title={t('legacy.instagram.title')} subtitle={t('legacy.instagram.subtitle')} style={styles.sectionAltBackground}>
      <View style={styles.instagramContainer}>
        {IS_WEB ? (
          <View style={styles.instagramWebViewContainer}>
            <WebView
              key={webViewKey}
              source={{ uri: INSTAGRAM_KARMA_URL }}
              style={styles.instagramWebView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.instagramLoadingContainer}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                  <Text style={styles.instagramLoadingText}>{t('legacy.instagram.loading')}</Text>
                </View>
              )}
              onError={() => {
                logger.error('LandingSite', 'Instagram WebView error');
                setWebViewKey(prev => prev + 1);
              }}
            />
          </View>
        ) : (
          <View style={styles.instagramFallback}>
            <Ionicons name="logo-instagram" size={IS_MOBILE_WEB ? 48 : 64} color={colors.secondary} />
            <Text style={styles.instagramFallbackText}>{t('legacy.instagram.fallbackText')}</Text>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.secondary }]}
              onPress={() => {
                logger.info('LandingSite', 'Click - instagram from section');
                Linking.openURL(INSTAGRAM_KARMA_URL);
              }}
            >
              <Ionicons name="logo-instagram" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
              <Text style={styles.contactButtonText}>{t('legacy.instagram.openButton')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Section>
  );
};
