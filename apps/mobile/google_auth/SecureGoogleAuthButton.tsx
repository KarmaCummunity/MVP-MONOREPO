/**
 * ========================================
 * SECURE GOOGLE AUTHENTICATION BUTTON
 * ========================================
 * 
 * A premium, enterprise-grade Google authentication button component.
 * Features:
 * - Professional design with micro-animations
 * - Integrated security indicators
 * - Platform-specific optimizations
 * - Seamless integration with GoogleAuthService
 * - Comprehensive accessibility support
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    Text,
    View,
    ActivityIndicator,
    Platform,
    ViewStyle,
    TextStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import GoogleAuthService from './GoogleAuthService';
import { createOAuthConfig } from './AuthConfiguration';
import colors from '../globals/colors';
import { LAYOUT_CONSTANTS } from '../globals/constants';
import { logger } from '../utils/loggerService';

// Complete the auth session if we are on web
if (Platform.OS === 'web') {
    WebBrowser.maybeCompleteAuthSession();
}

export interface SecureGoogleAuthButtonProps {
    /** Callback fired on successful authentication */
    onSuccess?: (user: unknown) => void;
    /** Callback fired on authentication error */
    onError?: (error: unknown) => void;
    /** Whether to show a small security indicator icon */
    showSecurityIndicator?: boolean;
    /** Custom styles for the button container */
    style?: ViewStyle;
    /** Custom styles for the button text */
    textStyle?: TextStyle;
    /** Optional button label */
    label?: string;
    /** Whether the button is disabled */
    disabled?: boolean;
}

/**
 * SecureGoogleAuthButton Component
 */
const SecureGoogleAuthButton: React.FC<SecureGoogleAuthButtonProps> = ({
    onSuccess,
    onError,
    showSecurityIndicator = true,
    style,
    textStyle,
    label,
    disabled = false
}) => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Initialize Expo Google Auth hook
    const oauthConfig = createOAuthConfig();
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        ...oauthConfig,
        scopes: [...oauthConfig.scopes] as string[]
    });

    // Handle OAuth response
    React.useEffect(() => {
        const handleResponse = async () => {
            if (response?.type === 'success' && response.params?.id_token) {
                setIsAuthenticating(true);
                try {
                    logger.info('SecureGoogleAuthButton', 'OAuth success, verifying with server');
                    const authResult = await GoogleAuthService.authenticateWithGoogle(
                        response.params.id_token
                    );

                    if (authResult.success) {
                        logger.info('SecureGoogleAuthButton', 'Authentication completed successfully');
                        if (onSuccess) onSuccess(authResult.data?.user);
                    } else {
                        logger.error('SecureGoogleAuthButton', 'Server verification failed', {
                            error: authResult.error
                        });
                        if (onError) onError(new Error(authResult.error));
                    }
                } catch (error) {
                    logger.error('SecureGoogleAuthButton', 'Unexpected authentication error', { error });
                    if (onError) onError(error);
                } finally {
                    setIsAuthenticating(false);
                }
            } else if (response?.type === 'error') {
                logger.warn('SecureGoogleAuthButton', 'OAuth error received', {
                    error: response.error
                });
                if (onError) onError(response.error);
            }
        };

        handleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSuccess/onError are callbacks; parent should wrap in useCallback if needed
    }, [response, onSuccess, onError]);

    const handlePress = async () => {
        if (disabled || isAuthenticating || !request) return;

        logger.info('SecureGoogleAuthButton', 'User initiated Google login');
        try {
            await promptAsync();
        } catch (error) {
            logger.error('SecureGoogleAuthButton', 'Failed to prompt Google login', { error });
            if (onError) onError(error);
        }
    };

    const isLoading = isAuthenticating || !request;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                style,
                (disabled || isLoading) && styles.disabledButton
            ]}
            onPress={handlePress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={label || "Sign in with Google"}
            accessibilityState={{ disabled: disabled || isLoading }}
        >
            <View style={styles.contentContainer}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <>
                        <View style={styles.logoContainer}>
                            <Ionicons name="logo-google" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.text, textStyle]}>
                            {label || "Sign in with Google"}
                        </Text>
                        {showSecurityIndicator && (
                            <View style={styles.securityIndicator}>
                                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                            </View>
                        )}
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.background,
        borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
        paddingVertical: 14,
        paddingHorizontal: 20,
        width: '100%',
        ...LAYOUT_CONSTANTS.SHADOW.LIGHT,
        shadowColor: colors.shadow,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
    },
    logoContainer: {
        marginRight: 10,
    },
    text: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    securityIndicator: {
        marginLeft: 10,
        backgroundColor: colors.successLight,
        borderRadius: 6,
        padding: 2,
    },
    disabledButton: {
        opacity: 0.7,
        backgroundColor: colors.offWhite,
    },
});

export default SecureGoogleAuthButton;
