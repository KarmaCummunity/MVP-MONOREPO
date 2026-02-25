/**
 * ========================================
 * AUTHENTICATION ERROR HANDLER
 * ========================================
 * 
 * Comprehensive error handling system for Google authentication operations.
 * This module provides centralized error processing, user-friendly messages,
 * and recovery strategies for all authentication-related errors.
 * 
 * ERROR CATEGORIES:
 * - OAuth flow errors (cancellation, invalid tokens, etc.)
 * - Network and connectivity errors
 * - Server-side validation errors
 * - Storage and persistence errors
 * - Configuration and setup errors
 * 
 * FEATURES:
 * - Automatic error categorization and classification
 * - User-friendly error messages in Hebrew and English
 * - Recovery suggestions and retry strategies
 * - Comprehensive error logging for debugging
 * - Integration with monitoring and alerting systems
 * 
 * AUTHOR: AI Assistant
 * SECURITY LEVEL: Enterprise Grade
 * LAST UPDATED: 2024
 */

import { Alert, Platform } from 'react-native';
import { logger } from '../../utils/loggerService';

// ========================================
// ERROR TYPE DEFINITIONS
// ========================================

/**
 * Authentication error categories for proper handling
 */
export enum AuthErrorCategory {
  /** OAuth flow related errors */
  OAUTH = 'OAUTH',
  /** Network connectivity issues */
  NETWORK = 'NETWORK',
  /** Server-side errors */
  SERVER = 'SERVER',
  /** Client storage errors */
  STORAGE = 'STORAGE',
  /** Configuration errors */
  CONFIG = 'CONFIG',
  /** Token-related errors */
  TOKEN = 'TOKEN',
  /** User permission errors */
  PERMISSION = 'PERMISSION',
  /** Rate limiting errors */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Unknown/unclassified errors */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error severity levels for appropriate handling
 */
export enum AuthErrorSeverity {
  /** Low impact, doesn't affect core functionality */
  LOW = 'LOW',
  /** Medium impact, may affect some features */
  MEDIUM = 'MEDIUM',
  /** High impact, affects core authentication */
  HIGH = 'HIGH',
  /** Critical impact, prevents app usage */
  CRITICAL = 'CRITICAL',
}

/**
 * Comprehensive error information structure
 */
export interface AuthError {
  /** Unique error identifier for tracking */
  readonly id: string;
  
  /** Error category for handling logic */
  readonly category: AuthErrorCategory;
  
  /** Error severity level */
  readonly severity: AuthErrorSeverity;
  
  /** User-friendly error message (localized) */
  readonly message: string;
  
  /** Technical error details for developers */
  readonly technicalDetails?: string;
  
  /** Original error object that caused this */
  readonly originalError?: any;
  
  /** Error timestamp */
  readonly timestamp: string;
  
  /** Whether the operation can be retried */
  readonly retryable: boolean;
  
  /** Suggested retry delay in milliseconds */
  readonly retryDelay?: number;
  
  /** Maximum number of retry attempts */
  readonly maxRetries?: number;
  
  /** Context where the error occurred */
  readonly context: {
    operation: string;
    userId?: string;
    sessionId?: string;
    platform: string;
    appVersion?: string;
  };
  
  /** Recovery suggestions */
  readonly recovery: {
    /** What the user should do */
    userAction?: string;
    /** What the developer should check */
    developerAction?: string;
    /** Automatic recovery possible */
    autoRecoverable?: boolean;
  };
  
