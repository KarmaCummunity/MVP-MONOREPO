// File overview:
// - Purpose: Typed API client for the new backend (users, donations, rides, stats, chat).
// - Reached from: Higher-level services/components when `USE_BACKEND` is enabled.
// - Provides: request helpers and endpoint-specific methods returning ApiResponse<T>.
// - Env: Base URL derived from `dbConfig` (EXPO_PUBLIC_API_BASE_URL).
// Enhanced API service for connecting to the new backend

// TODO: Add comprehensive error handling with retry logic and exponential backoff
// TODO: Implement proper TypeScript interfaces for all API requests/responses
// TODO: Add request/response interceptors for authentication and logging
// TODO: Add request caching mechanism for GET requests
// TODO: Implement proper timeout handling and abort controllers
// TODO: Add network connectivity checks before making requests
// TODO: Add comprehensive unit tests for all API methods
// TODO: Implement proper API versioning support
// TODO: Add request/response transformation middleware
// TODO: Add comprehensive logging and monitoring
import {
  API_BASE_URL as CONFIG_API_BASE_URL,
  DEV_HOSTED_API_BASE_URL,
} from './config.constants';
import { logger } from './loggerService';
import { fetchWithAuth } from '../auth/interceptors/authFetchInterceptor';

/** Admin tasks endpoints can run heavier SQL; allow longer than default fetch abort */
const TASKS_HTTP_TIMEOUT_MS = 90_000;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  user?: any; // For resolveUserId endpoint compatibility
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
  message?: string;
  version?: string;
}

class ApiService {
  private _baseURL: string | null = null;

  private get baseURL(): string {
    // Try environment variables first (highest priority - for local development)
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) {
      return process.env.EXPO_PUBLIC_API_BASE_URL;
    }

    // For web, detect environment from domain at runtime
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;

