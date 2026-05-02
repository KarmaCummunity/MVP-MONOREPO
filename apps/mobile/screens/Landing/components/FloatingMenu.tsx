/**
 * @file FloatingMenu Component
 * @description Floating navigation menu for quick section access
 * @module Landing/Components
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../../../globals/colors';
import { logger } from '../../../utils/loggerService';
import type { FloatingMenuProps } from '../types';
import { MENU_ITEMS } from '../constants';
import { getMenuSizes } from '../utils';
import { styles } from '../styles';

/**
 * FloatingMenu Component
 * Collapsible floating navigation menu with section links
 * Features minimized/expanded states and active section highlighting
 * 
 * @component
 * @example
 * ```tsx
 * <FloatingMenu 
 *   onNavigate={(section) => scrollToSection(section)} 
 *   activeSection="hero" 
 * />
 * ```
 */
export const FloatingMenu: React.FC<FloatingMenuProps> = ({ 
  onNavigate, 
  activeSection 
}) => {
  const { t } = useTranslation('landing');
  const [isMinimized, setIsMinimized] = useState(false);
  const menuSizes = getMenuSizes();

  // Minimized state - Show only menu icon button
  if (isMinimized) {
    return (
      <View style={styles.floatingMenuMinimized}>
        <TouchableOpacity
          onPress={() => setIsMinimized(false)}
          style={styles.menuToggleButton}
          accessibilityLabel={t('menu.accessibility.open')}
          accessibilityRole="button"
        >
          <Ionicons 
            name="menu-outline" 
            size={menuSizes.iconSize * 1.2} 
            color={colors.info} 
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Expanded state - Show full menu
  return (
    <>
      {/* Transparent overlay to close menu when clicked */}
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setIsMinimized(true)}
        accessibilityLabel={t('menu.accessibility.close')}
        accessibilityRole="button"
      />
      
      {/* Floating menu container */}
      <View style={styles.floatingMenu}>
        {/* Menu header with title and close button */}
        <TouchableOpacity
          onPress={() => setIsMinimized(true)}
          style={styles.menuHeader}
          activeOpacity={0.7}
          accessibilityLabel={t('menu.accessibility.close')}
          accessibilityRole="button"
        >
          <Text style={[styles.menuTitle, { fontSize: menuSizes.titleSize }]}>
            {t('menu.title')}
          </Text>
          <Ionicons 
            name="chevron-forward-outline" 
            size={menuSizes.iconSize * 0.9} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
        
        {/* Scrollable menu items */}
        <ScrollView 
          style={styles.menuItems} 
          showsVerticalScrollIndicator={false}
        >
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                { 
                  paddingVertical: menuSizes.padding, 
                  paddingHorizontal: menuSizes.padding * 1.5 
                },
                activeSection === item.id && styles.menuItemActive,
              ]}
              onPress={() => {
                onNavigate(item.id);
                logger.info('FloatingMenu', `Navigate to ${item.id}`);
              }}
              activeOpacity={0.7}
              accessibilityLabel={t('menu.accessibility.navigateTo', { label: t(`menu.${item.id}`) })}
              accessibilityRole="button"
            >
              <Ionicons
                name={item.icon as any}
                size={menuSizes.iconSize}
                color={activeSection === item.id ? colors.info : colors.textSecondary}
                style={styles.menuItemIcon}
              />
              <Text 
                style={[
                  styles.menuItemText,
                  { fontSize: menuSizes.fontSize },
                  activeSection === item.id && styles.menuItemTextActive,
                ]}
              >
                {t(`menu.${item.id}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );
};
