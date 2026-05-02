// screens/CommunityStatsScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import colors from '../globals/colors';
import { useTranslation } from 'react-i18next';
import { useLogScreenOpened } from '../hooks/useLogScreenOpened';
import { logger } from '../utils/loggerService';
import { DEFAULT_STATS, EnhancedStatsService } from '../utils/statsService';
import type { CommunityStats } from '../utils/statsService';
import { apiService } from '../utils/apiService';
import { parseDashboardMetricsSlice, type DashboardSlice } from '../utils/dashboardStatsSlice';
import { PostMetricCell, StatGridItem, type IonIconName } from './communityStats/CommunityStatsScreenParts';
import { communityStatsIconSize, communityStatsScreenStyles as styles } from './communityStats/communityStatsScreenStyles';

type ImpactStatKey = keyof Pick<
  CommunityStats,
  | 'siteVisits'
  | 'totalMoneyDonated'
  | 'totalUsers'
  | 'itemDonations'
  | 'completedRides'
  | 'recurringDonationsAmount'
  | 'uniqueDonors'
  | 'completedTasks'
>;

type ImpactRowDef = {
  statKey: ImpactStatKey;
  icon: IonIconName;
  color: string;
  format: 'int' | 'money';
};

const IMPACT_ROW_DEFS: ImpactRowDef[] = [
  { statKey: 'siteVisits', icon: 'eye-outline', color: colors.info, format: 'int' },
  { statKey: 'totalMoneyDonated', icon: 'cash-outline', color: colors.success, format: 'money' },
  { statKey: 'totalUsers', icon: 'heart-outline', color: colors.secondary, format: 'int' },
  { statKey: 'itemDonations', icon: 'cube-outline', color: colors.accent, format: 'int' },
  {
    statKey: 'completedRides',
    icon: 'car-outline',
    color: colors.greenBright || colors.success,
    format: 'int',
  },
  { statKey: 'recurringDonationsAmount', icon: 'repeat-outline', color: colors.success, format: 'money' },
  { statKey: 'uniqueDonors', icon: 'people-outline', color: colors.info, format: 'int' },
  { statKey: 'completedTasks', icon: 'checkmark-done-outline', color: colors.success, format: 'int' },
];

function formatInt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMoney(n: number): string {
  return `${formatInt(n)} ₪`;
}

