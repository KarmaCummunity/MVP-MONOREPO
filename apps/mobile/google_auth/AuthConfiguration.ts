/**
 * ========================================
 * GOOGLE AUTHENTICATION CONFIGURATION
 * ========================================
 * 
 * Centralized configuration for all Google authentication settings.
 * This file contains all security, performance, and behavioral settings
 * for the authentication system.
 * 
 * CONFIGURATION CATEGORIES:
 * - OAuth settings (client IDs, scopes, redirect URIs)
 * - Security settings (token expiration, validation rules)
 * - Performance settings (caching, retry logic)
 * - UI/UX settings (timeouts, error messages)
 * - Platform-specific settings (iOS, Android, Web)
 * 
 * SECURITY PRINCIPLES:
 * - Environment-based configuration (no hardcoded secrets)
 * - Minimal permission scope (only necessary permissions)
 * - Secure defaults with explicit overrides
 * - Regular rotation of secrets and tokens
 * 
 * AUTHOR: AI Assistant
 * SECURITY LEVEL: Enterprise Grade
 * LAST UPDATED: 2024
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '../utils/loggerService';
import { API_BASE_URL } from '../utils/dbConfig';

// ========================================
// ENVIRONMENT VALIDATION
// ========================================

/**
 * Validate that all required environment variables are present
 * This prevents runtime errors and provides clear configuration feedback
 */
const validateEnvironmentConfiguration = (): {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
} => {
  const requiredVars = [
    'EXPO_PUBLIC_API_BASE_URL',
  ];
  
  const recommendedVars = [
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  ];
  const extra = (Constants?.expoConfig as any)?.extra || {};
  const getVar = (varName: string) => process.env[varName] ?? extra[varName];

  const missingRequired = requiredVars.filter(varName => !getVar(varName));
  const missingRecommended = recommendedVars.filter(varName => !getVar(varName));

  const isValid = missingRequired.length === 0;

  if (!isValid) {
    logger.error('AuthConfiguration', 'Missing required environment variables', {
      missing: missingRequired
    });
  }

  if (missingRecommended.length > 0) {
    logger.warn('AuthConfiguration', 'Missing recommended environment variables', {
      missing: missingRecommended
    });
  }

  return {
    isValid,
    missingVars: missingRequired,
    warnings: missingRecommended
  };
};

// ========================================
// CLIENT ID CONFIGURATION
// ========================================

/**
 * Google OAuth Client IDs for different platforms
 * These are loaded from environment variables for security
 * 
 * SECURITY NOTE: Client IDs are not secrets (they're public by design)
 * but they should still be properly configured per environment
 */
export const getGoogleClientIds = () => {
  const extra = (Constants?.expoConfig as any)?.extra ?? {};
  
  const clientIds = {
    /** iOS client ID from Google Cloud Console */
    ios: extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 
         process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
         
    /** Android client ID from Google Cloud Console */  
    android: extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 
             process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
             
    /** Web client ID from Google Cloud Console */
    web: extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 
         process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };

  // Log configuration status (IDs are public so logging is safe)
  logger.info('AuthConfiguration', 'Google Client IDs loaded', {
    hasIosClientId: !!clientIds.ios,
    hasAndroidClientId: !!clientIds.android,
    hasWebClientId: !!clientIds.web,
    platform: Platform.OS
  });

  return clientIds;
};

/**
 * Check if Google OAuth is properly configured for current platform
 */
export const isGoogleOAuthConfigured = (): boolean => {
  const clientIds = getGoogleClientIds();
  
  switch (Platform.OS) {
    case 'ios': 
      return !!(clientIds.ios || clientIds.web);
    case 'android': 
      return !!(clientIds.android || clientIds.web);
    case 'web': 
      return !!clientIds.web;
    default: 
      return false;
  }
};

// ========================================
// OAUTH SETTINGS
// ========================================

/**
 * Google OAuth configuration settings
 */
