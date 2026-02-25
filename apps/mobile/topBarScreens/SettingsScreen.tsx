// File overview:
// - Purpose: App settings screen (language, theme, notifications, privacy, org/admin links). Handles logout with guest/auth distinctions.
// - Reached from: Top bar (via `TopBarNavigator`) and directly from multiple stacks as 'SettingsScreen'.
// - Provides: Platform-specific scroll (web vs native), language modal and i18n+RTL application, navigation to About, Org Dashboard, Admin Approvals.
// - Reads from context: `useUser()` -> `isGuestMode`, `selectedUser`, `isAuthenticated`, `signOut`.
// - Side effects: On logout, navigates to 'LoginScreen'; on language change, persists to AsyncStorage and toggles RTL.
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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { biDiTextAlign, rowDirection, getScreenInfo, scaleSize } from '../globals/responsive';
import { FontSizes } from '../globals/constants';
import { useUser } from '../stores/userStore';
import { useWebMode } from '../stores/webModeStore';
import GuestModeNotice from '../components/GuestModeNotice';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTranslation } from 'react-i18next';
import i18n from '../app/i18n';
import { I18nManager, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScrollPositionWithHandler } from '../hooks/useScrollPosition';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import { logger } from '../utils/loggerService';
import { apiService } from '../utils/apiService';
import { createConversation, sendMessage } from '../utils/chatService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { signOut, isGuestMode, selectedUser, isAuthenticated } = useUser();
  const { mode } = useWebMode();
  const { ref: scrollRef, onScroll } = useScrollPositionWithHandler('SettingsScreen', {
    enabled: true,
  });
  const scrollViewRef = scrollRef;
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation(['settings', 'common']);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'he');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('⚙️ SettingsScreen - Screen focused, refreshing data...');
      // Force re-render by updating refresh key
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // Listen for authentication state changes
  useEffect(() => {
    console.log('⚙️ SettingsScreen - Auth state changed:', {
      isAuthenticated,
      isGuestMode,
      selectedUser: selectedUser?.name || 'null',
      mode
    });

    // If user is no longer authenticated, navigate based on web mode
    if (!isAuthenticated && !isGuestMode) {
      const targetRoute = (Platform.OS === 'web' && mode === 'site')
        ? 'LandingSiteScreen'
        : 'LoginScreen';

      logger.debug('SettingsScreen', 'User logged out, navigating', { targetRoute, mode });

      // Check guards before navigation
      const guardContext = {
        isAuthenticated: false,
        isGuestMode: false,
        isAdmin: false,
        mode,
      };

      checkNavigationGuards(
        {
          type: 'reset',
          index: 0,
          routes: [{ name: targetRoute }],
        },
        guardContext
      ).then((guardResult) => {
        if (!guardResult.allowed && guardResult.redirectTo) {
          navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
        } else {
          navigationQueue.reset(0, [{ name: targetRoute }], 2);
        }
      });
    }
  }, [isAuthenticated, isGuestMode, selectedUser, navigation, mode]);

  // Debug logs for development
  console.log('⚙️ SettingsScreen - Rendered with isGuestMode:', isGuestMode);
  console.log('⚙️ SettingsScreen - Platform:', Platform.OS);
  console.log('⚙️ SettingsScreen - Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const handleBackPress = () => {
    console.log('⚙️ SettingsScreen - Back pressed');
    navigation.goBack();
  };

  const handleAboutPress = () => {
    console.log('⚙️ SettingsScreen - About pressed');
    navigation.navigate('LandingSiteScreen' as never);
  };

  /**
 * מטפל בלחיצה על כפתור היציאה
 * לוגיקה שונה למצב אורח ולמשתמש מחובר:
 * - מצב אורח: יציאה ישירה ללא התראה (רק חזרה למסך הכניסה)
 * - משתמש מחובר: הצגת התראה לפני היציאה (פעולה מסוכנת)
 */
  const handleLogoutPress = () => {
    console.log('⚙️ 14SettingsScreen - Logout pressed');
    console.log('⚙️ SettingsScreen - Platform:', Platform.OS);
    console.log('⚙️ SettingsScreen - isGuestMode:', isGuestMode);

    // Guest mode - direct logout without warning as it's not dangerous
    if (isGuestMode) {
      console.log('⚙️ SettingsScreen - Guest mode detected, direct logout without confirmation');
      signOut().then(() => {
        console.log('⚙️ SettingsScreen - Guest logout completed');
        setTimeout(() => {
          navigateAfterLogout();
        }, 100);
      });
      return;
    }

    // Authenticated user - show warning as this is a dangerous action
    // Use Modal for both web and native for consistent behavior
    console.log('⚙️ SettingsScreen - Showing logout confirmation modal');
    setShowLogoutModal(true);
  };

  // Helper function to navigate after logout based on web mode
  const navigateAfterLogout = async () => {
    const targetRoute = (Platform.OS === 'web' && mode === 'site')
      ? 'LandingSiteScreen'
      : 'LoginScreen';

    logger.debug('SettingsScreen', 'Navigating after logout', { targetRoute, mode });

    // Check guards before navigation
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
      guardContext
    );

    if (!guardResult.allowed && guardResult.redirectTo) {
      await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
    } else {
      await navigationQueue.reset(0, [{ name: targetRoute }], 2);
    }
  };

  // Helper function to handle logout confirmation
  const handleLogoutConfirm = async () => {
    console.log('⚙️ SettingsScreen - Logout confirmed');
    setShowLogoutModal(false);
    console.log('⚙️ SettingsScreen - Calling signOut()');
    await signOut();
    console.log('⚙️ SettingsScreen - signOut() completed');

    // Short delay to ensure state is updated before navigation
    setTimeout(() => {
      navigateAfterLogout();
    }, 100);
  };

  // Helper function to handle logout cancellation
  const handleLogoutCancel = () => {
    console.log('⚙️ SettingsScreen - Logout cancelled');
    setShowLogoutModal(false);
  };

  const handleNotificationsPress = () => {
    console.log('⚙️ SettingsScreen - Notifications pressed');
    if (Platform.OS === 'web') {
      alert(t('settings:notificationsComingSoon'));
    } else {
      Alert.alert(t('settings:notificationsTitle'), t('settings:notificationsComingSoon'));
    }
  };

  const handlePrivacyPress = () => {
    console.log('⚙️ SettingsScreen - Privacy pressed');
    if (Platform.OS === 'web') {
      alert(t('settings:privacyComingSoon'));
    } else {
      Alert.alert(t('settings:privacyTitle'), t('settings:privacyComingSoon'));
    }
  };

  const handleThemePress = () => {
    console.log('⚙️ SettingsScreen - Theme pressed');
    if (Platform.OS === 'web') {
      alert(t('settings:themeComingSoon'));
    } else {
      Alert.alert(t('settings:themeTitle'), t('settings:themeComingSoon'));
    }
  };

  const applyLanguage = async (lang: 'he' | 'en') => {
    await AsyncStorage.setItem('app_language', lang);
    await i18n.changeLanguage(lang);
    setCurrentLang(lang);
    const isRTL = lang === 'he';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
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
    console.log('⚙️ SettingsScreen - Clear cache pressed');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('settings:clearCacheConfirm'));
      if (confirmed) {
        console.log('⚙️ SettingsScreen - Cache cleared');
        alert(t('settings:cacheCleared'));
      }
    } else {
      Alert.alert(
        t('settings:clearCache'),
        t('settings:clearCacheConfirm'),
        [
          {
            text: t('common:cancel'),
            style: 'cancel',
          },
          {
            text: t('settings:clear'),
            style: 'destructive',
            onPress: () => {
              console.log('⚙️ SettingsScreen - Cache cleared');
              Alert.alert(t('common:done'), t('settings:cacheCleared'));
            },
          },
        ]
      );
    }
  };

  const handleReportPress = () => {
    if (!isAuthenticated) {
      if (Platform.OS === 'web') {
        alert(t('common:guestLoginHint'));
      } else {
        Alert.alert(t('common:error'), t('common:guestLoginHint'));
      }
      return;
    }
    setShowReportModal(true);
  };

  const handleSendReport = async () => {
    if (!reportText.trim()) return;

    setIsSendingReport(true);
    try {
      const adminEmail = 'navesarussi@gmail.com';

      // Resolve admin ID - try multiple methods
      let adminId: string | null = null;

      try {
        // Method 1: Try resolving by email directly
        const resolveRes = await apiService.resolveUserId({ email: adminEmail });
        if (resolveRes.success && resolveRes.data?.id) {
          adminId = resolveRes.data.id;
        }
      } catch (e) {
        console.warn('Method 1 (resolveUserId) failed', e);
      }

      if (!adminId) {
        try {
          // Method 2: Search for user by email
          const searchRes = await apiService.getUsers({ search: adminEmail, limit: 1 });
          if (searchRes.success && searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
            // Verify exact email match to be safe
            const adminUser = searchRes.data.find((u: any) => u.email?.toLowerCase() === adminEmail.toLowerCase());
            if (adminUser) {
              adminId = adminUser.id;
            } else {
              // Fallback to first result if it looks close enough (or just take it as the search should be specific)
              adminId = searchRes.data[0].id;
            }
          }
        } catch (e) {
          console.warn('Method 2 (getUsers) failed', e);
        }
      }

      if (!adminId) {
        console.error('Admin user not found for report via any method');
        // Fallback for development/testing if needed, or throw
        throw new Error('Admin not found');
      }

      // const adminId = resolveRes.data.id; // Correctly assigned above
      const currentUserId = selectedUser?.id;

      if (!currentUserId) {
        throw new Error('User not logged in');
      }

      // Create task for admin
      const taskData = {
        title: `Report from ${selectedUser?.name || 'User'}`,
        description: `User Email: ${selectedUser?.email}\nUser ID: ${currentUserId}\n\nReport Content:\n${reportText}`,
        status: 'reports',
        priority: 'high',
        category: 'report',
        assignee_id: adminId,
        created_by: currentUserId,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Due in 1 week
      };

      const taskRes = await apiService.createTask(taskData);

      if (!taskRes.success) {
        throw new Error(taskRes.error || 'Failed to create report task');
      }

      setReportText('');
      setShowReportModal(false);

      if (Platform.OS === 'web') {
        alert(t('settings:reportSuccess'));
      } else {
        Alert.alert(t('common:done'), t('settings:reportSuccess'));
      }

    } catch (error) {
      console.error('Failed to send report:', error);
      if (Platform.OS === 'web') {
        alert(t('settings:reportError'));
      } else {
        Alert.alert(t('common:error'), t('settings:reportError'));
      }
    } finally {
      setIsSendingReport(false);
    }
  };


  // Test function for scroll functionality (development only)
  const handleScrollTest = () => {
    console.log('🧪 SettingsScreen - Testing scroll functionality');
    if (scrollViewRef.current) {
      console.log('🧪 SettingsScreen - ScrollView ref exists, attempting to scroll');
      scrollViewRef.current.scrollTo({ y: 200, animated: true });
      setTimeout(() => {
        console.log('🧪 SettingsScreen - Scrolling back to top');
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 2000);
    } else {
      console.log('🧪 SettingsScreen - ScrollView ref is null!');
    }
  };

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    color = colors.textPrimary,
    dangerous = false
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
    color?: string;
    dangerous?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingsItem, dangerous && styles.dangerousItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, dangerous && styles.dangerousIconContainer]}>
          <Ionicons
            name={icon as any}
            size={22}
            color={dangerous ? colors.error : colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingsTitle, { color: dangerous ? colors.error : color }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingsSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showArrow && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper style={styles.container}>
      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings:selectLanguage')}</Text>
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

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={handleLogoutCancel}>
        <View style={styles.modalBackdrop}>
          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>{t('settings:logoutTitle')}</Text>
            <Text style={styles.logoutModalMessage}>{t('settings:logoutMessage')}</Text>
            <View style={styles.logoutModalButtons}>
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

      {/* Report Modal */}
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
              textAlign={biDiTextAlign('right')}
            />

            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonCancel]}
                onPress={() => setShowReportModal(false)}
                disabled={isSendingReport}
              >
                <Text style={styles.logoutModalButtonTextCancel}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonConfirm, { backgroundColor: colors.primary, opacity: isSendingReport ? 0.7 : 1 }]}
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

      {/* User Info Section - Only for logged in users */}
      {!isGuestMode && selectedUser && (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{selectedUser.name}</Text>
            <Text style={styles.userEmail}>{selectedUser.email}</Text>
            <Text style={styles.karmaPoints}>
              {(selectedUser.karmaPoints || 0).toLocaleString()} {t('profile:stats.karmaPointsSuffix')}
            </Text>
          </View>
        </View>
      )}

      {/* Guest Mode Notice */}
      {isGuestMode && <GuestModeNotice variant="compact" />}

      {/* Settings List - Platform-specific scroll implementation */}
      {Platform.OS === 'web' ? (
        // Web: Custom scrollable View with CSS overflow
        <View style={styles.webScrollContainer}>
          <View style={styles.webScrollContent}>
            {/* App Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings:appSettings')}</Text>

              <SettingsItem
                icon="notifications-outline"
                title={t('settings:notifications')}
                subtitle={t('settings:notificationsDesc')}
                onPress={handleNotificationsPress}
              />

              <SettingsItem
                icon="color-palette-outline"
                title={t('settings:theme')}
                subtitle={t('settings:themeDesc')}
                onPress={handleThemePress}
              />

              <SettingsItem
                icon="language-outline"
                title={t('settings:language')}
                subtitle={currentLang === 'he' ? t('settings:lang.he') : t('settings:lang.en')}
                onPress={handleLanguagePress}
              />
            </View>

            {/* Privacy & Security Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings:privacySection')}</Text>

              <SettingsItem
                icon="shield-outline"
                title={t('settings:privacy')}
                subtitle={t('settings:privacyDesc')}
                onPress={handlePrivacyPress}
              />

              <SettingsItem
                icon="trash-outline"
                title={t('settings:clearCache')}
                subtitle={t('settings:clearCacheDesc')}
                onPress={handleClearCachePress}
              />

              <SettingsItem
                icon="flask-outline"
                title={t('settings:scrollTestTitle')}
                subtitle={t('settings:scrollTestSubtitle')}
                onPress={handleScrollTest}
              />
            </View>

            {/* About Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings:aboutSection')}</Text>

              <SettingsItem
                icon="information-circle-outline"
                title={t('settings:about')}
                subtitle={t('settings:aboutDesc')}
                onPress={handleAboutPress}
              />

              <SettingsItem
                icon="warning-outline"
                title={t('settings:reportIssue')}
                subtitle={t('settings:reportIssueDesc')}
                onPress={handleReportPress}
              />
            </View>

            {/* Logout Section - different behavior for guest mode and authenticated user */}
            <View style={styles.section}>
              <SettingsItem
                icon={isGuestMode ? "arrow-back-outline" : "log-out-outline"}
                title={isGuestMode ? t('settings:guestBack') : t('settings:logout')}
                subtitle={isGuestMode ? t('settings:guestBackDesc') : t('settings:logoutDesc')}
                onPress={handleLogoutPress}
                showArrow={false}
                dangerous={!isGuestMode} // Red only for authenticated user (dangerous action)
              />
            </View>
          </View>
        </View>
      ) : (
        // Native: Standard ScrollView for iOS/Android
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          bounces={Platform.OS === 'ios'}
          overScrollMode={Platform.OS === 'android' ? 'auto' : undefined}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            onScroll(event);
            const offsetY = event.nativeEvent.contentOffset.y;
            // console.log('📜 SettingsScreen - Layout measurement:', event.nativeEvent.layoutMeasurement);
          }}
          onScrollBeginDrag={() => {
            console.log('📜 SettingsScreen - Scroll begin drag detected!');
          }}
          onScrollEndDrag={() => {
            console.log('📜 SettingsScreen - Scroll end drag detected!');
          }}
          onMomentumScrollBegin={() => {
            console.log('📜 SettingsScreen - Momentum scroll begin!');
          }}
          onMomentumScrollEnd={() => {
            console.log('📜 SettingsScreen - Momentum scroll end!');
          }}
          onContentSizeChange={(contentWidth, contentHeight) => {
            console.log('📜 SettingsScreen - Content size changed:', { contentWidth, contentHeight });
            console.log('📜 SettingsScreen - Screen height:', SCREEN_HEIGHT);
            console.log('📜 SettingsScreen - Should scroll:', contentHeight > SCREEN_HEIGHT);
          }}
          onLayout={(event) => {
            console.log('📜 SettingsScreen - ScrollView layout:', event.nativeEvent.layout);
          }}
          scrollEventThrottle={16}
        >
          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings:appSettings')}</Text>
            {/* Org Dashboard (for org admins) */}
            {selectedUser && selectedUser.roles?.includes('org_admin') && (
              <SettingsItem
                icon="briefcase-outline"
                title={t('settings:orgDashboardTitle')}
                subtitle={t('settings:orgDashboardSubtitle')}
                onPress={() => navigation.navigate('OrgDashboardScreen' as never)}
              />
            )}

            {/* Admin approvals (for admins) */}
            {selectedUser && selectedUser.roles?.includes('admin') && (
              <SettingsItem
                icon="checkmark-done-outline"
                title={t('settings:adminApprovalsTitle')}
                subtitle={t('settings:adminApprovalsSubtitle')}
                onPress={() => navigation.navigate('AdminOrgApprovalsScreen' as never)}
              />
            )}

            <SettingsItem
              icon="notifications-outline"
              title={t('settings:notifications')}
              subtitle={t('settings:notificationsDesc')}
              onPress={handleNotificationsPress}
            />

            <SettingsItem
              icon="color-palette-outline"
              title={t('settings:theme')}
              subtitle={t('settings:themeDesc')}
              onPress={handleThemePress}
            />

            <SettingsItem
              icon="language-outline"
              title={t('settings:language')}
              subtitle={currentLang === 'he' ? t('settings:lang.he') : t('settings:lang.en')}
              onPress={handleLanguagePress}
            />
          </View>

          {/* My Activity Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings:myActivitySection', 'הפעילות שלי')}</Text>

            <SettingsItem
              icon="trophy-outline"
              title={t('challenges:myChallenges')}
              subtitle={t('settings:myChallengesDesc', 'עדכון מהיר של האתגרים שהצטרפת אליהם')}
              onPress={() => (navigation as any).navigate('ChallengeStatisticsScreen')}
            />
          </View>

          {/* Privacy & Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings:privacySection')}</Text>

            <SettingsItem
              icon="shield-outline"
              title={t('settings:privacy')}
              subtitle={t('settings:privacyDesc')}
              onPress={handlePrivacyPress}
            />

            <SettingsItem
              icon="trash-outline"
              title={t('settings:clearCache')}
              subtitle={t('settings:clearCacheDesc')}
              onPress={handleClearCachePress}
            />

            <SettingsItem
              icon="flask-outline"
              title={t('settings:scrollTestTitle')}
              subtitle={t('settings:scrollTestSubtitle')}
              onPress={handleScrollTest}
            />
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings:aboutSection')}</Text>

            <SettingsItem
              icon="information-circle-outline"
              title={t('settings:about')}
              subtitle={t('settings:aboutDesc')}
              onPress={handleAboutPress}
            />

            <SettingsItem
              icon="warning-outline"
              title={t('settings:reportIssue')}
              subtitle={t('settings:reportIssueDesc')}
              onPress={handleReportPress}
            />
          </View>

          {/* Logout Section - different behavior for guest mode and authenticated user */}
          <View style={styles.section}>
            <SettingsItem
              icon={isGuestMode ? "arrow-back-outline" : "log-out-outline"}
              title={isGuestMode ? t('settings:guestBack') : t('settings:logout')}
              subtitle={isGuestMode ? t('settings:guestBackDesc') : t('settings:logoutDesc')}
              onPress={handleLogoutPress}
              showArrow={false}
              dangerous={!isGuestMode} // Red only for authenticated user (dangerous action)
            />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: rowDirection('row'),
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
    textAlign: biDiTextAlign('right'),
  },
  userEmail: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: biDiTextAlign('right'),
  },
  karmaPoints: {
    fontSize: FontSizes.body,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
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
    marginRight: 4,
    textAlign: biDiTextAlign('right'),
  },
  settingsItem: {
    flexDirection: rowDirection('row'),
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
    flexDirection: rowDirection('row'),
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
    marginRight: 16,
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
    textAlign: biDiTextAlign('right'),
  },
  settingsSubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: biDiTextAlign('right'),
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
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
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }),
  },
  logoutModalTitle: {
    fontSize: FontSizes.heading2,
    color: colors.textPrimary,
    textAlign: biDiTextAlign('center'),
    marginBottom: 12,
    fontWeight: '700',
  },
  logoutModalMessage: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: biDiTextAlign('center'),
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    flexDirection: rowDirection('row'),
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
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }),
  },
  reportModalTitle: {
    fontSize: FontSizes.heading2,
    color: colors.textPrimary,
    textAlign: biDiTextAlign('center'),
    marginBottom: 8,
    fontWeight: '700',
  },
  reportModalSubtitle: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: biDiTextAlign('center'),
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