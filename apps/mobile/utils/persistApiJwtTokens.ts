import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Store API JWTs where `apiService` expects them (refresh + authenticated requests).
 */
export async function persistApiJwtTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): Promise<void> {
  await AsyncStorage.setItem('jwt_access_token', tokens.accessToken);
  await AsyncStorage.setItem('jwt_refresh_token', tokens.refreshToken);
  await AsyncStorage.setItem(
    'jwt_token_expires_at',
    String(Date.now() + tokens.expiresIn * 1000),
  );
}
