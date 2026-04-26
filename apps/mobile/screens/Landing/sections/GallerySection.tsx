import React from 'react';
import { Image, View } from 'react-native';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';

export const GallerySection = () => (
  <Section title="רגעים מהקהילה" subtitle="תמונות ששוות אלף מילים">
    <View style={styles.galleryGrid}>
      <Image source={require('../../../assets/images/landingScreen/found-money.png')} style={styles.galleryImage} resizeMode="cover" />
      <Image source={require('../../../assets/images/landingScreen/together.png')} style={styles.galleryImage} resizeMode="cover" />
      <Image source={require('../../../assets/images/landingScreen/toy_donation.png')} style={styles.galleryImage} resizeMode="cover" />
    </View>
  </Section>
);

