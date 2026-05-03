/**
 * Main profile body (own vs other user). Extracted from ProfileScreen.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SceneRendererProps, NavigationState } from 'react-native-tab-view';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../globals/types';
import colors from '../../globals/colors';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../stores/userStore';
import ItemDetailsModal from '../../components/ItemDetailsModal';
import {
  getFollowStats,
  followUser,
  unfollowUser,
  createSampleFollowData,
  getUpdatedFollowCounts,
} from '../../utils/followService';
import { createSampleChatData, createConversation, conversationExists } from '../../utils/chatService';
import { useToast } from '../../utils/toastService';
import { sanitiseAvatarUrl } from '../../utils/urlValidator';
import { styles, SCREEN_HEIGHT } from './profileScreen.styles';
import { OpenRoute } from './OpenRoute';
import { ClosedRoute } from './ClosedRoute';
import type { CharacterType, TabRoute, ProfileScreenRouteParams } from './profileScreenTypes';
import { logger } from '../../utils/loggerService';
import { navigateToChatDetail } from '../../navigations/chatDetailNavigation';
import { resolveProfileRouteParams, clearProfileRouteParamsFromStorage } from './profileRouteParams';
import { useProfileRecentActivities } from './useProfileRecentActivities';
import { useProfileViewingUser } from './useProfileViewingUser';
import type { ProfileRecentActivity } from './profileScreenActivity.types';
import { ProfileScrollInner, type ProfileScrollInnerProps } from './ProfileScrollInner';

async function refreshFollowStatsForUser(
  viewingUserId: string,
  selectedUserId: string,
  setUpdatedCounts: (counts: { followersCount: number; followingCount: number }) => void,
  setIsFollowing: (v: boolean) => void,
): Promise<void> {
  const [stats, counts] = await Promise.all([
    getFollowStats(viewingUserId, selectedUserId),
    getUpdatedFollowCounts(viewingUserId),
  ]);
  setUpdatedCounts(counts);
  setIsFollowing(stats.isFollowing);
}

type ProfileExtras = CharacterType & { totalDonations?: number };

type UserStatsState = Readonly<{
  posts: number;
  followers: number;
  following: number;
  karmaPoints: number;
  completedTasks: number;
  totalDonations: number;
  refreshTimestamp?: number;
}>;

export function ProfileScreenContent(
  props: Readonly<{
    tabBarHeight: number;
    manualParams?: ProfileScreenRouteParams;
    forceOtherProfile?: boolean;
  }>,
) {
  const { tabBarHeight, manualParams, forceOtherProfile } = props;
  const route = useRoute();
  const { t } = useTranslation(['profile', 'common']);
  const { selectedUser, setSelectedUserWithMode: _setSelectedUserWithMode, isRealAuth, signOut } = useUser();
  const navigation = useNavigation();
  const rootNavigation = navigation as NavigationProp<RootStackParamList>;
  const { ToastComponent } = useToast();
  const defaultLogo = require('../../assets/images/android-chrome-192x192.png');

  const routeParams = resolveProfileRouteParams(
    manualParams,
    route.params as ProfileScreenRouteParams | undefined,
  );

  const { userId: externalUserId, userName: externalUserName, characterData: externalCharacterData } =
    routeParams ?? {};

  const normalizedExternalUserId = externalUserId ? String(externalUserId).trim() : null;
  const normalizedSelectedUserId = selectedUser?.id ? String(selectedUser.id).trim() : null;

  const isOwnProfile =
    !forceOtherProfile &&
    (!normalizedExternalUserId || normalizedExternalUserId === normalizedSelectedUserId);

  const targetUserId = externalUserId || selectedUser?.id;

  logger.debug('ProfileScreenContent', 'Profile check', {
    externalUserId,
    normalizedExternalUserId,
    selectedUserId: selectedUser?.id,
    normalizedSelectedUserId,
    isOwnProfile,
    areEqual: normalizedExternalUserId === normalizedSelectedUserId,
    hasExternalUserId: !!externalUserId,
    hasSelectedUser: !!selectedUser,
  });

  const [index, setIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [tabHeights, setTabHeights] = useState<Record<string, number>>({});

  const handleTabHeightChange = useCallback((key: string, height: number) => {
    const newHeight = Math.max(height, 500);
    setTabHeights((prev) => {
      if (Math.abs((prev[key] || 0) - newHeight) < 10) {
        return prev;
      }
      return { ...prev, [key]: newHeight };
    });
  }, []);

  const [userStats, setUserStats] = useState<UserStatsState>({
    posts: 0,
    followers: 0,
    following: 0,
    karmaPoints: 0,
    completedTasks: 0,
    totalDonations: 0,
  });

  const [selectedActivity, setSelectedActivity] = useState<ProfileRecentActivity | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const { viewingUser, setViewingUser, loadingUser } = useProfileViewingUser({
    isOwnProfile,
    externalUserId,
    externalUserName,
    externalCharacterData,
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const [updatedCounts, setUpdatedCounts] = useState({ followersCount: 0, followingCount: 0 });

  const { recentActivities, loadRecentActivities } = useProfileRecentActivities(isOwnProfile, selectedUser);

  const displayUser = isOwnProfile ? selectedUser : viewingUser;

  useEffect(() => {
    if (isOwnProfile && Platform.OS === 'web') {
      clearProfileRouteParamsFromStorage();
    }
  }, [isOwnProfile]);

  useEffect(() => {
    async function loadFollowStats(): Promise<void> {
      if (isOwnProfile || !viewingUser || !selectedUser || !viewingUser.id) {
        return;
      }

      try {
        logger.debug('ProfileScreenContent', 'Loading follow stats for user', { name: viewingUser.name });
        const [stats, counts] = await Promise.all([
          getFollowStats(viewingUser.id, selectedUser.id),
          getUpdatedFollowCounts(viewingUser.id),
        ]);
        setUpdatedCounts(counts);
        setIsFollowing(stats.isFollowing);
      } catch (error) {
        console.error('❌ Load follow stats error:', error);
      }
    }

    loadFollowStats().catch(() => {});
  }, [viewingUser, selectedUser, isOwnProfile]);

  const updateUserStats = useCallback(async () => {
    try {
      const userIdToUse = isOwnProfile ? selectedUser?.id : viewingUser?.id;
      if (!userIdToUse) {
        console.warn('⚠️ No user ID, skipping stats update');
        return;
      }

      const currentUserStats = await getFollowStats(userIdToUse, userIdToUse);
      const userToUse = isOwnProfile ? selectedUser : viewingUser;
      const extras = userToUse as ProfileExtras | null | undefined;

      setUserStats({
        posts: 0,
        followers: currentUserStats.followersCount,
        following: currentUserStats.followingCount,
        karmaPoints: userToUse?.karmaPoints ?? 0,
        completedTasks: extras?.completedTasks ?? 0,
        totalDonations: extras?.totalDonations ?? 0,
      });
    } catch (error) {
      console.error('❌ Update user stats error:', error);
    }
  }, [isOwnProfile, selectedUser, viewingUser]);

  const selectRandomUser = () => {
    if (isRealAuth) {
      Alert.alert(t('common:errorTitle'), t('profile:alerts.disabledOnRealAuth'));
      return;
    }
    Alert.alert(t('common:errorTitle'), t('profile:alerts.disabledOnRealAuth'));
  };

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
    await updateUserStats();
    Alert.alert(t('profile:alerts.sampleDataTitle'), t('profile:alerts.sampleDataCreated'));
  };

  const [profileTabCounts, setProfileTabCounts] = useState<{ open: number | null; closed: number | null }>({
    open: null,
    closed: null,
  });
  const profileCountsUserIdRef = useRef<string | undefined>(targetUserId);
  profileCountsUserIdRef.current = targetUserId;

  useEffect(() => {
    setProfileTabCounts({ open: null, closed: null });
  }, [targetUserId]);

  const onProfileOpenTabCount = useCallback(
    (count: number) => {
      if (profileCountsUserIdRef.current !== targetUserId) {
        return;
      }
      setProfileTabCounts((prev) => (prev.open === count ? prev : { ...prev, open: count }));
    },
    [targetUserId],
  );

  const onProfileClosedTabCount = useCallback(
    (count: number) => {
      if (profileCountsUserIdRef.current !== targetUserId) {
        return;
      }
      setProfileTabCounts((prev) => (prev.closed === count ? prev : { ...prev, closed: count }));
    },
    [targetUserId],
  );

  const profilePostsAggregate =
    profileTabCounts.open !== null && profileTabCounts.closed !== null
      ? profileTabCounts.open + profileTabCounts.closed
      : null;

  const routes = useMemo<TabRoute[]>(
    () => [
      {
        key: 'open',
        title:
          profileTabCounts.open === null
            ? t('profile:tabs.open')
            : t('profile:tabs.openWithCount', { count: profileTabCounts.open }),
      },
      {
        key: 'closed',
        title:
          profileTabCounts.closed === null
            ? t('profile:tabs.closed')
            : t('profile:tabs.closedWithCount', { count: profileTabCounts.closed }),
      },
    ],
    [profileTabCounts.open, profileTabCounts.closed, t],
  );

  useEffect(() => {
    updateUserStats().catch(() => {});
  }, [selectedUser, viewingUser, isOwnProfile, updateUserStats]);

  useFocusEffect(
    React.useCallback(() => {
      async function refreshStats(): Promise<void> {
        logger.logScreenOpened('ProfileScreen');
        logger.debug('ProfileScreenContent', 'Screen focused, refreshing stats', {
          isOwnProfile,
          targetUserId,
        });
        await updateUserStats();
        if (isOwnProfile) {
          await loadRecentActivities();
        } else if (viewingUser && selectedUser) {
          try {
            await refreshFollowStatsForUser(
              viewingUser.id,
              selectedUser.id,
              setUpdatedCounts,
              setIsFollowing,
            );
          } catch (error) {
            console.error('❌ Refresh follow stats error:', error);
          }
        }

        const refreshTimestamp = Date.now();
        setUserStats((prevStats) => ({
          ...prevStats,
          refreshTimestamp,
        }));
      }
      refreshStats().catch(() => {});
    }, [selectedUser, viewingUser, isOwnProfile, targetUserId, updateUserStats, loadRecentActivities]),
  );

  useEffect(() => {
    if (isOwnProfile) {
      loadRecentActivities().catch(() => {});
    }
  }, [selectedUser, isOwnProfile, loadRecentActivities]);

  const renderScene = useCallback(
    ({ route: sceneRoute }: SceneRendererProps & { route: TabRoute }) => {
      switch (sceneRoute.key) {
        case 'open':
          return (
            <OpenRoute
              userId={targetUserId}
              user={displayUser}
              onHeightChange={(h) => handleTabHeightChange('open', h)}
              onLoadedContentCount={onProfileOpenTabCount}
            />
          );
        case 'closed':
          return (
            <ClosedRoute
              userId={targetUserId}
              user={displayUser}
              onHeightChange={(h) => handleTabHeightChange('closed', h)}
              onLoadedContentCount={onProfileClosedTabCount}
            />
          );
        default:
          return null;
      }
    },
    [targetUserId, displayUser, handleTabHeightChange, onProfileOpenTabCount, onProfileClosedTabCount],
  );

  const currentTabHeight = tabHeights[routes[index].key] || 600;

  const renderTabBar = (p: SceneRendererProps & { navigationState: NavigationState<TabRoute> }) => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarInner}>
        {p.navigationState.routes.map((tabRoute, tabIndex) => {
          const isFocused = p.navigationState.index === tabIndex;
          return (
            <TouchableOpacity
              key={tabRoute.key}
              style={styles.tabBarItem}
              onPress={() => p.jumpTo(tabRoute.key)}
            >
              <Text
                style={[
                  styles.tabBarText,
                  {
                    color: isFocused ? colors.secondary : colors.textSecondary,
                    fontWeight: isFocused ? 'bold' : 'normal',
                  },
                ]}
              >
                {tabRoute.title}
              </Text>
              {isFocused ? <View style={styles.tabBarIndicator} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Prepare avatar source with validation and fallbacks
  const avatarUrl = displayUser?.avatar || (displayUser as any)?.avatar_url;
  const safeAvatarUri = sanitiseAvatarUrl(avatarUrl);
  
  if (__DEV__ && avatarUrl && !safeAvatarUri) {
    logger.warn('ProfileScreenContent', 'Avatar URL rejected by validator', { avatarUrl });
  }

  const avatarSource = safeAvatarUri ? { uri: safeAvatarUri } : defaultLogo;

  const handleToggleFollow = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert('שגיאה', 'יש להתחבר תחילה');
      return;
    }
    if (!displayUser?.id) {
      Alert.alert('שגיאה', 'משתמש לא נמצא');
      return;
    }
    try {
      if (isFollowing) {
        const success = await unfollowUser(selectedUser.id, displayUser.id);
        if (success) {
          setIsFollowing(false);
          const newCounts = await getUpdatedFollowCounts(displayUser.id);
          setUpdatedCounts(newCounts);
          Alert.alert('ביטול עקיבה', 'ביטלת את העקיבה בהצלחה');
        }
      } else {
        const success = await followUser(selectedUser.id, displayUser.id);
        if (success) {
          setIsFollowing(true);
          const newCounts = await getUpdatedFollowCounts(displayUser.id);
          setUpdatedCounts(newCounts);
          Alert.alert('עקיבה', 'התחלת לעקוב בהצלחה');
        }
      }
    } catch (error) {
      console.error('❌ Follow/Unfollow error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בביצוע הפעולה');
    }
  }, [selectedUser, displayUser, isFollowing]);

  const handleOpenChat = useCallback(async () => {
    if (!selectedUser) {
      Alert.alert('שגיאה', 'יש לבחור יוזר תחילה');
      return;
    }
    if (!displayUser?.id) {
      return;
    }
    try {
      const existingConvId = await conversationExists(selectedUser.id, displayUser.id);
      let conversationId: string;

      if (existingConvId) {
        logger.debug('ProfileScreenContent', 'Conversation already exists', { conversationId: existingConvId });
        conversationId = existingConvId;
      } else {
        logger.debug('ProfileScreenContent', 'Creating new conversation');
        conversationId = await createConversation([selectedUser.id, displayUser.id]);
      }

      navigateToChatDetail(rootNavigation, {
        conversationId,
        otherUserId: displayUser.id,
        userName: displayUser.name || externalUserName || 'ללא שם',
        userAvatar: displayUser.avatar || 'https://i.pravatar.cc/150?img=1',
      });
    } catch (error) {
      console.error('❌ Create chat error:', error);
      Alert.alert('שגיאה', 'שגיאה ביצירת השיחה');
    }
  }, [selectedUser, displayUser, externalUserName, rootNavigation]);

  const scrollInnerBase: Omit<ProfileScrollInnerProps, 'layout' | 'onWebContentLayout'> = {
    tabBarHeight,
    navigation: rootNavigation,
    t,
    isOwnProfile,
    isRealAuth,
    showMenu,
    setShowMenu,
    displayUser,
    externalUserName,
    avatarSource,
    profilePostsAggregate,
    targetUserId,
    userStats,
    updatedCounts,
    selectedUser,
    isFollowing,
    recentActivities,
    setSelectedActivity,
    setShowActivityModal,
    index,
    routes,
    setIndex,
    renderScene,
    renderTabBar,
    currentTabHeight,
    selectRandomUser,
    handleCreateSampleData,
    setViewingUser,
    onToggleFollow: handleToggleFollow,
    onOpenChat: handleOpenChat,
    onSignOut: signOut,
  };

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
                (navigation as { navigate: (name: string) => void }).navigate('HomeStack');
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
          <ProfileScrollInner
            layout="web"
            {...scrollInnerBase}
            onWebContentLayout={(height) => {
              logger.debug('ProfileScreenContent[WEB]', 'content layout height', {
                height,
                windowHeight: SCREEN_HEIGHT,
              });
            }}
          />
        </View>
      ) : (
        <ProfileScrollInner layout="native" {...scrollInnerBase} />
      )}

      {selectedActivity && (selectedActivity.type === 'item' || selectedActivity.type === 'ride') && (
        <ItemDetailsModal
          visible={showActivityModal}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedActivity(null);
          }}
          item={selectedActivity.rawData}
          type={selectedActivity.type}
          navigation={navigation as never}
          showOwnerInfo={false}
        />
      )}

      {ToastComponent}
    </SafeAreaView>
  );
}
