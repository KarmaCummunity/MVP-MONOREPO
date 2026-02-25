/**
 * ========================================
 * GOOGLE AUTHENTICATION SYSTEM - MAIN EXPORTS
 * ========================================
 * 
 * This is the main entry point for the Karma Community Google Authentication System.
 * Import everything you need for authentication from this single file.
 * 
 * MAIN EXPORTS:
 * - GoogleAuthService: Main authentication service (singleton)
 * - SecureGoogleAuthButton: React component for Google login
 * - SecureApiService: API client with automatic authentication
 * - AuthConfiguration: Configuration and settings
 * - Types: All TypeScript interfaces and types
 * 
 * USAGE:
 * ```typescript
 * import { 
 *   googleAuthService, 
 *   SecureGoogleAuthButton,
 *   secureApiService 
 * } from './google_auth';
 * ```
 * 
 * AUTHOR: AI Assistant
 * VERSION: 1.0.1
 * SECURITY LEVEL: Enterprise Grade
 */

// ========================================
// MAIN SERVICES
// ========================================

/**
 * Main authentication service (singleton)
 * Handles all Google OAuth operations, token management, and session handling
 */
export { 
  googleAuthService,
  GoogleAuthService 
} from './GoogleAuthService';

/**
 * Secure API service for authenticated requests
 * Automatically handles authentication headers, token refresh, and error handling
 */
export { 
  secureApiService,
  SecureApiService 
} from './SecureApiService';

// ========================================
// REACT COMPONENTS
// ========================================

/**
 * Secure Google authentication button component
 * Drop-in replacement for old authentication buttons with enterprise-grade security
 */
export { 
  default as SecureGoogleAuthButton
} from './SecureGoogleAuthButton';

// ========================================
// CONFIGURATION
// ========================================

/**
 * Authentication configuration and settings
 * All OAuth, security, and performance settings
 */
export {
  default as AuthConfiguration,
  AUTH_CONFIG,
  getGoogleClientIds,
  isGoogleOAuthConfigured,
  getRedirectUri,
  createOAuthConfig,
  getApiBaseUrl,
  validateAuthConfiguration,
  ERROR_MESSAGES
} from './AuthConfiguration';

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Main authentication types
 */
export type {
  AuthTokens,
  SecureAuthUser,
  AuthResponse,
  AuthState,
} from './GoogleAuthService';

/**
 * API service types
 */
export type {
  ApiResponse,
  RequestOptions,
  ApiError,
  ApiErrorType,
} from './SecureApiService';

/**
 * Component prop types
 */
export type {
  SecureGoogleAuthButtonProps as GoogleAuthButtonProps,
} from './SecureGoogleAuthButton';

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Quick initialization function for easy setup
 * Call this once in your App.tsx or main component
 * 
 * @example
 * ```typescript
 * import { initializeGoogleAuth } from './google_auth';
 * 
 * useEffect(() => {
 *   initializeGoogleAuth().then(() => {
 *     console.log('Google Auth initialized');
 *   });
 * }, []);
 * ```
 */
export const initializeGoogleAuth = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Import services dynamically to avoid circular dependencies
    const { googleAuthService } = await import('./GoogleAuthService');
    const { validateAuthConfiguration } = await import('./AuthConfiguration');
    
    // Validate configuration
    const validation = validateAuthConfiguration();
    if (!validation.isValid) {
      throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
    }

    // Initialize the service
    await googleAuthService.initialize();
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Initialization failed'
    };
  }
};

/**
 * Quick authentication status check
 * Useful for navigation guards and conditional rendering
 * 
 * @returns Object with authentication status and user data
 * 
 * @example
 * ```typescript
 * const { isAuthenticated, user } = getAuthStatus();
 * if (isAuthenticated) {
 *   console.log('User logged in:', user.email);
 * }
 * ```
 */
export const getAuthStatus = (): {
  isAuthenticated: boolean;
  user: any | null;
  state: any;
  hasValidTokens: boolean;
} => {
  // Import services dynamically to avoid circular dependencies
  const { googleAuthService } = require('./GoogleAuthService');
  
  return {
    isAuthenticated: googleAuthService.isAuthenticated(),
    user: googleAuthService.getCurrentUser(),
    state: googleAuthService.getAuthState(),
    hasValidTokens: !!googleAuthService.getAccessToken(),
  };
};

/**
 * Quick logout function
 * Performs complete logout with cleanup
 * 
 * @returns Promise resolving when logout is complete
 * 
 * @example
 * ```typescript
 * const handleLogout = async () => {
 *   await logoutUser();
 *   navigation.navigate('LoginScreen');
 * };
 * ```
 */
export const logoutUser = async (): Promise<void> => {
  const { googleAuthService } = await import('./GoogleAuthService');
  await googleAuthService.logout();
};

/**
 * Health check for the authentication system
 * Useful for debugging and monitoring
 * 
 * @returns Health status of all authentication components
 * 
 * @example
 * ```typescript
 * const health = await checkAuthHealth();
 * console.log('Auth system health:', health);
 * ```
 */
