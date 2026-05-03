import React from 'react';
import { Image, View } from 'react-native';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';

export const PartnersSection = () => (
  <Section title="ביחד יוצרים שינוי" subtitle="גאים לשתף פעולה עם ארגונים שחולקים את החזון שלנו" style={styles.sectionAltBackground}>
    <View style={styles.partnersContainer}>
      <View style={styles.partnerCard}>
        <Image source={require('../../../assets/images/landingScreen/jgive-logo.png')} style={styles.partnerLogo} resizeMode="contain" />
      </View>
    </View>
  </Section>
);

