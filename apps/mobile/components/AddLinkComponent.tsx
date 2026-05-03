import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { scaleSize } from '../globals/responsive';
import { useUser } from '../stores/userStore';
import { apiService } from '../utils/apiService';
import { mapKnowledgeCommunityLinkApiError } from './knowledgeDonationApiMessages';
import { toastService } from '../utils/toastService';
import { useFocusEffect } from '@react-navigation/native';
import { isSafeExternalUrl, preferHttpsUrl } from '../utils/urlValidator';

interface AddLinkComponentProps {
  onLinkAdded?: (link: any) => void;
  category?: string; // Category to filter links (e.g., 'trump', 'items', 'knowledge')
  hideLinksList?: boolean;
}

type LinkType = 'group' | 'organization';

function mapKnowledgeCommunityApiRows(rows: any[]): any[] {
  return rows.map((row: any) => ({
    id: row.id,
    url: row.url,
    description: row.description || '',
    type: row.linkType === 'organization' ? 'organization' : 'group',
    createdBy: row.createdByUserId,
  }));
}

export default function AddLinkComponent({
  onLinkAdded,
  category,
  hideLinksList = false,
}: Readonly<AddLinkComponentProps>) {
  const { t } = useTranslation(['common', 'trump']);
  const { selectedUser, isAdmin } = useUser();
  const isKnowledge = category === 'knowledge';
  const [modalVisible, setModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('group');
  const [allLinks, setAllLinks] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadAllLinks = React.useCallback(async () => {
    if (isKnowledge && hideLinksList) {
      setAllLinks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!isKnowledge) {
        setAllLinks([]);
        return;
      }

      const res = await apiService.getKnowledgeCommunityLinks();
      if (res.success && Array.isArray(res.data)) {
        setAllLinks(mapKnowledgeCommunityApiRows(res.data));
        return;
      }

      setAllLinks([]);
      if (res.success === false && res.error) {
        toastService.showError(mapKnowledgeCommunityLinkApiError(res.error), 3500);
      }
    } catch (error) {
      console.error('Error loading links:', error);
      setAllLinks([]);
      if (!isKnowledge) {
        return;
      }
      toastService.showError(
        mapKnowledgeCommunityLinkApiError(
          error instanceof Error ? error.message : 'Network error - please check your connection',
        ),
        3500,
      );
    } finally {
      setIsLoading(false);
    }
  }, [hideLinksList, isKnowledge]);

  // Load all links when component mounts or screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadAllLinks();
    }, [loadAllLinks])
  );

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

  const showLinkValidationMessage = (msg: string) => {
    const title = t('common:errorTitle', { defaultValue: 'שגיאה' }) as string;
    if (isKnowledge) {
      toastService.showError(msg);
      return;
    }
    Alert.alert(title, msg);
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
    return preferHttpsUrl(formattedUrl);
  };

  type SavedLinkPayload = {
    id?: string;
    url: string;
    description: string;
    type: LinkType;
    category: string;
    createdAt?: string;
    createdBy?: string;
  };

  const buildLocalLinkData = (formattedUrl: string): SavedLinkPayload => {
    const uid = selectedUser?.id || 'guest';
    const linkId = `link_${Date.now()}`;
    return {
      id: linkId,
      url: formattedUrl,
      description: linkDescription.trim() || '',
      type: linkType,
      category: category || 'general',
      createdAt: new Date().toISOString(),
      createdBy: uid,
    };
  };

  const createKnowledgeLinkPayload = async (
    formattedUrl: string,
  ): Promise<SavedLinkPayload | null> => {
    const res = await apiService.createKnowledgeCommunityLink({
      url: formattedUrl,
      description: linkDescription.trim() || undefined,
      linkType: linkType,
      createdByUserId: selectedUser?.id ?? null,
      displayName:
        (selectedUser?.name || selectedUser?.email || '').trim() || null,
    });
    if (!res.success) {
      toastService.showError(mapKnowledgeCommunityLinkApiError(res.error), 3500);
      return null;
    }
    const saved = res.data as Record<string, unknown> | undefined;
    return {
      id: saved?.id as string | undefined,
      url: (saved?.url as string) ?? formattedUrl,
      description:
        (saved?.description as string) ?? linkDescription.trim(),
      type: linkType,
      category: 'knowledge',
      createdAt: saved?.createdAt as string | undefined,
      createdBy: selectedUser?.id,
    };
  };

  const notifyLinkSavedSuccess = () => {
    const savedMsg = t('trump:success.linkSaved', {
      defaultValue: 'הקישור נשמר בהצלחה',
    }) as string;
    if (isKnowledge) {
      toastService.showSuccess(savedMsg, 3200);
      return;
    }
    Alert.alert(
      t('trump:success.title', { defaultValue: 'הצלחה' }) as string,
      savedMsg,
    );
  };

  const notifySaveLinkFailure = (error: unknown) => {
    console.error('Error saving link:', error);
    const fail = t('trump:errors.saveFailed', {
      defaultValue: 'שמירת הקישור נכשלה',
    }) as string;
    const title = t('common:errorTitle', { defaultValue: 'שגיאה' }) as string;
    if (isKnowledge) {
      const raw =
        error instanceof Error && error.message
          ? error.message
          : 'Network error - please check your connection';
      toastService.showError(mapKnowledgeCommunityLinkApiError(raw) || fail, 3500);
      return;
    }
    Alert.alert(title, fail);
  };

  const handleSaveLink = async () => {
    if (!linkUrl.trim()) {
      showLinkValidationMessage(
        t('trump:errors.fillLink', { defaultValue: 'אנא הזן קישור' }) as string,
      );
      return;
    }

    if (!validateUrl(linkUrl)) {
      showLinkValidationMessage(
        t('trump:errors.invalidLink', { defaultValue: 'הקישור אינו תקין' }) as string,
      );
      return;
    }

    setIsSaving(true);
    try {
      const formattedUrl = formatUrl(linkUrl);
      let linkData: SavedLinkPayload | null;
      if (isKnowledge) {
        linkData = await createKnowledgeLinkPayload(formattedUrl);
      } else {
        linkData = buildLocalLinkData(formattedUrl);
      }
      if (!linkData) {
        return;
      }

      if (!hideLinksList || !isKnowledge) {
        await loadAllLinks();
      }

      onLinkAdded?.(linkData);
      notifyLinkSavedSuccess();
      handleCloseModal();
    } catch (error) {
      notifySaveLinkFailure(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenLink = async (link: any) => {
    if (!link?.url) return;
    if (!isSafeExternalUrl(link.url)) {
      Alert.alert(
        t('common:error', { defaultValue: 'שגיאה' }) as string,
        t('common:cannotOpenLink', { defaultValue: 'לא ניתן לפתוח את הקישור' }) as string,
      );
      return;
    }

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
      console.error('Error opening link:', error);
      Alert.alert(
        t('common:error', { defaultValue: 'שגיאה' }) as string,
        t('common:cannotOpenLink', { defaultValue: 'לא ניתן לפתוח את הקישור' }) as string,
      );
    }
  };

  const confirmDeleteKnowledgeLink = (link: { id?: string }) => {
    if (!link.id || !isAdmin) return;
    Alert.alert(
      t('common:confirm', { defaultValue: 'אישור' }) as string,
      t('trump:addLink.confirmDelete', { defaultValue: 'למחוק את הקישור?' }) as string,
      [
        { text: t('common:cancel', { defaultValue: 'ביטול' }) as string, style: 'cancel' },
        {
          text: t('common:delete', { defaultValue: 'מחק' }) as string,
          style: 'destructive',
          onPress: async () => {
            const res = await apiService.deleteKnowledgeCommunityLink(link.id!);
            if (res.success) {
              toastService.showSuccess('הקישור נמחק', 2000);
              await loadAllLinks();
            } else {
              toastService.showError((res.error as string) || 'מחיקה נכשלה', 3000);
            }
          },
        },
      ],
    );
  };

  const renderLinkCard = (link: any) => (
    <View
      key={link.id || `${link.createdBy}_${link.url}`}
      style={styles.linkCard}
    >
      <TouchableOpacity
        style={styles.linkCardMain}
        onPress={() => handleOpenLink(link)}
        activeOpacity={0.75}
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
      {isKnowledge && isAdmin && link.id ? (
        <TouchableOpacity
          style={styles.linkDeleteBtn}
          onPress={() => confirmDeleteKnowledgeLink(link)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={scaleSize(22)} color={colors.destructiveAction} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  // Filter links by type (group or organization)
  const groupLinks = allLinks.filter(link => link.type === 'group');
  const organizationLinks = allLinks.filter(link => link.type === 'organization');

  const showLocalList = !hideLinksList || !isKnowledge;

  let linksListSection: React.ReactNode = null;
  if (showLocalList) {
    if (isLoading) {
      linksListSection = (
        <Text style={styles.loadingText}>
          {t('common:loading', { defaultValue: 'טוען...' })}
        </Text>
      );
    } else if (allLinks.length > 0) {
      linksListSection = (
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
      );
    } else {
      linksListSection = (
        <Text style={styles.noLinksText}>
          {t('trump:addLink.noLinks', { defaultValue: 'אין קישורים עדיין' })}
        </Text>
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Add link button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleOpenModal}
      >
        <Ionicons name="add-circle-outline" size={scaleSize(24)} color={colors.buttonPrimary} />
      </TouchableOpacity>

      {linksListSection}

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
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 4,
    marginBottom: 8,
    width: '100%',
    gap: 4,
  },
  linkCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkDeleteBtn: {
    padding: 8,
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
    backgroundColor: colors.overlayBlack50,
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
