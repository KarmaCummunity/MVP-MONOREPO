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
        minHeight: isMobile ? 280 : 380,
        ...Platform.select({
            ios: {
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8
            },
            android: { elevation: 4 },
            web: { boxShadow: `0 4px 16px ${colors.feedCardShadow}` }
        })
    },
    containerCompletion: {
        borderWidth: isMobile ? 1 : 2,
        borderColor: colors.surfaceGreenTint,
        ...Platform.select({
            ios: {
                shadowColor: colors.success,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8
            },
            android: { elevation: 4 },
            web: { boxShadow: `0 4px 16px ${colors.overlayGreenAccent10}` }
        })
    },
    gridContainer: {
        minHeight: isMobile ? 180 : 250
    },
    header: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary
    },
    headerCompletion: {
        backgroundColor: colors.surfaceElevated
    },
    headerRight: {
        alignItems: 'center',
        gap: 8
    },
    moreButton: { padding: 4 },
    userInfo: {
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    avatar: {
        width: isMobile ? 36 : 44,
        height: isMobile ? 36 : 44,
        borderRadius: isMobile ? 18 : 22,
        backgroundColor: colors.backgroundTertiary
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary
    },
    userTextContainer: { gap: 2, flex: 1 },
    userName: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '700',
        color: colors.textPrimary
    },
    timestamp: {
        fontSize: isMobile ? 10 : FontSizes.small,
        color: colors.textSecondary
    },
    taskBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    completedTaskBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.success,
        padding: isMobile ? 6 : 8,
        borderRadius: isMobile ? 16 : 20
    },
    cardContent: {
        flex: 1
    },
    cardContentGridFill: {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0
    },
    cardContentAssignment: {
        backgroundColor: colors.surfaceGrayBlue
    },
    cardContentCompletion: {
        backgroundColor: colors.surfaceGreenPale
    },
    contentContainer: {
        padding: isMobile ? 16 : 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 10 : 16,
        flex: 1
    },
    contentContainerGrid: {
        padding: isMobile ? 12 : 16
    },
    iconContainer: {
        width: isMobile ? 60 : 80,
        height: isMobile ? 60 : 80,
        borderRadius: isMobile ? 30 : 40,
        backgroundColor: colors.surfaceGrayBlueBorder,
        justifyContent: 'center',
        alignItems: 'center'
    },
    textContainer: {
        gap: 8,
        alignItems: 'center'
    },
    titleAssignment: {
        fontSize: isMobile ? 18 : 22,
        fontWeight: '700',
        color: colors.textPrimary
    },
    description: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary,
        lineHeight: isMobile ? 16 : 22
    },
    detailsSection: {
        width: '100%',
        marginTop: isMobile ? 10 : 16,
        paddingTop: isMobile ? 10 : 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: isMobile ? 6 : 8
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isMobile ? 6 : 8
    },
    detailText: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        color: colors.textSecondary
    },
    celebrationContainer: {
        position: 'relative',
        marginBottom: 10
    },
    starsContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    textContainerCompletion: {
        gap: 16,
        alignItems: 'center',
        width: '100%'
    },
    titleCompletion: {
        fontSize: isMobile ? 18 : 24,
        fontWeight: '700',
        color: colors.success
    },
    taskReference: {
        backgroundColor: colors.overlayWhite80,
        padding: isMobile ? 12 : 16,
        borderRadius: isMobile ? 10 : 12,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.overlayGreenAccent10
    },
    taskReferenceText: {
        fontSize: isMobile ? FontSizes.small : 16,
        color: colors.textPrimary,
        fontWeight: '500',
        lineHeight: isMobile ? 18 : 24
    },
    actionsBar: {
        padding: isMobile ? 10 : 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.backgroundSecondary,
        backgroundColor: colors.white
    },
    actionsLeft: { alignItems: 'center' },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    actionCount: {
        fontSize: isMobile ? FontSizes.small : FontSizes.body,
        fontWeight: '600',
        color: colors.textSecondary
    },
    likedCount: { color: colors.error },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});
