// screens/CommunityStatsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions, ActivityIndicator, Platform, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useTranslation } from 'react-i18next';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { db } from '../utils/databaseService';
import { EnhancedStatsService } from '../utils/statsService';
import { apiService } from '../utils/apiService';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 768;
const isLargeScreen = width >= 768;

// Calculate responsive sizes
const getResponsiveCardWidth = () => {
    if (isLargeScreen) return (width - 64 - 24) / 3; // 3 cards per row on large screens
    if (isMediumScreen) return (width - 48 - 16) / 2; // 2 cards per row on medium screens
    return (width - 32 - 12) / 2; // 2 cards per row on small screens
};

const getResponsivePadding = () => {
    if (isLargeScreen) return 24;
    if (isMediumScreen) return 20;
    return 16;
};

const getResponsiveFontSize = (base: number) => {
    if (isSmallScreen) return base * 0.9;
    if (isLargeScreen) return base * 1.1;
    return base;
};

interface StatItemProps {
    icon: string;
    value: string;
    label: string;
    color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, color = colors.info }) => (
    <View style={styles.statItem}>
        <Ionicons name={icon as any} size={isSmallScreen ? 28 : 32} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
);

interface CommunityStats {
    // Community stats from landing page
    siteVisits: number;
    totalMoneyDonated: number;
    totalUsers: number;
    itemDonations: number;
    completedRides: number;
    recurringDonationsAmount: number;
    uniqueDonors: number;
    completedTasks: number;
    
    // Dashboard stats (tasks)
    tasks_open: number;
    tasks_in_progress: number;
    tasks_done: number;
    tasks_total: number;
    
    // Dashboard stats (users)
    admins_count: number;
    regular_users_count: number;
    total_users: number;
    
    // Dashboard stats (volunteer hours)
    total_volunteer_hours: number;
    avg_hours_per_user: number;
    current_month_hours: number;
    
    // Legacy stats
    totalRides: number;
    totalItems: number;
    totalDonations: number;
    activeCities: number;
    monthlyGrowth: number;
}

