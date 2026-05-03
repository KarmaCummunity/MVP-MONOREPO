import { useSafeBottomTabBarHeight } from '../../hooks/useSafeBottomTabBarHeight';
import { ProfileScreenContent } from './ProfileScreenContent';

/** Own profile in the bottom tab navigator — supplies tab bar height for padding. */
export function ProfileScreenWithTabBar() {
  const tabBarHeight = useSafeBottomTabBarHeight();
  return <ProfileScreenContent tabBarHeight={tabBarHeight} />;
}
