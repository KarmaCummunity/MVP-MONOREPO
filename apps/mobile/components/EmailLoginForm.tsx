/**
 * EmailLoginForm Component
 * 
 * A comprehensive email authentication form component that handles both login and registration flows.
 * Features include email validation, password visibility toggle, recent email suggestions,
 * and proper error handling with user feedback.
 * 
 * @author KC Development Team
 * @version 1.8.0
 * @since 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Platform,
  Linking,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSignInMethods,
  signInWithEmail as fbSignInWithEmail,
  signUpWithEmail as fbSignUpWithEmail,
  sendVerification as fbSendVerification,
  sendPasswordReset
} from '../utils/authService';
import { restAdapter } from '../utils/restAdapter';
import { createShadowStyle } from '../globals/styles';
import colors from '../globals/colors';

// TypeScript Interfaces
interface EmailLoginFormProps {
  /** Whether the form is currently open/expanded */
  isOpen: boolean;
  /** Callback to toggle the form open/closed state */
  onToggle: () => void;
  /** Callback when user successfully logs in */
  onLoginSuccess: (userData: any) => void;
  /** Animation value for form expansion */
  animationValue: Animated.Value;
}

interface EmailFormState {
  step: 'email' | 'password';
  emailValue: string;
  passwordValue: string;
  emailExists: boolean | null;
  isBusy: boolean;
  statusMessage: string | null;
  statusColor: string;
  passwordVisible: boolean;
  suggestions: string[];
}

interface RecentEmailsState {
  emails: string[];
  suggestions: string[];
}

const KNOWN_EMAILS_KEY = 'known_emails';

/**
 * EmailLoginForm Component
 * 
 * Handles the complete email authentication flow including:
 * - Email validation and existence checking
 * - Password input with visibility toggle
 * - Recent email suggestions
 * - Login/registration with Firebase
 * - Proper error handling and user feedback
 */
