// My Created Challenges Screen
// Shows all challenges created by the current user
// Allows editing and deleting of created challenges
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
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { useToast } from '../utils/toastService';
import { useTranslation } from 'react-i18next';
import { DonationsStackParamList, CommunityChallenge } from '../globals/types';
import { Ionicons } from '@expo/vector-icons';
import EditChallengeModal from '../components/Challenges/EditChallengeModal';

export interface MyCreatedChallengesScreenProps {
  navigation: NavigationProp<DonationsStackParamList>;
  route?: any;
}

const CHALLENGE_TYPE_OPTIONS = [
  { id: 'BOOLEAN', icon: 'checkmark-circle-outline' },
  { id: 'NUMERIC', icon: 'calculator-outline' },
  { id: 'DURATION', icon: 'time-outline' },
];

const CHALLENGE_DIFFICULTY_OPTIONS = [
  { id: 'easy', icon: 'happy-outline', color: colors.success },
  { id: 'medium', icon: 'bulb-outline', color: colors.warning },
  { id: 'hard', icon: 'flame-outline', color: colors.error },
  { id: 'expert', icon: 'trophy-outline', color: colors.primary },
];

export default function MyCreatedChallengesScreen({ navigation, route }: MyCreatedChallengesScreenProps) {
  const { showToast } = useToast();
  const { t } = useTranslation(['challenges', 'common']);
  const { selectedUser: user } = useUser();
  
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<CommunityChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<CommunityChallenge | null>(null);

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
      const filters = {
        creator_id: user.id,
        sort_by: 'created_at',
        sort_order: 'DESC' as const,
        limit: 100,
      };
      
      const response = await db.getCommunityChallenges(filters);
      
      if (response.success && response.data) {
        setChallenges(response.data);
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

  const handleEditChallenge = (challenge: CommunityChallenge) => {
    setSelectedChallenge(challenge);
    setEditModalVisible(true);
  };

  const handleUpdateChallenge = async () => {
    await loadChallenges();
  };

  const handleDeleteChallenge = (challenge: CommunityChallenge) => {
    Alert.alert(
      t('deleteChallenge'),
      t('deleteChallengeConfirm', { title: challenge.title }),
      [
        {
          text: t('common:cancel'),
          style: 'cancel',
        },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            
            try {
              setLoading(true);
              const response = await db.deleteCommunityChallenge(challenge.id, user.id);
              
              if (response.success) {
                showToast(t('challengeDeleted'), 'success');
                await loadChallenges();
              } else {
                showToast(t('messages.errorDeleting'), 'error');
              }
            } catch (error) {
              console.error('Error deleting challenge:', error);
              showToast(t('messages.errorDeleting'), 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderChallengeCard = ({ item }: { item: CommunityChallenge }) => {
    const typeOption = CHALLENGE_TYPE_OPTIONS.find((opt) => opt.id === item.type);
    const difficultyOption = CHALLENGE_DIFFICULTY_OPTIONS.find((d) => d.id === item.difficulty);

    return (
      <View style={styles.challengeCard}>
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
              <Text style={styles.difficultyText}>{difficultyOption ? t(`challenges:difficulty.${difficultyOption.id}`) : item.difficulty}</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{t('stats.participantsCount', { count: item.participants_count })}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name={item.is_active ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={item.is_active ? colors.success : colors.error}
            />
            <Text style={styles.metaText}>
              {item.is_active ? t('active') : t('inactive')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditChallenge(item)}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.white} />
            <Text style={styles.actionButtonText}>{t('edit')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteChallenge(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.white} />
            <Text style={styles.actionButtonText}>{t('delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>{t('messages.noCreatedChallenges')}</Text>
      <Text style={styles.emptySubtitle}>{t('messages.noCreatedChallengesSubtitle')}</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => (navigation as any).navigate('CommunityChallengesScreen', { mode: 'offer' })}
      >
        <Ionicons name="add-circle-outline" size={24} color={colors.white} />
        <Text style={styles.createButtonText}>{t('createNewChallenge')}</Text>
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
          t('challenges:myChallenges', 'האתגרים שלי'),
        ]}
        onToggleMode={() => (navigation as any).navigate('CommunityChallengesScreen', { mode: 'offer' })}
        onSelectMenuItem={(option) => {
          if (option === t('challenges:statistics')) {
            (navigation as any).navigate('ChallengeStatisticsScreen');
          } else if (option === t('challenges:browseChallenges', 'עיון באתגרים')) {
            (navigation as any).navigate('CommunityChallengesScreen', { mode: 'search' });
          } else if (option === t('challenges:myChallenges', 'האתגרים שלי')) {
            (navigation as any).navigate('MyChallengesScreen');
          }
        }}
        title={t('myCreatedChallenges')}
        placeholder={t('common:search')}
        filterOptions={[]}
        sortOptions={[]}
        searchData={filteredChallenges}
        onSearch={(query) => setSearchQuery(query)}
        hideSortButton={true}
      />
      
      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>{t('challenges:myCreatedChallenges', 'האתגרים שיצרתי')}</Text>
      </View>
      
      <FlatList
        data={filteredChallenges}
        renderItem={renderChallengeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={colors.primary} /> : renderEmptyState()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Edit Modal */}
      {selectedChallenge && (
        <EditChallengeModal
          visible={editModalVisible}
          challenge={selectedChallenge}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedChallenge(null);
          }}
          onUpdate={handleUpdateChallenge}
        />
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
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
});
