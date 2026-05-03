import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { getUnreadNotificationCount, subscribeToNotificationEvents } from '../utils/notificationService';

/** Skip redundant fetches on rapid focus/navigation (same throttle bucket as API Throttler per IP). */
const UNREAD_COUNT_MIN_INTERVAL_MS = 12_000;

/**
 * Hook to get and maintain the count of unread notifications for the current user.
 * Updates in real-time when new notifications arrive.
 * 
 * @returns {number} The count of unread notifications
 */
export const useUnreadNotificationsCount = (): number => {
  const { selectedUser } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchAtRef = useRef(0);

  const loadUnreadCount = useCallback(
    async (force = false) => {
      if (!selectedUser) {
        setUnreadCount(0);
        return;
      }

      const now = Date.now();
      if (!force && now - lastFetchAtRef.current < UNREAD_COUNT_MIN_INTERVAL_MS) {
        return;
      }
      lastFetchAtRef.current = now;

      try {
        const count = await getUnreadNotificationCount(selectedUser.id);
        setUnreadCount(count);
      } catch (error) {
        console.error('❌ Failed to load unread notification count:', error);
        setUnreadCount(0);
      }
    },
    [selectedUser],
  );

  // Load initial count when user changes (always fetch)
  useEffect(() => {
    void loadUnreadCount(true);
  }, [selectedUser?.id, loadUnreadCount]);

  // Refresh when screen comes into focus (throttled to reduce API burst)
  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount(false);
    }, [loadUnreadCount]),
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
      void loadUnreadCount(true);
    });

    return () => {
      unsubscribe?.();
    };
  }, [selectedUser, loadUnreadCount]);

  return unreadCount;
};
