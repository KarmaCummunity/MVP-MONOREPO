/**
 * Shared profile scroll body for Web and native layouts (reduces duplication and cognitive complexity).
 */
import React, { useMemo, type ComponentProps } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView } from 'react-native-tab-view';
import type { SceneRendererProps, NavigationState } from 'react-native-tab-view';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../globals/types';
import type { TFunction } from 'i18next';
import type { ImageSourcePropType } from 'react-native';
import colors from '../../globals/colors';
import { scaleSize } from '../../globals/responsive';
import ProfileCompletionBanner from '../../components/ProfileCompletionBanner';
import ScrollContainer from '../../components/ScrollContainer';
import { styles } from './profileScreen.styles';
import { getRoleDisplayName } from './profileScreenHelpers';
import type { CharacterType, TabRoute } from './profileScreenTypes';
import type { ProfileRecentActivity } from './profileScreenActivity.types';
import { ProfileHierarchyActions } from './ProfileHierarchyActions';

const HIGHLIGHT_SLOT_KEYS = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'] as const;

function storyHighlightIndices(layout: 'web' | 'native', isRealAuth: boolean): readonly number[] {
  if (layout === 'web' && isRealAuth) {
    return [0];
  }
  return [0, 1, 2, 3, 4, 5, 6, 7];
}

export type ProfileScrollInnerProps = Readonly<{
  layout: 'web' | 'native';
  tabBarHeight: number;
  onWebContentLayout?: (height: number) => void;
  navigation: NavigationProp<RootStackParamList>;
  t: TFunction;
  isOwnProfile: boolean;
  isRealAuth: boolean;
  showMenu: boolean;
  setShowMenu: (next: boolean) => void;
  displayUser: CharacterType | null | undefined;
  externalUserName?: string;
  avatarSource: ImageSourcePropType;
  profilePostsAggregate: number | null;
  targetUserId: string | undefined;
  userStats: Readonly<{
    posts: number;
    followers: number;
    following: number;
    karmaPoints: number;
    completedTasks: number;
    totalDonations: number;
  }>;
  updatedCounts: Readonly<{ followersCount: number; followingCount: number }>;
  selectedUser: CharacterType | null | undefined;
  isFollowing: boolean;
  recentActivities: ProfileRecentActivity[];
  setSelectedActivity: (a: ProfileRecentActivity) => void;
  setShowActivityModal: (v: boolean) => void;
  index: number;
  routes: TabRoute[];
  setIndex: (i: number) => void;
  renderScene: (props: SceneRendererProps & { route: TabRoute }) => React.ReactElement | null;
  renderTabBar: (
    props: SceneRendererProps & { navigationState: NavigationState<TabRoute> },
  ) => React.ReactElement;
  currentTabHeight: number;
  selectRandomUser: () => void;
  handleCreateSampleData: () => void | Promise<void>;
  setViewingUser: React.Dispatch<React.SetStateAction<CharacterType | null>>;
  onToggleFollow: () => Promise<void>;
  onOpenChat: () => Promise<void>;
}>;

function ProfilePostsCountStat(props: Readonly<{ value: number | null; label: string }>) {
  const display = props.value ?? '–';
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{display}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
    </View>
  );
}

