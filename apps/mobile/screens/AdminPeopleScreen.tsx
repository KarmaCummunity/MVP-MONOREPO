import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NavigationProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { apiService } from '../utils/apiService';

interface AdminPeopleScreenProps {
  navigation: NavigationProp<AdminStackParamList>;
}

interface CommunityMember {
  id: string;
  name: string;
  role: string; // התפקיד/התרומה שלו לקהילה
  description?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  status: 'active' | 'inactive';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface MemberFormData {
  name: string;
  role: string;
  description: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

const LOG_SOURCE = 'AdminPeopleScreen';

import { useAdminProtection } from '../hooks/useAdminProtection';

export default function AdminPeopleScreen({ navigation }: AdminPeopleScreenProps) {
  const route = useRoute();
  const routeParams = (route.params as any) || {};
  const viewOnly = routeParams?.viewOnly === true;
  useAdminProtection(true);
  const { selectedUser, isAdmin } = useUser();
  const [membersList, setMembersList] = useState<CommunityMember[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    role: '',
    description: '',
    email: '',
    phone: '',
    status: 'active',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    logger.info(LOG_SOURCE, 'Initializing admin people screen');
    loadMembers();
  }, [statusFilter, searchQuery]);

  const loadMembers = async () => {
    logger.info(LOG_SOURCE, 'Loading community members list');
    try {
      setIsLoading(true);
      const filters: { status?: 'active' | 'inactive'; search?: string } = {};

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const response = await apiService.getCommunityMembers(filters);

      if (response.success && Array.isArray(response.data)) {
        setMembersList(response.data);
        logger.info(LOG_SOURCE, 'Members loaded successfully', {
          count: response.data.length,
        });
      } else {
        logger.warn(LOG_SOURCE, 'Failed to load members', { response });
        setMembersList([]);
      }
    } catch (error) {
      logger.error(LOG_SOURCE, 'Error loading members', { error });
      Alert.alert('שגיאה', 'לא ניתן היה לטעון את רשימת האנשים');
      setMembersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = () => {
    logger.info(LOG_SOURCE, 'Opening add member modal');
    setIsEditMode(false);
    setEditingMemberId(null);
    setFormData({
      name: '',
      role: '',
      description: '',
      email: '',
      phone: '',
      status: 'active',
    });
    setIsModalVisible(true);
  };

  const handleEditMember = (member: CommunityMember) => {
    logger.info(LOG_SOURCE, 'Opening edit member modal', { memberId: member.id });
    setIsEditMode(true);
    setEditingMemberId(member.id);
    setFormData({
      name: member.name || '',
      role: member.role || '',
      description: member.description || '',
      email: member.contact_info?.email || '',
      phone: member.contact_info?.phone || '',
      status: member.status || 'active',
    });
    setIsModalVisible(true);
  };

  const handleDeleteMember = (member: CommunityMember) => {
    Alert.alert(
      'מחיקת רשומה',
      `האם אתה בטוח שברצונך למחוק את ${member.name}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsMutating(true);
              logger.info(LOG_SOURCE, 'Deleting member', { memberId: member.id });
              const response = await apiService.deleteCommunityMember(member.id);

              if (response.success) {
                logger.info(LOG_SOURCE, 'Member deleted successfully');
                await loadMembers();
                Alert.alert('בוצע', 'הרשומה נמחקה בהצלחה');
              } else {
                throw new Error(response.error || 'Failed to delete member');
              }
            } catch (error) {
              logger.error(LOG_SOURCE, 'Error deleting member', { error });
              Alert.alert('שגיאה', 'לא ניתן היה למחוק את הרשומה');
            } finally {
              setIsMutating(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveMember = async () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      Alert.alert('שגיאה', 'שם ותפקיד הם שדות חובה');
      return;
    }

    try {
      setIsMutating(true);
      logger.info(LOG_SOURCE, isEditMode ? 'Updating member' : 'Creating member', {
        isEditMode,
        memberId: editingMemberId,
      });

      const memberData: any = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        contact_info: {},
      };

      if (formData.email.trim()) {
        memberData.contact_info.email = formData.email.trim();
      }
      if (formData.phone.trim()) {
        memberData.contact_info.phone = formData.phone.trim();
      }

      if (Object.keys(memberData.contact_info).length === 0) {
        memberData.contact_info = undefined;
      }

      if (selectedUser?.id) {
        memberData.created_by = selectedUser.id;
      }

      let response;
      if (isEditMode && editingMemberId) {
        response = await apiService.updateCommunityMember(editingMemberId, memberData);
      } else {
        response = await apiService.createCommunityMember(memberData);
      }

      if (response.success) {
        logger.info(LOG_SOURCE, 'Member saved successfully');
        setIsModalVisible(false);
        await loadMembers();
        Alert.alert('בוצע', isEditMode ? 'הרשומה עודכנה בהצלחה' : 'הרשומה נוספה בהצלחה');
      } else {
        throw new Error(response.error || 'Failed to save member');
      }
    } catch (error) {
      logger.error(LOG_SOURCE, 'Error saving member', { error });
      Alert.alert('שגיאה', 'לא ניתן היה לשמור את הרשומה');
    } finally {
      setIsMutating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ניהול אנשים</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={viewOnly ? undefined : handleAddMember}
          disabled={viewOnly || isMutating}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>הוסף רשומה</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="חפש לפי שם, תפקיד או תיאור..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusFilterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'all' && styles.filterButtonTextActive]}>
              הכל
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'active' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'active' && styles.filterButtonTextActive]}>
              פעיל
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'inactive' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'inactive' && styles.filterButtonTextActive]}>
              לא פעיל
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Members List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      ) : membersList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>אין רשומות</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || statusFilter !== 'all'
              ? 'לא נמצאו רשומות התואמות לחיפוש'
              : 'לחץ על "הוסף רשומה" כדי להתחיל'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: '150%' // Ensure content is always scrollable
          }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadMembers} />
          }
        >
          {membersList.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={styles.memberMeta}>
                    <View style={[styles.statusBadge, member.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                      <Text style={[styles.statusText, member.status === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
                        {member.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </Text>
                    </View>
                    <Text style={styles.memberDate}>{formatDate(member.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.memberActions}>
                  {!viewOnly && (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditMember(member)}
                        disabled={isMutating}
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteMember(member)}
                        disabled={isMutating}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.memberDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailLabel}>תפקיד/תרומה:</Text>
                  <Text style={styles.detailValue}>{member.role}</Text>
                </View>

                {member.description && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailValue} numberOfLines={2}>{member.description}</Text>
                  </View>
                )}

                {(member.contact_info?.email || member.contact_info?.phone) && (
                  <View style={styles.contactInfo}>
                    {member.contact_info?.email && (
                      <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailValue}>{member.contact_info.email}</Text>
                      </View>
                    )}
                    {member.contact_info?.phone && (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailValue}>{member.contact_info.phone}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible && !viewOnly}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'ערוך רשומה' : 'הוסף רשומה חדשה'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
                disabled={isMutating}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>שם *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="הזן שם"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>תפקיד/תרומה לקהילה *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.role}
                  onChangeText={(text) => setFormData({ ...formData, role: text })}
                  placeholder="הזן תפקיד או תרומה"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>תיאור</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="תיאור נוסף על התרומה (אופציונלי)"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>אימייל</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="אימייל (אופציונלי)"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>טלפון</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="טלפון (אופציונלי)"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>סטטוס</Text>
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      formData.status === 'active' && styles.statusOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, status: 'active' })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.status === 'active' && styles.statusOptionTextActive,
                      ]}
                    >
                      פעיל
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      formData.status === 'inactive' && styles.statusOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, status: 'inactive' })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.status === 'inactive' && styles.statusOptionTextActive,
                      ]}
                    >
                      לא פעיל
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isMutating && styles.saveButtonDisabled]}
                onPress={handleSaveMember}
                disabled={isMutating}
              >
                {isMutating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'עדכן' : 'שמור'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    gap: LAYOUT_CONSTANTS.SPACING.XS,
  },
  addButtonText: {
    color: 'white',
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: colors.background,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  searchIcon: {
    marginLeft: LAYOUT_CONSTANTS.SPACING.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
  },
  clearButton: {
    padding: LAYOUT_CONSTANTS.SPACING.XS,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  filterButton: {
    flex: 1,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
  },
  memberCard: {
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  statusBadge: {
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
    paddingVertical: 2,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
  },
  statusBadgeActive: {
    backgroundColor: colors.successLight,
  },
  statusBadgeInactive: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.error,
  },
  memberDate: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  memberActions: {
    flexDirection: 'row',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  actionButton: {
    padding: LAYOUT_CONSTANTS.SPACING.XS,
  },
  memberDetails: {
    gap: LAYOUT_CONSTANTS.SPACING.XS,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT_CONSTANTS.SPACING.XS,
  },
  detailLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    flex: 1,
  },
  contactInfo: {
    marginTop: LAYOUT_CONSTANTS.SPACING.XS,
    paddingTop: LAYOUT_CONSTANTS.SPACING.XS,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.XL,
  },
  emptyText: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  emptySubtext: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    borderTopRightRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: LAYOUT_CONSTANTS.SPACING.XS,
  },
  modalBody: {
    padding: LAYOUT_CONSTANTS.SPACING.LG,
  },
  formGroup: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  statusOption: {
    flex: 1,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.MD,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusOptionTextActive: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.MD,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
});
