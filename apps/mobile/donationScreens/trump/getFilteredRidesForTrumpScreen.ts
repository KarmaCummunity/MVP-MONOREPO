import type { TFunction } from 'i18next';

import type { FeedItem } from '../../types/feed';

type RideLike = {
  price?: number;
  from?: string;
  to?: string;
  driverName?: string;
  category?: string;
  noSmoking?: boolean;
  petsAllowed?: boolean;
  kidsFriendly?: boolean;
  date?: string;
};

function filterPostsBySearchQuery(posts: FeedItem[], searchQuery: string): FeedItem[] {
  if (!searchQuery) return posts;
  const q = searchQuery.toLowerCase();
  return posts.filter(
    (post) =>
      (post.user?.name?.toLowerCase()?.includes(q) ?? false) ||
      (post.from?.toLowerCase()?.includes(q) ?? false) ||
      (post.to?.toLowerCase()?.includes(q) ?? false) ||
      (post.title?.toLowerCase()?.includes(q) ?? false) ||
      (post.description?.toLowerCase()?.includes(q) ?? false)
  );
}

function applyPostModeFilters(posts: FeedItem[], selectedFilters: string[]): FeedItem[] {
  if (selectedFilters.length === 0) return posts;
  if (!selectedFilters.includes('noCostSharing')) return posts;
  return posts.filter((p) => (p.price ?? 0) === 0);
}

function sortPostsInPlace(posts: FeedItem[], selectedSort: string | undefined, t: TFunction): void {
  if (!selectedSort) return;
  if (selectedSort === t('trump:sort.byPrice')) {
    posts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (selectedSort === t('trump:sort.byDate')) {
    posts.sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
  }
}

export function getFilteredPostsForTrumpMode(
  allPosts: FeedItem[],
  searchQuery: string,
  selectedFilters: string[],
  selectedSorts: string[],
  t: TFunction
): FeedItem[] {
  let filtered = filterPostsBySearchQuery([...allPosts], searchQuery);
  filtered = applyPostModeFilters(filtered, selectedFilters);
  sortPostsInPlace(filtered, selectedSorts[0], t);
  return filtered;
}

function filterRidesBySearchQuery(rides: RideLike[], searchQuery: string): RideLike[] {
  if (!searchQuery) return rides;
  const q = searchQuery.toLowerCase();
  return rides.filter(
    (ride) =>
      (ride.driverName?.toLowerCase()?.includes(q) ?? false) ||
      (ride.from?.toLowerCase()?.includes(q) ?? false) ||
      (ride.to?.toLowerCase()?.includes(q) ?? false) ||
      (ride.category?.toLowerCase()?.includes(q) ?? false)
  );
}

function applyRideModeFilters(rides: RideLike[], selectedFilters: string[]): RideLike[] {
  if (selectedFilters.length === 0) return rides;
  let filtered = rides;
  if (selectedFilters.includes('noCostSharing')) {
    filtered = filtered.filter((r) => (r.price ?? 0) === 0);
  }
  if (selectedFilters.includes('noSmoking')) {
    filtered = filtered.filter((r) => r.noSmoking);
  }
  if (selectedFilters.includes('withPets')) {
    filtered = filtered.filter((r) => r.petsAllowed);
  }
  if (selectedFilters.includes('withKids')) {
    filtered = filtered.filter((r) => r.kidsFriendly);
  }
  return filtered;
}

function sortRidesInPlace(
  rides: RideLike[],
  selectedSort: string | undefined,
  t: TFunction
): void {
  if (!selectedSort) return;
  if (selectedSort === t('trump:sort.byPrice')) {
    rides.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (selectedSort === t('trump:sort.byDate')) {
    rides.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }
}

export function getFilteredRidesForListMode(
  allRides: RideLike[],
  searchQuery: string,
  selectedFilters: string[],
  selectedSorts: string[],
  t: TFunction
): RideLike[] {
  let filtered = filterRidesBySearchQuery([...allRides], searchQuery);
  filtered = applyRideModeFilters(filtered, selectedFilters);
  sortRidesInPlace(filtered, selectedSorts[0], t);
  return filtered;
}
