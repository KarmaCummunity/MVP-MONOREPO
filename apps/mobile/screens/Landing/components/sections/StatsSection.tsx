/**
 * @file StatsSection
 * @description Statistics section with community impact numbers
 * @module Landing/Components/Sections
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../../globals/colors';
import { logger } from '../../../../utils/loggerService';
import { Section } from '../Section';
import { StatsDetailModal } from '../modals/StatsDetailModal';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';
import type { LandingStats } from '../../types';

interface StatsSectionProps {
  stats: LandingStats;
  isLoadingStats: boolean;
  onGoToApp: () => void;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats, isLoadingStats }) => {
  const { t } = useTranslation('landing');
  const [selectedStat, setSelectedStat] = useState<{
    type: string;
    title: string;
    value: number;
    icon: string;
    color: string;
  } | null>(null);

  const handleStatPress = (type: string, title: string, value: number, icon: string, color: string) => {
    logger.info('StatsSection', `Stat card pressed: ${type}`);
    setSelectedStat({ type, title, value, icon, color });
  };

  return (
    <Section id="section-stats" title={t('legacy.stats.sectionTitle')} subtitle={t('legacy.stats.sectionSubtitle')}>
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
          <Text style={styles.statsLoadingText}>{t('legacy.stats.loading')}</Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('siteVisits', t('legacy.stats.siteVisits'), stats.siteVisits, 'eye-outline', colors.info)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.info} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.siteVisits.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.siteVisits')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('totalMoneyDonated', t('legacy.stats.totalMoneyDonated'), stats.totalMoneyDonated, 'cash-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.totalMoneyDonated.toLocaleString('he-IL')} ₪</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.moneyLabel')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('totalUsers', t('legacy.stats.totalUsers'), stats.totalUsers, 'heart-outline', colors.secondary)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.secondary} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.totalUsers.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.totalUsers')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('itemDonations', t('legacy.stats.itemDonations'), stats.itemDonations, 'cube-outline', colors.accent)}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.accent} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.itemDonations.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.itemDonations')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' }]}
            onPress={() => handleStatPress('completedRides', t('legacy.stats.completedRides'), stats.completedRides, 'car-outline', colors.greenBright)}
            activeOpacity={0.7}
          >
            <Ionicons name="car-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.greenBright} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.completedRides.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.completedRides')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('recurringDonationsAmount', t('legacy.stats.recurringDonations'), stats.recurringDonationsAmount, 'repeat-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="repeat-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.recurringDonationsAmount.toLocaleString('he-IL')} ₪</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.recurringDonationsActive')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('uniqueDonors', t('legacy.stats.uniqueDonors'), stats.uniqueDonors, 'people-outline', colors.info)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.info} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.uniqueDonors.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.uniqueDonors')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}
            onPress={() => handleStatPress('completedTasks', t('legacy.stats.completedTasks'), stats.completedTasks, 'checkmark-done-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={IS_MOBILE_WEB ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.completedTasks.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>{t('legacy.stats.completedTasks')}</Text>
            <Ionicons name="chevron-back-outline" size={IS_MOBILE_WEB ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>
        </View>
      )}
    </Section>
  );
};
