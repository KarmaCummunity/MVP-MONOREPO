import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ProfileScreenContent } from './ProfileScreenContent';

/** Own profile in the bottom tab navigator — supplies tab bar height for padding. */
export function ProfileScreenWithTabBar() {
  const tabBarHeight = useBottomTabBarHeight();
  return <ProfileScreenContent tabBarHeight={tabBarHeight} />;
}
