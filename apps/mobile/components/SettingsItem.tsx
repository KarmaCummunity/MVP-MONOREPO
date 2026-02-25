// ===================================
// SettingsItem.tsx
// ===================================

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';

type SettingItemType = 'navigate' | 'toggle' | 'button' | 'value';

export interface SettingsItemProps {
  title: string;
  description?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  type: SettingItemType;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (newValue: boolean) => void;
  displayValue?: string;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = memo((props) => {
  const {
    title,
    description,
    iconName,
    type,
    onPress,
    value,
    onValueChange,
    displayValue,
    isDestructive,
    children
  } = props;

    const textColor = isDestructive ? colors.danger : colors.textPrimary;

  const renderContent = () => {
    switch (type) {
      case 'toggle':
        return (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={value ? colors.primary : colors.backgroundSecondary}
            ios_backgroundColor={colors.border}
          />
        );
      case 'value':
        return (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{displayValue}</Text>
            {/* Chevron should appear BEFORE the value text in RTL visually,
                so we place it after the text when using row-reverse on the container */}
            <Ionicons 
              name="chevron-back-outline" // Changed to 'chevron-back-outline' for RTL visual consistency
              size={20} 
              color={colors.textSecondary} 
              style={styles.chevron}
            />
          </View>
        );
      case 'navigate':
        return (
          <Ionicons name="chevron-back-outline" size={20} color={colors.textSecondary} style={styles.chevron}/> // Changed to 'chevron-back-outline' for RTL visual consistency
        );
      case 'button':
        return null;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, type === 'button' && styles.buttonItem]}
      onPress={onPress}
      disabled={!onPress && type !== 'toggle'}
      activeOpacity={type === 'toggle' ? 1 : 0.7}
    >
      {iconName && (
        <Ionicons name={iconName} size={24} color={textColor} style={styles.icon} />
      )}
      <View style={styles.textContainer}>
        {/* Explicitly setting textAlign: 'right' for all text for RTL */}
        <Text style={[styles.title, { color: textColor, textAlign: 'right' }]}>{title}</Text>
        {description && <Text style={[styles.description, { textAlign: 'right' }]}>{description}</Text>}
      </View>
      <View style={styles.rightContent}>
        {renderContent()}
        {children && (
          typeof children === 'string' ? (
            <Text style={[styles.childrenText, { textAlign: 'right' }]}>{children}</Text>
          ) : (
            children
          )
        )}
      </View>
    </TouchableOpacity>
  );
});

SettingsItem.displayName = 'SettingsItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse', // Key for overall RTL layout
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    // Removed `writingDirection` and `textAlign` from here as they are for Text components or inherit
  },
  buttonItem: {
    justifyContent: 'center',
  },
  icon: {
    marginHorizontal: 15, // Space to the left of the icon in an RTL row
  },
  textContainer: {
    flex: 1,
    // Ensure text within this container flows RTL
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 16,
    color: colors.textPrimary,
    // textAlign: 'right' applied inline for explicit text alignment
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    // textAlign: 'right' applied inline for explicit text alignment
  },
  rightContent: {
    marginLeft: 'auto', // Pushes content to the left (start of RTL row)
    flexDirection: 'row-reverse', // <--- Changed to 'row-reverse' for internal RTL order of elements like value + chevron
    alignItems: 'center',
    writingDirection: 'rtl', // Ensure content within this container flows RTL
  },
  valueContainer: {
    flexDirection: 'row-reverse', // <--- Changed to 'row-reverse' to put chevron before text visually
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: colors.textSecondary,
    // If chevron is placed before text, this margin separates them
    marginRight: 5, // Space between value text and chevron
  },
  chevron: {
    // No explicit margin needed here if using flexbox correctly in valueContainer
  },
  childrenText: {
    fontSize: 16,
    color: colors.textSecondary,
  }
});

export default SettingsItem;