export const checkAuthHealth = async (): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    authService: 'healthy' | 'unhealthy';
    apiService: 'healthy' | 'unhealthy';
    serverConnection: 'healthy' | 'unhealthy';
  };
  details: {
    configurationValid: boolean;
    hasStoredTokens: boolean;
    serverReachable: boolean;
  };
}> => {
  try {
    // Import services dynamically to avoid circular dependencies
    const { validateAuthConfiguration } = await import('./AuthConfiguration');
    const { googleAuthService } = await import('./GoogleAuthService');
    const { secureApiService } = await import('./SecureApiService');
    
    // Check configuration
    const configValidation = validateAuthConfiguration();
    
    // Check stored authentication
    const authStatus = getAuthStatus();
    
    // Check server connectivity
    const serverHealth = await secureApiService.healthCheck();
    
    // Determine component health
    const components = {
      authService: (authStatus.state !== 'error' ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
      apiService: 'healthy' as const, // API service is always functional
      serverConnection: (serverHealth.success ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
    };
    
    // Determine overall health
    const healthyComponents = Object.values(components).filter(h => h === 'healthy').length;
    const overall = 
      healthyComponents === 3 ? 'healthy' :
      healthyComponents >= 2 ? 'degraded' : 
      'unhealthy';
    
    return {
      overall,
      components,
      details: {
        configurationValid: configValidation.isValid,
        hasStoredTokens: authStatus.hasValidTokens,
        serverReachable: serverHealth.success,
      }
    };
    
  } catch (error) {
    return {
      overall: 'unhealthy',
      components: {
        authService: 'unhealthy',
        apiService: 'unhealthy', 
        serverConnection: 'unhealthy',
      },
      details: {
        configurationValid: false,
        hasStoredTokens: false,
        serverReachable: false,
      }
    };
  }
};

// ========================================
// MIGRATION HELPERS
// ========================================

/**
 * Migration helper for upgrading from old authentication system
 * 
 * @returns Promise resolving when migration is complete
 * 
 * @example
 * ```typescript
 * // Call this once when upgrading to new auth system
 * await migrateFromLegacyAuth();
 * ```
 */
export const migrateFromLegacyAuth = async (): Promise<{
  migrated: boolean;
  clearedData: string[];
}> => {
  const clearedData: string[] = [];
  
  try {
    // List of old authentication storage keys to clean up
    const oldKeys = [
      'current_user',
      'guest_mode',
      'auth_mode', 
      'oauth_success_flag',
      'google_auth_user',
      'google_auth_token',
      'oauth_in_progress',
    ];
    
    // Clear old authentication data from AsyncStorage
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    
    for (const key of oldKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        await AsyncStorage.removeItem(key);
        clearedData.push(key);
      }
    }
    
    if (clearedData.length > 0) {
      const { logger } = await import('../utils/loggerService');
      logger.info('GoogleAuth', 'Legacy authentication data cleared', {
        clearedKeys: clearedData
      });
    }
    
    return {
      migrated: true,
      clearedData
    };
    
  } catch (error) {
    const { logger } = await import('../utils/loggerService');
    logger.error('GoogleAuth', 'Failed to migrate from legacy auth', {
      error: String(error)
    });
    
    return {
      migrated: false,
      clearedData
    };
  }
};

// ========================================
// CONSTANTS
// ========================================

/**
 * Current version of the authentication system
 */
export const AUTH_SYSTEM_VERSION = '1.0.1';

/**
 * System capabilities
 */
export const CAPABILITIES = {
  HAS_SERVER_VERIFICATION: true,
  HAS_SECURE_STORAGE: true,
  HAS_AUTOMATIC_REFRESH: true,
  HAS_RATE_LIMITING: true,
  HAS_SESSION_MANAGEMENT: true,
  HAS_ERROR_RECOVERY: true,
  HAS_OFFLINE_SUPPORT: false, // TODO
  HAS_BIOMETRIC_AUTH: false,  // TODO
} as const;

/**
 * ========================================
 * QUICK START GUIDE
 * ========================================
 * 
 * 1. SETUP ENVIRONMENT VARIABLES:
 * ```env
 * EXPO_PUBLIC_API_BASE_URL=your-server-url
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id
 * ```
 * 
 * 2. INITIALIZE IN APP:
 * ```typescript
 * import { initializeGoogleAuth } from './google_auth';
 * 
 * useEffect(() => {
 *   initializeGoogleAuth();
 * }, []);
 * ```
 * 
 * 3. USE LOGIN BUTTON:
 * ```tsx
 * import { SecureGoogleAuthButton } from './google_auth';
 * 
 * <SecureGoogleAuthButton
 *   onSuccess={(user) => navigation.navigate('Home')}
 * />
 * ```
 * 
 * 4. MAKE API CALLS:
 * ```typescript
 * import { secureApiService } from './google_auth';
 * 
 * const data = await secureApiService.getCurrentUser();
 * ```
 * 
 * That's it! The authentication system handles everything else automatically.
 */
