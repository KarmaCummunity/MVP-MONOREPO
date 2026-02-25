// File overview:
// - Purpose: Unified client-side data access with backends: REST, Firestore, or AsyncStorage fallback.
// - Reached from: Many screens/services via `db` helpers and `DatabaseService` static methods.
// - Provides: CRUD/list/search/batch across logical collections; export/import; user-wide operations.
// - Behavior: Delegates to `restAdapter` when `USE_BACKEND` is true, else Firestore/AsyncStorage.
// utils/databaseService.ts

import { logger } from '../../utils/loggerService';

/** Minimal interface for items that may have a timestamp for sorting */
interface TimestampedRecord {
  timestamp?: string;
  [key: string]: unknown;
}

/** Ride API response shape from backend */
interface RideApiResponse {
  id: string;
  driver_id?: string;
  driverId?: string;
  createdBy?: string;
  driver_name?: string;
  from_location?: { name?: string; city?: string };
  to_location?: { name?: string; city?: string };
  departure_time?: string;
  date?: string;
  time?: string;
  available_seats?: number;
  seats?: number;
  price_per_seat?: number;
  price?: number;
  rating?: number;
  image?: string;
  category?: string;
  status?: string;
  requirements?: string;
}

/** Ride filters for listRides */
interface RideListFilters {
  include_past?: string;
}

// TODO: CRITICAL - This file is extremely complex (800+ lines). Split into specialized services:
//   - UserDataService, PostDataService, ChatDataService, etc.
// TODO: Add comprehensive error handling and retry mechanisms
// TODO: Implement proper caching strategy and cache invalidation
// TODO: Add comprehensive TypeScript interfaces for all data models
// TODO: Remove duplicate code between different adapters
// TODO: Add comprehensive data validation and sanitization
// TODO: Implement proper offline sync and conflict resolution
// TODO: Add comprehensive logging and monitoring for all operations
// TODO: Add unit tests for all CRUD operations and edge cases
// TODO: Implement proper migration system for data schema changes
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_BACKEND, USE_FIRESTORE, API_BASE_URL } from './config';
import { apiService } from '../api/api.service';
import { restAdapter } from '../../utils/restAdapter';
import { firestoreAdapter } from '../../utils/firestoreAdapter';
import { DB_COLLECTIONS } from '../../utils/dbCollections';
import axios from 'axios';

export { DB_COLLECTIONS };

type EnhancedDBModule = typeof import('../../utils/enhancedDatabaseService');
let enhancedDbInstance: EnhancedDBModule['enhancedDB'] | null = null;

async function loadEnhancedDB() {
  if (enhancedDbInstance) return enhancedDbInstance;
  const module = await import('../../utils/enhancedDatabaseService');
  enhancedDbInstance = module.enhancedDB;
  return enhancedDbInstance;
}

// Database Keys Generator
export const getDBKey = (collection: string, userId: string, itemId?: string) => {
  if (itemId) {
    return `${collection}_${userId}_${itemId}`;
  }
  return `${collection}_${userId}`;
};

// Generic Database Service
// TODO: Convert to proper class instance instead of static methods
// TODO: Add proper dependency injection for different adapters
// TODO: Implement proper connection management and pooling
export class DatabaseService {
  // Simple key-space versioning for future migrations
  // TODO: Implement proper migration system with rollback support
  // TODO: Add schema validation and versioning
  private static DB_VERSION = 1;
  private static VERSION_KEY = 'db_version';

  static async ensureVersion(): Promise<void> {
    const v = await AsyncStorage.getItem(DatabaseService.VERSION_KEY);
    if (!v) {
      await AsyncStorage.setItem(DatabaseService.VERSION_KEY, String(DatabaseService.DB_VERSION));
      return;
    }
    const current = Number(v);
    if (current < DatabaseService.DB_VERSION) {
      // Place for future migrations per version
      await AsyncStorage.setItem(DatabaseService.VERSION_KEY, String(DatabaseService.DB_VERSION));
    }
  }

  // Aliases for backward compatibility
  static async getItem<T>(collection: string, userId: string, itemId: string): Promise<T | null> {
    return this.read<T>(collection, userId, itemId);
  }

  static async setItem<T>(collection: string, userId: string, itemId: string, data: T): Promise<void> {
    try {
      // Try to update first, if it fails then create
      await this.update<T>(collection, userId, itemId, data);
    } catch {
      // If update fails, create new item
      await this.create<T>(collection, userId, itemId, data);
    }
  }

  // Generic CRUD operations
  static async create<T>(
    collection: string,
    userId: string,
    itemId: string,
    data: T
  ): Promise<void> {
    try {
      if (USE_BACKEND) {
        await restAdapter.create(collection, userId, itemId, data);
      } else if (USE_FIRESTORE) {
        await firestoreAdapter.create(collection, userId, itemId, data);
      } else {
        await this.ensureVersion();
        const key = getDBKey(collection, userId, itemId);
        await AsyncStorage.setItem(key, JSON.stringify(data));
      }
      logger.info('DatabaseService', `Created ${collection} item`, { itemId });
    } catch (error) {
      logger.error('DatabaseService', `Create ${collection} error`, { error });
      throw error;
    }
  }

