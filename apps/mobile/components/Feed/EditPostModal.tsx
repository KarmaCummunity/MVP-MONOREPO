import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import { FeedItem } from '../../types/feed';
import { toastService } from '../../utils/toastService';

interface EditPostModalProps {
  visible: boolean;
  item: FeedItem | null;
  onClose: () => void;
  onSave: (postId: string, updates: { title?: string; description?: string; image?: string }) => Promise<void>;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  visible,
  item,
  onClose,
  onSave
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setImage(item.thumbnail || null);
    }
  }, [item]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('common.error') || 'Error',
          t('edit_post.image_permission_required') || 'נדרשת הרשאה לגישה לגלריה'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toastService.showError(t('edit_post.image_error') || 'שגיאה בטעינת התמונה');
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      t('edit_post.remove_image_title') || 'הסר תמונה',
      t('edit_post.remove_image_message') || 'האם אתה בטוח שברצונך להסיר את התמונה?',
      [
        { text: t('common.cancel') || 'ביטול', style: 'cancel' },
        { 
          text: t('common.delete') || 'מחק',
          style: 'destructive',
          onPress: () => setImage(null)
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!item) return;

    if (!title.trim()) {
      toastService.showError(t('edit_post.title_required') || 'כותרת היא שדה חובה');
      return;
    }

    setLoading(true);
    try {
      const updates: { title?: string; description?: string; image?: string } = {};
      
      if (title !== item.title) {
        updates.title = title;
      }
      
      if (description !== item.description) {
        updates.description = description;
      }
      
      if (image !== item.thumbnail) {
        updates.image = image || '';
      }

      await onSave(item.id, updates);
      toastService.showSuccess(t('edit_post.save_success') || 'הפוסט עודכן בהצלחה');
      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
      toastService.showError(t('edit_post.save_error') || 'שגיאה בשמירת הפוסט');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    const hasChanges = 
      title !== (item?.title || '') ||
      description !== (item?.description || '') ||
      image !== (item?.thumbnail || null);

    if (hasChanges) {
      Alert.alert(
        t('edit_post.unsaved_changes_title') || 'שינויים לא נשמרו',
        t('edit_post.unsaved_changes_message') || 'האם אתה בטוח שברצונך לסגור בלי לשמור?',
        [
          { text: t('common.cancel') || 'ביטול', style: 'cancel' },
          { 
            text: t('edit_post.discard') || 'התעלם',
            style: 'destructive',
            onPress: onClose
          }
        ]
      );
    } else {
      onClose();
    }
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('edit_post.title') || 'עריכת פוסט'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.headerButton, styles.saveButton]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveButtonText}>{t('common.done') || 'שמור'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('edit_post.post_title') || 'כותרת'} *
            </Text>
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('edit_post.title_placeholder') || 'הכנס כותרת לפוסט'}
              placeholderTextColor={colors.textTertiary}
              maxLength={100}
              editable={!loading}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('edit_post.description') || 'תיאור'}
            </Text>
            <TextInput
              style={[styles.textArea, { textAlign: isRTL ? 'right' : 'left' }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('edit_post.description_placeholder') || 'הוסף תיאור מפורט'}
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              maxLength={500}
              editable={!loading}
            />
          </View>

          {/* Image Section */}
          <View style={styles.imageSection}>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('edit_post.image') || 'תמונה'}
            </Text>
            
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  disabled={loading}
                >
                  <Ionicons name="close-circle" size={32} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handlePickImage}
                disabled={loading}
              >
                <Ionicons name="image-outline" size={48} color={colors.primary} />
                <Text style={styles.addImageText}>
                  {t('edit_post.add_image') || 'הוסף תמונה'}
                </Text>
              </TouchableOpacity>
            )}

            {image && (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handlePickImage}
                disabled={loading}
              >
                <Ionicons name="sync-outline" size={20} color={colors.primary} />
                <Text style={styles.changeImageText}>
                  {t('edit_post.change_image') || 'שנה תמונה'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  saveButton: {
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: FontSizes.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundTertiary,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  addImageButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addImageText: {
    fontSize: FontSizes.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    gap: 8,
  },
  changeImageText: {
    fontSize: FontSizes.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default EditPostModal;
