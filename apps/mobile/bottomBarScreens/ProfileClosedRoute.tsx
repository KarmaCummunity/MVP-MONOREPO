/**
 * Profile "Closed" tab: completed/delivered posts, items, rides, tasks, donations.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { useUser } from '../stores/userStore';
import PostReelItem from '../components/Feed/PostReelItem';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { apiService } from '../src/api/api.service';
import { db } from '../src/infrastructure/database.service';
import { enhancedDB } from '../utils/enhancedDatabaseService';
import { logger } from '../utils/loggerService';
import type { FeedItem } from '../types/feed';
import type { ApiPost, CharacterType, ProfileFeedItem } from './profileScreen.types';
import { formatRideTime, getLocationName, safeStr, safeNum } from './profileScreen.utils';
import { tabStyles } from './profileScreen.tabStyles';

type Props = {
  userId?: string;
  user?: CharacterType;
  onHeightChange?: (height: number) => void;
};

export default function ProfileClosedRoute({ userId, user, onHeightChange }: Props) {
  const { t } = useTranslation(['profile']);
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<ProfileFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    setSelectedPostForReport
  } = usePostMenu();

  const handleReportSubmit = async (_reason: string) => {
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  const targetUserId = userId || selectedUser?.id;

  useEffect(() => {
    const loadClosedContent = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        logger.debug('ProfileScreen', 'ClosedRoute - Loading closed content', { targetUserId });

        const { USE_BACKEND, API_BASE_URL } = await import('../utils/dbConfig');
        const allContent: ProfileFeedItem[] = [];
        const existingRideIds = new Set<string>();
        const existingItemIds = new Set<string>();

        try {
          const res = await apiService.getUserPosts(targetUserId, 50, selectedUser?.id);
          if (res.success && Array.isArray(res.data)) {
            res.data.forEach((p: ApiPost) => {
              let shouldInclude = false;
              let status = 'closed';
              let type = 'post';
              const subtype = p.post_type;

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
                if (shouldInclude && p.ride_data?.id) existingRideIds.add(String(p.ride_data.id));
              } else if ((p.item_data || p.post_type === 'item') || p.post_type === 'donation') {
                const itemStatus = p.item_data?.status;
                shouldInclude = itemStatus === 'delivered' || itemStatus === 'completed' || itemStatus === 'expired';
                status = itemStatus || 'completed';
                type = p.post_type === 'donation' ? 'donation' : 'item';
                if (shouldInclude && p.item_data?.id) existingItemIds.add(String(p.item_data.id));
              } else {
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
                  id: String(p.id ?? ''),
                  title: p.title || '',
                  thumbnail: (p.images && p.images.length > 0) ? (p.images[0] as string) : null,
                  likes: p.likes || 0,
                  comments: p.comments || 0,
                  isLiked: p.is_liked || false,
                  type: type as FeedItem['type'],
                  subtype: subtype,
                  description: p.description || '',
                  timestamp: p.created_at || '',
                  status: status,
                  user: user ? {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    karmaPoints: user.karmaPoints
                  } : { id: 'unknown' },
                  taskData: p.task ? { id: String(p.task.id ?? ''), title: String((p.task as { title?: string }).title ?? ''), status: String(p.task.status ?? '') } : undefined,
                  rideData: p.ride_data,
                  itemData: p.item_data,
                  from: fromLocation,
                  to: toLocation,
                  seats,
                  price,
                  time,
                  date,
                  rawData: p,
                  rideId: p.ride_id || p.ride_data?.id,
                  itemId: p.item_data?.id || (p.item_id && !/^\d{10,13}$/.test(String(p.item_id)) ? String(p.item_id) : undefined),
                  taskId: p.task_id || p.task?.id
                } as ProfileFeedItem);
              }
            });
            logger.debug('ProfileScreen', 'ClosedRoute - Loaded posts from API', { count: res.data.length });
          }
        } catch (error) {
          logger.error('ProfileScreen', 'Error loading posts from API', { error });
        }

        let userItems: Record<string, unknown>[] = [];
        if (USE_BACKEND && API_BASE_URL) {
          try {
            const axios = (await import('axios')).default;
            const deliveredResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: { owner_id: targetUserId, status: 'delivered', limit: 50 }
            });
            if (deliveredResponse.data?.success && Array.isArray(deliveredResponse.data.data)) {
              userItems.push(...deliveredResponse.data.data);
            }
            const completedResponse = await axios.get(`${API_BASE_URL}/api/items-delivery/search`, {
              params: { owner_id: targetUserId, status: 'completed', limit: 50 }
            });
            if (completedResponse.data?.success && Array.isArray(completedResponse.data.data)) {
              userItems.push(...completedResponse.data.data);
            }
          } catch (error) {
            logger.error('ProfileScreen', 'Error loading items from API', { error });
          }
        } else {
          try {
            const allItems = await db.getDedicatedItemsByOwner(targetUserId) || [];
            userItems = allItems.filter((item: Record<string, unknown>) =>
              item.status === 'delivered' || item.status === 'completed'
            );
          } catch (error) {
            logger.error('ProfileScreen', 'Error loading items from local DB', { error });
          }
        }

        userItems.forEach((item: Record<string, unknown>) => {
          const itemId = safeStr(item.id);
          if (existingItemIds.has(itemId)) return;
          let thumbnail = '';
          const imageData = item.image_base64;
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:image') || imageData.startsWith('http')) {
              thumbnail = imageData;
            } else if (imageData.length > 100) {
              thumbnail = `data:image/jpeg;base64,${imageData}`;
            }
          }
          allContent.push({
            id: `item_${itemId}`,
            title: safeStr(item.title),
            description: safeStr(item.description) || '',
            thumbnail: thumbnail || null,
            likes: 0,
            comments: 0,
            isLiked: false,
            timestamp: safeStr(item.created_at) || new Date().toISOString(),
            type: 'post',
            subtype: 'item',
            status: safeStr(item.status),
            user: user ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              karmaPoints: user.karmaPoints
            } : { id: 'unknown' },
            itemData: { ...item, price: item.price },
            price: safeNum(item.price),
            rawData: item
          } as ProfileFeedItem);
        });

        try {
          const allRides = await enhancedDB.getRides({});
          const userRides = allRides.filter((ride: Record<string, unknown>) => {
            const createdBy = ride.createdBy || ride.created_by || ride.driver_id || ride.driverId;
            const status = ride.status || 'active';
            return createdBy === targetUserId && status === 'completed';
          });
          userRides.forEach((ride: Record<string, unknown>) => {
            const rideId = safeStr(ride.id);
            if (existingRideIds.has(rideId)) return;
            const fromLocation = safeStr(ride.from) || getLocationName(ride.from_location) || '';
            const toLocation = safeStr(ride.to) || getLocationName(ride.to_location) || '';

            let time = '';
            let date = '';
            if (ride.departure_time) {
              const formatted = formatRideTime(safeStr(ride.departure_time));
              time = formatted.time;
              date = formatted.date;
            } else {
              time = safeStr(ride.time);
              date = safeStr(ride.date);
            }

            allContent.push({
              id: `ride_${rideId}`,
              title: t('profile:ride.fromToFormat', { from: fromLocation, to: toLocation }),
              description: safeStr(ride.description) || '',
              thumbnail: (ride.image as string) || null,
              likes: 0,
              comments: 0,
              isLiked: false,
              timestamp: safeStr(ride.created_at) || new Date().toISOString(),
              type: 'post',
              subtype: 'ride',
              status: safeStr(ride.status) || 'completed',
              from: fromLocation,
              to: toLocation,
              seats: safeNum(ride.available_seats ?? ride.seats),
              price: safeNum(ride.price_per_seat ?? ride.price),
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
              rideId: rideId
            } as ProfileFeedItem);
          });
        } catch (error) {
          logger.error('ProfileScreen', 'Error loading rides', { error });
        }

        try {
          const existingTaskIds = new Set(
            allContent
              .filter((c): c is ProfileFeedItem & { taskData?: { id?: string } } => c.type === 'task_post' && !!c.taskData?.id)
              .map((c) => safeStr(c.taskData!.id))
          );

          const doneTasksRes = await apiService.getTasks({ assignee: targetUserId, status: 'done', limit: 50 });
          const archivedTasksRes = await apiService.getTasks({ assignee: targetUserId, status: 'archived', limit: 50 });
          const tasks = [
            ...(doneTasksRes.success && Array.isArray(doneTasksRes.data) ? doneTasksRes.data : []),
            ...(archivedTasksRes.success && Array.isArray(archivedTasksRes.data) ? archivedTasksRes.data : [])
          ];

          tasks.forEach((task: Record<string, unknown>) => {
            const taskId = safeStr(task.id);
            if (existingTaskIds.has(taskId)) {
              logger.debug('ProfileScreen', 'ClosedRoute - Skipping duplicate task', { taskId });
              return;
            }
            allContent.push({
              id: `task_${taskId}`,
              title: safeStr(task.title),
              description: safeStr(task.description) || '',
              thumbnail: '',
              likes: 0,
              comments: 0,
              isLiked: false,
              timestamp: safeStr(task.created_at) || new Date().toISOString(),
              type: 'task_post',
              subtype: 'task_assignment',
              status: safeStr(task.status),
              user: user ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                karmaPoints: user.karmaPoints
              } : { id: 'unknown' },
              taskData: { id: taskId, title: safeStr(task.title), status: safeStr(task.status) },
              rawData: task
            } as ProfileFeedItem);
          });
        } catch (error) {
          logger.error('ProfileScreen', 'Error loading tasks', { error });
        }

        try {
          const donationsRes = await apiService.getUserDonations(targetUserId);
          if (donationsRes.success && Array.isArray(donationsRes.data)) {
            const completedDonations = donationsRes.data.filter((donation: Record<string, unknown>) => donation.status === 'completed');
            completedDonations.forEach((donation: Record<string, unknown>) => {
              const donationId = safeStr(donation.id);
              const images = donation.images;
              const thumb = Array.isArray(images) && images.length > 0 ? (images[0] as string) : null;
              allContent.push({
                id: `donation_${donationId}`,
                title: safeStr(donation.title),
                description: safeStr(donation.description) || '',
                thumbnail: thumb,
                likes: 0,
                comments: 0,
                isLiked: false,
                timestamp: safeStr(donation.created_at) || new Date().toISOString(),
                type: 'post',
                subtype: 'donation',
                status: safeStr(donation.status),
                user: user ? {
                  id: user.id,
                  name: user.name,
                  avatar: user.avatar,
                  karmaPoints: user.karmaPoints
                } : { id: 'unknown' },
                rawData: donation
              } as ProfileFeedItem);
            });
          }
        } catch (error) {
          logger.error('ProfileScreen', 'Error loading donations', { error });
        }

        logger.debug('ProfileScreen', 'Total closed content', { count: allContent.length });
        setPosts(allContent);
      } catch (error) {
        logger.error('ProfileScreen', 'Error loading closed content', { error });
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadClosedContent();
  }, [targetUserId, user, selectedUser?.id, t]);

  const styles = tabStyles;

  if (loading) {
    return (
      <View style={styles.tabContentPlaceholder}>
        <Text style={styles.placeholderText}>{t('profile:closedContent.loading')}</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.tabContentPlaceholder, { height: 400 }]} onLayout={(e) => onHeightChange?.(Math.max(400, e.nativeEvent.layout.height))}>
        <Ionicons name="checkmark-done-circle-outline" size={60} color={colors.textSecondary} />
        <Text style={styles.placeholderText}>{t('profile:closedContent.empty')}</Text>
        <Text style={styles.placeholderSubtext}>{t('profile:closedContent.emptySubtext')}</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth / 3;

  return (
    <View style={styles.tabContentContainer}>
      <FlatList<ProfileFeedItem>
        data={posts}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        key={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <PostReelItem
            item={item as FeedItem}
            numColumns={3}
            cardWidth={cardWidth}
            onPress={() => {}}
            onMorePress={handleMorePress}
          />
        )}
        onContentSizeChange={(_w, h) => onHeightChange?.(h)}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
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
}
