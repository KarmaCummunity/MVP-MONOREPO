import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CURRENT_ENVIRONMENT, IS_DEVELOPMENT, API_BASE_URL } from '../src/infrastructure/config';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { createShadowStyle } from '../globals/styles';
import { logger } from '../utils/loggerService';

/**
 * DevEnvironmentBanner
 *
 * A visual indicator shown only in development environments to help
 * developers and testers distinguish between Dev and Production builds.
 *
 * Features:
 * - Clear visual distinction from production
 * - Shows API endpoint being used
 * - Reminds users that data is isolated
 * - Tap to see full environment details
 */
const DevEnvironmentBanner = () => {
    const { t } = useTranslation('common');
    if (!IS_DEVELOPMENT) {
        return null;
    }

    const handlePress = () => {
        const message = `Development Environment\n\nAPI: ${API_BASE_URL}\nEnvironment: ${CURRENT_ENVIRONMENT}\n\nData is isolated from Production. Safe to test.`;
        if (Platform.OS === 'web') {
            alert(message);
        } else {
            logger.info('DevEnvironmentBanner', message);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <TouchableOpacity
                    style={styles.banner}
                    onPress={handlePress}
                    activeOpacity={0.7}
                >
                    <View style={styles.leftSection}>
                        <View style={styles.badge}>
                            <Text style={styles.dot}>🟢</Text>
                            <Text style={styles.text}>DEV</Text>
                        </View>
                        <Text style={styles.subtext}>{t('devBanner.dataIsolated')}</Text>
                    </View>
                    <Text style={styles.tapHint}>{t('devBanner.tapForInfo')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.successLight,
        borderBottomWidth: 2,
        borderBottomColor: colors.success,
        zIndex: 9999,
        ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 3),
    },
    safeArea: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    banner: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 14,
        ...createShadowStyle(colors.shadow, { width: 0, height: 1 }, 0.2, 2),
    },
    dot: {
        fontSize: FontSizes.small,
        marginRight: 4,
    },
    text: {
        fontSize: FontSizes.extraSmall + 3,
        fontWeight: 'bold',
        color: colors.textInverse,
        letterSpacing: 0.8,
    },
    subtext: {
        fontSize: FontSizes.extraSmall + 2,
        fontStyle: 'italic',
        color: colors.success,
        fontWeight: '500',
    },
    tapHint: {
        fontSize: FontSizes.extraSmall + 1,
        color: colors.success,
        fontStyle: 'italic',
    },
});

export default DevEnvironmentBanner;