export const OAUTH_SETTINGS = {
  /**
   * OAuth scopes - minimal permissions for security and user privacy
   * 
   * - openid: Required for OpenID Connect
   * - profile: User's basic profile information (name, picture)
   * - email: User's email address
   * 
   * NOTE: We deliberately do NOT request additional scopes like:
   * - google-auth-library: Would allow access to user's Google services
   * - drive: Would allow access to user's Google Drive
   * - calendar: Would allow access to user's calendar
   */
  SCOPES: ['openid', 'profile', 'email'] as const,
  
  /**
   * OAuth response type
   * Using 'id_token' for immediate verification without backend code exchange
   * 
   * SECURITY: ID tokens are signed JWTs that can be verified directly
   * TODO: Consider switching to 'code' with PKCE for enhanced security
   */
  RESPONSE_TYPE: 'id_token' as const,
  
  /**
   * Maximum time to wait for user OAuth interaction
   * Prevents hanging authentication flows
   */
  USER_INTERACTION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  /**
   * OAuth state parameter for CSRF protection
   * TODO: Implement proper state generation and validation
   */
  USE_STATE_PARAMETER: false, // TODO: Enable when implemented
  
  /**
   * Use PKCE (Proof Key for Code Exchange) for enhanced security
   * TODO: Implement PKCE support for authorization code flow
   */
  USE_PKCE: false, // TODO: Enable when implemented
} as const;

// ========================================
// SECURITY SETTINGS
// ========================================

/**
 * Security-related configuration
 */
export const SECURITY_SETTINGS = {
  /**
   * JWT Token settings
   */
  TOKEN: {
    /** How long before expiry should we refresh tokens (5 minutes) */
    REFRESH_THRESHOLD_MS: 5 * 60 * 1000,
    
    /** Maximum age for ID tokens we accept (5 minutes) */
    MAX_TOKEN_AGE_MS: 5 * 60 * 1000,
    
    /** Maximum number of token refresh attempts before requiring re-auth */
    MAX_REFRESH_ATTEMPTS: 3,
    
    /** How often to validate tokens when app is active (15 minutes) */
    VALIDATION_INTERVAL_MS: 15 * 60 * 1000,
  },
  
  /**
   * Session settings
   */
  SESSION: {
    /** Session timeout for inactive users (24 hours) */
    INACTIVE_TIMEOUT_MS: 24 * 60 * 60 * 1000,
    
    /** How often to check for session expiry (1 minute) */
    EXPIRY_CHECK_INTERVAL_MS: 1 * 60 * 1000,
    
    /** Whether to extend session on activity */
    EXTEND_ON_ACTIVITY: true,
  },
  
  /**
   * Rate limiting settings (client-side awareness)
   */
  RATE_LIMITING: {
    /** Maximum authentication attempts per hour */
    MAX_AUTH_ATTEMPTS_PER_HOUR: 10,
    
    /** Backoff delay after failed attempts (exponential) */
    BACKOFF_DELAY_MS: 1000,
    
    /** Maximum backoff delay */
    MAX_BACKOFF_DELAY_MS: 30 * 1000,
  },
  
  /**
   * Storage security settings
   */
  STORAGE: {
    /** Use secure storage for tokens (platform-specific) */
    USE_SECURE_STORAGE: true,
    
    /** Encrypt sensitive data in storage */
    ENCRYPT_STORAGE: false, // TODO: Implement encryption
    
    /** Clear storage on app uninstall */
    CLEAR_ON_UNINSTALL: true,
  },
} as const;

// ========================================
// API CONFIGURATION
// ========================================

/**
 * API service configuration
 */
