import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Alert, Dimensions } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../globals/colors';
import HeaderComp from '../components/HeaderComp';
import ItemDetailsModal from '../components/ItemDetailsModal';
import { Ionicons as Icon } from '@expo/vector-icons';
import { db } from '../utils/databaseService';
import { useToast } from '../utils/toastService';
import { isMobileWeb } from '../globals/responsive';
import PostReelItem from '../components/Feed/PostReelItem';
import { FeedItem } from '../types/feed';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { useTranslation } from 'react-i18next';
import { itemsScreenStyles } from './items/itemsScreen.styles';
import { useItemsScreenData } from './items/useItemsScreenData';
import { useItemsScreenFilters } from './items/useItemsScreenFilters';
import { ItemsScreenSearchMode } from './items/ItemsScreenSearchMode';
import { ItemsScreenOfferMode } from './items/ItemsScreenOfferMode';
import type { ItemsScreenProps, ItemType, DonationItem } from './items/itemsScreen.types';
import { logger } from '../utils/loggerService';
import { usePostComposerStore } from '../stores/postComposerStore';
import { navigateToPostDetail } from '../utils/navigateToPostDetail';
import ItemsFilterModal from './items/components/ItemsFilterModal';

export type { ItemsScreenProps } from './items/itemsScreen.types';

