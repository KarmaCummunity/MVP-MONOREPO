// File overview:
// - Purpose: Discover/suggest people to follow and view popular users; follow/unfollow inline.
// - Reached from: Profile actions and navigation routes as 'DiscoverPeopleScreen'.
// - Provides: Two tabs (suggestions/popular), list items navigate to 'UserProfileScreen'.
// - Reads from context: `useUser()` -> `selectedUser`.
// - External deps/services: `followService` (suggestions/popular/follow/unfollow/stats).
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, NavigationProp, ParamListBase } from '@react-navigation/native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { UserPreview as CharacterType } from '../globals/types';
import {
  getFollowSuggestions,
  getPopularUsers,
  followUser,
  unfollowUser,
  getFollowStats
} from '../src/services/follow.service';
import { createConversation, conversationExists } from '../src/services/chat.service';
import { useUser } from '../stores/userStore';
import apiService from '../src/api/api.service';

import { useTranslation } from 'react-i18next';
import { getScreenInfo, isLandscape } from '../globals/responsive';
import { IS_DEVELOPMENT } from '../utils/dbConfig';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { logger } from '../utils/loggerService';

// Helper function to generate mock users for testing scroll in development
const generateMockUsers = (count: number, excludeId?: string): CharacterType[] => {
  const names = [
    'שרה כהן', 'דוד לוי', 'רחל אברהם', 'יוסף יצחק', 'מרים משה',
    'אברהם יעקב', 'חיה דוד', 'ישראל נחום', 'דינה שמעון', 'בנימין ראובן',
    'לאה רחל', 'גד אשר', 'דן נפתלי', 'זבולון יששכר', 'יוסף בנימין',
    'משה אהרן', 'שלמה דוד', 'יהודה יוסף', 'אפרים מנשה', 'רונן אמיר',
    'יעל טל', 'נועה אור', 'רומי גיל', 'תמר דניאל', 'מיכל אמיר',
    'עדי יהל', 'ליה גיא', 'שירה אדם', 'מור אורי', 'יערה רון'
  ];

  const bios = [
    'אוהב לעזור לאחרים ולהתנדב בקהילה',
    'פעיל חברתי ומוביל שינוי בחברה',
    'מתנדב במספר ארגונים ותומך בפרויקטים קהילתיים',
    'מחויב לשיפור החברה והסביבה',
    'מאמין בנתינה ובעשייה למען הכלל',
    'פעיל סביבתי ומתנדב בקהילה',
    'עובד למען שוויון וצדק חברתי',
    'תומך בפרויקטים קהילתיים וחברתיים'
  ];

  const rolesOptions = [
    ['user'],
    ['user', 'volunteer'],
    ['user', 'donor'],
    ['user', 'organizer'],
  ];

  const mockUsers: CharacterType[] = [];
  let userIdCounter = 1;

  for (let i = 0; i < count; i++) {
    const baseId = `mock-user-${userIdCounter}`;
    // Skip if this is the excluded user
    if (excludeId && baseId === excludeId) {
      userIdCounter++;
      continue;
    }

    const name = names[i % names.length] + ` ${Math.floor(i / names.length) + 1}`;
    const bio = bios[i % bios.length];
    const roles = rolesOptions[i % rolesOptions.length];
    const karmaPoints = Math.floor(Math.random() * 1000) + 50;
    const completedTasks = Math.floor(Math.random() * 50);

    mockUsers.push({
      id: baseId,
      name,
      avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      bio,
      email: `mock${userIdCounter}@test.local`,
      karmaPoints,
      completedTasks,
      followersCount: Math.floor(Math.random() * 100),
      roles,
      isVerified: Math.random() > 0.9,
      isActive: true,
    });

    userIdCounter++;
  }

  return mockUsers;
};