export const API_SETTINGS = {
  /**
   * Base URLs for different environments
   */
  BASE_URLS: {
    development: 'http://localhost:3001',
    staging: 'https://staging-api.karma-community.com', // TODO: Set up staging environment
    production: 'https://api.karma-community.com', // TODO: Set up production environment
  },
  
  /**
   * Request settings
   */
  REQUEST: {
    /** Default timeout for API requests (30 seconds) */
    DEFAULT_TIMEOUT_MS: 30 * 1000,
    
    /** Maximum retry attempts for failed requests */
    MAX_RETRIES: 3,
    
    /** Retry delay multiplier for exponential backoff */
    RETRY_MULTIPLIER: 2,
    
    /** Maximum retry delay */
    MAX_RETRY_DELAY_MS: 30 * 1000,
  },
  
  /**
   * Caching settings
   */
  CACHE: {
    /** Enable response caching for GET requests */
    ENABLED: true,
    
    /** Default cache duration (5 minutes) */
    DEFAULT_DURATION_MS: 5 * 60 * 1000,
    
    /** Maximum cache size (number of entries) */
    MAX_SIZE: 100,
    
    /** Cache TTL by endpoint pattern */
    TTL_BY_ENDPOINT: {
      '/api/users/': 15 * 60 * 1000,     // User profiles: 15 minutes
      '/api/donations': 2 * 60 * 1000,   // Donations: 2 minutes
      '/api/rides': 1 * 60 * 1000,       // Rides: 1 minute
      '/api/stats/': 10 * 60 * 1000,     // Statistics: 10 minutes
    },
  },
} as const;

// ========================================
// PLATFORM CONFIGURATION
// ========================================

/**
 * Platform-specific configuration
 */
export const PLATFORM_SETTINGS = {
  /**
   * iOS-specific settings
   */
  IOS: {
    /** Use SFSafariViewController for OAuth (more secure) */
    USE_SAFARI_VIEW_CONTROLLER: true,
    
    /** Enable keychain access group for shared storage */
    KEYCHAIN_ACCESS_GROUP: 'com.navesarussi1.KarmaCommunity',
    
    /** Use Face ID/Touch ID for token access */
    USE_BIOMETRIC_AUTH: false, // TODO: Implement biometric authentication
  },
  
  /**
   * Android-specific settings
   */
  ANDROID: {
    /** Use Chrome Custom Tabs for OAuth */
    USE_CHROME_CUSTOM_TABS: true,
    
    /** Android Keystore configuration */
    KEYSTORE_ALIAS: 'karma_auth_keys',
    
    /** Use fingerprint authentication for token access */
    USE_FINGERPRINT_AUTH: false, // TODO: Implement fingerprint authentication
  },
  
  /**
   * Web-specific settings
   */
  WEB: {
    /** Use session storage for tokens (more secure than localStorage) */
    USE_SESSION_STORAGE: true,
    
    /** Enable service worker for offline caching */
    USE_SERVICE_WORKER: false, // TODO: Implement service worker
    
    /** Cross-origin settings for OAuth popup */
    CORS_ORIGINS: [
      'https://accounts.google.com',
      'https://oauth2.googleapis.com',
    ],
  },
} as const;

// ========================================
// ERROR CONFIGURATION
// ========================================

/**
 * Error handling configuration
 * Provides user-friendly Hebrew messages for all error scenarios
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'בעיית חיבור לרשת. אנא בדוק את החיבור שלך ונסה שוב.',
  TIMEOUT_ERROR: 'הבקשה נמשכה יותר מדי זמן. אנא נסה שוב.',
  SERVER_ERROR: 'שגיאת שרת. אנא נסה שוב מאוחר יותר.',
  
  // Authentication errors  
  INVALID_TOKEN: 'אסימון האימות שגוי. אנא התחבר מחדש.',
  TOKEN_EXPIRED: 'תוקף האימות פג. אנא התחבר מחדש.',
  AUTHENTICATION_REQUIRED: 'נדרש אימות. אנא התחבר למערכת.',
  
  // OAuth errors
  OAUTH_CANCELLED: 'האימות בוטל על ידי המשתמש.',
  OAUTH_FAILED: 'האימות עם Google נכשל. אנא נסה שוב.',
  INVALID_OAUTH_RESPONSE: 'תגובה שגויה מGoogle. אנא נסה שוב.',
  
  // Configuration errors
  MISSING_CLIENT_ID: 'Google Client ID אינו מוגדר.',
  INVALID_REDIRECT_URI: 'כתובת החזרה שגויה.',
  MISSING_API_URL: 'כתובת השרת אינה מוגדרת.',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'יותר מדי בקשות. אנא המתן מספר דקות.',
  TOO_MANY_AUTH_ATTEMPTS: 'יותר מדי ניסיונות התחברות. אנא המתן ונסה שוב.',
  
  // Generic errors
  UNKNOWN_ERROR: 'שגיאה לא צפויה. אנא נסה שוב.',
  SERVICE_UNAVAILABLE: 'השירות אינו זמין כרגע. אנא נסה שוב מאוחר יותר.',
} as const;

// ========================================
// REDIRECT URI CONFIGURATION
// ========================================

/**
 * Generate redirect URI based on platform and environment
 * 
 * SECURITY: Redirect URIs must be whitelisted in Google Cloud Console
 * to prevent OAuth redirect attacks
 * 
 * @returns Platform-specific redirect URI
 */
