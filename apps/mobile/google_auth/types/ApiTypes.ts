/* eslint-disable @typescript-eslint/no-empty-object-type */
/**
 * ========================================
 * API TYPE DEFINITIONS  
 * ========================================
 * 
 * Type definitions for all API operations in the Google Authentication System.
 * These types ensure type safety for all server communication and data structures.
 * 
 * CATEGORIES:
 * - Request/Response types for all API endpoints
 * - Data Transfer Objects (DTOs) for validation
 * - Server response formats and error structures
 * - Pagination and filtering types
 * - Real-time communication types
 * 
 * AUTHOR: AI Assistant
 * LAST UPDATED: 2024
 */

// ========================================
// BASE API TYPES
// ========================================

/**
 * Standard API response wrapper used by all endpoints
 * Provides consistent response structure across the entire API
 */
export interface BaseApiResponse<TData = any> {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Response data (present when success is true) */
  data?: TData;
  
  /** Error message (present when success is false) */
  error?: string;
  
  /** Additional context message */
  message?: string;
  
  /** Response metadata for debugging and monitoring */
  metadata?: {
    /** Unique request identifier for tracing */
    requestId: string;
    
    /** Response timestamp in ISO format */
    timestamp: string;
    
    /** Request processing duration in milliseconds */
    duration: number;
    
    /** API version that handled the request */
    version?: string;
    
    /** Whether response was cached */
    cached?: boolean;
    
    /** Rate limiting information */
    rateLimit?: {
      /** Remaining requests in current window */
      remaining: number;
      /** When the rate limit window resets */
      resetTime: number;
      /** Total request limit per window */
      limit: number;
    };
  };
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  limit: number;
  
  /** Total number of items across all pages */
  total: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Whether there are more pages after this one */
  hasNext: boolean;
  
  /** Whether there are pages before this one */
  hasPrev: boolean;
  
  /** Cursor for efficient pagination (if using cursor-based pagination) */
  cursor?: {
    next?: string;
    prev?: string;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<TData> extends BaseApiResponse<TData[]> {
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// ========================================
// AUTHENTICATION API TYPES
// ========================================

/**
 * Google OAuth token verification request
 */
export interface GoogleAuthRequest {
  /** Google ID token to verify */
  idToken: string;
  
  /** Optional access token (alternative to ID token) */
  accessToken?: string;
  
  /** Client metadata for security logging */
  metadata?: {
    platform: string;
    appVersion?: string;
    deviceId?: string;
    userAgent?: string;
  };
}

/**
 * Successful authentication response
 */
export interface AuthSuccessResponse extends BaseApiResponse<{
  /** JWT token pair for session management */
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
    tokenType: 'Bearer';
  };
  
  /** Verified user profile data */
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    roles: string[];
    emailVerified: boolean;
    settings: Record<string, any>;
  };
}> {
  /** Additional authentication metadata */
  metadata?: BaseApiResponse['metadata'] & {
    /** Whether this is a new user registration */
    isNewUser?: boolean;
    /** Previous login timestamp */
    lastLogin?: string;
    /** Login count */
    loginCount?: number;
    /** Security warnings */
    securityWarnings?: string[];
  };
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  /** Current refresh token */
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse extends BaseApiResponse<{
  /** New access token */
  accessToken: string;
  /** Expiration time in seconds */
  expiresIn: number;
  /** Token type */
  tokenType: 'Bearer';
}> {}

/**
 * Logout request
 */
export interface LogoutRequest {
  /** Current access token (optional) */
  token?: string;
  /** Current refresh token (optional) */
  refreshToken?: string;
  /** Whether to logout from all devices */
  allDevices?: boolean;
}

/**
 * User sessions response
 */
export interface UserSessionsResponse extends BaseApiResponse<Array<{
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  platform: string;
  isCurrentSession: boolean;
}>> {}

// ========================================
// USER API TYPES
// ========================================

/**
 * User profile response
 */
export interface UserProfileResponse extends BaseApiResponse<{
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar: string;
  bio?: string;
  karmaPoints: number;
  joinDate: string;
  isActive: boolean;
  lastActive: string;
  location?: {
    city?: string;
    country?: string;
  };
  interests: string[];
  roles: string[];
  settings: {
    language: string;
    darkMode: boolean;
    notificationsEnabled: boolean;
    [key: string]: any;
  };
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    donationsCount: number;
    ridesCount: number;
  };
}> {}

/**
 * User profile update request
 */
export interface UserUpdateRequest {
  /** Updated name */
  name?: string;
  /** Updated phone number */
  phone?: string;
  /** Updated avatar URL */
  avatar?: string;
  /** Updated bio */
  bio?: string;
  /** Updated location */
  location?: {
    city?: string;
    country?: string;
  };
  /** Updated interests */
  interests?: string[];
  /** Updated settings */
  settings?: {
    language?: string;
    darkMode?: boolean;
    notificationsEnabled?: boolean;
    [key: string]: any;
  };
}

/**
 * User list filters
 */
export interface UserListFilters {
  /** Filter by city */
  city?: string;
  /** Filter by country */
  country?: string;
  /** Search by name or email */
  search?: string;
  /** Filter by role */
  role?: string;
  /** Filter by activity status */
  isActive?: boolean;
  /** Sort field */
  sortBy?: 'name' | 'joinDate' | 'karmaPoints' | 'lastActive';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
}

// ========================================
// DONATION API TYPES
// ========================================

/**
 * Donation item structure
 */
export interface DonationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'item' | 'service' | 'money' | 'time';
  status: 'available' | 'reserved' | 'completed' | 'cancelled';
  donorId: string;
  donorName: string;
  location: {
    city: string;
    country: string;
    address?: string;
  };
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  value?: number;
  currency?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    preferredContact?: 'phone' | 'email' | 'app';
  };
}

