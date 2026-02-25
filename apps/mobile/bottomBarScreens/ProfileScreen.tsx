// File overview:
// - Purpose: Unified profile screen that works for both own profile and other users' profiles.
// - Reached from: `ProfileTabStack` initial route 'ProfileScreen' via `BottomNavigator` (own profile) or via navigation with params (other user's profile).
// - Provides: Navigation to Followers lists, Bookmarks, Notifications, Edit Profile, Discover People, Follow/Unfollow, Message, and (in demo) random persona selection and sample data creation.
// - Reads from context: `useUser()` -> `selectedUser`, `setSelectedUserWithMode`, `isRealAuth`.
// - Route params: Optional `{ userId?: string, userName?: string, characterData?: CharacterType }` for viewing other users' profiles.
// - External deps/services: `followService` (stats and sample), `chatService` (sample chats), `apiService` (load user data), i18n translations.
// - Notes: Hides or adapts certain demo-only features when `isRealAuth` is true. Shows different UI elements based on whether viewing own profile or other user's profile.
// screens/ProfileScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  Platform,
  FlatList,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView, TabBar, SceneMap } from 'react-native-tab-view';
import type { SceneRendererProps, NavigationState } from 'react-native-tab-view';
import { useNavigation, useFocusEffect, useRoute, useNavigationState } from '@react-navigation/native';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';
import ScrollContainer from '../components/ScrollContainer';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import ItemDetailsModal from '../components/ItemDetailsModal';
import { createShadowStyle } from '../globals/styles';
import { scaleSize } from '../globals/responsive';
import { getFollowStats, followUser, unfollowUser, createSampleFollowData, getUpdatedFollowCounts } from '../utils/followService';
import { createSampleChatData, createConversation, conversationExists } from '../utils/chatService';
import { enhancedDB } from '../utils/enhancedDatabaseService';
import { apiService } from '../utils/apiService';
import { USE_BACKEND } from '../utils/dbConfig';
import { UserPreview as CharacterType } from '../globals/types';
import { useToast, toastService } from '../utils/toastService';
import PostReelItem from '../components/Feed/PostReelItem';
import { FeedItem, FeedUser } from '../types/feed';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';

// --- Type Definitions ---
type TabRoute = {
  key: string;
  title: string;
};

type ProfileScreenRouteParams = {
  userId?: string;
  userName?: string;
  characterData?: CharacterType;
};

// --- Helper Functions ---
const getRoleDisplayName = (role: string): string => {
  const roleTranslations: Record<string, string> = {
    'user': 'משתמש',
    'donor': 'תורם',
    'volunteer': 'מתנדב',
    'recipient': 'מקבל עזרה',
    'organization': 'עמותה',
    'student': 'סטודנט'
  };
  return roleTranslations[role] || role;
};

// Helper to format ride time safely
const formatRideTime = (dateIso: string) => {
  if (!dateIso) return { time: '', date: '' };
  const dep = new Date(dateIso);
  if (isNaN(dep.getTime())) return { time: '', date: '' };

  const hours = dep.getHours().toString().padStart(2, '0');
  const minutes = dep.getMinutes().toString().padStart(2, '0');

  const day = dep.getDate().toString().padStart(2, '0');
  const month = (dep.getMonth() + 1).toString().padStart(2, '0');
  const year = dep.getFullYear();

  return {
    time: `${hours}:${minutes}`,
    date: `${day}.${month}.${year}`
  };
};


// --- Tab Components ---
// Helper function to check if status is "open"
const isOpenStatus = (status: string, type: string): boolean => {
  if (type === 'item') {
    return status === 'available' || status === 'reserved';
  } else if (type === 'ride') {
    return status === 'active' || status === 'full';
  } else if (type === 'task') {
    return status === 'open' || status === 'in_progress';
  } else if (type === 'donation') {
    return status === 'active';
  }
  return true; // Posts are always shown
};

// Helper function to check if status is "closed"
const isClosedStatus = (status: string, type: string): boolean => {
  if (type === 'item') {
    return status === 'delivered' || status === 'completed';
  } else if (type === 'ride') {
    return status === 'completed';
  } else if (type === 'task') {
    return status === 'done' || status === 'archived';
  } else if (type === 'donation') {
    return status === 'completed';
  }
  return false; // Posts are not shown in closed
};