export default function DiscoverPeopleScreen() {
  const { t } = useTranslation(['discover', 'common']);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { isTablet, isDesktop } = getScreenInfo();
  const landscape = isLandscape();
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const estimatedTabBarHeight = landscape ? 40 : (isDesktop ? 56 : isTablet ? 54 : 46);
  const bottomPadding = (Platform.OS === 'web' ? estimatedTabBarHeight : tabBarHeight) + 24;
  const { selectedUser } = useUser();
  const [suggestions, setSuggestions] = useState<CharacterType[]>([]);
  const [popularUsers, setPopularUsers] = useState<CharacterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'popular'>('suggestions');
  const [followStats, setFollowStats] = useState<Record<string, { isFollowing: boolean }>>({});
  const [headerHeight, setHeaderHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
    ? screenHeight - tabBarHeight - headerHeight
    : undefined;

  // Helper function to check if a user is the current user
  const isCurrentUserCheck = useCallback((
    userId: string,
    userEmail: string | undefined,
    currentUserId: string,
    currentUserEmail: string
  ): boolean => {
    const normalizedUserId = String(userId || '').trim().toLowerCase();
    const normalizedUserEmail = userEmail ? String(userEmail).trim().toLowerCase() : '';

    return normalizedUserId === currentUserId ||
      (currentUserEmail && normalizedUserEmail === currentUserEmail) ||
      normalizedUserId === '';
  }, []);

  const loadUsers = useCallback(async (isRefresh = false) => {
    logger.debug('DiscoverPeopleScreen', 'loadUsers called', {
      isRefresh,
      platform: Platform.OS,
      hasSelectedUser: !!selectedUser,
      userId: selectedUser?.id,
      environment: IS_DEVELOPMENT ? 'development' : 'production'
    });

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      if (!selectedUser) {
        logger.debug('DiscoverPeopleScreen', 'No selectedUser, clearing data');
        setSuggestions([]);
        setPopularUsers([]);
        setFollowStats({});
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const currentUserId = String(selectedUser.id).trim().toLowerCase();
      const currentUserEmail = selectedUser.email ? String(selectedUser.email).trim().toLowerCase() : '';

      logger.debug('DiscoverPeopleScreen', 'Filtering users', { currentUserId, currentUserEmail });

      let filteredSuggestions: CharacterType[] = [];
      // Get ALL users (no limit) - use high limit to get all users from database
      const userSuggestions = await getFollowSuggestions(currentUserId, 1000, currentUserEmail);
      // Filter out current user from suggestions - check both ID and email
      filteredSuggestions = (userSuggestions as CharacterType[]).filter((user) => {
        const isCurrentUser = isCurrentUserCheck(user.id, user.email, currentUserId, currentUserEmail);

        if (isCurrentUser) {
          logger.debug('DiscoverPeopleScreen', 'Filtered out current user from suggestions', {
            userId: user.id,
            userEmail: user.email,
            name: user.name
          });
        }

        return !isCurrentUser;
      });
      // In development, add mock users if we have less than 30 users to test scrolling
      if (IS_DEVELOPMENT && filteredSuggestions.length < 30) {
        const mockCount = 30 - filteredSuggestions.length;
        const mockUsers = generateMockUsers(mockCount, currentUserId);
        logger.debug('DiscoverPeopleScreen', 'Development: adding mock users for scroll testing', { mockCount });
        filteredSuggestions = [...filteredSuggestions, ...mockUsers];
      }

      setSuggestions(filteredSuggestions);

      // Get popular users excluding current user - get ALL users (no limit)
      const popular = await getPopularUsers(1000, currentUserId, currentUserEmail);
      // Additional filter as safety measure - check both ID and email
      const filteredPopular = (popular as CharacterType[]).filter((user) => {
        const isCurrentUser = isCurrentUserCheck(user.id, user.email, currentUserId, currentUserEmail);

        if (isCurrentUser) {
          logger.debug('DiscoverPeopleScreen', 'Filtered out current user from popular', {
            userId: user.id,
            userEmail: user.email,
            name: user.name
          });
        }

        return !isCurrentUser;
      });

      // In development, add mock users if we have less than 30 users to test scrolling
      if (IS_DEVELOPMENT && filteredPopular.length < 30) {
        const mockCount = 30 - filteredPopular.length;
        const mockUsers = generateMockUsers(mockCount, currentUserId);
        logger.debug('DiscoverPeopleScreen', 'Development: adding mock users to popular', { mockCount });
        filteredPopular.push(...mockUsers);
      }

      setPopularUsers(filteredPopular);

      // Get total users count from server
      let totalUsersInDatabase = 0;
      try {
        const summaryResponse = await apiService.getUsersSummary();
        if (summaryResponse && summaryResponse.success && summaryResponse.data) {
          const data = summaryResponse.data as { total_users?: string };
          totalUsersInDatabase = parseInt(data.total_users || '0', 10);
        }
      } catch (error) {
        logger.warn('DiscoverPeopleScreen', 'Error fetching users summary', { error });
        // Try to get count from the actual response
        try {
          const allUsersResponse = await apiService.getUsers({ limit: 1000, offset: 0 });
          if (allUsersResponse && allUsersResponse.success && allUsersResponse.data) {
            totalUsersInDatabase = (allUsersResponse.data as CharacterType[]).length;
          }
        } catch (fallbackError) {
          logger.warn('DiscoverPeopleScreen', 'Error fetching all users as fallback', { error: fallbackError });
        }
      }

      // Log total users found - ALWAYS log this, even if summary failed
      const totalUsersFound = filteredSuggestions.length + filteredPopular.length;
      const uniqueUsersCount = new Set([...filteredSuggestions.map(u => u.id), ...filteredPopular.map(u => u.id)]).size;
      logger.debug('DiscoverPeopleScreen', 'User counts', {
        totalInDb: totalUsersInDatabase ?? 'N/A',
        suggestions: filteredSuggestions.length,
        popular: filteredPopular.length,
        totalLoaded: totalUsersFound,
        uniqueUsers: uniqueUsersCount
      });

      // Load follow stats for all users (use filtered lists)
      // Mock users always have isFollowing: false by default (no need to check backend)
      const allUsersToCheck = [...filteredSuggestions, ...filteredPopular];
      const stats: Record<string, { isFollowing: boolean }> = {};

      for (const user of allUsersToCheck) {
        // Mock users have IDs starting with "mock-user-", skip backend check for them
        if (IS_DEVELOPMENT && user.id.startsWith('mock-user-')) {
          stats[user.id] = { isFollowing: false };
        } else {
          try {
            const userStats = await getFollowStats(user.id, currentUserId);
            stats[user.id] = { isFollowing: userStats.isFollowing };
          } catch (error) {
            logger.warn('DiscoverPeopleScreen', 'Failed to get follow stats for user', { userId: user.id, error });
            stats[user.id] = { isFollowing: false };
          }
        }
      }

      setFollowStats(stats);
      
      logger.debug('DiscoverPeopleScreen', 'loadUsers completed', {
        suggestionsCount: filteredSuggestions.length,
        popularCount: filteredPopular.length,
        totalUsers: filteredSuggestions.length + filteredPopular.length,
        followStatsCount: Object.keys(stats).length
      });
    } catch (error) {
      logger.error('DiscoverPeopleScreen', 'Error loading users', { error });
      if (!isRefresh) {
        Alert.alert(t('discover:alerts.error'), t('discover:alerts.errorLoadingUsers'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedUser, isCurrentUserCheck, t]);

  useEffect(() => {
    loadUsers(false);
  }, [loadUsers]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('DiscoverPeopleScreen', 'Screen focused, refreshing data', {
        platform: Platform.OS,
        activeTab,
        suggestionsCount: suggestions.length,
        popularCount: popularUsers.length
      });
      loadUsers(false);
    }, [loadUsers, activeTab, suggestions.length, popularUsers.length])
  );

  const onRefresh = useCallback(() => {
logger.debug('DiscoverPeopleScreen', 'onRefresh called', {
        platform: Platform.OS,
        activeTab,
        currentSuggestionsCount: suggestions.length,
        currentPopularCount: popularUsers.length
      });
    loadUsers(true);
  }, [loadUsers, activeTab, suggestions.length, popularUsers.length]);

  const handleFollowToggle = async (targetUserId: string) => {
logger.debug('DiscoverPeopleScreen', 'handleFollowToggle called', {
        targetUserId,
        platform: Platform.OS,
        hasSelectedUser: !!selectedUser,
        currentIsFollowing: followStats[targetUserId]?.isFollowing || false
      });

    if (!selectedUser) {
      Alert.alert(t('discover:alerts.error'), t('discover:alerts.pleaseLogin'));
      return;
    }

    // Handle mock users in development (just update UI state, don't call backend)
    if (IS_DEVELOPMENT && targetUserId.startsWith('mock-user-')) {
      const currentStats = followStats[targetUserId] || { isFollowing: false };
      const willBeFollowing = !currentStats.isFollowing;

      if (willBeFollowing) {
        // Create updated follow stats that includes the newly followed mock user
        const updatedFollowStats = {
          ...followStats,
          [targetUserId]: { isFollowing: true }
        };

        // Update follow stats state
        setFollowStats(updatedFollowStats);

        // Remove mock users we're following from both lists (same as real users)
        const filterUsersWeFollow = (users: CharacterType[]) => {
          return users.filter(user => {
            // Remove users we're already following (including mock users)
            const userStats = updatedFollowStats[user.id] || { isFollowing: false };
            return !userStats.isFollowing;
          });
        };

        setSuggestions(prev => filterUsersWeFollow(prev));
        setPopularUsers(prev => filterUsersWeFollow(prev));
        logger.debug('DiscoverPeopleScreen', 'Development: mock follow toggle, user removed from list', { targetUserId });
      } else {
        // Unfollow - just update stats
        setFollowStats(prev => ({
          ...prev,
          [targetUserId]: { isFollowing: false }
        }));
        logger.debug('DiscoverPeopleScreen', 'Development: mock unfollow toggle', { targetUserId });
      }
      return;
    }

    try {
      const currentStats = followStats[targetUserId] || { isFollowing: false };

      if (currentStats.isFollowing) {
        logger.debug('DiscoverPeopleScreen', 'Unfollowing user', { targetUserId });
        const success = await unfollowUser(selectedUser.id, targetUserId);
        if (success) {
          setFollowStats(prev => ({
            ...prev,
            [targetUserId]: { isFollowing: false }
          }));
          logger.debug('DiscoverPeopleScreen', 'Unfollowed successfully', { targetUserId });
          Alert.alert(t('discover:alerts.unfollowTitle'), t('discover:alerts.unfollowMessage'));
        }
      } else {
        logger.debug('DiscoverPeopleScreen', 'Following user', { targetUserId });
        const success = await followUser(selectedUser.id, targetUserId);
        if (success) {
          // Create updated follow stats that includes the newly followed user
          const updatedFollowStats = {
            ...followStats,
            [targetUserId]: { isFollowing: true }
          };

          // Update follow stats state
          setFollowStats(updatedFollowStats);

          // Remove the followed user and all users we're already following from both lists
          // (because we don't need to show users we're already following)
          const filterUsersWeFollow = (users: CharacterType[]) => {
            return users.filter(user => {
              // Remove users we're already following (including the one we just followed)
              // This applies to both real users and mock users
              const userStats = updatedFollowStats[user.id] || { isFollowing: false };
              return !userStats.isFollowing;
            });
          };

          setSuggestions(prev => filterUsersWeFollow(prev));
          setPopularUsers(prev => filterUsersWeFollow(prev));

          logger.debug('DiscoverPeopleScreen', 'Followed successfully', { targetUserId });
          Alert.alert(t('discover:alerts.followTitle'), t('discover:alerts.followMessage'));
        }
      }
    } catch (error) {
      logger.error('DiscoverPeopleScreen', 'Follow toggle error', { targetUserId, platform: Platform.OS, error });
      Alert.alert(t('discover:alerts.error'), t('discover:alerts.errorGeneric'));
    }
  };

  const handleMessage = async (targetUser: CharacterType) => {
    if (!selectedUser) {
      Alert.alert(t('discover:alerts.error'), t('discover:alerts.pleaseLogin'));
      return;
    }

    // Mock users can't receive messages in development
    if (IS_DEVELOPMENT && targetUser.id.startsWith('mock-user-')) {
      Alert.alert(t('discover:alerts.info'), t('discover:alerts.mockUserNoMessage'));
      return;
    }

    try {
      const existingConvId = await conversationExists(selectedUser.id, targetUser.id);
      let conversationId: string;

      if (existingConvId) {
        logger.debug('DiscoverPeopleScreen', 'Conversation already exists', { existingConvId });
        conversationId = existingConvId;
      } else {
        logger.debug('DiscoverPeopleScreen', 'Creating new conversation');
        conversationId = await createConversation([selectedUser.id, targetUser.id]);
      }

      navigation.navigate('ChatDetailScreen', {
        conversationId,
        otherUserId: targetUser.id,
        userName: targetUser.name || t('discover:noName'),
        userAvatar: targetUser.avatar || 'https://i.pravatar.cc/150?img=1',
      });
    } catch (error) {
      logger.error('DiscoverPeopleScreen', 'Create chat error', { error });
      Alert.alert(t('discover:alerts.error'), t('discover:alerts.errorCreatingChat'));
    }
  };

  const renderUserItem = ({ item }: { item: CharacterType }) => {
    const currentStats = followStats[item.id] || { isFollowing: false };
    const isCurrentUser = selectedUser?.id === item.id;
    
    // Log only occasionally to avoid spam (every 10th item)
    if (Math.random() < 0.1) {
      logger.debug('DiscoverPeopleScreen', 'renderUserItem', {
        userId: item.id,
        isCurrentUser,
        isFollowing: currentStats.isFollowing,
        platform: Platform.OS
      });
    }

    return (
      <View style={styles.userItem}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => {
            navigation.navigate('UserProfileScreen', {
              userId: item.id,
              userName: item.name,
              characterData: item
            });
          }}
        >
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.userDetails}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={colors.info} />
              )}
            </View>
            <Text style={styles.userBio} numberOfLines={2}>
              {item.bio}
            </Text>
            <View style={styles.userStats}>
              <Text style={styles.statText}>
                {item.karmaPoints} {t('discover:stats.karmaPoints')}
              </Text>
              <Text style={styles.statText}>
                {item.completedTasks} {t('discover:stats.tasksCompleted')}
              </Text>
            </View>
            <View style={styles.rolesContainer}>
              {(item.roles ?? []).slice(0, 2).map((role, index) => (
                <View key={index} style={styles.roleTag}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        {!isCurrentUser && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.followButton,
                currentStats.isFollowing && styles.followingButton
              ]}
              onPress={() => handleFollowToggle(item.id)}
            >
              <Text style={[
                styles.followButtonText,
                currentStats.isFollowing && styles.followingButtonText
              ]}>
                {currentStats.isFollowing ? t('discover:actions.following') : t('discover:actions.follow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleMessage(item)}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.messageButtonText}>{t('discover:actions.message')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'suggestions' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('suggestions')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'suggestions' && styles.activeTabButtonText
        ]}>
          {t('discover:tabs.suggestions')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'popular' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('popular')}
      >
        <Text style={[
          styles.tabButtonText,
          activeTab === 'popular' && styles.activeTabButtonText
        ]}>
          {t('discover:tabs.popular')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderListHeader = () => (
    <>
      <View 
        style={styles.header}
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
            logger.debug('DiscoverPeopleScreen', 'Header height measured', { height, platform: Platform.OS });
          }
        }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            logger.debug('DiscoverPeopleScreen', 'Back button pressed');
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>
      {renderTabBar()}
    </>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={60} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>{t('discover:empty.noSuggestions')}</Text>
      <Text style={styles.emptyStateSubtitle}>
        {t('discover:empty.tryLater')}
      </Text>
    </View>
  );

  // Data is already filtered in loadUsers, no need to filter again
  const currentData = activeTab === 'suggestions' ? suggestions : popularUsers;

  logger.debug('DiscoverPeopleScreen', 'Rendering', {
    platform: Platform.OS,
    activeTab,
    dataCount: currentData.length,
    loading,
    refreshing,
    maxListHeight,
    headerHeight,
    tabBarHeight
  });

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundPrimary} barStyle="dark-content" />
      {/* List container - limited height on web to ensure scrolling works */}
      <View style={[
        styles.listWrapper,
        Platform.OS === 'web' && maxListHeight ? {
          maxHeight: maxListHeight,
        } : undefined
      ]}>
        <FlatList
          data={currentData}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContentContainer,
            { paddingBottom: bottomPadding },
            currentData.length === 0 && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={true}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          style={styles.flatList}
          scrollEnabled={true}
          nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
          scrollEventThrottle={16}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={21}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            // Log scroll events occasionally to avoid spam
            if (Math.random() < 0.05) {
              logger.debug('DiscoverPeopleScreen', 'onScroll', {
                platform: Platform.OS,
                contentOffset: event.nativeEvent.contentOffset.y,
                contentSize: event.nativeEvent.contentSize.height,
                layoutSize: event.nativeEvent.layoutMeasurement.height
              });
            }
          }}
          onContentSizeChange={(contentWidth, contentHeight) => {
            logger.debug('DiscoverPeopleScreen', 'onContentSizeChange', {
              platform: Platform.OS,
              contentWidth,
              contentHeight,
              dataCount: currentData.length
            });
          }}
          onLayout={(event) => {
            logger.debug('DiscoverPeopleScreen', 'FlatList onLayout', {
              platform: Platform.OS,
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  flatList: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  listContentContainer: {
    flexGrow: 1,
  },
  emptyListContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 16,
    marginVertical: 12,
    minWidth: 200,
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: colors.pink,
  },
  tabButtonText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 4,
  },
  userBio: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  userStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  statText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  roleTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: FontSizes.small,
    color: colors.primary,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followButton: {
    backgroundColor: colors.pink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.white,
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
  followingButtonText: {
    color: colors.textPrimary,
  },
  messageButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageButtonText: {
    color: colors.textPrimary,
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 