      // If on localhost, use local server
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        return 'http://localhost:3001';
      }

      // If on dev domain, use dev server
      if (hostname.includes('dev.')) {
        return DEV_HOSTED_API_BASE_URL;
      }

      // Otherwise use production server
      return 'https://kc-mvp-server-production.up.railway.app';
    }

    // For native apps, use lazy initialization
    if (this._baseURL === null) {
      this._baseURL = CONFIG_API_BASE_URL;
    }
    return this._baseURL;
  }

  // Tasks APIs
  async getTaskHierarchy(taskId: string): Promise<ApiResponse> {
    return this.request(`/api/tasks/${taskId}/hierarchy`); // Will be implemented in backend if needed
  }

  async getTasks(filters: {
    status?:
      | 'open'
      | 'in_progress'
      | 'done'
      | 'archived'
      | 'stuck'
      | 'testing'
      | Array<'open' | 'in_progress' | 'done' | 'archived' | 'stuck' | 'testing'>;
    priority?:
      | 'none'
      | 'low'
      | 'medium'
      | 'high'
      | 'critical'
      | 'urgent'
      | Array<'none' | 'low' | 'medium' | 'high' | 'critical' | 'urgent'>;
    category?: string | string[];
    assignee?: string;
    q?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return;
        }
        // Repeat keys so Nest/Express parses `status` as string[] (OR semantics on the server).
        value.forEach((v) => {
          params.append(key, String(v));
        });
        return;
      }
      if (String(value).length > 0) {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    return this.request(
      `/api/tasks${qs ? `?${qs}` : ''}`,
      {},
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async createTask(taskData: any): Promise<ApiResponse> {
    return this.request(
      '/api/tasks',
      {
        method: 'POST',
        body: JSON.stringify(taskData),
      },
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  /** JWT — creates admin task for root admin (Knowledge offer); route lives under donations API. */
  async createKnowledgeContributionRequest(payload: {
    message?: string;
  }): Promise<ApiResponse> {
    return this.request(
      '/api/donations/knowledge/contribution-request',
      {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      },
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async getKnowledgeCommunityLinks(): Promise<ApiResponse<any[]>> {
    return this.request('/api/donations/knowledge/links', {}, true, 30_000);
  }

  async createKnowledgeCommunityLink(body: {
    url: string;
    description?: string;
    linkType?: 'group' | 'organization';
    createdByUserId?: string | null;
    displayName?: string | null;
  }): Promise<ApiResponse> {
    return this.request(
      '/api/donations/knowledge/links',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true,
      30_000,
    );
  }

  async deleteKnowledgeCommunityLink(linkId: string): Promise<ApiResponse> {
    return this.request(`/api/donations/knowledge/links/${linkId}`, {
      method: 'DELETE',
    });
  }

  async updateTask(taskId: string, updateData: any): Promise<ApiResponse> {
    return this.request(
      `/api/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      },
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async deleteTask(taskId: string): Promise<ApiResponse> {
    return this.request(
      `/api/tasks/${taskId}`,
      {
        method: 'DELETE',
      },
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async getSubtasks(taskId: string): Promise<ApiResponse> {
    return this.request(
      `/api/tasks/${taskId}/subtasks`,
      {},
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async getTaskTree(taskId: string): Promise<ApiResponse> {
    return this.request(
      `/api/tasks/${taskId}/tree`,
      {},
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async logTaskHours(taskId: string, hours: number, userId: string): Promise<ApiResponse> {
    return this.request(
      `/api/tasks/${taskId}/log-hours`,
      {
        method: 'POST',
        body: JSON.stringify({ hours, user_id: userId }),
      },
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  async getHoursReport(managerId: string): Promise<ApiResponse> {
    return this.request(
      `/api/tasks/hours-report/${managerId}`,
      {},
      true,
      TASKS_HTTP_TIMEOUT_MS,
    );
  }

  private normalizeEndpoint(endpoint: string): string {
    if (!endpoint) {
      return '/';
    }
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    if (!this.baseURL) {
      return normalizedEndpoint;
    }
    const normalizedBase = this.baseURL.replace(/\/+$/, '');
    if (!normalizedBase) {
      return normalizedEndpoint;
    }
    return `${normalizedBase}${normalizedEndpoint}`;
  }

  /**
   * Validate token and refresh if expired
   * @returns Valid access token or null if refresh failed
   */
  /**
   * Delegates token retrieval to tokenManager — the single source of truth.
   * tokenManager stores under 'auth_access_token' (SecureStore on native, AsyncStorage on web).
   */
  private async validateAndRefreshToken(): Promise<string | null> {
    try {
      const { tokenManager } = await import('../auth/services/tokenManager');
      const token = await tokenManager.getAccessToken();
      if (token) return token;
      return null;
    } catch (error) {
      console.warn('❌ Error reading token from tokenManager:', error);
      return null;
    }
  }

  /**
   * Firebase ID token for the signed-in user (Google, etc.).
   * @param forceRefresh - pass true after 401 so the server gets a fresh token
   */
  private async getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
    try {
      const { getFirebase } = await import('./firebaseClient');
      const { getAuth } = await import('firebase/auth');
      const { app } = getFirebase();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return null;
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.warn('Failed to get Firebase ID token:', error);
      return null;
    }
  }

  private async clearStoredJwt(): Promise<void> {
    try {
      const { tokenManager } = await import('../auth/services/tokenManager');
      await tokenManager.clearTokens();
    } catch (e) {
      console.warn('Failed to clear JWT from tokenManager:', e);
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      // Try to validate and refresh JWT token if needed
      const jwtToken = await this.validateAndRefreshToken();
      if (jwtToken) {
        return jwtToken;
      }

      return await this.getFirebaseIdToken(false);
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _retryOn401: boolean = true,
    timeoutMs: number = 30_000,
  ): Promise<ApiResponse<T>> {
    // TODO: Add request ID for tracing and debugging
    try {
      const url = this.buildUrl(endpoint);

      // Get authentication token
      const authToken = await this.getAuthToken();

      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
        ...options,
      };

      const isPeriodic = endpoint.includes('stats/community');
      logger.debug('API', `${config.method || 'GET'} ${endpoint}`, { auth: !!authToken }, isPeriodic ? { periodic: true } : undefined);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchWithAuth(url, {
          ...config,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        // Handle 401 Unauthorized - try JWT refresh, then Firebase (Google) token
        if (!response.ok) {
          logger.error('API', `API Error ${response.status}`, { endpoint, status: response.status, data });
          return {
            success: false,
            error: data.message || data.error || 'Network error',
          };
        }

        logger.debug('API', `Response ${endpoint}`, { success: true }, isPeriodic ? { periodic: true } : undefined);
        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Check if error is due to abort (timeout)
        if (fetchError.name === 'AbortError') {
          logger.error('API', 'Request timeout', { endpoint });
          return {
            success: false,
            error: 'Request timeout - server is not responding',
          };
        }
        throw fetchError;
      }
    } catch (error) {
      logger.error('API', 'Network error', { error: String(error) });
      return {
        success: false,
        error: 'Network error - please check your connection',
      };
    }
  }

  // User APIs
  async searchUsers(query: string): Promise<ApiResponse> {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }

  async setManager(userId: string, managerId: string | null, requestingUserId?: string): Promise<ApiResponse> {
    const body = { managerId, requestingUserId };
    console.log(`[apiService.setManager] Sending request: userId=${userId}, managerId=${managerId} (type: ${typeof managerId}), body:`, JSON.stringify(body));
    return this.request(`/api/users/${userId}/set-manager`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getUserHierarchy(userId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/hierarchy`);
  }

  async manageHierarchy(subordinateId: string, action: 'add' | 'remove', managerId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${subordinateId}/hierarchy/manage`, {
      method: 'POST',
      body: JSON.stringify({ action, managerId }),
    });
  }

  /**
   * Promote a user to admin role (with hierarchy validation)
   * The target user will become an admin under the requesting admin
   */
  async promoteToAdmin(targetUserId: string, requestingAdminId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${targetUserId}/promote-admin`, {
      method: 'POST',
      body: JSON.stringify({ requestingAdminId }),
    });
  }

  /**
   * Demote an admin to regular user or volunteer (remove admin role)
   * Can only demote admins that are your subordinates
   * @param convertToVolunteer - if true, user becomes volunteer under requesting admin
   */
  async demoteAdmin(targetUserId: string, requestingAdminId: string, convertToVolunteer: boolean = false): Promise<ApiResponse> {
    return this.request(`/api/users/${targetUserId}/demote-admin`, {
      method: 'POST',
      body: JSON.stringify({ requestingAdminId, convertToVolunteer }),
    });
  }

  /**
   * Promote a user to volunteer role
   * Any manager (hierarchy_level >= 1) can promote users to volunteer
   * The target user will become a volunteer under the requesting admin
   */
  async promoteToVolunteer(targetUserId: string, requestingAdminId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${targetUserId}/promote-volunteer`, {
      method: 'POST',
      body: JSON.stringify({ requestingAdminId }),
    });
  }

  /**
   * Get users eligible for admin promotion by a specific admin
   */
  async getEligibleForPromotion(adminId: string): Promise<ApiResponse> {
    return this.request(`/api/users/eligible-for-promotion/${adminId}`);
  }

  async registerUser(userData: any): Promise<ApiResponse> {
    return this.request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(credentials: any): Promise<ApiResponse> {
    return this.request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getUserById(userId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}`);
  }

  /**
   * Resolve user ID from firebase_uid, google_id, or email to UUID
   * This is used when the client has Firebase UID or Google ID and needs the database UUID
   */
  async resolveUserId(params: { firebase_uid?: string; google_id?: string; email?: string }): Promise<ApiResponse> {
    return this.request('/api/users/resolve-id', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getUsers(filters: {
    city?: string;
    search?: string;
    limit?: number;
    offset?: number;
    forceRefresh?: boolean;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'forceRefresh' && value === true) {
          params.append(key, 'true');
        } else if (key !== 'forceRefresh') {
          params.append(key, value.toString());
        }
      }
    });

    return this.request(`/api/users?${params.toString()}`);
  }

  async updateUser(userId: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async getUserStats(userId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/stats`);
  }

  async getUserActivities(userId: string, limit = 50): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/activities?limit=${limit}`);
  }

  async getUsersSummary(): Promise<ApiResponse> {
    return this.request('/api/users/stats/summary');
  }

  /**
   * Get full admin hierarchy tree starting from super admin
   * Returns a nested tree structure of all managers
   */
  async getFullAdminHierarchy(): Promise<ApiResponse> {
    return this.request('/api/users/hierarchy/tree');
  }

  async followUser(userId: string, followerId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ follower_id: followerId }),
    });
  }

  async unfollowUser(userId: string, followerId: string): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/follow`, {
      method: 'DELETE',
      body: JSON.stringify({ follower_id: followerId }),
    });
  }

  // Donations APIs
  async getDonationCategories(): Promise<ApiResponse> {
    return this.request('/api/donations/categories');
  }

  async getDonations(filters: {
    type?: string;
    category?: string;
    city?: string;
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.request(`/api/donations?${params.toString()}`);
  }

  async createDonation(donationData: any): Promise<ApiResponse> {
    return this.request('/api/donations', {
      method: 'POST',
      body: JSON.stringify(donationData),
    });
  }

  async getDonationById(donationId: string): Promise<ApiResponse> {
    return this.request(`/api/donations/${donationId}`);
  }

  async updateDonation(donationId: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/api/donations/${donationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteDonation(donationId: string): Promise<ApiResponse> {
    return this.request(`/api/donations/${donationId}`, {
      method: 'DELETE',
    });
  }

  async getUserDonations(userId: string): Promise<ApiResponse> {
    return this.request(`/api/donations/user/${userId}`);
  }

  async getDonationStats(): Promise<ApiResponse> {
    return this.request('/api/donations/stats/summary');
  }

  // Rides APIs
  async getRides(filters: {
    from_city?: string;
    to_city?: string;
    date?: string;
    status?: string;
    limit?: number;
    offset?: number;
    include_past?: string;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.request(`/api/rides?${params.toString()}`);
  }

  async createRide(rideData: any): Promise<ApiResponse> {
    return this.request('/api/rides', {
      method: 'POST',
      body: JSON.stringify(rideData),
    });
  }

  async getRideById(rideId: string): Promise<ApiResponse> {
    return this.request(`/api/rides/${rideId}`);
  }

  async bookRide(rideId: string, bookingData: any): Promise<ApiResponse> {
    return this.request(`/api/rides/${rideId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<ApiResponse> {
    return this.request(`/api/rides/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getUserRides(userId: string, type?: 'driver' | 'passenger'): Promise<ApiResponse> {
    const params = type ? `?type=${type}` : '';
    return this.request(`/api/rides/user/${userId}${params}`);
  }

  async getRideStats(): Promise<ApiResponse> {
    return this.request('/api/rides/stats/summary');
  }

  async updateRide(rideId: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/api/rides/${rideId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Items Delivery APIs
  async updateItem(itemId: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/api/items-delivery/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Stats APIs
  async getCommunityStats(filters: {
    city?: string;
    period?: string;
    forceRefresh?: boolean;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'forceRefresh' && value === true) {
          params.append(key, 'true');
        } else if (key !== 'forceRefresh') {
          params.append(key, value.toString());
        }
      }
    });

    return this.request(`/api/stats/community?${params.toString()}`);
  }

  async getCommunityStatsVersion(city?: string): Promise<ApiResponse> {
    const params = city ? `?city=${city}` : '';
    return this.request(`/api/stats/community/version${params}`);
  }

  async getCommunityTrends(statType: string, city?: string, days = 30): Promise<ApiResponse> {
    const params = new URLSearchParams({ stat_type: statType, days: days.toString() });
    if (city) {
      params.append('city', city);
    }

    return this.request(`/api/stats/community/trends?${params.toString()}`);
  }

  async getStatsByCity(statType?: string): Promise<ApiResponse> {
    const params = statType ? `?stat_type=${statType}` : '';
    return this.request(`/api/stats/community/cities${params}`);
  }

  async trackSiteVisit(): Promise<ApiResponse> {
    return this.request('/api/stats/track-visit', {
      method: 'POST',
    });
  }

  async incrementStat(statData: {
    stat_type: string;
    value?: number;
    city?: string;
  }): Promise<ApiResponse> {
    return this.request('/api/stats/increment', {
      method: 'POST',
      body: JSON.stringify(statData),
    });
  }

  async resetCommunityStats(): Promise<ApiResponse> {
    return this.request('/api/stats/community/reset', {
      method: 'POST',
    });
  }

  async getCategoryAnalytics(): Promise<ApiResponse> {
    return this.request('/api/stats/analytics/categories');
  }

  async getUserAnalytics(): Promise<ApiResponse> {
    return this.request('/api/stats/analytics/users');
  }

  async getDashboardStats(): Promise<ApiResponse> {
    return this.request('/api/stats/dashboard');
  }

  async getRealTimeStats(): Promise<ApiResponse> {
    return this.request('/api/stats/real-time');
  }

  async getStatDetails(statType: string): Promise<ApiResponse> {
    return this.request(`/api/stats/details/${statType}`);
  }

  // Posts APIs
  async getPosts(limit = 20, offset = 0, userId?: string): Promise<ApiResponse> {
    let url = `/api/posts?limit=${limit}&offset=${offset}`;
    if (userId) {
      url += `&user_id=${userId}`;
    }
    return this.request(url);
  }

  async getUserPosts(userId: string, limit = 20, viewerId?: string): Promise<ApiResponse> {
    let url = `/api/posts/user/${userId}?limit=${limit}`;
    if (viewerId) {
      url += `&viewer_id=${viewerId}`;
    }
    return this.request(url);
  }

  async deletePost(postId: string, _userId: string): Promise<ApiResponse> {
    return this.request(`/api/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  // Notifications APIs
  async getNotifications(userId: string, limit = 50, offset = 0): Promise<ApiResponse> {
    return this.request(`/api/notifications/${userId}?limit=${limit}&offset=${offset}`);
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<ApiResponse> {
    return this.request(`/api/notifications/${userId}/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(userId: string): Promise<ApiResponse> {
    return this.request(`/api/notifications/${userId}/read-all`, {
      method: 'POST',
    });
  }

  async deleteNotification(userId: string, notificationId: string): Promise<ApiResponse> {
    return this.request(`/api/notifications/${userId}/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async clearAllNotifications(userId: string): Promise<ApiResponse> {
    return this.request(`/api/notifications/${userId}`, {
      method: 'DELETE',
    });
  }

  // Admin APIs
  async adminWipeAllData(): Promise<ApiResponse> {
    // WARNING: This should be protected by server-side admin auth
    return this.request('/api/admin/wipe', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  }

  // Chat APIs
  async getUserConversations(userId: string): Promise<ApiResponse> {
    return this.request(`/api/chat/conversations/user/${userId}`);
  }

  async createConversation(conversationData: any): Promise<ApiResponse> {
    return this.request('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(conversationData),
    });
  }

  async sendMessage(messageData: any): Promise<ApiResponse> {
    return this.request('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse> {
    return this.request(
      `/api/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    );
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<ApiResponse> {
    return this.request(`/api/chat/messages/${messageId}/read`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async markAllMessagesAsRead(conversationId: string, userId: string): Promise<ApiResponse> {
    return this.request(`/api/chat/conversations/${conversationId}/read-all`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async searchMessages(query: string, userId: string): Promise<ApiResponse> {
    return this.request(`/api/chat/search?q=${encodeURIComponent(query)}&user_id=${userId}`);
  }

  // Community Members APIs
  async getCommunityMembers(filters: {
    status?: 'active' | 'inactive';
    search?: string;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    return this.request(`/api/community-members${qs ? `?${qs}` : ''}`);
  }

  async getCommunityMember(memberId: string): Promise<ApiResponse> {
    return this.request(`/api/community-members/${memberId}`);
  }

  async createCommunityMember(memberData: {
    name: string;
    role: string;
    description?: string;
    contact_info?: {
      email?: string;
      phone?: string;
      [key: string]: any;
    };
    status?: 'active' | 'inactive';
    created_by?: string;
  }): Promise<ApiResponse> {
    return this.request('/api/community-members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateCommunityMember(
    memberId: string,
    updateData: {
      name?: string;
      role?: string;
      description?: string;
      contact_info?: {
        email?: string;
        phone?: string;
        [key: string]: any;
      };
      status?: 'active' | 'inactive';
    }
  ): Promise<ApiResponse> {
    return this.request(`/api/community-members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCommunityMember(memberId: string): Promise<ApiResponse> {
    return this.request(`/api/community-members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // CRM APIs
  get crm() {
    return {
      getAll: (filters: any) => {
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).length > 0) {
            params.append(k, String(v));
          }
        });
        return this.request(`/api/crm?${params.toString()}`);
      },
      create: (data: any) => this.request('/api/crm', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => this.request(`/api/crm/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) => this.request(`/api/crm/${id}`, { method: 'DELETE' }),
    };
  }

  // Admin Files APIs
  get adminFiles() {
    return {
      getAll: (filters: any) => {
        const params = new URLSearchParams();
        Object.entries(filters || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).length > 0) {
            params.append(k, String(v));
          }
        });
        return this.request(`/api/admin-files?${params.toString()}`);
      },
      create: (data: any) => this.request('/api/admin-files', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id: string) => this.request(`/api/admin-files/${id}`, { method: 'DELETE' }),
    };
  }

  // Admin Tables APIs
  get adminTables() {
    return {
      getAll: () => this.request('/api/admin/tables'),
      getById: (id: string, includeRows?: boolean, page?: number, limit?: number) => {
        const params = new URLSearchParams();
        if (includeRows) params.append('includeRows', 'true');
        if (page) params.append('page', String(page));
        if (limit) params.append('limit', String(limit));
        return this.request(`/api/admin/tables/${id}?${params.toString()}`);
      },
      create: (data: any) => this.request('/api/admin/tables', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => this.request(`/api/admin/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => this.request(`/api/admin/tables/${id}`, { method: 'DELETE' }),
      getRows: (tableId: string, page?: number, limit?: number) => {
        const params = new URLSearchParams();
        if (page) params.append('page', String(page));
        if (limit) params.append('limit', String(limit));
        return this.request(`/api/admin/tables/${tableId}/rows?${params.toString()}`);
      },
      createRow: (tableId: string, data: any) => this.request(`/api/admin/tables/${tableId}/rows`, { method: 'POST', body: JSON.stringify(data) }),
      updateRow: (tableId: string, rowId: string, data: any) => this.request(`/api/admin/tables/${tableId}/rows/${rowId}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteRow: (tableId: string, rowId: string) => this.request(`/api/admin/tables/${tableId}/rows/${rowId}`, { method: 'DELETE' }),
    };
  }

  // Legacy API fallback
  async legacyRequest<T>(collection: string, userId: string, itemId?: string): Promise<T | null> {
    try {
      const endpoint = itemId
        ? `/api/items/${collection}/${userId}/${itemId}`
        : `/api/items/${collection}/${userId}`;

      const response = await this.request<T>(endpoint);
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error('Legacy API request failed:', error);
      return null;
    }
  }

  // Utility methods
  isBackendAvailable(): boolean {
    return true; // Backend is always available
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(this.buildUrl('/health/redis'));
      return res.ok;
    } catch {
      return false;
    }
  }
}

// Lazy singleton to avoid circular dependency issues during module initialization
let _apiServiceInstance: ApiService | null = null;

function getApiServiceInstance(): ApiService {
  if (_apiServiceInstance === null) {
    _apiServiceInstance = new ApiService();
  }
  return _apiServiceInstance;
}

// Export as a Proxy to ensure lazy initialization
export const apiService = new Proxy({} as ApiService, {
  get(target, prop) {
    const instance = getApiServiceInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export default apiService;