export default function CommunityStatsScreen() {
  useLogScreenOpened('CommunityStatsScreen');
  const { t } = useTranslation('communityStats');
  const { t: tCommon } = useTranslation('common');
  const tabBarHeight = useBottomTabBarHeight() || 0;

  const [mapped, setMapped] = useState<CommunityStats>(() => ({ ...DEFAULT_STATS }));
  const [dashboard, setDashboard] = useState<DashboardSlice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      else setRefreshing(true);

      const [communityStats, dashboardRes] = await Promise.all([
        EnhancedStatsService.getCommunityStats({}, forceRefresh),
        apiService.getDashboardStats(),
      ]);

      setMapped(communityStats);
      const metrics =
        dashboardRes.success && dashboardRes.data && typeof dashboardRes.data === 'object'
          ? (dashboardRes.data as { metrics?: unknown }).metrics
          : null;
      setDashboard(parseDashboardMetricsSlice(metrics as Record<string, string | number | null | undefined>));

      logger.debug('CommunityStatsScreen', 'Stats loaded', { forceRefresh });
    } catch (error) {
      logger.error('CommunityStatsScreen', 'Failed to load stats', { error });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadStats();
    }, [loadStats]),
  );

  const onRefresh = React.useCallback(async () => {
    await loadStats(true);
  }, [loadStats]);

  const bottomSpacerStyle = useMemo(
    () => ({
      height:
        Platform.OS === 'ios'
          ? 24 + tabBarHeight + 40
          : Platform.OS === 'web'
            ? 24 + tabBarHeight + 24
            : 16 + tabBarHeight + 24,
    }),
    [tabBarHeight],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
        <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{tCommon('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const d = dashboard;

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
      <View style={styles.listWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          bounces
          nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          <LinearGradient
            colors={[`${colors.primary}12`, colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroKicker}>{t('subtitle')}</Text>
            <Text style={styles.heroTitle}>{t('title')}</Text>
          </LinearGradient>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>{t('sections.impact')}</Text>
            <View style={styles.statsGrid}>
              {IMPACT_ROW_DEFS.map((row) => {
                const raw = mapped[row.statKey] ?? 0;
                const value = row.format === 'money' ? formatMoney(raw) : formatInt(raw);
                return (
                  <StatGridItem
                    key={row.statKey}
                    icon={row.icon}
                    value={value}
                    label={t(`stats.${row.statKey}`)}
                    color={row.color}
                    accentBar={row.color}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                );
              })}
            </View>
          </View>

          {d ? (
            <>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>{t('sections.posts')}</Text>
                <View style={styles.postsPanel}>
                  <View style={styles.postsRow}>
                    <PostMetricCell value={formatInt(d.posts_total)} label={t('posts.total')} styles={styles} />
                    <PostMetricCell value={formatInt(d.posts_closed)} label={t('posts.closed')} styles={styles} />
                  </View>
                  <View style={styles.postsRow}>
                    <PostMetricCell value={formatInt(d.posts_open)} label={t('posts.open')} styles={styles} />
                    <PostMetricCell
                      value={d.avg_posts_per_user.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                      label={t('posts.avgPerUser')}
                      styles={styles}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>{t('sections.tasks')}</Text>
                <View style={styles.statsGrid}>
                  <StatGridItem
                    icon="list-outline"
                    value={formatInt(d.tasks_open)}
                    label={t('tasks.open')}
                    color={colors.primary}
                    accentBar={colors.primary}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                  <StatGridItem
                    icon="hourglass-outline"
                    value={formatInt(d.tasks_in_progress)}
                    label={t('tasks.inProgress')}
                    color={colors.warning}
                    accentBar={colors.warning}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                  <StatGridItem
                    icon="checkmark-done-outline"
                    value={formatInt(d.tasks_done)}
                    label={t('tasks.done')}
                    color={colors.success}
                    accentBar={colors.success}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                  <StatGridItem
                    icon="stats-chart-outline"
                    value={formatInt(d.tasks_total)}
                    label={t('tasks.total')}
                    color={colors.info}
                    accentBar={colors.info}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>{t('sections.users')}</Text>
                <View style={styles.statsGrid}>
                  <StatGridItem
                    icon="shield-outline"
                    value={formatInt(d.admins_count)}
                    label={t('users.admins')}
                    color={colors.secondary}
                    accentBar={colors.secondary}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                  <StatGridItem
                    icon="people-outline"
                    value={formatInt(d.regular_users_count)}
                    label={t('users.regular')}
                    color={colors.info}
                    accentBar={colors.info}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                  <StatGridItem
                    icon="person-outline"
                    value={formatInt(d.total_users)}
                    label={t('users.total')}
                    color={colors.textSecondary}
                    accentBar={colors.textSecondary}
                    iconSize={communityStatsIconSize}
                    styles={styles}
                  />
                </View>
              </View>

              {(d.total_volunteer_hours > 0 || d.avg_hours_per_user > 0 || d.current_month_hours > 0) && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>{t('sections.volunteering')}</Text>
                  <View style={styles.statsGrid}>
                    {d.total_volunteer_hours > 0 && (
                      <StatGridItem
                        icon="time-outline"
                        value={d.total_volunteer_hours.toFixed(1)}
                        label={t('volunteering.totalHours')}
                        color={colors.accent}
                        accentBar={colors.accent}
                        iconSize={communityStatsIconSize}
                        styles={styles}
                      />
                    )}
                    {d.avg_hours_per_user > 0 && (
                      <StatGridItem
                        icon="stats-chart-outline"
                        value={d.avg_hours_per_user.toFixed(1)}
                        label={t('volunteering.avgPerUser')}
                        color={colors.info}
                        accentBar={colors.info}
                        iconSize={communityStatsIconSize}
                        styles={styles}
                      />
                    )}
                    {d.current_month_hours > 0 && (
                      <StatGridItem
                        icon="calendar-outline"
                        value={d.current_month_hours.toFixed(1)}
                        label={t('volunteering.thisMonth')}
                        color={colors.warning}
                        accentBar={colors.warning}
                        iconSize={communityStatsIconSize}
                        styles={styles}
                      />
                    )}
                  </View>
                </View>
              )}
            </>
          ) : null}

          <View style={bottomSpacerStyle} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