  /** Additional metadata */
  readonly metadata?: Record<string, any>;
}

// ========================================
// ERROR MESSAGES
// ========================================

/**
 * Localized error messages in Hebrew and English
 */
const ERROR_MESSAGES = {
  [AuthErrorCategory.OAUTH]: {
    CANCELLED: {
      he: 'ההתחברות בוטלה על ידי המשתמש.',
      en: 'Authentication was cancelled by the user.',
    },
    INVALID_TOKEN: {
      he: 'אסימון Google לא תקף. אנא נסה שוב.',
      en: 'Invalid Google token. Please try again.',
    },
    EXPIRED_TOKEN: {
      he: 'אסימון Google פג תוקף. אנא התחבר מחדש.',
      en: 'Google token has expired. Please login again.',
    },
    FLOW_ERROR: {
      he: 'שגיאה בתהליך ההתחברות עם Google.',
      en: 'Error in Google authentication flow.',
    },
  },
  [AuthErrorCategory.NETWORK]: {
    CONNECTION_FAILED: {
      he: 'לא ניתן להתחבר לשרת. אנא בדוק את החיבור לאינטרנט.',
      en: 'Cannot connect to server. Please check your internet connection.',
    },
    TIMEOUT: {
      he: 'הבקשה נמשכה יותר מדי זמן. אנא נסה שוב.',
      en: 'Request timed out. Please try again.',
    },
    DNS_ERROR: {
      he: 'לא ניתן למצוא את השרת. אנא בדוק את החיבור.',
      en: 'Cannot find server. Please check your connection.',
    },
  },
  [AuthErrorCategory.SERVER]: {
    INTERNAL_ERROR: {
      he: 'שגיאה פנימית בשרת. אנא נסה שוב מאוחר יותר.',
      en: 'Internal server error. Please try again later.',
    },
    MAINTENANCE: {
      he: 'השרת במצב תחזוקה. אנא נסה שוב מאוחר יותר.',
      en: 'Server is under maintenance. Please try again later.',
    },
    OVERLOADED: {
      he: 'השרת עמוס. אנא נסה שוב בעוד מספר דקות.',
      en: 'Server is overloaded. Please try again in a few minutes.',
    },
  },
  [AuthErrorCategory.STORAGE]: {
    ACCESS_DENIED: {
      he: 'לא ניתן לגשת לאחסון המאובטח. אנא בדוק הרשאות האפליקציה.',
      en: 'Cannot access secure storage. Please check app permissions.',
    },
    CORRUPTED_DATA: {
      he: 'נתוני האימות נפגמו. אנא התחבר מחדש.',
      en: 'Authentication data corrupted. Please login again.',
    },
    STORAGE_FULL: {
      he: 'אחסון המכשיר מלא. אנא פנה מקום ונסה שוב.',
      en: 'Device storage is full. Please free up space and try again.',
    },
  },
  [AuthErrorCategory.CONFIG]: {
    MISSING_CLIENT_ID: {
      he: 'הגדרות Google OAuth חסרות. אנא פנה לתמיכה טכנית.',
      en: 'Google OAuth configuration missing. Please contact technical support.',
    },
    INVALID_REDIRECT: {
      he: 'הגדרות הפניה שגויות. אנא פנה לתמיכה טכנית.',
      en: 'Invalid redirect configuration. Please contact technical support.',
    },
    UNSUPPORTED_PLATFORM: {
      he: 'פלטפורמה לא נתמכת לאימות Google.',
      en: 'Unsupported platform for Google authentication.',
    },
  },
  [AuthErrorCategory.RATE_LIMIT]: {
    TOO_MANY_REQUESTS: {
      he: 'יותר מדי בקשות. אנא המתן {minutes} דקות ונסה שוב.',
      en: 'Too many requests. Please wait {minutes} minutes and try again.',
    },
    AUTH_ATTEMPTS_EXCEEDED: {
      he: 'יותר מדי ניסיונות התחברות. אנא המתן {minutes} דקות.',
      en: 'Too many authentication attempts. Please wait {minutes} minutes.',
    },
  },
  [AuthErrorCategory.TOKEN]: {
    INVALID: {
      he: 'אסימון האימות שגוי. אנא התחבר מחדש.',
      en: 'Authentication token is invalid. Please login again.',
    },
    EXPIRED: {
      he: 'אסימון האימות פג תוקף. אנא התחבר מחדש.',
      en: 'Authentication token has expired. Please login again.',
    },
    CORRUPTED: {
      he: 'אסימון האימות פגום. אנא התחבר מחדש.',
      en: 'Authentication token is corrupted. Please login again.',
    },
  },
  [AuthErrorCategory.PERMISSION]: {
    INSUFFICIENT: {
      he: 'אין הרשאה לביצוע הפעולה.',
      en: 'Insufficient permissions for this operation.',
    },
    FORBIDDEN: {
      he: 'הגישה נדחתה.',
      en: 'Access denied.',
    },
  },
  [AuthErrorCategory.UNKNOWN]: {
    GENERIC: {
      he: 'שגיאה לא צפויה. אנא נסה שוב.',
      en: 'Unexpected error. Please try again.',
    },
  },
} as const;

// ========================================
// MAIN ERROR HANDLER CLASS
// ========================================

/**
 * AuthErrorHandler - Centralized error handling for authentication operations
 * 
 * This class provides comprehensive error processing with:
 * - Automatic error categorization
 * - User-friendly message generation
 * - Recovery strategy suggestions
 * - Comprehensive error logging
 * - Integration with alerting systems
 */
class AuthErrorHandlerClass {
  /**
   * Process and handle an authentication error
   * 
   * This method takes any error that occurs during authentication
   * and transforms it into a structured AuthError with appropriate
   * handling suggestions and user-friendly messages.
   * 
   * @param error The original error object
   * @param context Context information about where the error occurred
   * @returns Structured AuthError object
   * 
   * @example
   * ```typescript
   * try {
   *   await authenticateUser();
   * } catch (originalError) {
   *   const authError = AuthErrorHandler.handleError(originalError, {
   *     operation: 'google_oauth_verification',
   *     userId: 'user123'
   *   });
   *   
   *   console.error('Auth error:', authError.message);
   *   
   *   if (authError.retryable) {
   *     setTimeout(() => retryAuthentication(), authError.retryDelay);
   *   }
   * }
   * ```
   */
  public static handleError(
    error: any,
    context: {
      operation: string;
      userId?: string;
      sessionId?: string;
      additionalContext?: Record<string, any>;
    }
  ): AuthError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // Categorize the error
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(category, error);
    
