// File overview:
// - Purpose: App settings screen (language, theme, notifications, privacy, org/admin links). Handles logout with guest/auth distinctions.
// - Reached from: Top bar (via `TopBarNavigator`) and directly from multiple stacks as 'SettingsScreen'.
// - Provides: Platform-specific scroll (web vs native), language modal and i18n+RTL application, navigation to About, Org Dashboard, Admin Approvals.
// - Reads from context: `useUser()` -> `isGuestMode`, `selectedUser`, `isAuthenticated`, `signOut`.
// - Side effects: On logout, navigates to 'LoginScreen'; on language change, persists to AsyncStorage and toggles RTL.
const SettingsScreen_LOG = 'SettingsScreen';
/**
 * SettingsScreen - Modern Settings Interface
 * 
 * Features:
 * - Platform-specific scrolling (CSS overflow for web, ScrollView for native)
 * - User profile display for logged-in users
 * - Guest mode support with appropriate UI adjustments
 * - Comprehensive settings options with modern UI design
 * - Smooth scrolling on all platforms
 * 
 * @author Karma Community Team
 * @version 2.0.0
 */

import React, { useState, useCallback, useEffect, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  I18nManager,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { useUser, type User } from '../stores/userStore';
import { useWebMode, type WebMode } from '../stores/webModeStore';
import GuestModeNotice from '../components/GuestModeNotice';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '../app/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScrollPositionWithHandler } from '../hooks/useScrollPosition';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import { navigateToAuthenticatedLandingSite } from '../navigations/landingSiteNavigation';
import { logger } from '../utils/loggerService';
import { apiService } from '../utils/apiService';
import { KC_ORGANIZATION_ROOT_EMAIL } from '../utils/org.constants';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: FontSizes.heading1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  userSection: {
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 8,
  },

  // Web: Custom scrollable container with CSS overflow
  webScrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto' as any,
      overflowX: 'hidden' as any,
    }),
    height: '100%',
    maxHeight: SCREEN_HEIGHT - 200, // Reserve space for header
  } as any,
  webScrollContent: {
    paddingBottom: 40,
    minHeight: SCREEN_HEIGHT * 1.2, // Ensure content is scrollable
  },
  // Native: Standard ScrollView styles
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  settingsItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  dangerousItem: {
    backgroundColor: colors.errorLight,
  },
  settingsItemLeft: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.pinkLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerLtr: {
    marginRight: 16,
    marginLeft: 0,
  },
  iconContainerRtl: {
    marginLeft: 16,
    marginRight: 0,
  },
  dangerousIconContainer: {
    backgroundColor: colors.errorLight,
  },
  textContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlayBlack40, alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: colors.white, width: 300, borderRadius: 12, padding: 16, gap: 8 },
  modalTitle: { fontSize: FontSizes.medium, color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  modalOption: { paddingVertical: 10 },
  modalOptionText: { fontSize: FontSizes.body, color: colors.textPrimary, textAlign: 'center' },
  logoutModalCard: {
    backgroundColor: colors.background,
    width: 320,
    borderRadius: 16,
    padding: 24,
    ...(Platform.OS === 'web' && {
      boxShadow: `0 4px 20px ${colors.overlayBlack15}`,
    }),
  },
  logoutModalTitle: {
    fontSize: FontSizes.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },
  logoutModalMessage: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    gap: 12,
    justifyContent: 'space-between',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalButtonCancel: {
    backgroundColor: colors.backgroundSecondary,
  },
  logoutModalButtonConfirm: {
    backgroundColor: colors.error,
  },
  logoutModalButtonTextCancel: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  logoutModalButtonTextConfirm: {
    fontSize: FontSizes.body,
    color: colors.white,
    fontWeight: '600',
  },
  reportModalCard: {
    backgroundColor: colors.background,
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    ...(Platform.OS === 'web' && {
      boxShadow: `0 4px 20px ${colors.overlayBlack15}`,
    }),
  },
  reportModalTitle: {
    fontSize: FontSizes.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  reportModalSubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reportInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
});


type SettingsItemProps = Readonly<{
  isRTL: boolean;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  color?: string;
  dangerous?: boolean;
}>;

