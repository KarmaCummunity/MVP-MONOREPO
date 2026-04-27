// Extracted from ProfileScreen — Open tab.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import colors from '../../globals/colors';
import { useUser } from '../../stores/userStore';
import { apiService } from '../../utils/apiService';
import { enhancedDB } from '../../utils/enhancedDatabaseService';
import {
  buildOpenTabEntryFromPost,
  classifyOpenProfilePost,
} from '../../utils/profileOpenTabPostEntry';
import PostReelItem from '../../components/Feed/PostReelItem';
import type { FeedItem } from '../../types/feed';
import { navigateToPostDetail } from '../../utils/navigateToPostDetail';
import { ProfilePostGridOverlays, useProfilePostGridOverlays } from './ProfilePostGridOverlays';
import { formatRideTime } from './profileScreenHelpers';
import { styles } from './profileScreen.styles';
export const OpenRoute = ({ userId, user, onHeightChange }: { userId?: string, user?: any, onHeightChange?: (height: number) => void }) => {
  const { t } = useTranslation(['profile', 'common']);
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const overlays = useProfilePostGridOverlays();
  const { db } = require('../../utils/databaseService');

  const handlePostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation as never, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );

  // Use provided userId or fallback to selectedUser.id
  const targetUserId = userId || selectedUser?.id;

  useEffect(() => {
    const loadOpenContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('📱 OpenRoute - Loading open content for userId:', targetUserId);

        const { USE_BACKEND, API_BASE_URL } = await import('../../utils/dbConfig');
        const allContent: any[] = [];
        const existingRideIds = new Set<string>();
        const existingItemIds = new Set<string>();

        // Load posts from API - handle all types with status
        try {
          const res = await apiService.getUserPosts(targetUserId, 50, selectedUser?.id);
          if (res.success && Array.isArray(res.data)) {
            res.data.forEach((p: any) => {
              const row = classifyOpenProfilePost(p);
              if (!row?.shouldInclude) {
                return;
              }
              if (row.type === 'ride' && p.ride_data?.id) {
                existingRideIds.add(p.ride_data.id);
              }
              if ((row.type === 'item' || row.type === 'donation') && p.item_data?.id) {
                existingItemIds.add(p.item_data.id);
              }
              allContent.push(buildOpenTabEntryFromPost(p, user, row));
            });
            console.log('📱 OpenRoute - Loaded posts from API:', res.data.length);
          }
        } catch (error) {
          console.error('Error loading posts from API:', error);
        }

        // Load items from API (available, reserved)
        let userItems: any[] = [];
        if (USE_BACKEND && API_BASE_URL) {
          try {
            const axios = (await import('axios')).default;
            // Load available items
            const availableResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: { owner_id: targetUserId, status: 'available', limit: 50 }
            });
            if (availableResponse.data?.success && Array.isArray(availableResponse.data.data)) {
              userItems.push(...availableResponse.data.data);
            }
            // Load reserved items
            const reservedResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: { owner_id: targetUserId, status: 'reserved', limit: 50 }
            });
            if (reservedResponse.data?.success && Array.isArray(reservedResponse.data.data)) {
              userItems.push(...reservedResponse.data.data);
            }
          } catch (error) {
            console.error('Error loading items from API:', error);
          }
        } else {
          try {
            const allItems = await db.getDedicatedItemsByOwner(targetUserId) || [];
            userItems = allItems.filter((item: any) =>
              item.status === 'available' || item.status === 'reserved'
            );
          } catch (error) {
            console.error('Error loading items from local DB:', error);
          }
        }

        // Process items
        userItems.forEach((item: any) => {
          if (existingItemIds.has(item.id)) return;
          let thumbnail = '';
          if (item.image_base64) {
            const imageData = item.image_base64;
            if (imageData.startsWith('data:image') || imageData.startsWith('http')) {
              thumbnail = imageData;
            } else if (imageData.length > 100) {
              thumbnail = `data:image/jpeg;base64,${imageData}`;
            }
          }
          allContent.push({
            id: `item_${item.id}`,
            title: item.title,
            description: item.description || '',
            thumbnail: thumbnail || null,
            likes: 0,
            comments: 0,
            isLiked: false,
            timestamp: item.created_at || new Date().toISOString(),
            type: 'post', // Items map to 'post' or 'item' subtype depending on implementation
            subtype: 'item',
            status: item.status,
            user: user ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              karmaPoints: user.karmaPoints
            } : { id: 'unknown' },
            itemData: {
              ...item,
              price: item.price
            },
            price: item.price,
            rawData: item
          });
        });

        // Load rides (active, full)
        try {
          const allRides = await enhancedDB.getRides({});
          console.log('[ProfileScreen OpenRoute] Fetched rides:', allRides.length);

          const userRides = allRides.filter((ride: any) => {
            const driverId = ride.driver_id || ride.createdBy || ride.created_by || ride.driverId;
            const status = ride.status || 'active';
            const isUserRide = driverId === targetUserId && (status === 'active' || status === 'full');

            if (isUserRide) {
              console.log('[ProfileScreen OpenRoute] Found user ride:', ride.id, 'driver:', driverId);
            }

            return isUserRide;
          });

          console.log('[ProfileScreen OpenRoute] User rides count:', userRides.length);

          userRides.forEach((ride: any) => {
            if (existingRideIds.has(ride.id)) return;
            const fromLocation = ride.from || ride.from_location?.name || ride.from_location?.city || '';
            const toLocation = ride.to || ride.to_location?.name || ride.to_location?.city || '';

            let time = '';
            let date = '';
            if (ride.departure_time) {
              const formatted = formatRideTime(ride.departure_time);
              time = formatted.time;
              date = formatted.date;
            } else if (ride.time) {
              time = ride.time;
              date = ride.date || '';
            }

            allContent.push({
              id: `ride_${ride.id}`,
              title: `טרמפ: ${fromLocation} ➝ ${toLocation}`,
              description: ride.description || '',
              thumbnail: ride.image || null,
              likes: 0,
              comments: 0,
              isLiked: false,
              timestamp: ride.created_at || new Date().toISOString(),
              type: 'post',
              subtype: 'ride',
              status: ride.status || 'active',
              from: fromLocation,
              to: toLocation,
              seats: ride.available_seats || ride.seats || 0,
              price: ride.price_per_seat || ride.price || 0,
              time,
              date,
              user: user ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                karmaPoints: user.karmaPoints
              } : { id: 'unknown' },
              rideData: ride,
              rawData: ride,
              // Add rideId for updating posts (critical for delete/close functionality)
              rideId: ride.id
            });
          });
        } catch (error) {
          console.error('[ProfileScreen OpenRoute] Error loading rides:', error);
        }

        // Load tasks (open, in_progress) - avoid duplicates with task posts
        try {
          // Get task IDs we already added from posts
          const existingTaskIds = new Set(
            allContent
              .filter((c: any) => c.type === 'task' && c.taskData?.id)
              .map((c: any) => c.taskData.id)
          );

          const openTasksRes = await apiService.getTasks({ assignee: targetUserId, status: 'open', limit: 50 });
          const inProgressTasksRes = await apiService.getTasks({ assignee: targetUserId, status: 'in_progress', limit: 50 });
          const tasks = [
            ...(openTasksRes.success && Array.isArray(openTasksRes.data) ? openTasksRes.data : []),
            ...(inProgressTasksRes.success && Array.isArray(inProgressTasksRes.data) ? inProgressTasksRes.data : [])
          ];

          tasks.forEach((task: any) => {
            // Skip if already added via task posts
            if (existingTaskIds.has(task.id)) {
              console.log(`📱 OpenRoute - Skipping duplicate task: ${task.id}`);
              return;
            }

            allContent.push({
              id: `task_${task.id}`,
              title: task.title,
              description: task.description || '',
              thumbnail: '',
              likes: 0,
              comments: 0,
              isLiked: false,
              timestamp: task.created_at || new Date().toISOString(),
              type: 'task_post',
              subtype: 'task_assignment',
              status: task.status,
              user: user ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                karmaPoints: user.karmaPoints
              } : { id: 'unknown' },
              taskData: {
                id: task.id,
                title: task.title,
                status: task.status
              },
              rawData: task
            });
          });
        } catch (error) {
          console.error('Error loading tasks:', error);
        }

        // Load donations (active)
        try {
          const donationsRes = await apiService.getUserDonations(targetUserId);
          if (donationsRes.success && Array.isArray(donationsRes.data)) {
            const activeDonations = donationsRes.data.filter((donation: any) => donation.status === 'active');
            activeDonations.forEach((donation: any) => {
              allContent.push({
                id: `donation_${donation.id}`,
                title: donation.title,
                description: donation.description || '',
                thumbnail: (donation.images && donation.images.length > 0) ? donation.images[0] : null,
                likes: 0,
                comments: 0,
                isLiked: false,
                timestamp: donation.created_at || new Date().toISOString(),
                type: 'post',
                subtype: 'donation',
                status: donation.status,
                user: user ? {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  karmaPoints: user.karmaPoints
                } : { id: 'unknown' },
                rawData: donation
              });
            });
          }
        } catch (error) {
          console.error('Error loading donations:', error);
        }

        console.log('📱 OpenRoute - Total open content:', allContent.length);
        setPosts(allContent);
      } catch (error) {
        console.error('Error loading open content:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadOpenContent();
  }, [targetUserId, user, selectedUser?.id, db, overlays.listRefreshKey]);

  if (loading) {
    return (
      <View style={styles.tabContentPlaceholder}>
        <Text style={styles.placeholderText}>טוען תוכן פתוח...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.tabContentPlaceholder, { height: 400 }]} onLayout={(e) => onHeightChange && onHeightChange(Math.max(400, e.nativeEvent.layout.height))}>
        <Ionicons name="folder-open-outline" size={60} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>אין תוכן פתוח עדיין</Text>
        <Text style={styles.placeholderSubtext}>התוכן הפתוח שלך יופיע כאן</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth / 3;

  return (
    <View style={styles.tabContentContainer}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        key={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <PostReelItem
            item={item}
            numColumns={3}
            cardWidth={cardWidth}
            onPress={handlePostPress}
            onCommentPress={overlays.handleCommentPress}
            onMorePress={overlays.handleMorePress}
          />
        )}
        onContentSizeChange={(w, h) => {
          if (onHeightChange) onHeightChange(h);
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
      <ProfilePostGridOverlays
        model={overlays}
        optionsModalTitle={t('common:options') || 'Options'}
      />
    </View>
  );
};
