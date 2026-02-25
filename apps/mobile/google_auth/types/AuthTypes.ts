/**
 * ========================================
 * AUTHENTICATION TYPE DEFINITIONS
 * ========================================
 * 
 * Comprehensive TypeScript type definitions for the Google Authentication System.
 * These types ensure type safety throughout the authentication flow and provide
 * clear interfaces for all authentication-related operations.
 * 
 * TYPE CATEGORIES:
 * - Core authentication types (users, tokens, sessions)
 * - OAuth flow types (requests, responses, states)
 * - Security types (permissions, roles, policies)
 * - Error types (categorized error handling)
 * - Event types (authentication state changes)
 * 
 * DESIGN PRINCIPLES:
 * - Strict typing for security-critical operations
 * - Extensible interfaces for future enhancements
 * - Clear documentation for each type
 * - Consistent naming conventions
 * - Backward compatibility considerations
 * 
 * AUTHOR: AI Assistant
 * LAST UPDATED: 2024
 */

// ========================================
// CORE AUTHENTICATION TYPES
// ========================================

/**
 * Unique identifier for users across the system
 * Uses Google's 'sub' claim as the stable identifier
 */
export type UserId = string;

/**
 * Email address (normalized to lowercase)
 * Always verified when coming from Google OAuth
 */
export type VerifiedEmail = string;

/**
 * Authentication state of the current session
 * Used for UI updates and flow control
 */
export type AuthState = 
  | 'initializing'    // Service is starting up and checking stored credentials
  | 'unauthenticated' // No valid authentication found, user needs to log in
  | 'authenticating'  // OAuth flow in progress with Google
  | 'verifying'       // Server is verifying the OAuth token
  | 'authenticated'   // User is successfully authenticated with valid tokens
  | 'refreshing'      // Access token is being refreshed using refresh token
  | 'error'           // Authentication error occurred, user intervention needed
  | 'expired'         // Session has expired and needs re-authentication
  | 'logout';         // User is being logged out, clearing session data

/**
 * User roles for authorization and access control
 * Extensible system for role-based permissions
 */
export type UserRole = 
  | 'user'           // Regular app user with basic permissions
  | 'premium'        // Premium user with enhanced features
  | 'org_admin'      // Organization administrator  
  | 'moderator'      // Content moderator
  | 'volunteer'      // Volunteer in the organization hierarchy
  | 'admin'          // System administrator
  | 'super_admin';   // Super administrator with all permissions

/**
 * Authentication mode for different user types
 * Determines app behavior and available features
 */
export type AuthMode = 
  | 'guest'    // Guest mode with limited functionality
  | 'demo'     // Demo mode with sample data
  | 'real';    // Real authenticated user

// ========================================
// USER DATA TYPES
// ========================================

/**
 * Core user profile information verified by Google
 * This data is trusted because it's verified by the server
 */
export interface VerifiedUserProfile {
  /** Unique Google user identifier (stable across sessions) */
  readonly id: UserId;
  
  /** User's full name from Google profile */
  readonly name: string;
  
  /** Verified email address from Google */
  readonly email: VerifiedEmail;
  
  /** User's profile picture URL from Google */
  readonly avatar: string;
  
  /** Whether the email is verified by Google */
  readonly emailVerified: boolean;
  
  /** When the user first joined our system */
  readonly joinedAt: string; // ISO 8601 timestamp
  
  /** Last time the user was active */
  lastActiveAt: string; // ISO 8601 timestamp
  
  /** User's locale/language preference */
  locale: string; // e.g., 'he-IL', 'en-US'
  
  /** User's timezone */
  timezone?: string; // e.g., 'Asia/Jerusalem'
}

/**
 * Extended user profile with app-specific data
 * Combines Google profile with our app's user data
 */
export interface SecureAuthUser extends VerifiedUserProfile {
  /** User's assigned roles in the system */
  roles: UserRole[];
  
  /** User's app preferences and settings */
  settings: UserSettings;
  
  /** User's public profile information */
  publicProfile: PublicUserProfile;
  
  /** User's privacy and security settings */
  privacy: PrivacySettings;
  
  /** User's notification preferences */
  notifications: NotificationSettings;
  