function SettingsItem({
  isRTL,
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  color = colors.textPrimary,
  dangerous = false,
}: SettingsItemProps) {
  const rowFlex = isRTL ? 'row-reverse' : 'row';
  const alignMain: 'left' | 'right' = isRTL ? 'right' : 'left';
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { flexDirection: rowFlex }, dangerous && styles.dangerousItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingsItemLeft, { flexDirection: rowFlex }]}>
        <View
          style={[
            styles.iconContainer,
            dangerous && styles.dangerousIconContainer,
            isRTL ? styles.iconContainerRtl : styles.iconContainerLtr,
          ]}
        >
          <Ionicons
            name={icon as any}
            size={22}
            color={dangerous ? colors.error : colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingsTitle, { color: dangerous ? colors.error : color, textAlign: alignMain }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.settingsSubtitle, { textAlign: alignMain }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {showArrow ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
          style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
        />
      ) : null}
    </TouchableOpacity>
  );
}


async function resolveOrgAdminUserId(adminEmail: string): Promise<string | null> {
  try {
    const resolveRes = await apiService.resolveUserId({ email: adminEmail });
    if (resolveRes.success && resolveRes.data?.id) {
      return resolveRes.data.id;
    }
  } catch (e) {
    console.warn('resolveOrgAdminUserId (resolveUserId) failed', e);
  }

  try {
    const searchRes = await apiService.getUsers({ search: adminEmail, limit: 1 });
    if (
      searchRes.success &&
      searchRes.data &&
      Array.isArray(searchRes.data) &&
      searchRes.data.length > 0
    ) {
      const adminUser = searchRes.data.find(
        (u: { email?: string; id: string }) =>
          u.email?.toLowerCase() === adminEmail.toLowerCase(),
      );
      if (adminUser) {
        return adminUser.id;
      }
      return searchRes.data[0].id;
    }
  } catch (e) {
    console.warn('resolveOrgAdminUserId (getUsers) failed', e);
  }

  return null;
}

type SettingsListHandlers = Readonly<{
  onLanguagePress: () => void;
  onAboutPress: () => void;
  onReportPress: () => void;
  onLogoutPress: () => void;
  onNotificationsPress: () => void;
  onThemePress: () => void;
  onPrivacyPress: () => void;
  onClearCachePress: () => void;
  onScrollTest: () => void;
}>;

function notifyComingSoon(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(message);
  } else {
    Alert.alert(title, message);
  }
}

function notifyGuestLoginHint(t: TFunction) {
  if (Platform.OS === 'web') {
    alert(t('common:guestLoginHint'));
  } else {
    Alert.alert(t('common:error'), t('common:guestLoginHint'));
  }
}

function runClearCacheFlow(t: TFunction) {
  if (Platform.OS === 'web') {
    const confirmed = globalThis.confirm(t('settings:clearCacheConfirm'));
    if (confirmed) {
      logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Cache cleared');
      alert(t('settings:cacheCleared'));
    }
    return;
  }

  Alert.alert(
    t('settings:clearCache'),
    t('settings:clearCacheConfirm'),
    [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('settings:clear'),
        style: 'destructive',
        onPress: () => {
          logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Cache cleared');
          Alert.alert(t('common:done'), t('settings:cacheCleared'));
        },
      },
    ],
  );
}