const OpenRoute = ({ userId, user, onHeightChange }: { userId?: string, user?: any, onHeightChange?: (height: number) => void }) => {
  const { t } = useTranslation(['profile']);
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../utils/databaseService');

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

  // Report submit handler
  const handleReportSubmit = async (reason: string) => {
    if (!selectedPostForReport) return;
    // Report functionality can be implemented here if needed
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

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

        const { USE_BACKEND, API_BASE_URL } = await import('../utils/dbConfig');
        const allContent: any[] = [];
        const existingRideIds = new Set<string>();
        const existingItemIds = new Set<string>();

        // Load posts from API - handle all types with status
        try {
          const res = await apiService.getUserPosts(targetUserId, 50, selectedUser?.id);
          if (res.success && Array.isArray(res.data)) {
            res.data.forEach((p: any) => {
              let shouldInclude = false;
              let status = 'active';
              let type = 'post';
              const subtype = p.post_type;

              // Determine if post should be in OPEN tab
              if (p.post_type === 'task_assignment' || p.post_type === 'task_completion') {
                const taskStatus = p.task?.status;
                shouldInclude = taskStatus === 'open' || taskStatus === 'in_progress';
                status = taskStatus || 'open';
                type = 'task';
              } else if (p.ride_data || p.post_type === 'ride') {
                const rideStatus = p.ride_data?.status || 'active';
                shouldInclude = rideStatus === 'active' || rideStatus === 'full';
                status = rideStatus;
                type = 'ride';
                if (shouldInclude && p.ride_data?.id) existingRideIds.add(p.ride_data.id);
              } else if ((p.item_data || p.post_type === 'item') || p.post_type === 'donation') {
                const itemStatus = p.item_data?.status || 'available';
                shouldInclude = itemStatus === 'available' || itemStatus === 'reserved' || itemStatus === 'active';
                status = itemStatus;
                type = p.post_type === 'donation' ? 'donation' : 'item';
                if (shouldInclude && p.item_data?.id) existingItemIds.add(p.item_data.id);
              } else {
                // Regular posts - always active
                shouldInclude = true;
              }

              if (shouldInclude) {
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
  }, [targetUserId]);

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
            onPress={() => { }}
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

const ClosedRoute = ({ userId, user, onHeightChange }: { userId?: string, user?: any, onHeightChange?: (height: number) => void }) => {
  const { t } = useTranslation(['profile']);
  const { selectedUser } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { db } = require('../utils/databaseService');

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

  // Report submit handler
  const handleReportSubmit = async (reason: string) => {
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
        console.log('📱 ClosedRoute - Loading closed content for userId:', targetUserId);

        const { USE_BACKEND, API_BASE_URL } = await import('../utils/dbConfig');
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
            console.log('📱 ClosedRoute - Loaded posts from API:', res.data.length);
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
              console.log(`📱 ClosedRoute - Skipping duplicate task: ${task.id}`);
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

        console.log('📱 ClosedRoute - Total closed content:', allContent.length);
        setPosts(allContent);
      } catch (error) {
        console.error('Error loading closed content:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadClosedContent();
  }, [targetUserId]);

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
            onPress={() => { }}
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

const TaggedRoute = ({ onHeightChange }: { onHeightChange?: (height: number) => void }) => {
  return (
    <View
      style={[styles.tabContentPlaceholder, { height: 400 }]}
      onLayout={(e) => onHeightChange && onHeightChange(Math.max(400, e.nativeEvent.layout.height))}
    >
      <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
      <Text style={styles.placeholderText}>תיוגים יהיה פעיל בהמשך</Text>
    </View>
  );
};

// --- Main Component ---
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Internal component that contains all the logic
// It receives tabBarHeight as a prop so we can control it from outside
function ProfileScreenContent({
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
  const { selectedUser, setSelectedUserWithMode, isRealAuth } = useUser();
  const navigation = useNavigation();
  const { ToastComponent } = useToast();
  const defaultLogo = require('../assets/images/android-chrome-192x192.png');

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
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
  const [updatedCounts, setUpdatedCounts] = useState({ followersCount: 0, followingCount: 0 });
  const [loadingUser, setLoadingUser] = useState(!isOwnProfile && !externalCharacterData);

  // The user to display (either selectedUser for own profile, or viewingUser for other user's profile)
  const displayUser = isOwnProfile ? selectedUser : viewingUser;

  // Clean up localStorage when viewing own profile or when component unmounts
  useEffect(() => {
    if (isOwnProfile && Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
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
              } catch (error) {
                // Ignore errors
              }
            }
          } else {
            console.warn('User not found:', externalUserId);
            setViewingUser(null);
          }
        } catch (error) {
          console.error('❌ Load user error:', error);
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
  const updateUserStats = async () => {
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
  };

  // Function to load recent user activities from database (only for own profile)
  const loadRecentActivities = async () => {
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
        const { db } = require('../utils/databaseService');
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
        const { USE_BACKEND, API_BASE_URL } = await import('../utils/dbConfig');
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
          const { db } = require('../utils/databaseService');
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
  };

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
    { key: 'tagged', title: 'תיוגים' },
  ]);

  // Update stats when user changes
  useEffect(() => {
    const updateStats = async () => {
      await updateUserStats();
    };
    updateStats();
  }, [selectedUser, viewingUser, isOwnProfile]);

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
    }, [selectedUser, viewingUser, isOwnProfile, targetUserId])
  );

  // Load activities when selectedUser changes (only for own profile)
  useEffect(() => {
    if (isOwnProfile) {
      loadRecentActivities();
    }
  }, [selectedUser, isOwnProfile]);

  const renderScene = ({ route: sceneRoute }: SceneRendererProps & { route: TabRoute }) => {
    switch (sceneRoute.key) {
      case 'open':
        return <OpenRoute userId={targetUserId} user={displayUser} onHeightChange={(h) => handleTabHeightChange('open', h)} />;
      case 'closed':
        return <ClosedRoute userId={targetUserId} user={displayUser} onHeightChange={(h) => handleTabHeightChange('closed', h)} />;
      case 'tagged':
        return <TaggedRoute onHeightChange={(h) => handleTabHeightChange('tagged', h)} />;
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
  const avatarSource = displayUser?.avatar ? { uri: displayUser.avatar } : defaultLogo;

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
                              isSubordinate ? { backgroundColor: '#ff444410', borderColor: '#ff4444' } : { backgroundColor: colors.secondary + '10', borderColor: colors.secondary }
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
                            <Ionicons name={isSubordinate ? "person-remove-outline" : "person-add-outline"} size={20} color={isSubordinate ? '#ff4444' : colors.secondary} />
                            <Text style={[styles.messageButtonText, { color: isSubordinate ? '#ff4444' : colors.secondary }]}>
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

// Wrapper component that calls useBottomTabBarHeight
// This is used when viewing own profile (in bottom tab navigator)
function ProfileScreenWithTabBar() {
  const tabBarHeight = useBottomTabBarHeight();
  return <ProfileScreenContent tabBarHeight={tabBarHeight} />;
}

// Main export - uses the hook for own profile
// Main export - uses the hook for own profile
export default function ProfileScreen(props: any) {
  const route = useRoute();
  let routeParams = route.params as ProfileScreenRouteParams | undefined;

  // On Web, handle refresh (F5) by restoring params from localStorage if route params are missing
  const STORAGE_KEY = 'profileScreenParams';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !routeParams && !props?.userId) {
    // Try to restore from localStorage when route params are missing (after refresh)
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
  }

  // Allow props to override route params (useful when used as a child component)
  const propUserId = props?.userId;
  const propUserName = props?.userName;
  const propCharacterData = props?.characterData;
  const isExplicitOtherProfile = props?.isExplicitOtherProfile === true;

  // Use restored params if props are not provided
  const externalUserId = propUserId || routeParams?.userId;
  const { selectedUser } = useUser();

  // Determine if viewing own profile or other user's profile
  // CRITICAL: If externalUserId exists and equals selectedUser.id, it's OWN profile!
  // Only if externalUserId exists and is DIFFERENT from selectedUser.id, it's another user's profile
  // If no externalUserId, it's own profile (default - viewing from ProfileTabStack)

  // Normalize IDs to strings for comparison (in case one is number and one is string)
  const normalizedExternalUserId = externalUserId ? String(externalUserId).trim() : null;
  const normalizedSelectedUserId = selectedUser?.id ? String(selectedUser.id).trim() : null;

  // Check if viewing other user: 
  // 1. Explicitly requested via prop
  // 2. externalUserId exists AND it's different from selectedUser.id
  const isViewingOtherUser = isExplicitOtherProfile ||
    (normalizedExternalUserId &&
      normalizedSelectedUserId &&
      normalizedExternalUserId !== normalizedSelectedUserId);

  // Debug log to help identify the issue
  console.log('👤 ProfileScreen - Route check:', {
    externalUserId,
    propUserId,
    normalizedExternalUserId,
    selectedUserId: selectedUser?.id,
    normalizedSelectedUserId,
    isViewingOtherUser,
    isExplicitOtherProfile,
    areEqual: normalizedExternalUserId === normalizedSelectedUserId,
    hasExternalUserId: !!externalUserId,
    hasSelectedUser: !!selectedUser
  });

  // If explicitly viewing other profile but no user ID, we need to handle it in Content
  // Pass params to Content
  const passedParams: ProfileScreenRouteParams = {
    userId: externalUserId,
    userName: propUserName || routeParams?.userName,
    characterData: propCharacterData || routeParams?.characterData
  };

  if (isViewingOtherUser) {
    // Viewing another user's profile - not in bottom tab navigator
    // Use ProfileScreenContent directly with tabBarHeight = 0 (no hook call)
    console.log('👤 ProfileScreen - Using ProfileScreenContent (other user)');
    // Pass the params via route override or similar mechanism if ProfileScreenContent relies on useRoute
    // Actually ProfileScreenContent calls useRoute(). We should probably pass props to it.
    // Let's modify ProfileScreenContent to accept overrides.
    return <ProfileScreenContent tabBarHeight={0} manualParams={passedParams} forceOtherProfile={true} />;
  }

  // Viewing own profile (either no externalUserId, or externalUserId === selectedUser.id)
  // In bottom tab navigator, can use the hook
  console.log('👤 ProfileScreen - Using ProfileScreenWithTabBar (own profile)');
  return <ProfileScreenWithTabBar />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  mainScrollView: {
    flex: 1,
  },
  // Web-specific scroll wrappers
  webScrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      overflow: 'auto' as any,
      WebkitOverflowScrolling: 'touch' as any,
      overscrollBehavior: 'contain' as any,
      height: SCREEN_HEIGHT as any,
      maxHeight: SCREEN_HEIGHT as any,
      width: '100%' as any,
      touchAction: 'auto' as any,
    }),
  } as any,
  webScrollContent: {
    minHeight: SCREEN_HEIGHT * 1.2,
  },
  mainScrollContent: {
    paddingBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.LG,
  },
  profileSection: {
    position: 'relative',
  },
  profilePicture: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderRadius: scaleSize(80) / 2,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  menuIcon: {
    position: 'absolute',
    top: LAYOUT_CONSTANTS.SPACING.SM,
    right: LAYOUT_CONSTANTS.SPACING.SM,
    padding: LAYOUT_CONSTANTS.SPACING.SM,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    backgroundColor: colors.backgroundSecondary,
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 4),
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    marginLeft: LAYOUT_CONSTANTS.SPACING.LG,
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  statLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  bioSection: {
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG
  },
  fullName: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  bioText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    lineHeight: Math.round(FontSizes.body * 1.4),
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  locationText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  karmaSection: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  karmaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: LAYOUT_CONSTANTS.SPACING.SM + LAYOUT_CONSTANTS.SPACING.XS,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    alignSelf: 'flex-start',
  },
  karmaText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: LAYOUT_CONSTANTS.SPACING.SM,
  },
  activityIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
  },
  activityIconItem: {
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.SM,
  },
  activityIconText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginTop: LAYOUT_CONSTANTS.SPACING.XS,
  },
  actionButtonsContainer: {
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
  },
  discoverPeopleButton: {
    backgroundColor: colors.secondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM + LAYOUT_CONSTANTS.SPACING.XS,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverPeopleText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginLeft: LAYOUT_CONSTANTS.SPACING.SM,
  },
  notificationsButton: {
    backgroundColor: colors.primary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM + LAYOUT_CONSTANTS.SPACING.XS,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
  },
  notificationsButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginLeft: LAYOUT_CONSTANTS.SPACING.SM,
  },
  activitiesSection: {
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
  },
  sectionTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: LAYOUT_CONSTANTS.SPACING.SM + LAYOUT_CONSTANTS.SPACING.XS,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
    ...createShadowStyle(colors.shadow, { width: 0, height: 1 }, 0.1, 2),
    elevation: 2,
  },
  activityIcon: {
    width: scaleSize(32),
    height: scaleSize(32),
    borderRadius: scaleSize(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: LAYOUT_CONSTANTS.SPACING.SM,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  emptyActivitiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT_CONSTANTS.SPACING.XL,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
  },
  emptyActivitiesText: {
    fontSize: FontSizes.heading3,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'center',
  },
  emptyActivitiesSubtext: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    textAlign: 'center',
    lineHeight: Math.round(FontSizes.body * 1.4),
  },
  highlightsSection: {
    marginBottom: 20,
  },
  storyHighlightsContentContainer: {
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
  },
  storyHighlightItem: {
    alignItems: 'center',
    marginHorizontal: LAYOUT_CONSTANTS.SPACING.XS
  },
  storyHighlightCircle: {
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: scaleSize(30),
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  highlightImage: {
    width: scaleSize(56),
    height: scaleSize(56),
    borderRadius: scaleSize(28),
  },
  storyHighlightText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabViewContainer: {
    // height: scaleSize(600), // Dynamic height now
  },
  tabBarContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBarInner: {
    flexDirection: 'row',
    width: '100%',
  },
  tabBarIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.secondary,
    height: scaleSize(2),
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM + LAYOUT_CONSTANTS.SPACING.XS,
    position: 'relative',
  },
  tabBarText: {
    fontSize: FontSizes.body,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM + LAYOUT_CONSTANTS.SPACING.XS,
  },
  tabContentContainer: {
    paddingBottom: 20,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 2,
    paddingTop: 10,
  },
  postContainer: {
    width: '32%',
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  postOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  postStatsText: {
    color: colors.white,
    fontSize: FontSizes.small,
    marginLeft: 4,
  },
  ridePlaceholder: {
    backgroundColor: colors.info + '20',
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.SM,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  rideDetailsContainer: {
    marginTop: LAYOUT_CONSTANTS.SPACING.XS + 2,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 6,
  },
  rideDetailsText: {
    fontSize: FontSizes.small - 1,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '90%',
  },
  rideArrow: {
    marginVertical: 3,
  },
  taskPlaceholder: {
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.SM,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  taskDetailsContainer: {
    marginTop: LAYOUT_CONSTANTS.SPACING.XS + 2,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  taskDetailsText: {
    fontSize: FontSizes.small - 1,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '95%',
  },
  tabContentPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    padding: 20,
  },
  placeholderText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 15,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginLeft: 8,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
  },
  menuOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 8,
    ...createShadowStyle(colors.shadow, { width: 0, height: 4 }, 0.2, 8),
    zIndex: 1001,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  // Styles for other user's profile
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    padding: 8,
  },
  username: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  followButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
  },
  followingButtonText: {
    color: colors.textPrimary,
  },
  messageButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginLeft: 12,
  },
  messageButtonText: {
    color: colors.textPrimary,
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginLeft: 8,
  },
  characterDetails: {
    marginTop: 12,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: FontSizes.small,
    color: colors.info,
    marginLeft: 4,
    fontWeight: '600',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  roleTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: FontSizes.small,
    color: colors.primary,
    fontWeight: '600',
  },
  interestsContainer: {
    marginBottom: 12,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  joinDate: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  backButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
    marginLeft: 8,
  },
});