/**
 * Create donation request
 */
export interface CreateDonationRequest {
  title: string;
  description: string;
  category: string;
  type: 'item' | 'service' | 'money' | 'time';
  location: {
    city: string;
    country: string;
    address?: string;
  };
  images?: string[];
  tags?: string[];
  expiresAt?: string;
  value?: number;
  currency?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    preferredContact?: 'phone' | 'email' | 'app';
  };
}

/**
 * Donation filters for search and listing
 */
export interface DonationFilters {
  /** Filter by category */
  category?: string;
  /** Filter by type */
  type?: 'item' | 'service' | 'money' | 'time';
  /** Filter by city */
  city?: string;
  /** Filter by status */
  status?: 'available' | 'reserved' | 'completed';
  /** Search by title or description */
  search?: string;
  /** Filter by value range */
  minValue?: number;
  maxValue?: number;
  /** Filter by creation date */
  dateFrom?: string;
  dateTo?: string;
  /** Results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
  /** Sort field */
  sortBy?: 'createdAt' | 'title' | 'value' | 'location';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Donation list response
 */
export interface DonationsResponse extends PaginatedResponse<DonationItem> {}

/**
 * Donation categories response
 */
export interface DonationCategoriesResponse extends BaseApiResponse<Array<{
  id: string;
  name: string;
  nameHe: string;
  icon: string;
  count: number;
  description?: string;
}>> {}

// ========================================
// RIDE API TYPES  
// ========================================

/**
 * Ride sharing item structure
 */
export interface RideItem {
  id: string;
  title: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  from: {
    name: string;
    city: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  to: {
    name: string;
    city: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  departureTime: string;
  estimatedArrival?: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  currency: string;
  status: 'available' | 'full' | 'in_progress' | 'completed' | 'cancelled';
  requirements?: string[];
  description?: string;
  vehicle?: {
    model?: string;
    color?: string;
    licensePlate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Create ride request
 */
export interface CreateRideRequest {
  title: string;
  fromLocation: {
    name: string;
    city: string;
    address?: string;
  };
  toLocation: {
    name: string;
    city: string;
    address?: string;
  };
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  currency?: string;
  requirements?: string[];
  description?: string;
  vehicle?: {
    model?: string;
    color?: string;
  };
}

/**
 * Ride filters for search
 */
export interface RideFilters {
  /** Filter by departure city */
  fromCity?: string;
  /** Filter by destination city */
  toCity?: string;
  /** Filter by departure date */
  date?: string;
  /** Filter by time range */
  timeFrom?: string;
  timeTo?: string;
  /** Filter by available seats */
  minSeats?: number;
  /** Filter by price range */
  maxPrice?: number;
  /** Filter by status */
  status?: 'available' | 'full';
  /** Results per page */
  limit?: number;
  /** Page offset */
  offset?: number;
  /** Sort options */
  sortBy?: 'departureTime' | 'price' | 'availableSeats';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Ride booking request
 */
export interface RideBookingRequest {
  /** Number of seats to book */
  seats: number;
  /** Passenger contact information */
  passengerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  /** Special requests or notes */
  notes?: string;
}

// ========================================
// COMMUNITY STATS TYPES
// ========================================

/**
 * Community statistics structure
 */
export interface CommunityStats {
  /** Total statistics */
  totals: {
    activeUsers: number;
    totalDonations: number;
    totalRides: number;
    karmaPointsDistributed: number;
    citiesCovered: number;
  };
  
  /** Recent activity (last 30 days) */
  recentActivity: {
    newUsers: number;
    newDonations: number;
    newRides: number;
    completedTransactions: number;
  };
  
  /** Top performing cities */
  topCities: Array<{
    city: string;
    country: string;
    userCount: number;
    donationCount: number;
    rideCount: number;
    karmaPoints: number;
  }>;
  
  /** Category breakdown */
  categoryStats: Array<{
    category: string;
    count: number;
    percentage: number;
    growth: number; // percentage change from previous period
  }>;
  
  /** Time-based statistics */
  timeStats: {
    hourlyActivity: number[]; // 24 hours
    weeklyActivity: number[]; // 7 days  
    monthlyActivity: number[]; // 12 months
  };
}

/**
 * Community stats filters
 */
export interface StatsFilters {
  /** Filter by city */
  city?: string;
  /** Filter by time period */
  period?: 'day' | 'week' | 'month' | 'year';
  /** Start date for custom period */
  dateFrom?: string;
  /** End date for custom period */
  dateTo?: string;
  /** Specific statistic type */
  statType?: string;
}

// ========================================
// ERROR TYPES
// ========================================

/**
 * API error response structure
 */
export interface ApiErrorResponse extends BaseApiResponse<never> {
  /** Always false for error responses */
  success: false;
  
  /** Error message for display to user */
  error: string;
  
  /** Additional error details */
  details?: {
    /** Error code for programmatic handling */
    code?: string;
    /** Field-specific validation errors */
    fieldErrors?: Record<string, string[]>;
    /** Suggestions for fixing the error */
    suggestions?: string[];
    /** Documentation link for the error */
    docsUrl?: string;
  };
}

/**
 * Network error information
 */
export interface NetworkError {
  /** Error type classification */
  type: 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'CONNECTIVITY_ERROR';
  /** User-friendly error message */
  message: string;
  /** Technical error details */
  technical?: string;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** Suggested retry delay in milliseconds */
  retryDelay?: number;
}

// ========================================
// REQUEST TYPES
// ========================================

/**
 * Base filter interface for list endpoints
 */
export interface BaseFilters {
  /** Search query string */
  search?: string;
  /** Results per page (max 100) */
  limit?: number;
  /** Page offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  /** Start date (ISO format) */
  dateFrom?: string;
  /** End date (ISO format) */
  dateTo?: string;
}

/**
 * Location filter
 */
export interface LocationFilter {
  /** City name */
  city?: string;
  /** Country code or name */
  country?: string;
  /** Radius for geographic search (in km) */
  radius?: number;
  /** Geographic coordinates */
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// ========================================
// CHAT API TYPES
// ========================================

/**
 * Chat conversation structure
 */
export interface ChatConversation {
  id: string;
  participants: Array<{
    userId: string;
    name: string;
    avatar: string;
    role: 'owner' | 'participant';
    joinedAt: string;
  }>;
  title?: string;
  type: 'direct' | 'group' | 'support';
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  isMuted: boolean;
  settings?: {
    allowInvites: boolean;
    deleteAfterDays?: number;
  };
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'text' | 'image' | 'file' | 'system' | 'voice';
  content: {
    text?: string;
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    voiceDuration?: number;
  };
  timestamp: string;
  editedAt?: string;
  isEdited: boolean;
  replyTo?: {
    messageId: string;
    text: string;
    senderName: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  metadata?: {
    platform: string;
    ipAddress?: string;
    edited?: boolean;
    deleted?: boolean;
  };
}

// ========================================
// FILE UPLOAD TYPES
// ========================================

/**
 * File upload request
 */
export interface FileUploadRequest {
  /** File name */
  fileName: string;
  /** File MIME type */
  fileType: string;
  /** File size in bytes */
  fileSize: number;
  /** Upload purpose/context */
  purpose: 'avatar' | 'donation_image' | 'chat_attachment' | 'document';
  /** Associated resource ID */
  resourceId?: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse extends BaseApiResponse<{
  /** Unique file identifier */
  fileId: string;
  /** Direct URL to uploaded file */
  url: string;
  /** CDN URL for optimized delivery */
  cdnUrl?: string;
  /** Thumbnail URL (for images) */
  thumbnailUrl?: string;
  /** Upload metadata */
  metadata: {
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    expiresAt?: string;
  };
}> {}

// ========================================
// NOTIFICATION TYPES
// ========================================

/**
 * Push notification structure
 */
export interface PushNotification {
  id: string;
  userId: string;
  type: 'system' | 'social' | 'transaction' | 'security' | 'promotional';
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  actionButtons?: Array<{
    id: string;
    title: string;
    action: string;
  }>;
  expiresAt?: string;
  metadata?: {
    campaign?: string;
    source?: string;
    category?: string;
  };
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Push notification settings */
  push: {
    enabled: boolean;
    types: Record<string, boolean>;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  
  /** Email notification settings */
  email: {
    enabled: boolean;
    types: Record<string, boolean>;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  
  /** SMS notification settings */
  sms: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
}

// ========================================
// ANALYTICS TYPES
// ========================================

/**
 * User analytics data
 */
export interface UserAnalytics {
  /** User engagement metrics */
  engagement: {
    sessionsThisWeek: number;
    averageSessionDuration: number; // minutes
    screenViews: Record<string, number>;
    actionsPerSession: number;
  };
  
  /** User activity metrics */
  activity: {
    donationsCreated: number;
    donationsReceived: number;
    ridesOffered: number;
    ridesTaken: number;
    messagesExchanged: number;
    karmaPointsEarned: number;
  };
  
  /** User behavior patterns */
  behavior: {
    mostActiveHours: number[];
    preferredCategories: string[];
    averageResponseTime: number; // minutes
    completionRate: number; // percentage
  };
}

/**
 * Event tracking structure
 */
export interface AnalyticsEvent {
  /** Event name */
  event: string;
  /** User who triggered the event */
  userId?: string;
  /** Event properties */
  properties: Record<string, any>;
  /** Event timestamp */
  timestamp: string;
  /** Session identifier */
  sessionId?: string;
  /** Platform/device information */
  context: {
    platform: string;
    appVersion: string;
    userAgent?: string;
    screenResolution?: string;
    timezone: string;
  };
}

// ========================================
// HEALTH CHECK TYPES
// ========================================

/**
 * Service health check response
 */
export interface HealthCheckResponse extends BaseApiResponse<{
  /** Overall service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Individual service components */
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    googleOAuth: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  
  /** Performance metrics */
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  
  /** Version information */
  version: {
    api: string;
    database: string;
    node: string;
  };
  
  /** Uptime information */
  uptime: {
    seconds: number;
    human: string;
  };
}> {}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Generic list response
 */
export type ListResponse<T> = PaginatedResponse<T>;

/**
 * Generic create response
 */
export type CreateResponse<T> = BaseApiResponse<T & { id: string; createdAt: string }>;

/**
 * Generic update response
 */
export type UpdateResponse<T> = BaseApiResponse<T & { updatedAt: string }>;

/**
 * Generic delete response
 */
export type DeleteResponse = BaseApiResponse<{ 
  deleted: boolean; 
  deletedAt: string; 
  id: string 
}>;

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T = any> extends BaseApiResponse<{
  /** Number of items processed successfully */
  successCount: number;
  /** Number of items that failed */
  errorCount: number;
  /** Total items attempted */
  totalCount: number;
  /** Results for each item */
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}> {}

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard for successful API responses
 */
export function isSuccessResponse<T>(response: BaseApiResponse<T>): response is BaseApiResponse<T> & { 
  success: true; 
  data: T 
} {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard for error API responses
 */
export function isErrorResponse<T>(response: BaseApiResponse<T>): response is ApiErrorResponse {
  return response.success === false && typeof response.error === 'string';
}

/**
 * Type guard for paginated responses
 */
export function isPaginatedResponse<T>(response: BaseApiResponse<T[]>): response is PaginatedResponse<T> {
  return response.success === true && 
         Array.isArray(response.data) && 
         'pagination' in response;
}

// ========================================
// EXPORT ALL TYPES
// ========================================

// All types are exported via their interface/type declarations above

/**
 * ========================================
 * USAGE EXAMPLES
 * ========================================
 * 
 * // Type-safe API call
 * const response: UserProfileResponse = await api.getCurrentUser();
 * if (isSuccessResponse(response)) {
 *   console.log('User name:', response.data.name);
 * }
 * 
 * // Create donation with validation
 * const donationData: CreateDonationRequest = {
 *   title: 'ספר לימוד',
 *   description: 'ספר פיזיקה למכירה',
 *   category: 'education',
 *   type: 'item',
 *   location: {
 *     city: 'תל אביב',
 *     country: 'ישראל'
 *   }
 * };
 * 
 * // Filter rides with type safety
 * const filters: RideFilters = {
 *   fromCity: 'תל אביב',
 *   toCity: 'ירושלים',
 *   date: '2024-01-15',
 *   maxPrice: 50
 * };
 * 
 * const rides = await api.getRides(filters);
 */
