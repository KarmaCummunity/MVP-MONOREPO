import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    Platform,
    FlatList,
    Modal,
    SafeAreaView,
    Dimensions,
    type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { apiService } from '../src/api/api.service';
import { useAdminProtection } from '../hooks/useAdminProtection';

interface AdminAdminsScreenProps {
    navigation: NavigationProp<AdminStackParamList>;
}

const LOG_SOURCE = 'AdminAdminsScreen';

/** User shape returned by admin API (getUsers, getEligibleForPromotion, etc.) */
interface AdminUser {
    id: string;
    email?: string;
    name?: string;
    roles?: string[];
    parent_manager_id?: string | null;
    manager_details?: { id: string; name?: string; email?: string; avatar_url?: string } | null;
    hierarchy_level?: number | null;
}

type AdminAdminsRouteParams = { viewOnly?: boolean } | undefined;

export default function AdminAdminsScreen({ navigation: _navigation }: AdminAdminsScreenProps) {
    const { t } = useTranslation();
    const route = useRoute();
    const routeParams = (route.params as AdminAdminsRouteParams) ?? {};
    const viewOnly = routeParams?.viewOnly === true;
    useAdminProtection(true);
    const { selectedUser } = useUser();
    const [usersList, setUsersList] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'admins' | 'volunteers' | 'users'>('admins');

    // Manager Assignment State
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [selectedForManager, setSelectedForManager] = useState<AdminUser | null>(null);
    const [newManager, setNewManager] = useState<{ id: string; name?: string; email?: string; avatar_url?: string } | null>(null);
    const [isRemovingManager, setIsRemovingManager] = useState(false);

    // Store eligible users separately
    const [eligibleUsers, setEligibleUsers] = useState<AdminUser[]>([]);

    // Store all managers for manager assignment
    const [allManagers, setAllManagers] = useState<AdminUser[]>([]);

    const loadUsers = React.useCallback(async (forceRefresh: boolean = false) => {
        if (!selectedUser?.id) {
            logger.info(LOG_SOURCE, 'No selectedUser.id, skipping load');
            return;
        }

        try {
            setIsLoading(true);
            const filters: { limit: number; search?: string; forceRefresh?: boolean } = { limit: 100 };
            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            // Force refresh after admin operations to ensure fresh data
            if (forceRefresh) {
                filters.forceRefresh = true;
                logger.info(LOG_SOURCE, 'Force refresh - loading users', { filters });
            } else {
                logger.info(LOG_SOURCE, 'Loading users', { filters });
            }

            // Load all users for display
            const response = await apiService.getUsers(filters);

            logger.info(LOG_SOURCE, 'getUsers response', {
                success: response.success,
                dataLength: Array.isArray(response.data) ? response.data.length : undefined,
                error: response.error,
            });

            if (response.success && Array.isArray(response.data)) {
                // Keep only other users (not current user)
                const otherUsers = response.data.filter((u: AdminUser) => u.email !== selectedUser?.email);
                setUsersList(otherUsers);

                // Extract managers from the list (admins + super admin)
                const managers = response.data.filter((u: AdminUser) => {
                    const roles = u.roles || [];
                    return roles.includes('admin') || roles.includes('super_admin') || u.email === 'navesarussi@gmail.com';
                });
                setAllManagers(managers);

                logger.info(LOG_SOURCE, 'Loaded users', { usersCount: otherUsers.length, managersCount: managers.length, sample: otherUsers.slice(0, 2) });
            } else {
                setUsersList([]);
                setAllManagers([]);
                logger.warn(LOG_SOURCE, 'Failed to load users', { error: response.error });
            }

            // Load eligible users for promotion (to know who can be promoted)
            const eligibleResponse = await apiService.getEligibleForPromotion(selectedUser.id);
            if (eligibleResponse.success && Array.isArray(eligibleResponse.data)) {
                setEligibleUsers(eligibleResponse.data);
                logger.info(LOG_SOURCE, 'Loaded eligible users', { count: eligibleResponse.data.length });
            } else {
                setEligibleUsers([]);
                logger.warn(LOG_SOURCE, 'Failed to load eligible users', { error: eligibleResponse.error });
            }
        } catch (error) {
            logger.error(LOG_SOURCE, 'Error loading users', { error });
            Alert.alert(t('admin:admins.error'), t('admin:admins.loadUsersError'));
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedUser?.id, selectedUser?.email, t]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Check if current user is super admin - based on roles, not email
    const currentUserRoles = selectedUser?.roles || [];
    const isCurrentUserSuperAdmin = currentUserRoles.includes('super_admin') ||
        currentUserRoles.includes('admin');

    logger.info(LOG_SOURCE, 'Current user check', { userId: selectedUser?.id, email: selectedUser?.email, roles: selectedUser?.roles, isAdmin: isCurrentUserSuperAdmin });

    // Check if a user can be promoted by current admin
    const canPromote = (user: AdminUser): boolean => {
        // Admin/super_admin can promote users who are not already admins
        if (isCurrentUserSuperAdmin) {
            const targetRoles = user.roles || [];
            const targetIsAlreadyAdmin = targetRoles.includes('admin') || targetRoles.includes('super_admin');
            const canPromoteUser = !targetIsAlreadyAdmin;

            logger.debug(LOG_SOURCE, 'canPromote check', {
                targetId: user.id,
                targetEmail: user.email,
                targetRoles: user.roles,
                targetIsAlreadyAdmin,
                canPromoteUser
            });

            return canPromoteUser;
        }
        // Regular admins - check eligible list from server
        const isEligible = eligibleUsers.some(e => e.id === user.id);
        logger.debug(LOG_SOURCE, 'canPromote (regular admin)', {
            targetId: user.id,
            targetEmail: user.email,
            isEligible,
            eligibleCount: eligibleUsers.length
        });
        return isEligible;
    };

    // Check if current admin can demote a user
    // We simplify this - let the server do the full validation
    // Just check basic conditions on client side
    const canDemote = (user: AdminUser): boolean => {
        const isSameUser = user.id === selectedUser?.id;

        // Cannot demote yourself
        if (isSameUser) {
            logger.debug(LOG_SOURCE, 'canDemote: false (cannot demote yourself)');
            return false;
        }

        // Admin/super_admin can demote admins
        if (isCurrentUserSuperAdmin) {
            logger.debug(LOG_SOURCE, 'canDemote (admin)', {
                targetId: user.id,
                targetEmail: user.email,
                canDemote: true
            });
            return true;
        }

        // For regular admins - check if user is in their subordinate tree
        // Let the server do the full tree validation
        const isDirectSubordinate = user.parent_manager_id === selectedUser?.id;

        logger.debug(LOG_SOURCE, 'canDemote (checking hierarchy)', {
            targetId: user.id,
            isDirectSubordinate,
            allowForServerValidation: true
        });

        // Let server validate hierarchy - show button as enabled
        return true;
    };

    const handleToggleAdmin = async (user: AdminUser) => {
        logger.debug(LOG_SOURCE, 'handleToggleAdmin called with', {
            userId: user?.id,
            userName: user?.name,
            userEmail: user?.email,
            userRoles: user?.roles,
            selectedUserId: selectedUser?.id,
            selectedUserEmail: selectedUser?.email
        });

        const currentRoles = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = currentRoles.includes('admin') || currentRoles.includes('super_admin');
        const superAdminEmails = ['navesarussi@gmail.com', 'karmacommunity2.0@gmail.com'];
        const isSuperAdmin = superAdminEmails.includes(user.email?.toLowerCase() || '');

        logger.debug(LOG_SOURCE, 'User check', {
            isAdmin,
            isSuperAdmin,
            currentRoles
        });

        if (isSuperAdmin) {
            logger.warn(LOG_SOURCE, 'Blocked: Super admin');
            Alert.alert(t('admin:admins.error'), t('admin:admins.cannotChangeRoot'));
            return;
        }

        if (!selectedUser?.id) {
            logger.warn(LOG_SOURCE, 'No selectedUser.id');
            Alert.alert(t('admin:admins.error'), t('admin:admins.cannotIdentifyUser'));
            return;
        }

        const name = user.name || user.email;
        const title = isAdmin ? t('admin:admins.confirmDemoteTitle') : t('admin:admins.confirmPromoteToAdminTitle');
        const message = isAdmin ? t('admin:admins.confirmDemoteAdminMessage', { name }) : t('admin:admins.confirmPromoteToAdminMessage', { name });

        logger.debug(LOG_SOURCE, 'Showing Alert.alert', { title, message });

        Alert.alert(title, message, [
            {
                text: t('common:cancel'), 
                style: 'cancel',
                onPress: () => {
                    logger.debug(LOG_SOURCE, 'User cancelled');
                }
            },
            {
                text: t('common:confirm'),
                style: isAdmin ? 'destructive' : 'default',
                onPress: async () => {
                    logger.debug(LOG_SOURCE, 'User confirmed');
                    logger.debug(LOG_SOURCE, `${isAdmin ? 'Demoting' : 'Promoting'} user`, {
                        userId: user.id,
                        userName: user.name,
                        currentRoles: user.roles,
                        requestingAdminId: selectedUser.id
                    });

                    let res;
                    if (isAdmin) {
                        // Demote admin
                        logger.debug(LOG_SOURCE, 'Calling demoteAdmin');
                        res = await apiService.demoteAdmin(user.id, selectedUser.id);
                    } else {
                        // Promote to admin (will also set as subordinate)
                        logger.debug(LOG_SOURCE, 'Calling promoteToAdmin');
                        res = await apiService.promoteToAdmin(user.id, selectedUser.id);
                    }

                    logger.debug(LOG_SOURCE, `${isAdmin ? 'Demote' : 'Promote'} response`, { response: res });

                    if (res.success) {
                        Alert.alert(t('admin:admins.success'), res.message || t('admin:admins.updateSuccess'));
                        logger.info(LOG_SOURCE, 'Operation successful, reloading users with force refresh');
                        await loadUsers(true); // Force refresh to bypass cache
                    } else {
                        Alert.alert(t('admin:admins.error'), res.error || t('admin:admins.updateFailed'));
                        logger.error(LOG_SOURCE, 'Operation failed', { error: res.error });
                    }
                }
            }
        ]);
    };

    const openManagerModal = (user: AdminUser) => {
        setSelectedForManager(user);
        // Pre-select current manager if exists
        if (user.manager_details) {
            setNewManager({
                id: user.manager_details.id,
                name: user.manager_details.name,
                email: user.manager_details.email,
                avatar_url: user.manager_details.avatar_url
            });
        } else {
            setNewManager(null);
        }
        setShowManagerModal(true);
    };

    const saveManager = async () => {
        if (!selectedForManager) return;

        try {
            const managerId = newManager ? newManager.id : null;
            logger.debug(LOG_SOURCE, 'Setting manager', {
                userId: selectedForManager.id,
                userName: selectedForManager.name,
                currentManagerId: selectedForManager.parent_manager_id,
                newManagerId: managerId,
                newManagerName: newManager?.name,
                requestedBy: selectedUser?.id
            });

            const res = await apiService.setManager(selectedForManager.id, managerId, selectedUser?.id);

            logger.debug(LOG_SOURCE, 'setManager response', { response: res });

            if (res.success) {
                Alert.alert(t('admin:admins.success'), managerId ? t('admin:admins.managerUpdated') : t('admin:admins.managerRemoveSuccess'));
                setShowManagerModal(false);
                logger.info(LOG_SOURCE, 'Manager updated successfully, reloading users with force refresh');
                await loadUsers(true); // Force refresh to bypass cache
            } else {
                Alert.alert(t('admin:admins.error'), res.error || t('admin:admins.managerUpdateFailed'));
                logger.error(LOG_SOURCE, 'Failed to update manager', { error: res.error });
            }
        } catch (e) {
            logger.error(LOG_SOURCE, 'Error saving manager', { error: e });
            Alert.alert(t('admin:admins.error'), t('admin:admins.genericError'));
        }
    };

    // Direct remove function (without confirmation - used from modal button)
    const performRemoveManager = async () => {
        if (!selectedForManager) {
            logger.debug(LOG_SOURCE, ' performRemoveManager called but no selectedForManager');
            return;
        }

        try {
            logger.debug(LOG_SOURCE, 'Starting to remove manager', { userId: selectedForManager.id, requestedBy: selectedUser?.id });
            setIsRemovingManager(true);

            const res = await apiService.setManager(selectedForManager.id, null, selectedUser?.id);

            logger.debug(LOG_SOURCE, 'Response from setManager', { res });

            if (res.success) {
                Alert.alert(t('admin:admins.success'), t('admin:admins.managerRemoveSuccess'));
                setShowManagerModal(false);
                logger.debug(LOG_SOURCE, ' ✅ Manager removed successfully, reloading users with force refresh...');
                await loadUsers(true); // Force refresh to bypass cache
            } else {
                Alert.alert(t('admin:admins.error'), res.error || t('admin:admins.managerRemoveFailed'));
            }
        } catch (e) {
            logger.error(LOG_SOURCE, 'Error removing manager', { error: e });
            Alert.alert(t('admin:admins.error'), t('admin:admins.managerRemoveError'));
        } finally {
            setIsRemovingManager(false);
        }
    };

    // Remove manager with confirmation (used from outside modal)
    const _removeManager = async () => {
        if (!selectedForManager) {
            logger.debug(LOG_SOURCE, ' removeManager called but no selectedForManager');
            return;
        }

        logger.debug(LOG_SOURCE, 'removeManager called for', { target: selectedForManager.name || selectedForManager.email, selectedForManagerId: selectedForManager.id, selectedUserId: selectedUser?.id });

        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.confirm(t('admin:admins.confirmRemoveManagerMessage', { name: selectedForManager.name || selectedForManager.email }))) {
                await performRemoveManager();
            }
        } else {
            Alert.alert(
                t('admin:admins.confirmRemoveManagerTitle'),
                t('admin:admins.confirmRemoveManagerMessage', { name: selectedForManager.name || selectedForManager.email }),
                [
                    { text: t('common:cancel'), style: 'cancel' },
                    {
                        text: 'הסר',
                        style: 'destructive',
                        onPress: performRemoveManager
                    }
                ]
            );
        }
    };

    const handlePromoteToVolunteer = async (targetUser: AdminUser) => {
        logger.info(LOG_SOURCE, 'handlePromoteToVolunteer called', {
            targetUserId: targetUser.id,
            targetUserName: targetUser.name,
            targetUserEmail: targetUser.email,
            requestingAdminId: selectedUser?.id
        });

        if (!selectedUser?.id) {
            logger.warn(LOG_SOURCE, 'handlePromoteToVolunteer: No selectedUser.id', {});
            Alert.alert(t('admin:admins.error'), t('admin:admins.cannotIdentifyUser'));
            return;
        }
        
        Alert.alert(
            t('admin:admins.confirmDemoteTitle'),
            t('admin:admins.confirmDemoteMessage', { name: targetUser.name || targetUser.email }),
            [
                { text: t('common:cancel'), style: 'cancel' },
                {
                    text: t('common:confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            logger.info(LOG_SOURCE, 'Promoting user to volunteer - API call started', {
                                targetUserId: targetUser.id,
                                requestingAdminId: selectedUser.id
                            });

                            const res = await apiService.promoteToVolunteer(targetUser.id, selectedUser.id);
                            
                            logger.info(LOG_SOURCE, 'Promote to volunteer API response', {
                                success: res.success,
                                message: res.message,
                                error: res.error,
                                targetUserId: targetUser.id
                            });

                            if (res.success) {
                                logger.info(LOG_SOURCE, 'User promoted to volunteer successfully', {
                                    targetUserId: targetUser.id,
                                    targetUserName: targetUser.name
                                });
                                Alert.alert(t('admin:admins.success'), res.message || t('admin:admins.demoteSuccess'));
                                await loadUsers(true);
                            } else {
                                logger.error(LOG_SOURCE, 'Failed to promote user to volunteer', {
                                    targetUserId: targetUser.id,
                                    error: res.error
                                });
                                Alert.alert(t('admin:admins.error'), res.error || t('admin:admins.demoteFailed'));
                            }
                        } catch (e: unknown) {
                            const err = e as Error;
                            logger.error(LOG_SOURCE, 'Error promoting to volunteer', {
                                targetUserId: targetUser.id,
                                error: err?.message || String(e),
                                stack: err?.stack
                            });
                            logger.error(LOG_SOURCE, 'Error promoting to volunteer', { error: e });
                            Alert.alert(t('admin:admins.error'), t('admin:admins.demoteError'));
                        }
                    }
                }
            ]
        );
    };

    const handleDemoteToVolunteer = async (targetUser: AdminUser) => {
        logger.debug(LOG_SOURCE, ' 🎯 handleDemoteToVolunteer called with:', {
            targetUserId: targetUser?.id,
            targetUserName: targetUser?.name,
            targetUserEmail: targetUser?.email,
            targetUserRoles: targetUser?.roles,
            requestingAdminId: selectedUser?.id,
            selectedUserEmail: selectedUser?.email
        });

        logger.info(LOG_SOURCE, 'handleDemoteToVolunteer called', {
            targetUserId: targetUser.id,
            targetUserName: targetUser.name,
            targetUserEmail: targetUser.email,
            targetUserRoles: targetUser.roles,
            requestingAdminId: selectedUser?.id
        });

        if (!selectedUser?.id) {
            logger.warn(LOG_SOURCE, 'handleDemoteToVolunteer: No selectedUser.id', {});
            logger.warn(LOG_SOURCE, 'No selectedUser.id');
            Alert.alert(t('admin:admins.error'), t('admin:admins.cannotIdentifyUser'));
            return;
        }

        logger.debug(LOG_SOURCE, ' 📢 Showing Alert.alert for demote to volunteer');
        
        Alert.alert(
            t('admin:admins.confirmDemoteTitle'),
            t('admin:admins.confirmDemoteAdminMessage', { name: targetUser.name || targetUser.email }),
            [
                { 
                    text: t('common:cancel'), 
                    style: 'cancel',
                    onPress: () => {
                        logger.debug(LOG_SOURCE, ' ❌ User cancelled demote to volunteer');
                    }
                },
                {
                    text: t('common:confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        logger.debug(LOG_SOURCE, ' ✅ User confirmed demote to volunteer');
                        try {
                            logger.info(LOG_SOURCE, 'Demoting admin to volunteer - Starting process', {
                                targetUserId: targetUser.id,
                                requestingAdminId: selectedUser.id
                            });

                            logger.debug(LOG_SOURCE, ' 📡 Calling apiService.demoteAdmin with convertToVolunteer=true');
                            // Demote admin and convert to volunteer in one step
                            logger.info(LOG_SOURCE, 'Demoting admin to volunteer', {
                                targetUserId: targetUser.id,
                                convertToVolunteer: true
                            });
                            const demoteRes = await apiService.demoteAdmin(targetUser.id, selectedUser.id, true);
                            
                            logger.debug(LOG_SOURCE, 'API Response', { response: demoteRes });
                            logger.info(LOG_SOURCE, 'Demote admin to volunteer API response', {
                                success: demoteRes.success,
                                message: demoteRes.message,
                                error: demoteRes.error,
                                targetUserId: targetUser.id
                            });

                            if (demoteRes.success) {
                                logger.info(LOG_SOURCE, 'Admin demoted to volunteer successfully', {
                                    targetUserId: targetUser.id,
                                    targetUserName: targetUser.name
                                });
                                logger.debug(LOG_SOURCE, ' ✅ Success! Reloading users...');
                                Alert.alert(t('admin:admins.success'), demoteRes.message || t('admin:admins.demoteAdminSuccess'));
                                await loadUsers(true);
                            } else {
                                logger.error(LOG_SOURCE, 'Failed to demote admin to volunteer', {
                                    targetUserId: targetUser.id,
                                    error: demoteRes.error
                                });
                                logger.error(LOG_SOURCE, 'Demote to volunteer failed', { error: demoteRes.error });
                                Alert.alert(t('admin:admins.error'), demoteRes.error || t('admin:admins.demoteAdminFailed'));
                            }
                        } catch (e: unknown) {
                            const err = e as Error;
                            logger.error(LOG_SOURCE, 'Error demoting admin to volunteer', {
                                targetUserId: targetUser.id,
                                error: err?.message || String(e),
                                stack: err?.stack
                            });
                            logger.error(LOG_SOURCE, 'Demote to volunteer exception', { error: e });
                            Alert.alert(t('admin:admins.error'), t('admin:admins.demoteAdminError'));
                        }
                    }
                }
            ]
        );
    };

    // Get managers that can be assigned (exclude the user themselves and create cycle prevention)
    const getEligibleManagersForUser = (user: AdminUser | null | undefined) => {
        if (!user) return allManagers;
        // Filter out: the user themselves, and users who would create a cycle
        return allManagers.filter((m: AdminUser) => m.id !== user.id);
    };

    const getFilteredUsers = () => {
        return usersList.filter(user => {
            const hasManager = !!user.parent_manager_id;
            const currentRoles = Array.isArray(user.roles) ? user.roles : [];
            const isAdminRole = currentRoles.includes('admin') || currentRoles.includes('super_admin');
            const isVolunteerRole = currentRoles.includes('volunteer');

            if (activeTab === 'admins') {
                // Admins: users with role admin/super_admin
                return isAdminRole;
            } else if (activeTab === 'volunteers') {
                // Volunteers: users with role volunteer (no admin)
                return isVolunteerRole && !isAdminRole;
            } else {
                // משתמשים רגילים: ללא manager וללא roles מיוחדים
                return !hasManager && !isAdminRole && !isVolunteerRole;
            }
        });
    };

    const filteredUsers = getFilteredUsers();

    const renderHeader = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.title}>{t('admin:admins.screenTitle')}</Text>
            </View>
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'admins' && styles.activeTab]} onPress={() => setActiveTab('admins')}>
                    <Text style={[styles.tabText, activeTab === 'admins' && styles.activeTabText]}>{t('admin:admins.tabAdmins')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'volunteers' && styles.activeTab]} onPress={() => setActiveTab('volunteers')}>
                    <Text style={[styles.tabText, activeTab === 'volunteers' && styles.activeTabText]}>{t('admin:admins.tabVolunteers')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
                    <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>משתמשים</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('admin:admins.searchPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                />
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContentContainer,
                    Platform.OS === 'web' && { paddingBottom: 120 }
                ]}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadUsers} />}
                ListHeaderComponent={renderHeader}
                scrollEnabled={true}
                nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
                showsVerticalScrollIndicator={true}
                removeClippedSubviews={Platform.OS !== 'web'}
                style={styles.flatList}
                renderItem={({ item: user }) => {
                    const userRoles = user.roles || [];
                    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
                    const isVolunteer = userRoles.includes('volunteer');
                    const _isSameUser = user.id === selectedUser?.id;
                    const isRootAdmin = user.email === 'karmacommunity2.0@gmail.com';
                    const userCanBePromoted = canPromote(user);
                    const userCanBeDemoted = canDemote(user);
                    const hierarchyLevel = user.hierarchy_level;
                    
                    // Determine hierarchy level display
                    let levelText = '';
                    if (hierarchyLevel === 0) {
                        levelText = t('admin:admins.level0');
                    } else if (hierarchyLevel === 1) {
                        levelText = t('admin:admins.level1');
                    } else if (hierarchyLevel !== null && hierarchyLevel !== undefined) {
                        levelText = t('admin:admins.level', { n: hierarchyLevel });
                    }

                    return (
                        <View style={styles.userCard}>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{user.name || t('admin:admins.noName')}</Text>
                                <Text style={styles.userEmail}>{user.email}</Text>
                                
                                {/* Display hierarchy level */}
                                {levelText && (
                                    <View style={[styles.managerBadge, { backgroundColor: colors.primary + '20', marginTop: 4 }]}>
                                        <Ionicons name="layers-outline" size={12} color={colors.primary} />
                                        <Text style={[styles.managerText, { color: colors.primary }]}>{levelText}</Text>
                                    </View>
                                )}
                                
                                {/* Show "Reports to" only if NOT root admin and has manager */}
                                {!isRootAdmin && user.manager_details && (
                                    <View style={styles.managerBadge}>
                                        <Ionicons name="people-outline" size={12} color={colors.primary} />
                                        <Text style={styles.managerText}>{t('admin:admins.reportsTo', { name: user.manager_details.name })}</Text>
                                    </View>
                                )}
                                {isAdmin && user.parent_manager_id === selectedUser?.id && (
                                    <View style={[styles.managerBadge, { backgroundColor: colors.success + '20' }]}>
                                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                        <Text style={[styles.managerText, { color: colors.success }]}>{t('admin:admins.managerUnderYou')}</Text>
                                    </View>
                                )}
                                {isVolunteer && !isAdmin && (
                                    <View style={[styles.managerBadge, { backgroundColor: colors.warning + '20' }]}>
                                        <Ionicons name="heart-outline" size={12} color={colors.warning} />
                                        <Text style={[styles.managerText, { color: colors.warning }]}>{t('admin:admins.volunteer')}</Text>
                                    </View>
                                )}
                            </View>

                            {!viewOnly && !isRootAdmin && (
                                <View style={styles.actionsColumn}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.managerBtn]}
                                        onPress={() => openManagerModal(user)}
                                    >
                                        <Text style={styles.actionBtnText}>{t('admin:admins.assignManager')}</Text>
                                    </TouchableOpacity>
                                    
                                    {(() => {
                                        const shouldShow = activeTab === 'volunteers' && isVolunteer && !isAdmin && userCanBePromoted;
                                        logger.debug(LOG_SOURCE, 'Button visibility check', {
                                            userId: user.id,
                                            userName: user.name,
                                            activeTab,
                                            isVolunteer,
                                            isAdmin,
                                            userCanBePromoted,
                                            shouldShow
                                        });
                                        return shouldShow;
                                    })() && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                                            onPress={() => {
                                                logger.debug(LOG_SOURCE, 'Promote to admin button pressed', { userId: user.id, userName: user.name });
                                                handleToggleAdmin(user);
                                            }}
                                        >
                                            <Text style={styles.actionBtnText}>{t('admin:admins.promoteToAdmin')}</Text>
                                        </TouchableOpacity>
                                    )}
                                    
                                    {activeTab === 'admins' && isAdmin && userCanBeDemoted && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: colors.warning, marginTop: 8 }]}
                                            onPress={() => handleDemoteToVolunteer(user)}
                                        >
                                            <Text style={styles.actionBtnText}>{t('admin:admins.demoteToVolunteer')}</Text>
                                        </TouchableOpacity>
                                    )}
                                    
                                    {/* Show Promote to Volunteer button for non-volunteers in volunteers tab */}
                                    {activeTab === 'volunteers' && !isVolunteer && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: colors.warning, marginTop: 8 }]}
                                            onPress={() => handlePromoteToVolunteer(user)}
                                        >
                                            <Text style={styles.actionBtnText}>{t('admin:admins.demoteToVolunteer')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            
                            {/* Show protected message for root admin */}
                            {isRootAdmin && (
                                <View style={[styles.managerBadge, { backgroundColor: colors.error + '20', marginTop: 8 }]}>
                                    <Ionicons name="shield-checkmark" size={12} color={colors.error} />
                                    <Text style={[styles.managerText, { color: colors.error }]}>{t('admin:admins.rootAdmin')}</Text>
                                </View>
                            )}
                        </View>
                    );
                }}
            />

            < Modal visible={showManagerModal && !viewOnly} animationType="fade" transparent >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('admin:admins.assignManagerFor', { name: selectedForManager?.name || t('admin:admins.user') })}</Text>
                            <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {selectedForManager?.manager_details && (
                            <View style={styles.currentManagerBox}>
                                <Text style={styles.currentManagerLabel}>{t('admin:admins.currentManager')}</Text>
                                <Text style={styles.currentManagerName}>{selectedForManager.manager_details.name}</Text>
                                <TouchableOpacity
                                    style={[styles.removeManagerBtn, isRemovingManager && { opacity: 0.5 }]}
                                    onPress={viewOnly ? undefined : () => {
                                        logger.debug(LOG_SOURCE, ' Remove manager button pressed in modal');
                                        performRemoveManager();
                                    }}
                                    disabled={viewOnly || isRemovingManager}
                                    activeOpacity={0.7}
                                >
                                    {isRemovingManager ? (
                                        <ActivityIndicator size="small" color={colors.error} />
                                    ) : (
                                        <>
                                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                                            <Text style={styles.removeManagerText}>הסר שיוך</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.modalSubtitle}>
                            {selectedForManager?.manager_details ? t('admin:admins.replaceManager') : t('admin:admins.selectManager')}
                        </Text>

                        <View style={styles.managersList}>
                            <FlatList
                                data={getEligibleManagersForUser(selectedForManager)}
                                keyExtractor={(item) => item.id}
                                style={{ maxHeight: 200 }}
                                renderItem={({ item: manager }) => {
                                    const isSelected = newManager?.id === manager.id;
                                    const isCurrentManager = selectedForManager?.manager_details?.id === manager.id;

                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.managerItem,
                                                isSelected && styles.managerItemSelected,
                                                isCurrentManager && styles.managerItemCurrent
                                            ]}
                                            onPress={() => setNewManager(manager)}
                                        >
                                            <View style={styles.managerItemInfo}>
                                                <Text style={styles.managerItemName}>{manager.name || 'ללא שם'}</Text>
                                                <Text style={styles.managerItemEmail}>{manager.email}</Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                            )}
                                            {isCurrentManager && !isSelected && (
                                                <Text style={styles.currentBadge}>נוכחי</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <Text style={styles.emptyManagersText}>{t('admin:admins.noManagersAvailable')}</Text>
                                }
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowManagerModal(false)}>
                                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>{t('common:cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalBtn,
                                    styles.modalSave,
                                    (!newManager || newManager.id === selectedForManager?.manager_details?.id) && styles.modalBtnDisabled
                                ]}
                                onPress={viewOnly ? undefined : saveManager}
                                disabled={viewOnly || !newManager || newManager.id === selectedForManager?.manager_details?.id}
                            >
                                <Text style={styles.modalBtnText}>{t('common:done')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        ...(Platform.OS === 'web' && {
            position: 'relative',
            minHeight: Dimensions.get('window').height,
        } as ViewStyle),
    },
    flatList: {
        flex: 1,
        ...(Platform.OS === 'web' && {
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
        } as ViewStyle),
    },
    header: { padding: LAYOUT_CONSTANTS.SPACING.LG, backgroundColor: colors.background, alignItems: 'center' },
    title: { fontSize: FontSizes.heading1, fontWeight: 'bold', color: colors.textPrimary },
    tabsContainer: { flexDirection: 'row', padding: 8, margin: 16, backgroundColor: colors.background, borderRadius: 8 },
    tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 4 },
    activeTab: { backgroundColor: colors.primary + '20' },
    tabText: { color: colors.textSecondary },
    activeTabText: { color: colors.primary, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, marginHorizontal: 16, padding: 12, borderRadius: 8 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, textAlign: 'right', fontSize: 16 },
    listContentContainer: { paddingBottom: 100 },

    userCard: { backgroundColor: colors.background, marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flex: 1 },
    userName: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'left' },
    userEmail: { fontSize: 14, color: colors.textSecondary, marginBottom: 4, textAlign: 'left' },
    managerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    managerText: { fontSize: 12, color: colors.primary },

    actionsColumn: { gap: 8 },
    actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center', minWidth: 80 },
    managerBtn: { backgroundColor: colors.info },
    addButton: { backgroundColor: colors.primary },
    removeButton: { backgroundColor: colors.error },
    lockedButton: { backgroundColor: colors.textTertiary },
    actionBtnText: { color: colors.buttonText, fontSize: 12, fontWeight: 'bold' },

    modalBackdrop: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: colors.background, borderRadius: 16, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
    modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, textAlign: 'right' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    modalCancel: { backgroundColor: colors.backgroundSecondary },
    modalSave: { backgroundColor: colors.primary },
    modalBtnDisabled: { backgroundColor: colors.textTertiary },
    modalBtnText: { color: colors.buttonText, fontWeight: 'bold' },

    // Current manager box
    currentManagerBox: {
        backgroundColor: colors.backgroundSecondary,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    currentManagerLabel: { fontSize: 12, color: colors.textSecondary },
    currentManagerName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, flex: 1, marginLeft: 8 },
    removeManagerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.error + '15'
    },
    removeManagerText: { fontSize: 12, color: colors.error, fontWeight: '600' },

    // Managers list
    managersList: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
    managerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background
    },
    managerItemSelected: { backgroundColor: colors.primary + '15' },
    managerItemCurrent: { backgroundColor: colors.info + '10' },
    managerItemInfo: { flex: 1 },
    managerItemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    managerItemEmail: { fontSize: 12, color: colors.textSecondary },
    currentBadge: {
        fontSize: 10,
        color: colors.info,
        fontWeight: 'bold',
        backgroundColor: colors.info + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    emptyManagersText: { padding: 20, textAlign: 'center', color: colors.textSecondary },
});
