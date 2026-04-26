import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import type { LandingStats } from '../types';
import { logger } from '../../../utils/loggerService';
import { StatsDetailModal } from '../modals/StatsDetailModal';

type StatCardConfig = {
  type: string;
  modalTitle: string;
  valueText: (stats: LandingStats) => string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  cardStyle?: object;
};

const STAT_CARDS: StatCardConfig[] = [
  {
    type: 'siteVisits',
    modalTitle: 'ביקורים באתר',
    valueText: (s) => s.siteVisits.toLocaleString('he-IL'),
    label: 'ביקורים באתר',
    icon: 'eye-outline',
    color: colors.info,
  },
  {
    type: 'totalMoneyDonated',
    modalTitle: 'תרומות כספיות',
    valueText: (s) => `${s.totalMoneyDonated.toLocaleString('he-IL')} ₪`,
    label: 'ש"ח שנתרמו ישירות',
    icon: 'cash-outline',
    color: colors.success,
  },
  {
    type: 'totalUsers',
    modalTitle: 'חברי קהילה רשומים',
    valueText: (s) => s.totalUsers.toLocaleString('he-IL'),
    label: 'חברי קהילה רשומים',
    icon: 'heart-outline',
    color: colors.secondary,
  },
  {
    type: 'itemDonations',
    modalTitle: 'פריטים שפורסמו',
    valueText: (s) => s.itemDonations.toLocaleString('he-IL'),
    label: 'פריטים שפורסמו',
    icon: 'cube-outline',
    color: colors.accent,
  },
  {
    type: 'completedRides',
    modalTitle: 'נסיעות קהילתיות',
    valueText: (s) => s.completedRides.toLocaleString('he-IL'),
    label: 'נסיעות קהילתיות',
    icon: 'car-outline',
    color: colors.greenBright,
    cardStyle: { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' },
  },
  {
    type: 'recurringDonationsAmount',
    modalTitle: 'תרומות קבועות',
    valueText: (s) => `${s.recurringDonationsAmount.toLocaleString('he-IL')} ₪`,
    label: 'תרומות קבועות פעילות',
    icon: 'repeat-outline',
    color: colors.success,
  },
  {
    type: 'uniqueDonors',
    modalTitle: 'תורמים פעילים',
    valueText: (s) => s.uniqueDonors.toLocaleString('he-IL'),
    label: 'תורמים פעילים',
    icon: 'people-outline',
    color: colors.info,
  },
  {
    type: 'completedTasks',
    modalTitle: 'משימות שבוצעו',
    valueText: (s) => s.completedTasks.toLocaleString('he-IL'),
    label: 'משימות שבוצעו',
    icon: 'checkmark-done-outline',
    color: colors.success,
    cardStyle: { backgroundColor: colors.success + '15', borderColor: colors.success + '40' },
  },
];

type StatsSectionProps = Readonly<{
  stats: LandingStats;
  isLoadingStats: boolean;
}>;

export const StatsSection: React.FC<StatsSectionProps> = ({ stats, isLoadingStats }) => {
  const [selectedStat, setSelectedStat] = useState<{
    type: string;
    title: string;
    value: number;
    icon: string;
    color: string;
  } | null>(null);

  const openStat = (c: StatCardConfig) => {
    logger.info('StatsSection', `Stat card pressed: ${c.type}`);
    const raw = stats[c.type as keyof LandingStats];
    setSelectedStat({
      type: c.type,
      title: c.modalTitle,
      value: raw,
      icon: c.icon,
      color: c.color,
    });
  };

  return (
    <Section id="section-stats" title="הכוח של הקהילה שלנו" subtitle="השפעה אמיתית, במספרים">
      {selectedStat && (
        <StatsDetailModal
          visible={!!selectedStat}
          onClose={() => setSelectedStat(null)}
          statType={selectedStat.type}
          statTitle={selectedStat.title}
          statValue={selectedStat.value}
          iconName={selectedStat.icon}
          iconColor={selectedStat.color}
        />
      )}

      {isLoadingStats ? (
        <View style={styles.statsLoadingContainer}>
          <ActivityIndicator size="large" color={colors.info} />
          <Text style={styles.statsLoadingText}>טוען נתונים...</Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((c) => (
            <TouchableOpacity
              key={c.type}
              style={c.cardStyle ? [styles.statCard, c.cardStyle] : styles.statCard}
              onPress={() => openStat(c)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={c.icon}
                size={isMobileWeb ? 24 : 32}
                color={c.color}
                style={styles.statIcon}
              />
              <Text style={styles.statNumber}>{c.valueText(stats)}</Text>
              <Text style={styles.statLabel}>{c.label}</Text>
              <Ionicons
                name="chevron-back-outline"
                size={isMobileWeb ? 16 : 20}
                color={colors.textSecondary}
                style={styles.statChevron}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Section>
  );
};