async function submitSettingsUserReport(reportText: string, selectedUser: User | null): Promise<void> {
  const adminId = await resolveOrgAdminUserId(KC_ORGANIZATION_ROOT_EMAIL);

  if (!adminId) {
    console.error('Admin user not found for report via any method');
    throw new Error('Admin not found');
  }

  const currentUserId = selectedUser?.id;

  if (!currentUserId) {
    throw new Error('User not logged in');
  }

  const taskData = {
    title: `Report from ${selectedUser?.name || 'User'}`,
    description: `User Email: ${selectedUser?.email}\nUser ID: ${currentUserId}\n\nReport Content:\n${reportText}`,
    status: 'open',
    priority: 'high',
    category: 'דיווח',
    assignees: [adminId],
    created_by: currentUserId,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const taskRes = await apiService.createTask(taskData);

  if (!taskRes.success) {
    throw new Error(taskRes.error || 'Failed to create report task');
  }
}

function notifyReportOutcome(kind: 'success' | 'error', t: TFunction) {
  if (kind === 'success') {
    if (Platform.OS === 'web') {
      alert(t('settings:reportSuccess'));
    } else {
      Alert.alert(t('common:done'), t('settings:reportSuccess'));
    }
    return;
  }
  if (Platform.OS === 'web') {
    alert(t('settings:reportError'));
  } else {
    Alert.alert(t('common:error'), t('settings:reportError'));
  }
}

function runScrollViewConnectivityProbe(scrollViewRef: React.RefObject<ScrollView | FlatList | null>) {
  const ref = scrollViewRef.current;
  if (!ref) {
    logger.debug(SettingsScreen_LOG, '🧪 SettingsScreen - ScrollView ref is null!');
    return;
  }

  logger.debug(SettingsScreen_LOG, '🧪 SettingsScreen - ScrollView ref exists, attempting to scroll');

  if ('scrollTo' in ref) {
    ref.scrollTo({ y: 200, animated: true });
    setTimeout(() => {
      logger.debug(SettingsScreen_LOG, '🧪 SettingsScreen - Scrolling back to top');
      const inner = scrollViewRef.current;
      if (inner && 'scrollTo' in inner) {
        inner.scrollTo({ y: 0, animated: true });
      }
    }, 2000);
    return;
  }

  if ('scrollToOffset' in ref) {
    ref.scrollToOffset({ offset: 200, animated: true });
    setTimeout(() => {
      logger.debug(SettingsScreen_LOG, '🧪 SettingsScreen - Scrolling back to top');
      const inner = scrollViewRef.current;
      if (inner && 'scrollToOffset' in inner) {
        inner.scrollToOffset({ offset: 0, animated: true });
      }
    }, 2000);
  }
}

async function resetNavigationAfterLogout(mode: WebMode) {
  const targetRoute = Platform.OS === 'web' && mode === 'site' ? 'LandingSiteScreen' : 'LoginScreen';

  logger.debug('SettingsScreen', 'Navigating after logout', { targetRoute, mode });

  const guardContext = {
    isAuthenticated: false,
    isGuestMode: false,
    isAdmin: false,
    mode,
  };

  const guardResult = await checkNavigationGuards(
    {
      type: 'reset',
      index: 0,
      routes: [{ name: targetRoute }],
    },
    guardContext,
  );

  if (!guardResult.allowed && guardResult.redirectTo) {
    await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
  } else {
    await navigationQueue.reset(0, [{ name: targetRoute }], 2);
  }
}

function useSettingsAuthRedirect(
  isAuthenticated: boolean,
  isGuestMode: boolean,
  selectedUser: User | null,
  mode: WebMode,
) {
  useEffect(() => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Auth state changed:', {
      isAuthenticated,
      isGuestMode,
      selectedUser: selectedUser?.name || 'null',
      mode,
    });

    if (isAuthenticated || isGuestMode) {
      return;
    }

    void resetNavigationAfterLogout(mode);
  }, [isAuthenticated, isGuestMode, selectedUser, mode]);
}

function useSettingsFocusRefresh() {
  const [, bump] = useReducer((state: number) => state + 1, 0);
  useFocusEffect(
    useCallback(() => {
      logger.logScreenOpened('SettingsScreen');
      logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Screen focused, refreshing data...');
      bump();
    }, [bump]),
  );
}

type SettingsScreenModalsProps = Readonly<{
  isRTL: boolean;
  t: TFunction;
  showLangModal: boolean;
  setShowLangModal: (v: boolean) => void;
  applyLanguage: (lang: 'he' | 'en') => void;
  currentLang: string;
  showLogoutModal: boolean;
  handleLogoutCancel: () => void;
  handleLogoutConfirm: () => void;
  showReportModal: boolean;
  setShowReportModal: (v: boolean) => void;
  reportText: string;
  setReportText: (v: string) => void;
  isSendingReport: boolean;
  handleSendReport: () => void;
}>;

