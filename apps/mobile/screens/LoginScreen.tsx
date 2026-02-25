import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    I18nManager,
    Animated,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser } from '../stores/userStore';
import colors from '../globals/colors';
import { navigationQueue } from '../utils/navigationQueue';
import { checkNavigationGuards } from '../utils/navigationGuards';
import {
    signInWithEmail,
    signUpWithEmail,
    sendVerification
} from '../utils/authService';
import FirebaseGoogleButton from '../components/FirebaseGoogleButton';
import i18n from '../app/i18n';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const { t } = useTranslation(['auth', 'common', 'settings']);
    const { setCurrentPrincipal } = useUser();
    // const navigation = useNavigation<any>();

    // UI State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Animations
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [fadeAnim]);

    // Language Toggle
    const toggleLanguage = async () => {
        const currentLang = i18n.language;
        const newLang = currentLang.startsWith('he') ? 'en' : 'he';
        await AsyncStorage.setItem('app_language', newLang);
        await i18n.changeLanguage(newLang);
        const isRTL = newLang === 'he';
        if (I18nManager.isRTL !== isRTL) {
            I18nManager.allowRTL(isRTL);
            I18nManager.forceRTL(isRTL);
            if (Platform.OS !== 'web') {
                Alert.alert(t('settings:restartRequired'), t('settings:restartDesc'));
            }
        }
    };

    const handleGuestLogin = async () => {
        try {
            setIsLoading(true);
            await setCurrentPrincipal({ user: null, role: 'guest' });

            const guardContext = {
                isAuthenticated: true,
                isGuestMode: true,
                isAdmin: false,
            };

            const guardResult = await checkNavigationGuards(
                { type: 'reset', index: 0, routes: [{ name: 'HomeStack' }] },
                guardContext
            );

            if (!guardResult.allowed && guardResult.redirectTo) {
                await navigationQueue.reset(0, [{ name: guardResult.redirectTo }], 2);
            } else {
                await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
            }
        } catch (error) {
            console.error('Guest login failed', error);
            Alert.alert(t('common:error'), t('common:genericTryAgain'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailAction = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert(t('common:error'), t('auth:email.invalidFormat'));
            return;
        }

        if (!password || password.length < 6) {
            Alert.alert(t('common:error'), t('auth:email.passwordTooShort'));
            return;
        }

        setIsLoading(true);
        try {
            const nowIso = new Date().toISOString();

            // Try to sign in first (unified flow)
            try {
                const fbUser = await signInWithEmail(email, password);

                // Get UUID from server using firebase_uid
                try {
                    const { apiService } = await import('../utils/apiService');
                    const resolveResponse = await apiService.resolveUserId({
                        firebase_uid: fbUser.uid,
                        email: email
                    });

                    if (!resolveResponse.success || !resolveResponse.user) {
                        // Fallback: try to get user by email
                        const userResponse = await apiService.getUserById(fbUser.email || email);
                        if (userResponse.success && userResponse.data) {
                            const serverUser = userResponse.data;
                            const userData = {
                                id: serverUser.id, // UUID from database
                                name: serverUser.name || fbUser.displayName || email.split('@')[0],
                                email: serverUser.email || email,
                                isActive: serverUser.is_active !== false,
                                lastActive: serverUser.last_active || nowIso,
                                roles: serverUser.roles || ['user'],
                                settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
                                phone: serverUser.phone || fbUser.phoneNumber || '',
                                avatar: serverUser.avatar_url || fbUser.photoURL || 'https://i.pravatar.cc/150?img=12',
                                bio: serverUser.bio || '',
                                karmaPoints: serverUser.karma_points || 0,
                                joinDate: serverUser.join_date || serverUser.created_at || nowIso,
                                location: { city: serverUser.city || 'תל אביב', country: serverUser.country || 'Israel' },
                                interests: serverUser.interests || [],
                                postsCount: serverUser.posts_count || 0,
                                followersCount: serverUser.followers_count || 0,
                                followingCount: serverUser.following_count || 0,
                                notifications: [],
                            };
                            await setCurrentPrincipal({ user: userData, role: 'user' });
                            await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
                            return;
                        }
                        throw new Error('Failed to get user from server');
                    }

                    // Use UUID from server
                    const serverUser = resolveResponse.user;
                    const userData = {
                        id: serverUser.id, // UUID from database - this is the primary identifier
                        name: serverUser.name || fbUser.displayName || email.split('@')[0],
                        email: serverUser.email || email,
                        isActive: serverUser.isActive !== false,
                        lastActive: serverUser.lastActive || nowIso,
                        roles: serverUser.roles || ['user'],
                        settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
                        phone: serverUser.phone || fbUser.phoneNumber || '',
                        avatar: serverUser.avatar || fbUser.photoURL || 'https://i.pravatar.cc/150?img=12',
                        bio: serverUser.bio || '',
                        karmaPoints: serverUser.karmaPoints || 0,
                        joinDate: serverUser.createdAt || serverUser.joinDate || nowIso,
                        location: serverUser.location || { city: 'תל אביב', country: 'Israel' },
                        interests: serverUser.interests || [],
                        postsCount: serverUser.postsCount || 0,
                        followersCount: serverUser.followersCount || 0,
                        followingCount: serverUser.followingCount || 0,
                        notifications: [],
                    };
                    await setCurrentPrincipal({ user: userData, role: 'user' });
                    await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
                    return;
                } catch (error) {
                    console.error('Failed to get user UUID from server:', error);
                    throw error;
                }
            } catch (signInError: any) {
                // If sign in fails with user-not-found, try to register
                if (signInError.code === 'auth/user-not-found') {
                    try {
                        // Try to register new user
                        const fbUser = await signUpWithEmail(email, password);
                        await sendVerification(fbUser);

                        Alert.alert(
                            t('auth:email.verifyTitle'),
                            t('auth:email.verificationRequired'),
                            [{ text: t('common:confirm') }]
                        );
                        return;
                    } catch (signUpError: any) {
                        // If sign up fails with email-already-in-use, try to sign in again
                        // This might happen if user was created between attempts
                        if (signUpError.code === 'auth/email-already-in-use') {
                            const fbUser = await signInWithEmail(email, password);
                            // Get user data and proceed with login (same logic as above)
                            const { apiService } = await import('../utils/apiService');
                            const resolveResponse = await apiService.resolveUserId({
                                firebase_uid: fbUser.uid,
                                email: email
                            });

                            if (resolveResponse.success && resolveResponse.user) {
                                const serverUser = resolveResponse.user;
                                const userData = {
                                    id: serverUser.id,
                                    name: serverUser.name || fbUser.displayName || email.split('@')[0],
                                    email: serverUser.email || email,
                                    isActive: serverUser.isActive !== false,
                                    lastActive: serverUser.lastActive || nowIso,
                                    roles: serverUser.roles || ['user'],
                                    settings: serverUser.settings || { language: 'he', darkMode: false, notificationsEnabled: true },
                                    phone: serverUser.phone || fbUser.phoneNumber || '',
                                    avatar: serverUser.avatar || fbUser.photoURL || 'https://i.pravatar.cc/150?img=12',
                                    bio: serverUser.bio || '',
                                    karmaPoints: serverUser.karmaPoints || 0,
                                    joinDate: serverUser.createdAt || serverUser.joinDate || nowIso,
                                    location: serverUser.location || { city: 'תל אביב', country: 'Israel' },
                                    interests: serverUser.interests || [],
                                    postsCount: serverUser.postsCount || 0,
                                    followersCount: serverUser.followersCount || 0,
                                    followingCount: serverUser.followingCount || 0,
                                    notifications: [],
                                };
                                await setCurrentPrincipal({ user: userData, role: 'user' });
                                await navigationQueue.reset(0, [{ name: 'HomeStack' }], 2);
                                return;
                            }
                        }
                        throw signUpError;
                    }
                } else {
                    // For other sign-in errors (like wrong-password), throw to be handled below
                    throw signInError;
                }
            }
        } catch (error: any) {
            console.error('Auth action failed', error);
            let msg = t('common:genericTryAgain');
            if (error.code === 'auth/wrong-password') {
                msg = t('auth:email.wrongPassword', 'סיסמה לא נכונה. אנא נסה שוב.');
            } else if (error.code === 'auth/email-already-in-use') {
                msg = t('auth:email.emailAlreadyRegistered', 'המייל כבר רשום. אנא בדוק את הסיסמה.');
            } else if (error.code === 'auth/user-not-found') {
                // This shouldn't happen in unified flow, but handle it gracefully
                msg = t('common:genericTryAgain');
            }
            Alert.alert(t('common:error'), msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

            {/* Background Decor */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    style={{ opacity: fadeAnim }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header / Logo */}
                    <View style={styles.header}>
                        <Image
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            source={require('../assets/images/new_logo_black.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>{t('common:appName', 'Karma Community')}</Text>
                        <Text style={styles.subtitle}>
                            {t('common:welcomeShort')}
                        </Text>
                    </View>

                    {/* Language Switch */}
                    <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
                        <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
                        <Text style={styles.langText}>{i18n.language.startsWith('he') ? 'EN' : 'עב'}</Text>
                    </TouchableOpacity>

                    {/* Form Card */}
                    <View style={styles.card}>

                        {/* Google Login */}
                        <View style={styles.googleContainer}>
                            <FirebaseGoogleButton />
                        </View>

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.orText}>{t('common:or')}</Text>
                            <View style={styles.line} />
                        </View>

                        {/* Email Fields */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('auth:email.placeholder')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth:email.placeholderExample', 'name@example.com')}
                                placeholderTextColor={colors.textTertiary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('auth:email.passwordPlaceholder')}</Text>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={styles.inputPassword}
                                    placeholder={t('auth:email.passwordPlaceholderExample', '******')}
                                    placeholderTextColor={colors.textTertiary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={[styles.primaryButton, isLoading && styles.disabledBtn]}
                            onPress={handleEmailAction}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>
                                    {t('auth:email.unifiedAction', 'המשך')}
                                </Text>
                            )}
                        </TouchableOpacity>


                        {/* Guest Mode */}
                        <TouchableOpacity onPress={handleGuestLogin} style={styles.guestButton}>
                            <Text style={styles.guestText}>{t('auth:continueAsGuest')}</Text>
                            <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>

                    </View>
                </Animated.ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        overflow: 'hidden',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'center',
        minHeight: height,
    },
    circle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.primary,
        opacity: 0.1,
    },
    circle2: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.secondary,
        opacity: 0.1,
    },
    langButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 8,
        borderRadius: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    langText: {
        marginLeft: 6,
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    googleContainer: {
        marginBottom: 20,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    orText: {
        marginHorizontal: 16,
        color: colors.textTertiary,
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
        textAlign: 'left', // Inputs LTR mostly or RTL depending on lang, keeping label aligned naturally
    },
    input: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: colors.textPrimary,
        textAlign: 'left',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
    },
    inputPassword: {
        flex: 1,
        padding: 14,
        fontSize: 16,
        color: colors.textPrimary,
        textAlign: 'left',
    },
    eyeIcon: {
        padding: 14,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    footerActions: {
        marginTop: 20,
        alignItems: 'center',
        gap: 12,
    },
    linkText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    switchText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    linkTextBold: {
        color: colors.primary,
        fontWeight: '700',
    },
    guestButton: {
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    guestText: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
});