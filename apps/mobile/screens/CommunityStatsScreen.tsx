// screens/CommunityStatsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { useLogScreenOpened } from '../hooks/useLogScreenOpened';
import { logger } from '../utils/loggerService';
import { DEFAULT_STATS, EnhancedStatsService } from '../utils/statsService';
import type { CommunityStats as MappedCommunityStats } from '../utils/statsService';
import { apiService } from '../utils/apiService';

const { width } = Dimensions.get('window');

const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 768;
const isLargeScreen = width >= 768;

const getResponsiveCardWidth = () => {
  if (isLargeScreen) return (width - 64 - 24) / 3;
  if (isMediumScreen) return (width - 48 - 16) / 2;
  return (width - 32 - 12) / 2;
};

const getResponsivePadding = () => {
  if (isLargeScreen) return 24;
  if (isMediumScreen) return 20;
  return 16;
};

const getResponsiveFontSize = (base: number) => {
  if (isSmallScreen) return base * 0.9;
  if (isLargeScreen) return base * 1.1;
  return base;
};

interface StatItemProps {
  icon: string;
  value: string;
  label: string;
  color?: string;
  accentBar?: string;
}

const StatItem: React.FC<StatItemProps> = ({
  icon,
  value,
  label,
  color = colors.info,
  accentBar,
}) => (
  <View style={styles.statCardOuter}>
    {accentBar ? <View style={[styles.statAccentBar, { backgroundColor: accentBar }]} /> : null}
    <View style={styles.statItem}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={isSmallScreen ? 22 : 26} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={3}>
        {label}
      </Text>
    </View>
  </View>
);

interface PostMiniProps {
  value: string;
  label: string;
}

const PostMini: React.FC<PostMiniProps> = ({ value, label }) => (
  <View style={styles.postMini}>
    <Text style={styles.postMiniValue}>{value}</Text>
    <Text style={styles.postMiniLabel} numberOfLines={2}>
      {label}
    </Text>
  </View>
);

interface DashboardSlice {
  tasks_open: number;
  tasks_in_progress: number;
  tasks_done: number;
  tasks_total: number;
  admins_count: number;
  regular_users_count: number;
  total_users: number;
  total_volunteer_hours: number;
  avg_hours_per_user: number;
  current_month_hours: number;
  posts_total: number;
  posts_open: number;
  posts_closed: number;
  avg_posts_per_user: number;
}

