import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import type { ListRenderItem } from 'react-native';
import type { ItemsScreenTranslate } from './itemsScreenFiltering';
import { isLandscape } from '../../globals/responsive';
import VerticalGridSlider from '../../components/VerticalGridSlider';
import DonationStatsFooter from '../../components/DonationStatsFooter';
import AddLinkComponent from '../../components/AddLinkComponent';
import type { FeedItem } from '../../types/feed';
import { itemsScreenStyles } from './itemsScreen.styles';

type Styles = typeof itemsScreenStyles;

export type ItemsScreenSearchModeProps = Readonly<{
  styles: Styles;
  t: ItemsScreenTranslate;
  numColumns: number;
  onNumColumnsChange: (n: number) => void;
  filteredPosts: FeedItem[];
  renderItem: ListRenderItem<FeedItem>;
  renderEmpty: () => React.ReactElement;
  screenPadding: number;
  searchQuery: string;
  selectedFilters: string[];
  selectedSorts: string[];
  onClearAll: () => void;
  onOpenRequestComposer: () => void;
}>;

export function ItemsScreenSearchMode({
  styles: s,
  t,
  numColumns,
  onNumColumnsChange,
  filteredPosts,
  renderItem,
  renderEmpty,
  screenPadding,
  searchQuery,
  selectedFilters,
  selectedSorts,
  onClearAll,
  onOpenRequestComposer,
}: ItemsScreenSearchModeProps) {
  const listHeader = (
    <>
      <TouchableOpacity style={s.offerButton} onPress={onOpenRequestComposer}>
        <Text style={s.offerButtonText}>{t('donationScreen.search.requestCta')}</Text>
      </TouchableOpacity>
      <View style={s.headerRow}>
        <Text style={s.sectionTitle}>
          {searchQuery || selectedFilters.length > 0
            ? t('donationScreen.search.sectionFiltered')
            : t('donationScreen.search.sectionRecommended')}
        </Text>
        {Boolean(searchQuery || selectedFilters.length > 0 || selectedSorts.length > 0) && (
          <TouchableOpacity style={s.clearButton} onPress={onClearAll}>
            <Text style={s.clearButtonText}>{t('donationScreen.search.clearAll')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const listFooter = (
    <>
      <View style={s.section}>
        <DonationStatsFooter
          stats={[
            { label: t('donationScreen.search.statsPosts'), value: filteredPosts.length, icon: 'cube-outline' },
            {
              label: t('donationScreen.search.statsLikes'),
              value: filteredPosts.reduce((sum, p) => sum + (p.likes || 0), 0),
              icon: 'heart-outline',
            },
            {
              label: t('donationScreen.search.statsComments'),
              value: filteredPosts.reduce((sum, p) => sum + (p.comments || 0), 0),
              icon: 'chatbubble-outline',
            },
          ]}
        />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('donationScreen.search.usefulLinks')}</Text>
        <AddLinkComponent category="items" />
      </View>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <VerticalGridSlider
        numColumns={numColumns}
        onNumColumnsChange={onNumColumnsChange}
        style={{
          top: 10,
          left: 4,
        }}
      />
      <FlatList
        style={s.container}
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        key={numColumns}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? s.columnWrapper : undefined}
        contentContainerStyle={[
          s.scrollContent,
          isLandscape() && { paddingHorizontal: 32 },
          { paddingHorizontal: screenPadding },
        ]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
