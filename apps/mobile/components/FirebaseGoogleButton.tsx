/**
 * Google Sign-In button — backend-initiated OAuth flow.
 *
 * Instead of using Firebase's `signInWithRedirect` (which checks the calling
 * domain against Firebase's authorized-domain list before leaving the page),
 * this button redirects the browser to the fixed Railway backend URL
 * (`/auth/google/redirect`).  The backend owns the entire OAuth dance:
 *
 *   Browser → Railway /auth/google/redirect
 *          → Google consent screen
 *          → Railway /auth/google/callback  (registered redirect URI)
 *          → App URL  ?google_auth_data=<base64url payload>
 *
 * Because the redirect URI is a fixed Railway hostname, it only needs to be
 * registered in Google Cloud Console once — it never changes regardless of
 * which Replit tunnel URL the frontend is served from.
 *
 * The `google_auth_data` payload is picked up by the `useEffect` in
 * `MainNavigator` on the next page load.
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { createShadowStyle } from '../globals/styles';
import colors from '../globals/colors';
import { logger } from '../utils/loggerService';
import { getApiUrl } from '../utils/config.constants';

export default function FirebaseGoogleButton() {
  const { t } = useTranslation(['auth']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    logger.info('FirebaseGoogleButton', 'Backend-initiated Google OAuth started');

    if (Platform.OS !== 'web') {
      logger.error('FirebaseGoogleButton', 'Platform is not web', { platform: Platform.OS });
      alert('Google login is currently available on web only');
      return;
    }

    if (typeof window === 'undefined') return;

    try {
      setLoading(true);
      setError('');

      const apiBase = getApiUrl();
      const returnTo = window.location.href;

      const redirectUrl =
        `${apiBase}/auth/google/redirect?return_to=${encodeURIComponent(returnTo)}`;

      logger.debug('FirebaseGoogleButton', 'Redirecting to backend OAuth endpoint', {
        apiBase,
        redirectUrl,
      });

      // Full-page navigation — execution does not resume here.
      // The result is picked up by the `google_auth_data` handler in MainNavigator.
      window.location.href = redirectUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('FirebaseGoogleButton', 'Failed to initiate Google OAuth', { message });
      setLoading(false);
      setError(`שגיאה בהתחברות: ${message}`);
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
