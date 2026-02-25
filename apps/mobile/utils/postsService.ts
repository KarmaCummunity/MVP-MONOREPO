// File overview:
// - Purpose: Service for handling post likes and comments operations
// - Provides: toggleLike, getComments, addComment, deleteComment, toggleCommentLike
// - Communicates with: /api/posts/* endpoints on the backend

import { API_BASE_URL } from './config.constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PostsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

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

class PostsService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      // Try to get JWT access token from AsyncStorage
      const jwtToken = await AsyncStorage.getItem('jwt_access_token');

      if (jwtToken) {
        // Check if token is expired
        const expiresAt = await AsyncStorage.getItem('jwt_token_expires_at');
        if (expiresAt && parseInt(expiresAt) > Date.now()) {
          return jwtToken;
        }
      }

      // Fallback: Try to get Firebase ID token
      try {
        const { getFirebase } = await import('./firebaseClient');
        const { getAuth } = await import('firebase/auth');
        const { app } = getFirebase();
        const auth = getAuth(app);
        const user = auth.currentUser;

        if (user) {
          const token = await user.getIdToken();
          return token;
        }
      } catch (firebaseError) {
        console.warn('Firebase auth not available:', firebaseError);
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<PostsApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

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

      console.log(`🌐 PostsService Request: ${config.method || 'GET'} ${url}`, {
        hasAuth: !!authToken,
        authTokenLength: authToken?.length || 0
      });

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ PostsService Error: ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          data,
          endpoint,
          hasAuth: !!authToken
        });
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      console.log(`✅ PostsService Response: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`❌ PostsService Network Error:`, error);
      return {
        success: false,
        error: 'Network error - please check your connection',
      };
    }
  }

  // ============================================
  // POSTS
  // ============================================

  /**
   * Get main feed posts
   * @param limit - Max number of results
   * @param offset - Pagination offset
   * @param userId - Optional: filter by user ID (for profile feed) or for "friends" logic checking (backend dependant)
   * @param postType - Optional: filter by post type (e.g., 'item', 'ride', 'donation')
   * @param itemId - Optional: filter by item_id
   * @param rideId - Optional: filter by ride_id
   */
  async getPosts(
    limit = 20,
    offset = 0,
    userId?: string,
    postType?: string,
    itemId?: string,
    rideId?: string
  ): Promise<PostsApiResponse<any[]>> {
    let url = `/api/posts?limit=${limit}&offset=${offset}`;
    if (userId) {
      url += `&user_id=${userId}`;
    }
    if (postType) {
      url += `&post_type=${encodeURIComponent(postType)}`;
    }
    if (itemId) {
      url += `&item_id=${encodeURIComponent(itemId)}`;
    }
    if (rideId) {
      url += `&ride_id=${encodeURIComponent(rideId)}`;
    }
    return this.request<any[]>(url);
  }

  /**
   * Get specific user's posts
   * @param targetUserId - The ID of the user whose posts to fetch
   * @param viewerId - The ID of the current viewer (to check likes)
   * @param limit
   * @param offset
   */
  async getUserPosts(targetUserId: string, viewerId?: string, limit = 20, _offset = 0): Promise<PostsApiResponse<any[]>> {
    let url = `/api/posts/user/${targetUserId}?limit=${limit}`;
    if (viewerId) {
      url += `&viewer_id=${viewerId}`;
    }
    // Note: Pagination offset support might need to be added to backend getUserPosts if missing, 
    // likely it supports it or we rely on limit for now.
    return this.request<any[]>(url);
  }

  // ============================================
  // LIKES
  // ============================================

  /**
   * Toggle like on a post (like if not liked, unlike if liked)
   * @param postId - The ID of the post
   * @param userId - The ID of the user
   * @returns {Promise<PostsApiResponse<LikeResponse>>}
   */
  async togglePostLike(postId: string, userId: string): Promise<PostsApiResponse<LikeResponse>> {
    return this.request<LikeResponse>(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  /**
   * Check if a user has liked a post
   * @param postId - The ID of the post
   * @param userId - The ID of the user
   */
  async checkUserLikedPost(postId: string, userId: string): Promise<PostsApiResponse<{ is_liked: boolean }>> {
    return this.request<{ is_liked: boolean }>(`/api/posts/${postId}/likes/check/${userId}`);
  }

  /**
   * Get list of users who liked a post
   * @param postId - The ID of the post
   * @param limit - Max number of results (default 50)
   * @param offset - Pagination offset (default 0)
   */
  async getPostLikes(postId: string, limit = 50, offset = 0): Promise<PostsApiResponse<any[]>> {
    return this.request<any[]>(`/api/posts/${postId}/likes?limit=${limit}&offset=${offset}`);
  }

  // ============================================
  // COMMENTS
  // ============================================

  /**
   * Get all comments for a post
   * @param postId - The ID of the post
   * @param viewerId - Optional viewer ID to check if they liked each comment
   * @param limit - Max number of results (default 50)
   * @param offset - Pagination offset (default 0)
   */
  async getPostComments(
    postId: string,
    viewerId?: string,
    limit = 50,
    offset = 0
  ): Promise<PostsApiResponse<Comment[]>> {
    let url = `/api/posts/${postId}/comments?limit=${limit}&offset=${offset}`;
    if (viewerId) {
      url += `&viewer_id=${viewerId}`;
    }
    return this.request<Comment[]>(url);
  }

  /**
   * Add a comment to a post
   * @param postId - The ID of the post
   * @param userId - The ID of the user
   * @param text - The comment text (max 2000 characters)
   */
  async addComment(postId: string, userId: string, text: string): Promise<PostsApiResponse<CommentResponse>> {
    return this.request<CommentResponse>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, text }),
    });
  }

  /**
   * Update a comment (only owner can update)
   * @param postId - The ID of the post
   * @param commentId - The ID of the comment
   * @param userId - The ID of the user (must be comment owner)
   * @param text - The new comment text
   */
  async updateComment(
    postId: string,
    commentId: string,
    userId: string,
    text: string
  ): Promise<PostsApiResponse<Comment>> {
    return this.request<Comment>(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, text }),
    });
  }

  /**
   * Delete a comment (only owner can delete)
   * @param postId - The ID of the post
   * @param commentId - The ID of the comment
   * @param userId - The ID of the user (must be comment owner)
   */
  async deleteComment(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<PostsApiResponse<{ deleted_comment_id: string; comments_count: number }>> {
    return this.request<{ deleted_comment_id: string; comments_count: number }>(
      `/api/posts/${postId}/comments/${commentId}?user_id=${userId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Toggle like on a comment
   * @param postId - The ID of the post
   * @param commentId - The ID of the comment
   * @param userId - The ID of the user
   */
  async toggleCommentLike(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<PostsApiResponse<CommentLikeResponse>> {
    return this.request<CommentLikeResponse>(
      `/api/posts/${postId}/comments/${commentId}/like`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
    );
  }

  // ============================================
  // POST MANAGEMENT
  // ============================================

  /**
   * Update a post (title, description, image)
   * @param postId - The ID of the post
   * @param userId - The ID of the user (must be post owner)
   * @param updates - Object containing fields to update
   */
  async updatePost(
    postId: string,
    userId: string,
    updates: { title?: string; description?: string; image?: string }
  ): Promise<PostsApiResponse<any>> {
    return this.request<any>(`/api/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, ...updates }),
    });
  }

  /**
   * Hide a post (soft delete - sets status to 'hidden')
   * @param postId - The ID of the post
   * @param userId - The ID of the user (must be post owner)
   */
  async hidePost(postId: string, userId: string): Promise<PostsApiResponse<{ status: string }>> {
    return this.request<{ status: string }>(`/api/posts/${postId}/hide`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  /**
   * Unhide a post (restore from hidden status)
   * @param postId - The ID of the post
   * @param userId - The ID of the user (must be post owner)
   */
  async unhidePost(postId: string, userId: string): Promise<PostsApiResponse<{ status: string }>> {
    return this.request<{ status: string }>(`/api/posts/${postId}/unhide`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
}

// Export singleton instance
export const postsService = new PostsService();

// Export default for backward compatibility
export default postsService;



