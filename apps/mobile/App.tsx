// File overview:
// - Purpose: Root application entry point for iOS/Android/Web with web mode support.
// - Reached from: App registry (Expo) bootstraps this component.
// - Provides: React Navigation container with `MainNavigator`, global `UserProvider`, gesture and safe-area roots, StatusBar.
// - Reads: AsyncStorage 'app_language' for i18n + RTL, Expo fonts, SplashScreen control, optional notificationService, WebBrowser auth completion.
// - Listens: Push/in-app notification responses and deep links; when clicked, navigates to 'ChatDetailScreen' (with conversationId) or 'NotificationsScreen'.
// - Downstream flow: App -> MainNavigator -> (LandingSiteScreen | LoginScreen | HomeStack/BottomNavigator) -> Tab stacks -> Screens.
// - Side effects: Initializes i18n + RTL, loads fonts, hides splash, installs notification listener, holds a navigationRef for programmatic navigation.
// - Route params: None (this is the top-level container).
// - External deps/services: react-navigation, expo modules, i18n, UserContext, WebModeContext.
//
// IMPORTANT WEB MODE CHANGES:
// - Container padding adjusts for web toggle button in app mode (48px top padding)
// - WebModeToggleOverlay positioned absolutely above all content
// - Navigation container key changes with mode to trigger proper re-renders

// App.tsx

// TODO: Add proper error handling for font loading failures with fallback fonts
// TODO: Implement proper deep linking configuration and testing
// TODO: Add crash reporting integration (Sentry, Bugsnag)
// TODO: Remove magic numbers for padding (48px) - use constants file
// TODO: Add proper accessibility support throughout the app
import React, { useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { View, Text, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './app/i18n';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';

import MainNavigator from './navigations/MainNavigator';
// Ensure tslib default interop for certain vendor bundles
import './polyfills/tslib-default';
import colors from './globals/colors';
import { useWebMode } from './stores/webModeStore';
import { useAppLoading } from './stores/appLoadingStore';
import { useUser } from './stores/userStore';
import WebModeToggleOverlay from './components/WebModeToggleOverlay';
import DevEnvironmentBanner from './components/DevEnvironmentBanner';
import { FontSizes } from "./globals/constants";
import { logger } from './utils/loggerService';
import ErrorBoundary from './components/ErrorBoundary';
import { saveNavigationState, loadNavigationState, clearNavigationState } from './utils/navigationPersistence';
import { NavigationState } from '@react-navigation/native';
import { navigationQueue } from './utils/navigationQueue';
import { RootStackParamList } from './globals/types';
import { linking } from './utils/linkingConfig';
// RTL is controlled via selected language in i18n and Settings

// Initialize notifications only on supported platforms
type NotificationService = {
  setupNotificationResponseListener: (
    callback: (response: {
      notification: {
        request: {
          content: {
            data?: {
              type?: string;
              conversationId?: string;
            }
          }
        }
      }
    }) => void
  ) => { remove?: () => void } | null;
} | null;

let notificationService: NotificationService = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationService = require('./utils/notificationService');
  } catch (error) {
    logger.warn('App', 'Failed to load notification service', { error });
  }
}

// Complete auth session results as early as possible (important for Web OAuth flows)
try { WebBrowser.maybeCompleteAuthSession(); } catch { /* ignored */ }

SplashScreen.preventAutoHideAsync();

// Web mode store initializes automatically when created (synchronous)
// No need for early initialization - it reads from localStorage on creation