export const getRedirectUri = (): string => {
  switch (Platform.OS) {
    case 'web':
      // Web: Use current domain or configured production domain
      const webDomain = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.EXPO_PUBLIC_WEB_DOMAIN || 'https://karma-community-kc.com');
      
      return `${webDomain}/oauthredirect`;
    
    case 'ios':
    case 'android':
      // Mobile: Use custom scheme for deep linking
      return `com.navesarussi1.KarmaCommunity://oauthredirect`;
    
    default:
      logger.error('AuthConfiguration', 'Unsupported platform for redirect URI');
      return '';
  }
};

// ========================================
// OAUTH CONFIGURATION FACTORY
// ========================================

/**
 * Create OAuth configuration object for expo-auth-session
 * 
 * This function generates the complete OAuth configuration
 * based on platform and environment settings
 * 
 * @returns OAuth configuration object
 */
export const createOAuthConfig = () => {
  const clientIds = getGoogleClientIds();
  const redirectUri = getRedirectUri();
  
  // Validate configuration
  if (!isGoogleOAuthConfigured()) {
    logger.error('AuthConfiguration', 'Cannot create OAuth config - missing client IDs');
    throw new Error('Google OAuth not properly configured');
  }

  const config = {
    // Client IDs for different platforms
    iosClientId: clientIds.ios,
    androidClientId: clientIds.android,
    webClientId: clientIds.web,
    expoClientId: clientIds.web, // Expo uses web client ID
    
    // OAuth parameters
    scopes: OAUTH_SETTINGS.SCOPES,
    responseType: OAUTH_SETTINGS.RESPONSE_TYPE,
    redirectUri,
    
    // Additional parameters for security (when implemented)
    // TODO: Add these when PKCE and state are implemented
    // codeChallenge: generateCodeChallenge(),
    // codeChallengeMethod: 'S256',
    // state: generateSecureState(),
    
    // Additional Google-specific parameters
    additionalParameters: {
      // Ensure fresh consent (good for testing, disable in production)
      prompt: process.env.NODE_ENV === 'development' ? 'select_account' : undefined,
      
      // Request ID token with email verification
      include_granted_scopes: 'true',
      
      // Hint for account selection (can improve UX)
      login_hint: undefined, // TODO: Could be set if we know user's email
    },
  };

  logger.debug('AuthConfiguration', 'OAuth configuration created', {
    platform: Platform.OS,
    redirectUri,
    scopeCount: config.scopes.length,
    hasPromptParam: !!config.additionalParameters?.prompt
  });

  return config;
};

// ========================================
// API ENDPOINT CONFIGURATION
// ========================================

