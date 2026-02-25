/**
 * OrganizationLoginForm Component
 * 
 * A comprehensive organization authentication form component that handles organization lookup,
 * approval status checking, and navigation to organization onboarding when needed.
 * Features include organization name/email search, recent email suggestions,
 * and proper error handling with user feedback.
 * 
 * @author KC Development Team
 * @version 1.8.0
 * @since 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/databaseService';
import colors from '../globals/colors';

// TypeScript Interfaces
interface OrganizationLoginFormProps {
  /** Whether the form is currently open/expanded */
  isOpen: boolean;
  /** Callback to toggle the form open/closed state */
  onToggle: () => void;
  /** Callback when user successfully logs in as organization */
  onLoginSuccess: (userData: any) => void;
  /** Animation value for form expansion */
  animationValue: Animated.Value;
}

interface OrganizationFormState {
  query: string;
  isChecking: boolean;
  suggestions: string[];
}

interface RecentEmailsState {
  emails: string[];
  suggestions: string[];
}

const KNOWN_EMAILS_KEY = 'known_emails';

/**
 * OrganizationLoginForm Component
 * 
 * Handles the complete organization authentication flow including:
 * - Organization name/email search
 * - Approval status checking
 * - Recent email suggestions
 * - Navigation to onboarding for new organizations
 * - Proper error handling and user feedback
 */
const OrganizationLoginForm: React.FC<OrganizationLoginFormProps> = ({
  isOpen,
  onToggle,
  onLoginSuccess,
  animationValue,
}) => {
  const { t } = useTranslation(['auth', 'common']);
  const navigation = useNavigation<any>();

  // Form state management
  const [formState, setFormState] = useState<OrganizationFormState>({
    query: '',
    isChecking: false,
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
    if (!isOpen) {
      setRecentEmails(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    const query = formState.query.trim().toLowerCase();
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
  }, [formState.query, isOpen, recentEmails.emails]);

  // Load recent emails on component mount
  useEffect(() => {
    loadRecentEmails();
  }, []);

  /**
   * Resets the form to its initial state
   */
  const resetFormState = () => {
    setFormState({
      query: '',
      isChecking: false,
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
   * Handles organization confirmation and lookup
   */
  const handleOrgConfirm = async () => {
    try {
      const query = formState.query.trim();

      if (!query) {
        Alert.alert(
          t('common:error') as string,
          t('auth:org.enterNameOrEmail') as string
        );
        return;
      }

      setFormState(prev => ({ ...prev, isChecking: true }));

      // Search for organization applications
      let applications: any[] = [];
      const isEmail = query.includes('@');

      if (isEmail) {
        // Search by email (primary key)
        const emailKey = query.toLowerCase();
        applications = await db.listOrgApplications(emailKey);
      } else {
        // Search by organization name from admin queue
        const all = await db.listOrgApplications('admin_org_queue');
        applications = (all || []).filter((app: any) =>
          String(app.orgName || '').toLowerCase().includes(query.toLowerCase())
        );
      }

      // Check for approved applications
      const approved = applications.find((app: any) => app.status === 'approved');
      const pending = applications.find((app: any) => app.status === 'pending');

      if (approved) {
        // Create organization user and login
        await handleApprovedOrganization(approved, isEmail, query);
        return;
      }

      if (pending) {
        Alert.alert(
          t('auth:org.pendingTitle') as string,
          t('auth:org.pendingMessage') as string
        );
        setFormState(prev => ({ ...prev, isChecking: false }));
        return;
      }

      // Organization not found - navigate to onboarding
      navigation.navigate('OrgOnboardingScreen' as never);
    } catch (error) {
      console.error('Org login check failed:', error);
      Alert.alert(
        t('common:error') as string,
        t('auth:org.checkFailed') as string
      );
      setFormState(prev => ({ ...prev, isChecking: false }));
    }
  };

  /**
   * Handles login for approved organizations
   */
  const handleApprovedOrganization = async (approved: any, isEmail: boolean, query: string) => {
    try {
      const email = String(approved.contactEmail || (isEmail ? query : '')).toLowerCase();

      const orgUser = {
        id: `org_${approved.id}`,
        name: approved.orgName || (t('auth:org.defaultName') as string),
        email: email || `org_${approved.id}@example.org`,
        phone: approved.contactPhone || '+9720000000',
        avatar: 'https://i.pravatar.cc/150?img=12',
        bio: t('auth:org.defaultBio') as string,
        karmaPoints: 0,
        joinDate: new Date().toISOString(),
        isActive: true,
        lastActive: new Date().toISOString(),
        location: {
          city: approved.city || (t('common:labels.countryIsrael') as string),
          country: 'IL'
        },
        interests: [],
        roles: ['org_admin'],
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        notifications: [],
        settings: { language: 'he', darkMode: false, notificationsEnabled: true },
      };

      onLoginSuccess(orgUser);
    } catch (error) {
      console.error('Failed to create organization user:', error);
      setFormState(prev => ({ ...prev, isChecking: false }));
    }
  };

  /**
   * Handles suggestion selection
   */
  const handleSuggestionSelect = (email: string) => {
    setFormState(prev => ({ ...prev, query: email }));
    setRecentEmails(prev => ({ ...prev, suggestions: [] }));
  };

  if (!isOpen) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.ctaButton, styles.orgButton]}
          onPress={onToggle}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaButtonText, { color: colors.secondary, fontWeight: '700' }]}>
            {t('auth:org.cta')}
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
            <Ionicons name="business-outline" size={20} color={colors.secondary} />
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          style={styles.input}
          placeholder={t('auth:org.placeholder')}
          placeholderTextColor={colors.textTertiary}
          value={formState.query}
          onChangeText={(text) => setFormState(prev => ({ ...prev, query: text }))}
          autoCapitalize="none"
          autoCorrect={false}
          textAlign="right"
          autoComplete="email"
          textContentType="emailAddress"
          inputMode="email"
          returnKeyType="done"
          onSubmitEditing={handleOrgConfirm}
          accessible={true}
          accessibilityLabel={t('auth:org.placeholder')}
          accessibilityHint={t('auth:org.accessibilityHint') || 'Enter your organization email'}
          importantForAccessibility="yes"
        />

        <TouchableOpacity
          style={[styles.actionButton, formState.isChecking && styles.disabledButton]}
          onPress={handleOrgConfirm}
          disabled={formState.isChecking}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>
            {formState.isChecking ? t('auth:org.checking') : t('auth:org.continue')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email suggestions dropdown */}
      {recentEmails.suggestions.length > 0 && (
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
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    marginVertical: 6,
    marginBottom: 22,
  },
  orgButton: {
    borderColor: colors.secondary,
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
    backgroundColor: 'rgba(255, 107, 157, 0.08)',
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
  actionButton: {
    backgroundColor: colors.secondary,
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
});

export default OrganizationLoginForm;