function OwnProfilePrimaryActions(
  props: Readonly<{
    layout: 'web' | 'native';
    navigation: NavigationProp<RootStackParamList>;
    t: TFunction;
  }>,
) {
  if (props.layout === 'web') {
    return (
      <TouchableOpacity
        style={styles.discoverPeopleButton}
        onPress={() => props.navigation.navigate('DiscoverPeopleScreen' as never)}
      >
        <Ionicons name="person-add-outline" size={scaleSize(18)} color={colors.white} />
        <Text style={styles.discoverPeopleText}>{props.t('profile:discoverPeople')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.discoverPeopleButton}
        onPress={() => props.navigation.navigate('DiscoverPeopleScreen' as never)}
      >
        <Ionicons name="person-add-outline" size={scaleSize(18)} color={colors.white} />
        <Text style={styles.discoverPeopleText}>{props.t('profile:discoverPeople')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.notificationsButton}
        onPress={() => props.navigation.navigate('NotificationsScreen' as never)}
      >
        <Ionicons name="notifications-outline" size={scaleSize(18)} color={colors.white} />
        <Text style={styles.notificationsButtonText}>{props.t('profile:notifications')}</Text>
      </TouchableOpacity>
    </>
  );
}

export function ProfileScrollInner(props: ProfileScrollInnerProps) {
  const {
    layout,
    tabBarHeight,
    onWebContentLayout,
    navigation,
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
    onToggleFollow,
    onOpenChat,
  } = props;

  const highlightIdx = useMemo(() => storyHighlightIndices(layout, isRealAuth), [layout, isRealAuth]);

  const scrollBody = (
    <>
      {!isOwnProfile && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
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

      {isOwnProfile && <ProfileCompletionBanner />}

      <View style={styles.profileInfo}>
        {isOwnProfile && (
          <TouchableOpacity style={styles.menuIcon} onPress={() => setShowMenu(!showMenu)}>
            <Ionicons name="menu" size={scaleSize(24)} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.profileSection}>
          <Image source={avatarSource} style={styles.profilePicture} />
        </View>

        <View style={styles.statsContainer}>
          <ProfilePostsCountStat value={profilePostsAggregate} label={t('profile:stats.posts')} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              if (!targetUserId) {
                return;
              }
              (navigation as { navigate: (name: string, p: object) => void }).navigate('FollowersScreen', {
                userId: targetUserId,
                type: 'followers',
                title: t('profile:followersTitle'),
              });
            }}
          >
            <Text style={styles.statNumber}>
              {isOwnProfile ? userStats.followers : updatedCounts.followersCount}
            </Text>
            <Text style={styles.statLabel}>{t('profile:stats.followers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              if (!targetUserId) {
                return;
              }
              (navigation as { navigate: (name: string, p: object) => void }).navigate('FollowersScreen', {
                userId: targetUserId,
                type: 'following',
                title: t('profile:followingTitle'),
              });
            }}
          >
            <Text style={styles.statNumber}>
              {isOwnProfile ? userStats.following : updatedCounts.followingCount}
            </Text>
            <Text style={styles.statLabel}>{t('profile:stats.following')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isOwnProfile && showMenu && (
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.menuBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
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
                    (navigation as { navigate: (name: string) => void }).navigate('EditProfileScreen');
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

                {(layout === 'native' || !isRealAuth) && (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={selectRandomUser}>
                      <Ionicons name="shuffle-outline" size={scaleSize(20)} color={colors.textPrimary} />
                      <Text style={styles.menuItemText}>{t('profile:menu.switchUser')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => void handleCreateSampleData()}>
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

      <View style={styles.bioSection}>
        <Text style={styles.fullName}>{displayUser?.name || externalUserName || ''}</Text>
        {Boolean(displayUser?.bio) && <Text style={styles.bioText}>{displayUser?.bio}</Text>}
        {Boolean(
          typeof displayUser?.location === 'string' ? displayUser?.location : displayUser?.location?.city,
        ) && (
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={scaleSize(14)} color={colors.textSecondary} />{' '}
            {typeof displayUser?.location === 'string'
              ? displayUser?.location
              : displayUser?.location?.city || ''}
          </Text>
        )}

        {!isOwnProfile && displayUser && (
          <View style={styles.characterDetails}>
            {displayUser.isVerified && (
              <View style={styles.verificationBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.info} />
                <Text style={styles.verifiedText}>מאומת</Text>
              </View>
            )}

            {Boolean(displayUser.roles?.length) && (
              <View style={styles.rolesContainer}>
                {displayUser.roles!.map((role) => (
                  <View key={role} style={styles.roleTag}>
                    <Text style={styles.roleText}>{getRoleDisplayName(role)}</Text>
                  </View>
                ))}
              </View>
            )}

            {Boolean(displayUser.interests?.length) && (
              <View style={styles.interestsContainer}>
                <Text style={styles.sectionTitle}>תחומי עניין:</Text>
                <View style={styles.interestsList}>
                  {displayUser.interests!.slice(0, 4).map((interest) => (
                    <Text key={interest} style={styles.interestTag}>
                      #{interest}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {displayUser.joinDate ? (
              <Text style={styles.joinDate}>
                הצטרף ב-{new Date(displayUser.joinDate).toLocaleDateString('he-IL')}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.karmaSection}>
          <View style={styles.karmaCard}>
            <Ionicons name="star" size={scaleSize(20)} color={colors.warning} />
            <Text style={styles.karmaText}>
              {displayUser?.karmaPoints || userStats.karmaPoints} {t('profile:stats.karmaPointsSuffix')}
            </Text>
          </View>
        </View>

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
              onPress={() => navigation.navigate('BookmarksScreen' as never)}
            >
              <Ionicons name="heart-outline" size={scaleSize(24)} color={colors.secondary} />
              <Text style={styles.activityIconText}>{t('profile:favorites')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actionButtonsContainer}>
        {isOwnProfile ? (
          <OwnProfilePrimaryActions layout={layout} navigation={navigation} t={t} />
        ) : (
          <>
            {selectedUser && displayUser && selectedUser.id !== displayUser.id && (
              <>
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={() => void onToggleFollow()}
                >
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'עוקב' : 'עקוב'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.messageButton} onPress={() => void onOpenChat()}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
                  <Text style={styles.messageButtonText}>הודעה</Text>
                </TouchableOpacity>

                {layout === 'web' && (
                  <ProfileHierarchyActions
                    navigation={navigation}
                    selectedUser={selectedUser}
                    displayUser={displayUser}
                    setViewingUser={setViewingUser}
                  />
                )}
              </>
            )}
          </>
        )}
      </View>

      {isOwnProfile && (
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>{t('profile:sections.recentActivity')}</Text>
          {recentActivities.length === 0 ? (
            <View style={styles.emptyActivitiesContainer}>
              <Ionicons name="time-outline" size={scaleSize(40)} color={colors.textSecondary} />
              <Text style={styles.emptyActivitiesText}>
                {t('profile:recent.noActivityYet', 'אין פעילויות עדיין')}
              </Text>
              <Text style={styles.emptyActivitiesSubtext}>
                {t('profile:recent.startCreating', 'התחל ליצור תוכן כדי לראות את הפעילויות שלך כאן')}
              </Text>
            </View>
          ) : (
            recentActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityItem}
                onPress={() => {
                  if (activity.type === 'item' || activity.type === 'ride') {
                    setSelectedActivity(activity);
                    setShowActivityModal(true);
                  } else {
                    Alert.alert(activity.title, activity.time);
                  }
                }}
              >
                <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                  <Ionicons
                    name={activity.icon as ComponentProps<typeof Ionicons>['name']}
                    size={16}
                    color={activity.color}
                  />
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

      {isOwnProfile && (
        <View style={styles.highlightsSection}>
          <Text style={styles.sectionTitle}>{t('profile:sections.highlights')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyHighlightsContentContainer}
          >
            {highlightIdx.map((i) => (
              <TouchableOpacity
                key={HIGHLIGHT_SLOT_KEYS[i] ?? `h${String(i)}`}
                style={styles.storyHighlightItem}
                onPress={() => {
                  if (i === 0) {
                    Alert.alert(t('profile:alerts.highlight'), t('profile:highlights.new'));
                  } else {
                    Alert.alert(
                      t('profile:alerts.highlight'),
                      t('profile:highlights.highlightIndex', { index: (i + 1).toString() }),
                    );
                  }
                }}
              >
                <View style={styles.storyHighlightCircle}>
                  {i === 0 ? (
                    <Ionicons name="add" size={scaleSize(24)} color={colors.secondary} />
                  ) : (
                    <Image
                      source={{ uri: `https://picsum.photos/60/60?random=${String(i + 10)}` }}
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

      <View style={[styles.tabViewContainer, { height: currentTabHeight }]}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: Dimensions.get('window').width }}
          renderTabBar={renderTabBar}
        />
      </View>
    </>
  );

  if (layout === 'web') {
    return (
      <View
        style={[styles.webScrollContent, { paddingBottom: tabBarHeight + scaleSize(24) }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          onWebContentLayout?.(h);
        }}
      >
        {scrollBody}
      </View>
    );
  }

  return (
    <ScrollContainer
      style={styles.mainScrollView}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentStyle={{ ...styles.mainScrollContent, paddingBottom: tabBarHeight + scaleSize(24) }}
    >
      {scrollBody}
    </ScrollContainer>
  );
}
