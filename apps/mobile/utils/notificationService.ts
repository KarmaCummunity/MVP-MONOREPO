// utils/notificationService.ts
import { Platform, Alert } from 'react-native';
import { db, DB_COLLECTIONS, DatabaseService } from './databaseService';
import colors from '../globals/colors';

// Import notifications only on supported platforms
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('Failed to load expo-notifications:', error);
  }
}

// --- Simple in-app notification event bus ---
type NotificationEventListener = (notification: NotificationData) => void;
const notificationEventListeners: Set<NotificationEventListener> = new Set();

export const subscribeToNotificationEvents = (listener: NotificationEventListener): (() => void) => {
  notificationEventListeners.add(listener);
  return () => notificationEventListeners.delete(listener);
};

const emitNotificationEvent = (notification: NotificationData) => {
  notificationEventListeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (err) {
      console.warn('Notification listener error:', err);
    }
  });
};

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  type: 'message' | 'follow' | 'like' | 'comment' | 'system';
  timestamp: string;
  read: boolean;
  userId: string;
}

export interface NotificationSettings {
  messages: boolean;
  follows: boolean;
  likes: boolean;
  comments: boolean;
  system: boolean;
  sound: boolean;
  vibration: boolean;
}

// Storage keys - deprecated, using database service now
// const NOTIFICATIONS_COLLECTION = 'notifications';
// const NOTIFICATION_SETTINGS = 'notification_settings';

const isNotificationsSupported = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Configure notification behavior רק אם הפלטפורמה תומכת
if (isNotificationsSupported() && Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('Failed to set notification handler:', error);
  }
}

export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('🔔 Web platform or no notifications module - notifications not supported');
      return false;
    }

    console.log('🔔 Requesting notification permissions...');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permissions not granted');
      Alert.alert(
        'הרשאות התראות',
        'כדי לקבל התראות על הודעות חדשות ועוקבים, אנא אשר גישה להתראות בהגדרות המכשיר',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'הגדרות', onPress: () => { } }
        ]
      );
      return false;
    }

    console.log('✅ Notification permissions granted');

    if (Platform.OS === 'android') {
      console.log('🤖 Android platform - setting up notification channel');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.error, // Red light
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Request notification permissions error:', error);
    return false;
  }
};

export const checkNotificationPermissions = async (): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}> => {
  try {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('🌐 Web platform or no notifications module - checking notification permissions (not supported)');
      return {
        granted: false,
        canAskAgain: false,
        status: 'web_not_supported',
      };
    }

    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  } catch (error) {
    console.error('❌ Check notification permissions error:', error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'unknown',
    };
  }
};

export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: any,
  type: NotificationData['type'] = 'system'
): Promise<string> => {
  try {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('🔔 Web platform or no notifications module - skipping local notification:', title);
      return '';
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('❌ No notification permissions, cannot send notification');
      return '';
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, type },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });

    console.log('✅ Local notification sent:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Send local notification error:', error);
    return '';
  }
};

export const sendMessageNotification = async (
  senderName: string,
  messageText: string,
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - sending message notification');
    }

    const settings = await getNotificationSettings(userId);
    if (!settings.messages) {
      console.log('🔕 Message notifications disabled');
      return;
    }

    const title = `הודעה חדשה מ-${senderName}`;
    const body = messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText;

    // Local notification removed - will be handled by receiver's listener
    // await sendLocalNotification(title, body, {
    //   conversationId,
    //   senderName,
    //   type: 'message',
    // }, 'message');

    await saveNotification({
      id: `msg_${Date.now()}`,
      title,
      body,
      data: { conversationId, senderName },
      type: 'message',
      timestamp: new Date().toISOString(),
      read: false,
      userId,
    });

  } catch (error) {
    console.error('❌ Send message notification error:', error);
  }
};

export const sendFollowNotification = async (
  followerName: string,
  userId: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - sending follow notification');
    }

    const settings = await getNotificationSettings(userId);
    if (!settings.follows) {
      console.log('🔕 Follow notifications disabled');
      return;
    }

    const title = 'עוקב חדש!';
    const body = `${followerName} התחיל לעקוב אחריך`;

    // Local notification removed - will be handled by receiver's listener
    // await sendLocalNotification(title, body, {
    //   followerName,
    //   type: 'follow',
    // }, 'follow');

    await saveNotification({
      id: `follow_${Date.now()}`,
      title,
      body,
      data: { followerName },
      type: 'follow',
      timestamp: new Date().toISOString(),
      read: false,
      userId,
    });

  } catch (error) {
    console.error('❌ Send follow notification error:', error);
  }
};

