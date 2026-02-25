import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
});
