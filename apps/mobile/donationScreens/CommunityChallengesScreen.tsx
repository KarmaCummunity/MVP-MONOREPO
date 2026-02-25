// Community Challenges Screen
// Main screen for community challenges - similar to ItemsScreen structure
// Supports two modes: Search (browse challenges) and Offer (create new challenge)
import React, { useCallback, useEffect, useState } from 'react';
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
  TextInput,
  Image,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import ScrollContainer from '../components/ScrollContainer';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { useToast } from '../utils/toastService';
import { useTranslation } from 'react-i18next';
import { DonationsStackParamList, CommunityChallenge, ChallengeType, ChallengeFrequency, ChallengeDifficulty } from '../globals/types';
import { Ionicons } from '@expo/vector-icons';

// Default challenge images by difficulty
const DEFAULT_CHALLENGE_IMAGES = {
  easy: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
  medium: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
  hard: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
  expert: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400',
};

export interface CommunityChallengesScreenProps {
  navigation: NavigationProp<DonationsStackParamList>;
  route?: any;
}

// Filter options for challenges
const CHALLENGE_TYPE_OPTIONS = [
  { id: 'BOOLEAN', label: 'כן/לא', icon: 'checkmark-circle-outline' },
  { id: 'NUMERIC', label: 'מספרי', icon: 'calculator-outline' },
  { id: 'DURATION', label: 'זמן', icon: 'time-outline' },
];

const CHALLENGE_FREQUENCY_OPTIONS = [
  { id: 'DAILY', label: 'יומי', icon: 'calendar-outline' },
  { id: 'WEEKLY', label: 'שבועי', icon: 'calendar-number-outline' },
  { id: 'FLEXIBLE', label: 'גמיש', icon: 'infinite-outline' },
];

const CHALLENGE_DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'קל', icon: 'happy-outline', color: colors.success },
  { id: 'medium', label: 'בינוני', icon: 'bulb-outline', color: colors.warning },
  { id: 'hard', label: 'קשה', icon: 'flame-outline', color: colors.error },
  { id: 'expert', label: 'מומחה', icon: 'trophy-outline', color: colors.primary },
];