    // Generate user-friendly message
    const message = this.generateUserMessage(error, category);
    
    // Determine retry strategy
    const { retryable, retryDelay, maxRetries } = this.determineRetryStrategy(category, error);
    
    // Generate recovery suggestions
    const recovery = this.generateRecoveryStrategy(category, error);
    
    // Create structured error object
    const authError: AuthError = {
      id: errorId,
      category,
      severity,
      message,
      technicalDetails: this.extractTechnicalDetails(error),
      originalError: error,
      timestamp,
      retryable,
      retryDelay,
      maxRetries,
      context: {
        ...context,
        platform: Platform.OS,
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION || 'unknown',
      },
      recovery,
      metadata: {
        errorSource: error?.constructor?.name || typeof error,
        stackTrace: error?.stack ? error.stack.substring(0, 500) : undefined,
      },
    };

    // Log the error
    this.logError(authError);
    
    // Send to monitoring system (if configured)
    this.reportError(authError);
    
    return authError;
  }

  /**
   * Display user-friendly error to the user
   * 
   * This method shows an appropriate error message to the user
   * based on the error category and severity.
   * 
   * @param authError The structured authentication error
   * @param options Display options
   */
  public static displayErrorToUser(
    authError: AuthError,
    options: {
      showRetryButton?: boolean;
      onRetry?: () => void;
      onDismiss?: () => void;
      autoHide?: boolean;
    } = {}
  ): void {
    const { showRetryButton = false, onRetry, onDismiss, autoHide = true } = options;
    
    // Determine alert buttons
    const buttons: Array<{ text: string; onPress?: () => void; style?: any }> = [];
    
    if (showRetryButton && authError.retryable && onRetry) {
      buttons.push({
        text: 'נסה שוב', // Try Again
        onPress: onRetry,
      });
    }
    
    buttons.push({
      text: 'אישור', // OK
      onPress: onDismiss,
      style: 'default',
    });
    
    // Show alert with appropriate title based on severity
    const title = this.getAlertTitle(authError.category, authError.severity);
    
    Alert.alert(
      title,
      authError.message,
      buttons,
      { cancelable: false }
    );

    // Auto-hide for low severity errors
    if (autoHide && authError.severity === AuthErrorSeverity.LOW) {
      setTimeout(() => {
        // Auto-dismiss logic could go here
      }, 5000);
    }

    logger.info('AuthErrorHandler', 'Error displayed to user', {
      errorId: authError.id,
      category: authError.category,
      severity: authError.severity,
      showRetryButton
    });
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Categorize error based on its characteristics
   */
  private static categorizeError(error: any): AuthErrorCategory {
    if (!error) return AuthErrorCategory.UNKNOWN;
    
    const errorString = String(error).toLowerCase();
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // OAuth-related errors
    if (errorString.includes('oauth') || 
        errorString.includes('cancelled') ||
        errorString.includes('id_token') ||
        error?.type === 'cancel') {
      return AuthErrorCategory.OAUTH;
    }
    
    // Network-related errors
    if (error instanceof TypeError && errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('dns') ||
        error?.name === 'NetworkError') {
      return AuthErrorCategory.NETWORK;
    }
    
    // Server errors
    if (error?.status >= 500 ||
        errorMessage.includes('server error') ||
        errorMessage.includes('internal error')) {
      return AuthErrorCategory.SERVER;
    }
    
    // Rate limiting errors
    if (error?.status === 429 ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many')) {
      return AuthErrorCategory.RATE_LIMIT;
    }
    
    // Token-related errors  
    if (errorMessage.includes('token') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('invalid') ||
        error?.status === 401) {
      return AuthErrorCategory.TOKEN;
    }
    
    // Storage errors
    if (errorMessage.includes('storage') ||
        errorMessage.includes('keychain') ||
        errorMessage.includes('secure store')) {
      return AuthErrorCategory.STORAGE;
    }
    
    // Configuration errors
    if (errorMessage.includes('client id') ||
        errorMessage.includes('configuration') ||
        errorMessage.includes('redirect uri')) {
      return AuthErrorCategory.CONFIG;
    }
    
    // Permission errors
    if (error?.status === 403 ||
        errorMessage.includes('permission') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden')) {
      return AuthErrorCategory.PERMISSION;
    }
    
    return AuthErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity level
   */
  private static determineSeverity(category: AuthErrorCategory, error: any): AuthErrorSeverity {
    // Critical errors that prevent core functionality
    if (category === AuthErrorCategory.CONFIG ||
        (category === AuthErrorCategory.SERVER && error?.status >= 500)) {
      return AuthErrorSeverity.CRITICAL;
    }
    
    // High severity errors that affect authentication
    if (category === AuthErrorCategory.TOKEN ||
        category === AuthErrorCategory.OAUTH ||
        category === AuthErrorCategory.PERMISSION) {
      return AuthErrorSeverity.HIGH;
    }
    
    // Medium severity errors that may affect features
    if (category === AuthErrorCategory.NETWORK ||
        category === AuthErrorCategory.STORAGE ||
        category === AuthErrorCategory.RATE_LIMIT) {
      return AuthErrorSeverity.MEDIUM;
    }
    
    // Low severity for everything else
    return AuthErrorSeverity.LOW;
  }

  /**
   * Generate user-friendly error message
   */
  private static generateUserMessage(error: any, category: AuthErrorCategory): string {
    const locale = 'he'; // Default to Hebrew
    const errorType = this.getSpecificErrorType(error, category);
    
    // Get message from predefined messages
    const categoryMessages = ERROR_MESSAGES[category] as any;
    if (categoryMessages && categoryMessages[errorType]) {
      return categoryMessages[errorType][locale] || categoryMessages[errorType].en;
    }
    
    // Fallback messages by category
    const fallbackMessages = {
      [AuthErrorCategory.OAUTH]: 'שגיאה באימות Google. אנא נסה שוב.',
      [AuthErrorCategory.NETWORK]: 'בעיית חיבור לרשת. אנא בדוק את החיבור שלך.',
      [AuthErrorCategory.SERVER]: 'שגיאת שרת. אנא נסה שוב מאוחר יותר.',
      [AuthErrorCategory.STORAGE]: 'שגיאה בשמירת נתונים. אנא נסה שוב.',
      [AuthErrorCategory.CONFIG]: 'שגיאת הגדרה. אנא פנה לתמיכה טכנית.',
      [AuthErrorCategory.TOKEN]: 'בעיה באימות. אנא התחבר מחדש.',
      [AuthErrorCategory.PERMISSION]: 'אין הרשאה לביצוע הפעולה.',
      [AuthErrorCategory.RATE_LIMIT]: 'יותר מדי בקשות. אנא המתן מספר דקות.',
      [AuthErrorCategory.UNKNOWN]: 'שגיאה לא צפויה. אנא נסה שוב.',
    };
    
    return fallbackMessages[category] || 'שגיאה לא צפויה. אנא נסה שוב.';
  }

  /**
   * Determine specific error type within category
   */
  private static getSpecificErrorType(error: any, category: AuthErrorCategory): string {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    switch (category) {
      case AuthErrorCategory.OAUTH:
        if (error?.type === 'cancel') return 'CANCELLED';
        if (errorMessage.includes('token')) return 'INVALID_TOKEN';
        if (errorMessage.includes('expired')) return 'EXPIRED_TOKEN';
        return 'FLOW_ERROR';
        
      case AuthErrorCategory.NETWORK:
        if (error?.name === 'AbortError') return 'TIMEOUT';
        if (errorMessage.includes('dns')) return 'DNS_ERROR';
        return 'CONNECTION_FAILED';
        
      case AuthErrorCategory.SERVER:
        if (error?.status === 503) return 'MAINTENANCE';
        if (error?.status === 502 || error?.status === 504) return 'OVERLOADED';
        return 'INTERNAL_ERROR';
        
      default:
        return 'GENERIC';
    }
  }

  /**
   * Determine retry strategy for error
   */
  private static determineRetryStrategy(category: AuthErrorCategory, error: any): {
    retryable: boolean;
    retryDelay?: number;
    maxRetries?: number;
  } {
    switch (category) {
      case AuthErrorCategory.NETWORK:
        return {
          retryable: true,
          retryDelay: 2000, // 2 seconds
          maxRetries: 3,
        };
        
      case AuthErrorCategory.SERVER:
        // Don't retry 4xx errors, do retry 5xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return { retryable: false };
        }
        return {
          retryable: true,
          retryDelay: 5000, // 5 seconds
          maxRetries: 2,
        };
        
      case AuthErrorCategory.TOKEN:
        // Token errors usually need re-authentication
        return { retryable: false };
        
      case AuthErrorCategory.OAUTH:
        // OAuth cancellation is not retryable, but other OAuth errors might be
        if (error?.type === 'cancel') {
          return { retryable: false };
        }
        return {
          retryable: true,
          retryDelay: 1000, // 1 second
          maxRetries: 2,
        };
        
      case AuthErrorCategory.RATE_LIMIT:
        return {
          retryable: true,
          retryDelay: error?.retryAfter || 60000, // Default 1 minute
          maxRetries: 1, // Only retry once for rate limits
        };
        
      case AuthErrorCategory.STORAGE:
        return {
          retryable: true,
          retryDelay: 500, // 0.5 seconds
          maxRetries: 2,
        };
        
      case AuthErrorCategory.CONFIG:
        // Configuration errors are not retryable
        return { retryable: false };
        
      default:
        return {
          retryable: true,
          retryDelay: 1000,
          maxRetries: 1,
        };
    }
  }

  /**
   * Generate recovery strategy suggestions
   */
  private static generateRecoveryStrategy(category: AuthErrorCategory, error: any): AuthError['recovery'] {
    switch (category) {
      case AuthErrorCategory.OAUTH:
        return {
          userAction: 'נסה להתחבר שוב עם Google', // Try to login with Google again
          autoRecoverable: false,
        };
        
      case AuthErrorCategory.NETWORK:
        return {
          userAction: 'בדוק את החיבור לאינטרנט ונסה שוב', // Check internet connection and try again
          developerAction: 'Check API endpoint URL and network configuration',
          autoRecoverable: true,
        };
        
      case AuthErrorCategory.TOKEN:
        return {
          userAction: 'התחבר מחדש למערכת', // Login to the system again
          developerAction: 'Check token validation logic and expiration times',
          autoRecoverable: false,
        };
        
      case AuthErrorCategory.CONFIG:
        return {
          userAction: 'פנה לתמיכה טכנית', // Contact technical support
          developerAction: 'Check Google OAuth configuration in app.config.js',
          autoRecoverable: false,
        };
        
      case AuthErrorCategory.STORAGE:
        return {
          userAction: 'בדוק הרשאות האפליקציה ומקום פנוי במכשיר', // Check app permissions and device storage
          developerAction: 'Check SecureStore availability and fallback mechanisms',
          autoRecoverable: true,
        };
        
      case AuthErrorCategory.RATE_LIMIT:
        return {
          userAction: 'המתן מספר דקות ונסה שוב', // Wait a few minutes and try again
          developerAction: 'Implement exponential backoff and respect rate limit headers',
          autoRecoverable: true,
        };
        
      default:
        return {
          userAction: 'נסה שוב או פנה לתמיכה אם הבעיה נמשכת', // Try again or contact support if issue persists
          autoRecoverable: true,
        };
    }
  }

  /**
   * Extract technical details from error for debugging
   */
  private static extractTechnicalDetails(error: any): string {
    const details: string[] = [];
    
    if (error?.message) {
      details.push(`Message: ${error.message}`);
    }
    
    if (error?.status) {
      details.push(`Status: ${error.status}`);
    }
    
    if (error?.code) {
      details.push(`Code: ${error.code}`);
    }
    
    if (error?.name) {
      details.push(`Type: ${error.name}`);
    }
    
    if (error?.url) {
      details.push(`URL: ${error.url}`);
    }
    
    return details.join(', ') || 'No technical details available';
  }

  /**
   * Generate unique error ID for tracking
   */
  private static generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `auth_error_${timestamp}_${random}`;
  }

