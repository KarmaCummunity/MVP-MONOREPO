/**
 * @file LegacyHeroSection
 * @description Hebrew-first hero for the legacy landing page; shares JoinLoginHeroButton with modular landing.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { logger } from '../../../utils/loggerService';
import { JoinLoginHeroButton } from './JoinLoginHeroButton';

export interface LegacyHeroSectionProps {
  onDonate: () => void;
  onJoinLogin: () => void;
  isMobileWeb: boolean;
  styles: Record<string, any>;
}

export const LegacyHeroSection: React.FC<LegacyHeroSectionProps> = ({
  onDonate,
  onJoinLogin,
  isMobileWeb,
  styles: landingStyles,
}) => {
  const { t } = useTranslation('landing');
  const heroAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnimation, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [heroAnimation]);

  return (
    <View style={landingStyles.hero}>
      <View style={landingStyles.heroGradient}>
        <View style={landingStyles.decoCircle1} />
        <View style={landingStyles.decoCircle2} />
        <View style={landingStyles.decoCircle3} />
        <Animated.View
          style={[
            landingStyles.heroContent,
            {
              opacity: heroAnimation,
              transform: [
                {
                  translateY: heroAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={landingStyles.welcomeTitle}>
            <Text style={landingStyles.welcomeTitleLarge}>המקום </Text>
            <Text style={landingStyles.welcomeTitleSmall}> בו  </Text>
            <Text style={landingStyles.welcomeTitleLarge}>הטוב </Text>
            <Text style={landingStyles.welcomeTitleSmall}> קורה </Text>
          </Text>
          <View style={landingStyles.logoContainer}>
            <View style={landingStyles.logoBackground}>
              <Image
                source={require('../../../assets/images/new_logo_black.png')}
                style={landingStyles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={landingStyles.title}>Karma Community</Text>
          <View style={landingStyles.subtitlesRow}>
            <View style={landingStyles.subtitleItem}>
              <Ionicons
                name="people-circle-outline"
                size={isMobileWeb ? 18 : 24}
                color={colors.info}
                style={landingStyles.subtitleIcon}
              />
              <Text style={landingStyles.subtitleText}>אחדות</Text>
            </View>
            <View style={[landingStyles.subtitleItem, landingStyles.subtitleItemGreen]}>
              <Ionicons
                name="eye-outline"
                size={isMobileWeb ? 18 : 24}
                color={colors.greenBright}
                style={landingStyles.subtitleIcon}
              />
              <Text style={landingStyles.subtitleText}>שקיפות</Text>
            </View>
            <View style={landingStyles.subtitleItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={isMobileWeb ? 18 : 24}
                color={colors.info}
                style={landingStyles.subtitleIcon}
              />
              <Text style={landingStyles.subtitleText}>סדר</Text>
            </View>
          </View>
          <Text style={landingStyles.subtitle}>
            רשת חברתית שמחברת בין אנשים שצריכים עזרה, לאנשים שרוצים לעזור. פשוט, שקוף ומהלב.
          </Text>

          <View style={landingStyles.ctaRow}>
            <TouchableOpacity
              style={[landingStyles.contactButton, { backgroundColor: colors.success }]}
              onPress={() => {
                logger.info('LandingSite', 'Click - whatsapp direct');
                Linking.openURL('https://wa.me/972528616878');
              }}
            >
              <Ionicons name="logo-whatsapp" color={colors.white} size={isMobileWeb ? 14 : 18} />
              <Text style={landingStyles.contactButtonText}>שלחו לי ווטסאפ </Text>
            </TouchableOpacity>
          </View>

          <JoinLoginHeroButton
            onPress={onJoinLogin}
            isMobileWeb={isMobileWeb}
            label={t('hero.joinLoginButton')}
            accessibilityLabel={t('hero.accessibility.joinLogin')}
          />

          <TouchableOpacity
            style={[landingStyles.donationCtaButton, { backgroundColor: colors.greenBright }]}
            onPress={onDonate}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={isMobileWeb ? 18 : 24} color={colors.white} />
            <Text style={landingStyles.donationCtaButtonText}>תרמו לנו</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};
