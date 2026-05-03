import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import type { ListRenderItemInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons as Icon } from '@expo/vector-icons';
import colors from '../../globals/colors';
import { useUser } from '../../stores/userStore';
import PostReelItem from '../../components/Feed/PostReelItem';
import { FeedItem } from '../../types/feed';
import { mapPostToFeedItemForItemsScreen } from './mapPostToFeedItemForItemsScreen';
import { postsService } from '../../utils/postsService';
import { isMobileWeb } from '../../globals/responsive';
import { createShadowStyle } from '../../globals/styles';
import { DonationsStackParamList } from '../../globals/types';

const { width } = Dimensions.get('window');
const SEARCH_GRID_COLUMNS = 2;
const COLUMN_GAP = 12;

export default function ItemsHistoryScreen() {
  const navigation = useNavigation<NavigationProp<DonationsStackParamList>>();
  const { t: ti } = useTranslation('items');
  const { selectedUser } = useUser();

  const [type, setType] = useState<'given' | 'received'>('given');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const screenPadding = isMobileWeb() ? 8 : 16;

  const loadHistory = useCallback(async () => {
    if (!selectedUser?.id) return;
    setLoading(true);
    try {
      const uid = selectedUser.id;
      let fetchedItems: FeedItem[] = [];

      if (type === 'given') {
        const res = await postsService.getUserPosts(uid, uid, 100);
        if (res.success && Array.isArray(res.data)) {
          fetchedItems = res.data
            .map(mapPostToFeedItemForItemsScreen)
            .filter((item): item is FeedItem => item !== null);
        }
      } else {
        // Mocking received items
        fetchedItems = [];
      }

      const filtered = fetchedItems.filter(item => {
        const isClosed = item.status === 'closed' || item.status === 'completed' || item.status === 'hidden';
        return status === 'closed' ? isClosed : !isClosed;
      });

      setItems(filtered);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUser?.id, type, status]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const renderItem = useCallback(({ item }: ListRenderItemInfo<FeedItem>) => {
    const availableWidth = width - screenPadding * 2;
    const totalGaps = SEARCH_GRID_COLUMNS - 1;
    const itemWidth = (availableWidth - totalGaps * COLUMN_GAP) / SEARCH_GRID_COLUMNS;

    return (
      <PostReelItem
        item={item}
        cardWidth={itemWidth}
        numColumns={SEARCH_GRID_COLUMNS}
        onPress={(i) => navigation.navigate('PostDetailScreen', { postId: i.id, initialItem: i })}
      />
    );
  }, [navigation, screenPadding]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-forward" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ti('donationScreen.menu.history')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.togglesContainer}>
          {/* Type Toggle: Given/Received */}
          <View style={styles.toggleBackground}>
            <TouchableOpacity
              onPress={() => setType('given')}
              style={[styles.toggleSegment, type === 'given' && styles.toggleSelected]}
            >
              <Text style={[styles.toggleText, type === 'given' && styles.toggleTextSelected]}>
                {ti('history.given', { defaultValue: 'נתתי' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType('received')}
              style={[styles.toggleSegment, type === 'received' && styles.toggleSelected]}
            >
              <Text style={[styles.toggleText, type === 'received' && styles.toggleTextSelected]}>
                {ti('history.received', { defaultValue: 'קיבלתי' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Toggle: Open/Closed */}
          <View style={styles.toggleBackground}>
            <TouchableOpacity
              onPress={() => setStatus('open')}
              style={[styles.toggleSegment, status === 'open' && styles.toggleSelected]}
            >
              <Text style={[styles.toggleText, status === 'open' && styles.toggleTextSelected]}>
                {ti('history.open', { defaultValue: 'פתוח' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStatus('closed')}
              style={[styles.toggleSegment, status === 'closed' && styles.toggleSelected]}
            >
              <Text style={[styles.toggleText, status === 'closed' && styles.toggleTextSelected]}>
                {ti('history.closed', { defaultValue: 'סגור' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={SEARCH_GRID_COLUMNS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="archive-outline" size={80} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{ti('history.empty', { defaultValue: 'אין פריטים להצגה' })}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  togglesContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  toggleBackground: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 25,
    padding: 4,
    flex: 1,
    height: 44,
  },
  toggleSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  toggleSelected: {
    backgroundColor: colors.white,
    ...createShadowStyle(colors.black, { width: 0, height: 2 }, 0.1, 4),
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextSelected: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 16,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
    paddingHorizontal: 16,
    marginBottom: COLUMN_GAP,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