export const sendLikeNotification = async (
  likerName: string,
  postType: string,
  userId: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - sending like notification');
    }

    const settings = await getNotificationSettings(userId);
    if (!settings.likes) {
      console.log('🔕 Like notifications disabled');
      return;
    }

    const title = 'לייק חדש!';
    const body = `${likerName} אהב את ה${postType} שלך`;

    // Local notification removed - will be handled by receiver's listener
    // await sendLocalNotification(title, body, {
    //   likerName,
    //   postType,
    //   type: 'like',
    // }, 'like');

    await saveNotification({
      id: `like_${Date.now()}`,
      title,
      body,
      data: { likerName, postType },
      type: 'like',
      timestamp: new Date().toISOString(),
      read: false,
      userId,
    });

  } catch (error) {
    console.error('❌ Send like notification error:', error);
  }
};

export const sendCommentNotification = async (
  commenterName: string,
  postType: string,
  commentText: string,
  userId: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - sending comment notification');
    }

    const settings = await getNotificationSettings(userId);
    if (!settings.comments) {
      console.log('🔕 Comment notifications disabled');
      return;
    }

    const title = 'תגובה חדשה!';
    const body = `${commenterName} הגיב על ה${postType} שלך: ${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}`;

    // Local notification removed - will be handled by receiver's listener
    // await sendLocalNotification(title, body, {
    //   commenterName,
    //   postType,
    //   commentText,
    //   type: 'comment',
    // }, 'comment');

    await saveNotification({
      id: `comment_${Date.now()}`,
      title,
      body,
      data: { commenterName, postType, commentText },
      type: 'comment',
      timestamp: new Date().toISOString(),
      read: false,
      userId,
    });

  } catch (error) {
    console.error('❌ Send comment notification error:', error);
  }
};

export const sendTaskNotification = async (
  taskTitle: string,
  taskDescription: string,
  userId: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - sending task notification');
    }

    const settings = await getNotificationSettings(userId);
    if (!settings.system) {
      console.log('🔕 System notifications disabled');
      return;
    }

    const title = 'משימה חדשה!';
    const body = `${taskTitle}: ${taskDescription.substring(0, 50)}${taskDescription.length > 50 ? '...' : ''}`;

    // Local notification removed - will be handled by receiver's listener
    // await sendLocalNotification(title, body, {
    //   taskTitle,
    //   taskDescription,
    //   type: 'system',
    // }, 'system');

    await saveNotification({
      id: `task_${Date.now()}`,
      title,
      body,
      data: { taskTitle, taskDescription },
      type: 'system',
      timestamp: new Date().toISOString(),
      read: false,
      userId,
    });

  } catch (error) {
    console.error('❌ Send task notification error:', error);
  }
};

export const sendDonationNotification = async (
  donorName: string,
  donationType: string,
  userId: string,
  amount?: string
): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - sending donation notification');
    }

    const settings = await getNotificationSettings(userId);
    if (!settings.system) {
      console.log('🔕 System notifications disabled');
      return;
    }

    const title = 'תרומה חדשה!';
    const body = amount
      ? `${donorName} תרם ${amount} ${donationType}`
      : `${donorName} תרם ${donationType}`;

    // Local notification removed - will be handled by receiver's listener
    // await sendLocalNotification(title, body, {
    //   donorName,
    //   donationType,
    //   amount,
    //   type: 'system',
    // }, 'system');

    await saveNotification({
      id: `donation_${Date.now()}`,
      title,
      body,
      data: { donorName, donationType, amount },
      type: 'system',
      timestamp: new Date().toISOString(),
      read: false,
      userId,
    });

  } catch (error) {
    console.error('❌ Send donation notification error:', error);
  }
};

export const getNotificationSettings = async (userId?: string): Promise<NotificationSettings> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - getting notification settings');
    }

    if (!userId) {
      console.log('🔔 No userId provided, returning default settings');
      return {
        messages: true,
        follows: true,
        likes: true,
        comments: true,
        system: true,
        sound: true,
        vibration: true,
      };
    }

    const settings = await db.getUserSettings(userId);
    if (settings && (settings as any).notifications) {
      return (settings as any).notifications;
    }

    const defaultSettings: NotificationSettings = {
      messages: true,
      follows: true,
      likes: true,
      comments: true,
      system: true,
      sound: true,
      vibration: true,
    };

    const userSettings = { notifications: defaultSettings };
    await db.updateUserSettings(userId, userSettings);
    return defaultSettings;
  } catch (error) {
    console.error('❌ Get notification settings error:', error);
    return {
      messages: true,
      follows: true,
      likes: true,
      comments: true,
      system: true,
      sound: true,
      vibration: true,
    };
  }
};

export const updateNotificationSettings = async (settings: Partial<NotificationSettings>, userId?: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - updating notification settings');
    }

    if (!userId) {
      console.log('🔔 No userId provided, cannot update settings');
      return;
    }

    const currentSettings = await getNotificationSettings(userId);
    const updatedSettings = { ...currentSettings, ...settings };

    const userSettings = { notifications: updatedSettings };
    await db.updateUserSettings(userId, userSettings);
    console.log('✅ Notification settings updated');
  } catch (error) {
    console.error('❌ Update notification settings error:', error);
  }
};

