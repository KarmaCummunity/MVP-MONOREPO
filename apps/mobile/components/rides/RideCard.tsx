import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { FontSizes } from '../../globals/constants';

interface RideCardProps {
    ride: any;
    onPress: (ride: any) => void;
}

const RideCard: React.FC<RideCardProps> = ({ ride, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(ride)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.driverInfo}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarEmoji}>{ride.image || '🚗'}</Text>
                    </View>
                    <View>
                        <Text style={styles.driverName}>{ride.driverName}</Text>
                        <Text style={styles.routeText} numberOfLines={1}>
                            {ride.from} ➝ {ride.to}
                        </Text>
                    </View>
                </View>
                <Text style={styles.price}>{ride.price ? `₪${ride.price}` : 'חינם'}</Text>
            </View>

            <View style={styles.details}>
                <View style={styles.detailRow}>
                    <Icon name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{ride.time} | {ride.date}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Icon name="people-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{ride.seats} מקומות</Text>
                </View>
            </View>

            <View style={styles.footer}>
                {ride.noSmoking && <View style={styles.tag}><Text style={styles.tagText}>🚫🚭</Text></View>}
                {ride.petsAllowed && <View style={styles.tag}><Text style={styles.tagText}>🐾</Text></View>}
                {ride.kidsFriendly && <View style={styles.tag}><Text style={styles.tagText}>👶</Text></View>}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.moneyCardBackground,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.moneyFormBorder,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        width: '100%',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    driverInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEmoji: {
        fontSize: 20,
    },
    driverName: {
        fontWeight: 'bold',
        fontSize: FontSizes.small,
        color: colors.textPrimary,
        textAlign: 'right',
    },
    routeText: {
        fontSize: FontSizes.small,
        color: colors.textSecondary,
        textAlign: 'right',
        maxWidth: 200,
    },
    price: {
        fontSize: FontSizes.medium,
        fontWeight: 'bold',
        color: colors.moneyHistoryAmount,
    },
    details: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 8,
        borderTopWidth: 1,
        borderTopColor: colors.moneyFormBorder,
        paddingTop: 8,
    },
    detailRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: FontSizes.small,
        color: colors.textPrimary,
    },
    footer: {
        flexDirection: 'row-reverse',
        gap: 6,
    },
    tag: {
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        fontSize: FontSizes.caption,
    }
});

export default RideCard;