  /** Server-side metadata */
  metadata: UserMetadata;
}

/**
 * User preferences and application settings
 */
export interface UserSettings {
  /** Preferred language/locale */
  language: string;
  
  /** Dark mode preference */
  darkMode: boolean;
  
  /** Notification preferences */
  notificationsEnabled: boolean;
  
  /** Accessibility preferences */
  accessibility?: {
    largeText?: boolean;
    highContrast?: boolean;
    voiceOver?: boolean;
  };
  
  /** Map and location preferences */
  location?: {
    shareLocation?: boolean;
    defaultCity?: string;
    searchRadius?: number; // in kilometers
  };
  
  /** App behavior preferences */
  behavior?: {
    autoRefresh?: boolean;
    showTutorials?: boolean;
    compactMode?: boolean;
  };
}

/**
 * Public user profile information
 * Safe to display to other users
 */
export interface PublicUserProfile {
  /** User's display name */
  displayName: string;
  
  /** User's bio/description */
  bio?: string;
  
  /** User's location (if shared) */
  location?: {
    city?: string;
    country?: string;
  };
  
  /** User's interests/tags */
  interests: string[];
  
  /** Public statistics */
  stats: {
    karmaPoints: number;
    postsCount: number;
    donationsCount: number;
    volunteeredHours: number;
  };
  
  /** Social connections */
  social: {
    followersCount: number;
    followingCount: number;
  };
}

/**
 * User privacy and security settings
 */
export interface PrivacySettings {
  /** Profile visibility level */
  profileVisibility: 'public' | 'friends' | 'private';
  
  /** Location sharing preferences */
  shareLocation: boolean;
  
  /** Contact information visibility */
  showEmail: boolean;
  showPhone: boolean;
  
  /** Activity visibility */
  showActivity: boolean;
  
  /** Search engine indexing */
  allowIndexing: boolean;
  
  /** Data retention preferences */
  dataRetention: {
    deleteInactiveDays?: number;
    exportOnRequest: boolean;
  };
}

/**
 * Notification preferences
 */
export interface NotificationSettings {
  /** Push notifications enabled */
  push: boolean;
  
  /** Email notifications enabled */
  email: boolean;
  
  /** SMS notifications enabled */  
  sms: boolean;
  
  /** Notification types */
  types: {
    newMessages: boolean;
    donations: boolean;
    rides: boolean;
    socialUpdates: boolean;
    systemAlerts: boolean;
  };
  
  /** Quiet hours */
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone: string;
  };
}

/**
 * Server-side user metadata
 * Not directly modifiable by the client
 */
export interface UserMetadata {
  /** When the user account was created */
  readonly createdAt: string;
  
  /** Last time the user data was updated */
  readonly updatedAt: string;
  
  /** Last successful login timestamp */
  readonly lastLoginAt?: string;
  
  /** Total number of logins */
  readonly loginCount: number;
  
  /** Account verification status */
  readonly verified: boolean;
  
  /** Account status */
  readonly status: 'active' | 'suspended' | 'pending' | 'deleted';
  
  /** Security flags */
  readonly security: {
    twoFactorEnabled: boolean;
    suspiciousActivityDetected: boolean;
    passwordLastChanged?: string;
  };
  
  /** Usage statistics */
  readonly usage: {
    totalSessions: number;
    averageSessionDuration: number; // in minutes
    lastActiveFeatures: string[];
  };
}

// ========================================
// TOKEN AND SESSION TYPES
// ========================================

/**
 * JWT token pair received from authentication server
 * Both tokens are cryptographically signed and cannot be forged
 */
export interface AuthTokens {
  /** JWT access token for API requests (short-lived) */
  readonly accessToken: string;
  
  /** JWT refresh token for obtaining new access tokens (long-lived) */
  readonly refreshToken: string;
  
  /** Access token expiration time in seconds from now */
  readonly expiresIn: number;
  
  /** Refresh token expiration time in seconds from now */
  readonly refreshExpiresIn: number;
  
  /** Token type (always 'Bearer') */
  readonly tokenType: 'Bearer';
  
  /** Server-assigned session identifier */
  readonly sessionId?: string;
  
