// Challenge Statistics Screen
// Shows user's personal statistics across all community challenges with interactive charts
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, ProgressChart, PieChart } from 'react-native-chart-kit';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { useToast } from '../utils/toastService';
import { useTranslation } from 'react-i18next';
import { ChallengeStatistics } from '../globals/types';

const screenWidth = Dimensions.get('window').width;

// Animated Card Component
const AnimatedCard: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
};

interface ChallengeStatisticsScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

export default function ChallengeStatisticsScreen({ navigation }: ChallengeStatisticsScreenProps) {
  const { selectedUser: user } = useUser();
  const { showToast } = useToast();
  const { t } = useTranslation(['challenges', 'common']);

  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<ChallengeStatistics | null>(null);

  const loadStatistics = useCallback(async () => {
    if (!user?.id) {
      showToast(t('challenges:messages.loginRequired'), 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await db.getChallengeStatistics(user.id);

      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      showToast(t('challenges:messages.errorLoading'), 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [loadStatistics])
  );

  const overall = statistics?.overall;
  const challenges = statistics?.challenges || [];

  // Chart configuration
  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  // Prepare data for charts
  const streakData = useMemo(() => {
    const sorted = [...challenges].sort((a, b) => b.best_streak - a.best_streak).slice(0, 5);
    return {
      labels: sorted.map((c) => c.title.substring(0, 10) + '...'),
      datasets: [
        {
          data: sorted.map((c) => c.best_streak || 0),
        },
      ],
    };
  }, [challenges]);

  const entriesData = useMemo(() => {
    const sorted = [...challenges].sort((a, b) => b.total_entries - a.total_entries).slice(0, 5);
    return {
      labels: sorted.map((c) => c.title.substring(0, 10) + '...'),
      datasets: [
        {
          data: sorted.map((c) => c.total_entries || 0),
        },
      ],
    };
  }, [challenges]);

  const difficultyDistribution = useMemo(() => {
    const distribution = challenges.reduce(
      (acc, c) => {
        acc[c.difficulty || 'easy'] = (acc[c.difficulty || 'easy'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return [
      {
        name: 'קל',
        population: distribution.easy || 0,
        color: colors.success,
        legendFontColor: colors.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'בינוני',
        population: distribution.medium || 0,
        color: colors.warning,
        legendFontColor: colors.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'קשה',
        population: distribution.hard || 0,
        color: colors.error,
        legendFontColor: colors.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'מומחה',
        population: distribution.expert || 0,
        color: colors.primary,
        legendFontColor: colors.textPrimary,
        legendFontSize: 12,
      },
    ].filter((item) => item.population > 0);
  }, [challenges, colors]);

  const progressData = useMemo(() => {
    const avgProgress = challenges.length > 0
      ? challenges.reduce((sum, c) => {
        const progress = c.goal_value ? Math.min(1, c.total_entries / c.goal_value) : 0.5;
        return sum + progress;
      }, 0) / challenges.length
      : 0;

    return {
      labels: ['ממוצע השלמת יעדים'],
      data: [avgProgress],
    };
  }, [challenges]);

  // Calculate insights
  const insights = useMemo(() => {
    if (challenges.length === 0) return null;

    const totalStreaks = challenges.reduce((sum, c) => sum + (c.current_streak || 0), 0);
    const avgStreak = (totalStreaks / challenges.length).toFixed(1);

    const mostActiveChallenge = challenges.reduce((max, c) =>
      (c.total_entries > max.total_entries ? c : max), challenges[0]);

    const longestStreak = challenges.reduce((max, c) =>
      (c.best_streak > max.best_streak ? c : max), challenges[0]);

    const completionRate = challenges.filter(c =>
      c.goal_value && c.total_entries >= c.goal_value
    ).length;

    return {
      avgStreak,
      mostActiveChallenge: mostActiveChallenge?.title || '',
      longestStreak: longestStreak?.best_streak || 0,
      completionRate,
    };
  }, [challenges]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderComp
        mode={true}
        menuOptions={[
          t('challenges:myChallenges', 'האתגרים שלי'),
          t('challenges:browseChallenges', 'עיון באתגרים'),
          t('challenges:myCreatedChallenges', 'האתגרים שיצרתי'),
        ]}
        onToggleMode={() => navigation.goBack()}
        onSelectMenuItem={(option) => {
          if (option === t('challenges:myChallenges', 'האתגרים שלי')) {
            (navigation as any).navigate('MyChallengesScreen');
          } else if (option === t('challenges:browseChallenges', 'עיון באתגרים')) {
            (navigation as any).navigate('CommunityChallengesScreen', { mode: 'search' });
          } else if (option === t('challenges:myCreatedChallenges', 'האתגרים שיצרתי')) {
            (navigation as any).navigate('MyCreatedChallengesScreen');
          }
        }}
        title={t('challenges:statistics')}
        placeholder={t('common:search')}
        filterOptions={[]}
        sortOptions={[]}
        searchData={[]}
        onSearch={() => { }}
        hideSortButton={true}
      />

      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>{t('challenges:statistics')}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {challenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('challenges:messages.noChallenges')}</Text>
            </View>
          ) : (
            <>
              {/* Overall Statistics */}
              <AnimatedCard delay={0}>
                <View style={styles.overallCard}>
                  <Text style={styles.cardTitle}>{t('challenges:stats.overallSuccess')}</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Ionicons name="trophy-outline" size={32} color={colors.warning} />
                      <Text style={styles.statValue}>{overall?.active_challenges || 0}</Text>
                      <Text style={styles.statLabel}>{t('challenges:stats.activeChallenges')}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="flame-outline" size={32} color={colors.error} />
                      <Text style={styles.statValue}>{overall?.best_streak_overall || 0}</Text>
                      <Text style={styles.statLabel}>{t('challenges:stats.bestStreak')}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="checkmark-done-outline" size={32} color={colors.success} />
                      <Text style={styles.statValue}>{overall?.total_entries || 0}</Text>
                      <Text style={styles.statLabel}>{t('challenges:stats.totalEntries')}</Text>
                    </View>
                  </View>
                </View>
              </AnimatedCard>

              {/* Insights Card */}
              {insights && (
                <AnimatedCard delay={100}>
                  <View style={styles.insightsCard}>
                    <Text style={styles.cardTitle}>
                      <Ionicons name="bulb" size={20} color={colors.warning} /> תובנות
                    </Text>
                    <View style={styles.insightsGrid}>
                      <View style={styles.insightItem}>
                        <Ionicons name="analytics" size={24} color={colors.primary} />
                        <Text style={styles.insightLabel}>ממוצע רצף</Text>
                        <Text style={styles.insightValue}>{insights.avgStreak} ימים</Text>
                      </View>
                      <View style={styles.insightItem}>
                        <Ionicons name="trophy" size={24} color={colors.warning} />
                        <Text style={styles.insightLabel}>רצף הכי ארוך</Text>
                        <Text style={styles.insightValue}>{insights.longestStreak} ימים</Text>
                      </View>
                      <View style={styles.insightItem}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                        <Text style={styles.insightLabel}>אתגרים שהושלמו</Text>
                        <Text style={styles.insightValue}>{insights.completionRate}</Text>
                      </View>
                    </View>
                    {insights.mostActiveChallenge && (
                      <View style={styles.highlightBox}>
                        <Ionicons name="star" size={20} color={colors.warning} />
                        <Text style={styles.highlightText}>
                          האתגר הכי פעיל שלך: <Text style={styles.highlightBold}>{insights.mostActiveChallenge}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                </AnimatedCard>
              )}

              {/* Progress Chart */}
              {progressData.data[0] > 0 && (
                <AnimatedCard delay={200}>
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>
                      <Ionicons name="trending-up" size={20} color={colors.primary} /> השלמת יעדים
                    </Text>
                    <ProgressChart
                      data={progressData}
                      width={screenWidth - 64}
                      height={180}
                      strokeWidth={16}
                      radius={50}
                      chartConfig={chartConfig}
                      hideLegend={false}
                      style={styles.chart}
                    />
                  </View>
                </AnimatedCard>
              )}

              {/* Difficulty Distribution Pie Chart */}
              {difficultyDistribution.length > 0 && (
                <AnimatedCard delay={300}>
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>
                      <Ionicons name="pie-chart" size={20} color={colors.primary} /> התפלגות לפי רמת קושי
                    </Text>
                    <PieChart
                      data={difficultyDistribution}
                      width={screenWidth - 64}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      center={[10, 0]}
                      absolute
                      style={styles.chart}
                    />
                  </View>
                </AnimatedCard>
              )}

              {/* Best Streaks Bar Chart */}
              {streakData.datasets[0].data.length > 0 && streakData.datasets[0].data.some(d => d > 0) && (
                <AnimatedCard delay={400}>
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>
                      <Ionicons name="flame" size={20} color={colors.error} /> הרצפים הטובים ביותר
                    </Text>
                    <BarChart
                      data={streakData}
                      width={screenWidth - 64}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      }}
                      yAxisLabel=""
                      yAxisSuffix=""
                      style={styles.chart}
                      showValuesOnTopOfBars
                      fromZero
                    />
                  </View>
                </AnimatedCard>
              )}

              {/* Total Entries Bar Chart */}
              {entriesData.datasets[0].data.length > 0 && entriesData.datasets[0].data.some(d => d > 0) && (
                <AnimatedCard delay={500}>
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>
                      <Ionicons name="checkmark-done" size={20} color={colors.success} /> סה"כ רשומות לפי אתגר
                    </Text>
                    <BarChart
                      data={entriesData}
                      width={screenWidth - 64}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                      }}
                      yAxisLabel=""
                      yAxisSuffix=""
                      style={styles.chart}
                      showValuesOnTopOfBars
                      fromZero
                    />
                  </View>
                </AnimatedCard>
              )}

              {/* Individual Challenges List */}
              <Text style={styles.sectionTitle}>
                <Ionicons name="list" size={24} color={colors.primary} /> {t('challenges:filters.joined')}
              </Text>
              {challenges.map((challenge) => (
                <View key={challenge.challenge_id} style={styles.challengeCard}>
                  <View style={styles.challengeHeader}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <View
                      style={[
                        styles.difficultyBadge,
                        {
                          backgroundColor:
                            challenge.difficulty === 'easy'
                              ? colors.success
                              : challenge.difficulty === 'medium'
                                ? colors.warning
                                : challenge.difficulty === 'hard'
                                  ? colors.error
                                  : colors.primary,
                        },
                      ]}
                    >
                      <Text style={styles.difficultyText}>
                        {t(`challenges:difficulty.${challenge.difficulty || 'easy'}`)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              100,
                              challenge.goal_value
                                ? (challenge.total_entries / challenge.goal_value) * 100
                                : 50
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.challengeStats}>
                    <View style={styles.miniStat}>
                      <Ionicons name="flame" size={16} color={colors.error} />
                      <Text style={styles.miniStatValue}>{challenge.current_streak}</Text>
                      <Text style={styles.miniStatLabel}>{t('challenges:stats.currentStreak')}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Ionicons name="trophy" size={16} color={colors.warning} />
                      <Text style={styles.miniStatValue}>{challenge.best_streak}</Text>
                      <Text style={styles.miniStatLabel}>{t('challenges:stats.bestStreak')}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Ionicons name="checkmark-done" size={16} color={colors.success} />
                      <Text style={styles.miniStatValue}>{challenge.total_entries}</Text>
                      <Text style={styles.miniStatLabel}>{t('challenges:stats.entries')}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    fontSize: FontSizes.heading1,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  insightItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  insightLabel: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  insightValue: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  highlightText: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    flex: 1,
  },
  highlightBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  cardTitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: FontSizes.heading1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center' as const,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginTop: 16,
  },
  challengeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: FontSizes.caption,
    color: colors.white,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  challengeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  miniStat: {
    alignItems: 'center',
    gap: 4,
  },
  miniStatValue: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  miniStatLabel: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
});
