import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';
import { useTranslation } from 'react-i18next';

interface RideHistoryCardProps {
    ride: any;
    onDelete: (ride: any) => void;
    onRestore: (ride: any) => void;
}

const RideHistoryCard: React.FC<RideHistoryCardProps> = ({ ride, onDelete, onRestore }) => {
    const { t } = useTranslation();
    const isCancelled = ride.status === 'cancelled';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>
                        {ride.from} ➝ {ride.to}
                    </Text>
                    <Text style={styles.date}>
                        {ride.date} | {ride.time}
                    </Text>
                </View>

                {!isCancelled && (
                    <TouchableOpacity
                        onPress={() => onDelete(ride)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icon name="trash-outline" size={20} color={colors.legacyDarkRed} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.footer}>
                <View style={[styles.badge, isCancelled && styles.badgeCancelled]}>
                    <Text style={[styles.badgeText, isCancelled && styles.badgeTextCancelled]}>
                        {isCancelled ? (t('common:cancelled') || 'בוטל') : (ride.status || 'פורסם')}
                    </Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.restoreChip}
                        onPress={() => onRestore(ride)}
                    >
                        <Text style={styles.restoreChipText}>{t('trump:restore') || 'שחזר'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.price}>{ride.price ? `₪${ride.price}` : 'חינם'}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.moneyCardBackground,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 4,
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        fontSize: FontSizes.small,
        color: colors.textPrimary,
        textAlign: 'right',
    },
    date: {
        fontSize: FontSizes.caption,
        color: colors.textSecondary,
        textAlign: 'right',
    },
    deleteButton: {
        padding: 4,
        marginLeft: 8,
    },
    footer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    actions: {
        flexDirection: 'row', // Left to right internally for price/restore
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: colors.moneyStatusBackground,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeCancelled: {
        backgroundColor: colors.errorLight,
    },
    badgeText: {
        fontSize: FontSizes.caption,
        color: colors.moneyStatusText,
        fontWeight: 'bold',
    },
    badgeTextCancelled: {
        color: colors.legacyDarkRed,
    },
    restoreChip: {
        backgroundColor: colors.moneyFormBackground,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    restoreChipText: {
        fontSize: FontSizes.small,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    price: {
        fontSize: FontSizes.small,
        fontWeight: 'bold',
        color: colors.moneyHistoryAmount,
    }
});

export default RideHistoryCard;
