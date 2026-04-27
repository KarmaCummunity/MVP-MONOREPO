import { StyleSheet, Platform } from 'react-native';
import colors from '../../../globals/colors';
import { FontSizes } from '../../../globals/constants';
import { isMobileWeb } from '../../../globals/responsive';

const isMobile = isMobileWeb();

export const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: isMobile ? 12 : 16,
        marginVertical: isMobile ? 6 : 8,
        marginHorizontal: 0,
        overflow: 'hidden',
        minHeight: isMobile ? 260 : 320,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
            web: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' },
        }),
    },
    gridContainer: {
        minHeight: isMobile ? 200 : 260,
    },
    header: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    headerRight: {
        alignItems: 'center',
        gap: 8,
    },
    moreButton: { padding: 4 },
    userInfo: {
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: isMobile ? 36 : 44,
        height: isMobile ? 36 : 44,
        borderRadius: isMobile ? 18 : 22,
        backgroundColor: colors.backgroundTertiary,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
    },
    userTextContainer: { gap: 2, flex: 1 },
    userName: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    timestamp: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary,
    },
    challengeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary,
        paddingHorizontal: isMobile ? 8 : 12,
        paddingVertical: isMobile ? 3 : 6,
        borderRadius: isMobile ? 16 : 20,
        gap: isMobile ? 4 : 6,
    },
    challengeBadgeText: {
        fontSize: isMobile ? 10 : FontSizes.small,
        fontWeight: '600',
        color: colors.white,
    },
    cardContent: { flex: 1, backgroundColor: '#F3F4F6' },
    heroImage: {
        width: '100%',
        height: isMobile ? 140 : 180,
        backgroundColor: colors.backgroundTertiary,
    },
    contentInner: {
        padding: isMobile ? 14 : 20,
        alignItems: 'stretch',
        gap: isMobile ? 8 : 10,
    },
    contentInnerGrid: { padding: isMobile ? 10 : 14 },
    contentInnerWithImage: { paddingTop: isMobile ? 12 : 16 },
    iconWrap: {
        alignSelf: 'center',
        width: isMobile ? 56 : 72,
        height: isMobile ? 56 : 72,
        borderRadius: isMobile ? 28 : 36,
        backgroundColor: '#EDE9FE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headline: {
        fontSize: isMobile ? 16 : 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 4,
    },
    challengeTitle: {
        fontSize: isMobile ? FontSizes.body : 20,
        fontWeight: '700',
        color: colors.primary,
    },
    description: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        lineHeight: isMobile ? 18 : 22,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
    },
    metaChipText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    ctaHint: {
        fontSize: isMobile ? 12 : FontSizes.small,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 4,
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        backgroundColor: colors.white,
    },
    actionsLeft: { alignItems: 'center' },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionCount: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    likedCount: { color: colors.error },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
