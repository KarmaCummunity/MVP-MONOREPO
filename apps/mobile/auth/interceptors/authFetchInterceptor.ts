import { tokenManager } from '../services/tokenManager';
import { useAuthStore } from '../store/authStore';
import { getAuth } from 'firebase/auth';

import { API_BASE_URL as CONFIG_API_URL } from '../../utils/config.constants';

const API_URL = CONFIG_API_URL;

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let token = await tokenManager.getAccessToken();
  
  // Fallback to Firebase ID token if JWT is missing
  if (!token) {
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
    } catch (e) {
      console.warn('Failed to get Firebase token fallback', e);
    }
  }

  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshToken = await tokenManager.getRefreshToken();
      
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data.accessToken) {
              await tokenManager.setTokens(data.accessToken, data.refreshToken || refreshToken);
              isRefreshing = false;
              onRefreshed(data.accessToken);
              
              headers.set('Authorization', `Bearer ${data.accessToken}`);
              return await fetch(url, { ...options, headers });
            }
          }
        } catch (error) {
          console.error('Failed to refresh token', error);
        }
      }
      
      // If we reach here, refresh failed or no refresh token
      isRefreshing = false;
      refreshSubscribers = [];
      await tokenManager.clearTokens();
      useAuthStore.getState().clearSession();
      // Throw or return the 401 response so caller knows
      return response;
    } else {
      // Wait for refresh to complete
      return new Promise((resolve) => {
        subscribeTokenRefresh(async (newToken: string) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          resolve(await fetch(url, { ...options, headers }));
        });
      });
    }
  }

  return response;
};
