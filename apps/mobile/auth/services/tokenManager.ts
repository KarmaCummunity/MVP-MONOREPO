import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

class TokenManager {
  private isSecureStorageAvailable: boolean | null = null;

  async init() {
    if (Platform.OS !== 'web') {
      this.isSecureStorageAvailable = await SecureStore.isAvailableAsync();
    } else {
      this.isSecureStorageAvailable = false;
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    if (this.isSecureStorageAvailable === null) await this.init();

    if (this.isSecureStorageAvailable) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (this.isSecureStorageAvailable === null) await this.init();

    if (this.isSecureStorageAvailable) {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    if (this.isSecureStorageAvailable === null) await this.init();

    if (this.isSecureStorageAvailable) {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async clearTokens() {
    if (this.isSecureStorageAvailable === null) await this.init();

    if (this.isSecureStorageAvailable) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } else {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export const tokenManager = new TokenManager();
