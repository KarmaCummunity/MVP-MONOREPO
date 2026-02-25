/**
 * Google Login using Firebase Authentication
 * THE SIMPLEST SOLUTION THAT ACTUALLY WORKS!
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { useUser } from '../stores/userStore';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/config.constants';
import { createShadowStyle } from '../globals/styles';
import colors from '../globals/colors';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import { logger } from '../utils/loggerService';

export default function FirebaseGoogleButton() {
  const { t } = useTranslation(['auth']);
  const { setSelectedUserWithMode, isAuthenticated, isGuestMode } = useUser();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    logger.info('FirebaseGoogleButton', 'Google login started');

    if (Platform.OS !== 'web') {
      logger.error('FirebaseGoogleButton', 'Platform is not web', { platform: Platform.OS });
      alert('Google login is currently available on web only');
      return;
    }

    try {
      logger.debug('FirebaseGoogleButton', 'Setting loading state');
      setLoading(true);
      setError('');

      logger.debug('FirebaseGoogleButton', 'Getting Firebase instance');
      const { app } = getFirebase();
      logger.debug('FirebaseGoogleButton', 'Firebase app status', { exists: !!app });

      logger.debug('FirebaseGoogleButton', 'Getting Auth instance');
      const auth = getAuth(app);
      logger.debug('FirebaseGoogleButton', 'Auth status', { exists: !!auth });

      logger.debug('FirebaseGoogleButton', 'Creating Google Provider');
      const provider = new GoogleAuthProvider();
      logger.debug('FirebaseGoogleButton', 'Provider created');

      logger.debug('FirebaseGoogleButton', 'Setting provider parameters');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      logger.debug('FirebaseGoogleButton', 'Parameters set');

      logger.debug('FirebaseGoogleButton', 'Opening Google popup');
      const result = await signInWithPopup(auth, provider);

      logger.debug('FirebaseGoogleButton', 'Popup returned', { hasResult: !!result });

      // Extract Google Credential to get the Google Access Token and ID Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken;
      const googleIdToken = credential?.idToken;

      logger.debug('FirebaseGoogleButton', 'Google credentials extracted', {
        hasAccessToken: !!googleAccessToken,
        hasIdToken: !!googleIdToken,
      });

      const user = result.user;
      logger.debug('FirebaseGoogleButton', 'User data received', {
        uid: user.uid,
        email: user.email,
      });

      logger.debug('FirebaseGoogleButton', 'Sending to server for verification', {
        apiUrl: API_BASE_URL,
        firebaseUid: user.uid,
      });

      // Send Google tokens and Firebase UID to server
      // Firebase UID is different from Google ID - we need to send it separately
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `KarmaCommunity-${Platform.OS}`,
        },
        body: JSON.stringify({
          idToken: googleIdToken,
          accessToken: googleAccessToken,
          firebaseUid: user.uid, // Send Firebase UID (from Firebase Auth)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('FirebaseGoogleButton', 'Server error response', {
          errorData,
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }

      const serverResponse = await response.json();

      if (!serverResponse.success || !serverResponse.user) {
        throw new Error(serverResponse.error || 'Invalid response from server');
      }

      logger.info('FirebaseGoogleButton', 'Server authentication successful', {
        userId: serverResponse.user.id,
        email: serverResponse.user.email,
        hasTokens: !!serverResponse.tokens,
      });

      // Save JWT tokens if provided
      if (serverResponse.tokens) {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('jwt_access_token', serverResponse.tokens.accessToken);
        await AsyncStorage.default.setItem('jwt_refresh_token', serverResponse.tokens.refreshToken);
        await AsyncStorage.default.setItem('jwt_token_expires_at', 
          String(Date.now() + (serverResponse.tokens.expiresIn * 1000))
        );
        logger.debug('FirebaseGoogleButton', 'JWT tokens saved to storage');
      }

      // Use server-verified user data
      const serverUser = serverResponse.user;
      
      
      const userData = {
        id: serverUser.id,
        name: serverUser.name || user.displayName || user.email?.split('@')[0] || 'User',
        email: serverUser.email || user.email || '',
        avatar: serverUser.avatar || serverUser.avatar_url || user.photoURL || 'https://i.pravatar.cc/150?img=1',
        phone: user.phoneNumber || '+972500000000',
        bio: serverUser.bio || '',
        karmaPoints: serverUser.karmaPoints || 0,
        joinDate: serverUser.joinDate || new Date().toISOString(),
        isActive: serverUser.isActive !== false,
        lastActive: serverUser.lastActive || new Date().toISOString(),
        location: serverUser.location || { city: 'ישראל', country: 'IL' },
        interests: serverUser.interests || [],
        roles: serverUser.roles || ['user'],
        postsCount: serverUser.postsCount || 0,
        followersCount: serverUser.followersCount || 0,
        followingCount: serverUser.followingCount || 0,
        notifications: serverUser.notifications || [
          { type: 'system', text: 'ברוך הבא לקרמה קומיוניטי!', date: new Date().toISOString() }
        ],
        settings: serverUser.settings || {
          language: 'he',
          darkMode: false,
          notificationsEnabled: true
        }
      };
      logger.debug('FirebaseGoogleButton', 'User data prepared from server', {
        email: userData.email,
      });

      logger.debug('FirebaseGoogleButton', 'Saving to UserStore');
      await setSelectedUserWithMode(userData, 'real');
      logger.debug('FirebaseGoogleButton', 'UserStore updated');

      logger.debug('FirebaseGoogleButton', 'Saving to AsyncStorage');
      await AsyncStorage.setItem('current_user', JSON.stringify(userData));
      await AsyncStorage.setItem('auth_mode', 'real');
      logger.debug('FirebaseGoogleButton', 'AsyncStorage updated');

      // Give React time to update state and re-render before navigation
      // Use longer timeout for iOS/mobile web to ensure state is fully updated
      const isMobileWeb = Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth <= 768;
      const timeoutDuration = isMobileWeb ? 300 : 100;
      await new Promise(resolve => setTimeout(resolve, timeoutDuration));

      // Use requestAnimationFrame to ensure DOM/state updates are complete
      await new Promise(resolve => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        } else {
          setTimeout(resolve, 50);
        }
      });

      logger.debug('FirebaseGoogleButton', 'Navigating to HomeStack');

      // Check guards before navigation
      // After successful login, user is authenticated
      const guardContext = {
        isAuthenticated: true,
        isGuestMode: false,
        isAdmin: false,
      };

      const guardResult = await checkNavigationGuards(
        {
          type: 'reset',
          index: 0,
          routes: [{ name: 'HomeStack' }],
        },
        guardContext
      );

      if (!guardResult.allowed) {
        // If guard blocks, try redirect if provided
        if (guardResult.redirectTo) {
          await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
        }
        setLoading(false);
        return;
      }

      // Use reset instead of replace for more reliable navigation after auth
      // This ensures a clean navigation stack
      await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
      logger.info('FirebaseGoogleButton', 'Google login success');

      // Reset loading state after navigation
      setLoading(false);

    } catch (error: any) {
      logger.error('FirebaseGoogleButton', 'Google login error', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      let errorMessage = '';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'ההתחברות בוטלה';
        logger.debug('FirebaseGoogleButton', 'User closed the popup');
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'הדפדפן חסם את חלון ההתחברות. אנא אפשר pop-ups.';
        logger.warn('FirebaseGoogleButton', 'Popup was blocked by browser');
      } else {
        errorMessage = 'שגיאה בהתחברות. נסה שוב.';
        logger.warn('FirebaseGoogleButton', 'Unknown error', { code: error.code });
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleGoogleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={colors.white} style={styles.icon} />
          ) : (
            <Ionicons name="logo-google" size={20} color={colors.white} style={styles.icon} />
          )}
          <Text style={styles.text}>
            {loading ? 'מתחבר...' : (t('auth:googleCta') || 'התחבר/הרשם עם גוגל')}
          </Text>
        </View>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...createShadowStyle('colors.black', { width: 0, height: 2 }, 0.1, 4),
    elevation: 3,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

