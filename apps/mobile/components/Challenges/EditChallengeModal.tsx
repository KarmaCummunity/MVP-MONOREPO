// Edit Challenge Modal
// Modal for editing an existing community challenge
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import { useTranslation } from 'react-i18next';
import { CommunityChallenge, ChallengeDifficulty } from '../../globals/types';
import { db } from '../../utils/databaseService';
import { useToast } from '../../utils/toastService';
import { useUser } from '../../stores/userStore';

interface EditChallengeModalProps {
  visible: boolean;
  challenge: CommunityChallenge;
  onClose: () => void;
  onUpdate: () => void;
}

const CHALLENGE_DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'קל', icon: 'happy-outline', color: colors.success },
  { id: 'medium', label: 'בינוני', icon: 'bulb-outline', color: colors.warning },
  { id: 'hard', label: 'קשה', icon: 'flame-outline', color: colors.error },
  { id: 'expert', label: 'מומחה', icon: 'trophy-outline', color: colors.primary },
];

export default function EditChallengeModal({
  visible,
  challenge,
  onClose,
  onUpdate,
}: EditChallengeModalProps) {
  const { t } = useTranslation(['challenges', 'common']);
  const { showToast } = useToast();
  const { selectedUser: user } = useUser();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [goalValue, setGoalValue] = useState('');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('easy');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize form with challenge data
  useEffect(() => {
    if (challenge) {
      setTitle(challenge.title || '');
      setDescription(challenge.description || '');
      setImageUri(challenge.image_url || '');
      setGoalValue(challenge.goal_value?.toString() || '');
      setDifficulty(challenge.difficulty || 'easy');
      setCategory(challenge.category || '');
      setIsActive(challenge.is_active ?? true);
    }
  }, [challenge]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common:error'), t('imagePermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common:error'), t('imagePickError'));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common:error'), t('fields.titleRequired'));
      return;
    }

    if (!user?.id) {
      Alert.alert(t('common:error'), t('messages.loginRequired'));
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        image_url: imageUri || undefined,
        goal_value: goalValue ? parseFloat(goalValue) : undefined,
        difficulty,
        category: category.trim() || undefined,
        is_active: isActive,
      };

      const response = await db.updateCommunityChallenge(challenge.id, user.id, updateData);

      if (response.success) {
        showToast(t('challengeUpdated'), 'success');
        onUpdate();
        onClose();
      } else {
        showToast(t('messages.errorUpdating'), 'error');
      }
    } catch (error: any) {
      console.error('Error updating challenge:', error);
      showToast(error.message || t('messages.errorUpdating'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('editChallenge')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.label}>{t('fields.title')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('fields.titlePlaceholder')}
              value={title}
              onChangeText={setTitle}
              maxLength={255}
            />

            {/* Description */}
            <Text style={styles.label}>{t('fields.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('fields.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />

            {/* Image */}
            <Text style={styles.label}>{t('fields.image')} ({t('common:optional', 'אופציונלי')})</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.challengeImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.imagePlaceholderText}>{t('addImage')}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Difficulty */}
            <Text style={styles.label}>{t('fields.difficulty')}</Text>
            <View style={styles.optionsRow}>
              {CHALLENGE_DIFFICULTY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    difficulty === option.id && styles.optionButtonActive,
                    difficulty === option.id && { backgroundColor: option.color },
                  ]}
                  onPress={() => setDifficulty(option.id as ChallengeDifficulty)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={difficulty === option.id ? colors.white : option.color}
                  />
                  <Text style={[styles.optionText, difficulty === option.id && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Goal Value (if not BOOLEAN) */}
            {challenge.type !== 'BOOLEAN' && (
              <>
                <Text style={styles.label}>
                  {t('fields.goalValue')} ({t('common:optional', 'אופציונלי')})
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    challenge.type === 'DURATION'
                      ? t('fields.goalValueMinutes')
                      : t('fields.goalValuePlaceholder')
                  }
                  value={goalValue}
                  onChangeText={setGoalValue}
                  keyboardType="numeric"
                />
              </>
            )}

            {/* Category */}
            <Text style={styles.label}>
              {t('fields.category')} ({t('common:optional', 'אופציונלי')})
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('fields.categoryPlaceholder')}
              value={category}
              onChangeText={setCategory}
              maxLength={50}
            />

            {/* Active Status */}
            <View style={styles.activeRow}>
              <Text style={styles.label}>{t('activeStatus')}</Text>
              <TouchableOpacity
                style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
                onPress={() => setIsActive(!isActive)}
              >
                <Ionicons
                  name={isActive ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={isActive ? colors.success : colors.error}
                />
                <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                  {isActive ? t('active') : t('inactive')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info about non-editable fields */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{t('editInfo')}</Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common:cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={colors.white} />
                  <Text style={styles.saveButtonText}>{t('common:save')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  formContent: {
    padding: 16,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.white,
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  toggleButtonActive: {
    backgroundColor: colors.successLight,
  },
  toggleText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.success,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.small,
    color: colors.primary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.white,
  },
  imagePickerButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  challengeImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.backgroundSecondary,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
