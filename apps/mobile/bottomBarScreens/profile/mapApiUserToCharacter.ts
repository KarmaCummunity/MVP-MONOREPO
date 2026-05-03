import type { CharacterType } from './profileScreenTypes';

export type ApiUserPayload = Readonly<{
  id: string | number;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  bio?: string;
  karma_points?: number;
  posts_count?: number;
  postsCount?: number;
  roles?: string[];
  is_verified?: boolean;
  city?: string;
  country?: string;
  join_date?: string;
  created_at?: string;
  interests?: string[];
  parent_manager_id?: string | null;
}>;

export function mapApiUserToCharacter(
  userData: ApiUserPayload,
  externalUserName: string | undefined,
): CharacterType {
  return {
    id: String(userData.id),
    name: userData.name || externalUserName || 'ללא שם',
    avatar: userData.avatar_url || userData.avatar || 'https://i.pravatar.cc/150?img=1',
    bio: userData.bio || '',
    karmaPoints: userData.karma_points || 0,
    postsCount: userData.posts_count ?? userData.postsCount ?? 0,
    completedTasks: 0,
    roles: userData.roles || ['user'],
    isVerified: userData.is_verified || false,
    location: userData.city
      ? {
          city: userData.city,
          country: userData.country || 'ישראל',
        }
      : { city: 'ישראל', country: 'IL' },
    joinDate: userData.join_date || userData.created_at || new Date().toISOString(),
    interests: userData.interests || [],
    parentManagerId: userData.parent_manager_id || null,
  };
}
