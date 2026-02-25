// LoginSidePanel.tsx
// A side panel component that displays the login interface for large screens (desktop/tablet)
// This component reuses the login logic from LoginScreen but renders it as a side panel
// instead of a full screen navigation

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { scaleSize } from '../globals/responsive';
import { getLoginSidePanelWidth } from '../globals/responsive';

interface LoginSidePanelProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

const LoginSidePanel: React.FC<LoginSidePanelProps> = ({
  visible,
  onClose,
  onLoginSuccess
}) => {
  const { t } = useTranslation(['common']);
  const { setSelectedUserWithMode, setGuestMode, selectedUser, isGuestMode } = useUser();

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Login state
  const [emailStep, setEmailStep] = useState<'email' | 'password'>('email');
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [isEmailBusy, setIsEmailBusy] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);

  // Organization login state
  const [orgLoginOpen, setOrgLoginOpen] = useState(false);
  const [orgQuery, setOrgQuery] = useState('');
  const [isCheckingOrg, setIsCheckingOrg] = useState(false);
  const orgOpenAnim = useRef(new Animated.Value(0)).current;

  // Email login state
  const [emailLoginOpen, setEmailLoginOpen] = useState(false);
  const emailOpenAnim = useRef(new Animated.Value(0)).current;

  // Screen dimensions
  const panelWidth = getLoginSidePanelWidth();

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  // Login handlers (simplified versions from LoginScreen)
  const handleLoginWithCharacter = async (characterType: 'seeker' | 'offerer') => {
    try {
      const userData = {
        id: `guest_${Date.now()}`,
        name: characterType === 'seeker' ? 'מחפש' : 'מציע',
        email: `guest_${characterType}@example.com`,
        characterType,
        isGuest: true,
        profileImage: null,
      };

      await setSelectedUserWithMode(userData as any, 'real');
      onLoginSuccess?.();
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה במהלך הכניסה');
    }
  };

  const handleGuestMode = async () => {
    try {
      await setGuestMode();
      onLoginSuccess?.();
    } catch (error) {
      console.error('Guest mode error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה במהלך הכניסה');
    }
  };

  const resetEmailState = () => {
    setEmailStep('email');
    setPasswordValue('');
    setIsEmailBusy(false);
    setEmailExists(null);
    setEmailStatusMessage(null);
    setEmailSuggestions([]);
  };

  const resetOrgState = () => {
    setOrgQuery('');
    setIsCheckingOrg(false);
  };

  const toggleOrgLogin = () => {
    const next = !orgLoginOpen;
    if (next && emailLoginOpen) {
      setEmailLoginOpen(false);
      Animated.timing(emailOpenAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      resetEmailState();
    }
    setOrgLoginOpen(next);
    if (!next) resetOrgState();
    Animated.timing(orgOpenAnim, {
      toValue: next ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  };

  const toggleEmailLogin = () => {
    const next = !emailLoginOpen;
    if (next && orgLoginOpen) {
      setOrgLoginOpen(false);
      Animated.timing(orgOpenAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      resetOrgState();
    }
    setEmailLoginOpen(next);
    if (!next) resetEmailState();
    Animated.timing(emailOpenAnim, {
      toValue: next ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  };

  // Animation styles
  const panelAnimatedStyle = {
    transform: [
      {
        translateX: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [panelWidth, 0],
        }),
      },
    ],
  };

  const overlayAnimatedStyle = {
    opacity: overlayAnim,
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Side Panel */}
      <Animated.View style={[
        styles.panel,
        { width: panelWidth },
        panelAnimatedStyle
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>כניסה לאפליקציה</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Character Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>בחר תפקיד</Text>
            <View style={styles.characterButtons}>
              <TouchableOpacity
                style={[styles.characterButton, styles.seekerButton]}
                onPress={() => handleLoginWithCharacter('seeker')}
              >
                <Text style={styles.characterButtonText}>מחפש</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.characterButton, styles.offererButton]}
                onPress={() => handleLoginWithCharacter('offerer')}
              >
                <Text style={styles.characterButtonText}>מציע</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Guest Mode */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestMode}
            >
              <Text style={styles.guestButtonText}>המשך כאורח</Text>
            </TouchableOpacity>
          </View>

          {/* Organization Login */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.loginOptionButton}
              onPress={toggleOrgLogin}
            >
              <Text style={styles.loginOptionText}>כניסה דרך ארגון</Text>
              <Ionicons
                name={orgLoginOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {orgLoginOpen && (
              <Animated.View style={[
                styles.loginForm,
                {
                  opacity: orgOpenAnim,
                  transform: [{
                    scaleY: orgOpenAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  }],
                }
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="שם הארגון"
                  value={orgQuery}
                  onChangeText={setOrgQuery}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.submitButton, isCheckingOrg && styles.submitButtonDisabled]}
                  disabled={isCheckingOrg}
                >
                  {isCheckingOrg ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.submitButtonText}>חפש ארגון</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Email Login */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.loginOptionButton}
              onPress={toggleEmailLogin}
            >
              <Text style={styles.loginOptionText}>כניסה עם אימייל</Text>
              <Ionicons
                name={emailLoginOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {emailLoginOpen && (
              <Animated.View style={[
                styles.loginForm,
                {
                  opacity: emailOpenAnim,
                  transform: [{
                    scaleY: emailOpenAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  }],
                }
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="כתובת אימייל"
                  value={emailValue}
                  onChangeText={setEmailValue}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textSecondary}
                />
                {emailStep === 'password' && (
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="סיסמה"
                    value={passwordValue}
                    onChangeText={setPasswordValue}
                    secureTextEntry
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
                <TouchableOpacity
                  style={[styles.submitButton, isEmailBusy && styles.submitButtonDisabled]}
                  disabled={isEmailBusy}
                >
                  {isEmailBusy ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {emailStep === 'email' ? 'המשך' : 'התחבר'}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  overlayTouchable: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1001,
    shadowColor: colors.black,
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  title: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  characterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  characterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  seekerButton: {
    backgroundColor: colors.info,
  },
  offererButton: {
    backgroundColor: colors.success,
  },
  characterButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  guestButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  loginOptionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginOptionText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  loginForm: {
    marginTop: 12,
    gap: 12,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  passwordInput: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default LoginSidePanel;