  /** Token issuance timestamp */
  readonly issuedAt: number; // Unix timestamp
}

/**
 * JWT token payload structure
 * Decoded from access/refresh tokens for validation
 */
export interface JwtTokenPayload {
  /** User identifier */
  userId: UserId;
  
  /** User email address */
  email: VerifiedEmail;
  
  /** Session identifier */
  sessionId: string;
  
  /** User roles */
  roles: UserRole[];
  
  /** Token issued at (Unix timestamp) */
  iat: number;
  
  /** Token expires at (Unix timestamp) */
  exp: number;
  
  /** Token issuer (our auth server) */
  iss: string;
  
  /** Token audience (our app) */
  aud: string;
  
  /** Token type */
  type: 'access' | 'refresh';
  
  /** Token subject (user ID) */
  sub: UserId;
}

/**
 * Session information for monitoring and security
 */
export interface UserSession {
  /** Unique session identifier */
  readonly sessionId: string;
  
  /** User this session belongs to */
  readonly userId: UserId;
  
  /** When the session was created */
  readonly createdAt: string;
  
  /** When the session expires */
  readonly expiresAt: string;
  
  /** Last activity timestamp */
  lastActivityAt: string;
  
  /** Session metadata */
  metadata: SessionMetadata;
  
  /** Whether the session is currently active */
  readonly isActive: boolean;
  
  /** Session device information */
  device: DeviceInfo;
}

/**
 * Session metadata for security tracking
 */
export interface SessionMetadata {
  /** IP address when session was created */
  readonly ipAddress: string;
  
  /** User agent string */
  readonly userAgent: string;
  
  /** Geographic location (if available) */
  readonly location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  
  /** Authentication method used */
  readonly authMethod: 'google_oauth';
  
  /** Session security level */
  readonly securityLevel: 'standard' | 'high' | 'critical';
}

/**
 * Device information for security monitoring
 */
export interface DeviceInfo {
  /** Platform (iOS, Android, Web) */
  readonly platform: string;
  
  /** Device model/browser */
  readonly model?: string;
  
  /** OS version */
  readonly osVersion?: string;
  
  /** App version */
  readonly appVersion?: string;
  
  /** Device identifier (hashed for privacy) */
  readonly deviceId?: string;
  
  /** Whether the device is trusted */
  isTrusted: boolean;
  
  /** Device capabilities */
  capabilities: {
    hasSecureStorage: boolean;
    hasBiometrics: boolean;
    hasScreenLock: boolean;
  };
}

// ========================================
// OAUTH FLOW TYPES
// ========================================

/**
 * Google OAuth configuration
 * Used to configure the expo-auth-session OAuth flow
 */
export interface GoogleOAuthConfig {
  /** iOS client ID from Google Cloud Console */
  iosClientId?: string;
  
  /** Android client ID from Google Cloud Console */
  androidClientId?: string;
  
  /** Web client ID from Google Cloud Console */
  webClientId?: string;
  
  /** OAuth scopes to request */
  scopes: string[];
  
  /** OAuth response type */
  responseType: 'id_token' | 'code';
  
  /** Redirect URI for OAuth callback */
  redirectUri: string;
  
  /** Additional OAuth parameters */
  additionalParameters?: {
    prompt?: 'none' | 'consent' | 'select_account';
    include_granted_scopes?: string;
    state?: string;
    nonce?: string;
    login_hint?: string;
  };
  
  /** PKCE parameters (when implemented) */
  pkce?: {
    codeChallenge: string;
    codeChallengeMethod: 'S256';
  };
}

/**
 * OAuth response from Google
 * Structure returned by expo-auth-session
 */
export interface OAuthResponse {
  /** Response type */
  type: 'success' | 'error' | 'cancel' | 'dismiss';
  
  /** OAuth parameters */
  params?: {
    id_token?: string;
    access_token?: string;
    state?: string;
    error?: string;
    error_description?: string;
  };
  
  /** Error information (if type is 'error') */
  error?: {
    code: string;
    description?: string;
    message?: string;
  };
  
