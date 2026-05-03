// File overview:
// - Purpose: Conversation detail screen showing messages, input box, and media attachments.
// - Reached from: 'ChatListScreen' and notifications deep links; route name 'ChatDetailScreen'.
// - Expects route params: `{ conversationId: string, userName: string, userAvatar: string, otherUserId: string }`.
// - Provides: Loads messages, subscribes to updates, marks as read, sends text/files, optional fake auto-replies for demo.
// - Reads from context: `useUser()` -> selectedUser.
// - External deps/services: `chatService` (get/subscribe/send/mark), `fileService` (pick/validate), i18n.
// - Composer: stable subcomponents at module scope so TextInput is not remounted every parent render (fixes keyboard/focus).
// screens/ChatDetailScreen.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  StatusBar,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../utils/loggerService';

const ChatDetailScreen_LOG = 'ChatDetailScreen';
import { useNavigation, useRoute, RouteProp, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLogScreenOpened } from '../hooks/useLogScreenOpened';
import { useSafeBottomTabBarHeight } from '../hooks/useSafeBottomTabBarHeight';
import ChatMessageBubble from '../components/ChatMessageBubble';
import { RootStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { getMessages, sendMessage, markMessagesAsRead, Message, subscribeToMessages } from '../utils/chatService';
import { pickImage, pickVideo, takePhoto, pickDocument, validateFile, FileData } from '../utils/fileService';
import { uploadFileWithProgress, buildChatFilePath } from '../utils/storageService';
import { generateId } from '../utils/chat/id';
import { apiService } from '../utils/apiService';
import { USE_BACKEND } from '../utils/config.constants';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BREAKPOINTS } from '../globals/responsive';

type ChatDetailRouteParams = {
  conversationId: string;
  userName: string;
  userAvatar: string;
  otherUserId: string;
};

type ChatComposerProps = Readonly<{
  inputText: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSend: () => void;
  onToggleMedia: () => void;
  isSending: boolean;
}>;

/** Module-scope composer so TextInput identity is stable across ChatDetailScreen re-renders (critical for keyboard/focus). */
function ChatComposer({
  inputText,
  onChangeText,
  placeholder,
  onSend,
  onToggleMedia,
  isSending,
}: ChatComposerProps) {
  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity onPress={onToggleMedia} accessibilityRole="button" accessibilityLabel="הוספת מדיה">
        <Icon name="add-circle-outline" size={24} color={colors.primary} style={styles.icon} />
      </TouchableOpacity>
      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline
        submitBehavior="newline"
        editable={!isSending}
        keyboardType="default"
        textAlignVertical="top"
      />
      <TouchableOpacity
        onPress={onSend}
        style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        disabled={isSending}
        accessibilityRole="button"
        accessibilityLabel="שליחה"
      >
        {isSending ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text style={styles.sendButtonText}>שלח</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

type ChatMediaRowProps = Readonly<{
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickDocument: () => void;
}>;

function ChatMediaRow({ onTakePhoto, onPickImage, onPickVideo, onPickDocument }: ChatMediaRowProps) {
  return (
    <View style={styles.mediaOptionsRow}>
      <TouchableOpacity style={styles.mediaOption} onPress={onTakePhoto}>
        <Icon name="camera" size={24} color={colors.primary} />
        <Text style={styles.mediaOptionText}>צלם תמונה</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mediaOption} onPress={onPickImage}>
        <Icon name="image" size={24} color={colors.primary} />
        <Text style={styles.mediaOptionText}>בחר תמונה</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mediaOption} onPress={onPickVideo}>
        <Icon name="videocam" size={24} color={colors.primary} />
        <Text style={styles.mediaOptionText}>בחר סרטון</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mediaOption} onPress={onPickDocument}>
        <Icon name="document" size={24} color={colors.primary} />
        <Text style={styles.mediaOptionText}>בחר קובץ</Text>
      </TouchableOpacity>
    </View>
  );
}

function getTabBarFallbackPixels(isWeb: boolean): number {
  if (Platform.OS === 'ios') return 49;
  if (Platform.OS === 'android') return 58;
  if (isWeb) return 72;
  return 56;
}

type ChatMainSectionProps = Readonly<{
  isDesktopWebChat: boolean;
  maxMessagesHeight: number | undefined;
  isLoading: boolean;
  messageList: React.ReactNode;
  renderLoadingIndicator: () => React.ReactNode;
  showMediaOptions: boolean;
  tabBarHeight: number;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickDocument: () => void;
  setInputHeight: (height: number) => void;
  renderDesktopComposer: () => React.ReactNode;
  renderNativeComposerColumn: () => React.ReactNode;
  bottomReserve: number;
  iosKeyboardOffset: number;
}>;

