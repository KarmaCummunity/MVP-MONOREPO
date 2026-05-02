/**
 * Google Sign-In button using Firebase Authentication with redirect flow.
 *
 * We use `signInWithRedirect` instead of `signInWithPopup` because the app is
 * served from a Replit preview domain that is NOT in Firebase's authorized-domain
 * list. With popup flow, Firebase tries to post a message back to the opener
 * window from `karma-community-app.firebaseapp.com`, and the popup itself
 * redirects to the current origin — both of which trigger an
 * `auth/unauthorized-domain` error on unlisted domains.
 *
 * With redirect flow, the entire browser navigates to
 * `karma-community-app.firebaseapp.com/__/auth/handler` (always authorized), and
 * after Google completes the OAuth dance, Firebase redirects back to the app URL.
 * On return, `MainNavigator` calls `getRedirectResult()` to read the signed-in user
 * and updates the auth store — no domain-authorization issues.
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { getFirebase } from '../utils/firebaseClient';
import { useTranslation } from 'react-i18next';
import { createShadowStyle } from '../globals/styles';
import colors from '../globals/colors';
import { logger } from '../utils/loggerService';

export default function FirebaseGoogleButton() {
  const { t } = useTranslation(['auth']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    logger.info('FirebaseGoogleButton', 'Google redirect login started');

    if (Platform.OS !== 'web') {
      logger.error('FirebaseGoogleButton', 'Platform is not web', { platform: Platform.OS });
      alert('Google login is currently available on web only');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { app } = getFirebase();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      logger.debug('FirebaseGoogleButton', 'Initiating redirect to Google…');

      // `signInWithRedirect` navigates the whole page to Firebase/Google.
      // Execution does not resume here — the result is picked up by
      // `getRedirectResult` inside MainNavigator when the page reloads.
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      logger.error('FirebaseGoogleButton', 'Google redirect error', {
        code: err?.code,
        message: err?.message,
      });
      setLoading(false);

      const code: string = err?.code ?? '';
      if (code === 'auth/unauthorized-domain') {
        // The Replit preview domain is not in Firebase's authorized-domain list.
        // A project admin must add it in Firebase Console →
        // Authentication → Settings → Authorized domains.
        setError(
          `הדומיין הנוכחי לא מאושר ב-Firebase.\n` +
          `הוסף את הדומיין הבא ב-Firebase Console → Authentication → Authorized domains:\n` +
          `${typeof window !== 'undefined' ? window.location.hostname : 'כתובת האתר'}`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setError('ההתחברות בוטלה');
      } else {
        setError(`שגיאה בהתחברות (${code || 'unknown'}). נסה שוב.`);
      }
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
            {loading ? 'מעביר לגוגל…' : (t('auth:googleCta') || 'התחבר/הרשם עם גוגל')}
          </Text>
        </View>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
