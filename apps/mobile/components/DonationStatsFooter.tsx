import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';

export interface DonationStatItem {
  label: string;
  value: string | number;
  icon?: string; // Ionicons name
}

interface DonationStatsFooterProps {
  stats: DonationStatItem[];
  containerStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
}

const DonationStatsFooter: React.FC<DonationStatsFooterProps> = ({ stats, containerStyle, compact = false }) => {
  const { t } = useTranslation(['donations','common']);
  if (!stats || stats.length === 0) return null;

  const topThree = stats.slice(0, 3);

  return (
    <View style={[styles.sectionPanel, compact && styles.sectionPanelCompact]}>

    <View style={[styles.container, compact && styles.containerCompact, containerStyle]}
      accessibilityRole="summary"
      accessibilityLabel={t('donations:statsSummary')}
    >
      <View style={[styles.row, compact && styles.rowCompact]}>
        {topThree.map((s, idx) => (
          <View key={`${s.label}-${idx}`} style={[styles.statChip, compact && styles.statChipCompact]}>
            {s.icon ? (
              <Ionicons name={s.icon as any} size={compact ? 14 : 16} color={colors.textSecondary} style={{ marginBottom: compact ? 2 : 4 }} />
            ) : null}
            <Text style={[styles.statLabel, compact && styles.statLabelCompact]}>{s.label}</Text>
            <Text style={[styles.statValue, compact && styles.statValueCompact]}>{String(s.value)}</Text>
          </View>
        ))}
      </View>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.pinkLight,
    marginTop: 8,
  },
  containerCompact: {
    backgroundColor: 'transparent',
    marginTop: 0,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 6,
  },
  rowCompact: {
    gap: 4,
  },
  sectionPanel: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginVertical: 10,
    marginBottom: 40,

},
  sectionPanelCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginVertical: 4,
    marginBottom: 0,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  statChipCompact: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabelCompact: {
    fontSize: Math.max(FontSizes.caption - 1, 10),
    marginBottom: 1,
  },
  statValue: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statValueCompact: {
    fontSize: Math.max(FontSizes.body - 1, 12),
  },
});

export default DonationStatsFooter;