function ChatMainSection({
  isDesktopWebChat,
  maxMessagesHeight,
  isLoading,
  messageList,
  renderLoadingIndicator,
  showMediaOptions,
  tabBarHeight,
  onTakePhoto,
  onPickImage,
  onPickVideo,
  onPickDocument,
  setInputHeight,
  renderDesktopComposer,
  renderNativeComposerColumn,
  bottomReserve,
  iosKeyboardOffset,
}: ChatMainSectionProps) {
  if (isDesktopWebChat) {
    return (
      <>
        <View style={[styles.messagesWrapper, maxMessagesHeight ? { maxHeight: maxMessagesHeight } : undefined]}>
          {isLoading ? renderLoadingIndicator() : messageList}
        </View>
        {showMediaOptions ? (
          <View style={[styles.mediaOptionsContainer, { bottom: tabBarHeight + 70, zIndex: 1000 }]}>
            <ChatMediaRow
              onTakePhoto={onTakePhoto}
              onPickImage={onPickImage}
              onPickVideo={onPickVideo}
              onPickDocument={onPickDocument}
            />
          </View>
        ) : null}
        <View
          style={{
            position: 'fixed' as any,
            left: 0,
            right: 0,
            bottom: tabBarHeight,
            zIndex: 999,
            backgroundColor: 'transparent',
          }}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setInputHeight(height);
          }}
        >
          {renderDesktopComposer()}
        </View>
      </>
    );
  }

  const messagesAndComposer = (
    <>
      <View style={styles.messagesWrapper}>{isLoading ? renderLoadingIndicator() : messageList}</View>
      <View style={styles.nativeComposerColumn}>{renderNativeComposerColumn()}</View>
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={styles.chatBodyColumn}
        behavior="padding"
        keyboardVerticalOffset={iosKeyboardOffset}
      >
        <View style={[styles.chatBodyInner, { paddingBottom: bottomReserve }]}>{messagesAndComposer}</View>
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.chatBodyColumn, { paddingBottom: bottomReserve }]}>{messagesAndComposer}</View>;
}

