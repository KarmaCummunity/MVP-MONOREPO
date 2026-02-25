// File overview:
// - Purpose: Conversation detail screen showing messages, input box, and media attachments.
// - Reached from: 'ChatListScreen' and notifications deep links; route name 'ChatDetailScreen'.
// - Expects route params: `{ conversationId: string, userName: string, userAvatar: string, otherUserId: string }`.
// - Provides: Loads messages, subscribes to updates, marks as read, sends text/files, optional fake auto-replies for demo.
// - Reads from context: `useUser()` -> selectedUser.
// - External deps/services: `chatService` (get/subscribe/send/mark), `fileService` (pick/validate), i18n.
// screens/ChatDetailScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import ChatMessageBubble from '../components/ChatMessageBubble';
import { RootStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { getMessages, sendMessage, markMessagesAsRead, Message, subscribeToMessages } from '../utils/chatService';
import { pickImage, pickVideo, takePhoto, pickDocument, validateFile, FileData } from '../utils/fileService';
import { uploadFileWithProgress, buildChatFilePath } from '../utils/storageService';
import { apiService } from '../utils/apiService';
import { USE_BACKEND } from '../utils/config.constants';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type ChatDetailRouteParams = {
  conversationId: string;
  userName: string;
  userAvatar: string;
  otherUserId: string;
};

export default function ChatDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<Record<string, ChatDetailRouteParams>, string>>();
  const routeParams = route.params || {};
  const { conversationId: initialConversationId, userName: initialUserName, userAvatar: initialUserAvatar, otherUserId } = routeParams;
  const { selectedUser } = useUser();
  const { t } = useTranslation(['chat']);
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxMessagesHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0 && inputHeight > 0
    ? screenHeight - tabBarHeight - inputHeight - headerHeight
    : undefined;

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [userName, setUserName] = useState(initialUserName);
  const [userAvatar, setUserAvatar] = useState(initialUserAvatar);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<FileData | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load user profile for the other user
  const loadUserProfile = useCallback(async () => {
    if (!USE_BACKEND || !otherUserId || isLoadingProfile) return;

    setIsLoadingProfile(true);
    try {
      const response = await apiService.getUserById(otherUserId);
      if (response.success && response.data) {
        const userData = response.data;
        // Only update if we got valid data and the initial name was "unknown user"
        const newName = userData.name || initialUserName || t('chat:unknownUser');
        const newAvatar = userData.avatar_url || userData.avatar || initialUserAvatar || '';

        // Always update, but prioritize loaded data
        setUserName(newName);
        setUserAvatar(newAvatar);
      } else {
        // If user not found, keep initial values but log warning
        console.warn('User not found:', otherUserId);
        if (initialUserName && initialUserName !== t('chat:unknownUser')) {
          // Keep the initial name if it's not "unknown user"
          setUserName(initialUserName);
          setUserAvatar(initialUserAvatar);
        }
      }
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      // Keep the initial values if loading fails, but only if they're not "unknown user"
      if (initialUserName && initialUserName !== t('chat:unknownUser')) {
        setUserName(initialUserName);
        setUserAvatar(initialUserAvatar);
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [otherUserId, initialUserName, initialUserAvatar, t]);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      if (selectedUser) {
        const conversationMessages = await getMessages(conversationId, selectedUser.id);
        setMessages(conversationMessages);

        await markMessagesAsRead(conversationId, selectedUser.id);
      }
    } catch (error) {
      console.error('❌ Load messages error:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת ההודעות');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, selectedUser]);

  // Update state when screen comes into focus (e.g., when returning from profile)
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params;
      if (params) {
        // Update userName if provided and different
        if (params.userName) {
          setUserName(prev => params.userName !== prev ? params.userName : prev);
        }
        // Update userAvatar if provided and different
        if (params.userAvatar) {
          setUserAvatar(prev => params.userAvatar !== prev ? params.userAvatar : prev);
        }
        // Update conversationId if provided and different
        if (params.conversationId) {
          setConversationId(prev => params.conversationId !== prev ? params.conversationId : prev);
        }
      }
    }, [route.params])
  );

  // Load user profile on mount - prioritize loading if initial name is "unknown user"
  useEffect(() => {
    // If initial name is "unknown user", load immediately
    // Load user profile on mount
    loadUserProfile();
  }, [loadUserProfile, initialUserName, t]);

  // Real-time subscription
  useEffect(() => {
    loadMessages();

    let unsubscribe: (() => void) | undefined;

    // Subscribe to real-time updates
    if (selectedUser) {
      unsubscribe = subscribeToMessages(conversationId, selectedUser.id, (newMessages) => {
        setMessages(newMessages);

        // Mark messages as read when they arrive
        markMessagesAsRead(conversationId, selectedUser.id).catch(console.error);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, selectedUser, loadMessages]);

  const generateFakeResponse = async () => {
    const responses = [
      'תודה על המידע! מתי אפשר לבוא לקחת?',
      'האם אפשר לקבל תמונה של הספה?',
      'מה המידות של הספה?',
      'האם יש אפשרות למשלוח?',
    ];

    const responseText = responses[Math.floor(Math.random() * responses.length)];

    try {
      await sendMessage({
        conversationId,
        senderId: otherUserId,
        text: responseText,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text',
        status: 'sent',
      });
    } catch (error) {
      console.error('❌ Send fake response error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !selectedUser || isSending) return;

    const messageText = inputText.trim();
    const tempMessageId = `temp_${Date.now()}`;

    // Add message to local state immediately with "sending" status
    const tempMessage: Message = {
      id: tempMessageId,
      conversationId,
      senderId: selectedUser.id,
      text: messageText,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'text',
      status: 'sending',
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputText('');
    setIsSending(true);

    try {
      // Send the message with fallback participants in case conversation not found
      // Note: sendMessage may update conversationId if backend creates new conversation
      const currentConversationId = conversationId;
      const messageId = await sendMessage({
        conversationId: currentConversationId,
        senderId: selectedUser.id,
        text: messageText,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text',
        status: 'sent',
      }, [selectedUser.id, otherUserId]); // Provide fallback participants

      // Check if conversation was updated (backend may have created new UUID)
      // We'll reload messages to get the updated conversation
      await loadMessages();

      // Extract the actual message ID (handle both string and object return types)
      const actualMessageId = typeof messageId === 'string' ? messageId : messageId.messageId;

      // Update the temp message with the real message ID and status
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId
          ? { ...msg, id: actualMessageId, status: 'sent' as const }
          : msg
      ));

    } catch (error) {
      console.error('❌ Send message error:', error);

      // Remove the temp message and restore the text
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setInputText(messageText);

      Alert.alert(
        'שגיאה',
        'שגיאה בשליחת ההודעה. אנא נסה שוב.',
        [{ text: 'אישור', style: 'default' }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendFile = async (fileData: FileData) => {
    if (!selectedUser) return;

    try {
      setIsSending(true);
      setUploadProgress(0);
      setUploadingFile(fileData);
      setShowUploadModal(true);

      // Validate file
      const validation = validateFile(fileData);
      if (!validation.isValid) {
        setShowUploadModal(false);
        setUploadingFile(null);
        setIsSending(false);
        Alert.alert('שגיאה', validation.error || 'הקובץ אינו תקין');
        return;
      }

      // Generate temp messageId for file path
      const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build file path in Firebase Storage
      const fullPath = buildChatFilePath(conversationId, tempMessageId, fileData.name);

      // Upload file to Firebase Storage with progress tracking
      let uploadedUrl: string;
      try {
        const uploadResult = await uploadFileWithProgress(
          fullPath,
          fileData.uri,
          fileData.mimeType,
          (progress) => {
            setUploadProgress(progress);
          }
        );
        uploadedUrl = uploadResult.url;
      } catch (uploadError: any) {
        console.error('❌ Upload file error:', uploadError);
        const errorMessage = uploadError?.message || uploadError?.code || 'שגיאה לא ידועה';
        console.error('❌ Upload error details:', {
          error: uploadError,
          fullPath,
          fileName: fileData.name,
          fileSize: fileData.size,
          mimeType: fileData.mimeType,
        });
        setShowUploadModal(false);
        setUploadingFile(null);
        setIsSending(false);
        Alert.alert(
          'שגיאה בהעלאת הקובץ',
          `לא ניתן להעלות את הקובץ. ${errorMessage.includes('CORS') ? 'בעיית CORS - בדוק את הגדרות Firebase Storage.' : errorMessage}`
        );
        return;
      }

      // Update fileData with Firebase Storage URL
      const updatedFileData: FileData = {
        ...fileData,
        uri: uploadedUrl,
      };

      // Hide upload modal
      setShowUploadModal(false);
      setUploadingFile(null);
      setUploadProgress(0);

      // Send message with uploaded file URL
      await sendMessage({
        conversationId,
        senderId: selectedUser.id,
        text: '',
        timestamp: new Date().toISOString(),
        read: false,
        type: fileData.type,
        status: 'sent',
        fileData: updatedFileData,
      }, [selectedUser.id, otherUserId]);

      console.log('✅ File message sent');

      // Reload messages to show the new message
      await loadMessages();

    } catch (error) {
      console.error('❌ Send file error:', error);
      setShowUploadModal(false);
      setUploadingFile(null);
      setUploadProgress(0);
      Alert.alert('שגיאה', 'שגיאה בשליחת הקובץ. אנא נסה שוב.');
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    setShowMediaOptions(false);
    const result = await pickImage();

    if (result.success && result.fileData) {
      await handleSendFile(result.fileData);
    } else if (result.error) {
      Alert.alert('שגיאה', result.error);
    }
  };

  const handleTakePhoto = async () => {
    setShowMediaOptions(false);
    const result = await takePhoto();

    if (result.success && result.fileData) {
      await handleSendFile(result.fileData);
    } else if (result.error) {
      Alert.alert('שגיאה', result.error);
    }
  };

  const handlePickVideo = async () => {
    setShowMediaOptions(false);
    const result = await pickVideo();

    if (result.success && result.fileData) {
      await handleSendFile(result.fileData);
    } else if (result.error) {
      Alert.alert('שגיאה', result.error);
    }
  };

  const handlePickDocument = async () => {
    setShowMediaOptions(false);
    const result = await pickDocument();

    if (result.success && result.fileData) {
      await handleSendFile(result.fileData);
    } else if (result.error) {
      Alert.alert('שגיאה', result.error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessageBubble
      message={item}
      isMyMessage={item.senderId === selectedUser?.id}
      userAvatar={userAvatar}
    />
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.secondary} />
      <Text style={styles.loadingText}>טוען הודעות...</Text>
    </View>
  );

  const InputChildren = () => (
    <>
      <TouchableOpacity onPress={() => setShowMediaOptions(!showMediaOptions)}>
        <Icon name="add-circle-outline" size={24} color={colors.primary} style={styles.icon} />
      </TouchableOpacity>
      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder={t('chat:placeholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="center"
        editable={!isSending}
      />
      <TouchableOpacity
        onPress={handleSendMessage}
        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text style={styles.sendButtonText}>שלח</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      <View
        style={styles.header}
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
          }
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('UserProfileScreen', {
              userId: otherUserId,
              userName: userName,
              userAvatar: userAvatar,
            });
          }}
          style={styles.headerUserInfo}
          activeOpacity={0.7}
        >
          <Image source={{ uri: userAvatar || 'https://i.pravatar.cc/150?img=1' }} style={styles.headerAvatar} />
          <Text style={styles.headerTitle}>{userName}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('UserProfileScreen', {
              userId: otherUserId,
              userName: userName,
              userAvatar: userAvatar,
            });
          }}
          style={styles.headerButton}
        >
          <Icon name="person-circle-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Messages container - limited height on web to leave space for input */}
      <View style={[
        styles.messagesWrapper,
        Platform.OS === 'web' && maxMessagesHeight ? {
          maxHeight: maxMessagesHeight,
        } : undefined
      ]}>
        {isLoading ? (
          renderLoadingIndicator()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.messagesContainer,
              (() => {
                // For web with fixed position input, we need extra padding since fixed elements don't take space in flow
                // Input height is approximately 70px, but we need more padding to ensure scrolling works
                const inputHeight = 70;
                const paddingBottom = Platform.OS === 'web'
                  ? tabBarHeight + inputHeight + 40  // Extra 40px for web to ensure scrolling works
                  : tabBarHeight + (showMediaOptions ? 150 : 70);
                return { paddingBottom };
              })()
            ]}
            onContentSizeChange={(contentWidth, contentHeight) => {
              // Use setTimeout to ensure scroll happens after layout
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            onLayout={(event) => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            showsVerticalScrollIndicator={false}
            style={styles.messagesList}
            scrollEnabled={true}
            nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
            scrollEventThrottle={16}
          />
        )}
      </View>

      {/* Media Options - Absolutely positioned above input */}
      {showMediaOptions && (
        <View style={[
          styles.mediaOptionsContainer,
          { bottom: tabBarHeight + 70, zIndex: 1000 }
        ]}>
          <TouchableOpacity style={styles.mediaOption} onPress={handleTakePhoto}>
            <Icon name="camera" size={24} color={colors.primary} />
            <Text style={styles.mediaOptionText}>צלם תמונה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaOption} onPress={handlePickImage}>
            <Icon name="image" size={24} color={colors.primary} />
            <Text style={styles.mediaOptionText}>בחר תמונה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaOption} onPress={handlePickVideo}>
            <Icon name="videocam" size={24} color={colors.primary} />
            <Text style={styles.mediaOptionText}>בחר סרטון</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaOption} onPress={handlePickDocument}>
            <Icon name="document" size={24} color={colors.primary} />
            <Text style={styles.mediaOptionText}>בחר קובץ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Container - Fixed positioned at bottom for web */}
      {Platform.OS === 'web' ? (
        <View
          style={(() => {
            const inputStyle = {
              position: 'fixed' as any,
              left: 0,
              right: 0,
              bottom: tabBarHeight,
              zIndex: 999,
              backgroundColor: 'transparent'
            };
            return inputStyle;
          })()}
        >
          <View
            style={styles.inputContainer}
            onLayout={(event) => {
              if (Platform.OS === 'web') {
                const { height } = event.nativeEvent.layout;
                setInputHeight(height);
              }
            }}
          >
            <InputChildren />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: tabBarHeight,
            zIndex: 999,
            backgroundColor: 'transparent'
          }}
          pointerEvents="box-none"
        >
          <View style={styles.inputContainer}>
            <InputChildren />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Upload Progress Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.uploadSpinner} />
            <Text style={styles.uploadText}>
              {uploadingFile ? `מעלה ${uploadingFile.name}...` : 'מעלה קובץ...'}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative', // Ensure absolute children are positioned relative to this
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  // Content container for messages
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Messages wrapper - takes all available space
  messagesWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Messages list
  messagesList: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Loading indicator
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: FontSizes.body,
    color: colors.textSecondary,
  },
  // Chat messages container
  messagesContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  // Input container wrapper - ABSOLUTE POSITION
  inputContainerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 99, // Ensure it sits on top of messages
    elevation: 5, // For Android shadow
  },
  // Input container at bottom
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'android' ? 15 : 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  icon: {
    paddingHorizontal: 5,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginHorizontal: 8,
    fontSize: FontSizes.body,
    maxHeight: 80,
    textAlign: 'right',
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  sendButton: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendButtonText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: FontSizes.body,
  },
  androidBottomSpacer: {
    height: 20,
    backgroundColor: colors.background,
  },
  // Media options container - ABSOLUTE POSITION
  mediaOptionsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    zIndex: 100, // Above input container
    elevation: 6,
  },
  mediaOption: {
    alignItems: 'center',
    padding: 8,
  },
  mediaOptionText: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  // Upload progress modal
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadModalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 250,
    maxWidth: '80%',
  },
  uploadSpinner: {
    marginBottom: 16,
  },
  uploadText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});