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
export interface ApiResponse<T = any> {
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

// ============ User ============

/** Shared app user preview type (lightweight, nullable fields allowed) */
export interface UserPreview {
  id: string;
  name: string;
  email?: string; // Added for filtering current user by email
  avatar?: string;
  bio?: string;
  karmaPoints?: number;
  completedTasks?: number;
  followersCount?: number;
  roles?: string[];
  isVerified?: boolean;
  isActive?: boolean;
  location?: {
    city: string;
    country: string;
  };
  joinDate?: string;
  interests?: string[];
  parentManagerId?: string | null;
  hierarchyLevel?: number | null; // דרגה בהיררכיה: 0 = מנהל ראשי, 1 = סופר מנהל, 2+ = מנהלים/מתנדבים, null = משתמש רגיל
}

// ============ Community Challenges ============

export enum ChallengeType {
  BOOLEAN = "BOOLEAN",
  NUMERIC = "NUMERIC",
  DURATION = "DURATION",
}

export enum ChallengeFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  FLEXIBLE = "FLEXIBLE",
}

export enum ChallengeDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert",
}

export enum GoalDirection {
  MAXIMIZE = "maximize",
  MINIMIZE = "minimize",
}

export interface CommunityChallenge {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  image_url?: string;
  type: ChallengeType;
  frequency: ChallengeFrequency;
  goal_value?: number;
  goal_direction?: GoalDirection | null;
  deadline?: string;
  difficulty?: ChallengeDifficulty;
  category?: string;
  is_active: boolean;
  participants_count: number;
  created_at: string;
  updated_at: string;
  // Extended fields from JOIN
  creator_name?: string;
  creator_avatar?: string;
  post_id?: string;
  participants?: ChallengeParticipant[];
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  current_streak: number;
  best_streak: number;
  total_entries: number;
  last_entry_date?: string;
  // Extended fields from JOIN
  user_name?: string;
  user_avatar?: string;
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  entry_date: string;
  value: number;
  notes?: string;
  created_at: string;
}

export interface ChallengeStatistics {
  overall: {
    active_challenges: number;
    total_entries: number;
    best_streak_overall: number;
    avg_current_streak: number;
  };
  challenges: Array<
    ChallengeParticipant & {
      title: string;
      type: ChallengeType;
      frequency: ChallengeFrequency;
      difficulty?: ChallengeDifficulty;
      category?: string;
      goal_value?: number;
      deadline?: string;
    }
  >;
}

// ============ Posts, Likes & Comments ============

export interface LikeResponse {
  post_id: string;
  is_liked: boolean;
  likes_count: number;
}

export interface CommentUser {
  id: string;
  name: string;
  avatar_url: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
  user: CommentUser;
}

export interface CommentResponse extends Comment {
  comments_count: number;
}

export interface CommentLikeResponse {
  comment_id: string;
  is_liked: boolean;
  likes_count: number;
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