export default function CommunityStatsScreen() {
  useLogScreenOpened('CommunityStatsScreen');
  const { t } = useTranslation('communityStats');
  const { t: tCommon } = useTranslation('common');
  const tabBarHeight = useBottomTabBarHeight() || 0;

  const [mapped, setMapped] = useState<MappedCommunityStats>(() => ({ ...DEFAULT_STATS }));
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
      const m = dashboardRes.success && dashboardRes.data?.metrics ? dashboardRes.data.metrics : null;

      setMapped(communityStats);
      setDashboard(
        m
          ? {
              tasks_open: Number(m.tasks_open) || 0,
              tasks_in_progress: Number(m.tasks_in_progress) || 0,
              tasks_done: Number(m.tasks_done) || 0,
              tasks_total: Number(m.tasks_total) || 0,
              admins_count: Number(m.admins_count) || 0,
              regular_users_count: Number(m.regular_users_count) || 0,
              total_users: Number(m.total_users) || 0,
              total_volunteer_hours: Number(m.total_volunteer_hours) || 0,
              avg_hours_per_user: Number(m.avg_hours_per_user) || 0,
              current_month_hours: Number(m.current_month_hours) || 0,
              posts_total: m.posts_total != null ? Number(m.posts_total) : 0,
              posts_open: m.posts_open != null ? Number(m.posts_open) : 0,
              posts_closed: m.posts_closed != null ? Number(m.posts_closed) : 0,
              avg_posts_per_user: m.avg_posts_per_user != null ? Number(m.avg_posts_per_user) : 0,
            }
          : null,
      );

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

  const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
    n.toLocaleString(undefined, opts ?? { maximumFractionDigits: 0 });

  const money = (n: number) => `${fmt(n)} ₪`;

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
  const itemCount = mapped.itemDonations ?? 0;
  const ridesCount = mapped.completedRides ?? 0;
  const tasksDone = mapped.completedTasks ?? 0;

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

          {/* Impact — single source from community stats API (no duplicate rides/items block) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>{t('sections.impact')}</Text>
            <View style={styles.statsGrid}>
              <StatItem
                icon="eye-outline"
                value={fmt(mapped.siteVisits ?? 0)}
                label={t('stats.siteVisits')}
                color={colors.info}
                accentBar={colors.info}
              />
              <StatItem
                icon="cash-outline"
                value={money(mapped.totalMoneyDonated ?? 0)}
                label={t('stats.totalMoneyDonated')}
                color={colors.success}
                accentBar={colors.success}
              />
              <StatItem
                icon="heart-outline"
                value={fmt(mapped.totalUsers ?? 0)}
                label={t('stats.totalUsers')}
                color={colors.secondary}
                accentBar={colors.secondary}
              />
              <StatItem
                icon="cube-outline"
                value={fmt(itemCount)}
                label={t('stats.itemDonations')}
                color={colors.accent}
                accentBar={colors.accent}
              />
              <StatItem
                icon="car-outline"
                value={fmt(ridesCount)}
                label={t('stats.completedRides')}
                color={colors.greenBright || colors.success}
                accentBar={colors.greenBright || colors.success}
              />
              <StatItem
                icon="repeat-outline"
                value={money(mapped.recurringDonationsAmount ?? 0)}
                label={t('stats.recurringDonationsAmount')}
                color={colors.success}
                accentBar={colors.success}
              />
              <StatItem
                icon="people-outline"
                value={fmt(mapped.uniqueDonors ?? 0)}
                label={t('stats.uniqueDonors')}
                color={colors.info}
                accentBar={colors.info}
              />
              <StatItem
                icon="checkmark-done-outline"
                value={fmt(tasksDone)}
                label={t('stats.completedTasks')}
                color={colors.success}
                accentBar={colors.success}
              />
            </View>
          </View>

          {d ? (
            <>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>{t('sections.posts')}</Text>
                <View style={styles.postsPanel}>
                  <View style={styles.postsRow}>
                    <PostMini value={fmt(d.posts_total)} label={t('posts.total')} />
                    <PostMini value={fmt(d.posts_closed)} label={t('posts.closed')} />
                  </View>
                  <View style={styles.postsRow}>
                    <PostMini value={fmt(d.posts_open)} label={t('posts.open')} />
                    <PostMini
                      value={d.avg_posts_per_user.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                      label={t('posts.avgPerUser')}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>{t('sections.tasks')}</Text>
                <View style={styles.statsGrid}>
                  <StatItem
                    icon="list-outline"
                    value={fmt(d.tasks_open)}
                    label={t('tasks.open')}
                    color={colors.primary}
                    accentBar={colors.primary}
                  />
                  <StatItem
                    icon="hourglass-outline"
                    value={fmt(d.tasks_in_progress)}
                    label={t('tasks.inProgress')}
                    color={colors.warning}
                    accentBar={colors.warning}
                  />
                  <StatItem
                    icon="checkmark-done-outline"
                    value={fmt(d.tasks_done)}
                    label={t('tasks.done')}
                    color={colors.success}
                    accentBar={colors.success}
                  />
                  <StatItem
                    icon="stats-chart-outline"
                    value={fmt(d.tasks_total)}
                    label={t('tasks.total')}
                    color={colors.info}
                    accentBar={colors.info}
                  />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>{t('sections.users')}</Text>
                <View style={styles.statsGrid}>
                  <StatItem
                    icon="shield-outline"
                    value={fmt(d.admins_count)}
                    label={t('users.admins')}
                    color={colors.secondary}
                    accentBar={colors.secondary}
                  />
                  <StatItem
                    icon="people-outline"
                    value={fmt(d.regular_users_count)}
                    label={t('users.regular')}
                    color={colors.info}
                    accentBar={colors.info}
                  />
                  <StatItem
                    icon="person-outline"
                    value={fmt(d.total_users)}
                    label={t('users.total')}
                    color={colors.textSecondary}
                    accentBar={colors.textSecondary}
                  />
                </View>
              </View>

              {(d.total_volunteer_hours > 0 || d.avg_hours_per_user > 0 || d.current_month_hours > 0) && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>{t('sections.volunteering')}</Text>
                  <View style={styles.statsGrid}>
                    {d.total_volunteer_hours > 0 && (
                      <StatItem
                        icon="time-outline"
                        value={d.total_volunteer_hours.toFixed(1)}
                        label={t('volunteering.totalHours')}
                        color={colors.accent}
                        accentBar={colors.accent}
                      />
                    )}
                    {d.avg_hours_per_user > 0 && (
                      <StatItem
                        icon="stats-chart-outline"
                        value={d.avg_hours_per_user.toFixed(1)}
                        label={t('volunteering.avgPerUser')}
                        color={colors.info}
                        accentBar={colors.info}
                      />
                    )}
                    {d.current_month_hours > 0 && (
                      <StatItem
                        icon="calendar-outline"
                        value={d.current_month_hours.toFixed(1)}
                        label={t('volunteering.thisMonth')}
                        color={colors.warning}
                        accentBar={colors.warning}
                      />
                    )}
                  </View>
                </View>
              )}
            </>
          ) : null}

          <View
            style={{
              height:
                Platform.OS === 'ios'
                  ? 24 + tabBarHeight + 40
                  : Platform.OS === 'web'
                    ? 24 + tabBarHeight + 24
                    : 16 + tabBarHeight + 24,
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const responsivePadding = getResponsivePadding();
const cardWidth = getResponsiveCardWidth();

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: getResponsiveFontSize(FontSizes.body),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  hero: {
    paddingHorizontal: responsivePadding,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  heroKicker: {
    fontSize: getResponsiveFontSize(FontSizes.small),
    color: colors.textSecondary,
    textAlign: 'right',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 6,
    fontSize: getResponsiveFontSize(FontSizes.heading1),
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  sectionBlock: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: responsivePadding,
  },
  sectionHeading: {
    fontSize: getResponsiveFontSize(FontSizes.heading3),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
    marginTop: 8,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 10 : 14,
  },
  statCardOuter: {
    width: cardWidth,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.neutralBorderSoft || colors.border,
  },
  statAccentBar: {
    height: 3,
    width: '100%',
  },
  statItem: {
    padding: isSmallScreen ? 14 : 18,
    alignItems: 'center',
    minHeight: isSmallScreen ? 112 : 128,
    justifyContent: 'center',
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: getResponsiveFontSize(FontSizes.heading2),
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: getResponsiveFontSize(FontSizes.small),
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  postsPanel: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutralBorderSoft || colors.border,
    gap: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  postMini: {
    flex: 1,
    backgroundColor: colors.surfaceGrayBlue || colors.backgroundSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceGrayBlueBorder || colors.border,
  },
  postMiniValue: {
    fontSize: getResponsiveFontSize(FontSizes.heading3),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  postMiniLabel: {
    marginTop: 6,
    fontSize: getResponsiveFontSize(FontSizes.small),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
