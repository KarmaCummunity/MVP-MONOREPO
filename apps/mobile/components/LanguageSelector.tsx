/**
 * LanguageSelector Component
 * 
 * A floating action button (FAB) component that provides language switching functionality
 * between Hebrew and English with RTL support. Features include a dropdown menu,
 * proper accessibility support, and platform-specific styling.
 * 
 * @author KC Development Team
 * @version 1.8.0
 * @since 1.0.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../app/i18n';
import colors from '../globals/colors';

// TypeScript Interfaces
interface LanguageSelectorProps {
  /** Custom style for the container */
  containerStyle?: any;
  /** Whether to show the language menu */
  showMenu?: boolean;
  /** Callback when language is changed */
  onLanguageChange?: (language: 'he' | 'en') => void;
}

interface LanguageState {
  menuOpen: boolean;
  currentLanguage: 'he' | 'en';
}

type SupportedLanguage = 'he' | 'en';

/**
 * LanguageSelector Component
 * 
 * Handles the complete language switching flow including:
 * - Language menu toggle
 * - Language application with RTL support
 * - AsyncStorage persistence
 * - Platform-specific restart notifications
 * - Proper accessibility support
 */
const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  containerStyle,
  showMenu = true,
  onLanguageChange,
}) => {
  const { t } = useTranslation(['common', 'settings']);

  // State management
  const [languageState, setLanguageState] = useState<LanguageState>({
    menuOpen: false,
    currentLanguage: i18n.language as SupportedLanguage,
  });

  /**
   * Applies the selected language with RTL support
   */
  const applyLanguage = async (language: SupportedLanguage) => {
    try {
      // Save language preference to AsyncStorage
      await AsyncStorage.setItem('app_language', language);

      // Change i18n language
      await i18n.changeLanguage(language);

      // Update current language state
      setLanguageState(prev => ({ ...prev, currentLanguage: language }));

      // Handle RTL support for Hebrew
      const isRTL = language === 'he';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);

        // Show restart notification for native platforms
        if (Platform.OS !== 'web') {
          Alert.alert(
            t('settings:restartRequired') as string,
            t('settings:restartDesc') as string
          );
        }
      }

      // Notify parent component
      onLanguageChange?.(language);
    } catch (error) {
      console.error('Failed to apply language:', error);
    } finally {
      setLanguageState(prev => ({ ...prev, menuOpen: false }));
    }
  };

  /**
   * Toggles the language menu visibility
   */
  const toggleLanguageMenu = () => {
    setLanguageState(prev => ({
      ...prev,
      menuOpen: !prev.menuOpen
    }));
  };

  /**
   * Handles language selection
   */
  const handleLanguageSelect = (language: SupportedLanguage) => {
    applyLanguage(language);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={toggleLanguageMenu}
        accessible={true}
        accessibilityLabel="Language selector"
        accessibilityHint="Tap to change language"
        accessibilityRole="button"
      >
        <Ionicons name="globe-outline" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      {showMenu && languageState.menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              languageState.currentLanguage === 'he' && styles.selectedMenuItem
            ]}
            onPress={() => handleLanguageSelect('he')}
            accessible={true}
            accessibilityLabel="Hebrew language"
            accessibilityHint="Switch to Hebrew"
            accessibilityRole="button"
          >
            <Text style={[
              styles.menuText,
              languageState.currentLanguage === 'he' && styles.selectedMenuText
            ]}>
              {t('common:languages.he')}
            </Text>
            {languageState.currentLanguage === 'he' && (
              <Ionicons name="checkmark" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              languageState.currentLanguage === 'en' && styles.selectedMenuItem
            ]}
            onPress={() => handleLanguageSelect('en')}
            accessible={true}
            accessibilityLabel="English language"
            accessibilityHint="Switch to English"
            accessibilityRole="button"
          >
            <Text style={[
              styles.menuText,
              languageState.currentLanguage === 'en' && styles.selectedMenuText
            ]}>
              {t('common:languages.en')}
            </Text>
            {languageState.currentLanguage === 'en' && (
              <Ionicons name="checkmark" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    right: 16,
    alignItems: 'flex-end',
    zIndex: 20,
    ...(Platform.OS === 'web' ? { pointerEvents: 'box-none' } : {}),
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  menu: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 6,
    marginTop: 5,
    minWidth: 130,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  selectedMenuItem: {
    backgroundColor: 'rgba(76, 126, 255, 0.08)',
  },
  menuText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  selectedMenuText: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LanguageSelector;
