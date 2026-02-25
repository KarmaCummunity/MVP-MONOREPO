// File overview:
// - Purpose: Unified profile screen that works for both own profile and other users' profiles.
// - Reached from: `ProfileTabStack` initial route 'ProfileScreen' via `BottomNavigator` (own profile) or via navigation with params (other user's profile).
// - Provides: Navigation to Followers lists, Bookmarks, Notifications, Edit Profile, Discover People, Follow/Unfollow, Message, and (in demo) random persona selection and sample data creation.
// - Reads from context: `useUser()` -> `selectedUser`, `setSelectedUserWithMode`, `isRealAuth`.
// - Route params: Optional `{ userId?: string, userName?: string, characterData?: CharacterType }` for viewing other users' profiles.
// - External deps/services: `followService` (stats and sample), `chatService` (sample chats), `apiService` (load user data), i18n translations.
// - Notes: Hides or adapts certain demo-only features when `isRealAuth` is true. Shows different UI elements based on whether viewing own profile or other user's profile.
// screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView } from 'react-native-tab-view';
import type { SceneRendererProps, NavigationState } from 'react-native-tab-view';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import colors from '../globals/colors';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';
import ScrollContainer from '../components/ScrollContainer';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import ItemDetailsModal from '../components/ItemDetailsModal';
import { scaleSize, getScreenInfo } from '../globals/responsive';
import { getFollowStats, followUser, unfollowUser, createSampleFollowData, getUpdatedFollowCounts } from '../src/services/follow.service';
import { createSampleChatData, createConversation, conversationExists } from '../src/services/chat.service';
import { enhancedDB } from '../utils/enhancedDatabaseService';
import { apiService } from '../src/api/api.service';
import { USE_BACKEND } from '../utils/dbConfig';
import { db } from '../src/infrastructure/database.service';
import { useToast } from '../utils/toastService';
import { sanitiseAvatarUrl } from '../src/utils/validation/url-validator';
import { logger } from '../utils/loggerService';
import type { CharacterType, ProfileActivity, ProfileFeedItem, ProfileScreenRouteParams, TabRoute } from '../components/Profile/types';
import { getRoleDisplayName, safeStr, safeNum, getLocationName } from '../components/Profile/profileUtils';
import { profileStyles } from '../components/Profile/profileStyles';
import ProfileOpenTab from '../components/Profile/ProfileOpenTab';
import ProfileClosedTab from '../components/Profile/ProfileClosedTab';
import ProfileTaggedTab from '../components/Profile/ProfileTaggedTab';
import type { ItemOrRideRecord } from '../components/ItemDetailsModal';

export type { ProfileFeedItem, ProfileActivity };

// --- Main Component ---
const { height: SCREEN_HEIGHT } = getScreenInfo();
const styles = profileStyles;

