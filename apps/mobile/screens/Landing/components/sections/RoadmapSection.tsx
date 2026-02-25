/**
 * @file RoadmapSection
 * @description Section showing product roadmap and logo evolution
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { Section } from '../Section';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';

/* eslint-disable @typescript-eslint/no-require-imports -- React Native requires require() for image assets */
const logoEvo0 = require('../../../../assets/images/landingScreen/kc_log_evo/logo-0.jpeg');
const logoEvo1 = require('../../../../assets/images/landingScreen/kc_log_evo/logo-1.jpeg');
const logoEvo2 = require('../../../../assets/images/landingScreen/kc_log_evo/logo-2.jpeg');
const logoEvo3 = require('../../../../assets/images/landingScreen/kc_log_evo/logo-3.jpeg');
const logoEvo4 = require('../../../../assets/images/landingScreen/kc_log_evo/logo-4.png');
/* eslint-enable @typescript-eslint/no-require-imports */

export const RoadmapSection: React.FC = () => {
  const { t } = useTranslation('landing');
  const roadmapSteps = [
    { time: 'Q1 2026', labelKey: 'legacy.roadmap.step1Label' as const, icon: 'phone-portrait-outline', color: colors.info },
    { time: 'Q2 2026', labelKey: 'legacy.roadmap.step2Label' as const, icon: 'share-social-outline', color: colors.secondary },
    { time: 'Q3 2026', labelKey: 'legacy.roadmap.step3Label' as const, icon: 'business-outline', color: colors.accent },
    { time: 'Q4 2026', labelKey: 'legacy.roadmap.step4Label' as const, icon: 'globe-outline', color: colors.success },
  ];

  const logoEvolution = [
    { image: logoEvo0, labelKey: 'legacy.roadmap.logoLabel1' as const },
    { image: logoEvo1, labelKey: 'legacy.roadmap.logoLabel2' as const },
    { image: logoEvo2, labelKey: 'legacy.roadmap.logoLabel3' as const },
    { image: logoEvo3, labelKey: 'legacy.roadmap.logoLabel4' as const },
    { image: logoEvo4, labelKey: 'legacy.roadmap.logoLabel5' as const },
  ];

  return (
    <Section id="section-roadmap" title={t('legacy.roadmap.title')} subtitle={t('legacy.roadmap.subtitle')}>
      <View style={styles.roadmapContainer}>
        {roadmapSteps.map((step, index) => (
          <View key={step.labelKey} style={styles.roadmapItemWrapper}>
            <View style={styles.roadmapItem}>
              <View style={[styles.roadmapIconContainer, { backgroundColor: step.color + '15' }]}>
                <Ionicons
                  name={step.icon as keyof typeof Ionicons.glyphMap}
                  size={IS_MOBILE_WEB ? 24 : 32}
                  color={step.color}
                />
              </View>
              <View style={styles.roadmapContent}>
                <View style={[styles.roadmapTimeBadge, { backgroundColor: step.color }]}>
                  <Text style={styles.roadmapTimeText}>{step.time}</Text>
                </View>
                <Text style={styles.roadmapLabel}>{t(step.labelKey)}</Text>
              </View>
            </View>
            {index < roadmapSteps.length - 1 && (
              <View style={styles.roadmapConnector}>
                <View style={[styles.roadmapConnectorLine, { borderColor: step.color + '40' }]} />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.logoEvolutionContainer}>
        <Text style={styles.logoEvolutionTitle}>{t('legacy.roadmap.logoEvolutionTitle')}</Text>
        <Text style={styles.logoEvolutionSubtitle}>{t('legacy.roadmap.logoEvolutionSubtitle')}</Text>
        <View style={styles.logoEvolutionGrid}>
          {logoEvolution.map((logo, idx) => (
            <View key={idx} style={styles.logoEvolutionItem}>
              <Image source={logo.image} style={styles.logoEvolutionImage} resizeMode="contain" />
              <Text style={styles.logoEvolutionLabel}>{t(logo.labelKey)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.brandStrip}>
        <Ionicons name="rocket-outline" size={IS_MOBILE_WEB ? 18 : 24} color={colors.info} />
        <Text style={styles.trustText}>{t('legacy.roadmap.brandStrip')}</Text>
      </View>
    </Section>
  );
};
