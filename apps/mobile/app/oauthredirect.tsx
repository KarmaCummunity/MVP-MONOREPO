/**
 * OAuth Redirect Handler
 * This page handles the Google OAuth redirect and processes the token
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../stores/userStore';
import colors from '../globals/colors';
import { logger } from '../utils/loggerService';

const Oauthredirect_LOG = 'oauthredirect';

export default function OAuthRedirect() {
  const router = useRouter();
  const { setSelectedUserWithMode } = useUser();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const processAuth = async () => {
      try {
        const hash = globalThis.window?.location.hash ?? '';
        logger.debug(Oauthredirect_LOG, 'OAuth redirect hash', { hash });

        if (!hash?.includes('id_token=')) {
          console.error('❌ [OAuthRedirect] No id_token found');
          setStatus('error');
          setTimeout(() => router.replace('/'), 2000);
          return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get('id_token');

        if (!idToken) {
          throw new Error('No ID token');
        }

        logger.debug(Oauthredirect_LOG, '✅ [OAuthRedirect] Found token');
        // Do not decode JWT claims client-side (Sonar S5659). Server verifies id_token and returns user.

        // Send idToken to server to get UUID
        const { API_BASE_URL } = await import('../utils/config.constants');
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: idToken,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate with server');
        }

        const serverResponse = await response.json();
        if (!serverResponse.success || !serverResponse.user) {
          throw new Error(serverResponse.error || 'Invalid response from server');
        }

        // Use UUID from server - this is the primary identifier
        const serverUser = serverResponse.user;
        const userData = {
          id: serverUser.id, // UUID from database, not Google ID
          name: serverUser.name || serverUser.email?.split('@')[0] || 'User',
          email: serverUser.email || '',
          avatar: serverUser.avatar || 'https://i.pravatar.cc/150?img=1',
          phone: serverUser.phone || '+972500000000',
          bio: serverUser.bio || '',
          karmaPoints: serverUser.karmaPoints || 0,
          joinDate: serverUser.createdAt || serverUser.joinDate || new Date().toISOString(),
          isActive: serverUser.isActive !== false,
          lastActive: serverUser.lastActive || new Date().toISOString(),
          location: serverUser.location || { city: 'ישראל', country: 'IL' },
          interests: serverUser.interests || [],
          roles: serverUser.roles || ['user'],
          postsCount: serverUser.postsCount || 0,
          followersCount: serverUser.followersCount || 0,
          followingCount: serverUser.followingCount || 0,
          notifications: [
            { type: 'system', text: 'ברוך הבא לקרמה קומיוניטי!', date: new Date().toISOString() }
          ],
          settings: serverUser.settings || {
            language: 'he',
            darkMode: false,
            notificationsEnabled: true
          }
        };

        logger.debug(Oauthredirect_LOG, 'Saving user with UUID', { userId: userData.id });
        await setSelectedUserWithMode(userData, 'real');
        await AsyncStorage.setItem('current_user', JSON.stringify(userData));
        await AsyncStorage.setItem('auth_mode', 'real');
        logger.debug(Oauthredirect_LOG, '✅ [OAuthRedirect] User saved!');

        setStatus('success');

        // Navigate to home
        logger.debug(Oauthredirect_LOG, '🏠 [OAuthRedirect] Navigating to home...');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1000);

      } catch (error) {
        console.error('❌ [OAuthRedirect] Error:', error);
        setStatus('error');
        setTimeout(() => router.replace('/'), 2000);
      }
    };

    if (globalThis.window !== undefined) {
      processAuth();
    }
  }, [router, setSelectedUserWithMode]);

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>מעבד התחברות...</Text>
        </>
      )}
      {status === 'success' && (
        <Text style={styles.successText}>✅ התחברות הצליחה! מעביר...</Text>
      )}
      {status === 'error' && (
        <Text style={styles.errorText}>❌ שגיאה בהתחברות. מעביר חזרה...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  successText: {
    fontSize: 18,
    color: colors.success,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    fontWeight: 'bold',
  },
});
