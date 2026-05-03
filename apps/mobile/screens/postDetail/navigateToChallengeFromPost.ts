import { CommonActions } from '@react-navigation/native';

type TabLikeParent = {
  navigate?: (name: string, params?: object) => void;
  getState?: () => { routeNames?: string[] };
};

/** Opens challenge details from post detail (Donations tab or cross-stack fallback). */
export function navigateToChallengeFromPost(
  navigation: { getParent?: () => unknown; dispatch: (a: unknown) => void },
  challengeId: string,
): void {
  const tabNav = navigation.getParent?.() as TabLikeParent | undefined;
  const tabState =
    tabNav && typeof tabNav.getState === 'function' ? tabNav.getState() : undefined;
  if (tabState?.routeNames?.includes('DonationsTab') && tabNav?.navigate) {
    tabNav.navigate('DonationsTab', {
      screen: 'ChallengeDetailsScreen',
      params: { challengeId },
    });
    return;
  }
  navigation.dispatch(
    CommonActions.navigate({
      name: 'HomeStack',
      params: {
        screen: 'DonationsTab',
        params: {
          screen: 'ChallengeDetailsScreen',
          params: { challengeId },
        },
      },
    } as never),
  );
}