function SettingsScreenModals({
  isRTL,
  t,
  showLangModal,
  setShowLangModal,
  applyLanguage,
  currentLang,
  showLogoutModal,
  handleLogoutCancel,
  handleLogoutConfirm,
  showReportModal,
  setShowReportModal,
  reportText,
  setReportText,
  isSendingReport,
  handleSendReport,
}: SettingsScreenModalsProps) {
  return (
    <>
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:selectLanguage')}</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => applyLanguage('he')}>
              <Text style={styles.modalOptionText}>{`${t('settings:lang.he')} ${currentLang === 'he' ? '✓' : ''}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => applyLanguage('en')}>
              <Text style={styles.modalOptionText}>{`${t('settings:lang.en')} ${currentLang === 'en' ? '✓' : ''}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, { marginTop: 8 }]} onPress={() => setShowLangModal(false)}>
              <Text style={[styles.modalOptionText, { color: colors.textSecondary }]}>{t('common:cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={handleLogoutCancel}>
        <View style={styles.modalBackdrop}>
          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>{t('settings:logoutTitle')}</Text>
            <Text style={styles.logoutModalMessage}>{t('settings:logoutMessage')}</Text>
            <View style={[styles.logoutModalButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonCancel]}
                onPress={handleLogoutCancel}
              >
                <Text style={styles.logoutModalButtonTextCancel}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonConfirm]}
                onPress={handleLogoutConfirm}
              >
                <Text style={styles.logoutModalButtonTextConfirm}>{t('settings:logoutConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.reportModalCard}>
            <Text style={styles.reportModalTitle}>{t('settings:reportTitle')}</Text>
            <Text style={styles.reportModalSubtitle}>{t('settings:reportIssueDesc')}</Text>

            <TextInput
              style={styles.reportInput}
              multiline
              numberOfLines={4}
              placeholder={t('settings:reportPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={reportText}
              onChangeText={setReportText}
              textAlignVertical="top"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <View style={[styles.logoutModalButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonCancel]}
                onPress={() => setShowReportModal(false)}
                disabled={isSendingReport}
              >
                <Text style={styles.logoutModalButtonTextCancel}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.logoutModalButton,
                  styles.logoutModalButtonConfirm,
                  { backgroundColor: colors.primary, opacity: isSendingReport ? 0.7 : 1 },
                ]}
                onPress={handleSendReport}
                disabled={isSendingReport || !reportText.trim()}
              >
                <Text style={[styles.logoutModalButtonTextConfirm, { color: colors.white }]}>
                  {isSendingReport ? t('common:loading') : t('settings:reportSend')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

type SettingsWebBodyProps = Readonly<{
  isRTL: boolean;
  isGuestMode: boolean;
  currentLang: string;
  handlers: SettingsListHandlers;
  t: TFunction;
}>;

function SettingsWebBody({ isRTL, isGuestMode, currentLang, handlers, t }: SettingsWebBodyProps) {
  return (
    <View style={styles.webScrollContainer}>
      <View style={styles.webScrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:appSettings')}</Text>

          <SettingsItem
            isRTL={isRTL}
            icon="language-outline"
            title={t('settings:language')}
            subtitle={currentLang === 'he' ? t('settings:lang.he') : t('settings:lang.en')}
            onPress={handlers.onLanguagePress}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:aboutSection')}</Text>

          <SettingsItem
            isRTL={isRTL}
            icon="information-circle-outline"
            title={t('settings:about')}
            subtitle={t('settings:aboutDesc')}
            onPress={handlers.onAboutPress}
          />

          <SettingsItem
            isRTL={isRTL}
            icon="warning-outline"
            title={t('settings:reportIssue')}
            subtitle={t('settings:reportIssueDesc')}
            onPress={handlers.onReportPress}
          />
        </View>

        <View style={styles.section}>
          <SettingsItem
            isRTL={isRTL}
            icon={isGuestMode ? 'arrow-back-outline' : 'log-out-outline'}
            title={isGuestMode ? t('settings:guestBack') : t('settings:logout')}
            subtitle={isGuestMode ? t('settings:guestBackDesc') : t('settings:logoutDesc')}
            onPress={handlers.onLogoutPress}
            showArrow={false}
            dangerous={!isGuestMode}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:comingSoonSection')}</Text>

          <SettingsItem
            isRTL={isRTL}
            icon="notifications-outline"
            title={t('settings:notifications')}
            subtitle={t('settings:notificationsDesc')}
            onPress={handlers.onNotificationsPress}
          />

          <SettingsItem
            isRTL={isRTL}
            icon="color-palette-outline"
            title={t('settings:theme')}
            subtitle={t('settings:themeDesc')}
            onPress={handlers.onThemePress}
          />

          <SettingsItem
            isRTL={isRTL}
            icon="shield-outline"
            title={t('settings:privacy')}
            subtitle={t('settings:privacyDesc')}
            onPress={handlers.onPrivacyPress}
          />

          <SettingsItem
            isRTL={isRTL}
            icon="trash-outline"
            title={t('settings:clearCache')}
            subtitle={t('settings:clearCacheDesc')}
            onPress={handlers.onClearCachePress}
          />

          <SettingsItem
            isRTL={isRTL}
            icon="flask-outline"
            title={t('settings:scrollTestTitle')}
            subtitle={t('settings:scrollTestSubtitle')}
            onPress={handlers.onScrollTest}
          />
        </View>
      </View>
    </View>
  );
}

type SettingsScreenNavigation = Readonly<{
  navigate: (name: string) => void;
}>;

type SettingsNativeBodyProps = Readonly<{
  scrollViewRef: React.RefObject<ScrollView | FlatList | null>;
  onScroll: (event: unknown) => void;
  screenHeight: number;
  isRTL: boolean;
  isGuestMode: boolean;
  selectedUser: User | null;
  currentLang: string;
  navigation: SettingsScreenNavigation;
  handlers: SettingsListHandlers;
  t: TFunction;
}>;

function SettingsNativeBody({
  scrollViewRef,
  onScroll,
  screenHeight,
  isRTL,
  isGuestMode,
  selectedUser,
  currentLang,
  navigation,
  handlers,
  t,
}: SettingsNativeBodyProps) {
  return (
    <ScrollView
      ref={scrollViewRef as React.RefObject<ScrollView>}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
      scrollEnabled
      bounces={Platform.OS === 'ios'}
      overScrollMode={Platform.OS === 'android' ? 'auto' : undefined}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => {
        onScroll(event);
      }}
      onScrollBeginDrag={() => {
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Scroll begin drag detected!');
      }}
      onScrollEndDrag={() => {
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Scroll end drag detected!');
      }}
      onMomentumScrollBegin={() => {
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Momentum scroll begin!');
      }}
      onMomentumScrollEnd={() => {
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Momentum scroll end!');
      }}
      onContentSizeChange={(contentWidth, contentHeight) => {
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Content size changed:', { contentWidth, contentHeight });
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Screen height:', { screenHeight });
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - Should scroll:', {
          shouldScroll: contentHeight > screenHeight,
        });
      }}
      onLayout={(event) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        logger.debug(SettingsScreen_LOG, '📜 SettingsScreen - ScrollView layout:', { x, y, width, height });
      }}
      scrollEventThrottle={16}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:appSettings')}</Text>
        {selectedUser?.roles?.includes('org_admin') ? (
          <SettingsItem
            isRTL={isRTL}
            icon="briefcase-outline"
            title={t('settings:orgDashboardTitle')}
            subtitle={t('settings:orgDashboardSubtitle')}
            onPress={() => navigation.navigate('OrgDashboardScreen')}
          />
        ) : null}
        {selectedUser?.roles?.includes('admin') ? (
          <SettingsItem
            isRTL={isRTL}
            icon="checkmark-done-outline"
            title={t('settings:adminApprovalsTitle')}
            subtitle={t('settings:adminApprovalsSubtitle')}
            onPress={() => navigation.navigate('AdminOrgApprovalsScreen')}
          />
        ) : null}

        <SettingsItem
          isRTL={isRTL}
          icon="language-outline"
          title={t('settings:language')}
          subtitle={currentLang === 'he' ? t('settings:lang.he') : t('settings:lang.en')}
          onPress={handlers.onLanguagePress}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:myActivitySection')}</Text>

        <SettingsItem
          isRTL={isRTL}
          icon="trophy-outline"
          title={t('challenges:myChallenges')}
          subtitle={t('settings:myChallengesDesc')}
          onPress={() => navigation.navigate('ChallengeStatisticsScreen')}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:aboutSection')}</Text>

        <SettingsItem
          isRTL={isRTL}
          icon="information-circle-outline"
          title={t('settings:about')}
          subtitle={t('settings:aboutDesc')}
          onPress={handlers.onAboutPress}
        />

        <SettingsItem
          isRTL={isRTL}
          icon="warning-outline"
          title={t('settings:reportIssue')}
          subtitle={t('settings:reportIssueDesc')}
          onPress={handlers.onReportPress}
        />
      </View>

      <View style={styles.section}>
        <SettingsItem
          isRTL={isRTL}
          icon={isGuestMode ? 'arrow-back-outline' : 'log-out-outline'}
          title={isGuestMode ? t('settings:guestBack') : t('settings:logout')}
          subtitle={isGuestMode ? t('settings:guestBackDesc') : t('settings:logoutDesc')}
          onPress={handlers.onLogoutPress}
          showArrow={false}
          dangerous={!isGuestMode}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings:comingSoonSection')}</Text>

        <SettingsItem
          isRTL={isRTL}
          icon="notifications-outline"
          title={t('settings:notifications')}
          subtitle={t('settings:notificationsDesc')}
          onPress={handlers.onNotificationsPress}
        />

        <SettingsItem
          isRTL={isRTL}
          icon="color-palette-outline"
          title={t('settings:theme')}
          subtitle={t('settings:themeDesc')}
          onPress={handlers.onThemePress}
        />

        <SettingsItem
          isRTL={isRTL}
          icon="shield-outline"
          title={t('settings:privacy')}
          subtitle={t('settings:privacyDesc')}
          onPress={handlers.onPrivacyPress}
        />

        <SettingsItem
          isRTL={isRTL}
          icon="trash-outline"
          title={t('settings:clearCache')}
          subtitle={t('settings:clearCacheDesc')}
          onPress={handlers.onClearCachePress}
        />

        <SettingsItem
          isRTL={isRTL}
          icon="flask-outline"
          title={t('settings:scrollTestTitle')}
          subtitle={t('settings:scrollTestSubtitle')}
          onPress={handlers.onScrollTest}
        />
      </View>
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { signOut, isGuestMode, selectedUser, isAuthenticated } = useUser();
  const { mode } = useWebMode();
  const { ref: scrollRef, onScroll } = useScrollPositionWithHandler('SettingsScreen', {
    enabled: true,
  });
  const scrollViewRef = scrollRef;
  useSettingsFocusRefresh();
  const { t } = useTranslation(['settings', 'common']);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'he');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);

  useSettingsAuthRedirect(isAuthenticated, isGuestMode, selectedUser, mode);

  const isRTL = currentLang === 'he';

  useEffect(() => {
    const sync = (lng: string) => {
      const code = lng?.split('-')[0];
      if (code === 'he' || code === 'en') {
        setCurrentLang(code);
      }
    };
    sync(i18n.language || 'he');
    i18n.on('languageChanged', sync);
    return () => {
      i18n.off('languageChanged', sync);
    };
  }, []);

  logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Rendered with isGuestMode:', { isGuestMode });
  logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Platform:', { os: Platform.OS });
  logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const navigateAfterLogout = async () => {
    await resetNavigationAfterLogout(mode);
  };

  const handleAboutPress = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - About pressed');
    navigateToAuthenticatedLandingSite(navigation);
  };

  const handleLogoutPress = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ 14SettingsScreen - Logout pressed');
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Platform:', { os: Platform.OS });
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - isGuestMode:', { isGuestMode });

    if (isGuestMode) {
      logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Guest mode detected, direct logout without confirmation');
      signOut().then(() => {
        logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Guest logout completed');
        setTimeout(() => {
          void navigateAfterLogout();
        }, 100);
      });
      return;
    }

    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Showing logout confirmation modal');
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Logout confirmed');
    setShowLogoutModal(false);
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Calling signOut()');
    await signOut();
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - signOut() completed');

    setTimeout(() => {
      void navigateAfterLogout();
    }, 100);
  };

  const handleLogoutCancel = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Logout cancelled');
    setShowLogoutModal(false);
  };

  const handleNotificationsPress = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Notifications pressed');
    notifyComingSoon(t('settings:notificationsTitle'), t('settings:notificationsComingSoon'));
  };

  const handlePrivacyPress = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Privacy pressed');
    notifyComingSoon(t('settings:privacyTitle'), t('settings:privacyComingSoon'));
  };

  const handleThemePress = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Theme pressed');
    notifyComingSoon(t('settings:themeTitle'), t('settings:themeComingSoon'));
  };

  const applyLanguage = async (lang: 'he' | 'en') => {
    await AsyncStorage.setItem('app_language', lang);
    await i18n.changeLanguage(lang);
    setCurrentLang(lang);
    const rtl = lang === 'he';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      if (Platform.OS !== 'web') {
        Alert.alert(t('settings:restartRequired'), t('settings:restartDesc'));
      }
    }
    setShowLangModal(false);
  };

  const handleLanguagePress = () => {
    setShowLangModal(true);
  };

  const handleClearCachePress = () => {
    logger.debug(SettingsScreen_LOG, '⚙️ SettingsScreen - Clear cache pressed');
    runClearCacheFlow(t);
  };

  const handleReportPress = () => {
    if (!isAuthenticated) {
      notifyGuestLoginHint(t);
      return;
    }
    setShowReportModal(true);
  };

  const handleSendReport = async () => {
    if (!reportText.trim()) return;

    setIsSendingReport(true);
    try {
      await submitSettingsUserReport(reportText, selectedUser);
      setReportText('');
      setShowReportModal(false);
      notifyReportOutcome('success', t);
    } catch (error) {
      console.error('Failed to send report:', error);
      notifyReportOutcome('error', t);
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleScrollTest = () => {
    logger.debug(SettingsScreen_LOG, '🧪 SettingsScreen - Testing scroll functionality');
    runScrollViewConnectivityProbe(scrollViewRef);
  };

  const listHandlers: SettingsListHandlers = {
    onLanguagePress: handleLanguagePress,
    onAboutPress: handleAboutPress,
    onReportPress: handleReportPress,
    onLogoutPress: handleLogoutPress,
    onNotificationsPress: handleNotificationsPress,
    onThemePress: handleThemePress,
    onPrivacyPress: handlePrivacyPress,
    onClearCachePress: handleClearCachePress,
    onScrollTest: handleScrollTest,
  };

  return (
    <ScreenWrapper style={styles.container}>
      <SettingsScreenModals
        isRTL={isRTL}
        t={t}
        showLangModal={showLangModal}
        setShowLangModal={setShowLangModal}
        applyLanguage={applyLanguage}
        currentLang={currentLang}
        showLogoutModal={showLogoutModal}
        handleLogoutCancel={handleLogoutCancel}
        handleLogoutConfirm={handleLogoutConfirm}
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        reportText={reportText}
        setReportText={setReportText}
        isSendingReport={isSendingReport}
        handleSendReport={handleSendReport}
      />

      {!isGuestMode && selectedUser ? (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { textAlign: isRTL ? 'right' : 'left' }]}>{selectedUser.name}</Text>
            <Text style={[styles.userEmail, { textAlign: isRTL ? 'right' : 'left' }]}>{selectedUser.email}</Text>
          </View>
        </View>
      ) : null}

      {isGuestMode ? <GuestModeNotice variant="compact" /> : null}

      {Platform.OS === 'web' ? (
        <SettingsWebBody
          isRTL={isRTL}
          isGuestMode={isGuestMode}
          currentLang={currentLang}
          handlers={listHandlers}
          t={t}
        />
      ) : (
        <SettingsNativeBody
          scrollViewRef={scrollViewRef}
          onScroll={onScroll}
          screenHeight={SCREEN_HEIGHT}
          isRTL={isRTL}
          isGuestMode={isGuestMode}
          selectedUser={selectedUser}
          currentLang={currentLang}
          navigation={navigation as SettingsScreenNavigation}
          handlers={listHandlers}
          t={t}
        />
      )}
    </ScreenWrapper>
  );
}