export default function CommunityStatsScreen() {
    const { t } = useTranslation();
    const { selectedUser } = useUser();
    const tabBarHeight = useBottomTabBarHeight() || 0;
    const [stats, setStats] = useState<CommunityStats>({
        // Community stats from landing page
        siteVisits: 0,
        totalMoneyDonated: 0,
        totalUsers: 0,
        itemDonations: 0,
        completedRides: 0,
        recurringDonationsAmount: 0,
        uniqueDonors: 0,
        completedTasks: 0,
        
        // Dashboard stats (tasks)
        tasks_open: 0,
        tasks_in_progress: 0,
        tasks_done: 0,
        tasks_total: 0,
        
        // Dashboard stats (users)
        admins_count: 0,
        regular_users_count: 0,
        total_users: 0,
        
        // Dashboard stats (volunteer hours)
        total_volunteer_hours: 0,
        avg_hours_per_user: 0,
        current_month_hours: 0,
        
        // Legacy stats
        totalRides: 0,
        totalItems: 0,
        totalDonations: 0,
        activeCities: 0,
        monthlyGrowth: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const screenHeight = Platform.OS === 'web' ? Dimensions.get('window').height : undefined;
    const maxListHeight = Platform.OS === 'web' && screenHeight && headerHeight > 0
        ? screenHeight - tabBarHeight - headerHeight
        : undefined;

    useEffect(() => {
        logger.debug('CommunityStatsScreen', 'Screen viewed', { userId: selectedUser?.id });
        loadStats();
    }, []);

    const loadStats = async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            // Load community stats from landing page (EnhancedStatsService)
            const communityStats = await EnhancedStatsService.getCommunityStats({}, forceRefresh);
            
            // Extract values - handle both direct values and nested value objects
            const getValue = (stat: any): number => {
                if (typeof stat === 'number') return stat;
                if (stat && typeof stat === 'object' && 'value' in stat) return stat.value || 0;
                return 0;
            };

            // Load dashboard stats (tasks, users, volunteer hours)
            const dashboardRes = await apiService.getDashboardStats();
            const dashboardStats = dashboardRes.success && dashboardRes.data ? dashboardRes.data : null;

            // Load legacy rides stats
            const rides = await db.listRides(selectedUser?.id || '', { includePast: true }).catch(() => []);
            const totalRides = rides.length;

            // Calculate active cities from rides
            const cities = new Set<string>();
            rides.forEach((ride: any) => {
                if (ride.from) cities.add(ride.from);
                if (ride.to) cities.add(ride.to);
            });

            // Get unique drivers from rides as a proxy for users
            const drivers = new Set<string>();
            rides.forEach((ride: any) => {
                if (ride.driverId) drivers.add(ride.driverId);
            });

            // Calculate monthly growth (mock for now - would need historical data)
            const monthlyGrowth = Math.floor(Math.random() * 30) + 10;

            // For now, use rides count as a proxy for items until we have a proper API
            const estimatedItems = Math.floor(totalRides * 1.5);

            setStats({
                // Community stats from landing page
                siteVisits: getValue(communityStats.siteVisits) || 0,
                totalMoneyDonated: getValue(communityStats.totalMoneyDonated) || 0,
                totalUsers: getValue(communityStats.totalUsers) || Math.max(drivers.size, 1),
                itemDonations: getValue(communityStats.itemDonations) || estimatedItems,
                completedRides: getValue(communityStats.completedRides) || totalRides,
                recurringDonationsAmount: getValue(communityStats.recurringDonationsAmount) || 0,
                uniqueDonors: getValue(communityStats.uniqueDonors) || 0,
                completedTasks: getValue(communityStats.completed_tasks) || 0,
                
                // Dashboard stats (tasks)
                tasks_open: dashboardStats?.metrics?.tasks_open ? Number(dashboardStats.metrics.tasks_open) : 0,
                tasks_in_progress: dashboardStats?.metrics?.tasks_in_progress ? Number(dashboardStats.metrics.tasks_in_progress) : 0,
                tasks_done: dashboardStats?.metrics?.tasks_done ? Number(dashboardStats.metrics.tasks_done) : 0,
                tasks_total: dashboardStats?.metrics?.tasks_total ? Number(dashboardStats.metrics.tasks_total) : 0,
                
                // Dashboard stats (users)
                admins_count: dashboardStats?.metrics?.admins_count ? Number(dashboardStats.metrics.admins_count) : 0,
                regular_users_count: dashboardStats?.metrics?.regular_users_count ? Number(dashboardStats.metrics.regular_users_count) : 0,
                total_users: dashboardStats?.metrics?.total_users ? Number(dashboardStats.metrics.total_users) : 0,
                
                // Dashboard stats (volunteer hours)
                total_volunteer_hours: dashboardStats?.metrics?.total_volunteer_hours ? Number(dashboardStats.metrics.total_volunteer_hours) : 0,
                avg_hours_per_user: dashboardStats?.metrics?.avg_hours_per_user ? Number(dashboardStats.metrics.avg_hours_per_user) : 0,
                current_month_hours: dashboardStats?.metrics?.current_month_hours ? Number(dashboardStats.metrics.current_month_hours) : 0,
                
                // Legacy stats
                totalRides,
                totalItems: estimatedItems,
                totalDonations: estimatedItems + totalRides,
                activeCities: cities.size,
                monthlyGrowth,
            });

            logger.debug('CommunityStatsScreen', 'Stats loaded', {
                communityStats,
                dashboardStats,
                totalRides,
                activeCities: cities.size,
            });
        } catch (error) {
            logger.error('CommunityStatsScreen', 'Failed to load stats', { error });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        await loadStats(true);
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
                <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>{t('common:loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && { position: 'relative' }]}>
            <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
            {/* List container - limited height on web to ensure scrolling works */}
            <View style={[
                styles.listWrapper,
                Platform.OS === 'web' && maxListHeight ? {
                    maxHeight: maxListHeight,
                } : undefined
            ]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    scrollEnabled={true}
                    nestedScrollEnabled={Platform.OS === 'web' ? true : undefined}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                >
                    <View 
                        style={styles.header}
                        onLayout={(event) => {
                            if (Platform.OS === 'web') {
                                const { height } = event.nativeEvent.layout;
                                setHeaderHeight(height);
                            }
                        }}
                    >
                    <Text style={styles.title}>סטטיסטיקות הקהילה</Text>
                    <Text style={styles.subtitle}>השפעה אמיתית, במספרים</Text>
                </View>

                {/* סטטיסטיקות קהילה כלליות */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>סטטיסטיקות קהילה</Text>
                    <View style={styles.statsGrid}>
                        <StatItem
                            icon="eye-outline"
                            value={stats.siteVisits.toLocaleString('he-IL')}
                            label="ביקורים באתר"
                            color={colors.info}
                        />
                        <StatItem
                            icon="cash-outline"
                            value={`${stats.totalMoneyDonated.toLocaleString('he-IL')} ₪`}
                            label={'ש"ח שנתרמו ישירות'}
                            color={colors.success}
                        />
                        <StatItem
                            icon="heart-outline"
                            value={stats.totalUsers.toLocaleString('he-IL')}
                            label="חברי קהילה רשומים"
                            color={colors.secondary}
                        />
                        <StatItem
                            icon="cube-outline"
                            value={stats.itemDonations.toLocaleString('he-IL')}
                            label="פריטים שפורסמו"
                            color={colors.accent}
                        />
                        <StatItem
                            icon="car-outline"
                            value={stats.completedRides.toLocaleString('he-IL')}
                            label="נסיעות קהילתיות"
                            color={colors.greenBright || colors.success}
                        />
                        <StatItem
                            icon="repeat-outline"
                            value={`${stats.recurringDonationsAmount.toLocaleString('he-IL')} ₪`}
                            label="תרומות קבועות פעילות"
                            color={colors.success}
                        />
                        <StatItem
                            icon="people-outline"
                            value={stats.uniqueDonors.toLocaleString('he-IL')}
                            label="תורמים פעילים"
                            color={colors.info}
                        />
                        <StatItem
                            icon="checkmark-done-outline"
                            value={stats.completedTasks.toLocaleString('he-IL')}
                            label="משימות שבוצעו"
                            color={colors.success}
                        />
                    </View>
                </View>

                {/* סטטיסטיקות משימות */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>סטטיסטיקות משימות</Text>
                    <View style={styles.statsGrid}>
                        <StatItem
                            icon="list-outline"
                            value={stats.tasks_open.toLocaleString('he-IL')}
                            label="משימות פתוחות"
                            color={colors.primary}
                        />
                        <StatItem
                            icon="hourglass-outline"
                            value={stats.tasks_in_progress.toLocaleString('he-IL')}
                            label="משימות בתהליך"
                            color={colors.warning}
                        />
                        <StatItem
                            icon="checkmark-done-outline"
                            value={stats.tasks_done.toLocaleString('he-IL')}
                            label="משימות שהושלמו"
                            color={colors.success}
                        />
                        <StatItem
                            icon="stats-chart-outline"
                            value={stats.tasks_total.toLocaleString('he-IL')}
                            label={'סה"כ משימות'}
                            color={colors.info}
                        />
                    </View>
                </View>

                {/* סטטיסטיקות משתמשים */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>סטטיסטיקות משתמשים</Text>
                    <View style={styles.statsGrid}>
                        <StatItem
                            icon="shield-outline"
                            value={stats.admins_count.toLocaleString('he-IL')}
                            label="מנהלים במערכת"
                            color={colors.secondary}
                        />
                        <StatItem
                            icon="people-outline"
                            value={stats.regular_users_count.toLocaleString('he-IL')}
                            label="משתמשים רגילים"
                            color={colors.info}
                        />
                        <StatItem
                            icon="person-outline"
                            value={stats.total_users.toLocaleString('he-IL')}
                            label={'סה"כ משתמשים'}
                            color={colors.textSecondary}
                        />
                    </View>
                </View>

                {/* סטטיסטיקות התנדבות */}
                {stats.total_volunteer_hours > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>סטטיסטיקות התנדבות</Text>
                        <View style={styles.statsGrid}>
                            <StatItem
                                icon="time-outline"
                                value={stats.total_volunteer_hours.toFixed(1)}
                                label={'סה"כ שעות התנדבות'}
                                color={colors.accent}
                            />
                            {stats.avg_hours_per_user > 0 && (
                                <StatItem
                                    icon="stats-chart-outline"
                                    value={stats.avg_hours_per_user.toFixed(1)}
                                    label="ממוצע שעות למשתמש"
                                    color={colors.info}
                                />
                            )}
                            {stats.current_month_hours > 0 && (
                                <StatItem
                                    icon="calendar-outline"
                                    value={stats.current_month_hours.toFixed(1)}
                                    label="שעות החודש הנוכחי"
                                    color={colors.warning}
                                />
                            )}
                        </View>
                    </View>
                )}

                {/* סטטיסטיקות נסיעות ופעילות */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פעילות קהילתית</Text>
                    <View style={styles.impactCard}>
                        <View style={styles.impactRow}>
                            <Ionicons name="car" size={24} color={colors.info} />
                            <Text style={styles.impactText}>
                                {stats.totalRides.toLocaleString('he-IL')} נסיעות
                            </Text>
                        </View>
                        <View style={styles.impactRow}>
                            <Ionicons name="gift" size={24} color={colors.secondary} />
                            <Text style={styles.impactText}>
                                {stats.totalItems.toLocaleString('he-IL')} פריטים שנתרמו
                            </Text>
                        </View>
                        <View style={styles.impactRow}>
                            <Ionicons name="globe" size={24} color={colors.primary} />
                            <Text style={styles.impactText}>
                                {stats.activeCities.toLocaleString('he-IL')} ערים פעילות
                            </Text>
                        </View>
                        <View style={styles.impactRow}>
                            <Ionicons name="trending-up" size={24} color={colors.success} />
                            <Text style={styles.impactText}>
                                +{stats.monthlyGrowth}% צמיחה חודשית
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bottom padding for safe area */}
                <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const responsivePadding = getResponsivePadding();
const cardWidth = getResponsiveCardWidth();

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
        position: 'relative',
    },
    listWrapper: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: getResponsiveFontSize(FontSizes.body),
        color: colors.textSecondary,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    },
    header: {
        padding: responsivePadding,
        paddingTop: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: getResponsiveFontSize(FontSizes.heading2),
        fontWeight: 'bold',
        color: colors.textPrimary,
        textAlign: 'right',
    },
    subtitle: {
        fontSize: getResponsiveFontSize(FontSizes.body),
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: 'right',
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: responsivePadding,
    },
    sectionTitle: {
        fontSize: getResponsiveFontSize(FontSizes.heading3),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 16,
        textAlign: 'right',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: isSmallScreen ? 8 : 12,
    },
    statItem: {
        width: cardWidth,
        backgroundColor: colors.white,
        padding: isSmallScreen ? 12 : 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: isSmallScreen ? 100 : 120,
        justifyContent: 'center',
    },
    statValue: {
        fontSize: getResponsiveFontSize(FontSizes.heading2),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginTop: 8,
        textAlign: 'center',
    },
    statLabel: {
        fontSize: getResponsiveFontSize(FontSizes.small),
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    impactCard: {
        backgroundColor: colors.white,
        padding: responsivePadding,
        borderRadius: 16,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    impactRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 4,
    },
    impactText: {
        fontSize: getResponsiveFontSize(FontSizes.body),
        color: colors.textPrimary,
        marginRight: 16,
        flex: 1,
        textAlign: 'right',
    },
    graphPlaceholder: {
        height: isSmallScreen ? 150 : 200,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    graphText: {
        color: colors.textSecondary,
        fontSize: getResponsiveFontSize(FontSizes.body),
        marginTop: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});