  static async read<T>(
    collection: string,
    userId: string,
    itemId: string
  ): Promise<T | null> {
    try {
      if (USE_BACKEND) {
        return await restAdapter.read<T>(collection, userId, itemId);
      } else if (USE_FIRESTORE) {
        return await firestoreAdapter.read<T>(collection, userId, itemId);
      } else {
        await this.ensureVersion();
        const key = getDBKey(collection, userId, itemId);
        const item = await AsyncStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch (error) {
      logger.error('DatabaseService', `Read ${collection} error`, { error });
      return null;
    }
  }

  static async update<T>(
    collection: string,
    userId: string,
    itemId: string,
    data: Partial<T>
  ): Promise<void> {
    try {
      if (USE_BACKEND) {
        await restAdapter.update(collection, userId, itemId, data);
        logger.info('DatabaseService', `Updated ${collection} item`, { itemId });
      } else if (USE_FIRESTORE) {
        await firestoreAdapter.update(collection, userId, itemId, data);
        logger.info('DatabaseService', `Updated ${collection} item`, { itemId });
      } else {
        const existing = await this.read<T>(collection, userId, itemId);
        if (existing) {
          const updated = { ...existing, ...data };
          await this.create(collection, userId, itemId, updated);
          logger.info('DatabaseService', `Updated ${collection} item`, { itemId });
        }
      }
    } catch (error) {
      logger.error('DatabaseService', `Update ${collection} error`, { error });
      throw error;
    }
  }

  static async delete(
    collection: string,
    userId: string,
    itemId: string
  ): Promise<void> {
    try {
      if (USE_BACKEND) {
        await restAdapter.delete(collection, userId, itemId);
      } else if (USE_FIRESTORE) {
        await firestoreAdapter.delete(collection, userId, itemId);
      } else {
        const key = getDBKey(collection, userId, itemId);
        await AsyncStorage.removeItem(key);
      }
      logger.info('DatabaseService', `Deleted ${collection} item`, { itemId });
    } catch (error) {
      logger.error('DatabaseService', `Delete ${collection} error`, { error });
      throw error;
    }
  }

  // List operations
  static async list<T>(
    collection: string,
    userId: string
  ): Promise<T[]> {
    try {
      if (USE_BACKEND) {
        if (collection === DB_COLLECTIONS.POSTS) {
          const res = await apiService.getUserPosts(userId);
          return res.success ? (res.data as unknown as T[]) : [];
        }
        return await restAdapter.list<T>(collection, userId);
      } else if (USE_FIRESTORE) {
        return await firestoreAdapter.list<T>(collection, userId);
      } else {
        await this.ensureVersion();
        const keys = await AsyncStorage.getAllKeys();
        const userKeys = keys.filter(key =>
          key.startsWith(`${collection}_${userId}_`)
        );

        if (userKeys.length === 0) return [];

        const items = await AsyncStorage.multiGet(userKeys);
        return items
          .map(([, value]) => value ? JSON.parse(value) : null)
          .filter((item): item is T => item !== null)
          .sort((a, b) => {
            const aTs = (a as TimestampedRecord).timestamp;
            const bTs = (b as TimestampedRecord).timestamp;
            if (aTs && bTs) {
              return new Date(bTs).getTime() - new Date(aTs).getTime();
            }
            return 0;
          });
      }
    } catch (error) {
      logger.error('DatabaseService', `List ${collection} error`, { error });
      return [];
    }
  }

  // Count operations
  static async count(collection: string, userId: string): Promise<number> {
    try {
      if (USE_BACKEND) {
        const items = await restAdapter.list(collection, userId);
        return items.length;
      } else if (USE_FIRESTORE) {
        const items = await firestoreAdapter.list(collection, userId);
        return items.length;
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const userKeys = keys.filter(key =>
          key.startsWith(`${collection}_${userId}_`)
        );
        return userKeys.length;
      }
    } catch (error) {
      logger.error('DatabaseService', `Count ${collection} error`, { error });
      return 0;
    }
  }

  // Search operations
  static async search<T>(
    collection: string,
    userId: string,
    query: (item: T) => boolean
  ): Promise<T[]> {
    try {
      const items = await this.list<T>(collection, userId);
      return items.filter(query);
    } catch (error) {
      logger.error('DatabaseService', `Search ${collection} error`, { error });
      return [];
    }
  }

  // Batch operations
  static async batchCreate<T>(
    collection: string,
    userId: string,
    items: Array<{ id: string; data: T }>
  ): Promise<void> {
    try {
      if (USE_BACKEND) {
        for (const { id, data } of items) {

          await restAdapter.create(collection, userId, id, data);
        }
        logger.info('DatabaseService', `Batch created ${items.length} ${collection} items (Backend)`, { count: items.length });
      } else if (USE_FIRESTORE) {
        await firestoreAdapter.batchCreate(collection, userId, items);
        logger.info('DatabaseService', `Batch created ${items.length} ${collection} items (Firestore)`, { count: items.length });
      } else {
        const keyValuePairs: [string, string][] = items.map(({ id, data }) => [
          getDBKey(collection, userId, id),
          JSON.stringify(data)
        ]);
        await AsyncStorage.multiSet(keyValuePairs);
        logger.info('DatabaseService', `Batch created ${items.length} ${collection} items`, { count: items.length });
      }
    } catch (error) {
      logger.error('DatabaseService', `Batch create ${collection} error`, { error });
      throw error;
    }
  }

  static async batchDelete(
    collection: string,
    userId: string,
    itemIds: string[]
  ): Promise<void> {
    try {
      if (USE_BACKEND) {
        for (const id of itemIds) {

          await restAdapter.delete(collection, userId, id);
        }
        logger.info('DatabaseService', `Batch deleted ${itemIds.length} ${collection} items (Backend)`, { count: itemIds.length });
      } else if (USE_FIRESTORE) {
        await firestoreAdapter.batchDelete(collection, userId, itemIds);
        logger.info('DatabaseService', `Batch deleted ${itemIds.length} ${collection} items (Firestore)`, { count: itemIds.length });
      } else {
        const keys = itemIds.map(id => getDBKey(collection, userId, id));
        await AsyncStorage.multiRemove(keys);
        logger.info('DatabaseService', `Batch deleted ${itemIds.length} ${collection} items`, { count: itemIds.length });
      }
    } catch (error) {
      logger.error('DatabaseService', `Batch delete ${collection} error`, { error });
      throw error;
    }
  }

  // User-specific operations
  static async getUserData(userId: string) {
    try {
      const collections = Object.values(DB_COLLECTIONS);
      const userData: Record<string, unknown[]> = {};

      for (const collection of collections) {
        userData[collection] = await this.list(collection, userId);
      }

      return userData;
    } catch (error) {
      logger.error('DatabaseService', 'Get user data error', { error });
      return {};
    }
  }

  static async deleteUserData(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.includes(`_${userId}_`) || key.endsWith(`_${userId}`));
      await AsyncStorage.multiRemove(userKeys);
      logger.info('DatabaseService', 'Deleted all data for user', { userId });
    } catch (error) {
      logger.error('DatabaseService', 'Delete user data error', { error });
      throw error;
    }
  }

