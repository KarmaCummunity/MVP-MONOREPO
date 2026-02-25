import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { NavigationProp, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import AdminHierarchyTree from '../components/AdminHierarchyTree';

interface AdminDashboardScreenProps {
  navigation: NavigationProp<AdminStackParamList>;
}

interface AdminButton {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route: keyof AdminStackParamList;
}

const adminButtons: AdminButton[] = [
  {
    id: 'money',
    title: 'כסף',
    icon: 'card-outline',
    color: colors.success,
    bgColor: colors.successLight,
    route: 'AdminMoney',
  },
  {
    id: 'tasks',
    title: 'משימות',
    icon: 'checkmark-done-outline',
    color: colors.primary,
    bgColor: colors.successLight,
    route: 'AdminTasks',
  },
  {
    id: 'people',
    title: 'אנשים',
    icon: 'people-outline',
    color: colors.primary,
    bgColor: colors.infoLight,
    route: 'AdminPeople',
  },
  {
    id: 'review',
    title: 'ביקורת',
    icon: 'shield-checkmark-outline',
    color: colors.secondary,
    bgColor: colors.pinkLight,
    route: 'AdminReview',
  },
  {
    id: 'files',
    title: 'קבצים',
    icon: 'folder-open-outline',
    color: colors.info,
    bgColor: colors.infoLight,
    route: 'AdminFiles',
  },
  {
    id: 'crm',
    title: 'ניהול קשרים',
    icon: 'people-circle-outline',
    color: colors.warning,
    bgColor: colors.warningLight,
    route: 'AdminCRM',
  },
  {
    id: 'time',
    title: 'ניהול זמן עובדים',
    icon: 'time-outline',
    color: colors.accent,
    bgColor: '#E8F5E9',
    route: 'AdminTimeManagement',
  },
  {
    id: 'tables',
    title: 'טבלאות',
    icon: 'grid-outline',
    color: colors.info,
    bgColor: colors.infoLight,
    route: 'AdminTables',
  }
];

import { useAdminProtection } from '../hooks/useAdminProtection';

export default function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const { selectedUser } = useUser();
  const route = useRoute();
  const routeParams = (route.params as any) || {};
  const viewOnly = routeParams?.viewOnly === true;
  useAdminProtection(true);

  // Ensure top bar and bottom bar are visible in view-only mode
  useFocusEffect(
    React.useCallback(() => {
      if (viewOnly) {
        console.log('🔐 AdminDashboard - View-only mode: Ensuring bars are visible');
        (navigation as any).setParams({
          hideTopBar: false,
          hideBottomBar: false,
        });
      }
    }, [viewOnly, navigation])
  );


  const handleButtonPress = (button: AdminButton) => {
    if (button.route === 'AdminDashboard') {
      return;
    }
    (navigation as any).navigate(button.route, viewOnly ? { viewOnly: true, hideTopBar: false, hideBottomBar: false } : undefined);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View>
              <Text style={styles.welcomeText}>לוח בקרה</Text>
              <Text style={styles.subtitleText}>
                {selectedUser?.name ? `שלום ${selectedUser.name}` : 'מנהל'}
              </Text>
            </View>
            {viewOnly && (
              <View style={[styles.viewOnlyBadge, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="eye-outline" size={16} color={colors.warning} />
                <Text style={[styles.viewOnlyText, { color: colors.warning }]}>מצב צפייה בלבד</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          {adminButtons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={[styles.button, { backgroundColor: button.bgColor }]}
              onPress={() => handleButtonPress(button)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: button.color }]}>
                <Ionicons name={button.icon} size={24} color="white" />
              </View>
              <Text style={styles.buttonText}>{button.title}</Text>
            </TouchableOpacity>
          ))}

          {/* Admin management - visible to all admins (admin or super_admin role) */}
          {(selectedUser?.roles?.includes('admin') || selectedUser?.roles?.includes('super_admin') || selectedUser?.email?.toLowerCase() === 'navesarussi@gmail.com' || selectedUser?.email?.toLowerCase() === 'karmacommunity2.0@gmail.com') && (
            <TouchableOpacity
              key="admins"
              style={[styles.button, { backgroundColor: colors.errorLight }]}
              onPress={() => (navigation as any).navigate('AdminAdmins')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
                <Ionicons name="shield-outline" size={24} color="white" />
              </View>
              <Text style={styles.buttonText}>ניהול מנהלים</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Management Hierarchy Section */}
        <View style={styles.hierarchySection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-network-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>מבנה הניהול</Text>
          </View>
          <Text style={styles.sectionSubtitle}>עץ היררכיית המנהלים בקהילה</Text>
          <View style={styles.hierarchyCard}>
            <AdminHierarchyTree />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    paddingBottom: 150,
    flexGrow: 1,
    minHeight: '150%', // Ensure content is always scrollable, especially on web
  },
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
  },
  welcomeText: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  subtitleText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  button: {
    width: '31%',
    minHeight: 100,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  hierarchySection: {
    marginTop: LAYOUT_CONSTANTS.SPACING.XL,
    paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  sectionTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
  },
  hierarchyCard: {
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.XS,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
  },
  viewOnlyText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
});

