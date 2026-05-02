import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';
import type { LandingStats } from '../types';
import { logger } from '../../../utils/loggerService';
import { StatsDetailModal } from '../modals/StatsDetailModal';

type StatCardKey = keyof LandingStats;

type StatCardConfig = {
  type: StatCardKey;
  valueText: (stats: LandingStats, locale: string) => string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  cardStyle?: object;
};

const STAT_CARD_ORDER: StatCardKey[] = [
  'siteVisits',
  'totalMoneyDonated',
  'totalUsers',
  'itemDonations',
  'completedRides',
  'recurringDonationsAmount',
  'uniqueDonors',
  'completedTasks',
];

function buildStatCards(t: (key: string) => string): StatCardConfig[] {
  return STAT_CARD_ORDER.map((type) => {
    const base = `liveStats.cards.${type}`;
    const label = t(`${base}.label`);
    const valueText = (stats: LandingStats, locale: string) => {
      const n = stats[type];
      if (type === 'totalMoneyDonated' || type === 'recurringDonationsAmount') {
        return `${n.toLocaleString(locale)} ₪`;
      }
      return n.toLocaleString(locale);
    };
    const common = { type, valueText, label } as const;
    switch (type) {
      case 'siteVisits':
        return { ...common, icon: 'eye-outline', color: colors.info };
      case 'totalMoneyDonated':
        return { ...common, icon: 'cash-outline', color: colors.success };
      case 'totalUsers':
        return { ...common, icon: 'heart-outline', color: colors.secondary };
      case 'itemDonations':
        return { ...common, icon: 'cube-outline', color: colors.accent };
      case 'completedRides':
        return {
          ...common,
          icon: 'car-outline',
          color: colors.greenBright,
          cardStyle: { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' },
        };
      case 'recurringDonationsAmount':
        return { ...common, icon: 'repeat-outline', color: colors.success };
      case 'uniqueDonors':
        return { ...common, icon: 'people-outline', color: colors.info };
      case 'completedTasks':
        return {
          ...common,
          icon: 'checkmark-done-outline',
          color: colors.success,
          cardStyle: { backgroundColor: colors.success + '15', borderColor: colors.success + '40' },
        };
      default:
        return { ...common, icon: 'stats-chart-outline', color: colors.info };
    }
  });
}

type StatsSectionProps = Readonly<{
  stats: LandingStats;
  isLoadingStats: boolean;
}>;

export const StatsSection: React.FC<StatsSectionProps> = ({ stats, isLoadingStats }) => {
  const { t, i18n } = useTranslation('landing');
  const locale = i18n.language === 'he' ? 'he-IL' : undefined;
  const statCards = useMemo(() => buildStatCards(t), [t]);

  const [selectedStat, setSelectedStat] = useState<{
    type: StatCardKey;
    title: string;
    value: number;
    icon: string;
    color: string;
  } | null>(null);

  const openStat = (c: StatCardConfig) => {
    logger.info('StatsSection', `Stat card pressed: ${c.type}`);
    const raw = stats[c.type];
    const modalTitle = t(`liveStats.cards.${c.type}.modalTitle`);
    setSelectedStat({
      type: c.type,
      title: modalTitle,
      value: raw,
      icon: c.icon,
      color: c.color,
    });
  };

  return (
    <Section id="section-stats" title={t('liveStats.sectionTitle')} subtitle={t('liveStats.sectionSubtitle')}>
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
          <Text style={styles.statsLoadingText}>{t('liveStats.loading')}</Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {statCards.map((c) => (
            <TouchableOpacity
              key={c.type}
              style={c.cardStyle ? [styles.statCard, c.cardStyle] : styles.statCard}
              onPress={() => openStat(c)}
              activeOpacity={0.7}
            >
              <Ionicons name={c.icon} size={isMobileWeb ? 24 : 32} color={c.color} style={styles.statIcon} />
              <Text style={styles.statNumber}>{c.valueText(stats, locale ?? 'en-US')}</Text>
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
