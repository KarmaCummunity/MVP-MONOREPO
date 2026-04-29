// File overview:
// - Purpose: List of followers or following for a given user, with ability to follow/unfollow from the list.
// - Reached from: Profile/UserProfile screens via 'FollowersScreen'.
// - Expects route params: `{ userId: string, type: 'followers' | 'following', title: string }`.
// - Provides: Fetches users list and per-user follow state; navigates to 'UserProfileScreen' on item press.
// - Reads from context: `useUser()` -> `selectedUser` to perform follow toggles.
// - External deps/services: `followService` (get lists, follow/unfollow, stats).
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect, NavigationProp, ParamListBase } from '@react-navigation/native';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { UserPreview as CharacterType } from '../globals/types';
import {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getFollowStats
} from '../src/services/follow.service';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { useTranslation } from 'react-i18next';

type FollowersScreenRouteParams = {
  userId: string;
  type: 'followers' | 'following';
  title: string;
};

export default function FollowersScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, type, title } = route.params as FollowersScreenRouteParams;
  const { selectedUser } = useUser();
  const { t } = useTranslation(['profile', 'common', 'discover']);
  const [users, setUsers] = useState<CharacterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStats, setFollowStats] = useState<Record<string, { isFollowing: boolean }>>({});
  const [_refreshKey, setRefreshKey] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let userList: CharacterType[] = [];

      if (type === 'followers') {
        userList = await getFollowers(userId);
      } else {
        userList = await getFollowing(userId);
      }

      setUsers(userList);

      // Load follow stats for all users
      const stats: Record<string, { isFollowing: boolean }> = {};

      for (const user of userList) {
        if (selectedUser) {
          const userStats = await getFollowStats(user.id, selectedUser.id);
          stats[user.id] = { isFollowing: userStats.isFollowing };
        }
      }

      setFollowStats(stats);
    } catch (error) {
      logger.error('FollowersScreen', 'Error loading users', { error });
      Alert.alert(t('common:errorTitle'), t('profile:followersList.loadUsersError'));
    } finally {
      setLoading(false);
    }
  }, [userId, type, selectedUser, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      setRefreshKey(prev => prev + 1);
    }, [loadUsers])
  );

  const handleFollowToggle = async (targetUserId: string) => {
    if (!selectedUser) {
      Alert.alert(t('common:errorTitle'), t('profile:alertsProfile.loginRequired'));
      return;
    }

    try {
      const currentStats = followStats[targetUserId] || { isFollowing: false };

      if (currentStats.isFollowing) {
        const success = await unfollowUser(selectedUser.id, targetUserId);
        if (success) {
          setFollowStats(prev => ({
            ...prev,
            [targetUserId]: { isFollowing: false }
          }));
          Alert.alert(t('discover:alerts.unfollowTitle'), t('discover:alerts.unfollowMessage'));
        }
      } else {
        const success = await followUser(selectedUser.id, targetUserId);
        if (success) {
          setFollowStats(prev => ({
            ...prev,
            [targetUserId]: { isFollowing: true }
          }));
          Alert.alert(t('discover:alerts.followTitle'), t('discover:alerts.followMessage'));
        }
      }
    } catch (error) {
      logger.error('FollowersScreen', 'Follow toggle error', { error });
      Alert.alert(t('common:errorTitle'), t('discover:alerts.errorGeneric'));
    }
  };

  const renderUserItem = ({ item }: { item: CharacterType }) => {
    const currentStats = followStats[item.id] || { isFollowing: false };
    const isCurrentUser = selectedUser?.id === item.id;

    return (
      <View style={styles.userItem}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => {
            (navigation as NavigationProp<ParamListBase>).navigate('UserProfileScreen', {
              userId: item.id,
              userName: item.name,
              characterData: item
            });
          }}
        >
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userBio} numberOfLines={2}>
              {item.bio}
            </Text>
            <View style={styles.userStats}>
              <Text style={styles.statText}>
                {t('profile:followersList.karmaPoints', { count: item.karmaPoints })}
              </Text>
              <Text style={styles.statText}>
                {t('profile:followersList.tasksCompleted', { count: item.completedTasks })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {!isCurrentUser && (
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
              {currentStats.isFollowing ? t('profile:follow.following') : t('profile:follow.follow')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === 'followers' ? 'people-outline' : 'person-add-outline'}
        size={60}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>
        {type === 'followers' ? t('profile:followersList.emptyFollowersTitle') : t('profile:followersList.emptyFollowingTitle')}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {type === 'followers'
          ? t('profile:followersList.emptyFollowersSubtitle')
          : t('profile:followersList.emptyFollowingSubtitle')
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshing={loading}
        onRefresh={loadUsers}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  listContainer: {
    flexGrow: 1,
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
  userName: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
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
  },
  statText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  followButton: {
    backgroundColor: colors.secondary,
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