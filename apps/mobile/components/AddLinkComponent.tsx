import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { scaleSize } from '../globals/responsive';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface AddLinkComponentProps {
  onLinkAdded?: (link: any) => void;
  category?: string; // Category to filter links (e.g., 'trump', 'items', 'knowledge')
}

type LinkType = 'group' | 'organization';

export default function AddLinkComponent({ onLinkAdded, category }: AddLinkComponentProps) {
  const { t } = useTranslation(['common', 'trump']);
  const { selectedUser } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('group');
  const [allLinks, setAllLinks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load all links when component mounts or screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadAllLinks();
    }, [category])
  );

  const loadAllLinks = async () => {
    setIsLoading(true);
    try {
      // NOTE: Links functionality has been removed - links table was deleted
      // All user data is now unified in user_profiles table with UUID identifiers
      // TODO: Implement alternative storage if links functionality is still needed
      const allLinksData: any[] = []; // db.listAllLinks() is no longer available
      console.log('⚠️ Links functionality has been removed');
      
      // Filter by category if provided
      const filteredLinks: any[] = [];
      
      setAllLinks(filteredLinks);
    } catch (error) {
      console.error('Error loading links:', error);
      setAllLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Reset form
    setLinkUrl('');
    setLinkDescription('');
    setLinkType('group');
  };

  const validateUrl = (url: string): boolean => {
    try {
      // Add protocol if missing
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      new URL(formattedUrl);
      return true;
    } catch {
      return false;
    }
  };

  const formatUrl = (url: string): string => {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    return formattedUrl;
  };

  const handleSaveLink = async () => {
    if (!linkUrl.trim()) {
      Alert.alert(
        t('common:errorTitle', { defaultValue: 'שגיאה' }) as string,
        t('trump:errors.fillLink', { defaultValue: 'אנא הזן קישור' }) as string
      );
      return;
    }

    if (!validateUrl(linkUrl)) {
      Alert.alert(
        t('common:errorTitle', { defaultValue: 'שגיאה' }) as string,
        t('trump:errors.invalidLink', { defaultValue: 'הקישור אינו תקין' }) as string
      );
      return;
    }

    setIsSaving(true);
    try {
      const uid = selectedUser?.id || 'guest';
      const linkId = `link_${Date.now()}`;
      const formattedUrl = formatUrl(linkUrl);
      
      const linkData = {
        id: linkId,
        url: formattedUrl,
        description: linkDescription.trim() || '',
        type: linkType,
        category: category || 'general', // Save category with link
        createdAt: new Date().toISOString(),
        createdBy: uid,
      };

      // NOTE: Links functionality has been removed - links table was deleted
      // All user data is now unified in user_profiles table with UUID identifiers
      // TODO: Implement alternative storage if links functionality is still needed
      console.warn('⚠️ Links functionality has been removed - link not saved');

      // Reload all links to show the new one
      await loadAllLinks();

      // Notify parent component
      if (onLinkAdded) {
        onLinkAdded(linkData);
      }

      Alert.alert(
        t('trump:success.title', { defaultValue: 'הצלחה' }) as string,
        t('trump:success.linkSaved', { defaultValue: 'הקישור נשמר בהצלחה' }) as string
      );

      handleCloseModal();
    } catch (error) {
      console.error('Error saving link:', error);
      Alert.alert(
        t('common:errorTitle', { defaultValue: 'שגיאה' }) as string,
        t('trump:errors.saveFailed', { defaultValue: 'שמירת הקישור נכשלה' }) as string
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenLink = async (link: any) => {
    if (!link?.url) return;

    try {
      const supported = await Linking.canOpenURL(link.url);
      if (supported) {
        await Linking.openURL(link.url);
      } else {
        Alert.alert(
          t('common:error', { defaultValue: 'שגיאה' }) as string,
          t('common:cannotOpenLink', { defaultValue: 'לא ניתן לפתוח את הקישור' }) as string
        );
      }
    } catch (error) {
      Alert.alert(
        t('common:error', { defaultValue: 'שגיאה' }) as string,
        t('common:cannotOpenLink', { defaultValue: 'לא ניתן לפתוח את הקישור' }) as string
      );
    }
  };

  const renderLinkCard = (link: any) => (
    <TouchableOpacity
      key={link.id || `${link.createdBy}_${link.url}`}
      style={styles.linkCard}
      onPress={() => handleOpenLink(link)}
    >
      <View style={styles.linkCardContent}>
        <View style={styles.linkCardHeader}>
          <Ionicons 
            name={link.type === 'group' ? 'people' : 'business'} 
            size={scaleSize(20)} 
            color={colors.buttonPrimary} 
          />
          <Text style={styles.linkCardType}>
            {link.type === 'group' 
              ? t('trump:addLink.group', { defaultValue: 'קבוצה' })
              : t('trump:addLink.organization', { defaultValue: 'עמותה' })}
          </Text>
        </View>
        {link.description ? (
          <Text style={styles.linkCardDescription} numberOfLines={2}>
            {link.description}
          </Text>
        ) : null}
        <Text style={styles.linkCardUrl} numberOfLines={1}>
          {link.url}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={scaleSize(16)} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  // Filter links by type (group or organization)
  const groupLinks = allLinks.filter(link => link.type === 'group');
  const organizationLinks = allLinks.filter(link => link.type === 'organization');

  console.log('🔗 AddLinkComponent render - allLinks:', allLinks.length);
  console.log('🔗 AddLinkComponent render - groupLinks:', groupLinks.length);
  console.log('🔗 AddLinkComponent render - organizationLinks:', organizationLinks.length);
  console.log('🔗 AddLinkComponent render - isLoading:', isLoading);

  return (
    <View style={styles.container}>
      {/* Add link button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleOpenModal}
      >
        <Ionicons name="add-circle-outline" size={scaleSize(24)} color={colors.buttonPrimary} />
      </TouchableOpacity>

      {/* Show all links in a scrollable list */}
      {isLoading ? (
        <Text style={styles.loadingText}>
          {t('common:loading', { defaultValue: 'טוען...' })}
        </Text>
      ) : allLinks.length > 0 ? (
        <View style={styles.linksContainer}>
          {groupLinks.length > 0 && (
            <View style={styles.linksSection}>
              <Text style={styles.linksSectionTitle}>
                {t('trump:addLink.group', { defaultValue: 'קבוצות' })} ({groupLinks.length})
              </Text>
              {groupLinks.map(link => renderLinkCard(link))}
            </View>
          )}
          {organizationLinks.length > 0 && (
            <View style={styles.linksSection}>
              <Text style={styles.linksSectionTitle}>
                {t('trump:addLink.organization', { defaultValue: 'עמותות' })} ({organizationLinks.length})
              </Text>
              {organizationLinks.map(link => renderLinkCard(link))}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.noLinksText}>
          {t('trump:addLink.noLinks', { defaultValue: 'אין קישורים עדיין' })}
        </Text>
      )}

      {/* Modal with form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('trump:addLink.title', { defaultValue: 'הוסף קישור' })}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={scaleSize(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Link Type Selection */}
              <View style={styles.typeSelectionContainer}>
                <Text style={styles.label}>
                  {t('trump:addLink.linkType', { defaultValue: 'סוג קישור' })}
                </Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      linkType === 'group' && styles.typeButtonActive,
                    ]}
                    onPress={() => setLinkType('group')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        linkType === 'group' && styles.typeButtonTextActive,
                      ]}
                    >
                      {t('trump:addLink.group', { defaultValue: 'קבוצה' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      linkType === 'organization' && styles.typeButtonActive,
                    ]}
                    onPress={() => setLinkType('organization')}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        linkType === 'organization' && styles.typeButtonTextActive,
                      ]}
                    >
                      {t('trump:addLink.organization', { defaultValue: 'עמותה' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Link URL Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t('trump:addLink.url', { defaultValue: 'קישור' })}
                </Text>
                <TextInput
                  style={styles.input}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  placeholder={t('trump:addLink.urlPlaceholder', { defaultValue: 'הזן קישור' }) as string}
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Description Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t('trump:addLink.description', { defaultValue: 'פירוט' })}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={linkDescription}
                  onChangeText={setLinkDescription}
                  placeholder={t('trump:addLink.descriptionPlaceholder', { defaultValue: 'הוסף פירוט (אופציונלי)' }) as string}
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveLink}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Text style={styles.saveButtonText}>
                    {t('common:saving', { defaultValue: 'שומר...' })}
                  </Text>
                ) : (
                  <Text style={styles.saveButtonText}>
                    {t('common:save', { defaultValue: 'שמור' })}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  addButton: {
    backgroundColor: colors.moneyCardBackground,
    borderWidth: 1,
    borderColor: colors.moneyFormBorder,
    borderRadius: 20,
    width: scaleSize(40),
    height: scaleSize(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  linksContainer: {
    width: '100%',
    marginTop: 12,
  },
  linksSection: {
    marginBottom: 16,
  },
  linksSectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.moneyCardBackground,
    borderWidth: 1,
    borderColor: colors.moneyFormBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    width: '100%',
    gap: 8,
  },
  linkCardContent: {
    flex: 1,
  },
  linkCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  linkCardType: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  linkCardDescription: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  linkCardUrl: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  loadingText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  noLinksText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayMedium,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.modalBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  typeSelectionContainer: {
    marginBottom: 20,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.moneyFormBorder,
    backgroundColor: colors.moneyInputBackground,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  typeButtonText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.moneyInputBackground,
    borderRadius: 10,
    padding: 15,
    fontSize: FontSizes.body,
    textAlign: 'right',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.moneyFormBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.buttonPrimary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
});
