// components/ModeToggleButton.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../globals/colors';
import { useTranslation } from 'react-i18next';
import { scaleSize, responsiveFontSize, responsiveSpacing } from '../globals/responsive';
import { FontSizes } from '../globals/constants';

interface ModeToggleButtonProps {
  mode: boolean;
  onToggle: () => void;
}

const ModeToggleButton: React.FC<ModeToggleButtonProps> = ({ mode, onToggle }) => {
  const { t } = useTranslation(['common']);

  return (
    <TouchableOpacity style={localStyles.toggleWrapper} onPress={onToggle} activeOpacity={0.9}>
      <View style={localStyles.toggleBackground}>
        {/* Helper (Offerer) - Left side in LTR, Right side in RTL (handled by row-reverse) */}
        <View
          style={[
            localStyles.toggleSegment,
            !mode ? localStyles.toggleSelected : localStyles.toggleUnselected
          ]}
        >
          <Text
            style={[
              localStyles.toggleText,
              !mode ? localStyles.toggleTextSelected : undefined
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('common:offerer')}
          </Text>
        </View>

        {/* Seeker - Right side in LTR, Left side in RTL */}
        <View
          style={[
            localStyles.toggleSegment,
            mode ? localStyles.toggleSelected : localStyles.toggleUnselected
          ]}
        >
          <Text
            style={[
              localStyles.toggleText,
              mode ? localStyles.toggleTextSelected : undefined
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('common:seeker')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const localStyles = StyleSheet.create({
  toggleWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    // Allow flexibility in width or constraints if passed from parent, 
    // but here we keep it self-contained
  },
  toggleBackground: {
    flexDirection: 'row-reverse', // RTL support
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 999,
    height: scaleSize(32),
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    padding: scaleSize(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSegment: {
    paddingHorizontal: responsiveSpacing(8, 10, 12), // Smaller padding for mobile
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(14),
    minWidth: scaleSize(50), // Smaller minWidth for mobile, but still tap-friendly
    maxWidth: scaleSize(80), // Prevent too wide on large screens
  },
  toggleSelected: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: scaleSize(1) },
    shadowOpacity: 0.1,
    shadowRadius: scaleSize(2),
    elevation: 2,
  },
  toggleUnselected: {
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: responsiveFontSize(FontSizes.caption, 11, 13), // Smaller font for mobile to prevent text truncation
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default ModeToggleButton;