  // Migration and maintenance
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
      logger.info('DatabaseService', 'Cleared all data');
    } catch (error) {
      logger.error('DatabaseService', 'Clear all data error', { error });
      throw error;
    }
  }

  /**
   * Clear only local collection keys created by DatabaseService
   * Preserves app preferences like language, recent emails, etc.
   */
  static async clearLocalCollections(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const collectionPrefixes = Object.values(DB_COLLECTIONS).map((c) => `${c}_`);
      const keysToRemove = keys.filter((k) =>
        collectionPrefixes.some((prefix) => k.startsWith(prefix)) || k === DatabaseService.VERSION_KEY
      );
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      logger.info('DatabaseService', 'Cleared local collection keys', { count: keysToRemove.length });
    } catch (error) {
      logger.error('DatabaseService', 'Clear local collections error', { error });
      throw error;
    }
  }

  static async getDatabaseSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.length;
    } catch (error) {
      logger.error('DatabaseService', 'Get database size error', { error });
      return 0;
    }
  }

  static async exportUserData(userId: string): Promise<string> {
    try {
      const userData = await this.getUserData(userId);
      return JSON.stringify(userData, null, 2);
    } catch (error) {
      logger.error('DatabaseService', 'Export user data error', { error });
      throw error;
    }
  }

  static async importUserData(userId: string, dataJson: string): Promise<void> {
    try {
      const userData = JSON.parse(dataJson) as Record<string, unknown[]>;
      const collections = Object.keys(userData);

      for (const collection of collections) {
        const items = userData[collection];
        if (Array.isArray(items)) {
          for (const item of items) {
            const record = item as Record<string, unknown>;
            if (record.id) {
              await this.create(collection, userId, String(record.id), record);
            }
          }
        }
      }

      logger.info('DatabaseService', 'Imported data for user', { userId });
    } catch (error) {
      logger.error('DatabaseService', 'Import user data error', { error });
      throw error;
    }
  }
}

