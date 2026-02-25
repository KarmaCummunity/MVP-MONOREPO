// components/ChatListItem.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons as Icon } from '@expo/vector-icons';
// Define types locally - replace with real types from API
interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: string;
    senderId: string;
  };
  lastMessageText?: string;
  lastMessageTimestamp: string;
  unreadCount?: number;
}
import colors from '../globals/colors'; // Assuming you have a Colors file
import { FontSizes } from '../globals/constants';

interface ChatListItemProps {
  conversation: ChatConversation;
  user: ChatUser;
  onPress: (conversationId: string) => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ conversation, user, onPress }) => {
  const { t } = useTranslation(['common','chat']);
  const [imageError, setImageError] = useState(false);
  // Use unreadCount directly instead of checking the messages array
  // This is because the messages array is not loaded in the ChatListScreen
  const isUnread = (conversation.unreadCount ?? 0) > 0;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('common:time.daysAgo', { count: 1 });
    } else if (diffDays <= 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
    }
  };

  const avatarUri = user.avatar || 'https://i.pravatar.cc/150?img=1';
  const showPlaceholder = !user.avatar || imageError;

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(conversation.id)}>
      <View style={styles.avatarContainer}>
        {showPlaceholder ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Icon name="person" size={28} color={colors.textSecondary} />
          </View>
        ) : (
          <Image 
            source={{ uri: avatarUri }} 
            style={styles.avatar}
            onError={() => setImageError(true)}
            defaultSource={{ uri: 'https://i.pravatar.cc/150?img=1' }}
          />
        )}
        {user.isOnline && <View style={styles.onlineBadge} />}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(conversation.lastMessageTimestamp)}</Text>
        </View>
        <Text style={[styles.lastMessage, isUnread && styles.unreadMessage]} numberOfLines={1}>
          {conversation.lastMessageText || t('chat:startNewConversation')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    margin: 1,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundSecondary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success, // Adjust to your green color
    borderWidth: 2,
    borderColor: colors.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: FontSizes.body,
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  lastMessage: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});

export default ChatListItem;