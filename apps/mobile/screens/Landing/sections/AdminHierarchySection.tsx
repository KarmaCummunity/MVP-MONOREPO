import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../../../globals/colors';
import AdminHierarchyTree from '../../../components/AdminHierarchyTree';
import { Section } from '../components';
import { landingSiteScreenStyles as styles } from '../landingSiteScreenStyles';
import { IS_MOBILE_WEB as isMobileWeb } from '../constants';

export const AdminHierarchySection = () => {
  const navigation = useNavigation<any>();

  const handleViewAdminDashboard = () => {
    // Allow everyone to view, including unauthenticated users
    navigation.navigate('AdminDashboard', { viewOnly: true, hideTopBar: false, hideBottomBar: false });
  };

  return (
    <Section id="section-hierarchy" title="מבנה הניהול" subtitle="הצוות שמוביל את הקהילה" style={styles.sectionAltBackground}>
      <View style={styles.hierarchyContainer}>
        <AdminHierarchyTree />
      </View>
      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: colors.primary, marginTop: 20 }]}
        onPress={handleViewAdminDashboard}
        activeOpacity={0.8}
      >
        <Ionicons name="eye-outline" color={colors.white} size={isMobileWeb ? 14 : 18} />
        <Text style={styles.contactButtonText}>למאחורי הקלעים של KC</Text>
      </TouchableOpacity>
    </Section>
  );
};

