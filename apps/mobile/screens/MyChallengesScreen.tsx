// My Challenges Screen
// Shows all challenges the user has joined/participating in
// Allows adding entries for each challenge
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import { DailyHabitsQuickView } from '../components/Challenges/DailyHabitsQuickView';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { useToast } from '../utils/toastService';
import { useTranslation } from 'react-i18next';
import { DonationsStackParamList, CommunityChallenge, ChallengeParticipant } from '../globals/types';
import { Ionicons } from '@expo/vector-icons';

export interface MyChallengesScreenProps {
  navigation: NavigationProp<DonationsStackParamList>;
  route?: any;
}

const CHALLENGE_TYPE_OPTIONS = [
  { id: 'BOOLEAN', label: 'כן/לא', icon: 'checkmark-circle-outline' },
  { id: 'NUMERIC', label: 'מספרי', icon: 'calculator-outline' },
  { id: 'DURATION', label: 'זמן', icon: 'time-outline' },
];

const CHALLENGE_DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'קל', icon: 'happy-outline', color: colors.success },
  { id: 'medium', label: 'בינוני', icon: 'bulb-outline', color: colors.warning },
  { id: 'hard', label: 'קשה', icon: 'flame-outline', color: colors.error },
  { id: 'expert', label: 'מומחה', icon: 'trophy-outline', color: colors.primary },
];

type ChallengeWithParticipation = CommunityChallenge & {
  participation?: ChallengeParticipant;
};

export default function MyChallengesScreen({ navigation, route }: MyChallengesScreenProps) {
  const { showToast } = useToast();
  const { t } = useTranslation(['challenges', 'common']);
  const { selectedUser: user } = useUser();
  
  const [challenges, setChallenges] = useState<ChallengeWithParticipation[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<ChallengeWithParticipation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load challenges when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [])
  );

  // Apply search filter
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredChallenges(
        challenges.filter(
          (c) =>
            c.title.toLowerCase().includes(query) ||
            c.description?.toLowerCase().includes(query) ||
            c.category?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredChallenges(challenges);
    }
  }, [searchQuery, challenges]);

  const loadChallenges = async () => {
    if (!user?.id) {
      showToast(t('messages.loginRequired'), 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Get user statistics which includes participations
      const statsResponse = await db.getChallengeStatistics(user.id);
      
      if (statsResponse.success && statsResponse.data && statsResponse.data.challenges) {
        const participations = statsResponse.data.challenges;
        
        // Map to our format
        const challengesWithParticipation = participations.map((item: any) => ({
          id: item.challenge_id,
          creator_id: '',
          title: item.title,
          description: '',
          type: item.type,
          frequency: item.frequency,
          difficulty: item.difficulty,
          category: item.category,
          goal_value: item.goal_value,
          deadline: item.deadline,
          is_active: true,
          participants_count: 0,
          created_at: '',
          updated_at: '',
          participation: {
            id: item.id,
            challenge_id: item.challenge_id,
            user_id: item.user_id,
            joined_at: item.joined_at,
            current_streak: item.current_streak || 0,
            best_streak: item.best_streak || 0,
            total_entries: item.total_entries || 0,
            last_entry_date: item.last_entry_date,
          },
        }));
        
        setChallenges(challengesWithParticipation);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      showToast(t('messages.errorLoading'), 'error');
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  const handleAddEntry = (challenge: ChallengeWithParticipation) => {
    // Navigate to challenge details to add entry
    (navigation as any).navigate('ChallengeDetailsScreen', {
      challengeId: challenge.id,
      openEntryForm: true,
    });
  };

  const handleViewDetails = (challenge: ChallengeWithParticipation) => {
    (navigation as any).navigate('ChallengeDetailsScreen', {
      challengeId: challenge.id,
    });
  };

  const renderChallengeCard = ({ item }: { item: ChallengeWithParticipation }) => {
    const typeOption = CHALLENGE_TYPE_OPTIONS.find((t) => t.id === item.type);
    const difficultyOption = CHALLENGE_DIFFICULTY_OPTIONS.find((d) => d.id === item.difficulty);
    const participation = item.participation;

    return (
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons
              name={typeOption?.icon as any || 'trophy-outline'}
              size={24}
              color={difficultyOption?.color || colors.primary}
            />
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          {difficultyOption && (
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyOption.color }]}>
              <Text style={styles.difficultyText}>{difficultyOption.label}</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Participation Stats */}
        {participation && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={16} color={colors.primary} />
              <Text style={styles.statLabel}>{t('stats.currentStreak')}</Text>
              <Text style={styles.statValue}>{participation.current_streak || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={16} color={colors.warning} />
              <Text style={styles.statLabel}>{t('stats.bestStreak')}</Text>
              <Text style={styles.statValue}>{participation.best_streak || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.success} />
              <Text style={styles.statLabel}>{t('stats.totalEntries')}</Text>
              <Text style={styles.statValue}>{participation.total_entries || 0}</Text>
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={styles.addEntryButton}
          onPress={() => handleAddEntry(item)}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.white} />
          <Text style={styles.addEntryButtonText}>{t('addEntry')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>{t('messages.noJoinedChallenges')}</Text>
      <Text style={styles.emptySubtitle}>{t('messages.noJoinedChallengesSubtitle')}</Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => (navigation as any).navigate('CommunityChallengesScreen', { mode: 'search' })}
      >
        <Ionicons name="search-outline" size={24} color={colors.white} />
        <Text style={styles.browseButtonText}>{t('browseChallenges')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderComp
        mode={true}
        menuOptions={[
          t('challenges:statistics'),
          t('challenges:browseChallenges', 'עיון באתגרים'),
          t('challenges:myCreatedChallenges', 'האתגרים שיצרתי'),
        ]}
        onToggleMode={() => (navigation as any).navigate('CommunityChallengesScreen', { mode: 'search' })}
        onSelectMenuItem={(option) => {
          if (option === t('challenges:statistics')) {
            (navigation as any).navigate('ChallengeStatisticsScreen');
          } else if (option === t('challenges:browseChallenges', 'עיון באתגרים')) {
            (navigation as any).navigate('CommunityChallengesScreen', { mode: 'search' });
          } else if (option === t('challenges:myCreatedChallenges', 'האתגרים שיצרתי')) {
            (navigation as any).navigate('MyCreatedChallengesScreen');
          }
        }}
        title={t('myChallenges')}
        placeholder={t('common:search')}
        filterOptions={[]}
        sortOptions={[]}
        searchData={filteredChallenges}
        onSearch={(query) => setSearchQuery(query)}
        hideSortButton={true}
      />

      <DailyHabitsQuickView
        onBrowseChallenges={() => (navigation as any).navigate('CommunityChallengesScreen', { mode: 'search' })}
      />

      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>{t('challenges:myChallenges', 'האתגרים שלי')}</Text>
      </View>

      <FlatList
        data={filteredChallenges}
        renderItem={renderChallengeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={colors.primary} /> : renderEmptyState()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  challengeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
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
  cardDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addEntryButtonText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
});
