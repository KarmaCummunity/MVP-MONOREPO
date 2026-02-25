import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NavigationProp, ParamListBase, CommonActions } from '@react-navigation/native';

type NavigationPropType = NavigationProp<ParamListBase> | any;
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { biDiTextAlign, rowDirection } from '../globals/responsive';
import { apiService } from '../utils/apiService';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { getCategoryLabel } from '../utils/itemCategoryUtils';
import { sendMessage, createConversation, getConversations } from '../utils/chatService';
import { toastService, useToast } from '../utils/toastService';
import { useTranslation } from 'react-i18next';

export interface ItemDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  item: any | null;
  type: 'item' | 'ride';
  navigation: NavigationPropType;
  showOwnerInfo?: boolean; // Default true - hide owner info when viewing from own profile
}

interface OwnerInfo {
  name: string;
  avatar: string;
  id: string;
}

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  visible,
  onClose,
  item,
  type,
  navigation,
  showOwnerInfo = true,
}) => {
  const { selectedUser } = useUser();
  const [itemOwner, setItemOwner] = useState<OwnerInfo | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const { t } = useTranslation(['common', 'trump', 'donations', 'quickMessage']);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { ToastComponent } = useToast();

  useEffect(() => {
    if (visible && item) {
      const ownerId = type === 'item'
        ? (item.ownerId || item.owner_id)
        : (item.driverId || item.driver_id || item.createdBy || item.created_by);
      if (ownerId) {
        loadItemOwner(ownerId);
      }
    } else {
      setItemOwner(null);
    }
  }, [visible, item, type]);

  const loadItemOwner = async (ownerId: string) => {
    if (!ownerId) return;
    setLoadingOwner(true);
    try {
      const response = await apiService.getUserById(ownerId);
      if (response.success && response.data) {
        setItemOwner({
          name: response.data.name || 'משתמש',
          avatar: response.data.avatar_url || response.data.avatar || '',
          id: response.data.id || ownerId,
        });
      } else {
        setItemOwner({
          name: 'משתמש',
          avatar: '',
          id: ownerId,
        });
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת פרטי יוזר:', error);
      setItemOwner({
        name: 'משתמש',
        avatar: '',
        id: ownerId,
      });
    } finally {
      setLoadingOwner(false);
    }
  };

  const handleProfilePress = () => {
    if (!itemOwner) return;
    onClose();

    // Check if this is the current user's own profile
    const isOwnProfile = itemOwner.id === selectedUser?.id;

    if (isOwnProfile) {
      // Navigate to Profile tab in BottomNavigator instead of UserProfileScreen
      // This ensures the bottom bar and top bar are visible
      try {
        // Navigation structure: MainNavigator -> BottomNavigator -> HomeTabStack -> ItemDetailsModal
        // We need to find the BottomNavigator (which is the parent of HomeTabStack)
        // and navigate to ProfileScreen tab through it

        // First, get the parent (HomeTabStack)
        const homeTabStack = (navigation as any).getParent();
        if (homeTabStack) {
          // Then get the parent of HomeTabStack (BottomNavigator)
          const bottomNavigator = homeTabStack.getParent();
          if (bottomNavigator) {
            // Navigate to ProfileScreen tab in BottomNavigator
            bottomNavigator.navigate('ProfileScreen');
            logger.debug('ItemDetailsModal', 'Navigated to ProfileScreen tab (own profile)');
            return;
          }
        }

        // Fallback: try to find BottomNavigator by traversing up
        let currentNav = (navigation as any).getParent();
        let depth = 0;
        const maxDepth = 5; // Safety limit

        while (currentNav && depth < maxDepth) {
          // Check if this navigator has a route named 'ProfileScreen' (it's the BottomNavigator)
          const state = currentNav.getState?.();
          if (state?.routeNames?.includes('ProfileScreen')) {
            // Found BottomNavigator!
            currentNav.navigate('ProfileScreen');
            logger.debug('ItemDetailsModal', 'Navigated to ProfileScreen tab via traversal (own profile)');
            return;
          }

          const parent = currentNav.getParent?.();
          if (parent) {
            currentNav = parent;
            depth++;
          } else {
            break;
          }
        }

        // If we couldn't find BottomNavigator, fall back to UserProfileScreen
        logger.warn('ItemDetailsModal', 'Could not find BottomNavigator, falling back to UserProfileScreen');
        const parentNavigator = (navigation as any).getParent();
        if (parentNavigator) {
          parentNavigator.navigate('UserProfileScreen', {
            userId: itemOwner.id,
            userName: itemOwner.name,
            characterData: null
          });
        } else {
          (navigation as any).navigate('UserProfileScreen', {
            userId: itemOwner.id,
            userName: itemOwner.name,
            characterData: null
          });
        }
      } catch (error) {
        logger.error('ItemDetailsModal', 'Error navigating to ProfileScreen tab', { error });
        // Fallback: navigate to UserProfileScreen
        try {
          const parentNavigator = (navigation as any).getParent();
          if (parentNavigator) {
            parentNavigator.navigate('UserProfileScreen', {
              userId: itemOwner.id,
              userName: itemOwner.name,
              characterData: null
            });
          } else {
            (navigation as any).navigate('UserProfileScreen', {
              userId: itemOwner.id,
              userName: itemOwner.name,
              characterData: null
            });
          }
        } catch (fallbackError) {
          logger.error('ItemDetailsModal', 'Fallback navigation also failed', { fallbackError });
        }
      }
    } else {
      // Navigate to other user's profile via HomeTabStack to keep bottom bar and top bar visible
      // Try to navigate through HomeScreen first (which is part of BottomNavigator)
      try {
        // Check if we're already in HomeTabStack context
        const currentState = (navigation as any).getState?.();
        const currentRouteName = currentState?.routes?.[currentState?.index]?.name;
        
        // Try to find BottomNavigator
        let bottomNavigator = null;
        let currentNav = navigation as any;
        let depth = 0;
        const maxDepth = 5;
        
        while (currentNav && depth < maxDepth) {
          const state = currentNav.getState?.();
          if (state?.routeNames?.includes('HomeScreen')) {
            bottomNavigator = currentNav;
            break;
          }
          const parent = currentNav.getParent?.();
          if (parent) {
            currentNav = parent;
            depth++;
          } else {
            break;
          }
        }
        
        if (bottomNavigator) {
          // Navigate through HomeScreen to UserProfileScreen (which is in HomeTabStack)
          bottomNavigator.navigate('HomeScreen', {
            screen: 'UserProfileScreen',
            params: {
              userId: itemOwner.id,
              userName: itemOwner.name,
              characterData: null
            }
          });
          logger.debug('ItemDetailsModal', 'Navigated to UserProfileScreen via HomeTabStack');
          return;
        }
        
        // Fallback: try direct navigation to HomeScreen if available
        const parentNavigator = (navigation as any).getParent();
        if (parentNavigator) {
          try {
            parentNavigator.navigate('HomeScreen', {
              screen: 'UserProfileScreen',
              params: {
                userId: itemOwner.id,
                userName: itemOwner.name,
                characterData: null
              }
            });
            return;
          } catch (e) {
            // If that fails, try UserProfileScreen directly as fallback
            parentNavigator.navigate('UserProfileScreen', {
              userId: itemOwner.id,
              userName: itemOwner.name,
              characterData: null
            });
          }
        } else {
          // Last resort: direct navigation
          (navigation as any).navigate('UserProfileScreen', {
            userId: itemOwner.id,
            userName: itemOwner.name,
            characterData: null
          });
        }
      } catch (error) {
        logger.error('ItemDetailsModal', 'Error navigating to UserProfileScreen via HomeTabStack', { error });
        // Fallback to direct navigation
        try {
          const parentNavigator = (navigation as any).getParent();
          if (parentNavigator) {
            parentNavigator.navigate('UserProfileScreen', {
              userId: itemOwner.id,
              userName: itemOwner.name,
              characterData: null
            });
          } else {
            (navigation as any).navigate('UserProfileScreen', {
              userId: itemOwner.id,
              userName: itemOwner.name,
              characterData: null
            });
          }
        } catch (fallbackError) {
          logger.error('ItemDetailsModal', 'Fallback navigation also failed', { fallbackError });
        }
      }
    }
  };

  const handleQuickMessage = async () => {
    if (!itemOwner || !selectedUser) return;

    // Check if trying to message self
    if (itemOwner.id === selectedUser.id) return;

    setSendingMessage(true);
    try {
      // Get translation with fallback - ensure we get the actual text, not the key
      const rideText = t('quickMessage:ride', { defaultValue: 'האם טרמפ זה רלוונטי?' });
      const itemText = t('quickMessage:item', { defaultValue: 'האם פריט זה רלוונטי?' });
      let messageText = type === 'ride' ? rideText : itemText;
      
      // Fallback if translation returns the key itself or empty
      if (!messageText || messageText === 'quickMessage:ride' || messageText === 'quickMessage:item' || messageText === 'ride' || messageText === 'item') {
        messageText = type === 'ride' ? 'האם טרמפ זה רלוונטי?' : 'האם פריט זה רלוונטי?';
      }

      // 1. Try to find existing conversation
      let conversationId = '';
      try {
        const conversations = await getConversations(selectedUser.id);
        const existingConv = conversations.find(c =>
          c.participants && c.participants.includes(itemOwner.id)
        );
        if (existingConv) {
          conversationId = existingConv.id;
        }
      } catch (e) {
        console.log('Error finding conversation, will create new', e);
      }

      // 2. If not found, create new
      if (!conversationId) {
        conversationId = await createConversation([selectedUser.id, itemOwner.id]);
      }

      // 3. Send message with the correct text
      await sendMessage({
        conversationId: conversationId,
        senderId: selectedUser.id,
        text: messageText,
        type: 'text',
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sending'
      });

      toastService.showSuccess(t('quickMessage:success', { defaultValue: 'ההודעה נשלחה בהצלחה' }));
      onClose();
    } catch (error) {
      console.error('❌ Quick message error:', error);
      toastService.showError(t('quickMessage:error', { defaultValue: 'ההודעה נכשלה' }));
    } finally {
      setSendingMessage(false);
    }
  };

  if (!item) return null;

  const renderItemContent = () => {
    if (type === 'item') {
      return (
        <>
          {/* Item Image */}
          {item.image_base64 && (
            <Image
              source={{ uri: item.image_base64 }}
              style={styles.modalImage}
              resizeMode="cover"
            />
          )}

          {/* Item Title */}
          <View style={styles.modalSection}>
            <Text style={styles.modalItemTitle}>{item.title}</Text>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
          </View>


          {/* Description */}
          {item.description && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>תיאור:</Text>
              <Text style={styles.modalDescription}>{item.description}</Text>
            </View>
          )}

          {/* Condition */}
          {item.condition && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>מצב:</Text>
              <Text style={styles.modalText}>
                {item.condition === 'new' ? '🆕 חדש' :
                  item.condition === 'like_new' ? '✨ כמו חדש' :
                    item.condition === 'used' ? '📦 משומש' : '🔧 לחלפים'}
              </Text>
            </View>
          )}

          {/* Quantity */}
          {(item.qty || item.quantity) && (item.qty || item.quantity) > 1 && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>כמות:</Text>
              <Text style={styles.modalText}>{item.qty || item.quantity}</Text>
            </View>
          )}

          {/* Location */}
          {(item.city || item.address) && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>מיקום:</Text>
              <Text style={styles.modalText}>
                📍 {item.city || ''}{item.address ? `, ${item.address}` : ''}
              </Text>
            </View>
          )}

          {/* Date and Time */}
          {(item.timestamp || item.created_at || item.createdAt) && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>תאריך ושעה:</Text>
              <Text style={styles.modalText}>
                📅 {(() => {
                  const dateStr = item.timestamp || item.created_at || item.createdAt;
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                })()}
              </Text>
            </View>
          )}
        </>
      );
    } else {
      // Ride content
      return (
        <>
          {/* Ride Route */}
          <View style={styles.modalSection}>
            <Text style={styles.modalItemTitle}>טרמפ</Text>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>🚗 נסיעה</Text>
            </View>
          </View>

          {/* Route */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>מסלול:</Text>
            <Text style={styles.modalText}>
              📍 {item.from || item.from_location?.name || 'לא צויין'} ➝ {item.to || item.to_location?.name || 'לא צויין'}
            </Text>
          </View>

          {/* Price */}
          <View style={styles.modalSection}>
            <Text style={styles.modalPrice}>
              {(item.price ?? item.price_per_seat ?? 0) === 0 ? 'בחינם' : `₪${item.price || item.price_per_seat}`}
            </Text>
          </View>

          {/* Date and Time */}
          {(item.date || item.departure_time) && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>תאריך ושעה:</Text>
              <Text style={styles.modalText}>
                📅 {item.departure_time
                  ? new Date(item.departure_time).toLocaleDateString('he-IL') + ' ' + new Date(item.departure_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                  : item.date + ' ' + (item.time || '')}
              </Text>
            </View>
          )}

          {/* Seats */}
          {(item.seats || item.available_seats) && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>מקומות פנויים:</Text>
              <Text style={styles.modalText}>
                👥 {item.available_seats || item.seats || 0} מקומות
              </Text>
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>הערות:</Text>
              <Text style={styles.modalDescription}>{item.description}</Text>
            </View>
          )}

          {/* Tags */}
          {(item.noSmoking || item.petsAllowed || item.kidsFriendly) && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>תגיות:</Text>
              <View style={styles.tagsContainer}>
                {item.noSmoking && <View style={styles.tag}><Text style={styles.tagText}>🚫🚭</Text></View>}
                {item.petsAllowed && <View style={styles.tag}><Text style={styles.tagText}>🐾</Text></View>}
                {item.kidsFriendly && <View style={styles.tag}><Text style={styles.tagText}>👶</Text></View>}
              </View>
            </View>
          )}
        </>
      );
    }
  };

  const getModalTitle = () => {
    return type === 'item' ? 'פרטי הפריט' : 'פרטי הטרמפ';
  };

  const getOwnerLabel = () => {
    return type === 'item' ? 'פורסם על ידי:' : 'נהג:';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.modalCard}
          onPress={() => { }}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {renderItemContent()}

            {/* Owner/Driver Info - Only show if showOwnerInfo is true */}
            {showOwnerInfo && (
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>{getOwnerLabel()}</Text>

                {/* Quick Message Button - Only if not own item */}
                {itemOwner && selectedUser && itemOwner.id !== selectedUser.id && (
                  <TouchableOpacity
                    style={styles.quickMessageButton}
                    onPress={handleQuickMessage}
                    disabled={sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Icon name="chatbubble-ellipses-outline" size={18} color={colors.white} />
                        <Text style={styles.quickMessageText}>
                          {(() => {
                            const rideText = t('quickMessage:ride', { defaultValue: 'האם טרמפ זה רלוונטי?' });
                            const itemText = t('quickMessage:item', { defaultValue: 'האם פריט זה רלוונטי?' });
                            return type === 'ride' ? rideText : itemText;
                          })()}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {loadingOwner ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
                ) : itemOwner ? (
                  <TouchableOpacity
                    style={styles.ownerCard}
                    onPress={handleProfilePress}
                    activeOpacity={0.7}
                  >
                    {itemOwner.avatar ? (
                      <Image
                        source={{ uri: itemOwner.avatar }}
                        style={styles.ownerAvatar}
                      />
                    ) : (
                      <View style={styles.ownerAvatarPlaceholder}>
                        <Icon name="person" size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.ownerInfo}>
                      <Text style={styles.ownerName}>{itemOwner.name}</Text>
                      <Text style={styles.ownerLink}>לחץ לצפייה בפרופיל →</Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.modalText}>מידע לא זמין</Text>
                )}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
      {ToastComponent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: rowDirection('row-reverse'),
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalItemTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: biDiTextAlign('right'),
    marginBottom: 8,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalBadgeText: {
    fontSize: FontSizes.small,
    color: colors.success,
    fontWeight: 'bold',
  },
  modalPrice: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.accent,
    textAlign: biDiTextAlign('right'),
  },
  modalLabel: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: biDiTextAlign('right'),
  },
  modalDescription: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    lineHeight: 22,
    textAlign: biDiTextAlign('right'),
  },
  modalText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: biDiTextAlign('right'),
  },
  ownerCard: {
    flexDirection: rowDirection('row-reverse'),
    alignItems: 'center',
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 12,
  },
  ownerAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: biDiTextAlign('right'),
    marginBottom: 4,
  },
  ownerLink: {
    fontSize: FontSizes.small,
    color: colors.primary,
    textAlign: biDiTextAlign('right'),
  },
  tagsContainer: {
    flexDirection: rowDirection('row-reverse'),
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: FontSizes.small,
  },
  quickMessageButton: {
    backgroundColor: colors.primary,
    flexDirection: rowDirection('row-reverse'),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20, // Rounded button
    marginBottom: 12, // Space above profile card
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickMessageText: {
    color: colors.white,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
});

export default ItemDetailsModal;
