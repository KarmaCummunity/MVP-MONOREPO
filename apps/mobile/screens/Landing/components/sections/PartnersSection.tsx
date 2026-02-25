/**
 * @file PartnersSection
 * @description Section showcasing partner organizations
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Section } from '../Section';
import { styles } from '../../styles';

/* eslint-disable @typescript-eslint/no-require-imports -- React Native requires require() for image assets */
const jgiveLogoImg = require('../../../../assets/images/landingScreen/jgive-logo.png');
/* eslint-enable @typescript-eslint/no-require-imports */

export const PartnersSection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-partners" title={t('legacy.partners.title')} subtitle={t('legacy.partners.subtitle')} style={styles.sectionAltBackground}>
      <View style={styles.partnersContainer}>
        <View style={styles.partnerCard}>
          <Image source={jgiveLogoImg} style={styles.partnerLogo} resizeMode="contain" />
        </View>
      </View>
    </Section>
  );
};
