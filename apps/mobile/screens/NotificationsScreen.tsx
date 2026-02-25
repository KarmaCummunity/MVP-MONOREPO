// File overview:
// - Purpose: Displays a feed of notifications with read/unread state, actions, and settings.
// - Reached from: Top bar routes and deep links; route name 'NotificationsScreen'.
// - Provides: List with swipe/press actions: mark read, mark all read, delete, clear all; badge for unread count; real-time updates via in-app events and polling.
// - Reads from context: `useUser()` -> selectedUser.
// - Navigation side-effects: On tapping a 'message' notification with `conversationId`, navigates to 'ChatDetailScreen'.
// - External deps/services: `notificationService` (CRUD + subscribe), i18n.
// screens/NotificationsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useUser } from '../stores/userStore';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  NotificationData,
  getUnreadNotificationCount,
  getNotificationSettings,
  updateNotificationSettings,
  subscribeToNotificationEvents,
} from '../utils/notificationService';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { selectedUser } = useUser();
  const { t } = useTranslation(['notifications', 'common']);
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
    ? screenHeight - tabBarHeight - headerHeight
    : undefined;

  console.log('🔔 NotificationsScreen - Component rendered, selectedUser:', selectedUser?.name || 'null');

  const loadNotifications = useCallback(async () => {
    console.log('🔔 NotificationsScreen - loadNotifications - selectedUser:', selectedUser?.name || 'null');

    if (!selectedUser) {
      console.log('🔔 NotificationsScreen - No selected user, cannot load notifications');
      return;
    }

    try {
      const userNotifications = await getNotifications(selectedUser.id);
      setNotifications(userNotifications);

      const count = await getUnreadNotificationCount(selectedUser.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Load notifications error:', error);
      Alert.alert(t('common:errorTitle'), t('notifications:loadError'));
    }
  }, [selectedUser]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔔 NotificationsScreen - Screen focused, loading notifications...');
      console.log('🔔 NotificationsScreen - selectedUser in useFocusEffect:', selectedUser?.name || 'null');
      loadNotifications();

      // Subscribe to in-app notification events for real-time updates
      const unsubscribe = subscribeToNotificationEvents((notification) => {
        if (!selectedUser) return;
        if (notification.userId !== selectedUser.id) return;
        console.log('🔔 NotificationsScreen - Realtime notification received');
        // Prepend the new notification and update unread counter
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + (notification.read ? 0 : 1));
      });

      // Lightweight polling fallback to ensure UI stays in sync
      const interval = setInterval(async () => {
        if (!selectedUser) return;
        try {
          const userNotifications = await getNotifications(selectedUser.id);
          setNotifications(userNotifications);
          const count = userNotifications.filter(n => !n.read).length;
          setUnreadCount(count);
        } catch (e) {
          console.warn('⚠️ NotificationsScreen - polling error', e);
        }
      }, 3000);

      return () => {
        unsubscribe?.();
        clearInterval(interval);
      };
    }, [loadNotifications, selectedUser])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications().finally(() => setRefreshing(false));
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!selectedUser) return;

    try {
      await markNotificationAsRead(notificationId, selectedUser.id);
      await loadNotifications();
    } catch (error) {
      console.error('❌ Mark as read error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!selectedUser) return;

    try {
      await markAllNotificationsAsRead(selectedUser.id);
      await loadNotifications();
      Alert.alert(t('notifications:markAllDoneTitle'), t('notifications:markAllDoneBody'));
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      Alert.alert(t('common:errorTitle'), t('notifications:markAllError'));
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!selectedUser) return;

    try {
      await deleteNotification(notificationId, selectedUser.id);
      await loadNotifications();
    } catch (error) {
      console.error('❌ Delete notification error:', error);
    }
  };

  const handleClearAllNotifications = async () => {
    console.log('🔔 Clear all pressed');
    if (!selectedUser) return;

    if (notifications.length === 0) {
      console.log('ℹ️ No notifications to clear');
      return;
    }

    const performClear = async () => {
      try {
        await clearAllNotifications(selectedUser.id);
        await loadNotifications();
        // Optional: Show success message or just let the list clear
        // Alert.alert(t('notifications:clearAllDoneTitle'), t('notifications:clearAllDoneBody'));
      } catch (error) {
        console.error('❌ Clear all notifications error:', error);
        Alert.alert(t('common:errorTitle'), t('notifications:clearAllError'));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('notifications:clearAllMessage'))) {
        await performClear();
      }
    } else {
      Alert.alert(
        t('notifications:clearAllTitle'),
        t('notifications:clearAllMessage'),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('common:delete'),
            style: 'destructive',
            onPress: performClear,
          },
        ]
      );
    }
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return 'chatbubble-outline';
      case 'follow':
        return 'person-add-outline';
      case 'like':
        return 'heart-outline';
      case 'comment':
        return 'chatbubble-ellipses-outline';
      case 'system':
        return 'notifications-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return colors.primary;
      case 'follow':
        return colors.success;
      case 'like':
        return colors.error;
      case 'comment':
        return colors.warning;
      case 'system':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return t('common:time.now');
    } else if (diffMinutes < 60) {
      return t('common:time.minutesAgo', { count: diffMinutes });
    } else if (diffHours < 24) {
      return t('common:time.hoursAgo', { count: diffHours });
    } else if (diffDays < 7) {
      return t('common:time.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleOpen = async (item: NotificationData) => {
    if (!selectedUser) return;
    try {
      await markNotificationAsRead(item.id, selectedUser.id);
      if (item.type === 'message' && item.data?.conversationId) {
        (navigation as any).navigate('ChatDetailScreen', { conversationId: item.data.conversationId });
      }
    } catch (error) {
      console.error('❌ Open notification error:', error);
    }
  };

  const renderNotification = ({ item }: { item: NotificationData }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
      ]}
      onPress={() => handleOpen(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIconContainer}>
          <Icon
            name={getNotificationIcon(item.type)}
            size={20}
            color={getNotificationColor(item.type)}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item.id)}
        >
          <Icon name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {!item.read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-off-outline" size={80} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>{t('notifications:empty.title')}</Text>
      <Text style={styles.emptyStateSubtitle}>
        {t('notifications:empty.subtitle')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      {/* Header container - measure total height */}
      <View
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
          }
        }}
      >
        {/* Additional header actions for notifications */}
        <View style={styles.additionalHeaderSection}>
          {[
            unreadCount > 0 && (
              <TouchableOpacity 
                key="mark-all-read"
                onPress={handleMarkAllAsRead} 
                style={styles.headerButton}
              >
                <Icon name="checkmark-done" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
            notifications.length > 0 && (
              <TouchableOpacity 
                key="clear-all"
                onPress={handleClearAllNotifications} 
                style={styles.headerButton}
              >
                <Icon name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            ),
          ].filter(Boolean)}
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{t('notifications:unreadBadge', { count: unreadCount })}</Text>
          </View>
        )}
      </View>

      {/* List container - limited height on web to ensure scrolling works */}
      <View style={[
        styles.listWrapper,
        Platform.OS === 'web' && maxListHeight ? {
          maxHeight: maxListHeight,
        } : undefined
      ]}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
          scrollEventThrottle={16}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  additionalHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: FontSizes.caption,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadNotification: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
  deleteButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
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