function promptLargeImageAlert(
  ti: TFunction,
  tc: TFunction,
  base64: string,
  resolve: (value: string | null) => void,
): void {
  Alert.alert(ti('donationScreen.alerts.imageLargeTitle'), ti('donationScreen.alerts.imageLargeMessage'), [
    { text: ti('donationScreen.alerts.imageLargeContinue'), onPress: () => resolve(base64) },
    { text: tc('cancel'), onPress: () => resolve(null), style: 'cancel' },
  ]);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export default function ItemsScreen({ navigation, route }: ItemsScreenProps) {
  const { ToastComponent } = useToast();
  const { t: tc } = useTranslation('common');
  const { t: ti } = useTranslation('items');

  const itemType: ItemType = ((route?.params as { itemType?: ItemType } | undefined)?.itemType as ItemType) || 'general';
  const data = useItemsScreenData(navigation, route, itemType);
  const { openComposer } = usePostComposerStore();
  const filters = useItemsScreenFilters(data.filterDataSlice, itemType, ti);
  const [openRequestsExpanded, setOpenRequestsExpanded] = useState(false);

  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  const titleInputRef = useRef<TextInput | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [price, setPrice] = useState('0');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used' | 'for_parts' | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ItemType>('general');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { mode, setMode, loadItems, handlePostClosed, handlePostReopen, selectedUser, setAllItems } = data;

  const {
    searchQuery,
    selectedFilters,
    selectedSorts,
    filterOptions,
    sortOptions,
    filteredPosts,
    advancedFilters,
    setAdvancedFilters,
    handleSearch,
    handleClearAll,
  } = filters;

  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport,
  } = usePostMenu({
    onReopen: (item) => {
      handlePostReopen(item).catch((err: unknown) => {
        console.error('Error reopening post from items screen:', err);
      });
    },
  });

  useFocusEffect(
    useCallback(() => {
      setTitle('');
      setDescription('');
      setPrice('0');
      setCity('');
      setAddress('');
      setQty(1);
      setCondition('');
      setImageUri('');
      setSelectedCategory('general');
    }, []),
  );

  const convertImageToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await readBlobAsDataUrl(blob);
      const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
      if (sizeInMB > 5) {
        return await new Promise<string | null>((resolve) => {
          promptLargeImageAlert(ti, tc, base64, resolve);
        });
      }
      return base64;
    } catch {
      Alert.alert(ti('donationScreen.alerts.convertErrorTitle'), ti('donationScreen.alerts.convertErrorMessage'));
      return null;
    }
  };

  const { width } = Dimensions.get('window');
  const isMobile = isMobileWeb();
  const SEARCH_GRID_COLUMNS = 2;
  /** Horizontal gap between the two grid cards (must match `columnWrapper.gap` in itemsScreen.styles). */
  const COLUMN_GAP = 12;

  const HORIZONTAL_PADDING = isMobile ? 8 : 16;
  const screenPadding = HORIZONTAL_PADDING;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(ti('donationScreen.alerts.permissionTitle'), ti('donationScreen.alerts.permissionMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(ti('donationScreen.alerts.pickImageErrorTitle'), ti('donationScreen.alerts.pickImageErrorMessage'));
    }
  };

  const handleCreateItem = async () => {
    try {
      if (!title.trim()) {
        Alert.alert(ti('donationScreen.alerts.titleRequiredTitle'), ti('donationScreen.alerts.titleRequiredMessage'));
        titleInputRef.current?.focus();
        return;
      }

      if (!selectedUser?.id) {
        Alert.alert(ti('donationScreen.alerts.loginRequiredTitle'), ti('donationScreen.alerts.loginRequiredMessage'));
        return;
      }
      const uid = selectedUser.id;

      let imageBase64: string | null = null;
      if (imageUri) {
        imageBase64 = await convertImageToBase64(imageUri);
      }

      const itemData: Record<string, unknown> = {
        owner_id: uid,
        title: title.trim(),
        category: selectedCategory || itemType,
        intent: 'give',
      };

      if (description.trim()) itemData.description = description.trim();
      if (condition) itemData.condition = condition;
      if (city.trim()) itemData.city = city.trim();
      if (address.trim()) itemData.address = address.trim();
      if (price && Number(price) > 0) itemData.price = Number(price);
      if (imageBase64) itemData.image_base64 = imageBase64;
      if (selectedFilters.length > 0) itemData.tags = selectedFilters.join(',');
      if (qty && qty > 1) itemData.quantity = qty;

      const savedItem = await db.createDedicatedItem(itemData);

      const newItemForState: DonationItem = {
        id: (savedItem as { id?: string }).id || (savedItem as { data?: { id?: string } }).data?.id || '',
        ownerId: uid,
        title: itemData.title as string,
        description: itemData.description as string | undefined,
        category: itemData.category as ItemType,
        condition: itemData.condition as DonationItem['condition'],
        city: itemData.city as string | undefined,
        address: itemData.address as string | undefined,
        coordinates: itemData.coordinates as string | undefined,
        price: itemData.price as number | undefined,
        image_base64: itemData.image_base64 as string | undefined,
        rating: itemData.rating as number | undefined,
        timestamp: new Date().toISOString(),
        tags: itemData.tags as string | undefined,
        qty: itemData.quantity as number | undefined,
        delivery_method: itemData.delivery_method as string | undefined,
        status: itemData.status as string | undefined,
        isDeleted: false,
      };

      setAllItems((prev) => [newItemForState, ...prev]);
      loadItems().catch((err: unknown) => {
        console.error('Error reloading items after create:', err);
      });

      setTitle('');
      setDescription('');
      setPrice('0');
      setCity('');
      setAddress('');
      setQty(1);
      setCondition('');
      setImageUri('');
      setSelectedCategory('general');
      handleClearAll();

      const savedTitle = (savedItem as { title?: string }).title ?? title.trim();
      Alert.alert(ti('donationScreen.alerts.saveSuccessTitle'), ti('donationScreen.alerts.saveSuccessMessage', { title: savedTitle }), [
        { text: tc('confirm'), style: 'default' },
      ]);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string }; status?: number }; message?: string };
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error';
      Alert.alert(ti('donationScreen.alerts.saveErrorTitle'), errorMessage, [{ text: tc('cancel'), style: 'cancel' }]);
    }
  };

  const menuOptions = useMemo(
    () => [
      ti('donationScreen.menu.history'),
      ti('donationScreen.menu.settings'),
      ti('donationScreen.menu.help'),
    ],
    [ti],
  );

  const handleCloseModal = () => {
    setShowItemModal(false);
    setSelectedItem(null);
  };

  /** filterOptions are already translated labels — pass through for chips/modal. */
  const formatItemsFilterLabel = useCallback((key: string) => key, []);

  const onFeedPostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );
  const onFeedCommentPress = useCallback((feedItem: FeedItem) => {
    logger.debug('ItemsScreen', 'Comment pressed', { feedItemId: feedItem.id });
  }, []);

  const renderPostItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedItem>) => {
      const availableWidth = width - screenPadding * 2;
      const totalGaps = SEARCH_GRID_COLUMNS - 1;
      const itemWidth = (availableWidth - totalGaps * COLUMN_GAP) / SEARCH_GRID_COLUMNS;

      return (
        <PostReelItem
          item={item}
          cardWidth={itemWidth}
          numColumns={SEARCH_GRID_COLUMNS}
          onPress={onFeedPostPress}
          onCommentPress={onFeedCommentPress}
          onMorePress={handleMorePress}
          onPostClosed={handlePostClosed}
        />
      );
    },
    [screenPadding, width, COLUMN_GAP, handleMorePress, handlePostClosed, onFeedPostPress, onFeedCommentPress],
  );

  const renderEmptyPosts = useCallback(
    () => (
      <View style={itemsScreenStyles.emptyState}>
        <Icon name="search-outline" size={48} color={colors.textSecondary} />
        <Text style={itemsScreenStyles.emptyStateTitle}>{ti('donationScreen.search.emptyTitle')}</Text>
        <Text style={itemsScreenStyles.emptyStateText}>{ti('donationScreen.search.emptySubtitle')}</Text>
        {(searchQuery || selectedFilters.length > 0 || selectedSorts.length > 0 || advancedFilters.categories.length > 0 || advancedFilters.condition.length > 0 || advancedFilters.address !== '') && (
          <TouchableOpacity style={itemsScreenStyles.emptyStateClearButton} onPress={handleClearAll}>
            <Text style={itemsScreenStyles.emptyStateClearButtonText}>{ti('donationScreen.search.clearAll')}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [searchQuery, selectedFilters, selectedSorts, advancedFilters, handleClearAll, ti],
  );

  return (
    <SafeAreaView style={itemsScreenStyles.safeArea}>
      <HeaderComp
        mode={mode}
        menuOptions={menuOptions}
        onToggleMode={() => setMode(!mode)}
        onSelectMenuItem={(o) => {
          if (o === ti('donationScreen.menu.history')) {
            navigation.navigate('ItemsHistoryScreen');
          } else {
            Alert.alert(ti('donationScreen.alerts.menuAlertTitle'), ti('donationScreen.alerts.menuAlertSelected', { option: o }));
          }
        }}
        title=""
        placeholder={mode ? ti('donationScreen.search.headerPlaceholder') : ti('donationScreen.offer.headerPlaceholder')}
        filterOptions={filterOptions}
        sortOptions={sortOptions}
        searchData={data.allItems}
        onSearch={handleSearch}
        formatFilterLabel={formatItemsFilterLabel}
        onFilterPress={() => setFilterModalVisible(true)}
      />

      <ItemsFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        initialFilters={advancedFilters}
        onApply={(newFilters) => {
          setAdvancedFilters(newFilters);
        }}
      />

      {mode ? (
        <ItemsScreenSearchMode
          styles={itemsScreenStyles}
          t={ti}
          filteredPosts={filteredPosts}
          renderItem={renderPostItem}
          renderEmpty={renderEmptyPosts}
          screenPadding={screenPadding}
          searchQuery={searchQuery}
          selectedFilters={selectedFilters}
          selectedSorts={selectedSorts}
          onClearAll={handleClearAll}
          onOpenRequestComposer={() => openComposer({ intent: 'request', category: itemType })}
        />
      ) : (
        <ItemsScreenOfferMode
          styles={itemsScreenStyles}
          t={ti}
          titleInputRef={titleInputRef}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          showCategoryDropdown={showCategoryDropdown}
          onShowCategoryDropdown={setShowCategoryDropdown}
          city={city}
          onCityChange={setCity}
          address={address}
          onAddressChange={setAddress}
          qty={qty}
          onDecQty={() => setQty(Math.max(1, qty - 1))}
          onIncQty={() => setQty(qty + 1)}
          condition={condition}
          onConditionChange={(k) => setCondition(k)}
          imageUri={imageUri}
          onPickImage={pickImage}
          onRemoveImage={() => setImageUri('')}
          onPublish={handleCreateItem}
          canPublish={!!title.trim()}
          openRequestsExpanded={openRequestsExpanded}
          onToggleOpenRequests={() => setOpenRequestsExpanded((prev) => !prev)}
          openRequestPosts={data.openRequestPosts}
          recentPosts={data.recentPosts}
          onMorePress={handleMorePress}
          onPostClosed={handlePostClosed}
          onPostPress={onFeedPostPress}
        />
      )}

      <ItemDetailsModal
        visible={showItemModal}
        onClose={handleCloseModal}
        item={selectedItem}
        type="item"
        navigation={navigation}
      />

      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={tc('options')}
        anchorPosition={modalPosition}
      />
      <ReportPostModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={false}
      />
      {ToastComponent}
    </SafeAreaView>
  );
}
