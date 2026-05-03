import { useCallback, useState } from 'react';
import type { ProfileRecentActivity } from './profileScreenActivity.types';
import { fetchRecentActivitiesForProfile } from './profileRecentActivities.loader';

export function useProfileRecentActivities(
  isOwnProfile: boolean,
  selectedUser: { id?: string } | null | undefined,
): Readonly<{
  recentActivities: ProfileRecentActivity[];
  loadRecentActivities: () => Promise<void>;
}> {
  const [recentActivities, setRecentActivities] = useState<ProfileRecentActivity[]>([]);

  const loadRecentActivities = useCallback(async () => {
    try {
      if (!isOwnProfile || !selectedUser?.id) {
        setRecentActivities([]);
        return;
      }
      const formatted = await fetchRecentActivitiesForProfile(selectedUser.id, selectedUser.id);
      setRecentActivities(formatted);
    } catch (error) {
      console.error('❌ Load recent activities error:', error);
      setRecentActivities([]);
    }
  }, [isOwnProfile, selectedUser]);

  return { recentActivities, loadRecentActivities };
}
