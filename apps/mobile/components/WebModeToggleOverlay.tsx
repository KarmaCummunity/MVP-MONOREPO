// WebModeToggleOverlay.tsx
// A web-only toggle control to switch between 'אפליקציה' and 'אתר בית'. Hidden on native.
// 
// IMPORTANT CHANGES:
// - Position changes based on web mode: centered in both 'site' and 'app' modes
// - In app mode: positioned centered above top bar (higher z-index) and stays persistent across all screens
// - In site mode: centered at top of screen over landing page content
// - Seamless switching between site mode (landing page) and app mode (login/home)
// - Enhanced styling for better visibility and user experience
// 
// VISIBILITY LOGIC:
// - Toggle button is HIDDEN for authenticated users (users who created an account)
// - Toggle button is SHOWN for guest users and non-authenticated users
// - This provides a cleaner UI for logged-in users who don't need to switch modes
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView, Modal, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWebMode } from '../stores/webModeStore';
import { useUser } from '../stores/userStore';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';

const MENU_ITEMS = [
  { id: 'stats', label: 'במספרים', icon: 'stats-chart-outline' },
  { id: 'vision', label: 'החזון', icon: 'bulb-outline' },
  { id: 'problems', label: 'הבעיות', icon: 'alert-circle-outline' },
  { id: 'features', label: 'תכונות', icon: 'apps-outline' },
  { id: 'about', label: 'אודות', icon: 'information-circle-outline' },
  { id: 'how', label: 'איך זה עובד', icon: 'help-circle-outline' },
  { id: 'who', label: 'למי זה מתאים', icon: 'people-outline' },
  { id: 'values', label: 'ערכים', icon: 'heart-outline' },
  { id: 'roadmap', label: 'מפת דרכים', icon: 'map-outline' },
  { id: 'contact', label: 'יצירת קשר', icon: 'mail-outline' },
  { id: 'faq', label: 'שאלות נפוצות', icon: 'chatbubble-ellipses-outline' },
];

const WebModeToggleOverlay: React.FC = () => {
  const { t } = useTranslation('webOverlay'); // Use specific namespace
  const { mode, setMode } = useWebMode();
  const { isAuthenticated, isGuestMode, selectedUser, isAdmin } = useUser();
  const navigation: any = useNavigation<NavigationProp<ParamListBase>>();

  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = windowWidth < 1024; // Desktop breakpoint

  useEffect(() => {
    const updateWidth = () => setWindowWidth(Dimensions.get('window').width);
    const subscription = Dimensions.addEventListener('change', updateWidth);
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'web') return null as any;

  // Hide top bar if user is authenticated (not guest mode) - standard app user
  if (isAuthenticated && !isGuestMode && selectedUser) {
    return null as any;
  }

  const handleToggle = async () => {
    const newMode: 'app' | 'site' = mode === 'site' ? 'app' : 'site';
    setMode(newMode);

    let targetRoute: string;
    if (newMode === 'app') {
      if (isAuthenticated || isGuestMode) {
        targetRoute = 'HomeStack';
      } else {
        targetRoute = 'LoginScreen';
      }
    } else {
      targetRoute = 'LandingSiteScreen';
    }

    const guardContext = {
      isAuthenticated,
      isGuestMode,
      isAdmin,
      mode: newMode,
    };

    const guardResult = await checkNavigationGuards(
      {
        type: 'reset',
        index: 0,
        routes: [{ name: targetRoute }],
      },
      guardContext
    );

    if (!guardResult.allowed) {
      if (guardResult.redirectTo) {
        await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
      }
      return;
    }

    await navigationQueue.reset(0, [{ name: targetRoute }], 2);
  };

  const scrollToSection = (id: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id) || document.getElementById(`section-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
      }
    }
  };

  return (
    <>
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          {/* Right Side: Toggle + Menu (RTL) */}
          <View style={styles.rightContainer}>
            {/* Toggle Switch */}
            <TouchableOpacity onPress={handleToggle} activeOpacity={0.9} style={styles.toggleWrapper}>
              <View style={styles.toggleBackground}>
                <View style={[styles.toggleSegment, mode === 'site' ? styles.toggleSelected : styles.toggleUnselected]}>
                  <Text style={[styles.toggleText, mode === 'site' ? styles.toggleTextSelected : undefined]}>{t('siteMode')}</Text>
                </View>
                <View style={[styles.toggleSegment, mode === 'app' ? styles.toggleSelected : styles.toggleUnselected]}>
                  <Text style={[styles.toggleText, mode === 'app' ? styles.toggleTextSelected : undefined]}>{t('appMode')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {mode === 'site' && (
              isMobile ? (
                <TouchableOpacity onPress={() => setMobileMenuOpen(true)} style={styles.menuButton}>
                  <Ionicons name="menu" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.desktopMenu}>
                  {MENU_ITEMS.slice(0, 5).map((item) => (
                    <TouchableOpacity key={item.id} onPress={() => scrollToSection(item.id)} style={styles.desktopMenuItem}>
                      <Text style={styles.desktopMenuText}>{t(item.id)}</Text>
                    </TouchableOpacity>
                  ))}
                  {/* Show "More" if needed or just fit as many as possible. For now showing first few for clean look */}
                  <TouchableOpacity onPress={() => scrollToSection('contact')} style={styles.desktopMenuItem}>
                    <Text style={styles.desktopMenuText}>{t('contact')}</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>

          {/* Left Side: Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/new_logo_black.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Karma Community</Text>
          </View>
        </View>
      </View>

      {/* Mobile Menu Modal for Site Mode */}
      <Modal visible={mobileMenuOpen} transparent={true} animationType="fade" onRequestClose={() => setMobileMenuOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMobileMenuOpen(false)}>
          <View style={styles.mobileMenuContainer}>
            <View style={styles.mobileMenuHeader}>
              <Text style={styles.mobileMenuTitle}>{t('menu')}</Text>
              <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.mobileMenuItems}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => scrollToSection(item.id)} style={styles.mobileMenuItem}>
                  <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} style={{ marginLeft: 10 }} />
                  <Text style={styles.mobileMenuText}>{t(item.id)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 9999,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    justifyContent: 'center',
    paddingHorizontal: 16,
    // Add backdrop filter for glass effect if supported
    ...((Platform.OS === 'web') ? { backdropFilter: 'blur(10px)' } : {}) as any,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined,
  },
  // Toggle Styles
  toggleWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  toggleBackground: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 999,
    height: 32,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  toggleSegment: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  toggleSelected: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleUnselected: {
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  // Desktop Menu
  desktopMenu: {
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    gap: 20,
    marginRight: 20,
  },
  desktopMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  desktopMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  menuButton: {
    padding: 4,
    marginRight: 8,
  },
  // Mobile Menu Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end', // Slide from right or just align right
  },
  mobileMenuContainer: {
    width: 280,
    height: '100%',
    backgroundColor: 'white',
    paddingTop: 0,
    shadowColor: colors.black,
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  mobileMenuHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: Platform.OS === 'ios' ? 40 : 0,
  },
  mobileMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  mobileMenuItems: {
    flex: 1,
    padding: 16,
  },
  mobileMenuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
  },
  mobileMenuText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'right',
  },
});

export default WebModeToggleOverlay;


