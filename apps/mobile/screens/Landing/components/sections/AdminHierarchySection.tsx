/**
 * @file AdminHierarchySection
 * @description Section showing management structure
 * @module Landing/Components/Sections
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import colors from '../../../../globals/colors';
import { Section } from '../Section';
import AdminHierarchyTree from '../../../../components/AdminHierarchyTree';
import { useUser } from '../../../../stores/userStore';
import { IS_MOBILE_WEB } from '../../constants';
import { styles } from '../../styles';
import type { RootStackParamList } from '../../../../globals/types';

export const AdminHierarchySection: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  useUser();

  const handleViewAdminDashboard = () => {
    navigation.navigate('AdminDashboard', { viewOnly: true, hideTopBar: false, hideBottomBar: false });
  };

  const { t } = useTranslation('landing');
  return (
    <Section id="section-hierarchy" title={t('legacy.hierarchy.title')} subtitle={t('legacy.hierarchy.subtitle')} style={styles.sectionAltBackground}>
      <View style={styles.hierarchyContainer}>
        <AdminHierarchyTree />
      </View>
      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: colors.primary, marginTop: 20 }]}
        onPress={handleViewAdminDashboard}
        activeOpacity={0.8}
      >
        <Ionicons name="eye-outline" color={colors.white} size={IS_MOBILE_WEB ? 14 : 18} />
        <Text style={styles.contactButtonText}>{t('legacy.hierarchy.ctaButton')}</Text>
      </TouchableOpacity>
    </Section>
  );
};
