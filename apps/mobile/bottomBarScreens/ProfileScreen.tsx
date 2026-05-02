// File overview:
// - Purpose: Unified profile screen that works for both own profile and other users' profiles.
// - Reached from: `ProfileTabStack` initial route 'ProfileScreen' via `BottomNavigator` (own profile) or via navigation with params (other user's profile).
// - Split implementation: `profile/` (content, tab routes, styles, helpers, types).
// screens/ProfileScreen.tsx
import { Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { ProfileScreenContent } from './profile/ProfileScreenContent';
import { ProfileScreenWithTabBar } from './profile/ProfileScreenWithTabBar';
import type { ProfileScreenRouteParams } from './profile/profileScreenTypes';
import { logger } from '../utils/loggerService';

export default function ProfileScreen(props: any) {
  const route = useRoute();
  let routeParams = route.params as ProfileScreenRouteParams | undefined;

  // On Web, handle refresh (F5) by restoring params from localStorage if route params are missing
  const STORAGE_KEY = 'profileScreenParams';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !routeParams && !props?.userId) {
    // Try to restore from localStorage when route params are missing (after refresh)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedParams = JSON.parse(stored);
        routeParams = parsedParams;
        logger.debug('ProfileScreen', 'Restored params from localStorage', { parsedParams });
      }
    } catch (error) {
      console.warn('Failed to restore params from localStorage:', error);
    }
  }

  // Allow props to override route params (useful when used as a child component)
  const propUserId = props?.userId;
  const propUserName = props?.userName;
  const propCharacterData = props?.characterData;
  const isExplicitOtherProfile = props?.isExplicitOtherProfile === true;

  // Use restored params if props are not provided
  const externalUserId = propUserId || routeParams?.userId;
  const { selectedUser } = useUser();

  // Determine if viewing own profile or other user's profile
  // CRITICAL: If externalUserId exists and equals selectedUser.id, it's OWN profile!
  // Only if externalUserId exists and is DIFFERENT from selectedUser.id, it's another user's profile
  // If no externalUserId, it's own profile (default - viewing from ProfileTabStack)

  // Normalize IDs to strings for comparison (in case one is number and one is string)
  const normalizedExternalUserId = externalUserId ? String(externalUserId).trim() : null;
  const normalizedSelectedUserId = selectedUser?.id ? String(selectedUser.id).trim() : null;

  // Check if viewing other user:
  // 1. Explicitly requested via prop
  // 2. externalUserId exists AND it's different from selectedUser.id
  const isViewingOtherUser = isExplicitOtherProfile ||
    (normalizedExternalUserId &&
      normalizedSelectedUserId &&
      normalizedExternalUserId !== normalizedSelectedUserId);

  logger.debug('ProfileScreen', 'Route check', {
    externalUserId,
    propUserId,
    normalizedExternalUserId,
    selectedUserId: selectedUser?.id,
    normalizedSelectedUserId,
    isViewingOtherUser,
    isExplicitOtherProfile,
    areEqual: normalizedExternalUserId === normalizedSelectedUserId,
    hasExternalUserId: !!externalUserId,
    hasSelectedUser: !!selectedUser,
  });

  // If explicitly viewing other profile but no user ID, we need to handle it in Content
  // Pass params to Content
  const passedParams: ProfileScreenRouteParams = {
    userId: externalUserId,
    userName: propUserName || routeParams?.userName,
    characterData: propCharacterData || routeParams?.characterData
  };

  if (isViewingOtherUser) {
    // Viewing another user's profile - not in bottom tab navigator
    // Use ProfileScreenContent directly with tabBarHeight = 0 (no hook call)
    logger.debug('ProfileScreen', 'Using ProfileScreenContent (other user)');
    // Pass the params via route override or similar mechanism if ProfileScreenContent relies on useRoute
    // Actually ProfileScreenContent calls useRoute(). We should probably pass props to it.
    // Let's modify ProfileScreenContent to accept overrides.
    return <ProfileScreenContent tabBarHeight={0} manualParams={passedParams} forceOtherProfile={true} />;
  }

  // Viewing own profile (either no externalUserId, or externalUserId === selectedUser.id)
  // In bottom tab navigator, can use the hook
  logger.debug('ProfileScreen', 'Using ProfileScreenWithTabBar (own profile)');
  return <ProfileScreenWithTabBar />;
}
