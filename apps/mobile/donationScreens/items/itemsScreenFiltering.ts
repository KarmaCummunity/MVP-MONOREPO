import type { FeedItem } from '../../types/feed';
import { ITEM_CATEGORY_DEFS } from './itemCategoryDefs';
import type { DonationItem, ItemType } from './itemsScreen.types';

/** Narrow translator for `items` namespace keys (avoids coupling to i18next `TFunction` branding). */
export type ItemsScreenTranslate = (key: string, options?: Record<string, unknown>) => string;

const FILTER_BASE_KEYS = [
  'free',
  'likeNew',
  'used',
  'forParts',
  'pickup',
  'paidDelivery',
  'accessibility',
] as const;

const SORT_KEYS = ['alphabetical', 'byLocation', 'byDate', 'byRating', 'byRelevance'] as const;

export function buildItemsSortOptionLabels(t: ItemsScreenTranslate): string[] {
  const ns = { ns: 'items' as const };
  return SORT_KEYS.map((k) => t(`donationScreen.sorts.${k}`, ns));
}

export function buildItemsFilterOptionLabels(t: ItemsScreenTranslate, itemType: ItemType): string[] {
  const ns = { ns: 'items' as const };
  const cats = ITEM_CATEGORY_DEFS.map((d) => t(d.labelKey, ns));
  let typeSpecificKeys: readonly string[];
  if (itemType === 'furniture') {
    typeSpecificKeys = ['tags.sofas', 'tags.wardrobes', 'tags.beds'] as const;
  } else if (itemType === 'clothes') {
    typeSpecificKeys = ['tags.men', 'tags.women', 'tags.kids'] as const;
  } else {
    typeSpecificKeys = ['tags.kitchen', 'tags.electronics', 'tags.toys'] as const;
  }
  const typeSpecific = typeSpecificKeys.map((k) => t(`donationScreen.${k}`, ns));
  const base = FILTER_BASE_KEYS.map((k) => t(`donationScreen.filters.${k}`, ns));
  const includeRequests = t('donationScreen.filters.includeRequests', ns);
  return [...cats, ...typeSpecific, ...base, includeRequests];
}

export type ItemsScreenSortLabels = Record<(typeof SORT_KEYS)[number], string>;

export function buildItemsSortLabels(t: ItemsScreenTranslate): ItemsScreenSortLabels {
  const ns = { ns: 'items' as const };
  return {
    alphabetical: t('donationScreen.sorts.alphabetical', ns),
    byLocation: t('donationScreen.sorts.byLocation', ns),
    byDate: t('donationScreen.sorts.byDate', ns),
    byRating: t('donationScreen.sorts.byRating', ns),
    byRelevance: t('donationScreen.sorts.byRelevance', ns),
  };
}

export function buildItemsConditionFilterLabels(t: ItemsScreenTranslate): Pick<
  Record<string, string>,
  'likeNew' | 'used' | 'forParts'
> & { free: string } {
  const ns = { ns: 'items' as const };
  return {
    free: t('donationScreen.filters.free', ns),
    likeNew: t('donationScreen.filters.likeNew', ns),
    used: t('donationScreen.filters.used', ns),
    forParts: t('donationScreen.filters.forParts', ns),
  };
}

function categoryIdFromFilterLabel(
  filterLabel: string,
  t: ItemsScreenTranslate,
): import('./itemsScreen.types').ItemType | undefined {
  const ns = { ns: 'items' as const };
  for (const def of ITEM_CATEGORY_DEFS) {
    if (filterLabel === t(def.labelKey, ns)) {
      return def.id;
    }
  }
  return undefined;
}

export function getFilteredItemsForItemsScreen(params: {
  mode: boolean;
  allPosts: FeedItem[];
  allItems: DonationItem[];
  searchQuery: string;
  selectedFilters: string[];
  selectedSorts: string[];
  sortLabels: ItemsScreenSortLabels;
  conditionLabels: ReturnType<typeof buildItemsConditionFilterLabels>;
  t: ItemsScreenTranslate;
}): FeedItem[] | DonationItem[] {
  const {
    mode,
    allPosts,
    allItems,
    searchQuery,
    selectedFilters,
    selectedSorts,
    sortLabels,
    conditionLabels,
    t,
  } = params;

  if (mode) {
    let filtered = [...allPosts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.user?.name || '').toLowerCase().includes(q),
      );
    }

    const includeRequestsLabel = t('donationScreen.filters.includeRequests', { ns: 'items' });
    if (!selectedFilters.includes(includeRequestsLabel)) {
      filtered = filtered.filter((p) => p.intent !== 'request');
    }

    if (selectedFilters.length > 0) {
      selectedFilters.forEach((f) => {
        const catId = categoryIdFromFilterLabel(f, t);
        if (catId) {
          filtered = filtered.filter((post) => post.category === catId);
        }
      });
    }

    const selectedSort = selectedSorts[0];
    if (selectedSort === sortLabels.alphabetical) {
      filtered.sort((a, b) => a.title.localeCompare(b.title, 'he'));
    } else if (selectedSort === sortLabels.byDate) {
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (selectedSort === sortLabels.byRating || selectedSort === sortLabels.byRelevance) {
      filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return filtered;
  }

  let filtered = [...allItems];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.city || '').toLowerCase().includes(q) ||
        (i.address || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.tags || '').toLowerCase().includes(q),
    );
  }

  const ns = { ns: 'items' as const };
  const typeTagLabels = new Set([
    t('donationScreen.tags.sofas', ns),
    t('donationScreen.tags.wardrobes', ns),
    t('donationScreen.tags.beds', ns),
    t('donationScreen.tags.men', ns),
    t('donationScreen.tags.women', ns),
    t('donationScreen.tags.kids', ns),
    t('donationScreen.tags.kitchen', ns),
    t('donationScreen.tags.electronics', ns),
    t('donationScreen.tags.toys', ns),
  ]);

  if (selectedFilters.length > 0) {
    selectedFilters.forEach((f) => {
      if (f === conditionLabels.free) {
        filtered = filtered.filter((i) => (i.price ?? 0) === 0);
      }
      if (f === conditionLabels.likeNew) {
        filtered = filtered.filter((i) => i.condition === 'like_new' || i.condition === 'new');
      }
      if (f === conditionLabels.used) {
        filtered = filtered.filter((i) => i.condition === 'used');
      }
      if (f === conditionLabels.forParts) {
        filtered = filtered.filter((i) => i.condition === 'for_parts');
      }

      const catId = categoryIdFromFilterLabel(f, t);
      if (catId) {
        filtered = filtered.filter((item) => item.category === catId);
      }

      if (typeTagLabels.has(f)) {
        filtered = filtered.filter((item) => {
          const tagsArray = typeof item.tags === 'string' ? item.tags.split(',') : (item.tags ?? []);
          return tagsArray.includes(f);
        });
      }
    });
  }

  const selectedSort = selectedSorts[0];
  if (selectedSort === sortLabels.alphabetical) {
    filtered.sort((a, b) => a.title.localeCompare(b.title, 'he'));
  } else if (selectedSort === sortLabels.byLocation) {
    filtered.sort((a, b) => (a.city || '').localeCompare(b.city || '', 'he'));
  } else if (selectedSort === sortLabels.byDate) {
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } else if (selectedSort === sortLabels.byRating || selectedSort === sortLabels.byRelevance) {
    filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return filtered;
}