function AppContent() {
  const { t } = useTranslation(['common']);
  const { selectedUser } = useUser();

  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  // Initialize with null - will be loaded before NavigationContainer renders
  const [initialNavigationState, setInitialNavigationState] = React.useState<NavigationState | undefined>(undefined);
  const [isNavigationStateLoaded, setIsNavigationStateLoaded] = React.useState(false);

  // Use centralized loading state instead of local state
  const {
    state: { isAppReady },
    setLoading,
    setError,
    markAppReady,
    getCriticalError
  } = useAppLoading();

  // Initialize stores and load navigation state on mount
  // This must happen before NavigationContainer is rendered
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initializeStoresAndLoadState = async () => {
      try {
        logger.info('App', 'Initializing Zustand stores and loading navigation state');

        // Set timeout to prevent infinite white screen (10 seconds max)
        timeoutId = setTimeout(() => {
          logger.warn('App', 'Initialization timeout - forcing navigation state to load');
          setIsNavigationStateLoaded(true);
        }, 10000);

        // Initialize web mode store (reads from localStorage synchronously on creation)
        if (Platform.OS === 'web') {
          try {
            logger.info('App', 'Importing web mode store');
            const { useWebModeStore } = await import('./stores/webModeStore');
            logger.info('App', 'Web mode store imported, initializing');
            useWebModeStore.getState().initialize();
            logger.info('App', 'Web mode store initialized');

            // Initialize version checker for web only (non-critical, can fail)
            try {
              logger.info('App', 'Importing version checker');
              const { initVersionChecker } = await import('./utils/versionChecker');
              initVersionChecker();
              logger.info('App', 'Version checker initialized');
            } catch (versionError) {
              logger.warn('App', 'Version checker failed to initialize (non-critical)', { error: versionError });
              // Continue - version checker is not critical for app functionality
            }
          } catch (webError) {
            logger.error('App', 'Error initializing web mode store', { error: webError });
            throw webError;
          }
        }

        // Initialize user store
        try {
          logger.info('App', 'Importing user store');
          const { useUserStore } = await import('./stores/userStore');
          logger.info('App', 'User store imported, calling initialize');
          await useUserStore.getState().initialize();
          logger.info('App', 'User store initialized');
        } catch (userStoreError) {
          logger.error('App', 'Error initializing user store', { error: userStoreError });
          throw userStoreError;
        }

        logger.info('App', 'Zustand stores initialized');

        // Load navigation state after stores are ready
        try {
          const { useWebModeStore } = await import('./stores/webModeStore');
          const { useUserStore } = await import('./stores/userStore');
          const mode = useWebModeStore.getState().mode;
          const userId = useUserStore.getState().selectedUser?.id || null;

          logger.info('App', 'Loading navigation state', { mode, userId });
          const savedState = await loadNavigationState(mode, userId);
          if (savedState) {
            setInitialNavigationState(savedState);
            logger.info('App', 'Navigation state loaded successfully', {
              mode,
              hasUserId: !!userId,
              routeNames: savedState.routes?.map((r: { name: string }) => r.name) || []
            });
          } else {
            logger.info('App', 'No saved navigation state found', { mode, hasUserId: !!userId });
          }
        } catch (navError) {
          logger.warn('App', 'Error loading navigation state, continuing anyway', { error: navError });
        }

        // Clear timeout if initialization completed successfully
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        setIsNavigationStateLoaded(true);
      } catch (error) {
        logger.error('App', 'Failed to initialize stores or load navigation state', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        setIsNavigationStateLoaded(true); // Continue even if loading fails
      }
    };

    // Initialize immediately - no delay needed
    initializeStoresAndLoadState();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  logger.info('App', 'App component mounted');

  // TODO: Move notification setup to dedicated notification service/hook
  // TODO: Add proper error handling for notification permission failures
  // TODO: Test notification handling on all platforms (iOS/Android/Web)
  // Setup notification response listener (iOS + Android)
  useEffect(() => {
    if (!notificationService) return;

    const subscription = notificationService.setupNotificationResponseListener((response) => {
      try {
        logger.info('App', 'Notification clicked', { response });
        const data = response?.notification?.request?.content?.data || {};
        const type = data?.type;
        const conversationId = data?.conversationId;

        if (navigationRef.current?.isReady()) {
          // Use navigation queue for deep link navigation to ensure proper sequencing
          if (type === 'message' && conversationId) {
            // Navigate to ChatDetailScreen - note that it requires full params according to RootStackParamList
            // For notifications, we'll need userName, userAvatar, and otherUserId
            // For now, we'll navigate to NotificationsScreen if we don't have full params
          }
          navigationQueue.navigate('NotificationsScreen', undefined, 1).catch((error) => {
            logger.warn('App', 'Failed to navigate to NotificationsScreen from notification', { error });
          });
        }
      } catch (err) {
        logger.warn('App', 'Failed to handle notification response', { error: err });
      }
    });

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  // Start global notification listener for the current user
  useEffect(() => {
    if (!selectedUser) return;

    // Dynamically import to avoid circular dependencies if any, or just use the required module
    // We can use the notificationService variable we already required at the top if it's available
    // But startNotificationListener is a named export, so we might need to require it specifically or import it at top

    // Since we are in App.tsx and it's already using require for notificationService, let's use that pattern or import at top.
    // However, startNotificationListener is a new export. Let's add it to the require at the top or just import it if we can.
    // The file uses `import` for other things, so let's add an import at the top.

    // Actually, I'll add the import at the top in a separate edit, and here just use it.
    // Wait, I can't add import at top easily with replace_file_content if I'm editing the middle.
    // I will use `require` here to be safe and consistent with the conditional logic at the top of App.tsx

    let cleanupListener: (() => void) | undefined;

    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { startNotificationListener } = require('./utils/notificationService');
        cleanupListener = startNotificationListener(selectedUser.id);
      } catch (e) {
        logger.warn('App', 'Failed to start notification listener', { error: e });
      }
    }

    return () => {
      if (cleanupListener) cleanupListener();
    };
  }, [selectedUser?.id]); // React to user changes


  // Fast initial setup to show the UI as quickly as possible
  useEffect(() => {
    const showUiQuickly = async () => {
      try {
        logger.info('App', 'Performing fast initial setup');
        markAppReady();
        await SplashScreen.hideAsync();
        logger.info('App', 'Splash screen hidden');
      } catch (e) {
        logger.error('App', 'Fast initial setup failed', { error: e });
        setError('app', e instanceof Error ? e : new Error('Unknown error during fast setup'));
      }
    };

    showUiQuickly();
  }, [markAppReady, setError]);

  // Load heavy resources in the background after the UI is visible
  useEffect(() => {
    const loadBackgroundResources = async () => {
      logger.info('App', 'Starting background resource loading');

      // Validate configuration after all modules are loaded
      try {
        const { validateConfig } = await import('./utils/dbConfig');
        validateConfig();
      } catch (e) {
        logger.warn('App', 'Config validation failed', { error: e });
      }

      // Apply stored language
      try {
        setLoading('language', true);
        const storedLang = await AsyncStorage.getItem('app_language');
        const lang = storedLang === 'he' || storedLang === 'en' ? storedLang : null;
        if (lang) {
          await i18n.changeLanguage(lang);
          const isRTL = lang === 'he';
          if (I18nManager.isRTL !== isRTL) {
            I18nManager.allowRTL(isRTL);
            I18nManager.forceRTL(isRTL);
          }
        }
      } catch (e) {
        logger.warn('App', 'Language load failed, using defaults');
        setError('language', e as Error);
      } finally {
        setLoading('language', false);
      }

      // Loading fonts
      try {
        setLoading('fonts', true);
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialIcons.font,
        });
        logger.info('App', 'Fonts loaded successfully');
      } catch (fontError) {
        logger.warn('App', 'Font loading failed, continuing without custom fonts');
        setError('fonts', fontError as Error);
      } finally {
        setLoading('fonts', false);
      }
    };

    if (isAppReady) {
      loadBackgroundResources();
    }
  }, [isAppReady, setLoading, setError]);



  // Check for critical errors
  const criticalError = getCriticalError();
  if (criticalError) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.errorText}>
          Oops! There was an issue loading essential resources.
        </Text>
        <Text style={errorStyles.detailText}>
          Please try restarting the app.
        </Text>
        {/* For debugging, you can re-enable this if needed */}
        {(typeof __DEV__ !== 'undefined' && __DEV__) && <Text style={errorStyles.detailText}>Error: {criticalError.message}</Text>}
      </View>
    );
  }

  // Don't render NavigationContainer until navigation state is loaded
  // This ensures initialState is set before first render
  if (!isAppReady || !isNavigationStateLoaded) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={loadingStyles.loadingText}>{t('common:loading')}</Text>
      </View>
    );
  }

  const AppNavigationRoot = memo(({ initialState }: { initialState: NavigationState | undefined }) => {
    const { mode } = useWebMode();
    const { isAuthenticated, isGuestMode, selectedUser } = useUser();
    const prevModeRef = useRef<string>(mode);
    const prevUserIdRef = useRef<string | null>(selectedUser?.id || null);

    /**
     * Determine if web mode toggle button should be visible
     * Toggle is hidden for authenticated users (users who created an account)
     * Toggle is shown for guest users and non-authenticated users
     */
    const shouldShowToggle = useMemo(
      () => !(isAuthenticated && !isGuestMode && selectedUser),
      [isAuthenticated, isGuestMode, selectedUser]
    );

    /**
     * Add top padding in app mode to make room for toggle button
     * Only add padding if toggle button is visible (not for authenticated users)
     * This prevents unnecessary spacing when the toggle is hidden
     */
    const containerStyle = useMemo(() => ({
      flex: 1,
      paddingTop: Platform.OS === 'web' && shouldShowToggle ? 64 : 0 // Space for top bar
    }), [mode, shouldShowToggle]);

    // Wrapper style for web - full width without maxWidth constraint
    const webWrapperStyle = useMemo(() => Platform.OS === 'web' ? {
      width: '100%' as const,
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    } : {}, []);

    // Navigation container key - only change when mode actually changes (not on auth state changes)
    // This prevents unnecessary re-mounts when auth state updates
    const navKey = useMemo(() => `nav-${mode}`, [mode]);

    // Save navigation state before unmount (when mode or user changes)
    useEffect(() => {
      return () => {
        // Cleanup: save state before unmount
        if (navigationRef.current?.isReady()) {
          const currentState = navigationRef.current.getRootState();
          if (currentState) {
            saveNavigationState(currentState, prevModeRef.current, prevUserIdRef.current);
            logger.debug('App', 'Navigation state saved before unmount', {
              mode: prevModeRef.current,
              hasUserId: !!prevUserIdRef.current,
            });
          }
        }
      };
    }, []);

    // Save navigation state when it changes
    const handleNavigationStateChange = useCallback(
      (state: NavigationState | undefined) => {
        if (state) {
          const currentRoute = state.routes?.[state.index || 0];
          const routeName = currentRoute?.name || 'unknown';
          logger.debug('App', 'Navigation state changed, saving...', {
            routeName,
            mode,
            hasUserId: !!selectedUser?.id,
            routesCount: state.routes?.length || 0,
          });
          saveNavigationState(state, mode, selectedUser?.id || null);
        }
      },
      [mode, selectedUser?.id]
    );

    // Initialize navigation queue with ref when container is ready
    useEffect(() => {
      if (navigationRef.current?.isReady()) {
        navigationQueue.initialize(navigationRef.current);
      }
    }, []);

    // Update refs when mode or userId changes
    useEffect(() => {
      const prevMode = prevModeRef.current;
      const prevUserId = prevUserIdRef.current;

      // If mode or userId changed, clear old navigation state
      if (prevMode !== mode || prevUserId !== selectedUser?.id) {
        if (prevMode && prevUserId !== undefined) {
          // Clear old state asynchronously (don't block)
          clearNavigationState(prevMode, prevUserId).catch((error) => {
            logger.warn('App', 'Failed to clear old navigation state', { error });
          });
        }
      }

      prevModeRef.current = mode;
      prevUserIdRef.current = selectedUser?.id || null;
    }, [mode, selectedUser?.id]);

    return (
      <NavigationContainer<RootStackParamList>
        key={navKey}
        ref={(ref) => {
          navigationRef.current = ref;
          if (ref?.isReady()) {
            navigationQueue.initialize(ref);
          }
        }}
        onReady={() => {
          if (navigationRef.current?.isReady()) {
            navigationQueue.initialize(navigationRef.current);
          }
        }}
        linking={linking}
        initialState={initialState}
        onStateChange={handleNavigationStateChange}
      >
        <View style={Platform.OS === 'web' ? { flex: 1, backgroundColor: colors.black } : { flex: 1 }}>
          <View style={[containerStyle, webWrapperStyle]}>
            <DevEnvironmentBanner />
            <MainNavigator />
            <WebModeToggleOverlay />
            <StatusBar style="auto" />
          </View>
        </View>
      </NavigationContainer>
    );
  });
  AppNavigationRoot.displayName = 'AppNavigationRoot';

  return (
    <AppNavigationRoot initialState={initialNavigationState} />
  );
}

// Main App component (no providers needed with Zustand)
export default function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('App', 'React component tree crashed', {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          }
        });
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.black,
  },
  loadingText: {
    marginTop: 10,
    fontSize: FontSizes.medium,
    color: colors.textPrimary,
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.errorLight,
    padding: 20,
  },
  errorText: {
    fontSize: FontSizes.large,
    fontWeight: "bold",
    color: colors.error,
    textAlign: "center",
    marginBottom: 10,
  },
  detailText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: "center",
  },
});