  /** Authentication object (alternative format) */
  authentication?: {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  
  /** Full callback URL */
  url?: string;
}

/**
 * Google JWT ID token payload
 * Structure of the decoded Google ID token
 */
export interface GoogleIdTokenPayload {
  /** Token issuer (always https://accounts.google.com) */
  readonly iss: 'https://accounts.google.com';
  
  /** Authorized presenter (our client ID) */
  readonly azp: string;
  
  /** Audience (our client ID) */
  readonly aud: string;
  
  /** Subject - Google user identifier */
  readonly sub: string;
  
  /** User's email address */
  readonly email: string;
  
  /** Whether email is verified by Google */
  readonly email_verified: boolean;
  
  /** Token issued at timestamp */
  readonly iat: number;
  
  /** Token expires at timestamp */
  readonly exp: number;
  
  /** User's full name */
  readonly name?: string;
  
  /** User's given name (first name) */
  readonly given_name?: string;
  
  /** User's family name (last name) */
  readonly family_name?: string;
  
  /** User's profile picture URL */
  readonly picture?: string;
  
  /** User's locale */
  readonly locale?: string;
  
  /** Nonce for replay protection (when implemented) */
  readonly nonce?: string;
  
  /** Not before timestamp */
  readonly nbf?: number;
  
  /** JWT ID */
  readonly jti?: string;
}

// ========================================
// API RESPONSE TYPES
// ========================================

/**
 * Standard API response wrapper
 * Consistent response format across all API endpoints
 */
export interface ApiResponse<TData = any> {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Response data (only present if success is true) */
  data?: TData;
  
  /** Error message (only present if success is false) */
  error?: string;
  
  /** Additional message or context */
  message?: string;
  
  /** Response metadata */
  metadata?: ResponseMetadata;
}

/**
 * Response metadata for debugging and monitoring
 */
export interface ResponseMetadata {
  /** Unique request identifier */
  requestId?: string;
  
  /** Response timestamp */
  timestamp: string;
  
  /** Request duration in milliseconds */
  duration?: number;
  
  /** Whether response was served from cache */
  cached?: boolean;
  
  /** API version that handled the request */
  apiVersion?: string;
  
  /** Rate limiting information */
  rateLimitInfo?: {
    remaining: number;
    resetTime: number;
    limit: number;
  };
}

/**
 * Authentication response from server OAuth verification
 */
export interface AuthenticationResponse extends ApiResponse<{
  tokens: AuthTokens;
  user: SecureAuthUser;
}> {
  /** Additional authentication metadata */
  metadata?: ResponseMetadata & {
    /** Whether this is a new user registration */
    isNewUser?: boolean;
    
    /** Authentication method used */
    authMethod: 'google_oauth';
    
    /** Security warnings (if any) */
    securityWarnings?: string[];
  };
}

// ========================================
// ERROR TYPES
// ========================================

/**
 * Categories of authentication errors
 * Used for appropriate error handling and user feedback
 */
export type AuthErrorType = 
  | 'CONFIGURATION_ERROR'    // Missing or invalid configuration
  | 'NETWORK_ERROR'          // Network connectivity issues
  | 'OAUTH_ERROR'            // OAuth flow failures  
  | 'TOKEN_ERROR'            // Token validation/parsing errors
  | 'SERVER_ERROR'           // Backend server errors
  | 'STORAGE_ERROR'          // Local storage access errors
  | 'VALIDATION_ERROR'       // Input validation errors
  | 'PERMISSION_ERROR'       // Insufficient permissions
  | 'RATE_LIMIT_ERROR'       // Rate limiting triggered
  | 'TIMEOUT_ERROR'          // Request timeout
  | 'UNKNOWN_ERROR';         // Unclassified errors

/**
 * Detailed authentication error information
 */
export interface AuthError {
  /** Error category */
  type: AuthErrorType;
  
  /** User-friendly error message (localized) */
  message: string;
  
  /** Technical error details for debugging */
  details?: string;
  
  /** HTTP status code (if applicable) */
  statusCode?: number;
  
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** Suggested retry delay in milliseconds */
  retryAfter?: number;
  
  /** Error timestamp */
  timestamp: string;
  
  /** Context where the error occurred */
  context?: {
    operation: string;
    userId?: string;
    sessionId?: string;
  };
  
