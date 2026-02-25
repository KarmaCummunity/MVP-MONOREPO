import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { getUnreadNotificationCount, subscribeToNotificationEvents } from '../src/services/notification.service';
import { logger } from '../utils/loggerService';

/**
 * Hook to get and maintain the count of unread notifications for the current user.
 * Updates in real-time when new notifications arrive.
 * 
 * @returns {number} The count of unread notifications
 */
export const useUnreadNotificationsCount = (): number => {
  const { selectedUser } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!selectedUser) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await getUnreadNotificationCount(selectedUser.id);
      setUnreadCount(count);
    } catch (error) {
      logger.error('useUnreadNotificationsCount', 'Failed to load unread notification count', { error });
      setUnreadCount(0);
    }
  }, [selectedUser]);

  // Load initial count when user changes (async in effect so setState runs in callback)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedUser) {
        setUnreadCount(0);
        return;
      }
      try {
        const count = await getUnreadNotificationCount(selectedUser.id);
        if (!cancelled) setUnreadCount(count);
      } catch (error) {
        if (!cancelled) {
          logger.error('useUnreadNotificationsCount', 'Failed to load unread notification count', { error });
          setUnreadCount(0);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedUser]);

  // Refresh count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  // Subscribe to real-time notification events
  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    const unsubscribe = subscribeToNotificationEvents((notification) => {
      // Only process notifications for the current user
      if (notification.userId !== selectedUser.id) {
        return;
      }

      // Reload count to ensure accuracy when notifications change
      // This is more reliable than trying to track individual notification states
      loadUnreadCount();
    });

    return () => {
      unsubscribe?.();
    };
  }, [selectedUser, loadUnreadCount]);

  return unreadCount;
};