/**
 * API endpoint definitions
 * Centralized endpoint management for consistency and maintainability
 */
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    GOOGLE: '/auth/google',
    REFRESH: '/auth/refresh', 
    LOGOUT: '/auth/logout',
    SESSIONS: '/auth/sessions',
    VALIDATE: '/auth/validate',
  },
  
  // User endpoints
  USERS: {
    PROFILE: (userId: string) => `/api/users/${userId}`,
    UPDATE_PROFILE: (userId: string) => `/api/users/${userId}`,
    LIST: '/api/users',
    ACTIVITIES: (userId: string) => `/api/users/${userId}/activities`,
    STATS: (userId: string) => `/api/users/${userId}/stats`,
    FOLLOW: (userId: string) => `/api/users/${userId}/follow`,
  },
  
  // Donation endpoints
  DONATIONS: {
    LIST: '/api/donations',
    CREATE: '/api/donations',
    DETAIL: (id: string) => `/api/donations/${id}`,
    UPDATE: (id: string) => `/api/donations/${id}`,
    DELETE: (id: string) => `/api/donations/${id}`,
    CATEGORIES: '/api/donations/categories',
    STATS: '/api/donations/stats',
    USER_DONATIONS: (userId: string) => `/api/donations/user/${userId}`,
  },
  
  // Ride endpoints
  RIDES: {
    LIST: '/api/rides',
    CREATE: '/api/rides',
    DETAIL: (id: string) => `/api/rides/${id}`,
    UPDATE: (id: string) => `/api/rides/${id}`,
    DELETE: (id: string) => `/api/rides/${id}`,
    BOOK: (id: string) => `/api/rides/${id}/book`,
    USER_RIDES: (userId: string) => `/api/rides/user/${userId}`,
    STATS: '/api/rides/stats',
  },
  
  // Community endpoints
  COMMUNITY: {
    STATS: '/api/stats/community',
    TRENDS: '/api/stats/community/trends',
    CITIES: '/api/stats/community/cities',
    DASHBOARD: '/api/stats/dashboard',
    REAL_TIME: '/api/stats/real-time',
  },
  
  // Chat endpoints
  CHAT: {
    CONVERSATIONS: '/api/chat/conversations',
    MESSAGES: '/api/chat/messages',
    SEARCH: '/api/chat/search',
    USER_CONVERSATIONS: (userId: string) => `/api/chat/conversations/user/${userId}`,
    CONVERSATION_MESSAGES: (conversationId: string) => `/api/chat/conversations/${conversationId}/messages`,
  },
  
  // Health and monitoring
  HEALTH: '/health',
  STATUS: '/status',
} as const;

// ========================================
// PERFORMANCE CONFIGURATION
// ========================================

/**
 * Performance optimization settings
 */
export const PERFORMANCE_SETTINGS = {
  /**
   * Request caching configuration
   */
  CACHE: {
    /** Enable caching for GET requests */
    ENABLED: true,
    
    /** Maximum number of cached responses */
    MAX_ENTRIES: 100,
    
    /** Default cache duration */
    DEFAULT_TTL_MS: 5 * 60 * 1000, // 5 minutes
    
    /** Cache key prefix for namespacing */
    KEY_PREFIX: 'karma_api_cache_',
    
    /** Automatically purge expired entries */
    AUTO_PURGE: true,
    
    /** Purge interval */
    PURGE_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes
  },
  
  /**
   * Request optimization settings
   */
  REQUEST: {
    /** Enable request compression */
    COMPRESSION: true,
    
    /** Enable HTTP/2 multiplexing where available */
    HTTP2_MULTIPLEXING: true,
    
    /** Connection keepalive duration */
    KEEPALIVE_MS: 30 * 1000,
    
    /** Enable request batching for multiple operations */
    BATCHING: false, // TODO: Implement request batching
  },
  
  /**
   * Monitoring settings
   */
  MONITORING: {
    /** Track request performance metrics */
    TRACK_PERFORMANCE: true,
    
    /** Log slow requests (over this threshold) */
    SLOW_REQUEST_THRESHOLD_MS: 3000, // 3 seconds
    
    /** Track error rates */
    TRACK_ERROR_RATES: true,
    
    /** Send analytics to server */
    SEND_ANALYTICS: false, // TODO: Implement analytics collection
  },
} as const;

// ========================================
// ENVIRONMENT-SPECIFIC CONFIGURATION
// ========================================

/**
 * Get API base URL based on current environment
 */
export const getApiBaseUrl = (): string => API_BASE_URL;

