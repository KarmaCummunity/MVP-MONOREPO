/**
 * @file HeroSection Component
 * @description Hero section with animated welcome message and CTAs
 * @module Landing/Components
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { logger } from '../../../utils/loggerService';
import type { HeroSectionProps } from '../types';
import { IS_MOBILE_WEB, ANIMATION_DURATION, WHATSAPP_URL } from '../constants';
import { styles } from '../styles';

/**
 * HeroSection Component
 * Landing page hero with animated entrance, logo, tagline, and CTAs
 * Features decorative circles and gradient background
 * 
 * @component
 * @example
 * ```tsx
 * <HeroSection onDonate={() => setDonationModalVisible(true)} />
 * ```
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ onDonate }) => {
  const { t } = useTranslation('landing');
  // Animation setup for fade-in and slide-up effect
  const heroAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(heroAnimation, {
      toValue: 1,
      duration: ANIMATION_DURATION.HERO,
      delay: ANIMATION_DURATION.HERO_DELAY,
      useNativeDriver: false,
    }).start();
  }, [heroAnimation]);

  /**
   * Handle WhatsApp button click
   * Logs analytics and opens WhatsApp with predefined number
   */
  const handleWhatsAppClick = () => {
    logger.info('LandingSite', 'Click - whatsapp direct');
    Linking.openURL(WHATSAPP_URL);
  };

  return (
    <View style={styles.hero}>
      <View style={styles.heroGradient}>
        {/* Decorative background circles */}
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
        <View style={styles.decoCircle3} />
        
        {/* Animated hero content */}
        <Animated.View 
          style={[
            styles.heroContent,
            {
              opacity: heroAnimation,
              transform: [{
                translateY: heroAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          {/* Welcome tagline with mixed font sizes */}
          <Text style={styles.welcomeTitle}>
            <Text style={styles.welcomeTitleLarge}>{t('hero.welcomeTitle.large1')} </Text>
            <Text style={styles.welcomeTitleSmall}> {t('hero.welcomeTitle.small1')}  </Text>
            <Text style={styles.welcomeTitleLarge}>{t('hero.welcomeTitle.large2')} </Text>
            <Text style={styles.welcomeTitleSmall}> {t('hero.welcomeTitle.small2')} </Text>
          </Text>
          
          {/* Logo container */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image 
                source={require('../../../assets/images/new_logo_black.png')} 
                style={styles.logo} 
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="Karma Community Logo"
              />
            </View>
          </View>
          
          {/* App title */}
          <Text style={styles.title}>Karma Community</Text>
          
          {/* Core values row */}
          <View style={styles.subtitlesRow}>
            <View style={styles.subtitleItem}>
              <Ionicons 
                name="people-circle-outline" 
                size={IS_MOBILE_WEB ? 18 : 24} 
                color={colors.info} 
                style={styles.subtitleIcon} 
              />
              <Text style={styles.subtitleText}>{t('hero.values.unity')}</Text>
            </View>
            <View style={[styles.subtitleItem, styles.subtitleItemGreen]}>
              <Ionicons 
                name="eye-outline" 
                size={IS_MOBILE_WEB ? 18 : 24} 
                color={colors.greenBright} 
                style={styles.subtitleIcon} 
              />
              <Text style={styles.subtitleText}>{t('hero.values.transparency')}</Text>
            </View>
            <View style={styles.subtitleItem}>
              <Ionicons 
                name="checkmark-circle-outline" 
                size={IS_MOBILE_WEB ? 18 : 24} 
                color={colors.info} 
                style={styles.subtitleIcon} 
              />
              <Text style={styles.subtitleText}>{t('hero.values.order')}</Text>
            </View>
          </View>
          
          {/* Description */}
          <Text style={styles.subtitle}>
            {t('hero.subtitle')}
          </Text>

          {/* WhatsApp CTA button */}
          <View style={styles.ctaRow}>
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: colors.success }]} 
              onPress={handleWhatsAppClick}
              activeOpacity={0.8}
              accessibilityLabel={t('hero.accessibility.whatsapp')}
              accessibilityRole="button"
            >
              <Ionicons 
                name="logo-whatsapp" 
                color={colors.white} 
                size={IS_MOBILE_WEB ? 14 : 18} 
              />
              <Text style={styles.contactButtonText}>{t('hero.whatsappButton')} </Text>
            </TouchableOpacity>
          </View>
          
          {/* Donation CTA button */}
          <TouchableOpacity
            style={[styles.donationCtaButton, { backgroundColor: colors.greenBright }]}
            onPress={onDonate}
            activeOpacity={0.8}
            accessibilityLabel={t('hero.accessibility.donate')}
            accessibilityRole="button"
          >
            <Ionicons 
              name="heart" 
              size={IS_MOBILE_WEB ? 18 : 24} 
              color={colors.white} 
            />
            <Text style={styles.donationCtaButtonText}>{t('hero.donateButton')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};
