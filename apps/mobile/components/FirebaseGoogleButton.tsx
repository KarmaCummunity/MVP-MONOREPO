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
import { API_BASE_URL } from '../utils/config.constants';
import { createShadowStyle } from '../globals/styles';
import colors from '../globals/colors';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import { logger } from '../utils/loggerService';
import { establishSessionFromGoogleResponse } from '../session/loginFlows';
import { useUserStore } from '../stores/userStore';

// Shape of the response we accept from `POST /auth/google`. Kept narrow on purpose.
interface GoogleAuthServerResponse {
  success: boolean;
  user: { id: string; email?: string; name?: string; avatar?: string; avatar_url?: string; roles?: string[] };
  tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
  error?: string;
}

/**
 * Posts the Google OAuth tokens to the server and returns the validated response.
 * Throws with a server-supplied message on any non-2xx response or invalid payload.
 */
async function fetchGoogleAuthResponse(body: {
  idToken?: string;
  accessToken?: string;
  firebaseUid: string;
}): Promise<GoogleAuthServerResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `KarmaCommunity-${Platform.OS}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
    logger.error('FirebaseGoogleButton', 'Server /auth/google returned non-2xx', {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
    throw new Error(
      (errorData as any)?.error ||
        (errorData as any)?.message ||
        `Server error: ${response.status}`,
    );
  }

  const data = (await response.json()) as GoogleAuthServerResponse;
  if (!data?.success || !data.user?.id) {
    logger.error('FirebaseGoogleButton', 'Server /auth/google returned invalid payload', {
      hasSuccess: data?.success,
      hasUser: !!data?.user,
      hasUserId: !!data?.user?.id,
    });
    throw new Error(data?.error || 'Invalid response from server');
  }
  return data;
}

/**
 * Map a Phase-1 (auth) error to a user-visible Hebrew message.
 */
function authPhaseErrorMessage(error: any): string {
  if (error?.code === 'auth/popup-closed-by-user') return 'ההתחברות בוטלה';
  if (error?.code === 'auth/popup-blocked') {
    return 'הדפדפן חסם את חלון ההתחברות. אנא אפשר pop-ups.';
  }
  if (error?.code === 'auth/cancelled-popup-request') return 'ההתחברות בוטלה';
  if (error?.code === 'auth/network-request-failed') return 'בעיית רשת. בדוק חיבור לאינטרנט.';
  return 'שגיאה בהתחברות. נסה שוב.';
}

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

    setLoading(true);
    setError('');

    // Phase 1: Firebase popup + server `/auth/google` call. Failures here are surfaced as
    // user-visible auth errors.
    let serverResponse: Awaited<ReturnType<typeof fetchGoogleAuthResponse>>;
    let firebaseUid: string;
    try {
      logger.debug('FirebaseGoogleButton', 'Opening Google popup');
      const { app } = getFirebase();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleAccessToken = credential?.accessToken;
      const googleIdToken = credential?.idToken;
      firebaseUid = result.user.uid;

      logger.debug('FirebaseGoogleButton', 'Popup returned, calling server', {
        firebaseUid,
        hasIdToken: !!googleIdToken,
        hasAccessToken: !!googleAccessToken,
        apiUrl: API_BASE_URL,
      });

      serverResponse = await fetchGoogleAuthResponse({
        idToken: googleIdToken,
        accessToken: googleAccessToken,
        firebaseUid,
      });
    } catch (error: any) {
      logger.error('FirebaseGoogleButton', 'Auth phase failed', {
        message: error?.message,
        code: error?.code,
      });
      setError(authPhaseErrorMessage(error));
      setLoading(false);
      return;
    }

    // Phase 2: Session establishment + navigation. From this point on, server-side
    // authentication has SUCCEEDED. Any failure here is a *client-side* projection problem;
    // we must NOT show "login failed" because the user is already authenticated server-side.
    try {
      logger.info('FirebaseGoogleButton', 'Server auth ok, establishing session', {
        userId: serverResponse.user.id,
        email: serverResponse.user.email,
        hasTokens: !!serverResponse.tokens,
      });

      await establishSessionFromGoogleResponse(serverResponse, { firebaseUid });
      useUserStore.getState().syncFromSession();
      logger.info('FirebaseGoogleButton', 'Session established');

      // Give React time to flush the new auth-gated stack before issuing the reset.
      const isMobileWeb =
        Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth <= 768;
      await new Promise((resolve) => setTimeout(resolve, isMobileWeb ? 300 : 100));
      await new Promise((resolve) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => requestAnimationFrame(resolve as any));
        } else {
          setTimeout(resolve, 50);
        }
      });

      const guardResult = await checkNavigationGuards(
        { type: 'reset', index: 0, routes: [{ name: 'HomeStack' }] },
        { isAuthenticated: true, isGuestMode: false, isAdmin: false },
      );

      if (!guardResult.allowed && guardResult.redirectTo) {
        await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
      } else {
        await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
      }
      logger.info('FirebaseGoogleButton', 'Google login success');
    } catch (error: any) {
      // Auth succeeded; only the post-auth projection/navigation failed. Log loudly but DO NOT
      // show the "auth failed" banner — that would make the user think login broke when in fact
      // their session is already valid in storage.
      logger.error('FirebaseGoogleButton', 'Post-auth projection/navigation error (non-fatal)', {
        message: error?.message,
        stack: error?.stack,
      });
    } finally {
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

