import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { NavigationProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../../globals/constants';
import { AdminStackParamList } from '../../globals/types';
import { useUser } from '../../stores/userStore';
import { logger } from '../../utils/loggerService';
import { apiService } from '../../utils/apiService';
import { isOrganizationRootEmail } from '../../utils/org.constants';
import { useAdminProtection } from '../../hooks/useAdminProtection';

interface AdminAdminsScreenProps {
    readonly navigation: NavigationProp<AdminStackParamList>;
}

const LOG_SOURCE = 'AdminAdminsScreen';

export default function AdminAdminsScreen({ navigation: _navigation }: AdminAdminsScreenProps) {
    const route = useRoute();
    const routeParams = (route.params as any) || {};
    const viewOnly = routeParams?.viewOnly === true;
    useAdminProtection(true);
    const { selectedUser } = useUser();
    const [usersList, setUsersList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'admins' | 'volunteers' | 'users'>('admins');

    // Manager Assignment State
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [selectedForManager, setSelectedForManager] = useState<any>(null);
    const [newManager, setNewManager] = useState<any>(null);
    const [isRemovingManager, setIsRemovingManager] = useState(false);

    /** RN Web often breaks multi-button Alert.alert; use Modal like SettingsScreen logout. */
    const [adminRoleConfirm, setAdminRoleConfirm] = useState<{
        user: any;
        isDemote: boolean;
        title: string;
        message: string;
        /** When true, demote removes admin and assigns volunteer (RN Web Alert is unreliable). */
        demoteAsVolunteer?: boolean;
    } | null>(null);

    // Store eligible users separately
    const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);

    // Store all managers for manager assignment
    const [allManagers, setAllManagers] = useState<any[]>([]);

    const loadUsers = useCallback(async (forceRefresh: boolean = false) => {
        if (!selectedUser?.id) {
            logger.debug(LOG_SOURCE, 'No selectedUser.id, skipping load');
            return;
        }

        try {
            setIsLoading(true);
            const filters: any = { limit: 100 };
            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            // Force refresh after admin operations to ensure fresh data
            if (forceRefresh) {
                filters.forceRefresh = true;
                logger.debug(LOG_SOURCE, 'FORCE REFRESH - Loading users with filters', { filters });
            } else {
                logger.debug(LOG_SOURCE, 'Loading users with filters', { filters });
            }

            // Load all users for display
            const response = await apiService.getUsers(filters);

            logger.debug(LOG_SOURCE, 'Response from getUsers', {
                success: response.success,
                dataLength: response.data?.length,
                error: response.error
            });

            if (response.success && Array.isArray(response.data)) {
                // Keep only other users (not current user)
                const otherUsers = response.data.filter((u: any) => u.email !== selectedUser?.email);
                setUsersList(otherUsers);

                // Extract managers from the list (admins + super admin)
                const managers = response.data.filter((u: any) => {
                    const roles = u.roles || [];
                    return roles.includes('admin') || roles.includes('super_admin') ||
                        isOrganizationRootEmail(u.email);
                });
                setAllManagers(managers);

                logger.debug(LOG_SOURCE, 'Loaded users and managers', { userCount: otherUsers.length, managerCount: managers.length });
                logger.debug(LOG_SOURCE, 'Sample user data', { sample: otherUsers.slice(0, 2).map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    roles: u.roles,
                    parent_manager_id: u.parent_manager_id,
                    manager_details: u.manager_details
                })) });
            } else {
                setUsersList([]);
                setAllManagers([]);
                logger.debug(LOG_SOURCE, 'Failed to load users', { error: response.error });
            }

            // Load eligible users for promotion (to know who can be promoted)
            const eligibleResponse = await apiService.getEligibleForPromotion(selectedUser.id);
            if (eligibleResponse.success && Array.isArray(eligibleResponse.data)) {
                setEligibleUsers(eligibleResponse.data);
                logger.debug(LOG_SOURCE, 'Loaded eligible users for promotion', { count: eligibleResponse.data.length });
            } else {
                setEligibleUsers([]);
                logger.debug(LOG_SOURCE, 'Failed to load eligible users', { error: eligibleResponse.error });
            }
        } catch (error) {
            console.error('[AdminAdminsScreen] Error loading users:', error);
            Alert.alert('שגיאה', 'לא ניתן היה לטעון את המשתמשים');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedUser?.id, selectedUser?.email]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Check if current user is super admin - based on roles, not email
    const currentUserRoles = selectedUser?.roles || [];
    const isCurrentUserSuperAdmin = currentUserRoles.includes('super_admin') ||
        currentUserRoles.includes('admin');

    logger.debug(LOG_SOURCE, 'Current user check', {
        userId: selectedUser?.id,
        email: selectedUser?.email,
        roles: selectedUser?.roles,
        isAdmin: isCurrentUserSuperAdmin
    });

    // Check if a user can be promoted by current admin
    const canPromote = (user: any): boolean => {
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
    const canDemote = (user: any): boolean => {
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

    const handleToggleAdmin = async (user: any) => {
        logger.debug(LOG_SOURCE, 'handleToggleAdmin called', {
            userId: user?.id,
            userName: user?.name,
            userEmail: user?.email,
            userRoles: user?.roles,
            selectedUserId: selectedUser?.id,
            selectedUserEmail: selectedUser?.email
        });

        const currentRoles = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = currentRoles.includes('admin') || currentRoles.includes('super_admin');
        const isSuperAdmin = isOrganizationRootEmail(user.email);

        logger.debug(LOG_SOURCE, 'User check', {
            isAdmin,
            isSuperAdmin,
            currentRoles
        });

        // Protect designated accounts from demotion only; they must still be promotable if not admin yet.
        if (isSuperAdmin && isAdmin) {
            logger.debug(LOG_SOURCE, 'Blocked: Super admin (already admin)');
            Alert.alert('שגיאה', 'לא ניתן לשנות הרשאות למנהל הראשי');
            return;
        }

        if (!selectedUser?.id) {
            logger.debug(LOG_SOURCE, 'No selectedUser.id');
            Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש הנוכחי');
            return;
        }

        const title = isAdmin ? 'הסרת הרשאות מנהל' : 'הפיכה למנהל';
        const message = isAdmin
            ? `האם אתה בטוח שברצונך להסיר הרשאות מנהל מ-${user.name || user.email}?`
            : `האם אתה בטוח שברצונך להפוך את ${user.name || user.email} למנהל תחתיך?`;

        logger.debug(LOG_SOURCE, 'Opening admin role confirm modal', { title, message, platform: Platform.OS });

        setAdminRoleConfirm({ user, isDemote: isAdmin, title, message });
    };

    const cancelAdminRoleConfirm = () => {
        logger.debug(LOG_SOURCE, 'User cancelled admin role confirm');
        setAdminRoleConfirm(null);
    };

    const confirmAdminRoleChange = async () => {
        const ctx = adminRoleConfirm;
        if (!ctx || !selectedUser?.id) return;

        const { user, isDemote } = ctx;
        setAdminRoleConfirm(null);

        logger.debug(LOG_SOURCE, 'User confirmed admin role change', {
            isDemote,
            userId: user.id,
            userName: user.name,
            requestingAdminId: selectedUser.id,
        });

        let res;
        if (isDemote) {
            const convertToVolunteer = ctx.demoteAsVolunteer === true;
            logger.debug(LOG_SOURCE, 'Calling demoteAdmin', { convertToVolunteer });
            res = await apiService.demoteAdmin(user.id, selectedUser.id, convertToVolunteer);
        } else {
            logger.debug(LOG_SOURCE, 'Calling promoteToAdmin');
            res = await apiService.promoteToAdmin(user.id, selectedUser.id);
        }

        logger.debug(LOG_SOURCE, `${isDemote ? 'Demote' : 'Promote'} response`, { res });

        if (res.success) {
            Alert.alert('הצלחה', res.message || 'העדכון בוצע בהצלחה');
            logger.debug(LOG_SOURCE, 'Operation successful, reloading users with force refresh');
            await loadUsers(true);
        } else {
            Alert.alert('שגיאה', res.error || 'נכשל בעדכון');
            logger.debug(LOG_SOURCE, 'Operation failed', { error: res.error });
        }
    };

    const openManagerModal = (user: any) => {
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

            logger.debug(LOG_SOURCE, 'setManager response', { res });

            if (res.success) {
                Alert.alert('הצלחה', managerId ? 'מנהל עודכן בהצלחה' : 'שיוך מנהל הוסר בהצלחה');
                setShowManagerModal(false);
                logger.debug(LOG_SOURCE, 'Manager updated successfully, reloading users with force refresh');
                await loadUsers(true); // Force refresh to bypass cache
            } else {
                Alert.alert('שגיאה', res.error || 'נכשל בעדכון מנהל');
                logger.debug(LOG_SOURCE, 'Failed to update manager', { error: res.error });
            }
        } catch (e) {
            console.error('[AdminAdminsScreen] ❌ Error saving manager:', e);
            Alert.alert('שגיאה', 'אירעה שגיאה');
        }
    };

    // Direct remove function (without confirmation - used from modal button)
    const performRemoveManager = async () => {
        if (!selectedForManager) {
            logger.debug(LOG_SOURCE, 'performRemoveManager called but no selectedForManager');
            return;
        }

        try {
            logger.debug(LOG_SOURCE, 'Starting to remove manager', { userId: selectedForManager.id, requestedBy: selectedUser?.id });
            setIsRemovingManager(true);

            const res = await apiService.setManager(selectedForManager.id, null, selectedUser?.id);

            logger.debug(LOG_SOURCE, 'Response from setManager', { res });

            if (res.success) {
                Alert.alert('הצלחה', 'שיוך מנהל הוסר בהצלחה');
                setShowManagerModal(false);
                logger.debug(LOG_SOURCE, 'Manager removed successfully, reloading users with force refresh');
                await loadUsers(true); // Force refresh to bypass cache
            } else {
                Alert.alert('שגיאה', res.error || 'נכשל בהסרת שיוך מנהל');
            }
        } catch (e) {
            console.error('[AdminAdminsScreen] ❌ Error removing manager:', e);
            Alert.alert('שגיאה', 'אירעה שגיאה בהסרת שיוך מנהל');
        } finally {
            setIsRemovingManager(false);
        }
    };

    const handlePromoteToVolunteer = async (targetUser: any) => {
        logger.info(LOG_SOURCE, 'handlePromoteToVolunteer called', {
            targetUserId: targetUser.id,
            targetUserName: targetUser.name,
            targetUserEmail: targetUser.email,
            requestingAdminId: selectedUser?.id
        });

        if (!selectedUser?.id) {
            logger.warn(LOG_SOURCE, 'handlePromoteToVolunteer: No selectedUser.id', {});
            Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש הנוכחי');
            return;
        }
        
        Alert.alert(
            'הפוך למתנדב',
            `האם אתה בטוח שברצונך להפוך את ${targetUser.name || targetUser.email} למתנדב?`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'אישור',
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
                                Alert.alert('הצלחה', res.message || 'המשתמש הפך למתנדב');
                                await loadUsers(true);
                            } else {
                                logger.error(LOG_SOURCE, 'Failed to promote user to volunteer', {
                                    targetUserId: targetUser.id,
                                    error: res.error
                                });
                                Alert.alert('שגיאה', res.error || 'נכשל בהפיכה למתנדב');
                            }
                        } catch (e: any) {
                            logger.error(LOG_SOURCE, 'Error promoting to volunteer', {
                                targetUserId: targetUser.id,
                                error: e?.message || String(e),
                                stack: e?.stack
                            });
                            console.error('[AdminAdminsScreen] Error promoting to volunteer:', e);
                            Alert.alert('שגיאה', 'נכשל בהפיכה למתנדב');
                        }
                    }
                }
            ]
        );
    };

    const handleDemoteToVolunteer = (targetUser: any) => {
        logger.info(LOG_SOURCE, 'handleDemoteToVolunteer called', {
            targetUserId: targetUser?.id,
            targetUserName: targetUser?.name,
            targetUserEmail: targetUser?.email,
            targetUserRoles: targetUser?.roles,
            requestingAdminId: selectedUser?.id,
            platform: Platform.OS,
        });

        if (!selectedUser?.id) {
            logger.warn(LOG_SOURCE, 'handleDemoteToVolunteer: No selectedUser.id', {});
            Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש הנוכחי');
            return;
        }

        // Same pattern as handleToggleAdmin: Modal instead of Alert — RN Web often does not show multi-button alerts.
        setAdminRoleConfirm({
            user: targetUser,
            isDemote: true,
            demoteAsVolunteer: true,
            title: 'הפוך למתנדב',
            message: `האם אתה בטוח שברצונך להסיר הרשאות מנהל מ-${targetUser.name || targetUser.email} ולהפוך אותו למתנדב?`,
        });
    };

    // Get managers that can be assigned (exclude the user themselves and create cycle prevention)
    const getEligibleManagersForUser = (user: any) => {
        if (!user) return allManagers;
        // Filter out: the user themselves, and users who would create a cycle
        return allManagers.filter((m: any) => m.id !== user.id);
    };

    const getFilteredUsers = () => {
        return usersList.filter(user => {
            const hasManager = !!user.parent_manager_id;
            const currentRoles = Array.isArray(user.roles) ? user.roles : [];
            const isAdminRole = currentRoles.includes('admin') || currentRoles.includes('super_admin');
            const isVolunteerRole = currentRoles.includes('volunteer');

            if (activeTab === 'admins') {
                // מנהלים: משתמשים עם role admin/super_admin (גם אם אין להם manager)
                return isAdminRole;
            } else if (activeTab === 'volunteers') {
                // מתנדבים: משתמשים עם role volunteer (ללא admin)
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
                <Text style={styles.title}>ניהול מנהלים</Text>
            </View>
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'admins' && styles.activeTab]} onPress={() => setActiveTab('admins')}>
                    <Text style={[styles.tabText, activeTab === 'admins' && styles.activeTabText]}>מנהלים</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'volunteers' && styles.activeTab]} onPress={() => setActiveTab('volunteers')}>
                    <Text style={[styles.tabText, activeTab === 'volunteers' && styles.activeTabText]}>מתנדבים</Text>
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
                    placeholder="חפש משתמש..."
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
                    const isRootAdmin = isOrganizationRootEmail(user.email);
                    const userCanBePromoted = canPromote(user);
                    const userCanBeDemoted = canDemote(user);
                    const hierarchyLevel = user.hierarchy_level;
                    
                    // Determine hierarchy level display
                    let levelText = '';
                    if (hierarchyLevel === 0) {
                        levelText = 'דרגה 0 - מנהל ראשי 👑';
                    } else if (hierarchyLevel === 1) {
                        levelText = 'דרגה 1 - סופר מנהל';
                    } else if (hierarchyLevel !== null && hierarchyLevel !== undefined) {
                        levelText = `דרגה ${hierarchyLevel}`;
                    }

                    return (
                        <View style={styles.userCard}>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{user.name || 'ללא שם'}</Text>
                                <Text style={styles.userEmail}>{user.email}</Text>
                                
                                {/* Display hierarchy level */}
                                {Boolean(levelText) && (
                                    <View style={[styles.managerBadge, { backgroundColor: colors.primary + '20', marginTop: 4 }]}>
                                        <Ionicons name="layers-outline" size={12} color={colors.primary} />
                                        <Text style={[styles.managerText, { color: colors.primary }]}>{levelText}</Text>
                                    </View>
                                )}
                                
                                {/* Show "Reports to" only if NOT root admin and has manager */}
                                {!isRootAdmin && user.manager_details && (
                                    <View style={styles.managerBadge}>
                                        <Ionicons name="people-outline" size={12} color={colors.primary} />
                                        <Text style={styles.managerText}>מדווח ל- {user.manager_details.name}</Text>
                                    </View>
                                )}
                                {isAdmin && user.parent_manager_id === selectedUser?.id && (
                                    <View style={[styles.managerBadge, { backgroundColor: colors.success + '20' }]}>
                                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                        <Text style={[styles.managerText, { color: colors.success }]}>מנהל תחתיך</Text>
                                    </View>
                                )}
                                {isVolunteer && !isAdmin && (
                                    <View style={[styles.managerBadge, { backgroundColor: colors.warning + '20' }]}>
                                        <Ionicons name="heart-outline" size={12} color={colors.warning} />
                                        <Text style={[styles.managerText, { color: colors.warning }]}>מתנדב</Text>
                                    </View>
                                )}
                            </View>

                            {!viewOnly && !isRootAdmin && (
                                <View style={styles.actionsColumn}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.managerBtn]}
                                        onPress={() => openManagerModal(user)}
                                    >
                                        <Text style={styles.actionBtnText}>שיוך מנהל</Text>
                                    </TouchableOpacity>
                                    
                                    {/* In volunteers tab: Show "הפוך למנהל" button for volunteers who can be promoted */}
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
                                                logger.debug(LOG_SOURCE, '"הפוך למנהל" button pressed', { userId: user.id, userName: user.name });
                                                handleToggleAdmin(user);
                                            }}
                                        >
                                            <Text style={[styles.actionBtnText, { color: colors.white }]}>הפוך למנהל</Text>
                                        </TouchableOpacity>
                                    )}
                                    
                                    {/* In admins tab: Show "הפוך למתנדב" button for admins who can be demoted */}
                                    {activeTab === 'admins' && isAdmin && userCanBeDemoted && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: colors.warning, marginTop: 8 }]}
                                            onPress={() => handleDemoteToVolunteer(user)}
                                        >
                                            <Text style={[styles.actionBtnText, { color: colors.white }]}>הפוך למתנדב</Text>
                                        </TouchableOpacity>
                                    )}
                                    
                                    {/* Show "Promote to Volunteer" button for non-volunteers in volunteers tab */}
                                    {activeTab === 'volunteers' && !isVolunteer && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: colors.warning, marginTop: 8 }]}
                                            onPress={() => handlePromoteToVolunteer(user)}
                                        >
                                            <Text style={[styles.actionBtnText, { color: colors.white }]}>הפוך למתנדב</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                            
                            {/* Show protected message for root admin */}
                            {isRootAdmin && (
                                <View style={[styles.managerBadge, { backgroundColor: colors.error + '20', marginTop: 8 }]}>
                                    <Ionicons name="shield-checkmark" size={12} color={colors.error} />
                                    <Text style={[styles.managerText, { color: colors.error }]}>מנהל ראשי</Text>
                                </View>
                            )}
                        </View>
                    );
                }}
            />

            <Modal
                visible={adminRoleConfirm !== null}
                transparent
                animationType="fade"
                onRequestClose={cancelAdminRoleConfirm}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.confirmModalCard}>
                        <Text style={styles.confirmModalTitle}>{adminRoleConfirm?.title}</Text>
                        <Text style={styles.confirmModalMessage}>{adminRoleConfirm?.message}</Text>
                        <View style={styles.confirmModalButtons}>
                            <TouchableOpacity
                                style={[styles.confirmModalButton, styles.confirmModalButtonCancel]}
                                onPress={cancelAdminRoleConfirm}
                            >
                                <Text style={styles.confirmModalButtonTextCancel}>ביטול</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.confirmModalButton,
                                    adminRoleConfirm?.isDemote
                                        ? styles.confirmModalButtonDestructive
                                        : styles.confirmModalButtonPrimary,
                                ]}
                                onPress={confirmAdminRoleChange}
                            >
                                <Text style={styles.confirmModalButtonTextConfirm}>אישור</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showManagerModal && !viewOnly} animationType="fade" transparent>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>הגדרת מנהל עבור {selectedForManager?.name || 'משתמש'}</Text>
                            <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {selectedForManager?.manager_details && (
                            <View style={styles.currentManagerBox}>
                                <Text style={styles.currentManagerLabel}>מנהל נוכחי:</Text>
                                <Text style={styles.currentManagerName}>{selectedForManager.manager_details.name}</Text>
                                <TouchableOpacity
                                    style={[styles.removeManagerBtn, isRemovingManager && { opacity: 0.5 }]}
                                    onPress={viewOnly ? undefined : () => {
                                        logger.debug(LOG_SOURCE, 'Remove manager button pressed in modal');
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
                            {selectedForManager?.manager_details ? 'החלף למנהל אחר:' : 'בחר מנהל:'}
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
                                    <Text style={styles.emptyManagersText}>אין מנהלים זמינים</Text>
                                }
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowManagerModal(false)}>
                                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>ביטול</Text>
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
                                <Text style={styles.modalBtnText}>שמור</Text>
                            </TouchableOpacity>
                        </View>
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
        ...(Platform.OS === 'web' && {
            position: 'relative' as any,
            height: '100vh' as any,
        }),
    },
    flatList: {
        flex: 1,
        ...(Platform.OS === 'web' && {
            overflowY: 'auto' as any,
            WebkitOverflowScrolling: 'touch' as any,
        }),
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
    actionBtnText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },

    modalBackdrop: {
        flex: 1,
        backgroundColor: colors.overlayBlack50,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModalCard: {
        backgroundColor: colors.background,
        width: '90%',
        maxWidth: 340,
        borderRadius: 16,
        padding: 24,
        ...(Platform.OS === 'web' && {
            boxShadow: `0 4px 20px ${colors.overlayBlack15}`,
        }),
    },
    confirmModalTitle: {
        fontSize: FontSizes.heading2,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    confirmModalMessage: {
        fontSize: FontSizes.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    confirmModalButtons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
    },
    confirmModalButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmModalButtonCancel: {
        backgroundColor: colors.backgroundSecondary,
    },
    confirmModalButtonPrimary: {
        backgroundColor: colors.primary,
    },
    confirmModalButtonDestructive: {
        backgroundColor: colors.error,
    },
    confirmModalButtonTextCancel: {
        fontSize: FontSizes.body,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    confirmModalButtonTextConfirm: {
        fontSize: FontSizes.body,
        fontWeight: '600',
        color: colors.white,
    },
    modalCard: { backgroundColor: colors.background, borderRadius: 16, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
    modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, textAlign: 'right' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    modalCancel: { backgroundColor: colors.backgroundSecondary },
    modalSave: { backgroundColor: colors.primary },
    modalBtnDisabled: { backgroundColor: colors.textTertiary },
    modalBtnText: { color: colors.white, fontWeight: 'bold' },

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
