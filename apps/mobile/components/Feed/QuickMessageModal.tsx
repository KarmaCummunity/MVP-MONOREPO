import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import { useUser } from '../../stores/userStore';
import { createConversation, conversationExists, sendMessage } from '../../utils/chatService';
import { toastService } from '../../utils/toastService';

interface QuickMessageModalProps {
  visible: boolean;
  onClose: () => void;
  postType: 'item' | 'ride' | 'task' | 'donation';
  recipientId: string;
  recipientName: string;
}

const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
  visible,
  onClose,
  postType,
  recipientId,
  recipientName,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const { selectedUser } = useUser();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Get default message based on post type
  const getDefaultMessage = (): string => {
    switch (postType) {
      case 'item':
      case 'donation':
        return t('quickMessage:item', { defaultValue: 'האם פריט זה עוד רלוונטי?' });
      case 'ride':
        return t('quickMessage:ride', { defaultValue: 'האם טרמפ זה עוד רלוונטי?' });
      case 'task':
        return t('quickMessage:task', { defaultValue: 'האם משימה זו עוד רלוונטית?' });
      default:
        return t('quickMessage:default', { defaultValue: 'האם זה עוד רלוונטי?' });
    }
  };

  // Initialize message text when modal opens
  useEffect(() => {
    if (visible) {
      setMessageText(getDefaultMessage());
    } else {
      setMessageText('');
    }
  }, [visible, postType]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedUser || isSending) return;

    // Don't allow sending message to self
    if (selectedUser.id === recipientId) {
      toastService.showError(t('quickMessage:cannotMessageSelf', { defaultValue: 'לא ניתן לשלוח הודעה לעצמך' }));
      return;
    }

    setIsSending(true);

    try {
      // 1. Check if conversation exists
      let conversationId = await conversationExists(selectedUser.id, recipientId);

      // 2. If not, create new conversation
      if (!conversationId) {
        conversationId = await createConversation([selectedUser.id, recipientId]);
      }

      // 3. Send message
      await sendMessage({
        conversationId,
        senderId: selectedUser.id,
        text: messageText.trim(),
        type: 'text',
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sent',
      }, [selectedUser.id, recipientId]);

      toastService.showSuccess(t('quickMessage:success', { defaultValue: 'ההודעה נשלחה בהצלחה' }));
      onClose();
    } catch (error) {
      console.error('❌ Quick message send error:', error);
      toastService.showError(t('quickMessage:error', { defaultValue: 'שגיאה בשליחת ההודעה' }));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('quickMessage:title', { defaultValue: 'שלח הודעה מהירה' })}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isSending}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.recipientText}>
              {t('quickMessage:to', { defaultValue: 'ל' })}: {recipientName}
            </Text>

            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('quickMessage:placeholder', { defaultValue: 'הקלד הודעה...' })}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              editable={!isSending}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSending}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                {t('common:cancel', { defaultValue: 'ביטול' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={colors.white} />
                  <Text style={[styles.buttonText, { color: colors.white }]}>
                    {t('quickMessage:send', { defaultValue: 'שלח' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
  },
  title: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 16,
  },
  recipientText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    minHeight: 80,
    backgroundColor: colors.backgroundSecondary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundSecondary,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
  },
  sendButton: {
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
  },
});

export default QuickMessageModal;