export const saveNotification = async (notification: NotificationData): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - saving notification to history');
    }

    await db.createNotification(notification.userId, notification.id, notification);
    console.log('✅ Notification saved to history');

    // Emit in-app event so UI can update in real-time
    emitNotificationEvent(notification);
  } catch (error) {
    console.error('❌ Save notification error:', error);
  }
};

export const getNotifications = async (userId: string): Promise<NotificationData[]> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - getting notifications for user:', userId);
    }

    const notifications = await db.getUserNotifications(userId);
    return (notifications as NotificationData[]) || [];
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - marking notification as read:', notificationId);
    }

    await db.markNotificationAsRead(userId, notificationId);
    console.log('✅ Notification marked as read');
  } catch (error) {
    console.error('❌ Mark notification as read error:', error);
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - marking all notifications as read for user:', userId);
    }

    const notifications = await getNotifications(userId);
    for (const notification of notifications) {
      await db.markNotificationAsRead(userId, notification.id);
    }
    console.log('✅ All notifications marked as read');
  } catch (error) {
    console.error('❌ Mark all notifications as read error:', error);
  }
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - deleting notification:', notificationId);
    }

    await db.deleteNotification(userId, notificationId);
    console.log('✅ Notification deleted');
  } catch (error) {
    console.error('❌ Delete notification error:', error);
  }
};

export const clearAllNotifications = async (userId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - clearing all notifications for user:', userId);
    }

    const notifications = await getNotifications(userId);
    const notificationIds = notifications.map(n => n.id);
    await DatabaseService.batchDelete(DB_COLLECTIONS.NOTIFICATIONS, userId, notificationIds);
    console.log('✅ All notifications cleared');
  } catch (error) {
    console.error('❌ Clear all notifications error:', error);
  }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - getting unread notification count for user:', userId);
    }

    const notifications = await getNotifications(userId);
    const unreadCount = notifications.filter(notification => !notification.read).length;
    console.log('📊 Unread notifications count:', unreadCount);
    return unreadCount;
  } catch (error) {
    console.error('❌ Get unread notification count error:', error);
    return 0;
  }
};

export const setupNotificationListener = (callback: (notification: any) => void) => {
  if (!isNotificationsSupported() || !Notifications) {
    console.log('🔔 Notifications not supported on this platform');
    return null;
  }

  if (Platform.OS === 'web') {
    console.log('🌐 Web platform - setting up notification listener (will be ignored)');
    return null;
  }

  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
};

export const setupNotificationResponseListener = (callback: (response: any) => void) => {
  if (!isNotificationsSupported()) {
    console.log('🔔 Notifications not supported on this platform');
    return null;
  }

  if (Platform.OS === 'web') {
    console.log('🌐 Web platform - setting up notification response listener (will be ignored)');
    return null;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
};

// --- Global Notification Listener ---

let notificationPollingInterval: any = null;
const seenNotificationIds = new Set<string>();

export const startNotificationListener = (userId: string) => {
  if (Platform.OS === 'web') return () => { };

  console.log('🔔 Starting notification listener for user:', userId);

  // Initial load to populate seen set (so we don't notify for old stuff)
  getNotifications(userId).then(notifications => {
    notifications.forEach(n => seenNotificationIds.add(n.id));
  });

  // Stop existing interval if any
  if (notificationPollingInterval) {
    clearInterval(notificationPollingInterval);
  }

  // Poll every 5 seconds
  notificationPollingInterval = setInterval(async () => {
    try {
      const notifications = await getNotifications(userId);

      // Check for new unread notifications
      for (const notification of notifications) {
        if (!notification.read && !seenNotificationIds.has(notification.id)) {
          // New notification found!
          console.log('🔔 New notification found via listener:', notification.id);
          seenNotificationIds.add(notification.id);

          // Trigger local notification
          await sendLocalNotification(
            notification.title,
            notification.body,
            notification.data,
            notification.type
          );

          // Emit event to update UI immediately if app is open
          emitNotificationEvent(notification);
        } else if (seenNotificationIds.has(notification.id) && notification.read) {
          // Optional: could remove from set, but keeping it prevents re-notifying if marked unread again (though rare)
        }
      }

      // Cleanup seen set for deleted notifications (optional optimization)
      if (seenNotificationIds.size > 100) {
        const currentIds = new Set(notifications.map(n => n.id));
        for (const id of seenNotificationIds) {
          if (!currentIds.has(id)) {
            seenNotificationIds.delete(id);
          }
        }
      }

    } catch (error) {
      console.warn('⚠️ Notification listener polling error:', error);
    }
  }, 5000);

  return () => {
    if (notificationPollingInterval) {
      clearInterval(notificationPollingInterval);
      notificationPollingInterval = null;
    }
    console.log('🔕 Notification listener stopped');
  };
};