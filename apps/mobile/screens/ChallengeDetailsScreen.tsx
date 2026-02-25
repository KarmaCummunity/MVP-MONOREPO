// Challenge Details Screen
// Shows full challenge information, join button, and entry tracking
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { useToast } from '../utils/toastService';
import { useTranslation } from 'react-i18next';
import {
  CommunityChallenge,
  ChallengeParticipant,
  ChallengeEntry,
  DonationsStackParamList,
} from '../globals/types';
import CommentsModal from '../components/CommentsModal';

type ChallengeDetailsScreenRouteProp = RouteProp<DonationsStackParamList, 'ChallengeDetailsScreen'>;

interface ChallengeDetailsScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

export default function ChallengeDetailsScreen({ navigation }: ChallengeDetailsScreenProps) {
  const route = useRoute<ChallengeDetailsScreenRouteProp>();
  const { challengeId } = route.params;
  const { selectedUser: user } = useUser();
  const { showToast } = useToast();
  const { t } = useTranslation(['challenges', 'common']);

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<CommunityChallenge | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [userParticipation, setUserParticipation] = useState<ChallengeParticipant | null>(null);
  const [recentEntries, setRecentEntries] = useState<ChallengeEntry[]>([]);
  const [isJoined, setIsJoined] = useState(false);

  // Entry form state
  const [entryValue, setEntryValue] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  
  // Comments state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [challengePostId, setChallengePostId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadChallengeDetails();
    }, [challengeId])
  );

  const loadChallengeDetails = async () => {
    try {
      setLoading(true);
      const response = await db.getChallengeDetails(challengeId);

      if (response.success && response.data) {
        setChallenge(response.data);
        setParticipants(response.data.participants || []);

        // Get the post_id for comments (challenges auto-create posts)
        console.log('📝 Challenge post_id:', response.data.post_id);
        if (response.data.post_id) {
          setChallengePostId(response.data.post_id);
        } else {
          console.warn('⚠️ Challenge has no post_id - comments will not be available');
        }

        // Check if user is participating
        if (user?.id) {
          const userPart = response.data.participants?.find(
            (p: ChallengeParticipant) => p.user_id === user.id
          );
          setUserParticipation(userPart || null);
          setIsJoined(!!userPart);

          // Load user's entries if joined
          if (userPart) {
            await loadUserEntries();
          }
        }
      }
    } catch (error) {
      console.error('Error loading challenge details:', error);
      showToast(t('challenges:messages.errorLoading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserEntries = async () => {
    if (!user?.id) return;
    try {
      const response = await db.getChallengeEntries(challengeId, user.id, 10, 0);
      if (response.success && response.data) {
        setRecentEntries(response.data);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const handleJoinChallenge = async () => {
    if (!user?.id) {
      Alert.alert(t('common:error'), t('challenges:messages.loginToJoin'));
      return;
    }

    try {
      setLoading(true);
      const response = await db.joinChallenge(challengeId, user.id);

      if (response.success) {
        showToast(t('challenges:challengeJoined'), 'success');
        await loadChallengeDetails();
      }
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      if (error.message?.includes('Already joined')) {
        showToast(t('challenges:alreadyJoined'), 'info');
      } else {
        showToast(t('challenges:messages.errorJoining'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!user?.id) {
      Alert.alert(t('common:error'), t('challenges:messages.loginRequired'));
      return;
    }

    if (!isJoined) {
      Alert.alert(t('common:error'), 'נא להצטרף לאתגר תחילה');
      return;
    }

    // Validate entry value
    let value = 0;
    if (challenge?.type === 'BOOLEAN') {
      value = 1; // Always 1 for boolean (completed)
    } else {
      const parsedValue = parseFloat(entryValue);
      if (isNaN(parsedValue) || parsedValue < 0) {
        Alert.alert(t('common:error'), 'נא להזין ערך חוקי');
        return;
      }
      value = parsedValue;
    }

    try {
      setSubmittingEntry(true);
      const response = await db.addChallengeEntry(challengeId, {
        user_id: user.id,
        value,
        notes: entryNotes.trim() || undefined,
      });

      if (response.success) {
        const streak = response.data?.current_streak || 0;
        showToast(`${t('challenges:entryAdded')} ${t('challenges:stats.streakDays', { count: streak })}`, 'success');
        
        // Reset form
        setEntryValue('');
        setEntryNotes('');
        setShowEntryModal(false);

        // Reload details
        await loadChallengeDetails();
      }
    } catch (error: any) {
      console.error('Error adding entry:', error);
      if (error.message?.includes('already exists')) {
        showToast(t('challenges:messages.alreadyCompletedToday'), 'info');
      } else {
        showToast(t('challenges:messages.errorAddingEntry'), 'error');
      }
    } finally {
      setSubmittingEntry(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('challenges:details.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('challenges:details.yesterday');
    } else {
      const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return t('challenges:details.daysAgo', { count: daysAgo });
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return colors.success;
      case 'medium':
        return colors.warning;
      case 'hard':
        return colors.error;
      case 'expert':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  if (loading && !challenge) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>{t('challenges:messages.challengeNotFound')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t('common:back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIcon}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('challenges:details.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Challenge Info */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            {challenge.difficulty && (
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(challenge.difficulty) },
                ]}
              >
                <Text style={styles.difficultyText}>
                  {t(`challenges:difficulty.${challenge.difficulty}`)}
                </Text>
              </View>
            )}
          </View>

          {challenge.description && (
            <Text style={styles.challengeDescription}>{challenge.description}</Text>
          )}

          <View style={styles.challengeMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {t('challenges:stats.createdBy')}: {challenge.creator_name || t('common:unknownUser')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {t('challenges:stats.participantsCount', { count: challenge.participants_count })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {t(`challenges:frequency.${challenge.frequency}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Join Button (if not joined) */}
        {!isJoined && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinChallenge}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={24} color={colors.white} />
                <Text style={styles.joinButtonText}>{t('challenges:joinChallenge')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Participation Status (if joined) */}
        {isJoined && (
          <View style={styles.participationCard}>
            <View style={styles.participationHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.participationText}>
                {t('challenges:messages.youAreParticipating', 'אתה משתתף באתגר זה')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewStatsButton}
              onPress={() => (navigation as any).navigate('ChallengeStatisticsScreen')}
            >
              <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
              <Text style={styles.viewStatsText}>{t('challenges:viewStatistics')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Entry Modal */}
        <Modal
          visible={showEntryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEntryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('challenges:addEntryButton')}</Text>
                <TouchableOpacity onPress={() => setShowEntryModal(false)}>
                  <Ionicons name="close" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {challenge.type !== 'BOOLEAN' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('challenges:fields.value')} *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      challenge.type === 'DURATION'
                        ? t('challenges:fields.goalValueMinutes')
                        : t('challenges:fields.goalValuePlaceholder')
                    }
                    value={entryValue}
                    onChangeText={setEntryValue}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('challenges:fields.notes')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('challenges:fields.notesPlaceholder')}
                  value={entryNotes}
                  onChangeText={setEntryNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.addEntryButton, submittingEntry && styles.addEntryButtonDisabled]}
                onPress={handleAddEntry}
                disabled={submittingEntry}
              >
                {submittingEntry ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.white} />
                    <Text style={styles.addEntryButtonText}>{t('challenges:addEntry')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Recent Activity (Anonymous - shows activity without personal data) */}
        {isJoined && (
          <View style={styles.activityCard}>
            <Text style={styles.sectionTitle}>{t('challenges:details.recentActivity', 'פעילות אחרונה')}</Text>
            <Text style={styles.activitySubtitle}>
              {t('challenges:messages.anonymousActivity', 'הביצועים שלך פרטיים ואנונימיים')}
            </Text>
            {recentEntries.length > 0 ? (
              recentEntries.slice(0, 5).map((entry) => (
                <View key={entry.id} style={styles.activityItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.activityDate}>{formatDate(entry.entry_date)}</Text>
                  {entry.notes && (
                    <Text style={styles.activityNote} numberOfLines={1}>
                      - {entry.notes}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noActivityText}>
                {t('challenges:messages.noEntries')}
              </Text>
            )}
          </View>
        )}

        {/* Top Participants */}
        {participants.length > 0 && (
          <View style={styles.participantsCard}>
            <Text style={styles.sectionTitle}>{t('challenges:details.topParticipants')}</Text>
            {participants.slice(0, 5).map((participant, index) => (
              <View key={participant.id} style={styles.participantItem}>
                <View style={styles.participantRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <Text style={styles.participantName}>{participant.user_name || t('common:unknownUser')}</Text>
                <View style={styles.participantStats}>
                  <Ionicons name="flame" size={16} color={colors.error} />
                  <Text style={styles.participantStreak}>{participant.best_streak}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <TouchableOpacity
            style={styles.commentsButton}
            onPress={() => setShowCommentsModal(true)}
            disabled={!challengePostId}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
            <Text style={styles.commentsButtonText}>{t('challenges:viewComments')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.commentsHint}>{t('challenges:commentsHint')}</Text>
        </View>
      </ScrollView>

      {/* Floating Action Button (if joined) */}
      {isJoined && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowEntryModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Comments Modal */}
      {challengePostId && challenge && (
        <CommentsModal
          visible={showCommentsModal}
          postId={challengePostId}
          postTitle={challenge.title || 'אתגר'}
          postUser={{
            id: challenge.creator_id || '',
            name: challenge.creator_name || 'משתמש',
            avatar: 'https://picsum.photos/seed/user/100/100',
          }}
          onClose={() => setShowCommentsModal(false)}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: FontSizes.large,
    color: colors.error,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center' as const,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: FontSizes.medium,
    color: colors.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  challengeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: FontSizes.heading1,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: FontSizes.caption,
    color: colors.white,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  challengeMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  joinButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
  participationCard: {
    backgroundColor: colors.successLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.success,
  },
  participationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  participationText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.success,
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  viewStatsText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top' as const,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
  },
  addEntryButtonDisabled: {
    opacity: 0.6,
  },
  addEntryButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activitySubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic' as const,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityDate: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityNote: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    flex: 1,
  },
  noActivityText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
  participantsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  participantRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    color: colors.primary,
  },
  participantName: {
    flex: 1,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
  },
  participantStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantStreak: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.error,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  commentsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  commentsButtonText: {
    flex: 1,
    fontSize: FontSizes.medium,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  commentsHint: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
