import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NavigationProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { AdminStackParamList } from '../globals/types';
import { useUser } from '../stores/userStore';
import { useAdminProtection } from '../hooks/useAdminProtection';
import { apiService } from '../utils/apiService';

interface AdminTimeManagementScreenProps {
  navigation: NavigationProp<AdminStackParamList>;
}

interface HoursReport {
  manager_hours: number;
  team_total_hours: number;
  by_task: Array<{
    task_id: string;
    task_title: string;
    hours: number;
  }>;
  by_period: Array<{
    period: string;
    hours: number;
  }>;
  by_user: Array<{
    user_id: string;
    user_name: string;
    hours: number;
  }>;
}

export default function AdminTimeManagementScreen({ navigation }: AdminTimeManagementScreenProps) {
  const route = useRoute();
  const routeParams = (route.params as any) || {};
  const viewOnly = routeParams?.viewOnly === true;
  useAdminProtection(true);
  const { selectedUser } = useUser();
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [report, setReport] = useState<HoursReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
  const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
    ? screenHeight - tabBarHeight - headerHeight
    : undefined;

  useEffect(() => {
    loadReport();
  }, [selectedUser?.id]);

  const loadReport = async () => {
    if (!selectedUser?.id) return;

    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getHoursReport(selectedUser.id);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error || 'שגיאה בטעינת הדוח');
      }
    } catch (err: any) {
      console.error('Error loading hours report:', err);
      setError('שגיאה בטעינת הדוח');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatPeriod = (period: string) => {
    // period format: "YYYY-MM"
    const [year, month] = period.split('-');
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { position: 'relative' }]}>
      <StatusBar backgroundColor={colors.backgroundSecondary} barStyle="dark-content" />
      <View 
        style={styles.header}
        onLayout={(event) => {
          if (Platform.OS === 'web') {
            const { height } = event.nativeEvent.layout;
            setHeaderHeight(height);
          }
        }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>ניהול זמן עובדים</Text>
      </View>

      {/* List container - limited height on web to ensure scrolling works */}
      <View style={[
        styles.listWrapper,
        Platform.OS === 'web' && maxListHeight ? {
          maxHeight: maxListHeight,
        } : undefined
      ]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          scrollEnabled={true}
          nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
          scrollEventThrottle={16}
        >

        {loading && !report && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>טוען דוחות...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadReport}>
              <Text style={styles.retryButtonText}>נסה שוב</Text>
            </TouchableOpacity>
          </View>
        )}

        {report && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Ionicons name="person-outline" size={32} color={colors.primary} />
                <Text style={styles.summaryValue}>{formatHours(report.manager_hours)}</Text>
                <Text style={styles.summaryLabel}>שעות המנהל</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="people-outline" size={32} color={colors.success} />
                <Text style={styles.summaryValue}>{formatHours(report.team_total_hours)}</Text>
                <Text style={styles.summaryLabel}>סה"כ שעות הצוות</Text>
              </View>
            </View>

            {/* Hours by User */}
            {report.by_user && report.by_user.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>שעות עבודה לפי משתמש</Text>
                </View>
                <View style={styles.list}>
                  {report.by_user.map((item, index) => (
                    <View key={item.user_id} style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{item.user_name}</Text>
                        <Text style={styles.listItemValue}>{formatHours(item.hours)} שעות</Text>
                      </View>
                      {index < report.by_user.length - 1 && <View style={styles.separator} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Hours by Task */}
            {report.by_task && report.by_task.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-done-outline" size={20} color={colors.info} />
                  <Text style={styles.sectionTitle}>שעות עבודה לפי משימה</Text>
                </View>
                <View style={styles.list}>
                  {report.by_task.slice(0, 10).map((item, index) => (
                    <View key={item.task_id} style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle} numberOfLines={2}>
                          {item.task_title}
                        </Text>
                        <Text style={styles.listItemValue}>{formatHours(item.hours)} שעות</Text>
                      </View>
                      {index < Math.min(report.by_task.length, 10) - 1 && <View style={styles.separator} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Hours by Period */}
            {report.by_period && report.by_period.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={20} color={colors.warning} />
                  <Text style={styles.sectionTitle}>שעות עבודה לפי תקופה</Text>
                </View>
                <View style={styles.list}>
                  {report.by_period.map((item, index) => (
                    <View key={item.period} style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{formatPeriod(item.period)}</Text>
                        <Text style={styles.listItemValue}>{formatHours(item.hours)} שעות</Text>
                      </View>
                      {index < report.by_period.length - 1 && <View style={styles.separator} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(!report.by_user || report.by_user.length === 0) &&
              (!report.by_task || report.by_task.length === 0) &&
              (!report.by_period || report.by_period.length === 0) && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>אין נתוני שעות עבודה להצגה</Text>
                </View>
              )}
          </>
        )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
    gap: LAYOUT_CONSTANTS.SPACING.MD,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT_CONSTANTS.SPACING.XL * 2,
  },
  loadingText: {
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  errorText: {
    fontSize: FontSizes.medium,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    paddingVertical: LAYOUT_CONSTANTS.SPACING.SM,
    backgroundColor: colors.error,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.SMALL,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginVertical: LAYOUT_CONSTANTS.SPACING.SM,
  },
  summaryLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
  },
  sectionTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  list: {
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listItem: {
    padding: LAYOUT_CONSTANTS.SPACING.MD,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginRight: LAYOUT_CONSTANTS.SPACING.MD,
  },
  listItemValue: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT_CONSTANTS.SPACING.XL * 2,
  },
  emptyText: {
    fontSize: FontSizes.medium,
    color: colors.textSecondary,
    marginTop: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'center',
  },
});