  /** Recovery suggestions */
  recovery?: {
    userAction?: string; // What the user should do
    developerAction?: string; // What the developer should check
  };
}

// ========================================
// EVENT TYPES
// ========================================

/**
 * Authentication event listener function type
 */
export type AuthEventListener = (
  state: AuthState,
  user?: SecureAuthUser | null,
  error?: AuthError | null
) => void;

/**
 * Authentication events that can be subscribed to
 */
export type AuthEvent = 
  | 'state_changed'        // Authentication state changed
  | 'user_authenticated'   // User successfully authenticated
  | 'user_unauthenticated' // User logged out or session expired
  | 'token_refreshed'      // Access token was refreshed
  | 'error_occurred'       // Authentication error occurred
  | 'session_expired'      // User session expired
  | 'security_alert';      // Security-related alert

/**
 * Event data structure
 */
export interface AuthEventData {
  /** Event type */
  type: AuthEvent;
  
  /** Event timestamp */
  timestamp: string;
  
  /** Current authentication state */
  authState: AuthState;
  
  /** Current user (if authenticated) */
  user?: SecureAuthUser | null;
  
  /** Error information (if applicable) */
  error?: AuthError;
  
  /** Additional event context */
  context?: {
    sessionId?: string;
    operation?: string;
    metadata?: Record<string, any>;
  };
}

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

/**
 * Google OAuth token verification request
 * Sent to our server for token validation
 */
export interface GoogleTokenVerificationRequest {
  /** Google ID token to verify */
  idToken: string;
  
  /** Request metadata for security logging */
  metadata?: {
    platform: string;
    appVersion?: string;
    timestamp: string;
    userAgent?: string;
  };
}

/**
 * Token refresh request
 * Sent to obtain new access token
 */
export interface TokenRefreshRequest {
  /** Current refresh token */
  refreshToken: string;
  
  /** Optional session context */
  sessionContext?: {
    sessionId: string;
    lastActivity: string;
  };
}

/**
 * Logout request
 * Sent to revoke tokens and end session
 */
export interface LogoutRequest {
  /** Access token to revoke */
  accessToken?: string;
  
  /** Refresh token to revoke */
  refreshToken?: string;
  
  /** Session ID to end */
  sessionId?: string;
  
  /** Whether to logout from all devices */
  allDevices?: boolean;
}

// ========================================
// CONFIGURATION TYPES
// ========================================

/**
 * Authentication system configuration
 */
export interface AuthConfig {
  /** OAuth settings */
  oauth: {
    scopes: string[];
    responseType: 'id_token' | 'code';
    useStateParameter: boolean;
    usePKCE: boolean;
  };
  
  /** Security settings */
  security: {
    tokenRefreshThreshold: number;
    maxTokenAge: number;
    maxRefreshAttempts: number;
    useSecureStorage: boolean;
  };
  
  /** API settings */
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    cacheEnabled: boolean;
  };
  
  /** UI settings */
  ui: {
    showSecurityIndicator: boolean;
    autoNavigateOnSuccess: boolean;
    errorDisplayDuration: number;
  };
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  /** Current environment */
  environment: 'development' | 'staging' | 'production';
  
  /** API endpoints */
  apiEndpoints: {
    auth: string;
    users: string;
    donations: string;
    rides: string;
  };
  
  /** Feature flags */
  features: {
    enableBiometrics: boolean;
    enableOfflineMode: boolean;
    enableAnalytics: boolean;
    enableDebugLogging: boolean;
  };
  
  /** Platform-specific settings */
  platform: {
    ios?: {
      keychainAccessGroup?: string;
      useSafariViewController: boolean;
    };
    android?: {
      keystoreAlias?: string;
      useChromeCustomTabs: boolean;
    };
    web?: {
      useServiceWorker: boolean;
      corsOrigins: string[];
    };
  };
}

