/**
 * @file FeaturesSection
 * @description Section showcasing app features
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Section } from '../Section';
import { Feature } from '../Feature';
import { styles } from '../../styles';

export const FeaturesSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-features" title={t('legacy.features.sectionTitle')} subtitle={t('legacy.features.sectionSubtitle')} style={styles.sectionAltBackground}>
      <View style={styles.featuresGrid}>
        <Feature emoji="🤝" title={t('legacy.features.feature1Title')} text={t('legacy.features.feature1Text')} />
        <Feature emoji="💬" title={t('legacy.features.feature2Title')} text={t('legacy.features.feature2Text')} />
        <Feature emoji="📍" title={t('legacy.features.feature3Title')} text={t('legacy.features.feature3Text')} greenAccent />
        <Feature emoji="🔒" title={t('legacy.features.feature4Title')} text={t('legacy.features.feature4Text')} />
      </View>
    </Section>
  );
};
