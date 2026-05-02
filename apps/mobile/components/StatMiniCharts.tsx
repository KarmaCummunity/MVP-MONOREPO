import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';

interface StatMiniChartsProps {
  breakdown?: Array<{ label: string; value: number }>;
  trend?: number[];
  accentColor?: string;
}

const StatMiniCharts: React.FC<StatMiniChartsProps> = ({ breakdown, trend, accentColor = colors.info }) => {
  const maxBreakdown = breakdown && breakdown.length > 0 ? Math.max(...breakdown.map(b => b.value)) : 0;
  const maxTrend = trend && trend.length > 0 ? Math.max(...trend) : 0;

  return (
    <View style={styles.container}>
      {breakdown && breakdown.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>{(require('i18next') as any).t('home:statsDetails.bullets.byCities')}</Text>
          <View style={styles.breakdownList}>
            {breakdown.slice(0, 5).map((b, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={styles.label}>{b.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${maxBreakdown ? (b.value / maxBreakdown) * 100 : 0}%`, backgroundColor: accentColor }]} />
                </View>
                <Text style={styles.value}>{b.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {trend && trend.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>{(require('i18next') as any).t('home:statsDetails.bullets.trends')}</Text>
          <View style={styles.trendRow}>
            {trend.map((v, idx) => (
              <View key={idx} style={styles.trendCol}>
                <View style={[styles.trendBar, { height: Math.max(6, maxTrend ? (v / maxTrend) * 60 : 0), backgroundColor: accentColor }]} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  breakdownList: {
    gap: 8,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 80,
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    width: 40,
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'left',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 70,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});

export default StatMiniCharts;