export default function ChatDetailScreen() {
  useLogScreenOpened('ChatDetailScreen');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<Record<string, ChatDetailRouteParams>, string>>();
  const routeParams = route.params || {};
  const { conversationId: initialConversationId, userName: initialUserName, userAvatar: initialUserAvatar, otherUserId } = routeParams;
  const { selectedUser } = useUser();
  const { t } = useTranslation(['chat']);
  const tabBarHeight = useSafeBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const stackHeaderHeight = useHeaderHeight();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobileWebChat =
    isWeb &&
    windowWidth <= BREAKPOINTS.LARGE_PHONE &&
    windowWidth / Math.max(windowHeight, 1) < 1.5;
  const isDesktopWebChat = isWeb && !isMobileWebChat;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const screenHeight = isDesktopWebChat ? windowHeight : undefined;
  const maxMessagesHeight =
    isDesktopWebChat && screenHeight && headerHeight > 0 && inputHeight > 0
      ? screenHeight - tabBarHeight - inputHeight - headerHeight
      : undefined;

  const bottomReserve = useMemo(() => {
    if (isDesktopWebChat) return 0;
    const measured = Math.max(tabBarHeight, 0);
    const barFallback = getTabBarFallbackPixels(isWeb);
    return Math.max(measured, barFallback + insets.bottom);
  }, [tabBarHeight, insets.bottom, isDesktopWebChat, isWeb]);

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
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (messages.length === prevMessageCountRef.current) return;
    prevMessageCountRef.current = messages.length;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: messages.length > 1 });
    });
  }, [messages.length]);

  const loadUserProfile = useCallback(async () => {
    if (!USE_BACKEND || !otherUserId || isLoadingProfile) return;

    setIsLoadingProfile(true);
    try {
      const response = await apiService.getUserById(otherUserId);
      if (response.success && response.data) {
        const userData = response.data;
        const newName = userData.name || initialUserName || t('chat:unknownUser');
        const newAvatar = userData.avatar_url || userData.avatar || initialUserAvatar || '';

        setUserName(newName);
        setUserAvatar(newAvatar);
      } else {
        console.warn('User not found:', otherUserId);
        if (initialUserName && initialUserName !== t('chat:unknownUser')) {
          setUserName(initialUserName);
          setUserAvatar(initialUserAvatar);
        }
      }
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      if (initialUserName && initialUserName !== t('chat:unknownUser')) {
        setUserName(initialUserName);
        setUserAvatar(initialUserAvatar);
      }
    } finally {
      setIsLoadingProfile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guard is synchronous; listing isLoadingProfile retriggers fetch
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

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params;
      if (params) {
        if (params.userName) {
          setUserName(prev => (params.userName === prev ? prev : params.userName));
        }
        if (params.userAvatar) {
          setUserAvatar(prev => (params.userAvatar === prev ? prev : params.userAvatar));
        }
        if (params.conversationId) {
          setConversationId(prev => (params.conversationId === prev ? prev : params.conversationId));
        }
      }
    }, [route.params])
  );

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile, initialUserName, t]);

  useEffect(() => {
    loadMessages();

    let unsubscribe: (() => void) | undefined;

    if (selectedUser) {
      unsubscribe = subscribeToMessages(conversationId, selectedUser.id, (newMessages) => {
        setMessages(newMessages);

        markMessagesAsRead(conversationId, selectedUser.id).catch(console.error);
      }, getMessages);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, selectedUser, loadMessages]);

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || !selectedUser || isSending) return;

    const messageText = inputText.trim();
    const tempMessageId = `temp_${Date.now()}`;

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
      const currentConversationId = conversationId;
      const messageId = await sendMessage({
        conversationId: currentConversationId,
        senderId: selectedUser.id,
        text: messageText,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text',
        status: 'sent',
      }, [selectedUser.id, otherUserId]);

      await loadMessages();

      const actualMessageId = typeof messageId === 'string' ? messageId : messageId.messageId;

      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId
          ? { ...msg, id: actualMessageId, status: 'sent' as const }
          : msg
      ));

    } catch (error) {
      console.error('❌ Send message error:', error);

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

      const validation = validateFile(fileData);
      if (!validation.isValid) {
        setShowUploadModal(false);
        setUploadingFile(null);
        setIsSending(false);
        Alert.alert('שגיאה', validation.error || 'הקובץ אינו תקין');
        return;
      }

      const tempMessageId = generateId('temp');

      const fullPath = buildChatFilePath(conversationId, tempMessageId, fileData.name);

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

      const updatedFileData: FileData = {
        ...fileData,
        uri: uploadedUrl,
      };

      setShowUploadModal(false);
      setUploadingFile(null);
      setUploadProgress(0);

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

      logger.debug(ChatDetailScreen_LOG, '✅ File message sent');

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

  const listPaddingBottom = isDesktopWebChat ? tabBarHeight + 70 + 40 : 8;

  const messageList = (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={[
        styles.messagesContainer,
        { paddingBottom: listPaddingBottom },
      ]}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      style={styles.messagesList}
      scrollEnabled
      nestedScrollEnabled={isDesktopWebChat}
      scrollEventThrottle={32}
    />
  );

  const composerBlock = (
    <>
      {showMediaOptions ? (
        <ChatMediaRow
          onTakePhoto={handleTakePhoto}
          onPickImage={handlePickImage}
          onPickVideo={handlePickVideo}
          onPickDocument={handlePickDocument}
        />
      ) : null}
      <ChatComposer
        inputText={inputText}
        onChangeText={setInputText}
        placeholder={t('chat:placeholder')}
        onSend={handleSendMessage}
        onToggleMedia={() => setShowMediaOptions(v => !v)}
        isSending={isSending}
      />
    </>
  );

  const iosKeyboardOffset = Math.max(0, stackHeaderHeight);

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && { position: 'relative' }]} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      <View
        style={styles.header}
        onLayout={(event) => {
          if (isDesktopWebChat) {
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

      <ChatMainSection
        isDesktopWebChat={isDesktopWebChat}
        maxMessagesHeight={maxMessagesHeight}
        isLoading={isLoading}
        messageList={messageList}
        renderLoadingIndicator={renderLoadingIndicator}
        showMediaOptions={showMediaOptions}
        tabBarHeight={tabBarHeight}
        onTakePhoto={handleTakePhoto}
        onPickImage={handlePickImage}
        onPickVideo={handlePickVideo}
        onPickDocument={handlePickDocument}
        setInputHeight={setInputHeight}
        renderDesktopComposer={() => (
          <ChatComposer
            inputText={inputText}
            onChangeText={setInputText}
            placeholder={t('chat:placeholder')}
            onSend={handleSendMessage}
            onToggleMedia={() => setShowMediaOptions(v => !v)}
            isSending={isSending}
          />
        )}
        renderNativeComposerColumn={() => composerBlock}
        bottomReserve={bottomReserve}
        iosKeyboardOffset={iosKeyboardOffset}
      />

      <Modal visible={showUploadModal} transparent animationType="fade">
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
    position: 'relative',
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
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesWrapper: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  messagesList: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  messagesContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  inputContainerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 99,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'android' ? 12 : 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nativeComposerColumn: {
    backgroundColor: colors.background,
    flexShrink: 0,
  },
  chatBodyColumn: {
    flex: 1,
    minHeight: 0,
  },
  chatBodyInner: {
    flex: 1,
    minHeight: 0,
  },
  mediaOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  icon: {
    paddingHorizontal: 5,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginHorizontal: 8,
    fontSize: FontSizes.body,
    maxHeight: 120,
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
    zIndex: 100,
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
