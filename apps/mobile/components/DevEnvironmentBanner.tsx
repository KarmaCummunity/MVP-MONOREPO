import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, Linking } from 'react-native';
import { CURRENT_ENVIRONMENT, IS_DEVELOPMENT, API_BASE_URL } from '../utils/config.constants';

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
    // Only show in development environment
    if (!IS_DEVELOPMENT) {
        return null;
    }

    const handlePress = () => {
        // Show environment details
        const message = `🟢 Development Environment\n\n` +
            `API: ${API_BASE_URL}\n` +
            `Environment: ${CURRENT_ENVIRONMENT}\n\n` +
            `✅ Data is completely isolated from Production\n` +
            `✅ Safe to test and experiment\n` +
            `✅ Changes won't affect real users`;
        
        // On web, we can use alert. On mobile, you might want a modal
        if (Platform.OS === 'web') {
            alert(message);
        } else {
            // For mobile, you could implement a modal or use a toast library
            console.log(message);
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
                        <Text style={styles.subtext}>
                            נתונים מבודדים מהפרודקשן
                        </Text>
                    </View>
                    <Text style={styles.tapHint}>לחץ למידע</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E8F5E9', // Very light green
        borderBottomWidth: 2,
        borderBottomColor: '#66BB6A',
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    safeArea: {
        // On iOS, SafeAreaView handles the notch
        // On Android, we might need manual padding if not using a library
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
        backgroundColor: '#66BB6A',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    dot: {
        fontSize: 12,
        marginRight: 4,
    },
    text: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    subtext: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#2E7D32',
        fontWeight: '500',
    },
    tapHint: {
        fontSize: 9,
        color: '#4CAF50',
        fontStyle: 'italic',
    },
});

export default DevEnvironmentBanner;
