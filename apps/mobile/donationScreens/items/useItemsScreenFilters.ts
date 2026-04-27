import { useCallback, useMemo, useState } from 'react';
import type { FeedItem } from '../../types/feed';
import type { DonationItem, ItemType } from './itemsScreen.types';
import {
  buildItemsConditionFilterLabels,
  buildItemsFilterOptionLabels,
  buildItemsSortLabels,
  buildItemsSortOptionLabels,
  getFilteredItemsForItemsScreen,
  type ItemsScreenTranslate,
} from './itemsScreenFiltering';

/** Read-only slice from data hook — no mirrored filter state to avoid update loops. */
export type ItemsScreenFilterDataSlice = {
  mode: boolean;
  allPosts: FeedItem[];
  allItems: DonationItem[];
};

export function useItemsScreenFilters(data: ItemsScreenFilterDataSlice, itemType: ItemType, t: ItemsScreenTranslate) {
  const { mode, allPosts, allItems } = data;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);

  const sortLabels = useMemo(() => buildItemsSortLabels(t), [t]);
  const conditionLabels = useMemo(() => buildItemsConditionFilterLabels(t), [t]);

  const filterOptions = useMemo(() => buildItemsFilterOptionLabels(t, itemType), [t, itemType]);

  const sortOptions = useMemo(() => buildItemsSortOptionLabels(t), [t]);

  const filteredPosts = useMemo(() => {
    if (!mode) {
      return [];
    }
    return getFilteredItemsForItemsScreen({
      mode: true,
      allPosts,
      allItems,
      searchQuery,
      selectedFilters,
      selectedSorts,
      sortLabels,
      conditionLabels,
      t,
    }) as FeedItem[];
  }, [mode, allPosts, allItems, searchQuery, selectedFilters, selectedSorts, sortLabels, conditionLabels, t]);

  const handleSearch = useCallback(
    (query: string, filters: string[] = [], sorts: string[] = []) => {
      setSearchQuery(query);
      setSelectedFilters(filters);
      setSelectedSorts(sorts);
    },
    [],
  );

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedFilters([]);
    setSelectedSorts([]);
  }, []);

  return {
    searchQuery,
    selectedFilters,
    selectedSorts,
    filterOptions,
    sortOptions,
    filteredPosts,
    handleSearch,
    handleClearAll,
  };
}
