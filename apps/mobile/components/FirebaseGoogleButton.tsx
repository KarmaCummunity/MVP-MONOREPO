/**
 * Google Login using Firebase Authentication
 * THE SIMPLEST SOLUTION THAT ACTUALLY WORKS!
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { useTranslation } from 'react-i18next';
import { createShadowStyle } from '../globals/styles';
import colors from '../globals/colors';
import { navigationQueue } from '../utils/navigationQueue';
import { logger } from '../utils/loggerService';

export default function FirebaseGoogleButton() {
  const { t } = useTranslation(['auth']);
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

      const user = result.user;
      logger.debug('FirebaseGoogleButton', 'User data received', {
        uid: user.uid,
        email: user.email,
      });

      await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
      logger.info('FirebaseGoogleButton', 'Google login success');
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
      } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/unauthorized-domain') {
        errorMessage = 'הדפדפן חסם את חלון ההתחברות. אנא אפשר pop-ups.';
        logger.warn('FirebaseGoogleButton', 'Popup was blocked by browser');
      } else {
        errorMessage = 'שגיאה בהתחברות. נסה שוב.';
        logger.warn('FirebaseGoogleButton', 'Unknown error', { code: error.code });
      }

      setError(errorMessage);
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
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.1, 4),
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

