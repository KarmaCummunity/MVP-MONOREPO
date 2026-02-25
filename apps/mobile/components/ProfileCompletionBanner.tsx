import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useUser } from '../stores/userStore';
import type { User } from '../stores/userStore';
import { useTranslation } from 'react-i18next';

const isFullName = (name?: string): boolean => {
  if (!name) return false;
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts.join(' ').length >= 4;
};

const getMissingFields = (user: User | null) => {
  const missing: Array<'avatar' | 'fullName' | 'address'> = [];
  if (!user?.avatar) missing.push('avatar');
  if (!isFullName(user?.name)) missing.push('fullName');
  const hasAddress = Boolean(user?.location && user.location.city && user.location.country);
  if (!hasAddress) missing.push('address');
  return missing;
};

export default function ProfileCompletionBanner() {
  const navigation = useNavigation<any>();
  const { selectedUser, isGuestMode, isAuthenticated } = useUser();
  const { t, i18n } = useTranslation(['profile']);

  const missing = useMemo(() => getMissingFields(selectedUser), [selectedUser]);

  if (!isAuthenticated || isGuestMode) return null;
  if (!selectedUser) return null;
  if (missing.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.inlineRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} style={styles.icon} />
          <Text style={styles.title} numberOfLines={2}>
            {t('profile:banner.title')}
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('EditProfileScreen')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={14} color={colors.white} />
            <Text style={styles.ctaText}>{t('profile:banner.cta')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  container: {
    backgroundColor: colors.infoLight,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    borderRightWidth: 4,
    borderRightColor: colors.info,
  },
  inlineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  icon: {
    marginLeft: LAYOUT_CONSTANTS.SPACING.SM,
  },
  title: {
    flex: 1,
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  ctaButton: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    color: colors.white,
    fontSize: FontSizes.small,
    fontWeight: '700',
  },
});