// Convenience functions for common operations
export const db = {
  // Users
  createUser: (userId: string, userData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.USERS, userId, userId, userData),

  getUser: (userId: string) =>
    DatabaseService.read(DB_COLLECTIONS.USERS, userId, userId),

  updateUser: (userId: string, userData: Record<string, unknown>) =>
    DatabaseService.update(DB_COLLECTIONS.USERS, userId, userId, userData),

  // Posts
  createPost: (userId: string, postId: string, postData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.POSTS, userId, postId, postData),

  getPost: (userId: string, postId: string) =>
    DatabaseService.read(DB_COLLECTIONS.POSTS, userId, postId),

  getUserPosts: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.POSTS, userId),

  deletePost: (userId: string, postId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.POSTS, userId, postId),

  // Followers
  addFollower: (userId: string, followerId: string, followerData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.FOLLOWERS, userId, followerId, followerData),

  removeFollower: (userId: string, followerId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.FOLLOWERS, userId, followerId),

  getFollowers: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.FOLLOWERS, userId),

  // Following
  addFollowing: (userId: string, followingId: string, followingData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.FOLLOWING, userId, followingId, followingData),

  removeFollowing: (userId: string, followingId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.FOLLOWING, userId, followingId),

  getFollowing: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.FOLLOWING, userId),

  // Chats
  createChat: (userId: string, chatId: string, chatData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.CHATS, userId, chatId, chatData),

  getChat: (userId: string, chatId: string) =>
    DatabaseService.read(DB_COLLECTIONS.CHATS, userId, chatId),

  getUserChats: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.CHATS, userId),

  // Messages
  createMessage: (userId: string, messageId: string, messageData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.MESSAGES, userId, messageId, messageData),

  getChatMessages: (userId: string, conversationId: string) =>
    DatabaseService.search(DB_COLLECTIONS.MESSAGES, userId, (msg: Record<string, unknown>) => (msg.conversationId as string) === conversationId),

  // Notifications
  createNotification: (userId: string, notificationId: string, notificationData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.NOTIFICATIONS, userId, notificationId, notificationData),

  getUserNotifications: async (userId: string) => {
    if (USE_BACKEND) {
      const res = await apiService.getNotifications(userId);
      return res.success ? res.data : [];
    }
    return DatabaseService.list(DB_COLLECTIONS.NOTIFICATIONS, userId);
  },

  markNotificationAsRead: async (userId: string, notificationId: string) => {
    if (USE_BACKEND) {
      const res = await apiService.markNotificationAsRead(userId, notificationId);
      return res.success;
    }
    return DatabaseService.update(DB_COLLECTIONS.NOTIFICATIONS, userId, notificationId, { read: true });
  },

  deleteNotification: async (userId: string, notificationId: string) => {
    if (USE_BACKEND) {
      const res = await apiService.deleteNotification(userId, notificationId);
      return res.success;
    }
    return DatabaseService.delete(DB_COLLECTIONS.NOTIFICATIONS, userId, notificationId);
  },

  // Bookmarks
  addBookmark: (userId: string, bookmarkId: string, bookmarkData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.BOOKMARKS, userId, bookmarkId, bookmarkData),

  removeBookmark: (userId: string, bookmarkId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.BOOKMARKS, userId, bookmarkId),

  getUserBookmarks: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.BOOKMARKS, userId),

  // Settings
  getUserSettings: (userId: string) =>
    DatabaseService.read(DB_COLLECTIONS.SETTINGS, userId, 'settings'),

  updateUserSettings: (userId: string, settings: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.SETTINGS, userId, 'settings', settings),

  // Media
  saveMedia: (userId: string, mediaId: string, mediaData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.MEDIA, userId, mediaId, mediaData),

  getMedia: (userId: string, mediaId: string) =>
    DatabaseService.read(DB_COLLECTIONS.MEDIA, userId, mediaId),

  deleteMedia: (userId: string, mediaId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.MEDIA, userId, mediaId),

  // Blocked Users
  blockUser: (userId: string, blockedUserId: string, blockedData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.BLOCKED_USERS, userId, blockedUserId, blockedData),

  unblockUser: (userId: string, blockedUserId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.BLOCKED_USERS, userId, blockedUserId),

  getBlockedUsers: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.BLOCKED_USERS, userId),

  isUserBlocked: async (userId: string, targetUserId: string) => {
    const blocked = await DatabaseService.read(DB_COLLECTIONS.BLOCKED_USERS, userId, targetUserId);
    return blocked !== null;
  },

  // Message Reactions
  addReaction: (userId: string, reactionId: string, reactionData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.MESSAGE_REACTIONS, userId, reactionId, reactionData),

  removeReaction: (userId: string, reactionId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.MESSAGE_REACTIONS, userId, reactionId),

  getMessageReactions: (userId: string, messageId: string) =>
    DatabaseService.search(DB_COLLECTIONS.MESSAGE_REACTIONS, userId, (reaction: Record<string, unknown>) => (reaction.messageId as string) === messageId),

  // Typing Status
  setTypingStatus: (userId: string, conversationId: string, typingData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.TYPING_STATUS, userId, conversationId, typingData),

  clearTypingStatus: (userId: string, conversationId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.TYPING_STATUS, userId, conversationId),

  getTypingStatus: (userId: string, conversationId: string) =>
    DatabaseService.read(DB_COLLECTIONS.TYPING_STATUS, userId, conversationId),

  // Read Receipts
  markAsRead: (userId: string, receiptId: string, receiptData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.READ_RECEIPTS, userId, receiptId, receiptData),

  getReadReceipts: (userId: string, messageId: string) =>
    DatabaseService.search(DB_COLLECTIONS.READ_RECEIPTS, userId, (receipt: Record<string, unknown>) => (receipt.messageId as string) === messageId),

  // Voice Messages
  saveVoiceMessage: (userId: string, voiceId: string, voiceData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.VOICE_MESSAGES, userId, voiceId, voiceData),

  getVoiceMessage: (userId: string, voiceId: string) =>
    DatabaseService.read(DB_COLLECTIONS.VOICE_MESSAGES, userId, voiceId),

  deleteVoiceMessage: (userId: string, voiceId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.VOICE_MESSAGES, userId, voiceId),

  // Conversation Metadata
  updateConversationMetadata: (userId: string, conversationId: string, metadata: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.CONVERSATION_METADATA, userId, conversationId, metadata),

  getConversationMetadata: (userId: string, conversationId: string) =>
    DatabaseService.read(DB_COLLECTIONS.CONVERSATION_METADATA, userId, conversationId),

  // Advanced Message Operations
  updateMessage: (userId: string, messageId: string, messageData: Record<string, unknown>) =>
    DatabaseService.update(DB_COLLECTIONS.MESSAGES, userId, messageId, messageData),

  deleteMessage: (userId: string, messageId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.MESSAGES, userId, messageId),

  searchMessages: (userId: string, searchQuery: string) =>
    DatabaseService.search(DB_COLLECTIONS.MESSAGES, userId, (msg: Record<string, unknown>) =>
      (msg.text as string)?.toLowerCase().includes(searchQuery.toLowerCase())
    ),

  // Batch Message Operations
  batchCreateMessages: (userId: string, messages: Array<{ id: string; data: Record<string, unknown> }>) =>
    DatabaseService.batchCreate(DB_COLLECTIONS.MESSAGES, userId, messages),

  batchDeleteMessages: (userId: string, messageIds: string[]) =>
    DatabaseService.batchDelete(DB_COLLECTIONS.MESSAGES, userId, messageIds),

  // Rides (Trump)
  createRide: async (userId: string, rideId: string, rideData: Record<string, unknown>) => {
    try {
      if (USE_BACKEND) {
        const departureIso = (() => {
          try {
            const dateStr = typeof rideData?.date === 'string' ? rideData.date : new Date().toISOString().split('T')[0];
            const timeStr = typeof rideData?.time === 'string' ? rideData.time : new Date().toTimeString().slice(0, 5);

            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              throw new Error('Invalid date format');
            }

            // Validate time format (HH:MM)
            if (!/^\d{2}:\d{2}$/.test(timeStr)) {
              throw new Error('Invalid time format');
            }

            // Parse time components
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Create date in local timezone (not UTC)
            // Use the date string and set hours/minutes in local timezone
            const localDate = new Date(dateStr + 'T00:00:00');
            localDate.setHours(hours, minutes, 0, 0);

            // Convert to ISO string (this will be in UTC, but we preserve the local time intent)
            // The server should store this as-is, treating it as the intended local time
            const isoString = localDate.toISOString();

            logger.debug('DatabaseService', 'Converting time for ride', { dateStr, timeStr, isoString });

            // Check if date is valid
            if (isNaN(localDate.getTime())) {
              throw new Error('Invalid datetime');
            }

            return isoString;
          } catch (error) {
            logger.error('DatabaseService', 'Date parsing error for ride', { error });
            // Fallback to current time if date parsing fails
            return new Date().toISOString();
          }
        })();
        // Validate required fields before sending to server
        if (!rideData.from || !rideData.to) {
          throw new Error('From and to locations are required');
        }

        const driverId = rideData.driverId || userId;
        if (!driverId) {
          throw new Error('Driver ID is required');
        }

        const payload = {
          driver_id: driverId,
          title: rideData.title || `${rideData.from} → ${rideData.to}`,
          from_location: {
            name: rideData.from,
            city: rideData.from,
            address: rideData.from
          },
          to_location: {
            name: rideData.to,
            city: rideData.to,
            address: rideData.to
          },
          departure_time: departureIso,
          arrival_time: null,
          available_seats: Math.max(1, Math.min(8, typeof rideData.seats === 'number' ? rideData.seats : 1)),
          price_per_seat: Math.max(0, Number(rideData.price || 0)),
          description: rideData.description || null,
          requirements: (() => {
            const reqs: string[] = [];
            if (rideData.noSmoking) reqs.push('no-smoking');
            if (rideData.petsAllowed) reqs.push('pets-allowed');
            if (rideData.kidsFriendly) reqs.push('kids-friendly');
            return reqs.length > 0 ? reqs.join(', ') : null;
          })(),
          metadata: { source: 'legacy-app', legacy_id: rideId },
        };

        logger.debug('DatabaseService', 'Creating ride with payload', { payload });
        const res = await apiService.createRide(payload);
        if (!res.success) throw new Error(res.error || 'Failed to create ride');

        // Clear cache to ensure immediate update in UI
        try {
          const enhancedDB = await loadEnhancedDB();
          await enhancedDB.clearCachePattern('rides_list');
          await enhancedDB.clearCachePattern('user_rides');
        } catch (cacheError) {
          logger.warn('DatabaseService', 'Failed to clear ride cache', { cacheError });
        }

        return;
      }
      return DatabaseService.create(DB_COLLECTIONS.RIDES, userId, rideId, rideData);
    } catch (error) {
      logger.error('DatabaseService', 'createRide error', { error });
      throw error;
    }
  },

  getRide: async (_userId: string, rideId: string) => {
    try {
      if (USE_BACKEND) {
        const res = await apiService.getRideById(rideId);
        if (!res.success || !res.data) return null;
        const r = res.data as RideApiResponse;
        const depTime = r.departure_time ? new Date(r.departure_time) : new Date();
        return {
          id: r.id,
          driverName: r.driver_name || '',
          from: r.from_location?.name || r.from_location?.city || '',
          to: r.to_location?.name || r.to_location?.city || '',
          date: depTime.toISOString().slice(0, 10),
          time: depTime.toISOString().slice(11, 16),
          seats: r.available_seats,
          price: Number(r.price_per_seat) || 0,
          rating: 5,
          image: '🚗',
        };
      }
      return DatabaseService.read(DB_COLLECTIONS.RIDES, _userId, rideId);
    } catch (error) {
      logger.error('DatabaseService', 'getRide error', { error });
      return null;
    }
  },

  listRides: async (_userId: string, _options?: { includePast?: boolean }) => {
    try {
      if (USE_BACKEND) {
        const enhancedDB = await loadEnhancedDB();
        // Pass include_past parameter to get all rides including past ones
        const filters: RideListFilters = {};
        if (_options?.includePast) {
          filters.include_past = 'true';
        }
        // Don't set status filter - let server return all active/published rides
        // The server defaults to 'active' but we want to see all published rides too
        logger.debug('DatabaseService', 'listRides filters', { filters });
        const apiRides = await enhancedDB.getRides(filters as Record<string, unknown>);
        logger.debug('DatabaseService', 'listRides returned', { count: apiRides?.length || 0 });
        if (apiRides && apiRides.length > 0) {
          logger.debug('DatabaseService', 'First ride sample', {
            id: apiRides[0].id,
            status: apiRides[0].status,
            from: (apiRides[0] as RideApiResponse).from_location?.name ?? (apiRides[0] as unknown as Record<string, unknown>).from,
            to: (apiRides[0] as RideApiResponse).to_location?.name ?? (apiRides[0] as unknown as Record<string, unknown>).to,
            departure_time: (apiRides[0] as RideApiResponse).departure_time
          });
        }
        return (apiRides || []).map((r: RideApiResponse) => {
          // Convert UTC time to local time for display
          let dateStr = '';
          let timeStr = '00:00';

          if (r.departure_time) {
            const departureDate = new Date(r.departure_time);
            // Get local date and time (not UTC)
            dateStr = departureDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            const localHours = departureDate.getHours();
            const localMinutes = departureDate.getMinutes();
            timeStr = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
          } else {
            dateStr = r.date || new Date().toISOString().slice(0, 10);
            timeStr = r.time || '00:00';
          }

          return {
            id: r.id,
            driverId: r.driver_id || r.driverId || r.createdBy,
            driverName: r.driver_name || r.driverId || 'Driver',
            from: r.from_location?.name ?? (r as unknown as Record<string, unknown>).from ?? '',
            to: r.to_location?.name ?? (r as unknown as Record<string, unknown>).to ?? '',
            date: dateStr,
            time: timeStr,
            seats: r.available_seats ?? r.seats ?? 1,
            price: Number(r.price_per_seat ?? r.price ?? 0),
            rating: r.rating ?? 5,
            image: r.image ?? '🚗',
            category: r.category ?? 'ride',
            status: r.status || 'active', // Ensure status is set
            noSmoking: r.requirements?.includes('no-smoking') || false,
            petsAllowed: r.requirements?.includes('pets-allowed') || false,
            kidsFriendly: r.requirements?.includes('kids-friendly') || false,
          };
        });
      }
      return DatabaseService.list(DB_COLLECTIONS.RIDES, _userId);
    } catch (error) {
      logger.error('DatabaseService', 'listRides error', { error });
      return [];
    }
  },

  getUserRides: async (_userId: string, _role: 'driver' | 'passenger' = 'driver') => {
    try {
      if (USE_BACKEND) {
        const enhancedDB = await loadEnhancedDB();
        const apiRides = await enhancedDB.getUserRides(_userId, _role);
        return (apiRides || []).map((r: RideApiResponse) => {
          // Convert UTC time to local time for display
          let dateStr = '';
          let timeStr = '00:00';

          if (r.departure_time) {
            const departureDate = new Date(r.departure_time);
            // Get local date and time (not UTC)
            dateStr = departureDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            const localHours = departureDate.getHours();
            const localMinutes = departureDate.getMinutes();
            timeStr = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
          } else {
            dateStr = r.date || new Date().toISOString().slice(0, 10);
            timeStr = r.time || '00:00';
          }

          return {
            id: r.id,
            driverId: r.driver_id || r.driverId || r.createdBy,
            driverName: r.driver_name || r.driverId || 'Driver',
            from: r.from_location?.name || (r as unknown as Record<string, unknown>).from || '',
            to: r.to_location?.name || (r as unknown as Record<string, unknown>).to || '',
            date: dateStr,
            time: timeStr,
            seats: r.available_seats ?? r.seats ?? 1,
            price: Number(r.price_per_seat ?? r.price ?? 0),
            rating: r.rating ?? 5,
            image: r.image ?? '🚗',
            category: r.category ?? 'ride',
            status: r.status || 'published',
          };
        });
      }
      return DatabaseService.list(DB_COLLECTIONS.RIDES, _userId);
    } catch (error) {
      logger.error('DatabaseService', 'getUserRides error', { error });
      return [];
    }
  },

  updateRide: async (_userId: string, rideId: string, rideData: Partial<Record<string, unknown>>) => {
    try {
      if (USE_BACKEND) {
        const payload: Record<string, unknown> = {};
        if (rideData.title) payload.title = rideData.title;
        if (rideData.seats !== undefined) payload.available_seats = rideData.seats;
        if (rideData.price !== undefined) payload.price_per_seat = Number(rideData.price);
        if (rideData.status) payload.status = rideData.status;
        const res = await apiService.updateDonation(rideId, payload);
        if (!res.success) throw new Error(res.error || 'Failed to update ride');
        return;
      }
      return DatabaseService.update(DB_COLLECTIONS.RIDES, _userId, rideId, rideData);
    } catch (error) {
      logger.error('DatabaseService', 'updateRide error', { error });
      throw error;
    }
  },

  deleteRide: async (_userId: string, rideId: string) => {
    try {
      if (USE_BACKEND) {
        // RidesController uses status update for cancel; no direct delete endpoint in apiService
        await apiService.updateBookingStatus(rideId, 'cancelled');
        return;
      }
      return DatabaseService.delete(DB_COLLECTIONS.RIDES, _userId, rideId);
    } catch (error) {
      logger.error('DatabaseService', 'deleteRide error', { error });
      throw error;
    }
  },

  // Donations / Items (generic items postings)
  createDonation: (userId: string, donationId: string, donationData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.DONATIONS, userId, donationId, donationData),

  getDonation: (userId: string, donationId: string) =>
    DatabaseService.read(DB_COLLECTIONS.DONATIONS, userId, donationId),

  listDonations: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.DONATIONS, userId),

  updateDonation: (userId: string, donationId: string, donationData: Record<string, unknown>) =>
    DatabaseService.update(DB_COLLECTIONS.DONATIONS, userId, donationId, donationData),

  deleteDonation: (userId: string, donationId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.DONATIONS, userId, donationId),

  // Items (furniture, clothes, general items)
  createItem: (userId: string, itemId: string, itemData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.ITEMS, userId, itemId, itemData),

  getItem: (userId: string, itemId: string) =>
    DatabaseService.read(DB_COLLECTIONS.ITEMS, userId, itemId),

  listItems: (userId: string) =>
    DatabaseService.list(DB_COLLECTIONS.ITEMS, userId),

  updateItem: (userId: string, itemId: string, itemData: Record<string, unknown>) =>
    DatabaseService.update(DB_COLLECTIONS.ITEMS, userId, itemId, itemData),

  deleteItem: (userId: string, itemId: string) =>
    DatabaseService.delete(DB_COLLECTIONS.ITEMS, userId, itemId),

  // Organizations
  createOrganization: (ownerUserId: string, orgId: string, orgData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.ORGANIZATIONS, ownerUserId, orgId, orgData),

  getOrganization: (ownerUserId: string, orgId: string) =>
    DatabaseService.read(DB_COLLECTIONS.ORGANIZATIONS, ownerUserId, orgId),

  updateOrganization: (ownerUserId: string, orgId: string, orgData: Record<string, unknown>) =>
    DatabaseService.update(DB_COLLECTIONS.ORGANIZATIONS, ownerUserId, orgId, orgData),

  listOrganizations: (ownerUserId: string) =>
    DatabaseService.list(DB_COLLECTIONS.ORGANIZATIONS, ownerUserId),

  // Org Applications (onboarding requests)
  createOrgApplication: (ownerUserId: string, applicationId: string, applicationData: Record<string, unknown>) =>
    DatabaseService.create(DB_COLLECTIONS.ORG_APPLICATIONS, ownerUserId, applicationId, applicationData),

  getOrgApplication: (ownerUserId: string, applicationId: string) =>
    DatabaseService.read(DB_COLLECTIONS.ORG_APPLICATIONS, ownerUserId, applicationId),

  updateOrgApplication: (ownerUserId: string, applicationId: string, applicationData: Record<string, unknown>) =>
    DatabaseService.update(DB_COLLECTIONS.ORG_APPLICATIONS, ownerUserId, applicationId, applicationData),

  listOrgApplications: (ownerUserId: string) =>
    DatabaseService.list(DB_COLLECTIONS.ORG_APPLICATIONS, ownerUserId),

  // ========================================
  // Dedicated Items API (separate columns)
  // ========================================

  createDedicatedItem: async (itemData: Record<string, unknown>) => {
    logger.info('DatabaseService', 'Creating dedicated item', { url: `${API_BASE_URL}/api/dedicated-items` });
    const response = await axios.post(`${API_BASE_URL}/api/dedicated-items`, itemData);
    logger.info('DatabaseService', 'Dedicated item created');
    return response.data;
  },

  getDedicatedItemsByOwner: async (ownerId: string) => {
    logger.debug('DatabaseService', 'Fetching items for owner', { ownerId });
    const response = await axios.get(`${API_BASE_URL}/api/dedicated-items/owner/${ownerId}`);
    return response.data;
  },

  getDedicatedItemById: async (id: string) => {
    logger.debug('DatabaseService', 'Fetching item by ID', { id });
    const response = await axios.get(`${API_BASE_URL}/api/dedicated-items/${id}`);
    return response.data;
  },

  updateDedicatedItem: async (id: string, itemData: Record<string, unknown>) => {
    logger.info('DatabaseService', 'Updating dedicated item', { id });
    const response = await axios.put(`${API_BASE_URL}/api/dedicated-items/${id}`, itemData);
    return response.data;
  },

  // NOTE: Links functionality has been removed - links table was deleted from database
  // All user data is now unified in user_profiles table with UUID identifiers

  deleteDedicatedItem: async (id: string) => {
    logger.info('DatabaseService', 'Deleting dedicated item', { id });
    const response = await axios.delete(`${API_BASE_URL}/api/dedicated-items/${id}`);
    return response.data;
  },

  // ========================================
  // Community Group Challenges API
  // ========================================

  createCommunityChallenge: async (challengeData: {
    creator_id: string;
    title: string;
    description?: string;
    image_url?: string;
    type: 'BOOLEAN' | 'NUMERIC' | 'DURATION';
    frequency: 'DAILY' | 'WEEKLY' | 'FLEXIBLE';
    goal_value?: number;
    goal_direction?: 'maximize' | 'minimize';
    deadline?: string;
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    category?: string;
  }) => {
    logger.info('DatabaseService', 'Creating community challenge', { title: challengeData.title });
    const response = await axios.post(`${API_BASE_URL}/api/community-challenges`, challengeData);
    return response.data;
  },

  getCommunityChallenges: async (filters: {
    type?: string;
    frequency?: string;
    difficulty?: string;
    category?: string;
    is_active?: boolean;
    creator_id?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  } = {}) => {
    logger.debug('DatabaseService', 'Fetching community challenges with filters', { filters });
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const response = await axios.get(`${API_BASE_URL}/api/community-challenges?${params.toString()}`);
    return response.data;
  },

  getChallengeDetails: async (challengeId: string) => {
    logger.debug('DatabaseService', 'Fetching challenge details', { challengeId });
    const response = await axios.get(`${API_BASE_URL}/api/community-challenges/${challengeId}`);
    return response.data;
  },

  joinChallenge: async (challengeId: string, userId: string) => {
    logger.info('DatabaseService', 'Joining challenge', { challengeId, userId });
    const response = await axios.post(`${API_BASE_URL}/api/community-challenges/${challengeId}/join`, {
      user_id: userId
    });
    return response.data;
  },

  addChallengeEntry: async (challengeId: string, entryData: {
    user_id: string;
    value: number;
    entry_date?: string;
    notes?: string;
  }) => {
    const body = { challenge_id: challengeId, ...entryData };
    logger.debug('DatabaseService', 'Adding challenge entry', { challengeId, entryDate: entryData.entry_date, value: entryData.value });
    const response = await axios.post(
      `${API_BASE_URL}/api/community-challenges/${challengeId}/entries`,
      body
    );
    return response.data;
  },

  getChallengeEntries: async (challengeId: string, userId: string, limit = 100, offset = 0) => {
    logger.debug('DatabaseService', 'Fetching challenge entries', { challengeId, userId });
    const params = new URLSearchParams({
      user_id: userId,
      limit: String(limit),
      offset: String(offset)
    });
    const response = await axios.get(
      `${API_BASE_URL}/api/community-challenges/${challengeId}/entries?${params.toString()}`
    );
    return response.data;
  },

  getChallengeStatistics: async (userId: string) => {
    logger.debug('DatabaseService', 'Fetching challenge statistics for user', { userId });
    const response = await axios.get(`${API_BASE_URL}/api/community-challenges/user/${userId}/stats`);
    return response.data;
  },

  updateCommunityChallenge: async (challengeId: string, userId: string, updateData: {
    title?: string;
    description?: string;
    image_url?: string;
    goal_value?: number;
    goal_direction?: 'maximize' | 'minimize';
    deadline?: string;
    difficulty?: string;
    category?: string;
    is_active?: boolean;
  }) => {
    logger.info('DatabaseService', 'Updating challenge', { challengeId });
    const params = new URLSearchParams({ user_id: userId });
    const response = await axios.put(
      `${API_BASE_URL}/api/community-challenges/${challengeId}?${params.toString()}`,
      updateData
    );
    return response.data;
  },

  deleteCommunityChallenge: async (challengeId: string, userId: string) => {
    logger.info('DatabaseService', 'Deleting challenge', { challengeId, userId });
    const params = new URLSearchParams({ user_id: userId });
    const url = `${API_BASE_URL}/api/community-challenges/${challengeId}?${params.toString()}`;
    const response = await axios.delete(url);
    return response.data;
  },

  // ========================================
  // Daily Habits Tracker API
  // ========================================

  getDailyTrackerData: async (userId: string, startDate?: string, endDate?: string) => {
    logger.debug('DatabaseService', 'Fetching daily tracker data', { userId, startDate, endDate });

    const params = new URLSearchParams({ user_id: userId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axios.get(
      `${API_BASE_URL}/api/community-challenges/daily-tracker?${params.toString()}`
    );

    const payload = response.data?.data ?? response.data;
    logger.debug('DatabaseService', 'Tracker data received', {
      challengesCount: payload?.challenges?.length ?? 0,
      successRate: payload?.stats?.total_success_rate ?? 'N/A'
    });
    return response.data;
  },
};

export default DatabaseService;