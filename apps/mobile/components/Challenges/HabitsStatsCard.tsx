import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import colors from '../../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../../globals/constants';

interface HabitsStatsCardProps {
  successRate: number | null;
  currentStreak: number;
  activeChallenges: number;
}

export const HabitsStatsCard: React.FC<HabitsStatsCardProps> = ({
  successRate,
  currentStreak,
  activeChallenges
}) => {
  const { t } = useTranslation('challenges');
  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {successRate !== null ? `${Math.round(successRate)}%` : t('stats.noData')}
        </Text>
        <Text style={styles.statLabel}>{t('stats.successRate')}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <Text style={styles.statValue}>{currentStreak}</Text>
        <Text style={styles.statLabel}>{t('stats.currentStreak')}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statItem}>
        <Text style={styles.statValue}>{activeChallenges}</Text>
        <Text style={styles.statLabel}>{t('stats.activeChallenges')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    marginHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    marginVertical: LAYOUT_CONSTANTS.SPACING.SM,
    ...LAYOUT_CONSTANTS.SHADOW.LIGHT,
    shadowColor: colors.shadow,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  statLabel: {
    fontSize: FontSizes.small,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});