// ========================================
// VALIDATION TYPES
// ========================================

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether configuration is valid */
  isValid: boolean;
  
  /** Critical errors that prevent operation */
  errors: string[];
  
  /** Warnings about suboptimal configuration */
  warnings: string[];
  
  /** Recommendations for improvement */
  recommendations: string[];
  
  /** Validation metadata */
  metadata: {
    checkedAt: string;
    environment: string;
    platform: string;
  };
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  isValid: boolean;
  
  /** Decoded token payload (if valid) */
  payload?: JwtTokenPayload;
  
  /** Validation error (if invalid) */
  error?: string;
  
  /** Whether token needs refresh */
  needsRefresh: boolean;
  
  /** Time until expiry in milliseconds */
  timeUntilExpiry?: number;
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Generic callback function type
 */
export type Callback<T = void> = (data: T) => void;

/**
 * Async callback function type
 */
export type AsyncCallback<T = void> = (data: T) => Promise<void>;

/**
 * Optional fields helper type
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Readonly deep helper type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Non-empty string type
 */
export type NonEmptyString = string & { readonly brand: unique symbol };

/**
 * Email address type with validation
 */
export type EmailAddress = string & { readonly brand: unique symbol };

/**
 * Secure string type (for tokens, secrets)
 */
export type SecureString = string & { readonly brand: unique symbol };

// ========================================
// RE-EXPORTS FOR CONVENIENCE
// ========================================

/**
 * Main user type (re-export for backward compatibility)
 */
export type { SecureAuthUser as AuthUser };

/**
 * Main auth service types
 * Note: These are already defined above, no need to re-export
 */

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard to check if a value is a valid user ID
 */
export function isValidUserId(value: any): value is UserId {
  return typeof value === 'string' && 
         value.length > 0 && 
         value.length <= 100 &&
         /^[a-zA-Z0-9_-]+$/.test(value);
}

/**
 * Type guard to check if a value is a valid email
 */
export function isValidEmail(value: any): value is VerifiedEmail {
  return typeof value === 'string' && 
         /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
         value.length <= 320; // RFC 5321 limit
}

/**
 * Type guard to check if a value is a valid auth state
 */
export function isValidAuthState(value: any): value is AuthState {
  const validStates: AuthState[] = [
    'initializing', 'unauthenticated', 'authenticating', 'verifying',
    'authenticated', 'refreshing', 'error', 'expired', 'logout'
  ];
  return validStates.includes(value);
}

/**
 * Type guard to check if a response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if a response is an error
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: false; error: string } {
  return response.success === false && typeof response.error === 'string';
}

// ========================================
// BRAND TYPES (for type safety)
// ========================================

/**
 * Create branded types for additional type safety
 * These prevent accidental mixing of similar string types
 */

/**
 * JWT token string (branded for type safety)
 */
export type JwtToken = string & { readonly __brand: 'JwtToken' };

/**
 * Session ID string (branded for type safety)
 */
export type SessionId = string & { readonly __brand: 'SessionId' };

/**
 * OAuth state parameter (branded for type safety)
 */
export type OAuthState = string & { readonly __brand: 'OAuthState' };

/**
 * Nonce value (branded for type safety)
 */
export type Nonce = string & { readonly __brand: 'Nonce' };

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Create a branded JWT token
 */
export function createJwtToken(token: string): JwtToken {
  return token as JwtToken;
}

/**
 * Create a branded session ID
 */
export function createSessionId(id: string): SessionId {
  return id as SessionId;
}

/**
 * Create a branded OAuth state
 */
export function createOAuthState(state: string): OAuthState {
  return state as OAuthState;
}

/**
 * Create a branded nonce
 */
export function createNonce(nonce: string): Nonce {
  return nonce as Nonce;
}

/**
 * ========================================
 * TYPE USAGE EXAMPLES
 * ========================================
 * 
 * // Basic authentication
 * const user: SecureAuthUser = await authenticateUser();
 * const tokens: AuthTokens = await getTokens();
 * 
 * // API requests
 * const response: ApiResponse<UserProfile> = await api.getProfile();
 * if (isSuccessResponse(response)) {
 *   console.log('Profile:', response.data);
 * }
 * 
 * // Error handling
 * const error: AuthError = {
 *   type: 'OAUTH_ERROR',
 *   message: 'OAuth flow was cancelled',
 *   retryable: true,
 *   timestamp: new Date().toISOString()
 * };
 * 
 * // Event handling
 * const listener: AuthEventListener = (state, user, error) => {
 *   console.log('Auth state:', state);
 * };
 */
