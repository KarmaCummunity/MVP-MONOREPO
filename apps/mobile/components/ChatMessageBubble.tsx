// components/ChatMessageBubble.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Message } from '../utils/chatService'; // Use new Message type
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors'; // Assuming you have a Colors file
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';
import { formatFileSize } from '../utils/fileService';

interface ChatMessageBubbleProps {
  message: Message;
  isMyMessage: boolean;
  userAvatar: string;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isMyMessage, userAvatar }) => {
  const { t } = useTranslation(['chat','common']);
  const bubbleStyle = isMyMessage ? styles.myBubble : styles.otherBubble;
  const textStyle = isMyMessage ? styles.myText : styles.otherText;
  const containerStyle = isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const renderFileContent = () => {
    if (!message.fileData) return null;

    const { fileData } = message;

    switch (fileData.type) {
      case 'image':
        return (
          <TouchableOpacity 
            style={styles.fileContainer}
            onPress={() => Alert.alert(t('chat:image'), t('chat:openImage'))}
          >
            <Image source={{ uri: fileData.uri }} style={styles.messageImage as any} />
          </TouchableOpacity>
        );
      
      case 'video':
        return (
          <TouchableOpacity 
            style={styles.fileContainer}
            onPress={() => Alert.alert(t('chat:video'), t('chat:playVideo'))}
          >
            <View style={styles.videoContainer}>
              <Image source={{ uri: fileData.thumbnail || fileData.uri }} style={styles.videoThumbnail as any} />
              <View style={styles.playButton}>
                <Icon name="play" size={24} color={colors.white} />
              </View>
              {fileData.size && (
                <Text style={styles.fileSize}>{formatFileSize(fileData.size)}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      
      case 'file':
        return (
          <TouchableOpacity 
            style={styles.fileContainer}
            onPress={() => Alert.alert(t('chat:file'), t('chat:openFile', { name: fileData.name }))}
          >
            <View style={styles.documentContainer}>
              <Icon name="document-outline" size={40} color={colors.primary} />
              <View style={styles.documentInfo}>
                <Text style={[styles.documentName, textStyle]} numberOfLines={2}>
                  {fileData.name}
                </Text>
                {fileData.size && (
                  <Text style={styles.fileSize}>{formatFileSize(fileData.size)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={containerStyle}>
      {!isMyMessage && (
        <Image source={{ uri: userAvatar }} style={styles.avatar as any} />
      )}
      <View style={[styles.bubble, bubbleStyle]}>
        {message.text && <Text style={[styles.messageText, textStyle]}>{message.text}</Text>}
        {renderFileContent()}
        <View style={styles.messageFooter}>
          <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
            {formatTimestamp(message.timestamp)}
          </Text>
          {isMyMessage && (
            <View style={styles.statusContainer}>
              {message.status === 'sending' && (
                <Icon name="time-outline" size={12} color={colors.textSecondary} />
              )}
              {message.status === 'sent' && (
                <Icon name="checkmark" size={12} color={colors.textSecondary} />
              )}
              {message.status === 'delivered' && (
                <Icon name="checkmark-done" size={12} color={colors.textSecondary} />
              )}
              {message.status === 'read' && (
                <Icon name="checkmark-done" size={12} color={colors.primary} />
              )}
              {message.status === 'failed' && (
                <Icon name="close-circle" size={12} color={colors.error} />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  myMessageContainer: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
    marginVertical: 4,
  },
  otherMessageContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
    alignSelf: 'flex-end', // Align avatar to bottom of bubble
  },
  bubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    maxWidth: '75%',
    // Shadows
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: colors.chatSent, // Your brand blue/purple
    borderBottomRightRadius: 5, // Pointy end
  },
  otherBubble: {
    backgroundColor: colors.chatReceived, // Light grey for incoming
    borderBottomLeftRadius: 5, // Pointy end
  },
  messageText: {
    fontSize: FontSizes.body,
    lineHeight: 22,
  },
  myText: {
    color: colors.white,
  },
  otherText: {
    color: colors.chatText,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  fileContainer: {
    marginTop: 5,
    marginBottom: 5,
  },
  videoContainer: {
    position: 'relative',
    width: 200,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  } as any,
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: FontSizes.body,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: FontSizes.caption,
    marginRight: 4,
  },
  statusContainer: {
    marginLeft: 4,
  },
  myTimestamp: {
    color: colors.white,
    opacity: 0.8,
  },
  otherTimestamp: {
    color: colors.chatTime,
  },
});

export default ChatMessageBubble;