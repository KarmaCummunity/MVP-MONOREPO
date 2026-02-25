import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import AddLinkComponent from '../components/AddLinkComponent';

export default function LanguagesScreen() {
  const { t } = useTranslation(['donations']);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{t('donations:categories.languages.title')}</Text>
      <Text style={styles.subtitle}>{t('donations:categories.languages.subtitle')}</Text>
      <Text style={styles.description}>{t('donations:categories.languages.description')}</Text>
      
      {/* Add Links Section */}
      <View style={styles.linksSection}>
        <Text style={styles.sectionTitle}>קישורים שימושיים</Text>
        <AddLinkComponent category="languages" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    paddingBottom: LAYOUT_CONSTANTS.SPACING.XL * 2,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Math.round(FontSizes.body * 1.4),
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
  },
  linksSection: {
    marginTop: LAYOUT_CONSTANTS.SPACING.LG,
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'center',
  },
});
