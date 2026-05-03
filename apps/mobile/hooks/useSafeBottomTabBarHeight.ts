import * as React from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Tab bar height when nested under a bottom tab navigator; otherwise `0`.
 *
 * Use instead of `useBottomTabBarHeight()` for screens also registered on the root stack
 * (e.g. NotificationsScreen, ChatListScreen) where tab bar context is absent.
 */
export function useSafeBottomTabBarHeight(): number {
  const height = React.useContext(BottomTabBarHeightContext);
  return typeof height === 'number' ? height : 0;
}