// Internal component that contains all the logic
// It receives tabBarHeight as a prop so we can control it from outside
function ProfileScreenContent({
  tabBarHeight,
  manualParams,
  forceOtherProfile
}: {
  tabBarHeight: number;
  manualParams?: ProfileScreenRouteParams;
  forceOtherProfile?: boolean;
}) {
  const route = useRoute();
  const { t } = useTranslation(['profile', 'common']);
  const { selectedUser, setSelectedUserWithMode: _setSelectedUserWithMode, isRealAuth } = useUser();
  const navigation = useNavigation();
  const { ToastComponent } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- React Native asset require
  const defaultLogo = require('../assets/images/android-chrome-192x192.png');

  // Get route params for viewing other users' profiles
  // Use manualParams if provided (from props), otherwise route.params
  let routeParams = manualParams || (route.params as ProfileScreenRouteParams | undefined);

  // On Web, handle refresh (F5) by restoring params from localStorage if route params are missing
  const STORAGE_KEY = 'profileScreenParams';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (!routeParams && !manualParams) {
      // Try to restore from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedParams = JSON.parse(stored);
          routeParams = parsedParams;
          logger.debug('ProfileScreen', 'Restored params from localStorage', { parsedParams });
        }
      } catch (error) {
        logger.warn('ProfileScreen', 'Failed to restore params from localStorage', { error });
      }
    } else if (routeParams?.userId) {
      // Save params to localStorage when viewing other user's profile
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          userId: routeParams.userId,
          userName: routeParams.userName,
          // Don't save characterData as it might be large
        }));
      } catch (error) {
        logger.warn('ProfileScreen', 'Failed to save params to localStorage', { error });
      }
    }
  }

  const { userId: externalUserId, userName: externalUserName, characterData: externalCharacterData } = routeParams || {};

  // Determine if viewing own profile or other user's profile
  // CRITICAL: If externalUserId exists and equals selectedUser.id, it's OWN profile!
  // Only if externalUserId exists and is DIFFERENT from selectedUser.id, it's another user's profile
  // If no externalUserId, it's own profile (default)

  // Normalize IDs to strings for comparison (in case one is number and one is string)
  const normalizedExternalUserId = externalUserId ? String(externalUserId).trim() : null;
  const normalizedSelectedUserId = selectedUser?.id ? String(selectedUser.id).trim() : null;

  // Check if viewing own profile: 
  // 1. Force other profile is FALSE AND
  // 2. (no externalUserId OR externalUserId equals selectedUser.id)
  const isOwnProfile = !forceOtherProfile &&
    (!normalizedExternalUserId ||
      (normalizedExternalUserId === normalizedSelectedUserId));

  const targetUserId = externalUserId || selectedUser?.id;

  // Debug log to help identify the issue
  logger.debug('ProfileScreen', 'Profile check', {
    externalUserId,
    normalizedExternalUserId,
    selectedUserId: selectedUser?.id,
    normalizedSelectedUserId,
    isOwnProfile,
    areEqual: normalizedExternalUserId === normalizedSelectedUserId,
    hasExternalUserId: !!externalUserId,
    hasSelectedUser: !!selectedUser
  });

  const [index, setIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [tabHeights, setTabHeights] = useState<Record<string, number>>({});

  const handleTabHeightChange = (key: string, height: number) => {
    // Add some buffer and min height
    const newHeight = Math.max(height, 500);
    setTabHeights(prev => {
      if (Math.abs((prev[key] || 0) - newHeight) < 10) return prev;
      return { ...prev, [key]: newHeight };
    });
  };
  const [userStats, setUserStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
    karmaPoints: 0,
    completedTasks: 0,
    totalDonations: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ProfileActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ProfileActivity | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // State for viewing other user's profile
  const [viewingUser, setViewingUser] = useState<CharacterType | null>(externalCharacterData || null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [_followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
  const [updatedCounts, setUpdatedCounts] = useState({ followersCount: 0, followingCount: 0 });
  const [loadingUser, setLoadingUser] = useState(!isOwnProfile && !externalCharacterData);

  // The user to display (either selectedUser for own profile, or viewingUser for other user's profile)
  const displayUser = isOwnProfile ? selectedUser : viewingUser;

  // Clean up localStorage when viewing own profile or when component unmounts
  useEffect(() => {
    if (isOwnProfile && Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_err) {
        // Ignore errors
      }
    }
  }, [isOwnProfile]);

  // Load user data from backend if viewing other user's profile
  useEffect(() => {
    const loadUser = async () => {
      if (isOwnProfile || !externalUserId) {
        return;
      }

      if (!externalCharacterData && externalUserId && USE_BACKEND) {
        try {
          setLoadingUser(true);
          const response = await apiService.getUserById(externalUserId);
          if (response.success && response.data) {
            const userData = response.data as Record<string, unknown>;
            const mappedUser: CharacterType = {
              id: safeStr(userData.id),
              name: safeStr(userData.name || externalUserName || t('profile:fallbacks.noName')),
              avatar: safeStr(userData.avatar_url || userData.avatar || 'https://i.pravatar.cc/150?img=1'),
              bio: safeStr(userData.bio),
              karmaPoints: safeNum(userData.karma_points),
              completedTasks: 0,
              roles: Array.isArray(userData.roles) ? (userData.roles as string[]) : ['user'],
              isVerified: !!userData.is_verified,
              location: userData.city ? {
                city: safeStr(userData.city),
                country: safeStr(userData.country || t('profile:fallbacks.israel'))
              } : { city: t('profile:fallbacks.israel'), country: 'IL' },
              joinDate: safeStr(userData.join_date || userData.created_at) || new Date().toISOString(),
              interests: Array.isArray(userData.interests) ? (userData.interests as string[]) : [],
              parentManagerId: userData.parent_manager_id != null ? safeStr(userData.parent_manager_id) : null,
            };
            setViewingUser(mappedUser);
            // Save userId to localStorage after successful load (Web only)
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                  userId: externalUserId,
                  userName: mappedUser.name,
                }));
              } catch (_err) {
                // Ignore errors
              }
            }
          } else {
            logger.warn('ProfileScreen', 'User not found', { externalUserId });
            setViewingUser(null);
          }
        } catch (err) {
          logger.error('ProfileScreen', 'Load user error', { error: err });
          if (externalUserName && externalUserName !== t('profile:fallbacks.unknownUser')) {
            setViewingUser({
              id: externalUserId,
              name: externalUserName || t('profile:fallbacks.noName'),
              avatar: 'https://i.pravatar.cc/150?img=1',
              bio: '',
              karmaPoints: 0,
              completedTasks: 0,
              roles: ['user'],
              isVerified: false,
              location: { city: t('profile:fallbacks.israel'), country: 'IL' },
              joinDate: new Date().toISOString(),
              interests: [] as string[],
            });
          } else {
            setViewingUser(null);
          }
        } finally {
          setLoadingUser(false);
        }
      } else if (externalCharacterData) {
        setViewingUser(externalCharacterData);
        setLoadingUser(false);
      } else if (!USE_BACKEND && externalUserId && externalUserName) {
        setViewingUser({
          id: externalUserId,
          name: externalUserName || t('profile:fallbacks.noName'),
          avatar: 'https://i.pravatar.cc/150?img=1',
          bio: '',
          karmaPoints: 0,
          completedTasks: 0,
          roles: ['user'],
          isVerified: false,
          location: { city: t('profile:fallbacks.israel'), country: 'IL' },
          joinDate: new Date().toISOString(),
          interests: [] as string[],
        });
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [externalUserId, externalUserName, externalCharacterData, isOwnProfile, t]);

  // Load follow stats when viewing other user's profile
  useEffect(() => {
    const loadFollowStats = async () => {
      if (isOwnProfile || !viewingUser || !selectedUser || !viewingUser.id) return;

      try {
        logger.debug('ProfileScreen', 'Loading follow stats for user', { userName: viewingUser.name });
        const stats = await getFollowStats(viewingUser.id, selectedUser.id);
        const counts = await getUpdatedFollowCounts(viewingUser.id);
        setFollowStats(stats);
        setUpdatedCounts(counts);
        setIsFollowing(stats.isFollowing);
      } catch (error) {
        logger.error('ProfileScreen', 'Load follow stats error', { error });
      }
    };

    loadFollowStats();
  }, [viewingUser, selectedUser, isOwnProfile]);

  // Function to update user statistics
  const updateUserStats = React.useCallback(async () => {
    try {
      const userIdToUse = isOwnProfile ? selectedUser?.id : viewingUser?.id;
      if (!userIdToUse) {
        logger.warn('ProfileScreen', 'No user ID, skipping stats update');
        return;
      }

      const currentUserStats = await getFollowStats(userIdToUse, userIdToUse);
      const userToUse = isOwnProfile ? selectedUser : viewingUser;

      setUserStats({
        posts: (userToUse as (CharacterType & { postsCount?: number; completedTasks?: number; totalDonations?: number }) | null)?.postsCount || 0,
        followers: currentUserStats.followersCount,
        following: currentUserStats.followingCount,
        karmaPoints: userToUse?.karmaPoints || 0,
        completedTasks: (userToUse as (CharacterType & { postsCount?: number; completedTasks?: number; totalDonations?: number }) | null)?.completedTasks || 0,
        totalDonations: (userToUse as (CharacterType & { postsCount?: number; completedTasks?: number; totalDonations?: number }) | null)?.totalDonations || 0,
      });
    } catch (error) {
      logger.error('ProfileScreen', 'Update user stats error', { error });
    }
  }, [isOwnProfile, selectedUser, viewingUser]);

  // Function to load recent user activities from database (only for own profile)
  const loadRecentActivities = React.useCallback(async () => {
    try {
      if (!isOwnProfile) {
        setRecentActivities([]);
        return;
      }

      if (!selectedUser?.id) {
        setRecentActivities([]);
        return;
      }

      const activities: ProfileActivity[] = [];
      const userId = selectedUser.id;

      // Load posts
      try {
        const userPosts = await db.getUserPosts(userId) || [];
        (userPosts as Record<string, unknown>[]).forEach((post: Record<string, unknown>) => {
          activities.push({
            id: `post_${safeStr(post.id)}`,
            type: 'post',
            title: safeStr(post.title || post.content) || t('profile:content.newPost'),
            time: safeStr(post.created_at || post.createdAt) || new Date().toISOString(),
            icon: 'image-outline',
            color: colors.info,
            rawData: post
          });
        });
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading posts', { error });
      }

      // Load items/donations
      try {
        const { USE_BACKEND, API_BASE_URL } = await import('../utils/dbConfig');
        let userItems: Record<string, unknown>[] = [];

        if (USE_BACKEND && API_BASE_URL) {
          try {
            const axios = (await import('axios')).default;
            const response = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: {
                owner_id: userId,
                limit: 20,
              }
            });
            if (response.data?.success && Array.isArray(response.data.data)) {
              userItems = response.data.data;
            }
          } catch (error) {
            logger.error('ProfileScreen', 'Error loading items from API', { error });
          }
        } else {
          userItems = await db.getDedicatedItemsByOwner(userId) || [];
        }

        userItems.forEach((item: Record<string, unknown>) => {
          activities.push({
            id: `item_${safeStr(item.id)}`,
            type: 'item',
            title: safeStr(item.title) || t('profile:content.newItem'),
            time: safeStr(item.created_at || item.createdAt) || new Date().toISOString(),
            icon: 'cube-outline',
            color: colors.pink,
            rawData: item
          });
        });
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading items', { error });
      }

      // Load donations - filter by createdBy after loading
      try {
        const allDonations = await enhancedDB.getDonations({});
        const userDonations = allDonations.filter((donation: Record<string, unknown>) => {
          const createdBy = donation.createdBy || donation.created_by || donation.donor_id || donation.donorId;
          return createdBy === userId;
        });

        userDonations.forEach((donation: Record<string, unknown>) => {
          const donationTitle: string = donation.type === 'money'
            ? t('profile:content.donationMoneyFormat', { amount: safeNum(donation.amount) })
            : donation.type === 'time'
              ? t('profile:content.volunteeringFormat', { title: safeStr(donation.title) })
              : donation.type === 'trump'
                ? t('profile:content.rideFormat', { title: safeStr(donation.title) })
                : safeStr(donation.title) || t('profile:content.newDonation');

          activities.push({
            id: `donation_${safeStr(donation.id)}`,
            type: 'donation',
            title: donationTitle,
            time: safeStr(donation.created_at || donation.createdAt) || new Date().toISOString(),
            icon: 'heart-outline',
            color: colors.error,
            rawData: donation
          });
        });
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading donations', { error });
      }

      // Load rides using the correct API endpoint
      try {
        const userRidesResponse = await apiService.getUserRides(userId, 'driver');
        if (userRidesResponse.success && Array.isArray(userRidesResponse.data)) {
          (userRidesResponse.data as Record<string, unknown>[]).forEach((ride: Record<string, unknown>) => {
            const fromLocation = safeStr(ride.from) || getLocationName(ride.from_location) || t('profile:fallbacks.notSpecified');
            const toLocation = safeStr(ride.to) || getLocationName(ride.to_location) || t('profile:fallbacks.notSpecified');
            activities.push({
              id: `ride_${safeStr(ride.id)}`,
              type: 'ride',
              title: t('profile:ride.fromToFormat', { from: fromLocation, to: toLocation }),
              time: safeStr(ride.created_at || ride.createdAt) || new Date().toISOString(),
              icon: 'car-sport-outline',
              color: colors.info,
              rawData: ride
            });
          });
        }
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading rides', { error });
      }

      // Load task posts (both assignment and completion) with proper icons
      try {
        const taskPostsRes = await apiService.getUserPosts(userId, 50, selectedUser?.id);
        if (taskPostsRes.success && Array.isArray(taskPostsRes.data)) {
          (taskPostsRes.data as Record<string, unknown>[]).forEach((p: Record<string, unknown>) => {
            if (p.post_type === 'task_assignment' || p.post_type === 'task_completion') {
              const icon = p.post_type === 'task_assignment'
                ? 'add-circle-outline'
                : 'checkmark-circle-outline';
              const color = p.post_type === 'task_assignment'
                ? colors.info
                : colors.success;
              const typeLabel = p.post_type === 'task_assignment'
                ? t('profile:content.newTask')
                : t('profile:content.taskCompleted');

              activities.push({
                id: `taskpost_${safeStr(p.id)}`,
                type: 'task_post',
                subtype: safeStr(p.post_type),
                title: safeStr(p.title) || typeLabel,
                time: safeStr(p.created_at) || new Date().toISOString(),
                icon,
                color,
                rawData: p as ProfileActivity['rawData']
              });
            }
          });
        }
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading task posts', { error });
      }

      // Load tasks (all statuses) - for tasks without posts (legacy)
      try {
        // Get task IDs we already added from posts
        const existingTaskIds = new Set(
          activities
            .filter((a) => a.type === 'task_post' && a.rawData?.task?.id)
            .map((a) => safeStr(a.rawData!.task!.id))
        );

        const tasksRes = await apiService.getTasks({ assignee: userId, limit: 50 });
        if (tasksRes.success && Array.isArray(tasksRes.data)) {
          tasksRes.data.forEach((task: Record<string, unknown>) => {
            // Skip if already added via task posts
            const taskId = safeStr(task.id);
            if (existingTaskIds.has(taskId)) {
              return;
            }

            activities.push({
              id: `task_${taskId}`,
              type: 'task',
              title: safeStr(task.title) || t('profile:content.newTask'),
              time: safeStr(task.created_at) || new Date().toISOString(),
              icon: 'checkmark-circle-outline',
              color: colors.success,
              rawData: task as ProfileActivity['rawData']
            });
          });
        }
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading tasks', { error });
      }

      // Sort by time (newest first) and limit to 10
      activities.sort((a, b) => {
        const timeA = new Date(a.time as string | number | Date).getTime();
        const timeB = new Date(b.time as string | number | Date).getTime();
        return timeB - timeA;
      });

      // Format time for display
      const formattedActivities = activities.slice(0, 10).map(activity => {
        const activityTime = new Date(activity.time as string | number | Date);
        const now = new Date();
        const diffMs = now.getTime() - activityTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeText = '';
        if (diffMins < 1) {
          timeText = t('profile:content.justNow');
        } else if (diffMins < 60) {
          timeText = t('common:time.minutesAgo', { count: diffMins });
        } else if (diffHours < 24) {
          timeText = t('common:time.hoursAgo', { count: diffHours });
        } else if (diffDays < 7) {
          timeText = t('common:time.daysAgo', { count: diffDays });
        } else {
          timeText = activityTime.toLocaleDateString('he-IL');
        }

        return {
          ...activity,
          time: timeText
        };
      });

      setRecentActivities(formattedActivities);
    } catch (error) {
      logger.error('ProfileScreen', 'Load recent activities error', { error });
      setRecentActivities([]);
    }
  }, [isOwnProfile, selectedUser, t]);

  // Function to select a random user (demo mode only - disabled)
  const selectRandomUser = () => {
    if (isRealAuth) {
      Alert.alert(t('common:errorTitle'), t('profile:alerts.disabledOnRealAuth'));
      return;
    }
    // Demo mode removed - this function is no longer available
    Alert.alert(t('common:errorTitle'), t('profile:alerts.disabledOnRealAuth'));
  };

  // Function to create sample follow data
  const handleCreateSampleData = async () => {
    if (isRealAuth) {
      Alert.alert(t('common:errorTitle'), t('profile:alerts.disabledOnRealAuth'));
      return;
    }
    if (!selectedUser?.id) {
      Alert.alert(t('common:errorTitle'), t('profile:alerts.noUserSelected'));
      return;
    }
    await createSampleFollowData();
    await createSampleChatData(selectedUser.id);
    updateUserStats();
    Alert.alert(t('profile:alerts.sampleDataTitle'), t('profile:alerts.sampleDataCreated'));
  };
  const routes = React.useMemo<TabRoute[]>(() => [
    { key: 'open', title: t('profile:contentTabs.open') },
    { key: 'closed', title: t('profile:contentTabs.closed') },
    { key: 'tagged', title: t('profile:tabs.tagged') },
  ], [t]);

  // Update stats when user changes
  useEffect(() => {
    const updateStats = async () => {
      await updateUserStats();
    };
    updateStats();
  }, [selectedUser, viewingUser, isOwnProfile, updateUserStats]);

  // Refresh stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshStats = async () => {
        logger.debug('ProfileScreen', 'Screen focused, refreshing stats', { isOwnProfile, targetUserId });
        await updateUserStats();
        if (isOwnProfile) {
          await loadRecentActivities();
        } else if (viewingUser && selectedUser) {
          // Refresh follow stats for other user's profile
          try {
            const stats = await getFollowStats(viewingUser.id, selectedUser.id);
            const counts = await getUpdatedFollowCounts(viewingUser.id);
            setFollowStats(stats);
            setUpdatedCounts(counts);
            setIsFollowing(stats.isFollowing);
          } catch (error) {
            logger.error('ProfileScreen', 'Refresh follow stats error', { error });
          }
        }

        // Force re-render by updating a timestamp
        const refreshTimestamp = Date.now();
        setUserStats(prevStats => ({
          ...prevStats,
          refreshTimestamp
        }));
      };
      refreshStats();
    }, [selectedUser, viewingUser, isOwnProfile, targetUserId, updateUserStats, loadRecentActivities])
  );

  // Load activities when selectedUser changes (only for own profile)
  useEffect(() => {
    if (isOwnProfile) {
      loadRecentActivities();
    }
  }, [selectedUser, isOwnProfile, loadRecentActivities]);

  const renderScene = ({ route: sceneRoute }: SceneRendererProps & { route: TabRoute }) => {
    switch (sceneRoute.key) {
      case 'open':
        return <ProfileOpenTab userId={targetUserId} user={displayUser ?? undefined} onHeightChange={(h) => handleTabHeightChange('open', h)} />;
      case 'closed':
        return <ProfileClosedTab userId={targetUserId} user={displayUser ?? undefined} onHeightChange={(h) => handleTabHeightChange('closed', h)} />;
      case 'tagged':
        return <ProfileTaggedTab onHeightChange={(h) => handleTabHeightChange('tagged', h)} />;
      default:
        return null;
    }
  };

  const currentTabHeight = tabHeights[routes[index].key] || 600;


  const renderTabBar = (
    props: SceneRendererProps & { navigationState: NavigationState<TabRoute> }
  ) => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarInner}>
        {props.navigationState.routes.map((route, index) => {
          const isFocused = props.navigationState.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabBarItem}
              onPress={() => props.jumpTo(route.key)}
            >
              <Text
                style={[
                  styles.tabBarText,
                  {
                    color: isFocused ? colors.secondary : colors.textSecondary,
                    fontWeight: isFocused ? 'bold' : 'normal',
                  }
                ]}
              >
                {route.title}
              </Text>
              {isFocused && <View style={styles.tabBarIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // User Statistics are now managed by state and updated via useFocusEffect
  // Recent Activities are now loaded from database (see loadRecentActivities function)

  // Derived display values
  const safeAvatarUri = sanitiseAvatarUrl(displayUser?.avatar);
  const avatarSource = safeAvatarUri ? { uri: safeAvatarUri } : defaultLogo;

  // Show error if viewing other user's profile and user not found
  if (!isOwnProfile && !loadingUser && !viewingUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
          <Text style={styles.errorText}>{t('profile:alertsProfile.userNotFound')}</Text>
          <Text style={styles.errorSubtext}>userId: {externalUserId}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('HomeStack');
              }
            }}
          >
            <Ionicons name="home" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>{t('profile:backToHome')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading if loading other user's profile
  if (!isOwnProfile && loadingUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="hourglass-outline" size={60} color={colors.textSecondary} />
          <Text style={styles.errorText}>{t('common:loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webScrollContainer}>
          <View
            style={[styles.webScrollContent, { paddingBottom: tabBarHeight + scaleSize(24) }]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              logger.debug('ProfileScreen', 'Content layout height', { height: h, windowHeight: SCREEN_HEIGHT });
            }}
          >
            {/* Header for other user's profile */}
            {!isOwnProfile && (
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.username}>{displayUser?.name || externalUserName || t('profile:fallbacks.noName')}</Text>
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={() => Alert.alert(t('common:options'), t('profile:alertsProfile.openOptions'))}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Completion Banner - only for own profile */}
            {isOwnProfile && <ProfileCompletionBanner />}

            {/* Profile Info with Menu Icon */}
            <View style={styles.profileInfo}>
              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.menuIcon}
                  onPress={() => setShowMenu(!showMenu)}
                >
                  <Ionicons name="menu" size={scaleSize(24)} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
              <View style={styles.profileSection}>
                <Image source={avatarSource} style={styles.profilePicture} />
              </View>

              <View style={styles.statsContainer}>
                {isOwnProfile && !isRealAuth && (
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{userStats.posts}</Text>
                    <Text style={styles.statLabel}>{t('profile:stats.posts')}</Text>
                  </View>
                )}
                {!isOwnProfile && (
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{(displayUser as (CharacterType & { postsCount?: number; completedTasks?: number; totalDonations?: number; parentManagerId?: string }) | null)?.postsCount || 0}</Text>
                    <Text style={styles.statLabel}>{t('profile:stats.posts')}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => {
                    if (!targetUserId) return;
                    (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('FollowersScreen', {
                      userId: targetUserId,
                      type: 'followers',
                      title: t('profile:followersTitle')
                    });
                  }}
                >
                  <Text style={styles.statNumber}>{isOwnProfile ? userStats.followers : updatedCounts.followersCount}</Text>
                  <Text style={styles.statLabel}>{t('profile:stats.followers')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => {
                    if (!targetUserId) return;
                    (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('FollowersScreen', {
                      userId: targetUserId,
                      type: 'following',
                      title: t('profile:followingTitle')
                    });
                  }}
                >
                  <Text style={styles.statNumber}>{isOwnProfile ? userStats.following : updatedCounts.followingCount}</Text>
                  <Text style={styles.statLabel}>{t('profile:stats.following')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu Modal with Backdrop - only for own profile */}
            {isOwnProfile && showMenu && (
              <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                <View style={styles.menuBackdrop}>
                  <TouchableWithoutFeedback onPress={() => { }}>
                    <View style={styles.menuOverlay}>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          navigation.navigate('BookmarksScreen' as never);
                        }}
                      >
                        <Ionicons name="bookmark-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.bookmarks')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);

                        }}
                      >
                        <Ionicons name="analytics-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.communityStats')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          Alert.alert(t('profile:alerts.shareProfile'), t('profile:alerts.shareProfileDesc'));
                        }}
                      >
                        <Ionicons name="share-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.shareProfile')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('EditProfileScreen');
                        }}
                      >
                        <Ionicons name="create-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.editProfile')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          Alert.alert(t('profile:alerts.settings'), t('profile:alerts.openSettings'));
                        }}
                      >
                        <Ionicons name="settings-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.settings')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          Alert.alert(t('profile:alerts.help'), t('profile:alerts.openHelp'));
                        }}
                      >
                        <Ionicons name="help-circle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.help')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          navigation.navigate('LoginScreen' as never);
                        }}
                      >
                        <Ionicons name="log-in-outline" size={scaleSize(20)} color={colors.textPrimary} />
                        <Text style={styles.menuItemText}>{t('profile:menu.login')}</Text>
                      </TouchableOpacity>

                      {!isRealAuth && (
                        <>
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={selectRandomUser}
                          >
                            <Ionicons name="shuffle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                            <Text style={styles.menuItemText}>{t('profile:menu.switchUser')}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleCreateSampleData}
                          >
                            <Ionicons name="add-circle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                            <Text style={styles.menuItemText}>{t('profile:menu.createSampleData')}</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            )}

            {/* Bio Section */}
            <View style={styles.bioSection}>
              <Text style={styles.fullName}>{displayUser?.name || externalUserName || ''}</Text>
              {!!displayUser?.bio && (
                <Text style={styles.bioText}>{displayUser.bio}</Text>
              )}
              {!!(typeof displayUser?.location === 'string' ? displayUser?.location : displayUser?.location?.city) && (
                <Text style={styles.locationText}>
                  <Ionicons name="location-outline" size={scaleSize(14)} color={colors.textSecondary} />{' '}
                  {typeof displayUser?.location === 'string' ? displayUser?.location : displayUser?.location?.city || ''}
                </Text>
              )}

              {/* Additional user details for other user's profile */}
              {!isOwnProfile && displayUser && (
                <View style={styles.characterDetails}>
                  {/* Verification badge */}
                  {(displayUser as CharacterType).isVerified && (
                    <View style={styles.verificationBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.info} />
                      <Text style={styles.verifiedText}>{t('profile:verified')}</Text>
                    </View>
                  )}

                  {/* Roles */}
                  {displayUser.roles && displayUser.roles.length > 0 && (
                    <View style={styles.rolesContainer}>
                      {displayUser.roles.map((role, index) => (
                        <View key={index} style={styles.roleTag}>
                          <Text style={styles.roleText}>{getRoleDisplayName(role, t)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Interests */}
                  {displayUser.interests && displayUser.interests.length > 0 && (
                    <View style={styles.interestsContainer}>
                      <Text style={styles.sectionTitle}>{t('profile:interestsSectionTitle')}</Text>
                      <View style={styles.interestsList}>
                        {displayUser.interests.slice(0, 4).map((interest, index) => (
                          <Text key={index} style={styles.interestTag}>#{interest}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Join date */}
                  {displayUser.joinDate && (
                    <Text style={styles.joinDate}>
                      {t('profile:joinedDatePrefix')}{new Date(displayUser.joinDate).toLocaleDateString('he-IL')}
                    </Text>
                  )}
                </View>
              )}

              {/* Karma Points */}
              <View style={styles.karmaSection}>
                <View style={styles.karmaCard}>
                  <Ionicons name="star" size={scaleSize(20)} color={colors.warning} />
                  <Text style={styles.karmaText}>{(displayUser?.karmaPoints || userStats.karmaPoints)} {t('profile:stats.karmaPointsSuffix')}</Text>
                </View>
              </View>

              {/* Activity Icons - only for own profile */}
              {isOwnProfile && !isRealAuth && (
                <View style={styles.activityIcons}>
                  <TouchableOpacity
                    style={styles.activityIconItem}
                    onPress={() => Alert.alert(t('profile:alerts.activity'), t('profile:alerts.viewActivity'))}
                  >
                    <Ionicons name="star-outline" size={scaleSize(24)} color={colors.secondary} />
                    <Text style={styles.activityIconText}>{t('profile:activity')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.activityIconItem}
                    onPress={() => Alert.alert(t('profile:alerts.history'), t('profile:alerts.activityHistory'))}
                  >
                    <MaterialCommunityIcons name="history" size={scaleSize(24)} color={colors.secondary} />
                    <Text style={styles.activityIconText}>{t('profile:history')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.activityIconItem}
                    onPress={() => Alert.alert(t('profile:alerts.favorites'), t('profile:alerts.yourFavorites'))}
                  >
                    <Ionicons name="heart-outline" size={scaleSize(24)} color={colors.secondary} />
                    <Text style={styles.activityIconText}>{t('profile:favorites')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              {isOwnProfile ? (
                <>
                  <TouchableOpacity
                    style={styles.discoverPeopleButton}
                    onPress={() => {
                      navigation.navigate('DiscoverPeopleScreen' as never);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={scaleSize(18)} color={colors.white} />
                    <Text style={styles.discoverPeopleText}>{t('profile:discoverPeople')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {selectedUser && displayUser && selectedUser.id !== displayUser.id && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.followButton,
                          isFollowing && styles.followingButton
                        ]}
                        onPress={async () => {
                          if (!selectedUser) {
                            Alert.alert(t('common:error'), t('profile:alertsProfile.loginRequired'));
                            return;
                          }

                          try {
                            if (!displayUser?.id) {
                              Alert.alert(t('common:error'), t('profile:alertsProfile.userNotFound'));
                              return;
                            }

                            if (isFollowing) {
                              const success = await unfollowUser(selectedUser.id, displayUser.id);
                              if (success) {
                                setIsFollowing(false);
                                const newCounts = await getUpdatedFollowCounts(displayUser.id);
                                setUpdatedCounts(newCounts);
                                setFollowStats(prev => ({ ...prev, isFollowing: false }));
                                Alert.alert(t('profile:alertsProfile.unfollowTitle'), t('profile:alertsProfile.unfollowSuccess'));
                              }
                            } else {
                              const success = await followUser(selectedUser.id, displayUser.id);
                              if (success) {
                                setIsFollowing(true);
                                const newCounts = await getUpdatedFollowCounts(displayUser.id);
                                setUpdatedCounts(newCounts);
                                setFollowStats(prev => ({ ...prev, isFollowing: true }));
                                Alert.alert(t('profile:follow.follow'), t('profile:alertsProfile.followSuccess'));
                              }
                            }
                          } catch (error) {
                            logger.error('ProfileScreen', 'Follow/Unfollow error', { error });
                            Alert.alert(t('common:error'), t('profile:alertsProfile.actionFailed'));
                          }
                        }}
                      >
                        <Text style={[
                          styles.followButtonText,
                          isFollowing && styles.followingButtonText
                        ]}>
                          {isFollowing ? t('profile:follow.following') : t('profile:follow.follow')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={async () => {
                          if (!selectedUser || !displayUser) {
                            Alert.alert(t('common:error'), t('profile:alertsProfile.selectUserFirst'));
                            return;
                          }

                          try {
                            const existingConvId = await conversationExists(selectedUser.id, displayUser.id);
                            let conversationId: string;

                            if (existingConvId) {
                              logger.debug('ProfileScreen', 'Conversation already exists', { existingConvId });
                              conversationId = existingConvId;
                            } else {
                              logger.debug('ProfileScreen', 'Creating new conversation');
                              conversationId = await createConversation([selectedUser.id, displayUser.id]);
                            }

                            (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('ChatDetailScreen', {
                              conversationId,
                              otherUserId: displayUser.id,
                              userName: displayUser.name || externalUserName || t('profile:fallbacks.noName'),
                              userAvatar: displayUser.avatar || 'https://i.pravatar.cc/150?img=1',
                            });
                          } catch (error) {
                            logger.error('ProfileScreen', 'Create chat error', { error });
                            Alert.alert(t('common:error'), t('profile:alertsProfile.chatError'));
                          }
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
                        <Text style={styles.messageButtonText}>{t('profile:message')}</Text>
                      </TouchableOpacity>

                      {/* Hierarchy Management Button */}
                      {(() => {
                        const isSubordinate = (displayUser as (CharacterType & { postsCount?: number; completedTasks?: number; totalDonations?: number; parentManagerId?: string }) | null)?.parentManagerId === selectedUser?.id;
                        const isMyManager = (selectedUser as (CharacterType & { parentManagerId?: string }) | null)?.parentManagerId === displayUser?.id;

                        // If they are my manager -> Request Task
                        if (isMyManager) {
                          return (
                            <TouchableOpacity
                              style={[styles.messageButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                              onPress={() => {
                                Alert.alert(t('profile:alertsProfile.taskRequestTitle'), t('profile:alertsProfile.taskRequest'), [
                                  { text: t('common:cancel'), style: 'cancel' },
                                  {
                                    text: t('chat:send'), onPress: async () => {
                                      // Create conversation and send message
                                      try {
                                        if (!selectedUser?.id || !displayUser?.id) return;
                                        const existingConvId = await conversationExists(selectedUser.id, displayUser.id);
                                        let conversationId = existingConvId;
                                        if (!conversationId) {
                                          conversationId = await createConversation([selectedUser.id, displayUser.id]);
                                        }
                                        // Send "I'd look to help" message
                                        // TODO: implement sendMessage in chatService or apiService
                                        // For now just navigate to chat
                                        (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('ChatDetailScreen', {
                                          conversationId,
                                          otherUserId: displayUser.id,
                                          userName: displayUser.name,
                                          userAvatar: displayUser.avatar,
                                          initialMessage: t('profile:alertsProfile.willingToHelp')
                                        });
                                      } catch (e) { logger.error('ProfileScreen', 'Manage hierarchy error', { error: e }); }
                                    }
                                  }
                                ]);
                              }}
                            >
                              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                              <Text style={[styles.messageButtonText, { color: colors.primary }]}>{t('profile:requestTask')}</Text>
                            </TouchableOpacity>
                          );
                        }

                        // Otherwise (Subordinate or unrelated) -> Manage Subordinate
                        return (
                          <TouchableOpacity
                            style={[
                              styles.messageButton,
                              isSubordinate ? { backgroundColor: colors.error + '10', borderColor: colors.error } : { backgroundColor: colors.secondary + '10', borderColor: colors.secondary }
                            ]}
                            onPress={() => {
                              const action = isSubordinate ? 'remove' : 'add';
                              const title = isSubordinate ? t('profile:hierarchy.removeManager') : t('profile:hierarchy.makeManager');
                              const msg = isSubordinate
                                ? t('profile:hierarchy.removeManagerConfirm')
                                : t('profile:hierarchy.makeManagerConfirm');

                              Alert.alert(title, msg, [
                                { text: t('common:cancel'), style: 'cancel' },
                                {
                                  text: t('common:confirm'), style: isSubordinate ? 'destructive' : 'default', onPress: async () => {
                                    try {
                                      const res = await apiService.manageHierarchy(displayUser.id!, action, selectedUser.id);
                                      if (res.success) {
                                        Alert.alert(t('profile:hierarchy.success'), res.message);
                                        setViewingUser(prev => prev ? ({ ...prev, parentManagerId: action === 'add' ? selectedUser.id : null }) : null);
                                      } else {
                                        Alert.alert(t('common:error'), res.error || t('profile:hierarchy.actionFailed'));
                                      }
                                    } catch (err) {
                                      logger.error('ProfileScreen', 'Manage hierarchy error', { error: err });
                                      Alert.alert(t('common:error'), t('profile:hierarchy.communicationError'));
                                    }
                                  }
                                }
                              ]);
                            }}
                          >
                            <Ionicons name={isSubordinate ? "person-remove-outline" : "person-add-outline"} size={20} color={isSubordinate ? colors.error : colors.secondary} />
                            <Text style={[styles.messageButtonText, { color: isSubordinate ? colors.error : colors.secondary }]}>
                              {isSubordinate ? t('profile:hierarchy.removeManager') : t('profile:hierarchy.makeManager')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
            </View>

            {/* Recent Activities - only for own profile */}
            {isOwnProfile && (
              <View style={styles.activitiesSection}>
                <Text style={styles.sectionTitle}>{t('profile:sections.recentActivity')}</Text>
                {recentActivities.length === 0 ? (
                  <View style={styles.emptyActivitiesContainer}>
                    <Ionicons name="time-outline" size={scaleSize(40)} color={colors.textSecondary} />
                    <Text style={styles.emptyActivitiesText}>{t('profile:recent.noActivityYet')}</Text>
                    <Text style={styles.emptyActivitiesSubtext}>{t('profile:recent.startCreating')}</Text>
                  </View>
                ) : (
                  recentActivities.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={styles.activityItem}
                      onPress={() => {
                        // Open modal for item and ride types
                        if (activity.type === 'item' || activity.type === 'ride') {
                          setSelectedActivity(activity);
                          setShowActivityModal(true);
                        } else {
                          // For post and donation, show alert for now
                          Alert.alert(activity.title, activity.time);
                        }
                      }}
                    >
                      <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                        <Ionicons name={(activity.icon || 'document-outline') as keyof typeof Ionicons.glyphMap} size={16} color={activity.color} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Story Highlights - only for own profile */}
            {isOwnProfile && (
              <View style={styles.highlightsSection}>
                <Text style={styles.sectionTitle}>{t('profile:sections.highlights')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storyHighlightsContentContainer}
                >
                  {(isRealAuth ? [0] : Array.from({ length: 8 }).map((_, i) => i)).map((i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.storyHighlightItem}
                      onPress={() => {
                        if (i === 0) {
                          Alert.alert(t('profile:alerts.highlight'), t('profile:highlights.new'));
                        } else {
                          Alert.alert(t('profile:alerts.highlight'), t('profile:highlights.highlightIndex', { index: (i + 1).toString() }));
                        }
                      }}
                    >
                      <View style={styles.storyHighlightCircle}>
                        {i === 0 ? (
                          <Ionicons name="add" size={scaleSize(24)} color={colors.secondary} />
                        ) : (
                          <Image
                            source={{ uri: `https://picsum.photos/60/60?random=${i + 10}` }}
                            style={styles.highlightImage}
                          />
                        )}
                      </View>
                      <Text style={styles.storyHighlightText}>
                        {i === 0 ? t('profile:highlights.new') : t('profile:highlights.highlightIndex', { index: i })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Tab View Container */}
            <View style={[styles.tabViewContainer, { height: currentTabHeight }]}>
              <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: getScreenInfo().width }}
                renderTabBar={renderTabBar}
              />
            </View>
          </View>
        </View>
      ) : (
        <ScrollContainer
          style={styles.mainScrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentStyle={{ ...styles.mainScrollContent, paddingBottom: tabBarHeight + scaleSize(24) }}
        >
          {/* Header for other user's profile */}
          {!isOwnProfile && (
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.username}>{displayUser?.name || externalUserName || t('profile:fallbacks.noName')}</Text>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => Alert.alert(t('common:options'), t('profile:alertsProfile.openOptions'))}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Completion Banner - only for own profile */}
          {isOwnProfile && <ProfileCompletionBanner />}

          {/* Profile Info with Menu Icon */}
          <View style={styles.profileInfo}>
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.menuIcon}
                onPress={() => setShowMenu(!showMenu)}
              >
                <Ionicons name="menu" size={scaleSize(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            <View style={styles.profileSection}>
              <Image source={avatarSource} style={styles.profilePicture} />
            </View>

            <View style={styles.statsContainer}>
              {isOwnProfile && !isRealAuth && (
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{userStats.posts}</Text>
                  <Text style={styles.statLabel}>{t('profile:stats.posts')}</Text>
                </View>
              )}
              {!isOwnProfile && (
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{(displayUser as (CharacterType & { postsCount?: number; completedTasks?: number; totalDonations?: number; parentManagerId?: string }) | null)?.postsCount || 0}</Text>
                  <Text style={styles.statLabel}>{t('profile:stats.posts')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  if (!targetUserId) return;
                  (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('FollowersScreen', {
                    userId: targetUserId,
                    type: 'followers',
                    title: t('profile:followersTitle')
                  });
                }}
              >
                <Text style={styles.statNumber}>{isOwnProfile ? userStats.followers : updatedCounts.followersCount}</Text>
                <Text style={styles.statLabel}>{t('profile:stats.followers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  if (!targetUserId) return;
                  (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('FollowersScreen', {
                    userId: targetUserId,
                    type: 'following',
                    title: t('profile:followingTitle')
                  });
                }}
              >
                <Text style={styles.statNumber}>{isOwnProfile ? userStats.following : updatedCounts.followingCount}</Text>
                <Text style={styles.statLabel}>{t('profile:stats.following')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Modal with Backdrop - only for own profile */}
          {isOwnProfile && showMenu && (
            <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
              <View style={styles.menuBackdrop}>
                <TouchableWithoutFeedback onPress={() => { }}>
                  <View style={styles.menuOverlay}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        navigation.navigate('BookmarksScreen' as never);
                      }}
                    >
                      <Ionicons name="bookmark-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.bookmarks')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);

                      }}
                    >
                      <Ionicons name="analytics-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.communityStats')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        Alert.alert(t('profile:alerts.shareProfile'), t('profile:alerts.shareProfileDesc'));
                      }}
                    >
                      <Ionicons name="share-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.shareProfile')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('EditProfileScreen');
                      }}
                    >
                      <Ionicons name="create-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.editProfile')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        Alert.alert(t('profile:alerts.settings'), t('profile:alerts.openSettings'));
                      }}
                    >
                      <Ionicons name="settings-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.settings')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        Alert.alert(t('profile:alerts.help'), t('profile:alerts.openHelp'));
                      }}
                    >
                      <Ionicons name="help-circle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.help')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        navigation.navigate('LoginScreen' as never);
                      }}
                    >
                      <Ionicons name="log-in-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.login')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={selectRandomUser}
                    >
                      <Ionicons name="shuffle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.switchUser')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={handleCreateSampleData}
                    >
                      <Ionicons name="add-circle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.createSampleData')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          )}

          {/* Bio Section */}
          <View style={styles.bioSection}>
            <Text style={styles.fullName}>{displayUser?.name || externalUserName || ''}</Text>
            {!!displayUser?.bio && (
              <Text style={styles.bioText}>{displayUser.bio}</Text>
            )}
            {!!(typeof displayUser?.location === 'string' ? displayUser?.location : displayUser?.location?.city) && (
              <Text style={styles.locationText}>
                <Ionicons name="location-outline" size={scaleSize(14)} color={colors.textSecondary} />{' '}
                {typeof displayUser?.location === 'string' ? displayUser?.location : displayUser?.location?.city || ''}
              </Text>
            )}

            {/* Additional user details for other user's profile */}
            {!isOwnProfile && displayUser && (
              <View style={styles.characterDetails}>
                {/* Verification badge */}
                {(displayUser as CharacterType).isVerified && (
                  <View style={styles.verificationBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.info} />
                    <Text style={styles.verifiedText}>{t('profile:verified')}</Text>
                  </View>
                )}

                {/* Roles */}
                {displayUser.roles && displayUser.roles.length > 0 && (
                  <View style={styles.rolesContainer}>
                    {displayUser.roles.map((role, index) => (
                      <View key={index} style={styles.roleTag}>
                        <Text style={styles.roleText}>{getRoleDisplayName(role, t)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Interests */}
                {displayUser.interests && displayUser.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    <Text style={styles.sectionTitle}>{t('profile:interestsSectionTitle')}</Text>
                    <View style={styles.interestsList}>
                      {displayUser.interests.slice(0, 4).map((interest, index) => (
                        <Text key={index} style={styles.interestTag}>#{interest}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Join date */}
                {displayUser.joinDate && (
                  <Text style={styles.joinDate}>
                    {t('profile:joinedDatePrefix')}{new Date(displayUser.joinDate).toLocaleDateString('he-IL')}
                  </Text>
                )}
              </View>
            )}

            {/* Karma Points */}
            <View style={styles.karmaSection}>
              <View style={styles.karmaCard}>
                <Ionicons name="star" size={scaleSize(20)} color={colors.warning} />
                <Text style={styles.karmaText}>{(displayUser?.karmaPoints || userStats.karmaPoints)} {t('profile:stats.karmaPointsSuffix')}</Text>
              </View>
            </View>

            {/* Activity Icons - only for own profile */}
            {isOwnProfile && !isRealAuth && (
              <View style={styles.activityIcons}>
                <TouchableOpacity
                  style={styles.activityIconItem}
                  onPress={() => Alert.alert(t('profile:alerts.activity'), t('profile:alerts.viewActivity'))}
                >
                  <Ionicons name="star-outline" size={scaleSize(24)} color={colors.secondary} />
                  <Text style={styles.activityIconText}>{t('profile:activity')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.activityIconItem}
                  onPress={() => Alert.alert(t('profile:alerts.history'), t('profile:alerts.activityHistory'))}
                >
                  <MaterialCommunityIcons name="history" size={scaleSize(24)} color={colors.secondary} />
                  <Text style={styles.activityIconText}>{t('profile:history')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.activityIconItem}
                  onPress={() => Alert.alert(t('profile:alerts.favorites'), t('profile:alerts.yourFavorites'))}
                >
                  <Ionicons name="heart-outline" size={scaleSize(24)} color={colors.secondary} />
                  <Text style={styles.activityIconText}>{t('profile:favorites')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.discoverPeopleButton}
                  onPress={() => {
                    navigation.navigate('DiscoverPeopleScreen' as never);
                  }}
                >
                  <Ionicons name="person-add-outline" size={scaleSize(18)} color={colors.white} />
                  <Text style={styles.discoverPeopleText}>{t('profile:discoverPeople')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notificationsButton}
                  onPress={() => {
                    navigation.navigate('NotificationsScreen' as never);
                  }}
                >
                  <Ionicons name="notifications-outline" size={scaleSize(18)} color={colors.white} />
                  <Text style={styles.notificationsButtonText}>{t('profile:notifications')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {selectedUser && displayUser && selectedUser.id !== displayUser.id && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.followButton,
                        isFollowing && styles.followingButton
                      ]}
                      onPress={async () => {
                        if (!selectedUser) {
                          Alert.alert(t('common:error'), t('profile:alertsProfile.loginRequired'));
                          return;
                        }

                        try {
                          if (!displayUser?.id) {
                            Alert.alert(t('common:error'), t('profile:alertsProfile.userNotFound'));
                            return;
                          }

                          if (isFollowing) {
                            const success = await unfollowUser(selectedUser.id, displayUser.id);
                            if (success) {
                              setIsFollowing(false);
                              const newCounts = await getUpdatedFollowCounts(displayUser.id);
                              setUpdatedCounts(newCounts);
                              setFollowStats(prev => ({ ...prev, isFollowing: false }));
                              Alert.alert(t('profile:alertsProfile.unfollowTitle'), t('profile:alertsProfile.unfollowSuccess'));
                            }
                          } else {
                            const success = await followUser(selectedUser.id, displayUser.id);
                            if (success) {
                              setIsFollowing(true);
                              const newCounts = await getUpdatedFollowCounts(displayUser.id);
                              setUpdatedCounts(newCounts);
                              setFollowStats(prev => ({ ...prev, isFollowing: true }));
                              Alert.alert(t('profile:follow.follow'), t('profile:alertsProfile.followSuccess'));
                            }
                          }
                        } catch (error) {
                          logger.error('ProfileScreen', 'Follow/Unfollow error', { error });
                          Alert.alert(t('common:error'), t('profile:alertsProfile.actionFailed'));
                        }
                      }}
                    >
                      <Text style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText
                      ]}>
                        {isFollowing ? t('profile:follow.following') : t('profile:follow.follow')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={async () => {
                        if (!selectedUser) {
                          Alert.alert(t('common:error'), t('profile:alertsProfile.selectUserFirst'));
                          return;
                        }

                        if (!selectedUser || !displayUser) return;
                        try {
                          const existingConvId = await conversationExists(selectedUser.id, displayUser.id);
                          let conversationId: string;

                          if (existingConvId) {
                            logger.debug('ProfileScreen', 'Conversation already exists', { existingConvId });
                            conversationId = existingConvId;
                          } else {
                            logger.debug('ProfileScreen', 'Creating new conversation');
                            conversationId = await createConversation([selectedUser.id, displayUser.id]);
                          }

                          (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate('ChatDetailScreen', {
                            conversationId,
                            otherUserId: displayUser.id,
                            userName: displayUser.name || externalUserName || t('profile:fallbacks.noName'),
                            userAvatar: displayUser.avatar || 'https://i.pravatar.cc/150?img=1',
                          });
                        } catch (error) {
                          logger.error('ProfileScreen', 'Create chat error', { error });
                          Alert.alert(t('common:error'), t('profile:alertsProfile.chatError'));
                        }
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
                      <Text style={styles.messageButtonText}>{t('profile:message')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          {/* Recent Activities - only for own profile */}
          {isOwnProfile && (
            <View style={styles.activitiesSection}>
              <Text style={styles.sectionTitle}>{t('profile:sections.recentActivity')}</Text>
              {recentActivities.length === 0 ? (
                <View style={styles.emptyActivitiesContainer}>
                  <Ionicons name="time-outline" size={scaleSize(40)} color={colors.textSecondary} />
                  <Text style={styles.emptyActivitiesText}>{t('profile:recent.noActivityYet')}</Text>
                  <Text style={styles.emptyActivitiesSubtext}>{t('profile:recent.startCreating')}</Text>
                </View>
              ) : (
                recentActivities.map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.activityItem}
                    onPress={() => {
                      // Open modal for item and ride types
                      if (activity.type === 'item' || activity.type === 'ride') {
                        setSelectedActivity(activity);
                        setShowActivityModal(true);
                      } else {
                        // For post and donation, show alert for now
                        Alert.alert(activity.title, activity.time);
                      }
                    }}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                      <Ionicons name={(activity.icon || 'document-outline') as keyof typeof Ionicons.glyphMap} size={16} color={activity.color} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Story Highlights - only for own profile */}
          {isOwnProfile && (
            <View style={styles.highlightsSection}>
              <Text style={styles.sectionTitle}>{t('profile:sections.highlights')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storyHighlightsContentContainer}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.storyHighlightItem}
                    onPress={() => Alert.alert(t('profile:alerts.highlight'), t('profile:highlights.highlightIndex', { index: (i + 1).toString() }))}
                  >
                    <View style={styles.storyHighlightCircle}>
                      {i === 0 ? (
                        <Ionicons name="add" size={scaleSize(24)} color={colors.secondary} />
                      ) : (
                        <Image
                          source={{ uri: `https://picsum.photos/60/60?random=${i + 10}` }}
                          style={styles.highlightImage}
                        />
                      )}
                    </View>
                    <Text style={styles.storyHighlightText}>
                      {i === 0 ? t('profile:highlights.new') : t('profile:highlights.highlightIndex', { index: i })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tab View Container */}
          <View style={[styles.tabViewContainer, { height: currentTabHeight }]}>
            <TabView
              navigationState={{ index, routes }}
              renderScene={renderScene}
              onIndexChange={setIndex}
              initialLayout={{ width: getScreenInfo().width }}
              renderTabBar={renderTabBar}
            />
          </View>
        </ScrollContainer>
      )}

      {/* Activity Details Modal */}
      {selectedActivity && (selectedActivity.type === 'item' || selectedActivity.type === 'ride') && (
        <ItemDetailsModal
          visible={showActivityModal}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedActivity(null);
          }}
          item={(selectedActivity.rawData ?? null) as ItemOrRideRecord | null}
          type={selectedActivity.type}
          navigation={navigation}
          showOwnerInfo={false}
        />
      )}
      {ToastComponent}
    </SafeAreaView>
  );
}

// Wrapper component that calls useBottomTabBarHeight
// This is used when viewing own profile (in bottom tab navigator)
function ProfileScreenWithTabBar() {
  const tabBarHeight = useBottomTabBarHeight();
  return <ProfileScreenContent tabBarHeight={tabBarHeight} />;
}

// Main export - uses the hook for own profile
// Main export - uses the hook for own profile
export default function ProfileScreen(props: Record<string, unknown>) {
  const route = useRoute();
  let routeParams = route.params as ProfileScreenRouteParams | undefined;

  // On Web, handle refresh (F5) by restoring params from localStorage if route params are missing
  const STORAGE_KEY = 'profileScreenParams';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !routeParams && !props?.userId) {
    // Try to restore from localStorage when route params are missing (after refresh)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedParams = JSON.parse(stored);
        routeParams = parsedParams;
        logger.debug('ProfileScreen', 'Restored params from localStorage', { parsedParams });
      }
    } catch (error) {
      logger.warn('ProfileScreen', 'Failed to restore params from localStorage', { error });
    }
  }

  // Allow props to override route params (useful when used as a child component)
  const propUserId = props?.userId as string | undefined;
  const propUserName = props?.userName as string | undefined;
  const propCharacterData = props?.characterData as CharacterType | undefined;
  const isExplicitOtherProfile = props?.isExplicitOtherProfile === true;

  // Use restored params if props are not provided
  const externalUserId = propUserId ?? routeParams?.userId;
  const { selectedUser } = useUser();

  // Determine if viewing own profile or other user's profile
  // CRITICAL: If externalUserId exists and equals selectedUser.id, it's OWN profile!
  // Only if externalUserId exists and is DIFFERENT from selectedUser.id, it's another user's profile
  // If no externalUserId, it's own profile (default - viewing from ProfileTabStack)

  // Normalize IDs to strings for comparison (in case one is number and one is string)
  const normalizedExternalUserId = externalUserId ? String(externalUserId).trim() : null;
  const normalizedSelectedUserId = selectedUser?.id ? String(selectedUser.id).trim() : null;

  // Check if viewing other user: 
  // 1. Explicitly requested via prop
  // 2. externalUserId exists AND it's different from selectedUser.id
  const isViewingOtherUser = isExplicitOtherProfile ||
    (normalizedExternalUserId &&
      normalizedSelectedUserId &&
      normalizedExternalUserId !== normalizedSelectedUserId);

  // Debug log to help identify the issue
  logger.debug('ProfileScreen', 'Route check', {
    externalUserId,
    propUserId,
    normalizedExternalUserId,
    selectedUserId: selectedUser?.id,
    normalizedSelectedUserId,
    isViewingOtherUser,
    isExplicitOtherProfile,
    areEqual: normalizedExternalUserId === normalizedSelectedUserId,
    hasExternalUserId: !!externalUserId,
    hasSelectedUser: !!selectedUser
  });

  // If explicitly viewing other profile but no user ID, we need to handle it in Content
  // Pass params to Content
  const passedParams: ProfileScreenRouteParams = {
    userId: externalUserId ?? undefined,
    userName: propUserName ?? routeParams?.userName,
    characterData: propCharacterData ?? routeParams?.characterData
  };

  if (isViewingOtherUser) {
    // Viewing another user's profile - not in bottom tab navigator
    // Use ProfileScreenContent directly with tabBarHeight = 0 (no hook call)
    logger.debug('ProfileScreen', 'Using ProfileScreenContent (other user)');
    // Pass the params via route override or similar mechanism if ProfileScreenContent relies on useRoute
    // Actually ProfileScreenContent calls useRoute(). We should probably pass props to it.
    // Let's modify ProfileScreenContent to accept overrides.
    return <ProfileScreenContent tabBarHeight={0} manualParams={passedParams} forceOtherProfile={true} />;
  }

  // Viewing own profile (either no externalUserId, or externalUserId === selectedUser.id)
  // In bottom tab navigator, can use the hook
  logger.debug('ProfileScreen', 'Using ProfileScreenWithTabBar (own profile)');
  return <ProfileScreenWithTabBar />;
}