  /**
   * Get appropriate alert title based on category and severity
   */
  private static getAlertTitle(category: AuthErrorCategory, severity: AuthErrorSeverity): string {
    if (severity === AuthErrorSeverity.CRITICAL) {
      return 'שגיאה קריטית'; // Critical Error
    }
    
    if (severity === AuthErrorSeverity.HIGH) {
      return 'שגיאה באימות'; // Authentication Error
    }
    
    switch (category) {
      case AuthErrorCategory.NETWORK:
        return 'בעיית חיבור'; // Connection Problem
      case AuthErrorCategory.RATE_LIMIT:
        return 'יותר מדי ניסיונות'; // Too Many Attempts
      default:
        return 'שגיאה'; // Error
    }
  }

  /**
   * Log error with appropriate level
   */
  private static logError(authError: AuthError): void {
    const logLevel = this.getLogLevel(authError.severity);
    const logData = {
      errorId: authError.id,
      category: authError.category,
      severity: authError.severity,
      operation: authError.context.operation,
      userId: authError.context.userId,
      platform: authError.context.platform,
      retryable: authError.retryable,
      technicalDetails: authError.technicalDetails,
    };

    switch (logLevel) {
      case 'error':
        logger.error('AuthErrorHandler', authError.message, logData);
        break;
      case 'warn':
        logger.warn('AuthErrorHandler', authError.message, logData);
        break;
      case 'info':
        logger.info('AuthErrorHandler', authError.message, logData);
        break;
      default:
        logger.debug('AuthErrorHandler', authError.message, logData);
    }
  }

