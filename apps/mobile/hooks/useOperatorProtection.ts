import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';

/**
 * Restricts a screen to operator workspace users (operator role) or
 * admin/super_admin oversight (SRS §2.14). Mirrors useAdminProtection pattern.
 */
export function useOperatorProtection(allowViewOnly?: boolean) {
  const { isOperator, isLoading, selectedUser, refreshUserRoles, isAuthenticated, isGuestMode } =
    useUser();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = (route.params as any) || {};
  const isViewOnly = routeParams?.viewOnly === true;
  const isVerifyingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  const handleUnauthorized = useCallback(() => {
    Alert.alert('שגיאה', 'אין לך הרשאות לצפות בדף זה');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeStack');
    }
  }, [navigation]);

  const verifyOperatorStatus = useCallback(async () => {
    if (!selectedUser?.id || isVerifyingRef.current) return;

    const now = Date.now();
    if (now - lastCheckRef.current < 5000) {
      return;
    }

    try {
      isVerifyingRef.current = true;
      lastCheckRef.current = now;
      await refreshUserRoles();
    } catch (err) {
      logger.warn('Auth', 'Operator verification failed', { err });
    } finally {
      isVerifyingRef.current = false;
    }
  }, [selectedUser?.id, refreshUserRoles]);

  useFocusEffect(
    useCallback(() => {
      if (allowViewOnly && isViewOnly) {
        return;
      }

      if (!isLoading && !isOperator) {
        handleUnauthorized();
        return;
      }

      if (!isLoading && isOperator && selectedUser) {
        verifyOperatorStatus();
      }
    }, [
      isOperator,
      isLoading,
      selectedUser,
      verifyOperatorStatus,
      handleUnauthorized,
      allowViewOnly,
      isViewOnly,
    ]),
  );

  return {
    isAuthorized: isOperator || (allowViewOnly && isViewOnly && (isAuthenticated || isGuestMode)),
  };
}
