import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';

export function useAdminProtection(allowViewOnly?: boolean) {
    const { isAdmin, isLoading, selectedUser, refreshUserRoles, isAuthenticated, isGuestMode } = useUser();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const route = useRoute();
    const routeParams = (route.params as { viewOnly?: boolean }) || {};
    const isViewOnly = routeParams?.viewOnly === true;
    const isVerifyingRef = useRef(false);
    const lastCheckRef = useRef<number>(0);

    const handleUnauthorized = useCallback(() => {
        Alert.alert('שגיאה', 'אין לך הרשאות לצפות בדף זה');
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('HomeStack', { screen: 'HomeScreen' });
        }
    }, [navigation]);

    const verifyAdminStatus = useCallback(async () => {
        // Prevent multiple simultaneous checks
        if (!selectedUser?.id || isVerifyingRef.current) return;

        // Throttle checks - don't check more than once every 5 seconds
        const now = Date.now();
        if (now - lastCheckRef.current < 5000) {
            return;
        }

        try {
            isVerifyingRef.current = true;
            lastCheckRef.current = now;

            logger.debug('useAdminProtection', 'Verifying admin status for user', { email: selectedUser.email });

            // Refresh user roles from database
            // This will update the store if roles changed
            await refreshUserRoles();

            // The isAdmin flag will be updated automatically by the store
            // If it becomes false, the next render will catch it in the local check below

        } catch (err) {
            logger.warn('useAdminProtection', 'Admin verification failed (network error or other)', { error: err });
        } finally {
            isVerifyingRef.current = false;
        }
    }, [selectedUser?.id, selectedUser?.email, refreshUserRoles]);

    useFocusEffect(
        useCallback(() => {
            // If view-only mode is allowed and active, allow everyone (including unauthenticated)
            if (allowViewOnly && isViewOnly) {
                // In view-only mode, allow everyone - no authentication required
                logger.debug('useAdminProtection', 'View-only protection: Allowing access (view-only mode)');
                return;
            }

            // 1. Immediate local check for admin access
            if (!isLoading && !isAdmin) {
                logger.debug('useAdminProtection', 'User not admin (local check), redirecting');
                handleUnauthorized();
                return;
            }

            // 2. Server check if locally admin
            // This runs every time the screen comes into focus
            if (!isLoading && isAdmin && selectedUser) {
                verifyAdminStatus();
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps -- isAuthenticated/isGuestMode used only in return, not in callback
        }, [isAdmin, isLoading, selectedUser, verifyAdminStatus, handleUnauthorized, allowViewOnly, isViewOnly])
    );

    return { isAuthorized: isAdmin || (allowViewOnly && isViewOnly && (isAuthenticated || isGuestMode)) };
}