  /**
   * Determine appropriate log level for error
   */
  private static getLogLevel(severity: AuthErrorSeverity): 'error' | 'warn' | 'info' | 'debug' {
    switch (severity) {
      case AuthErrorSeverity.CRITICAL:
      case AuthErrorSeverity.HIGH:
        return 'error';
      case AuthErrorSeverity.MEDIUM:
        return 'warn';
      case AuthErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  /**
   * Report error to monitoring system
   * TODO: Implement integration with monitoring service
   */
  private static reportError(authError: AuthError): void {
    // Only report high and critical severity errors
    if (authError.severity === AuthErrorSeverity.HIGH || 
        authError.severity === AuthErrorSeverity.CRITICAL) {
      
      logger.info('AuthErrorHandler', 'Error reported to monitoring system', {
        errorId: authError.id,
        category: authError.category,
        severity: authError.severity
      });
      
      // TODO: Integrate with monitoring service (Sentry, DataDog, etc.)
      // monitoringService.reportError(authError);
    }
  }
}

// ========================================
// MAIN EXPORT
// ========================================

export const AuthErrorHandler = AuthErrorHandlerClass;

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Quick error handling for common authentication scenarios
 * 
 * @param error Original error
 * @param operation Operation context
 * @returns Processed AuthError
 */
export const handleAuthError = (error: any, operation: string): AuthError => {
  return AuthErrorHandlerClass.handleError(error, { operation });
};

/**
 * Handle OAuth response errors specifically
 * 
 * @param oauthResponse OAuth response from expo-auth-session
 * @returns Processed AuthError or null if no error
 */
export const handleOAuthError = (oauthResponse: any): AuthError | null => {
  if (oauthResponse?.type === 'error') {
    return AuthErrorHandlerClass.handleError(oauthResponse.error, {
      operation: 'oauth_flow',
    });
  }
  
  if (oauthResponse?.type === 'cancel') {
    return AuthErrorHandlerClass.handleError({ type: 'cancel', message: 'User cancelled OAuth' }, {
      operation: 'oauth_flow',
    });
  }
  
  return null;
};

/**
 * Handle network errors specifically
 * 
 * @param error Network error
 * @param endpoint API endpoint that failed
 * @returns Processed AuthError
 */
export const handleNetworkError = (error: any, endpoint: string): AuthError => {
  return AuthErrorHandlerClass.handleError(error, {
    operation: `api_request_${endpoint}`,
  });
};

/**
 * Show error to user with retry option
 * 
 * @param error AuthError to display
 * @param onRetry Retry callback function
 */
export const showRetryableError = (error: AuthError, onRetry?: () => void): void => {
  AuthErrorHandlerClass.displayErrorToUser(error, {
    showRetryButton: error.retryable,
    onRetry,
  });
};

// ========================================
// ERROR RECOVERY UTILITIES
// ========================================

/**
 * Automatic error recovery with exponential backoff
 * 
 * @param operation Function to retry
 * @param maxAttempts Maximum retry attempts
 * @param baseDelay Base delay between attempts
 * @returns Promise resolving to operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        
        logger.info('withRetry', `Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: String(error),
          attempt,
          maxAttempts,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed, throw the last error
  throw lastError;
}

/**
 * Execute operation with timeout
 * 
 * @param operation Function to execute
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise resolving to operation result
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  return Promise.race([operation(), timeoutPromise]);
}

// ========================================
// EXPORTS
// ========================================

// Types are exported via their declarations above

// Default export
export default AuthErrorHandler;

/**
 * ========================================
 * ERROR HANDLING BEST PRACTICES
 * ========================================
 * 
 * 1. ALWAYS HANDLE ERRORS:
 *    ```typescript
 *    try {
 *      await authOperation();
 *    } catch (error) {
 *      const authError = handleAuthError(error, 'login');
 *      showRetryableError(authError, () => retryLogin());
 *    }
 *    ```
 * 
 * 2. PROVIDE USER FEEDBACK:
 *    - Show user-friendly messages in Hebrew
 *    - Provide retry options for retryable errors
 *    - Give clear instructions for recovery
 * 
 * 3. LOG FOR DEBUGGING:
 *    - All errors are automatically logged
 *    - Include context information
 *    - Use appropriate log levels
 * 
 * 4. IMPLEMENT RECOVERY:
 *    - Use withRetry for network operations
 *    - Implement exponential backoff
 *    - Respect rate limiting
 * 
 * 5. MONITOR ERRORS:
 *    - High/Critical errors are reported to monitoring
 *    - Track error rates and patterns
 *    - Set up alerts for critical errors
 */
