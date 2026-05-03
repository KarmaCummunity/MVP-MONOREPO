import { apiService } from '../../utils/apiService';
import { USE_BACKEND } from '../../utils/dbConfig';
import { mapApiUserToCharacter, type ApiUserPayload } from './mapApiUserToCharacter';
import { persistProfileUserIdSnapshot } from './profileRouteParams';
import type { CharacterType } from './profileScreenTypes';

function minimalFallbackCharacter(userId: string, userName: string): CharacterType {
  return {
    id: userId,
    name: userName || 'ללא שם',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: '',
    karmaPoints: 0,
    completedTasks: 0,
    roles: ['user'],
    isVerified: false,
    location: { city: 'ישראל', country: 'IL' },
    joinDate: new Date().toISOString(),
    interests: [],
  };
}

type ResolveParams = Readonly<{
  externalUserId: string;
  externalUserName: string | undefined;
  externalCharacterData: CharacterType | undefined;
}>;

/**
 * Resolves the character payload shown when viewing another user's profile.
 */
export async function resolveExternalProfileUser({
  externalUserId,
  externalUserName,
  externalCharacterData,
}: ResolveParams): Promise<CharacterType | null> {
  if (!externalCharacterData && USE_BACKEND) {
    try {
      const response = await apiService.getUserById(externalUserId);
      if (response.success && response.data) {
        const mappedUser = mapApiUserToCharacter(response.data as ApiUserPayload, externalUserName);
        persistProfileUserIdSnapshot(externalUserId, mappedUser.name);
        return mappedUser;
      }
      console.warn('User not found:', externalUserId);
      return null;
    } catch (err) {
      console.error('❌ Load user error:', err);
      if (externalUserName && externalUserName !== 'משתמש לא ידוע') {
        return minimalFallbackCharacter(externalUserId, externalUserName);
      }
      return null;
    }
  }

  if (externalCharacterData) {
    return externalCharacterData;
  }

  if (!USE_BACKEND && externalUserName) {
    return minimalFallbackCharacter(externalUserId, externalUserName);
  }

  return null;
}
