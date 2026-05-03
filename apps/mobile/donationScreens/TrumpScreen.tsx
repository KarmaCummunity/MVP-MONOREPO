import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { NavigationProp, ParamListBase, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';

import HeaderComp from '../components/HeaderComp';
import DonationStatsFooter from '../components/DonationStatsFooter';
import ItemDetailsModal from '../components/ItemDetailsModal';
import { useUser } from '../stores/userStore';
import ScrollContainer from '../components/ScrollContainer';
import AddLinkComponent from '../components/AddLinkComponent';
import { useToast } from '../utils/toastService';
import { isMobileWeb } from '../globals/responsive';

import RideOfferForm from '../components/rides/RideOfferForm';
import PostReelItem from '../components/Feed/PostReelItem';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { FeedItem } from '../types/feed';
import { navigateToPostDetail } from '../utils/navigateToPostDetail';
import { computeFeedCellWidth } from '../utils/feedLayout';

import { trumpScreenStyles as localStyles } from './trump/trumpScreen.styles';
import { useTrumpScreenData } from './trump/useTrumpScreenData';
import { useTrumpOfferRideFlow } from './trump/useTrumpOfferRideFlow';
import { usePostComposerStore } from '../stores/postComposerStore';

export default function TrumpScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const { ToastComponent } = useToast();
  const route = useRoute();
  const routeParams = route.params as { mode?: string } | undefined;
  const initialMode = routeParams?.mode === 'offer' ? false : true;
  const [mode, setMode] = useState(initialMode);
  const [isModeLoaded, setIsModeLoaded] = useState(false);

  const { t } = useTranslation(['donations', 'common', 'trump', 'search', 'items', 'comments']);

  const { selectedUser } = useUser();
  const { openComposer } = usePostComposerStore();
  const [openRequestsExpanded, setOpenRequestsExpanded] = useState(false);
  const [recentRidesExpanded, setRecentRidesExpanded] = useState(false);

  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  // 1. Load persisted mode from AsyncStorage or route params
  useEffect(() => {
    const loadMode = async () => {
      // If mode is explicitly in route params, use it
      if (routeParams?.mode && routeParams.mode !== 'undefined' && routeParams.mode !== 'null') {
        const wantsSearch = routeParams.mode === 'search';
        setMode((prev) => (prev !== wantsSearch ? wantsSearch : prev));
        setIsModeLoaded(true);
        return;
      }

      // Otherwise, try to load from storage
      try {
        const savedMode = await AsyncStorage.getItem('trump_screen_mode');
        if (savedMode === 'offer') {
          setMode(false);
        } else if (savedMode === 'search') {
          setMode(true);
        }
      } catch (e) {
        console.error('Failed to load trump screen mode', e);
      } finally {
        setIsModeLoaded(true);
      }
    };
    loadMode();
  }, [routeParams?.mode]);

  // 2. Persist mode to AsyncStorage when it changes
  useEffect(() => {
    if (isModeLoaded) {
      AsyncStorage.setItem('trump_screen_mode', mode ? 'search' : 'offer').catch((e) =>
        console.error('Failed to save trump screen mode', e),
      );
    }
  }, [mode, isModeLoaded]);

  // 3. Keep route params in sync with the current mode
  useEffect(() => {
    if (!isModeLoaded) return;

    const newModeString = mode ? 'search' : 'offer';
    const currentModeParam = routeParams?.mode;

    if (!currentModeParam || currentModeParam === 'undefined' || currentModeParam === 'null') {
      (navigation as { setParams: (p: object) => void }).setParams({ mode: newModeString });
      return;
    }

    if (newModeString !== currentModeParam) {
      (navigation as { setParams: (p: object) => void }).setParams({ mode: newModeString });
    }
  }, [mode, navigation, routeParams?.mode, isModeLoaded]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const trumpData = useTrumpScreenData({
    mode,
    selectedUserId: selectedUser?.id,
    t,
  });

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
      trumpData.handlePostReopen(item).catch((err: unknown) => {
        console.error('Error reopening post from Trump screen:', err);
      });
    },
  });

  const offer = useTrumpOfferRideFlow({
    mode,
    selectedUser,
    loadRides: trumpData.loadRides,
    setSearchQuery: trumpData.setSearchQuery,
  });

  const [selectedRide, setSelectedRide] = useState<any | null>(null);
  const [showRideModal, setShowRideModal] = useState(false);

  const filtersObj = (t('trump:filters', { returnObjects: true }) as Record<string, string>) || {};
  const trumpFilterOptions = Object.keys(filtersObj);
  const trumpSortOptions = (t('trump:sorts', { returnObjects: true }) as unknown as string[]) || [];

  const formatTrumpFilterLabel = useCallback(
    (key: string) => t(`trump:filters.${key}`),
    [t],
  );

  const handleSearch = (query: string, filters?: string[], sorts?: string[]) => {
    if (!mode) {
      offer.setToLocation(query);
    } else {
      trumpData.setSearchQuery(query);
      trumpData.setSelectedFilters(filters || []);
      trumpData.setSelectedSorts(sorts || []);
    }
  };

  const handleToggleMode = () => setMode(!mode);

  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const isMobile = isMobileWeb();
  const SEARCH_GRID_COLUMNS = 2;
  /** Horizontal gap between the two grid cards (must match `columnWrapper.gap` in trumpScreen.styles). */
  const COLUMN_GAP = 8;

  const HORIZONTAL_PADDING = isMobile ? 8 : 16;
  const screenPadding = HORIZONTAL_PADDING;

  const handleCloseRideModal = () => {
    setShowRideModal(false);
    setSelectedRide(null);
  };

  const handleFeedPostPress = useCallback(
    (feedItem: FeedItem) => {
      navigateToPostDetail(navigation, { postId: feedItem.id, initialItem: feedItem });
    },
    [navigation],
  );
  const noopCommentPress = useCallback((_feedItem: FeedItem) => {}, []);

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
          onPress={handleFeedPostPress}
          onCommentPress={noopCommentPress}
          onMorePress={handleMorePress}
          onPostClosed={trumpData.handlePostClosed}
        />
      );
    },
    [screenPadding, width, COLUMN_GAP, handleMorePress, trumpData.handlePostClosed, handleFeedPostPress, noopCommentPress],
  );

  const renderEmptyPosts = useCallback(
    () => (
      <View style={localStyles.emptyState}>
        <Text style={localStyles.emptyStateTitle}>{t('trump:ui.noRidesFoundTitle')}</Text>
        <Text style={localStyles.emptyStateText}>{t('trump:ui.noRidesFoundBody')}</Text>
      </View>
    ),
    [t]
  );

  if (!isMounted) {
    return <View style={localStyles.safeArea} />;
  }

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <HeaderComp
        mode={mode}
        menuOptions={[t('trump:menu.history'), t('trump:menu.settings')]}
        onToggleMode={handleToggleMode}

        onSelectMenuItem={(o) => {
          if (o === t('trump:menu.history')) {
            navigation.navigate('ItemsHistoryScreen');
          } else if (o === t('trump:menu.settings')) {
            navigation.navigate('SettingsScreen');
          }
        }}
        title=""
        placeholder={mode ? t('trump:ui.searchPlaceholder.seek') : t('trump:ui.searchPlaceholder.offer')}
        filterOptions={trumpFilterOptions}
        sortOptions={trumpSortOptions}
        searchData={trumpData.allRides}
        onSearch={handleSearch}
        hideSortButton={!mode}
        formatFilterLabel={formatTrumpFilterLabel}
      />

      {!mode ? (
        <ScrollContainer
          style={localStyles.container}
          contentStyle={localStyles.scrollContent}
          keyboardShouldPersistTaps="always"
        >
          <TouchableOpacity
            style={localStyles.openRequestsToggle}
            onPress={() => setOpenRequestsExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={[localStyles.sectionTitle, { marginBottom: 0, textAlign: 'right' }]}>{t('trump:ui.openRequestsList')}</Text>
            <Ionicons name={openRequestsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </TouchableOpacity>
          {openRequestsExpanded && (
            <View style={[localStyles.section, { width: '100%' }]}>
              {trumpData.openRequestPosts.length === 0 ? (
                <Text style={localStyles.emptyStateText}>{t('trump:ui.noOpenRequests')}</Text>
              ) : (
                <View
                  style={localStyles.gridContainer}
                  onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
                >
                  {gridWidth > 0 &&
                    trumpData.openRequestPosts.map((post, index) => {
                      const itemWidth =
                        Math.floor(
                          computeFeedCellWidth({
                            windowWidth: gridWidth,
                            horizontalPadding: 0,
                            numColumns: 2,
                            columnGap: 8,
                          })
                        ) - 1;
                      const isEven = index % 2 === 0;
                      return (
                        <View
                          key={post.id}
                          style={[
                            localStyles.gridItemWrapper,
                            { width: itemWidth, marginLeft: isEven ? 0 : 8 },
                          ]}
                        >
                          <PostReelItem
                            item={post}
                            cardWidth={itemWidth}
                            numColumns={2}
                            onPress={() => {}}
                            onCommentPress={() => {}}
                            onMorePress={handleMorePress}
                            onPostClosed={trumpData.handlePostClosed}
                          />
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          )}
          <RideOfferForm
            destination={offer.toLocation}
            onDestinationChange={offer.setToLocation}
            fromLocation={offer.fromLocation}
            onFromLocationChange={offer.setFromLocation}
            useCurrentLocation={offer.useCurrentLocation}
            onToggleCurrentLocation={offer.setUseCurrentLocation}
            detectedAddress={offer.detectedAddress}
            isLocating={offer.isLocating}
            isLocationError={offer.isLocationError}
            departureTime={offer.departureTime}
            onDepartureTimeChange={offer.setDepartureTime}
            immediateDeparture={offer.immediateDeparture}
            onToggleImmediateDeparture={offer.setImmediateDeparture}
            leavingToday={offer.leavingToday}
            onToggleLeavingToday={offer.setLeavingToday}
            rideDate={offer.rideDate}
            onDateChange={offer.handleDateChange}
            isRecurring={offer.isRecurring}
            onToggleRecurring={offer.setIsRecurring}
            recurrenceFrequency={offer.recurrenceFrequency}
            onRecurrenceFrequencyChange={offer.setRecurrenceFrequency}
            recurrenceUnit={offer.recurrenceUnit}
            onRecurrenceUnitChange={offer.setRecurrenceUnit}
            seats={offer.seats}
            onSeatsChange={offer.setSeats}
            price={offer.price}
            onPriceChange={offer.setPrice}
            selectedTags={offer.selectedFormTags}
            onToggleTag={(tag) => {
              offer.setSelectedFormTags((prev) =>
                prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
              );
            }}
            availableTags={trumpFilterOptions}
            onSubmit={offer.handleCreateRide}
            isValid={offer.isFormValid()}
            hideDestinationInput
            isSubmitting={offer.isPublishing}
          />

          <TouchableOpacity
            style={localStyles.openRequestsToggle}
            onPress={() => setRecentRidesExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={[localStyles.sectionTitle, { marginBottom: 0, textAlign: 'right' }]}>{t('trump:ui.yourRecentRides')}</Text>
            <Ionicons name={recentRidesExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </TouchableOpacity>
          {recentRidesExpanded && (
            <View style={localStyles.section}>
              {trumpData.recentPosts.length === 0 ? (
                <Text style={localStyles.emptyStateText}>{t('trump:ui.noRecentRides')}</Text>
              ) : (
                trumpData.recentPosts.map((post) => {
                  const containerPadding = 16;
                  const historyCardWidth = width - containerPadding * 2;
                  return (
                    <View key={post.id} style={{ marginBottom: 16, width: '100%' }}>
                      <PostReelItem
                        item={post}
                        cardWidth={historyCardWidth}
                        numColumns={1}
                        onPress={handleFeedPostPress}
                        onCommentPress={() => {}}
                        onMorePress={handleMorePress}
                        onPostClosed={trumpData.handlePostClosed}
                      />
                    </View>
                  );
                })
              )}
            </View>
          )}

          <View style={[localStyles.section, { marginTop: 30, paddingBottom: 20 }]}>
            <View
              style={{
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={localStyles.sectionTitle}>{t('trump:ui.whatsappGroups')}</Text>
            </View>
            <AddLinkComponent category="trump" />
          </View>
        </ScrollContainer>
      ) : (
        <View style={localStyles.searchContainer}>
          <FlatList
            style={{ flex: 1 }}
            data={trumpData.filteredPosts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id || String(item.timestamp)}
            numColumns={SEARCH_GRID_COLUMNS}
            columnWrapperStyle={localStyles.columnWrapper}
            contentContainerStyle={[
              localStyles.resultsList,
              { paddingHorizontal: screenPadding },
            ]}
            ListHeaderComponent={
              <View>
                <TouchableOpacity
                  style={localStyles.offerButton}
                  onPress={() => openComposer({ intent: 'request', category: 'trump' })}
                  activeOpacity={0.85}
                >
                  <Text style={localStyles.offerButtonText}>{t('trump:ui.requestCta')}</Text>
                </TouchableOpacity>
                <View style={localStyles.resultsHeader}>
                  <Text style={localStyles.resultsTitle}>
                    {trumpData.searchQuery
                      ? `${t('trump:ui.searchResultsPrefix')} "${trumpData.searchQuery}"`
                      : `${t('trump:ui.availableRides')} (${trumpData.filteredPosts.length})`}
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={renderEmptyPosts}
            ListFooterComponent={
              <View style={[localStyles.section, { marginTop: 30, paddingBottom: 40 }]}>
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={localStyles.sectionTitle}>{t('trump:ui.whatsappGroups')}</Text>
                </View>
                <AddLinkComponent category="trump" />
              </View>
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      <ItemDetailsModal
        visible={showRideModal}
        onClose={handleCloseRideModal}
        item={selectedRide}
        type="ride"
        navigation={navigation}
      />

      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={t('common.options') || 'Options'}
        anchorPosition={modalPosition}
      />
      <ReportPostModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        isLoading={false}
      />

      {mode && (
        <DonationStatsFooter
          stats={[
            {
              label: t('trump:stats.availableRides') || 'זמינים',
              value: trumpData.filteredPosts.length,
              icon: 'car-outline',
            },
            {
              label: t('items:statsLikes') || 'לייקים',
              value: trumpData.filteredPosts.reduce((sum, p) => sum + (p.likes || 0), 0),
              icon: 'heart-outline',
            },
            {
              label: t('comments:title') || 'תגובות',
              value: trumpData.filteredPosts.reduce((sum, p) => sum + (p.comments || 0), 0),
              icon: 'chatbubble-outline',
            },

          ]}
        />
      )}
      {ToastComponent}
    </SafeAreaView>
  );
}
