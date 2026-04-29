// Extracted from ProfileScreen — Closed tab.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import colors from '../../globals/colors';
import { useUser } from '../../stores/userStore';
import { apiService } from '../../utils/apiService';
import { enhancedDB } from '../../utils/enhancedDatabaseService';
import PostReelItem from '../../components/Feed/PostReelItem';
import type { FeedItem } from '../../types/feed';
import { navigateToPostDetail } from '../../utils/navigateToPostDetail';
import { usePostMenu } from '../../hooks/usePostMenu';
import OptionsModal from '../../components/Feed/OptionsModal';
import ReportPostModal from '../../components/Feed/ReportPostModal';
import { formatRideTime } from './profileScreenHelpers';
import { styles } from './profileScreen.styles';
import { logger } from '../../utils/loggerService';
export const ClosedRoute = ({ userId, user, onHeightChange }: { userId?: string, user?: any, onHeightChange?: (height: number) => void }) => {
  const { t } = useTranslation(['profile']);
  const navigation = useNavigation();
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../../utils/databaseService');

  // Post menu hook
  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport
  } = usePostMenu();

  const handlePostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation as never, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );

  // Report submit handler
  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    // Report functionality can be implemented here if needed
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  // Use provided userId or fallback to selectedUser.id
  const targetUserId = userId || selectedUser?.id;

  useEffect(() => {
    const loadClosedContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        logger.debug('ClosedRoute', 'Loading closed content for userId', { targetUserId });

        const { USE_BACKEND, API_BASE_URL } = await import('../../utils/dbConfig');
        const allContent: any[] = [];
        const existingRideIds = new Set();
        const existingItemIds = new Set();

        // Load posts from API - handle all types with closed status
        try {
          const res = await apiService.getUserPosts(targetUserId, 50, selectedUser?.id);
          if (res.success && Array.isArray(res.data)) {
            res.data.forEach((p: any) => {
              let shouldInclude = false;
              let status = 'closed';
              let type = 'post';
              const subtype = p.post_type;

              // Determine if post should be in CLOSED tab
              if (p.post_type === 'task_assignment' || p.post_type === 'task_completion') {
                const taskStatus = p.task?.status;
                shouldInclude = taskStatus === 'done' || taskStatus === 'archived';
                status = taskStatus || 'done';
                type = 'task';
              } else if (p.ride_data || p.post_type === 'ride') {
                const rideStatus = p.ride_data?.status;
                shouldInclude = rideStatus === 'completed' || rideStatus === 'cancelled';
                status = rideStatus || 'completed';
                type = 'ride';
                if (shouldInclude && p.ride_data?.id) existingRideIds.add(p.ride_data.id);
              } else if ((p.item_data || p.post_type === 'item') || p.post_type === 'donation') {
                const itemStatus = p.item_data?.status;
                shouldInclude = itemStatus === 'delivered' || itemStatus === 'completed' || itemStatus === 'expired';
                status = itemStatus || 'completed';
                type = p.post_type === 'donation' ? 'donation' : 'item';
                if (shouldInclude && p.item_data?.id) existingItemIds.add(p.item_data.id);
              } else {
                // Regular posts - not shown in closed
                shouldInclude = false;
              }

              let fromLocation = '';
              let toLocation = '';

              let seats = 0;
              let price = 0;
              let time = '';
              let date = '';

              if (type === 'ride') {
                const rData = p.ride_data;
                if (rData) {
                  fromLocation = rData.from_location?.city || rData.from_location?.name || rData.from_location?.address || '';
                  toLocation = rData.to_location?.city || rData.to_location?.name || rData.to_location?.address || '';

                  seats = rData.available_seats || 0;
                  price = rData.price_per_seat || 0;

                  if (rData.departure_time) {
                    const formatted = formatRideTime(rData.departure_time);
                    time = formatted.time;
                    date = formatted.date;
                  }
                }
              }

              if (shouldInclude) {
                allContent.push({
                  id: p.id,
                  title: p.title || '',
                  thumbnail: (p.images && p.images.length > 0) ? p.images[0] : null,
                  likes: p.likes || 0,
                  comments: p.comments || 0,
                  isLiked: p.is_liked || false,
                  type: type as any,
                  subtype: subtype,
                  description: p.description || '',
                  timestamp: p.created_at,
                  status: status,
                  user: user ? {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    karmaPoints: user.karmaPoints
                  } : { id: 'unknown' },
                  taskData: p.task,
                  rideData: p.ride_data,
                  itemData: p.item_data,
                  from: fromLocation,
                  to: toLocation,
                  seats,
                  price,
                  time,
                  date,
                  rawData: p,
                  // Add IDs for updating posts (critical for delete/close functionality)
                  rideId: p.ride_id || p.ride_data?.id,
                  itemId: p.item_data?.id || (p.item_id && !/^\d{10,13}$/.test(p.item_id) ? p.item_id : undefined),
                  taskId: p.task_id || p.task?.id
                });
              }
            });
            logger.debug('ClosedRoute', 'Loaded posts from API', { count: res.data.length });
          }
        } catch (error) {
          console.error('Error loading posts from API:', error);
        }

        // Load items from API (delivered, completed)
        let userItems: any[] = [];
        if (USE_BACKEND && API_BASE_URL) {
          try {
            const axios = (await import('axios')).default;
            // Load delivered items
            const deliveredResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: { owner_id: targetUserId, status: 'delivered', limit: 50 }
            });
            if (deliveredResponse.data?.success && Array.isArray(deliveredResponse.data.data)) {
              userItems.push(...deliveredResponse.data.data);
            }
            // Load completed items
            const completedResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: { owner_id: targetUserId, status: 'completed', limit: 50 }
            });
            if (completedResponse.data?.success && Array.isArray(completedResponse.data.data)) {
              userItems.push(...completedResponse.data.data);
            }
          } catch (error) {
            console.error('Error loading items from API:', error);
          }
        } else {
          try {
            const allItems = await db.getDedicatedItemsByOwner(targetUserId) || [];
            userItems = allItems.filter((item: any) =>
              item.status === 'delivered' || item.status === 'completed'
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
            type: 'post', // Items map to 'post' or 'item' subtype
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

        // Load rides (completed)
        try {
          const allRides = await enhancedDB.getRides({});
          const userRides = allRides.filter((ride: any) => {
            const createdBy = ride.createdBy || ride.created_by || ride.driver_id || ride.driverId;
            const status = ride.status || 'active';
            return createdBy === targetUserId && status === 'completed';
          });
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
              status: ride.status || 'completed',
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
          console.error('Error loading rides:', error);
        }

        // Load tasks (done, archived) - avoid duplicates with task posts
        try {
          // Get task IDs we already added from posts
          const existingTaskIds = new Set(
            allContent
              .filter((c: any) => c.type === 'task' && c.taskData?.id)
              .map((c: any) => c.taskData.id)
          );

          const doneTasksRes = await apiService.getTasks({ assignee: targetUserId, status: 'done', limit: 50 });
          const archivedTasksRes = await apiService.getTasks({ assignee: targetUserId, status: 'archived', limit: 50 });
          const tasks = [
            ...(doneTasksRes.success && Array.isArray(doneTasksRes.data) ? doneTasksRes.data : []),
            ...(archivedTasksRes.success && Array.isArray(archivedTasksRes.data) ? archivedTasksRes.data : [])
          ];

          tasks.forEach((task: any) => {
            // Skip if already added via task posts
            if (existingTaskIds.has(task.id)) {
              logger.debug('ClosedRoute', 'Skipping duplicate task', { taskId: task.id });
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

        // Load donations (completed)
        try {
          const donationsRes = await apiService.getUserDonations(targetUserId);
          if (donationsRes.success && Array.isArray(donationsRes.data)) {
            const completedDonations = donationsRes.data.filter((donation: any) => donation.status === 'completed');
            completedDonations.forEach((donation: any) => {
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

        logger.debug('ClosedRoute', 'Total closed content', { count: allContent.length });
        setPosts(allContent);
      } catch (error) {
        console.error('Error loading closed content:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadClosedContent();
  }, [targetUserId, user, selectedUser?.id, db]);

  if (loading) {
    return (
      <View style={styles.tabContentPlaceholder}>
        <Text style={styles.placeholderText}>טוען תוכן סגור...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.tabContentPlaceholder, { height: 400 }]} onLayout={(e) => onHeightChange && onHeightChange(Math.max(400, e.nativeEvent.layout.height))}>
        <Ionicons name="checkmark-done-circle-outline" size={60} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>אין תוכן סגור עדיין</Text>
        <Text style={styles.placeholderSubtext}>התוכן הסגור שלך יופיע כאן</Text>
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
            onMorePress={handleMorePress}
          />
        )}
        onContentSizeChange={(w, h) => {
          if (onHeightChange) onHeightChange(h);
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
      {/* Modals */}
      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={t('common.options') || 'Options'}
        anchorPosition={modalPosition}
      />
      <ReportPostModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={false}
      />
    </View>
  );
};
