// File overview:
// - Purpose: Utility functions for profile completion checks and About screen auto-open logic
// - Reached from: MainNavigator, HomeScreen, and other components that need to check profile completion
// - Provides: Functions to check if profile is complete and to manage About screen auto-open state

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../stores/userStore';

/**
 * Storage key for tracking if user has seen the About screen
 */
const ABOUT_SCREEN_SEEN_KEY = 'karma_about_screen_seen';

/**
 * Check if a name is a full name (at least 2 parts and 4 characters total)
 */
const isFullName = (name?: string): boolean => {
  if (!name) return false;
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts.join(' ').length >= 4;
};

/**
 * Check if user profile is complete
 * Profile is considered complete when:
 * - Has avatar
 * - Has full name (at least 2 parts, 4+ characters)
 * - Has address (city and country)
 */
export const isProfileComplete = (user: User | null): boolean => {
  if (!user) return false;
  
  const hasAvatar = Boolean(user.avatar);
  const hasFullName = isFullName(user.name);
  const hasAddress = Boolean(
    user.location && 
    user.location.city && 
    user.location.country
  );
  
  return hasAvatar && hasFullName && hasAddress;
};

/**
 * Check if user has already seen the About screen
 */
export const hasSeenAboutScreen = async (): Promise<boolean> => {
  try {
    const seen = await AsyncStorage.getItem(ABOUT_SCREEN_SEEN_KEY);
    return seen === 'true';
  } catch (error) {
    console.error('Error checking About screen seen status:', error);
    return false;
  }
};

/**
 * Mark that user has seen the About screen
 */
export const markAboutScreenSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ABOUT_SCREEN_SEEN_KEY, 'true');
  } catch (error) {
    console.error('Error marking About screen as seen:', error);
  }
};

/**
 * Check if About screen should auto-open
 * Returns true if:
 * - User is authenticated (not guest)
 * - Profile is NOT complete
 * - User has NOT seen the About screen yet
 */
export const shouldAutoOpenAboutScreen = async (
  user: User | null,
  isGuestMode: boolean,
  isAuthenticated: boolean
): Promise<boolean> => {
  // Don't auto-open for guest users
  if (isGuestMode || !isAuthenticated) {
    return false;
  }
  
  // Don't auto-open if profile is already complete
  if (isProfileComplete(user)) {
    // If profile is complete, mark as seen so it won't open again
    await markAboutScreenSeen();
    return false;
  }
  
  // Don't auto-open if user has already seen it
  const hasSeen = await hasSeenAboutScreen();
  if (hasSeen) {
    return false;
  }
  
  // Auto-open if profile is incomplete and user hasn't seen it
  return true;
};

/**
 * Reset About screen seen status (useful for testing or if user wants to see it again)
 */
export const resetAboutScreenSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ABOUT_SCREEN_SEEN_KEY);
  } catch (error) {
    console.error('Error resetting About screen seen status:', error);
  }
};









