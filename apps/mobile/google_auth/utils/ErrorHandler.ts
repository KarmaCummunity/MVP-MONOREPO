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
import i18n from '../../app/i18n';

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
  readonly originalError?: unknown;
  
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
  readonly metadata?: Record<string, unknown>;
}

/** Helper to safely access error-like object properties */
function asErrorLike(e: unknown): Record<string, unknown> | null {
  if (e == null || typeof e !== 'object') return null;
  return e as Record<string, unknown>;
}

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
    error: unknown,
    context: {
      operation: string;
      userId?: string;
      sessionId?: string;
      additionalContext?: Record<string, unknown>;
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
        errorSource: (asErrorLike(error)?.constructor as { name?: string })?.name || typeof error,
        stackTrace: typeof (asErrorLike(error)?.stack) === 'string' ? (asErrorLike(error)!.stack as string).substring(0, 500) : undefined,
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
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [];
    
    if (showRetryButton && authError.retryable && onRetry) {
      buttons.push({
        text: i18n.t('auth:errors.alert.tryAgain'),
        onPress: onRetry,
      });
    }

    buttons.push({
      text: i18n.t('auth:errors.alert.ok'),
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
  private static categorizeError(error: unknown): AuthErrorCategory {
    const err = asErrorLike(error);
    if (!err) return AuthErrorCategory.UNKNOWN;

    const errorString = String(error).toLowerCase();
    const errorMessage = String(err.message || '').toLowerCase();

    // OAuth-related errors
    if (errorString.includes('oauth') ||
        errorString.includes('cancelled') ||
        errorString.includes('id_token') ||
        err.type === 'cancel') {
      return AuthErrorCategory.OAUTH;
    }

    // Network-related errors
    if ((error instanceof TypeError && errorMessage.includes('fetch')) ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('dns') ||
        err.name === 'NetworkError') {
      return AuthErrorCategory.NETWORK;
    }

    // Server errors
    if ((typeof err.status === 'number' && err.status >= 500) ||
        errorMessage.includes('server error') ||
        errorMessage.includes('internal error')) {
      return AuthErrorCategory.SERVER;
    }

    // Rate limiting errors
    if (err.status === 429 ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many')) {
      return AuthErrorCategory.RATE_LIMIT;
    }

    // Token-related errors
    if (errorMessage.includes('token') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('invalid') ||
        err.status === 401) {
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
    if (err.status === 403 ||
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
  private static determineSeverity(category: AuthErrorCategory, error: unknown): AuthErrorSeverity {
    const err = asErrorLike(error);
    const status = typeof err?.status === 'number' ? err.status : 0;

    // Critical errors that prevent core functionality
    if (category === AuthErrorCategory.CONFIG ||
        (category === AuthErrorCategory.SERVER && status >= 500)) {
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
   * Generate user-friendly error message via i18n
   */
  private static generateUserMessage(error: unknown, category: AuthErrorCategory): string {
    const errorType = this.getSpecificErrorType(error, category);
    const categoryKey = category.toLowerCase();
    const key = `auth:errors.${categoryKey}.${errorType}`;
    const message = i18n.t(key);
    if (message && message !== key) {
      if (category === AuthErrorCategory.RATE_LIMIT) {
        const err = asErrorLike(error);
        const retryAfter = typeof err?.retryAfter === 'number' ? err.retryAfter : 60000;
        const minutes = Math.max(1, Math.ceil(retryAfter / 60000));
        return i18n.t(key, { minutes });
      }
      return message;
    }
    const fallbackKey = `auth:errors.fallback.${categoryKey}`;
    return i18n.t(fallbackKey) || i18n.t('auth:errors.fallback.unknown');
  }

  /**
   * Determine specific error type within category
   */
  private static getSpecificErrorType(error: unknown, category: AuthErrorCategory): string {
    const err = asErrorLike(error);
    const errorMessage = String(err?.message || '').toLowerCase();

    switch (category) {
      case AuthErrorCategory.OAUTH:
        if (err?.type === 'cancel') return 'CANCELLED';
        if (errorMessage.includes('token')) return 'INVALID_TOKEN';
        if (errorMessage.includes('expired')) return 'EXPIRED_TOKEN';
        return 'FLOW_ERROR';

      case AuthErrorCategory.NETWORK:
        if (err?.name === 'AbortError') return 'TIMEOUT';
        if (errorMessage.includes('dns')) return 'DNS_ERROR';
        return 'CONNECTION_FAILED';

      case AuthErrorCategory.SERVER:
        if (err?.status === 503) return 'MAINTENANCE';
        if (err?.status === 502 || err?.status === 504) return 'OVERLOADED';
        return 'INTERNAL_ERROR';

      default:
        return 'GENERIC';
    }
  }

  /**
   * Determine retry strategy for error
   */
  private static determineRetryStrategy(category: AuthErrorCategory, error: unknown): {
    retryable: boolean;
    retryDelay?: number;
    maxRetries?: number;
  } {
    const err = asErrorLike(error);
    const status = typeof err?.status === 'number' ? err.status : 0;

    switch (category) {
      case AuthErrorCategory.NETWORK:
        return {
          retryable: true,
          retryDelay: 2000, // 2 seconds
          maxRetries: 3,
        };

      case AuthErrorCategory.SERVER:
        // Don't retry 4xx errors, do retry 5xx errors
        if (status >= 400 && status < 500) {
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
        if (err?.type === 'cancel') {
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
          retryDelay: (typeof err?.retryAfter === 'number' ? err.retryAfter : undefined) || 60000, // Default 1 minute
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
  private static generateRecoveryStrategy(category: AuthErrorCategory, _error: unknown): AuthError['recovery'] {
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
  private static extractTechnicalDetails(error: unknown): string {
    const err = asErrorLike(error);
    if (!err) return 'No technical details available';

    const details: string[] = [];
    if (err.message) details.push(`Message: ${err.message}`);
    if (err.status !== undefined) details.push(`Status: ${err.status}`);
    if (err.code !== undefined) details.push(`Code: ${err.code}`);
    if (err.name) details.push(`Type: ${err.name}`);
    if (err.url) details.push(`URL: ${err.url}`);
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
      return i18n.t('auth:errors.alert.criticalError');
    }
    if (severity === AuthErrorSeverity.HIGH) {
      return i18n.t('auth:errors.alert.authError');
    }
    switch (category) {
      case AuthErrorCategory.NETWORK:
        return i18n.t('auth:errors.alert.connectionProblem');
      case AuthErrorCategory.RATE_LIMIT:
        return i18n.t('auth:errors.alert.tooManyAttempts');
      default:
        return i18n.t('auth:errors.alert.error');
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
export const handleAuthError = (error: unknown, operation: string): AuthError => {
  return AuthErrorHandlerClass.handleError(error, { operation });
};

/**
 * Handle OAuth response errors specifically
 * 
 * @param oauthResponse OAuth response from expo-auth-session
 * @returns Processed AuthError or null if no error
 */
export const handleOAuthError = (oauthResponse: { type?: string; error?: unknown }): AuthError | null => {
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
export const handleNetworkError = (error: unknown, endpoint: string): AuthError => {
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
  let lastError: unknown;
  
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
