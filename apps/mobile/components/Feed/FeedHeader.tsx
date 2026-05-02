import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../globals/colors';

interface FeedHeaderProps {
    feedMode: 'friends' | 'discovery';
    setFeedMode: (mode: 'friends' | 'discovery') => void;
    onStatsPress: () => void;
    onFilterPress: () => void;
    filterActive?: boolean;
    /** When false, friends/discovery toggle is hidden (e.g. guest mode has no friends feed). */
    showFeedModeToggle?: boolean;
    t: (key: string) => string;
}

const FeedHeader: React.FC<FeedHeaderProps> = ({
    feedMode,
    setFeedMode,
    onStatsPress,
    onFilterPress,
    filterActive = false,
    showFeedModeToggle = true,
    t,
}) => {
    return (
        <View style={styles.floatingHeaderContainer}>
            <View style={styles.headerContentWrapper}>
                {/* Toggle Switch */}
                {showFeedModeToggle ? (
                <View style={styles.toggleBackground}>
                    <TouchableOpacity
                        style={[
                            styles.toggleSegment,
                            feedMode === 'friends' ? styles.toggleSelected : styles.toggleUnselected
                        ]}
                        onPress={() => setFeedMode('friends')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.toggleText,
                            feedMode === 'friends' ? styles.toggleTextSelected : {}
                        ]}>
                            {t('feed.tabs.friends')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.toggleSegment,
                            feedMode === 'discovery' ? styles.toggleSelected : styles.toggleUnselected
                        ]}
                        onPress={() => setFeedMode('discovery')}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.toggleText,
                            feedMode === 'discovery' ? styles.toggleTextSelected : {}
                        ]}>
                            {t('feed.tabs.discovery')}
                        </Text>
                    </TouchableOpacity>
                </View>
                ) : null}

                {/* Filter */}
                <TouchableOpacity
                    style={styles.statsButton}
                    onPress={onFilterPress}
                    activeOpacity={0.8}
                    accessibilityLabel={t('feed.filterAccessibility')}
                >
                    <Ionicons name="filter" size={20} color={colors.primary} />
                    {filterActive ? <View style={styles.filterBadge} /> : null}
                </TouchableOpacity>

                {/* Stats Button */}
                <TouchableOpacity
                    style={styles.statsButton}
                    onPress={onStatsPress}
                    activeOpacity={0.8}
                >
                    <Ionicons name="stats-chart" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    floatingHeaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
    },
    headerContentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toggleBackground: {
        flexDirection: 'row-reverse',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 999,
        height: 36,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 200,
    },
    toggleSegment: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        paddingHorizontal: 16,
    },
    toggleSelected: {
        backgroundColor: colors.white,
        ...Platform.select({
            web: {
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            },
            default: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
            },
        }),
    },
    toggleUnselected: {
        backgroundColor: 'transparent',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    toggleTextSelected: {
        color: colors.primary,
        fontWeight: '700',
    },
    statsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        ...Platform.select({
            web: {
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            },
            default: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
            },
        }),
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.secondary,
        borderWidth: 1,
        borderColor: colors.white,
    },
});

export default React.memo(FeedHeader);