const EmailLoginForm: React.FC<EmailLoginFormProps> = ({
  isOpen,
  onToggle,
  onLoginSuccess,
  animationValue,
}) => {
  const { t } = useTranslation(['auth', 'common']);

  // Form state management
  const [formState, setFormState] = useState<EmailFormState>({
    step: 'email',
    emailValue: '',
    passwordValue: '',
    emailExists: null,
    isBusy: false,
    statusMessage: null,
    statusColor: colors.success,
    passwordVisible: true,
    suggestions: [],
  });

  const [recentEmails, setRecentEmails] = useState<RecentEmailsState>({
    emails: [],
    suggestions: [],
  });

  // Reset form state when form is closed
  useEffect(() => {
    if (!isOpen) {
      resetFormState();
    }
  }, [isOpen]);

  // Update email suggestions based on current input
  useEffect(() => {
    if (!isOpen || formState.step !== 'email') {
      setRecentEmails(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    const query = formState.emailValue.trim().toLowerCase();
    if (!query) {
      setRecentEmails(prev => ({
        ...prev,
        suggestions: recentEmails.emails.slice(0, 5)
      }));
      return;
    }

    const filtered = recentEmails.emails
      .filter(email => email.toLowerCase().includes(query))
      .slice(0, 5);

    setRecentEmails(prev => ({ ...prev, suggestions: filtered }));
  }, [formState.emailValue, isOpen, formState.step, recentEmails.emails]);

  // Load recent emails on component mount
  useEffect(() => {
    loadRecentEmails();
  }, []);

  /**
   * Resets the form to its initial state
   */
  const resetFormState = () => {
    setFormState({
      step: 'email',
      emailValue: '',
      passwordValue: '',
      emailExists: null,
      isBusy: false,
      statusMessage: null,
      statusColor: colors.success,
      passwordVisible: true,
      suggestions: [],
    });
  };

  /**
   * Loads recent emails from AsyncStorage
   */
  const loadRecentEmails = async () => {
    try {
      const raw = await AsyncStorage.getItem('recent_emails');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          setRecentEmails(prev => ({ ...prev, emails: list }));
          return;
        }
      }

      // Fallback to known emails
      const knownRaw = await AsyncStorage.getItem(KNOWN_EMAILS_KEY);
      if (knownRaw) {
        const list = JSON.parse(knownRaw);
        if (Array.isArray(list)) {
          setRecentEmails(prev => ({ ...prev, emails: list }));
        }
      }
    } catch (error) {
      console.error('Failed to load recent emails:', error);
    }
  };

  /**
   * Saves an email to recent emails list
   */
  const saveRecentEmail = async (email: string) => {
    try {
      const normalized = String(email || '').trim().toLowerCase();
      if (!normalized) return;

      const list = [
        normalized,
        ...recentEmails.emails.filter(e => e.toLowerCase() !== normalized)
      ].slice(0, 10);

      setRecentEmails(prev => ({ ...prev, emails: list }));
      await AsyncStorage.setItem('recent_emails', JSON.stringify(list));
      await AsyncStorage.setItem(KNOWN_EMAILS_KEY, JSON.stringify(list));
    } catch (error) {
      console.error('Failed to save recent email:', error);
    }
  };

  /**
   * Validates email format using regex
   */
  const validateEmailFormat = (email: string): boolean => {
    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    return emailRegex.test(String(email).toLowerCase());
  };

  /**
   * Checks if an email is known (has existing account)
   */
  const isKnownEmail = async (email: string): Promise<boolean> => {
    const lower = email.trim().toLowerCase();
    try {
      const methods = await getSignInMethods(lower);
      const hasPasswordProvider = Array.isArray(methods) &&
        methods.some(m => m && m.toLowerCase().includes('password'));

      if (hasPasswordProvider) return true;

      const cacheRaw = await AsyncStorage.getItem(KNOWN_EMAILS_KEY);
      const cache = cacheRaw ? JSON.parse(cacheRaw) : [];
      return Array.isArray(cache) && cache.includes(lower);
    } catch (error) {
      console.error('Error checking known email:', error);
      const cacheRaw = await AsyncStorage.getItem(KNOWN_EMAILS_KEY);
      const cache = cacheRaw ? JSON.parse(cacheRaw) : [];
      return Array.isArray(cache) && cache.includes(lower);
    }
  };

  /**
   * Handles email input continuation (checking if email exists)
   */
  const handleEmailContinue = async () => {
    try {
      const email = formState.emailValue.trim().toLowerCase();

      if (!email || !validateEmailFormat(email)) {
        Alert.alert(
          t('common:error') as string,
          t('auth:email.invalidFormat') as string
        );
        return;
      }

      setFormState(prev => ({ ...prev, isBusy: true }));

      const exists = await isKnownEmail(email);
      setFormState(prev => ({
        ...prev,
        emailExists: exists,
        statusMessage: `${email} • ${exists ? t('auth:email.knownUser') : t('auth:email.unknownEmail')}`,
        statusColor: exists ? colors.success : colors.error,
        step: 'password',
        passwordValue: '',
        isBusy: false,
      }));
    } catch (error) {
      console.error('Email check failed:', error);
      Alert.alert(
        t('common:error') as string,
        t('common:genericTryAgain') as string
      );
      setFormState(prev => ({ ...prev, isBusy: false }));
    }
  };

  /**
   * Handles final email/password submission
   */
  const handleEmailSubmit = async () => {
    try {
      const email = formState.emailValue.trim().toLowerCase();

      if (!email || !validateEmailFormat(email)) {
        Alert.alert(
          t('common:error') as string,
          t('auth:email.invalidFormat') as string
        );
        return;
      }

      if (!formState.passwordValue || formState.passwordValue.length < 6) {
        Alert.alert(
          t('common:error') as string,
          t('auth:email.passwordTooShort') as string
        );
        return;
      }

      setFormState(prev => ({ ...prev, isBusy: true }));

      const exists = await isKnownEmail(email);
      const nowIso = new Date().toISOString();

      if (exists) {
        // Handle login for existing user
        await handleExistingUserLogin(email, nowIso);
      } else {
        // Handle registration for new user
        await handleNewUserRegistration(email, nowIso);
      }
    } catch (error) {
      console.error('Email submit failed:', error);
      Alert.alert(
        t('common:error') as string,
        t('common:genericTryAgain') as string
      );
      setFormState(prev => ({ ...prev, isBusy: false }));
    }
  };

  /**
   * Handles login for existing users
   */
  const handleExistingUserLogin = async (email: string, nowIso: string) => {
    try {
      const fbUser = await fbSignInWithEmail(email, formState.passwordValue);

      // Get UUID from server using firebase_uid
      const { apiService } = await import('../utils/apiService');
      const resolveResponse = await apiService.resolveUserId({
        firebase_uid: fbUser.uid,
        email: fbUser.email || email
      });

      if (!resolveResponse.success || !resolveResponse.user) {
        // Fallback: try to get user by email
        const userResponse = await apiService.getUserById(fbUser.email || email);
        if (userResponse.success && userResponse.data) {
          const serverUser = userResponse.data;
          const userData = {
            id: serverUser.id, // UUID from database
            name: serverUser.name || fbUser.displayName || email.split('@')[0],
            email: serverUser.email || fbUser.email || email,
            phone: serverUser.phone || fbUser.phoneNumber || '+9720000000',
            avatar: serverUser.avatar_url || fbUser.photoURL || 'https://i.pravatar.cc/150?img=1',
            bio: serverUser.bio || '',
            karmaPoints: serverUser.karma_points || 0,
            joinDate: serverUser.join_date || serverUser.created_at || nowIso,
            isActive: serverUser.is_active !== false,
            lastActive: serverUser.last_active || nowIso,
            location: { city: serverUser.city || t('common:labels.countryIsrael') as string, country: serverUser.country || 'IL' },
            interests: serverUser.interests || [],
            roles: serverUser.roles || ['user'],
            postsCount: serverUser.posts_count || 0,
            followersCount: serverUser.followers_count || 0,
            followingCount: serverUser.following_count || 0,
            notifications: [],
            settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
          };
          await saveRecentEmail(email);
          onLoginSuccess(userData);
          return;
        }
        throw new Error('Failed to get user from server');
      }

      // Use UUID from server
      const serverUser = resolveResponse.user;
      const userData = {
        id: serverUser.id, // UUID from database - this is the primary identifier
        name: serverUser.name || fbUser.displayName || email.split('@')[0],
        email: serverUser.email || fbUser.email || email,
        phone: serverUser.phone || fbUser.phoneNumber || '+9720000000',
        avatar: serverUser.avatar || fbUser.photoURL || 'https://i.pravatar.cc/150?img=1',
        bio: serverUser.bio || '',
        karmaPoints: serverUser.karmaPoints || 0,
        joinDate: serverUser.createdAt || serverUser.joinDate || nowIso,
        isActive: serverUser.isActive !== false,
        lastActive: serverUser.lastActive || nowIso,
        location: serverUser.location || { city: t('common:labels.countryIsrael') as string, country: 'IL' },
        interests: serverUser.interests || [],
        roles: serverUser.roles || ['user'],
        postsCount: serverUser.postsCount || 0,
        followersCount: serverUser.followersCount || 0,
        followingCount: serverUser.followingCount || 0,
        notifications: [],
        settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
      };
      await saveRecentEmail(email);
      onLoginSuccess(userData);
    } catch (error: any) {
      setFormState(prev => ({
        ...prev,
        statusMessage: t('auth:email.invalidPassword') as string,
        statusColor: colors.error,
        isBusy: false,
      }));
    }
  };

  /**
   * Handles registration for new users
   */
  const handleNewUserRegistration = async (email: string, nowIso: string) => {
    try {
      const fbUser = await fbSignUpWithEmail(email, formState.passwordValue);
      await fbSendVerification(fbUser);
      Alert.alert(
        t('auth:email.verifyTitle') as string,
        t('auth:email.verifySent') as string
      );
    } catch (error: any) {
      if (String(error?.code || '').includes('auth/email-already-in-use')) {
        // Try to sign in instead
        try {
          const fbUser = await fbSignInWithEmail(email, formState.passwordValue);

          // Get UUID from server using firebase_uid
          const { apiService } = await import('../utils/apiService');
          const resolveResponse = await apiService.resolveUserId({
            firebase_uid: fbUser.uid,
            email: fbUser.email || email
          });

          if (!resolveResponse.success || !resolveResponse.user) {
            // Fallback: try to get user by email
            const userResponse = await apiService.getUserById(fbUser.email || email);
            if (userResponse.success && userResponse.data) {
              const serverUser = userResponse.data;
              const userData = {
                id: serverUser.id, // UUID from database
                name: serverUser.name || fbUser.displayName || email.split('@')[0],
                email: serverUser.email || fbUser.email || email,
                phone: serverUser.phone || fbUser.phoneNumber || '+9720000000',
                avatar: serverUser.avatar_url || fbUser.photoURL || 'https://i.pravatar.cc/150?img=1',
                bio: serverUser.bio || '',
                karmaPoints: serverUser.karma_points || 0,
                joinDate: nowIso,
                isActive: true,
                lastActive: nowIso,
                location: { city: t('common:labels.countryIsrael') as string, country: 'IL' },
                interests: [],
                roles: ['user'],
                postsCount: 0,
                followersCount: 0,
                followingCount: 0,
                notifications: [],
                settings: { language: 'he', darkMode: false, notificationsEnabled: true },
              };

              try {
                // User is already in database from resolveUserId/getUserById - no need to create via restAdapter
              } catch (error) {
                console.log('Saving user on server failed (non-critical):', error);
              }

              await saveRecentEmail(email);
              onLoginSuccess(userData);
              return;
            }
            throw new Error('Failed to get user from server');
          }

          const serverUser = resolveResponse.user as any;
          const userData = {
            id: serverUser.id,
            name: serverUser.name || fbUser.displayName || email.split('@')[0],
            email: serverUser.email || fbUser.email || email,
            phone: serverUser.phone || fbUser.phoneNumber || '+9720000000',
            avatar: serverUser.avatar_url || fbUser.photoURL || 'https://i.pravatar.cc/150?img=1',
            bio: serverUser.bio || '',
            karmaPoints: serverUser.karma_points || 0,
            joinDate: nowIso,
            isActive: true,
            lastActive: nowIso,
            location: { city: t('common:labels.countryIsrael') as string, country: 'IL' },
            interests: [],
            roles: ['user'],
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
            notifications: [],
            settings: { language: 'he', darkMode: false, notificationsEnabled: true },
          };

          await saveRecentEmail(email);
          onLoginSuccess(userData);
        } catch (signinError) {
          setFormState(prev => ({
            ...prev,
            statusMessage: t('auth:email.invalidPassword') as string,
            statusColor: colors.error,
            isBusy: false,
          }));
        }
      } else {
        console.error('Sign up failed:', error);
        Alert.alert(
          t('common:error') as string,
          t('auth:email.signupFailed') as string
        );
        setFormState(prev => ({ ...prev, isBusy: false }));
      }
    }
  };

  /**
   * Handles password reset functionality
   */
  const handlePasswordReset = async () => {
    try {
      await sendPasswordReset(formState.emailValue.trim().toLowerCase());
    } catch (error) {
      console.error('Password reset failed:', error);
    }
    Linking.openURL('https://mail.google.com/mail');
  };

  /**
   * Handles suggestion selection
   */
  const handleSuggestionSelect = (email: string) => {
    setFormState(prev => ({ ...prev, emailValue: email }));
    setRecentEmails(prev => ({ ...prev, suggestions: [] }));
  };

  if (!isOpen) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.ctaButton, styles.emailButton]}
          onPress={onToggle}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaButtonText, { color: colors.primary, fontWeight: '700' }]}>
            {t('auth:email.cta')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.expandedRow}>
        <Animated.View style={[styles.miniButton, { opacity: animationValue }]}>
          <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {formState.step === 'email' ? (
          <TextInput
            style={styles.input}
            placeholder={t('auth:email.placeholder')}
            placeholderTextColor={colors.textTertiary}
            value={formState.emailValue}
            textAlign="right"
            onChangeText={(text) => setFormState(prev => ({ ...prev, emailValue: text }))}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            inputMode="email"
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleEmailContinue}
            accessible={true}
            accessibilityLabel={t('auth:email.placeholder')}
            accessibilityHint={t('auth:email.accessibilityHint') || 'Enter your email address'}
            importantForAccessibility="yes"
          />
        ) : (
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { paddingRight: 40 }]}
              placeholder={t('auth:email.passwordPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={formState.passwordValue}
              onChangeText={(text) => setFormState(prev => ({ ...prev, passwordValue: text }))}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
              secureTextEntry={!formState.passwordVisible}
              returnKeyType="done"
              onSubmitEditing={handleEmailSubmit}
              accessible={true}
              accessibilityLabel={t('auth:email.passwordPlaceholder')}
              accessibilityHint={t('auth:email.passwordAccessibilityHint') || 'Enter your password'}
              importantForAccessibility="yes"
            />
            <TouchableOpacity
              onPress={() => setFormState(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }))}
              style={styles.eyeToggle}
            >
              <Ionicons
                name={formState.passwordVisible ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {formState.step === 'email' ? (
          <TouchableOpacity
            style={[styles.actionButton, formState.isBusy && styles.disabledButton]}
            onPress={handleEmailContinue}
            disabled={formState.isBusy}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>
              {formState.isBusy ? t('auth:email.checking') : t('auth:email.continue')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, formState.isBusy && styles.disabledButton]}
            onPress={handleEmailSubmit}
            disabled={formState.isBusy}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>
              {formState.isBusy ? t('auth:email.submitting') : t('auth:email.submit')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Email suggestions dropdown */}
      {formState.step === 'email' && recentEmails.suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {recentEmails.suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionSelect(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Status message */}
      {formState.statusMessage && (
        <>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: formState.statusColor }]}>
              {formState.statusMessage}
            </Text>
          </View>
          {formState.statusColor === colors.error && formState.step === 'password' && (
            <View style={styles.resetContainer}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handlePasswordReset}
                activeOpacity={0.7}
              >
                <Text style={styles.resetText}>{t('auth:email.resetPassword')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    alignSelf: 'center',
    width: '100%',
  },
  ctaButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...createShadowStyle('colors.black', { width: 0, height: 2 }, 0.1, 4),
    elevation: 3,
    width: '100%',
    marginVertical: 6,
    marginBottom: 22,
  },
  emailButton: {
    borderColor: colors.primary,
    marginTop: 12,
    width: '100%',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 6,
    marginHorizontal: 0,
    marginVertical: 3,
    gap: 8,
    width: '100%',
  },
  miniButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 126, 255, 0.08)',
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrapper: {
    position: 'relative',
    flex: 1,
  },
  eyeToggle: {
    position: 'absolute',
    right: 5,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  suggestionsBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  statusRow: {
    marginTop: 6,
    marginBottom: 6,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  resetContainer: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  resetButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  resetText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default EmailLoginForm;
