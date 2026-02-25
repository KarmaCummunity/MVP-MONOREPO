/**
 * Shared API contract types for KC monorepo.
 * Used by @kc/api (backend) and @kc/mobile (client) to keep responses in sync.
 */

// ============ Auth ============

/** Auth tokens returned by login/refresh */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /** Optional: refresh token TTL in seconds */
  refreshExpiresIn?: number;
  /** Optional: server session id */
  sessionId?: string;
  tokenType?: 'Bearer';
  /** Optional: token issuance Unix timestamp */
  issuedAt?: number;
}

// ============ Response metadata ============

/** Optional metadata on API responses (tracing, caching, rate limit) */
export interface ResponseMetadata {
  requestId?: string;
  timestamp?: string;
  duration?: number;
  version?: string;
  cached?: boolean;
  rateLimit?: {
    remaining: number;
    resetTime: number;
    limit: number;
  };
}

// ============ Core response shape ============

/** Standard API response wrapper – same shape from API and expected by mobile */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  user?: unknown;
  tokens?: AuthTokens;
  error?: string;
  message?: string;
  version?: string;
  metadata?: ResponseMetadata;
}

/** Alias for code that uses BaseApiResponse naming */
export type BaseApiResponse<T = unknown> = ApiResponse<T>;

/** Error response shape (success: false, error required) */
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  details?: {
    code?: string;
    fieldErrors?: Record<string, string[]>;
    suggestions?: string[];
    docsUrl?: string;
  };
}

// ============ Pagination ============

/** Pagination metadata for list endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  cursor?: { next?: string; prev?: string };
}

/** List response with items + meta (one style) */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/** List response with data + pagination (API style) */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// ============ Type guards ============

export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false && typeof response.error === 'string';
}

export function isPaginatedApiResponse<T>(
  response: ApiResponse<unknown>
): response is PaginatedApiResponse<T> {
  return (
    response.success === true &&
    Array.isArray((response as ApiResponse<T[]>).data) &&
    'pagination' in response
  );
}
