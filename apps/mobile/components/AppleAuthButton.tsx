import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { API_BASE_URL } from '../utils/config.constants';
import { logger } from '../utils/loggerService';

type Props = {
  onSuccess: (serverResponse: {
    success?: boolean;
    user?: {
      id: string;
      email?: string;
      name?: string;
      avatar?: string;
      avatar_url?: string;
      roles?: string[];
    };
    tokens?: { accessToken: string; refreshToken: string; expiresIn: number };
  }) => void;
  onError?: (message: string) => void;
};

export default function AppleAuthButton({ onSuccess, onError }: Props) {
  const { t } = useTranslation(['auth', 'common']);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS !== 'ios') return;
      try {
        const ok = await AppleAuthentication.isAvailableAsync();
        if (!cancelled) setAvailable(ok);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== 'ios' || !available) {
    return null;
  }

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token from Apple');
      }

      const response = await fetch(`${API_BASE_URL}/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `KarmaCommunity-${Platform.OS}`,
        },
        body: JSON.stringify({ identityToken: credential.identityToken }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.user || !data.tokens) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.message || `Server error: ${response.status}`;
        throw new Error(msg);
      }

      let displayName = data.user.name as string | undefined;
      if (
        credential.fullName &&
        (credential.fullName.givenName || credential.fullName.familyName)
      ) {
        const combined = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (combined) displayName = combined;
      }

      onSuccess({
        success: data.success,
        user: {
          ...data.user,
          name: displayName || data.user.name,
        },
        tokens: data.tokens,
      });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
        logger.info('AppleAuthButton', 'User cancelled Apple Sign In');
      } else {
        const msg =
          e instanceof Error ? e.message : t('common:genericTryAgain');
        logger.error('AppleAuthButton', 'Apple Sign In failed', { error: String(e) });
        onError?.(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={styles.appleBtn}
        onPress={() => {
          void handlePress();
        }}
      />
      {loading ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 48,
    position: 'relative',
  },
  appleBtn: {
    width: '100%',
    height: 48,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
