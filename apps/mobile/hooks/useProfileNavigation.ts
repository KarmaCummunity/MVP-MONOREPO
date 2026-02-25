import { useNavigation } from '@react-navigation/native';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';

export const useProfileNavigation = () => {
    const navigation = useNavigation<any>();
    const { selectedUser: currentUser } = useUser();

    const navigateToProfile = (targetUserId: string, targetUserName: string, fromScreen: string = 'Feed') => {
        logger.debug('useProfileNavigation', 'Navigating to profile', {
            targetUserId,
            targetUserName,
            currentUserId: currentUser?.id
        });

        if (!targetUserId) {
            logger.warn('useProfileNavigation', 'Cannot navigate to profile - missing userId');
            return;
        }

        const isOwnProfile = targetUserId === currentUser?.id;

        if (isOwnProfile) {
            _navigateToOwnProfile(navigation, currentUser);
        } else {
            _navigateToUserProfile(navigation, targetUserId, targetUserName);
        }
    };

    return { navigateToProfile };
};

// Helper: Traverse to find BottomNavigator or correct stack for Own Profile
const _navigateToOwnProfile = (navigation: any, currentUser: any) => {
    try {
        logger.debug('useProfileNavigation', 'Attempting navigation to own profile (Tab)');

        // Strategy 1: Direct Tab Navigation if available in root
        // This is often the most reliable for BottomTabs
        try {
            navigation.navigate('ProfileScreen');
            return;
        } catch (err) {
            // Ignore, try next strategy
        }

        // Strategy 2: Find Parent Navigator (BottomTabs)
        let parent = navigation.getParent();
        while (parent) {
            const state = parent.getState();
            if (state?.type === 'tab' || state?.routeNames?.includes('ProfileScreen')) {
                parent.navigate('ProfileScreen');
                return;
            }
            parent = parent.getParent();
        }

        logger.warn('useProfileNavigation', 'Could not find ProfileScreen tab, falling back');
        // Fallback behavior: if we really can't find the tab, we might be in a detached stack.
        // But for the user request, they specifically want the "ProfileMain" (which implies the tab root).

        // If all else fails, forcing a navigate might work if 'ProfileScreen' is registered globally
        navigation.navigate('ProfileScreen');

    } catch (error) {
        logger.error('useProfileNavigation', 'Error navigating to ProfileScreen tab', { error });
        // Absolute fallback to user profile screen if the system is completely broken
        if (currentUser) {
            _navigateToUserProfile(navigation, currentUser.id, currentUser.name || 'My Profile');
        }
    }
};

// Helper: Navigate to generic UserProfileScreen
const _navigateToUserProfile = (navigation: any, userId: string, userName: string) => {
    try {
        // Try to navigate via HomeTabStack first to keep bottom bar
        let bottomNavigator = null;
        let currentNav = navigation;
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

        const params = {
            userId: userId,
            userName: userName,
            characterData: null
        };

        if (bottomNavigator) {
            bottomNavigator.navigate('HomeScreen', {
                screen: 'UserProfileScreen',
                params
            });
            return;
        }

        // Standard navigation
        const parentNavigator = navigation.getParent();
        if (parentNavigator) {
            try {
                parentNavigator.navigate('HomeScreen', {
                    screen: 'UserProfileScreen',
                    params
                });
            } catch (e) {
                parentNavigator.navigate('UserProfileScreen', params);
            }
        } else {
            navigation.navigate('UserProfileScreen', params);
        }

    } catch (error) {
        logger.error('useProfileNavigation', 'Error navigating to UserProfileScreen', { error, userId });
        navigation.navigate('UserProfileScreen', {
            userId: userId,
            userName: userName,
            characterData: null
        });
    }
};
