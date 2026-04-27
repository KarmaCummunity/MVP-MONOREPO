/**
 * Main profile body (own vs other user). Extracted from ProfileScreen.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView } from 'react-native-tab-view';
import type { SceneRendererProps, NavigationState } from 'react-native-tab-view';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import colors from '../../globals/colors';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../stores/userStore';
import ScrollContainer from '../../components/ScrollContainer';
import ProfileCompletionBanner from '../../components/ProfileCompletionBanner';
import ItemDetailsModal from '../../components/ItemDetailsModal';
import { scaleSize } from '../../globals/responsive';
import { getFollowStats, followUser, unfollowUser, createSampleFollowData, getUpdatedFollowCounts } from '../../utils/followService';
import { createSampleChatData, createConversation, conversationExists } from '../../utils/chatService';
import { enhancedDB } from '../../utils/enhancedDatabaseService';
import { apiService } from '../../utils/apiService';
import { USE_BACKEND } from '../../utils/dbConfig';
import { useToast } from '../../utils/toastService';
import { sanitiseAvatarUrl } from '../../utils/urlValidator';
import { getRoleDisplayName } from './profileScreenHelpers';
import { styles, SCREEN_HEIGHT } from './profileScreen.styles';
import { OpenRoute } from './OpenRoute';
import { ClosedRoute } from './ClosedRoute';
import type { CharacterType, TabRoute, ProfileScreenRouteParams } from './profileScreenTypes';
export function ProfileScreenContent({
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
  const defaultLogo = require('../../assets/images/android-chrome-192x192.png');

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
          console.log('👤 ProfileScreen - Restored params from localStorage:', parsedParams);
        }
      } catch (error) {
        console.warn('Failed to restore params from localStorage:', error);
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
        console.warn('Failed to save params to localStorage:', error);
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
  console.log('👤 ProfileScreenContent - Profile check:', {
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
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
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
            const userData = response.data as any;
            const mappedUser: CharacterType = {
              id: userData.id,
              name: userData.name || externalUserName || 'ללא שם',
              avatar: userData.avatar_url || userData.avatar || 'https://i.pravatar.cc/150?img=1',
              bio: userData.bio || '',
              karmaPoints: userData.karma_points || 0,
              completedTasks: 0,
              roles: userData.roles || ['user'],
              isVerified: userData.is_verified || false,
              location: userData.city ? {
                city: userData.city,
                country: userData.country || 'ישראל'
              } : { city: 'ישראל', country: 'IL' },
              joinDate: userData.join_date || userData.created_at || new Date().toISOString(),
              interests: userData.interests || [],
              parentManagerId: userData.parent_manager_id || null,
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
            console.warn('User not found:', externalUserId);
            setViewingUser(null);
          }
        } catch (err) {
          console.error('❌ Load user error:', err);
          if (externalUserName && externalUserName !== 'משתמש לא ידוע') {
            setViewingUser({
              id: externalUserId,
              name: externalUserName || 'ללא שם',
              avatar: 'https://i.pravatar.cc/150?img=1',
              bio: '',
              karmaPoints: 0,
              completedTasks: 0,
              roles: ['user'],
              isVerified: false,
              location: { city: 'ישראל', country: 'IL' },
              joinDate: new Date().toISOString(),
              interests: [],
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
          name: externalUserName || 'ללא שם',
          avatar: 'https://i.pravatar.cc/150?img=1',
          bio: '',
          karmaPoints: 0,
          completedTasks: 0,
          roles: ['user'],
          isVerified: false,
          location: { city: 'ישראל', country: 'IL' },
          joinDate: new Date().toISOString(),
          interests: [],
        });
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [externalUserId, externalUserName, externalCharacterData, isOwnProfile]);

  // Load follow stats when viewing other user's profile
  useEffect(() => {
    const loadFollowStats = async () => {
      if (isOwnProfile || !viewingUser || !selectedUser || !viewingUser.id) return;

      try {
        console.log('👤 ProfileScreen - Loading follow stats for user:', viewingUser.name);
        const stats = await getFollowStats(viewingUser.id, selectedUser.id);
        const counts = await getUpdatedFollowCounts(viewingUser.id);
        setFollowStats(stats);
        setUpdatedCounts(counts);
        setIsFollowing(stats.isFollowing);
      } catch (error) {
        console.error('❌ Load follow stats error:', error);
      }
    };

    loadFollowStats();
  }, [viewingUser, selectedUser, isOwnProfile]);

  // Function to update user statistics
  const updateUserStats = React.useCallback(async () => {
    try {
      const userIdToUse = isOwnProfile ? selectedUser?.id : viewingUser?.id;
      if (!userIdToUse) {
        console.warn('⚠️ No user ID, skipping stats update');
        return;
      }

      const currentUserStats = await getFollowStats(userIdToUse, userIdToUse);
      const userToUse = isOwnProfile ? selectedUser : viewingUser;

      setUserStats({
        posts: (userToUse as any)?.postsCount || 0,
        followers: currentUserStats.followersCount,
        following: currentUserStats.followingCount,
        karmaPoints: userToUse?.karmaPoints || 0,
        completedTasks: (userToUse as any)?.completedTasks || 0,
        totalDonations: (userToUse as any)?.totalDonations || 0,
      });
    } catch (error) {
      console.error('❌ Update user stats error:', error);
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

      const activities: any[] = [];
      const userId = selectedUser.id;

      // Load posts
      try {
        const { db } = require('../../utils/databaseService');
        const userPosts = await db.getUserPosts(userId) || [];
        userPosts.forEach((post: any) => {
          activities.push({
            id: `post_${post.id}`,
            type: 'post',
            title: post.title || post.content || 'פוסט חדש',
            time: post.created_at || post.createdAt || new Date().toISOString(),
            icon: 'image-outline',
            color: colors.info,
            rawData: post
          });
        });
      } catch (error) {
        console.error('Error loading posts:', error);
      }

      // Load items/donations
      try {
        const { USE_BACKEND, API_BASE_URL } = await import('../../utils/dbConfig');
        let userItems: any[] = [];

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
            console.error('Error loading items from API:', error);
          }
        } else {
          const { db } = require('../../utils/databaseService');
          userItems = await db.getDedicatedItemsByOwner(userId) || [];
        }

        userItems.forEach((item: any) => {
          activities.push({
            id: `item_${item.id}`,
            type: 'item',
            title: item.title || 'פריט חדש',
            time: item.created_at || item.createdAt || new Date().toISOString(),
            icon: 'cube-outline',
            color: colors.pink,
            rawData: item
          });
        });
      } catch (error) {
        console.error('Error loading items:', error);
      }

      // Load donations - filter by createdBy after loading
      try {
        const allDonations = await enhancedDB.getDonations({});
        const userDonations = allDonations.filter((donation: any) => {
          const createdBy = donation.createdBy || donation.created_by || donation.donor_id || donation.donorId;
          return createdBy === userId;
        });

        userDonations.forEach((donation: any) => {
          const donationTitle = donation.type === 'money'
            ? `תרומה: ${donation.amount || 0} ₪`
            : donation.type === 'time'
              ? `התנדבות: ${donation.title || ''}`
              : donation.type === 'trump'
                ? `טרמפ: ${donation.title || ''}`
                : donation.title || 'תרומה חדשה';

          activities.push({
            id: `donation_${donation.id}`,
            type: 'donation',
            title: donationTitle,
            time: donation.created_at || donation.createdAt || new Date().toISOString(),
            icon: 'heart-outline',
            color: colors.error,
            rawData: donation
          });
        });
      } catch (error) {
        console.error('Error loading donations:', error);
      }

      // Load rides using the correct API endpoint
      try {
        const userRidesResponse = await apiService.getUserRides(userId, 'driver');
        if (userRidesResponse.success && Array.isArray(userRidesResponse.data)) {
          userRidesResponse.data.forEach((ride: any) => {
            const fromLocation = ride.from || ride.from_location?.name || ride.from_location?.city || 'לא צויין';
            const toLocation = ride.to || ride.to_location?.name || ride.to_location?.city || 'לא צויין';
            activities.push({
              id: `ride_${ride.id}`,
              type: 'ride',
              title: `טרמפ: ${fromLocation} ➝ ${toLocation}`,
              time: ride.created_at || ride.createdAt || new Date().toISOString(),
              icon: 'car-sport-outline',
              color: colors.info,
              rawData: ride
            });
          });
        }
      } catch (error) {
        console.error('Error loading rides:', error);
      }

      // Load task posts (both assignment and completion) with proper icons
      try {
        const taskPostsRes = await apiService.getUserPosts(userId, 50, selectedUser?.id);
        if (taskPostsRes.success && Array.isArray(taskPostsRes.data)) {
          taskPostsRes.data.forEach((p: any) => {
            if (p.post_type === 'task_assignment' || p.post_type === 'task_completion') {
              const icon = p.post_type === 'task_assignment'
                ? 'add-circle-outline'
                : 'checkmark-circle-outline';
              const color = p.post_type === 'task_assignment'
                ? colors.info
                : colors.success;
              const typeLabel = p.post_type === 'task_assignment'
                ? 'משימה חדשה'
                : 'משימה הושלמה';

              activities.push({
                id: `taskpost_${p.id}`,
                type: 'task_post',
                subtype: p.post_type,
                title: p.title || typeLabel,
                time: p.created_at || new Date().toISOString(),
                icon,
                color,
                rawData: p
              });
            }
          });
        }
      } catch (error) {
        console.error('Error loading task posts:', error);
      }

      // Load tasks (all statuses) - for tasks without posts (legacy)
      try {
        // Get task IDs we already added from posts
        const existingTaskIds = new Set(
          activities
            .filter((a: any) => a.type === 'task_post' && a.rawData?.task?.id)
            .map((a: any) => a.rawData.task.id)
        );

        const tasksRes = await apiService.getTasks({ assignee: userId, limit: 50 });
        if (tasksRes.success && Array.isArray(tasksRes.data)) {
          tasksRes.data.forEach((task: any) => {
            // Skip if already added via task posts
            if (existingTaskIds.has(task.id)) {
              return;
            }

            activities.push({
              id: `task_${task.id}`,
              type: 'task',
              title: task.title || 'משימה חדשה',
              time: task.created_at || new Date().toISOString(),
              icon: 'checkmark-circle-outline',
              color: colors.success,
              rawData: task
            });
          });
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
      }

      // Sort by time (newest first) and limit to 10
      activities.sort((a, b) => {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return timeB - timeA;
      });

      // Format time for display
      const formattedActivities = activities.slice(0, 10).map(activity => {
        const activityTime = new Date(activity.time);
        const now = new Date();
        const diffMs = now.getTime() - activityTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeText = '';
        if (diffMins < 1) {
          timeText = 'לפני רגע';
        } else if (diffMins < 60) {
          timeText = `לפני ${diffMins} דקות`;
        } else if (diffHours < 24) {
          timeText = `לפני ${diffHours} שעות`;
        } else if (diffDays < 7) {
          timeText = `לפני ${diffDays} ימים`;
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
      console.error('❌ Load recent activities error:', error);
      setRecentActivities([]);
    }
  }, [isOwnProfile, selectedUser]);

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
  const [routes] = useState<TabRoute[]>([
    { key: 'open', title: 'פתוח' },
    { key: 'closed', title: 'סגור' },
  ]);

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
        console.log('👤 ProfileScreen - Screen focused, refreshing stats...', { isOwnProfile, targetUserId });
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
            console.error('❌ Refresh follow stats error:', error);
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
        return <OpenRoute userId={targetUserId} user={displayUser} onHeightChange={(h) => handleTabHeightChange('open', h)} />;
      case 'closed':
        return <ClosedRoute userId={targetUserId} user={displayUser} onHeightChange={(h) => handleTabHeightChange('closed', h)} />;
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
          <Text style={styles.errorText}>משתמש לא נמצא</Text>
          <Text style={styles.errorSubtext}>userId: {externalUserId}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                (navigation as any).navigate('HomeStack');
              }
            }}
          >
            <Ionicons name="home" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>חזרה לעמוד הבית</Text>
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
          <Text style={styles.errorText}>טוען...</Text>
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
              console.log('🧭 ProfileScreen[WEB] content layout height:', h, 'window:', SCREEN_HEIGHT);
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
                <Text style={styles.username}>{displayUser?.name || externalUserName || 'ללא שם'}</Text>
                <TouchableOpacity
                  style={styles.headerIcon}
                  onPress={() => Alert.alert('אפשרויות', 'פתיחת אפשרויות')}
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
                    <Text style={styles.statNumber}>{(displayUser as any)?.postsCount || 0}</Text>
                    <Text style={styles.statLabel}>{t('profile:stats.posts')}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => {
                    if (!targetUserId) return;
                    (navigation as any).navigate('FollowersScreen', {
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
                    (navigation as any).navigate('FollowersScreen', {
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
                          (navigation as any).navigate('EditProfileScreen');
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
                      <Text style={styles.verifiedText}>מאומת</Text>
                    </View>
                  )}

                  {/* Roles */}
                  {displayUser.roles && displayUser.roles.length > 0 && (
                    <View style={styles.rolesContainer}>
                      {displayUser.roles.map((role, index) => (
                        <View key={index} style={styles.roleTag}>
                          <Text style={styles.roleText}>{getRoleDisplayName(role)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Interests */}
                  {displayUser.interests && displayUser.interests.length > 0 && (
                    <View style={styles.interestsContainer}>
                      <Text style={styles.sectionTitle}>תחומי עניין:</Text>
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
                      הצטרף ב-{new Date(displayUser.joinDate).toLocaleDateString('he-IL')}
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
                            Alert.alert('שגיאה', 'יש להתחבר תחילה');
                            return;
                          }

                          try {
                            if (!displayUser?.id) {
                              Alert.alert('שגיאה', 'משתמש לא נמצא');
                              return;
                            }

                            if (isFollowing) {
                              const success = await unfollowUser(selectedUser.id, displayUser.id);
                              if (success) {
                                setIsFollowing(false);
                                const newCounts = await getUpdatedFollowCounts(displayUser.id);
                                setUpdatedCounts(newCounts);
                                setFollowStats(prev => ({ ...prev, isFollowing: false }));
                                Alert.alert('ביטול עקיבה', 'ביטלת את העקיבה בהצלחה');
                              }
                            } else {
                              const success = await followUser(selectedUser.id, displayUser.id);
                              if (success) {
                                setIsFollowing(true);
                                const newCounts = await getUpdatedFollowCounts(displayUser.id);
                                setUpdatedCounts(newCounts);
                                setFollowStats(prev => ({ ...prev, isFollowing: true }));
                                Alert.alert('עקיבה', 'התחלת לעקוב בהצלחה');
                              }
                            }
                          } catch (error) {
                            console.error('❌ Follow/Unfollow error:', error);
                            Alert.alert('שגיאה', 'אירעה שגיאה בביצוע הפעולה');
                          }
                        }}
                      >
                        <Text style={[
                          styles.followButtonText,
                          isFollowing && styles.followingButtonText
                        ]}>
                          {isFollowing ? 'עוקב' : 'עקוב'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={async () => {
                          if (!selectedUser) {
                            Alert.alert('שגיאה', 'יש לבחור יוזר תחילה');
                            return;
                          }

                          try {
                            const existingConvId = await conversationExists(selectedUser.id, displayUser.id!);
                            let conversationId: string;

                            if (existingConvId) {
                              console.log('💬 Conversation already exists:', existingConvId);
                              conversationId = existingConvId;
                            } else {
                              console.log('💬 Creating new conversation...');
                              conversationId = await createConversation([selectedUser.id, displayUser.id!]);
                            }

                            (navigation as any).navigate('ChatDetailScreen', {
                              conversationId,
                              otherUserId: displayUser.id,
                              userName: displayUser.name || externalUserName || 'ללא שם',
                              userAvatar: displayUser.avatar || 'https://i.pravatar.cc/150?img=1',
                            });
                          } catch (error) {
                            console.error('❌ Create chat error:', error);
                            Alert.alert('שגיאה', 'שגיאה ביצירת השיחה');
                          }
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
                        <Text style={styles.messageButtonText}>הודעה</Text>
                      </TouchableOpacity>

                      {/* Hierarchy Management Button */}
                      {(() => {
                        const isSubordinate = (displayUser as any).parentManagerId === selectedUser.id;
                        const isMyManager = (selectedUser as any).parentManagerId === displayUser.id;

                        // If they are my manager -> Request Task
                        if (isMyManager) {
                          return (
                            <TouchableOpacity
                              style={[styles.messageButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                              onPress={() => {
                                Alert.alert('בקשת משימה', 'האם לשלוח בקשת משימה למנהל זה?', [
                                  { text: 'ביטול', style: 'cancel' },
                                  {
                                    text: 'שלח', onPress: async () => {
                                      // Create conversation and send message
                                      try {
                                        const existingConvId = await conversationExists(selectedUser.id, displayUser.id!);
                                        let conversationId = existingConvId;
                                        if (!conversationId) {
                                          conversationId = await createConversation([selectedUser.id, displayUser.id!]);
                                        }
                                        // Send "I'd look to help" message
                                        // TODO: implement sendMessage in chatService or apiService
                                        // For now just navigate to chat
                                        (navigation as any).navigate('ChatDetailScreen', {
                                          conversationId,
                                          otherUserId: displayUser.id,
                                          userName: displayUser.name,
                                          userAvatar: displayUser.avatar,
                                          initialMessage: 'אשמח לעזור במה שצריך' // Pass this if ChatDetail supports it, or handle locally
                                        });
                                      } catch (e) { console.error(e); }
                                    }
                                  }
                                ]);
                              }}
                            >
                              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                              <Text style={[styles.messageButtonText, { color: colors.primary }]}>בקש משימה</Text>
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
                              const title = isSubordinate ? 'הסר מנהל' : 'הפוך למנהל בצוות';
                              const msg = isSubordinate
                                ? 'האם אתה בטוח שברצונך להסיר משתמש זה מניהול תחתיך? המשימות יועברו אליך.'
                                : 'האם אתה בטוח שברצונך להפוך משתמש זה למנהל תחתיך?';

                              Alert.alert(title, msg, [
                                { text: 'ביטול', style: 'cancel' },
                                {
                                  text: 'אישור', style: isSubordinate ? 'destructive' : 'default', onPress: async () => {
                                    try {
                                      const res = await apiService.manageHierarchy(displayUser.id!, action, selectedUser.id);
                                      if (res.success) {
                                        Alert.alert('הצלחה', res.message);
                                        // Update local state to reflect change immediately
                                        setViewingUser(prev => prev ? ({ ...prev, parentManagerId: action === 'add' ? selectedUser.id : null }) : null);
                                      } else {
                                        Alert.alert('שגיאה', res.error || 'פעולה נכשלה');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      Alert.alert('שגיאה', 'שגיאה בתקשורת');
                                    }
                                  }
                                }
                              ]);
                            }}
                          >
                            <Ionicons name={isSubordinate ? "person-remove-outline" : "person-add-outline"} size={20} color={isSubordinate ? colors.error : colors.secondary} />
                            <Text style={[styles.messageButtonText, { color: isSubordinate ? colors.error : colors.secondary }]}>
                              {isSubordinate ? 'הסר מנהל' : 'הפוך למנהל'}
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
                    <Text style={styles.emptyActivitiesText}>{t('profile:recent.noActivityYet', 'אין פעילויות עדיין')}</Text>
                    <Text style={styles.emptyActivitiesSubtext}>{t('profile:recent.startCreating', 'התחל ליצור תוכן כדי לראות את הפעילויות שלך כאן')}</Text>
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
                        <Ionicons name={activity.icon as any} size={16} color={activity.color} />
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
                initialLayout={{ width: Dimensions.get('window').width }}
                renderTabBar={renderTabBar}
                swipeEnabled={false}
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
              <Text style={styles.username}>{displayUser?.name || externalUserName || 'ללא שם'}</Text>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => Alert.alert('אפשרויות', 'פתיחת אפשרויות')}
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
                  <Text style={styles.statNumber}>{(displayUser as any)?.postsCount || 0}</Text>
                  <Text style={styles.statLabel}>{t('profile:stats.posts')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  if (!targetUserId) return;
                  (navigation as any).navigate('FollowersScreen', {
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
                  (navigation as any).navigate('FollowersScreen', {
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
                        (navigation as any).navigate('EditProfileScreen');
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
                    <Text style={styles.verifiedText}>מאומת</Text>
                  </View>
                )}

                {/* Roles */}
                {displayUser.roles && displayUser.roles.length > 0 && (
                  <View style={styles.rolesContainer}>
                    {displayUser.roles.map((role, index) => (
                      <View key={index} style={styles.roleTag}>
                        <Text style={styles.roleText}>{getRoleDisplayName(role)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Interests */}
                {displayUser.interests && displayUser.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    <Text style={styles.sectionTitle}>תחומי עניין:</Text>
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
                    הצטרף ב-{new Date(displayUser.joinDate).toLocaleDateString('he-IL')}
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
                          Alert.alert('שגיאה', 'יש להתחבר תחילה');
                          return;
                        }

                        try {
                          if (!displayUser?.id) {
                            Alert.alert('שגיאה', 'משתמש לא נמצא');
                            return;
                          }

                          if (isFollowing) {
                            const success = await unfollowUser(selectedUser.id, displayUser.id);
                            if (success) {
                              setIsFollowing(false);
                              const newCounts = await getUpdatedFollowCounts(displayUser.id);
                              setUpdatedCounts(newCounts);
                              setFollowStats(prev => ({ ...prev, isFollowing: false }));
                              Alert.alert('ביטול עקיבה', 'ביטלת את העקיבה בהצלחה');
                            }
                          } else {
                            const success = await followUser(selectedUser.id, displayUser.id);
                            if (success) {
                              setIsFollowing(true);
                              const newCounts = await getUpdatedFollowCounts(displayUser.id);
                              setUpdatedCounts(newCounts);
                              setFollowStats(prev => ({ ...prev, isFollowing: true }));
                              Alert.alert('עקיבה', 'התחלת לעקוב בהצלחה');
                            }
                          }
                        } catch (error) {
                          console.error('❌ Follow/Unfollow error:', error);
                          Alert.alert('שגיאה', 'אירעה שגיאה בביצוע הפעולה');
                        }
                      }}
                    >
                      <Text style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText
                      ]}>
                        {isFollowing ? 'עוקב' : 'עקוב'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={async () => {
                        if (!selectedUser) {
                          Alert.alert('שגיאה', 'יש לבחור יוזר תחילה');
                          return;
                        }

                        try {
                          const existingConvId = await conversationExists(selectedUser.id, displayUser.id!);
                          let conversationId: string;

                          if (existingConvId) {
                            console.log('💬 Conversation already exists:', existingConvId);
                            conversationId = existingConvId;
                          } else {
                            console.log('💬 Creating new conversation...');
                            conversationId = await createConversation([selectedUser.id, displayUser.id!]);
                          }

                          (navigation as any).navigate('ChatDetailScreen', {
                            conversationId,
                            otherUserId: displayUser.id,
                            userName: displayUser.name || externalUserName || 'ללא שם',
                            userAvatar: displayUser.avatar || 'https://i.pravatar.cc/150?img=1',
                          });
                        } catch (error) {
                          console.error('❌ Create chat error:', error);
                          Alert.alert('שגיאה', 'שגיאה ביצירת השיחה');
                        }
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
                      <Text style={styles.messageButtonText}>הודעה</Text>
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
                  <Text style={styles.emptyActivitiesText}>{t('profile:recent.noActivityYet', 'אין פעילויות עדיין')}</Text>
                  <Text style={styles.emptyActivitiesSubtext}>{t('profile:recent.startCreating', 'התחל ליצור תוכן כדי לראות את הפעילויות שלך כאן')}</Text>
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
                      <Ionicons name={activity.icon as any} size={16} color={activity.color} />
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
              initialLayout={{ width: Dimensions.get('window').width }}
              renderTabBar={renderTabBar}
              swipeEnabled={false}
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
          item={selectedActivity.rawData}
          type={selectedActivity.type}
          navigation={navigation as any}
          showOwnerInfo={false}
        />
      )}
      {ToastComponent}
    </SafeAreaView>
  );
}