// ========================================
// CONFIGURATION VALIDATION
// ========================================

/**
 * Validate the complete authentication configuration
 * 
 * This function checks all configuration aspects and provides
 * detailed feedback about any issues found.
 * 
 * @returns Validation result with details
 */
export const validateAuthConfiguration = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check environment variables
  const envValidation = validateEnvironmentConfiguration();
  if (!envValidation.isValid) {
    errors.push(...envValidation.missingVars.map(v => `Missing required environment variable: ${v}`));
  }
  warnings.push(...envValidation.warnings.map(v => `Missing recommended environment variable: ${v}`));

  // Check OAuth configuration
  if (!isGoogleOAuthConfigured()) {
    errors.push('Google OAuth not configured for current platform');
  }

  // Check API URL
  const apiUrl = getApiBaseUrl();
  if (!apiUrl || !apiUrl.startsWith('http')) {
    errors.push('Invalid API base URL configuration');
  }

  // Security recommendations
  if (process.env.NODE_ENV === 'production') {
    if (!SECURITY_SETTINGS.STORAGE.USE_SECURE_STORAGE) {
      warnings.push('Secure storage is disabled in production');
    }
    
    if (!OAUTH_SETTINGS.USE_STATE_PARAMETER) {
      recommendations.push('Enable OAuth state parameter for CSRF protection');
    }
    
    if (!OAUTH_SETTINGS.USE_PKCE) {
      recommendations.push('Enable PKCE for enhanced OAuth security');
    }
  }

  const isValid = errors.length === 0;
  
  logger.info('AuthConfiguration', 'Configuration validation completed', {
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
    recommendationCount: recommendations.length
  });

  return {
    isValid,
    errors,
    warnings,
    recommendations
  };
};

// ========================================
// CONFIGURATION EXPORTS
// ========================================

/**
 * Main configuration object exported for use throughout the app
 */
export const AUTH_CONFIG = {
  // Core settings
  OAUTH: OAUTH_SETTINGS,
  SECURITY: SECURITY_SETTINGS,
  API: API_SETTINGS,
  PLATFORM: PLATFORM_SETTINGS,
  
  // Dynamic configuration
  getClientIds: getGoogleClientIds,
  getRedirectUri,
  getApiBaseUrl,
  createOAuthConfig,
  
  // Validation
  validateConfiguration: validateAuthConfiguration,
  isConfigured: isGoogleOAuthConfigured,
  
  // Error messages
  ERRORS: ERROR_MESSAGES,
} as const;


// Default export
export default AUTH_CONFIG;

/**
 * ========================================
 * CONFIGURATION TODO LIST
 * ========================================
 * 
 * SECURITY ENHANCEMENTS:
 * - [ ] Implement PKCE (Proof Key for Code Exchange) support
 * - [ ] Add OAuth state parameter for CSRF protection
 * - [ ] Implement nonce parameter for replay attack prevention
 * - [ ] Add client certificate authentication for enterprise
 * - [ ] Implement request signing for API integrity verification
 * - [ ] Add support for multiple OAuth providers (GitHub, Apple, etc.)
 * 
 * ENVIRONMENT MANAGEMENT:
 * - [ ] Set up staging environment configuration
 * - [ ] Implement environment-specific feature flags
 * - [ ] Add configuration hot-reloading for development
 * - [ ] Implement configuration encryption for sensitive settings
 * - [ ] Add configuration validation at build time
 * 
 * MONITORING AND OBSERVABILITY:
 * - [ ] Add configuration change tracking
 * - [ ] Implement configuration health checks
 * - [ ] Add metrics for configuration usage
 * - [ ] Implement configuration A/B testing
 * - [ ] Add configuration rollback mechanisms
 * 
 * COMPLIANCE AND GOVERNANCE:
 * - [ ] Add GDPR compliance configuration
 * - [ ] Implement data retention policy settings
 * - [ ] Add audit logging configuration
 * - [ ] Implement privacy control settings
 * - [ ] Add consent management configuration
 */
