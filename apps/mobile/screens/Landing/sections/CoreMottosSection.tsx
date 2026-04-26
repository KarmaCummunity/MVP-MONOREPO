import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const CoreMottosSection = () => (
  <Section id="section-core-mottos" title="העקרונות המנחים שלנו" subtitle="מה שמניע אותנו קדימה">
    <View style={styles.coreMottosContainer}>
      <View style={styles.coreMottoItem}>
        <Ionicons name="sparkles" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.coreMottoIcon} />
        <Text style={styles.coreMottoText}>השאריות של האחד יכול להיות האוצר של מישהו אחר</Text>
      </View>

      <View style={[styles.coreMottoItem, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '50' }]}>
        <Ionicons name="heart-circle" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.coreMottoIcon} />
        <Text style={styles.coreMottoText}>לכל אחד מאיתנו יש משהו לתת וגם משהו שהוא היה שמח לקבל</Text>
      </View>

      <View style={styles.coreMottoItem}>
        <Ionicons name="swap-horizontal" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.coreMottoIcon} />
        <Text style={styles.coreMottoText}>לתת זה גם לקבל</Text>
      </View>
    </View>
  </Section>
);

