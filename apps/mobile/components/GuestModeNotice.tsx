import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../globals/colors';
import { useUser } from '../stores/userStore';
import { useWebMode } from '../stores/webModeStore';
import { useTranslation } from 'react-i18next';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import { logger } from '../utils/loggerService';

interface GuestModeNoticeProps {
  variant?: 'default' | 'compact';
  showLoginButton?: boolean;
}

const GuestModeNotice: React.FC<GuestModeNoticeProps> = ({ 
  variant = 'default',
  showLoginButton = true 
}) => {
  const navigation = useNavigation<any>();
  const { signOut } = useUser();
  const { mode } = useWebMode();
  const { t } = useTranslation(['common']);

  const handleLoginPress = async () => {
    logger.debug('GuestModeNotice', 'Login button pressed, performing sign out');
    try {
      await signOut();
      logger.debug('GuestModeNotice', 'Sign out completed');
      
      // Determine target route based on web mode
      const targetRoute = (Platform.OS === 'web' && mode === 'site') 
        ? 'LandingSiteScreen' 
        : 'LoginScreen';
      
      // Check guards before navigation
      const guardContext = {
        isAuthenticated: false, // After sign out
        isGuestMode: false,
        isAdmin: false,
        mode,
      };

      const guardResult = await checkNavigationGuards(
        {
          type: 'reset',
          index: 0,
          routes: [{ name: targetRoute }],
        },
        guardContext
      );

      if (!guardResult.allowed) {
        // If guard blocks, try redirect if provided
        if (guardResult.redirectTo) {
          await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
        }
        return;
      }

      // Use navigation queue with high priority (2) for auth changes
      await navigationQueue.reset(0, [{ name: targetRoute }], 2);
    } catch (error) {
      logger.error('GuestModeNotice', 'Error during sign out', { error });
      // Fallback navigation
      const targetRoute = (Platform.OS === 'web' && mode === 'site') 
        ? 'LandingSiteScreen' 
        : 'LoginScreen';
      await navigationQueue.reset(0, [{ name: targetRoute }], 2);
    }
  };

  return (
    <>
      {showLoginButton && (
        <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
          <Text style={styles.loginButtonText}>{t('common:guestLoginHint')}</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRightWidth: 4,
    borderRightColor: colors.warning,
  },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  text: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  loginButton: {
    margin: 10,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  compactContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 20,
    marginVertical: 5,
  },
  compactText: {
    flex: 1,
    marginRight: 6,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  compactLoginButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  compactLoginText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

export default GuestModeNotice; 