/**
 * @file GallerySection
 * @description Section with community gallery images
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Section } from '../Section';
import { styles } from '../../styles';

/* eslint-disable @typescript-eslint/no-require-imports -- React Native requires require() for image assets */
const foundMoneyImg = require('../../../../assets/images/landingScreen/found-money.png');
const togetherImg = require('../../../../assets/images/landingScreen/together.png');
const toyDonationImg = require('../../../../assets/images/landingScreen/toy_donation.png');
/* eslint-enable @typescript-eslint/no-require-imports */

export const GallerySection: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
    <Section id="section-gallery" title={t('legacy.gallery.title')} subtitle={t('legacy.gallery.subtitle')}>
      <View style={styles.galleryGrid}>
        <Image source={foundMoneyImg} style={styles.galleryImage} resizeMode="cover" />
        <Image source={togetherImg} style={styles.galleryImage} resizeMode="cover" />
        <Image source={toyDonationImg} style={styles.galleryImage} resizeMode="cover" />
      </View>
    </Section>
  );
};
