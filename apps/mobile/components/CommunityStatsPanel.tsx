import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.7;
const MIN_HEIGHT = 80;

interface StatItemProps {
  icon: string;
  value: string;
  label: string;
  color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, color = colors.info }) => (
  <View style={styles.statItem}>
    <Ionicons name={icon as any} size={32} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function CommunityStatsPanel() {
  const { t } = useTranslation(['home']);
  const translateY = useSharedValue(PANEL_HEIGHT - MIN_HEIGHT);
  const isExpanded = useSharedValue(false);

  const { isRealAuth } = useUser();
  if (isRealAuth) return null;

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      const newY = translateY.value + event.translationY;
      if (newY >= 0 && newY <= PANEL_HEIGHT - MIN_HEIGHT) {
        translateY.value = newY;
      }
    })
    .onEnd((event) => {
      if (event.velocityY < -500) {
        // Fast swipe up
        translateY.value = withSpring(0);
        isExpanded.value = true;
      } else if (event.velocityY > 500) {
        // Fast swipe down
        translateY.value = withSpring(PANEL_HEIGHT - MIN_HEIGHT);
        isExpanded.value = false;
      } else {
        // Check position
        if (translateY.value < (PANEL_HEIGHT - MIN_HEIGHT) / 2) {
          translateY.value = withSpring(0);
          isExpanded.value = true;
        } else {
          translateY.value = withSpring(PANEL_HEIGHT - MIN_HEIGHT);
          isExpanded.value = false;
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateY.value,
      [0, PANEL_HEIGHT - MIN_HEIGHT],
      [180, 0]
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  if (isRealAuth) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t('home:stats.title')}</Text>
            <Animated.View style={handleStyle}>
              <Ionicons name="chevron-up" size={24} color={colors.textSecondary} />
            </Animated.View>
          </View>
        </View>
      </GestureDetector>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Real-time stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home:statsDetails.realTimeData')}</Text>
          <View style={styles.statsGrid}>
            <StatItem icon="people" value="3,847" label={t('home:stats.activeMembers') as string} />
            <StatItem icon="heart" value="12,456" label={t('home:stats.monthlyDonations') as string} color={colors.secondary} />
            <StatItem icon="trending-up" value="+23%" label={t('home:stats.monthlyGrowth') as string} color={colors.success} />
            <StatItem icon="globe" value="42" label={t('home:stats.activeCities') as string} color={colors.info} />
          </View>
        </View>

        {/* Impact stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home:stats.communityImpact')}</Text>
          <View style={styles.impactCard}>
            <View style={styles.impactRow}>
              <Ionicons name="car" size={24} color={colors.info} />
              <Text style={styles.impactText}>2,341 {t('home:stats.sharedRides')}</Text>
            </View>
            <View style={styles.impactRow}>
              <Ionicons name="restaurant" size={24} color={colors.secondary} />
              <Text style={styles.impactText}>5,678 {t('home:stats.donatedMeals')}</Text>
            </View>
            <View style={styles.impactRow}>
              <Ionicons name="school" size={24} color={colors.warning} />
              <Text style={styles.impactText}>892 {t('home:stats.mentoringHours')}</Text>
            </View>
            <View style={styles.impactRow}>
              <Ionicons name="home" size={24} color={colors.legacyMediumPurple} />
              <Text style={styles.impactText}>156 {t('home:stats.supportedFamilies')}</Text>
            </View>
          </View>
        </View>

        {/* Top contributors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home:stats.topContributors')}</Text>
          <View style={styles.leaderboard}>
            {[t('home:names.david'), t('home:names.sarah'), t('home:names.moshe'), t('home:names.rachel'), t('home:names.yosef')].map((name, index) => (
              <View key={index} style={styles.leaderItem}>
                <View style={styles.leaderRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.leaderName}>{name}</Text>
                <View style={styles.leaderStats}>
                  <Ionicons name="star" size={16} color={colors.legacyMediumYellow} />
                  <Text style={styles.pointsText}>{1500 - index * 200} {t('home:stats.pointsSuffix')}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Activity graph placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home:stats.weeklyActivity')}</Text>
          <View style={styles.graphPlaceholder}>
            <Text style={styles.graphText}>{t('home:stats.activityGraphPlaceholder')}</Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginTop: 4,
  },
  impactCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  leaderboard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leaderRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: FontSizes.body,
  },
  leaderName: {
    flex: 1,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
  },
  leaderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  graphPlaceholder: {
    height: 150,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphText: {
    color: colors.textSecondary,
    fontSize: FontSizes.body,
  },
}); 