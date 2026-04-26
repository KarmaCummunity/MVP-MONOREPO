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

export const StatsSection: React.FC<{ stats: LandingStats; isLoadingStats: boolean }> = ({ stats, isLoadingStats }) => {
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
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('siteVisits', 'ביקורים באתר', stats.siteVisits, 'eye-outline', colors.info)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.siteVisits.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>ביקורים באתר</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('totalMoneyDonated', 'תרומות כספיות', stats.totalMoneyDonated, 'cash-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={isMobileWeb ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.totalMoneyDonated.toLocaleString('he-IL')} ₪</Text>
            <Text style={styles.statLabel}>{'ש"ח שנתרמו ישירות'}</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('totalUsers', 'חברי קהילה רשומים', stats.totalUsers, 'heart-outline', colors.secondary)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={isMobileWeb ? 24 : 32} color={colors.secondary} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.totalUsers.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>חברי קהילה רשומים</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('itemDonations', 'פריטים שפורסמו', stats.itemDonations, 'cube-outline', colors.accent)}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={isMobileWeb ? 24 : 32} color={colors.accent} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.itemDonations.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>פריטים שפורסמו</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.greenBright + '15', borderColor: colors.greenBright + '40' }]}
            onPress={() => handleStatPress('completedRides', 'נסיעות קהילתיות', stats.completedRides, 'car-outline', colors.greenBright)}
            activeOpacity={0.7}
          >
            <Ionicons name="car-outline" size={isMobileWeb ? 24 : 32} color={colors.greenBright} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.completedRides.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>נסיעות קהילתיות</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('recurringDonationsAmount', 'תרומות קבועות', stats.recurringDonationsAmount, 'repeat-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="repeat-outline" size={isMobileWeb ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.recurringDonationsAmount.toLocaleString('he-IL')} ₪</Text>
            <Text style={styles.statLabel}>תרומות קבועות פעילות</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleStatPress('uniqueDonors', 'תורמים פעילים', stats.uniqueDonors, 'people-outline', colors.info)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={isMobileWeb ? 24 : 32} color={colors.info} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.uniqueDonors.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>תורמים פעילים</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}
            onPress={() => handleStatPress('completedTasks', 'משימות שבוצעו', stats.completedTasks, 'checkmark-done-outline', colors.success)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={isMobileWeb ? 24 : 32} color={colors.success} style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.completedTasks.toLocaleString('he-IL')}</Text>
            <Text style={styles.statLabel}>משימות שבוצעו</Text>
            <Ionicons name="chevron-back-outline" size={isMobileWeb ? 16 : 20} color={colors.textSecondary} style={styles.statChevron} />
          </TouchableOpacity>
        </View>
      )}

      {/* CTA Button - Go to App */}
      {/* <View style={styles.ctaRow}>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={onGoToApp}
          activeOpacity={0.8}
        >
          <Ionicons name="phone-portrait-outline" size={isMobileWeb ? 16 : 22} color={colors.white} style={styles.ctaIcon} />
          <Text style={styles.primaryCtaText}>עבור לאפליקציה</Text>
        </TouchableOpacity>
      </View> */}
    </Section>
  );
};