export default function CommunityChallengesScreen({ navigation, route }: CommunityChallengesScreenProps) {
  const { showToast } = useToast();
  const { t } = useTranslation(['donations', 'common', 'challenges']);
  const { selectedUser: user } = useUser();
  
  const routeParams = route?.params as { mode?: string } | undefined;
  const initialMode = routeParams?.mode === 'offer' ? false : true;
  
  // Mode: true = מחפש (search), false = מציע (offer/create)
  const [mode, setMode] = useState(initialMode);
  
  // State for challenges list
  const [allChallenges, setAllChallenges] = useState<CommunityChallenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<CommunityChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<ChallengeType | ''>('');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<ChallengeFrequency | ''>('');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<ChallengeDifficulty | ''>('');
  const [showMyCreatedOnly, setShowMyCreatedOnly] = useState(false);
  
  // Form state for creating challenge
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('BOOLEAN');
  const [frequency, setFrequency] = useState<ChallengeFrequency>('DAILY');
  const [goalValue, setGoalValue] = useState('');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('easy');
  const [category, setCategory] = useState('');

  // Update mode from route params
  useEffect(() => {
    if (routeParams?.mode && routeParams.mode !== 'undefined' && routeParams.mode !== 'null') {
      const newMode = routeParams.mode === 'search';
      if (newMode !== mode) {
        setMode(newMode);
      }
    }
  }, [routeParams?.mode]);

  // Load challenges when screen focuses
  useFocusEffect(
    useCallback(() => {
      // Reset filters when coming back to the screen
      setShowMyCreatedOnly(false);
      
      if (mode) {
        loadChallenges();
      }
    }, [mode])
  );

  // Apply filters when search or filters change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedTypeFilter, selectedFrequencyFilter, selectedDifficultyFilter, showMyCreatedOnly, allChallenges]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const filters: any = {
        is_active: true,
        sort_by: 'created_at',
        sort_order: 'DESC' as const,
        limit: 100,
      };
      
      const response = await db.getCommunityChallenges(filters);
      
      if (response.success && response.data) {
        setAllChallenges(response.data);
      } else {
        setAllChallenges([]);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      showToast(t('challenges:messages.errorLoading'), 'error');
      setAllChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...allChallenges];

    // My created filter
    if (showMyCreatedOnly && user?.id) {
      filtered = filtered.filter((c) => c.creator_id === user.id);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedTypeFilter) {
      filtered = filtered.filter((c) => c.type === selectedTypeFilter);
    }

    // Frequency filter
    if (selectedFrequencyFilter) {
      filtered = filtered.filter((c) => c.frequency === selectedFrequencyFilter);
    }

    // Difficulty filter
    if (selectedDifficultyFilter) {
      filtered = filtered.filter((c) => c.difficulty === selectedDifficultyFilter);
    }

    setFilteredChallenges(filtered);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common:error'), t('challenges:imagePermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common:error'), t('challenges:imagePickError'));
    }
  };

  const handleCreateChallenge = async () => {
    try {
      if (!title.trim()) {
        Alert.alert(t('common:error'), t('challenges:fields.titleRequired'));
        return;
      }

      if (!user?.id) {
        Alert.alert(t('common:error'), t('challenges:messages.loginRequired'));
        return;
      }

      setLoading(true);

      const challengeData = {
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        image_url: imageUri || DEFAULT_CHALLENGE_IMAGES[difficulty] || undefined,
        type: challengeType,
        frequency,
        goal_value: goalValue ? parseFloat(goalValue) : undefined,
        difficulty,
        category: category.trim() || undefined,
      };

      const response = await db.createCommunityChallenge(challengeData);

      if (response.success) {
        showToast(t('challenges:challengeCreated'), 'success');
        
        // Reset form
        setTitle('');
        setDescription('');
        setImageUri('');
        setChallengeType('BOOLEAN');
        setFrequency('DAILY');
        setGoalValue('');
        setDifficulty('easy');
        setCategory('');

        // Switch to search mode and reload
        setMode(true);
        await loadChallenges();
      } else {
        showToast(t('challenges:messages.errorCreating'), 'error');
      }
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      showToast(error.message || t('challenges:messages.errorCreating'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChallengePress = (challenge: CommunityChallenge) => {
    (navigation as any).navigate('ChallengeDetailsScreen', {
      challengeId: challenge.id,
    });
  };

  const renderChallengeCard = ({ item }: { item: CommunityChallenge }) => {
    const typeOption = CHALLENGE_TYPE_OPTIONS.find((t) => t.id === item.type);
    const difficultyOption = CHALLENGE_DIFFICULTY_OPTIONS.find((d) => d.id === item.difficulty);
    const imageUrl = item.image_url || DEFAULT_CHALLENGE_IMAGES[item.difficulty || 'easy'];

    return (
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={() => handleChallengePress(item)}
        activeOpacity={0.7}
      >
        {/* Challenge Image */}
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.cardContent}>
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

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.creator_name || 'משתמש'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{t('challenges:stats.participantsCount', { count: item.participants_count })}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name={CHALLENGE_FREQUENCY_OPTIONS.find((f) => f.id === item.frequency)?.icon as any}
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>
              {CHALLENGE_FREQUENCY_OPTIONS.find((f) => f.id === item.frequency)?.label}
            </Text>
          </View>
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>{t('challenges:messages.noChallenges')}</Text>
      <Text style={styles.emptySubtitle}>
        {mode ? t('challenges:messages.noChallengesSubtitle') : t('challenges:createNewChallenge')}
      </Text>
    </View>
  );

  const renderSearchMode = () => (
    <View style={styles.container}>
      {/* My Created Filter Badge */}
      {showMyCreatedOnly && (
        <View style={styles.myCreatedBanner}>
          <Text style={styles.myCreatedText}>
            {t('challenges:myCreatedChallenges', 'האתגרים שיצרתי')}
          </Text>
          <TouchableOpacity onPress={() => setShowMyCreatedOnly(false)}>
            <Ionicons name="close-circle" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      <ScrollContainer horizontal style={styles.filtersContainer} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedTypeFilter && !showMyCreatedOnly && styles.filterChipActive]}
          onPress={() => {
            setSelectedTypeFilter('');
            setShowMyCreatedOnly(false);
          }}
        >
          <Text style={[styles.filterChipText, !selectedTypeFilter && !showMyCreatedOnly && styles.filterChipTextActive]}>
            {t('challenges:filters.all')}
          </Text>
        </TouchableOpacity>
        {CHALLENGE_TYPE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.filterChip, selectedTypeFilter === option.id && styles.filterChipActive]}
            onPress={() => setSelectedTypeFilter(option.id as ChallengeType)}
          >
            <Ionicons
              name={option.icon as any}
              size={16}
              color={selectedTypeFilter === option.id ? colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedTypeFilter === option.id && styles.filterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollContainer>

      {/* Challenges List */}
      <FlatList
        data={filteredChallenges}
        renderItem={renderChallengeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={colors.primary} /> : renderEmptyState()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );

  const renderOfferMode = () => (
    <ScrollContainer style={styles.formContainer}>
      <Text style={styles.formTitle}>{t('challenges:createNewChallenge')}</Text>

      {/* Title */}
      <Text style={styles.label}>{t('challenges:fields.title')} *</Text>
      <TextInput
        style={styles.input}
        placeholder={t('challenges:fields.titlePlaceholder')}
        value={title}
        onChangeText={setTitle}
        maxLength={255}
      />

      {/* Description */}
      <Text style={styles.label}>{t('challenges:fields.description')}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={t('challenges:fields.descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        maxLength={2000}
      />

      {/* Image */}
      <Text style={styles.label}>{t('challenges:fields.image')} ({t('common:optional', 'אופציונלי')})</Text>
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.challengeImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.imagePlaceholderText}>{t('challenges:addImage')}</Text>
            <Text style={styles.imagePlaceholderSubtext}>{t('challenges:defaultImageInfo')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Challenge Type */}
      <Text style={styles.label}>{t('challenges:fields.type')} *</Text>
      <View style={styles.optionsRow}>
        {CHALLENGE_TYPE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionButton, challengeType === option.id && styles.optionButtonActive]}
            onPress={() => setChallengeType(option.id as ChallengeType)}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={challengeType === option.id ? colors.white : colors.textSecondary}
            />
            <Text
              style={[styles.optionText, challengeType === option.id && styles.optionTextActive]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Frequency */}
      <Text style={styles.label}>{t('challenges:fields.frequency')} *</Text>
      <View style={styles.optionsRow}>
        {CHALLENGE_FREQUENCY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionButton, frequency === option.id && styles.optionButtonActive]}
            onPress={() => setFrequency(option.id as ChallengeFrequency)}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={frequency === option.id ? colors.white : colors.textSecondary}
            />
            <Text style={[styles.optionText, frequency === option.id && styles.optionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulty */}
      <Text style={styles.label}>{t('challenges:fields.difficulty')}</Text>
      <View style={styles.optionsRow}>
        {CHALLENGE_DIFFICULTY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              difficulty === option.id && styles.optionButtonActive,
              difficulty === option.id && { backgroundColor: option.color },
            ]}
            onPress={() => setDifficulty(option.id as ChallengeDifficulty)}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={difficulty === option.id ? colors.white : option.color}
            />
            <Text style={[styles.optionText, difficulty === option.id && styles.optionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Goal Value (optional) */}
      {challengeType !== 'BOOLEAN' && (
        <>
          <Text style={styles.label}>{t('challenges:fields.goalValue')} ({t('common:optional', 'אופציונלי')})</Text>
          <TextInput
            style={styles.input}
            placeholder={challengeType === 'DURATION' ? t('challenges:fields.goalValueMinutes') : t('challenges:fields.goalValuePlaceholder')}
            value={goalValue}
            onChangeText={setGoalValue}
            keyboardType="numeric"
          />
        </>
      )}

      {/* Category (optional) */}
      <Text style={styles.label}>{t('challenges:fields.category')} ({t('common:optional', 'אופציונלי')})</Text>
      <TextInput
        style={styles.input}
        placeholder={t('challenges:fields.categoryPlaceholder')}
        value={category}
        onChangeText={setCategory}
        maxLength={50}
      />

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreateChallenge}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={24} color={colors.white} />
            <Text style={styles.createButtonText}>{t('challenges:createButton')}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollContainer>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderComp
        mode={mode}
        menuOptions={[
          t('challenges:statistics'),
          t('challenges:myChallenges', 'האתגרים שלי'),
          t('challenges:myCreatedChallenges', 'האתגרים שיצרתי'),
        ]}
        onToggleMode={() => setMode(!mode)}
        onSelectMenuItem={(option) => {
          if (option === t('challenges:statistics')) {
            (navigation as any).navigate('ChallengeStatisticsScreen');
          } else if (option === t('challenges:myChallenges', 'האתגרים שלי')) {
            (navigation as any).navigate('MyChallengesScreen');
          } else if (option === t('challenges:myCreatedChallenges', 'האתגרים שיצרתי')) {
            (navigation as any).navigate('MyCreatedChallengesScreen');
          }
        }}
        title={t('challenges:title')}
        placeholder={t('common:search')}
        filterOptions={[]}
        sortOptions={[]}
        searchData={filteredChallenges}
        onSearch={(query) => setSearchQuery(query)}
        hideSortButton={true}
      />
      {mode ? renderSearchMode() : renderOfferMode()}
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
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  challengeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.backgroundSecondary,
  },
  cardContent: {
    padding: 16,
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
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: FontSizes.heading1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.white,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
  myCreatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myCreatedText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
  imagePickerButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  challengeImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundSecondary,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  imagePlaceholderSubtext: {
    fontSize: FontSizes.small,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
