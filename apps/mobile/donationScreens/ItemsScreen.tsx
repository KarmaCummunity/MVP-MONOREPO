import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, Image, Modal, FlatList, Dimensions, Platform } from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, type RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS, COMPONENT_SIZES } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import DonationStatsFooter from '../components/DonationStatsFooter';
import ScrollContainer from '../components/ScrollContainer';
import ItemDetailsModal from '../components/ItemDetailsModal';
import AddLinkComponent from '../components/AddLinkComponent';
import { Ionicons as Icon } from '@expo/vector-icons';
import { db } from '../src/infrastructure/database.service';
import { useUser } from '../stores/userStore';
import { biDiTextAlign, rowDirection, isLandscape, marginStartEnd, getScreenInfo, BREAKPOINTS, isMobileWeb } from '../globals/responsive';
import { useToast } from '../utils/toastService';
import VerticalGridSlider from '../components/VerticalGridSlider';
import { postsService } from '../src/services/posts.service';
import PostReelItem from '../components/Feed/PostReelItem';
import { FeedItem } from '../types/feed';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import type { SearchableItem } from '../components/SearchBar';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/loggerService';

type ItemType = 'furniture' | 'clothes' | 'general' | 'books' | 'dry_food' | 'games' | 'electronics' | 'toys' | 'sports' | 'art' | 'kitchen' | 'bathroom' | 'garden' | 'tools' | 'baby' | 'pet' | 'other';

const ITEM_CATEGORY_IDS = [
  'clothes', 'books', 'furniture', 'dry_food', 'games', 'electronics',
  'toys', 'sports', 'art', 'kitchen', 'bathroom', 'garden', 'tools', 'baby', 'pet', 'other',
] as const;
const ITEM_CATEGORY_ICONS: Record<string, string> = {
  clothes: 'shirt-outline', books: 'library-outline', furniture: 'bed-outline',
  dry_food: 'restaurant-outline', games: 'game-controller-outline', electronics: 'phone-portrait-outline',
  toys: 'happy-outline', sports: 'football-outline', art: 'color-palette-outline',
  kitchen: 'cafe-outline', bathroom: 'water-outline', garden: 'leaf-outline',
  tools: 'construct-outline', baby: 'baby-outline', pet: 'paw-outline', other: 'cube-outline',
};

/** Route params for ItemsScreen (itemType and mode for deep linking) */
export type ItemsScreenRouteParams = { itemType?: ItemType; mode?: string } | undefined;

export interface ItemsScreenProps {
  navigation: NavigationProp<ParamListBase> & { setParams?: (params: { mode?: string }) => void };
  route?: RouteProp<{ ItemsScreen: ItemsScreenRouteParams }, 'ItemsScreen'> | { params?: ItemsScreenRouteParams };
}

interface DonationItem {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  category: ItemType;
  condition?: 'new' | 'like_new' | 'used' | 'for_parts';

  // Location fields - separate
  city?: string;
  address?: string;
  coordinates?: string;

  price?: number; // 0 means free
  image_base64?: string; // base64 encoded image
  rating?: number;
  timestamp: string;
  tags?: string; // comma-separated string
  qty?: number;
  delivery_method?: string;
  status?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

const ITEM_FILTER_KEYS = ['free', 'likeNew', 'used', 'forParts', 'selfPickup', 'paidDelivery', 'accessibility'] as const;
const ITEM_SORT_KEYS = ['alphabetical', 'byLocation', 'byDate', 'byRating', 'byRelevance'] as const;

const { SPACING, BORDER_RADIUS, BOTTOM_NAV_HEIGHT } = LAYOUT_CONSTANTS;
const SCROLL_BOTTOM_PADDING = BOTTOM_NAV_HEIGHT + SPACING.LG;
const ITEM_CARD_IMAGE_HEIGHT = COMPONENT_SIZES.AVATAR.XLARGE;
const PREVIEW_IMAGE_SIZE = COMPONENT_SIZES.AVATAR.LARGE;
const DROPDOWN_MAX_HEIGHT = 400;
const INPUT_PADDING = 12;
const TAG_PADDING_H = 10;
const TAG_PADDING_V = 6;
const HIT_SLOP = SPACING.SM;
const INPUT_ADORNMENT_OFFSET = 30;
const PILL_BORDER_RADIUS = 999;
const BUTTON_PADDING_V = 14;
const EMPTY_STATE_PADDING = 40;
const CLEAR_BUTTON_PADDING_H = 20;
const TAGS_GAP = SPACING.XS - 1;

export default function ItemsScreen({ navigation, route }: ItemsScreenProps) {
  const { ToastComponent } = useToast();
  const { t } = useTranslation(['donations', 'common', 'items']);
  const itemType: ItemType = (route?.params?.itemType as ItemType) || 'general';
  const routeParams = route?.params as { mode?: string } | undefined;

  // Get initial mode from URL (deep link) or default to search mode
  // URL mode: 'offer' = false, 'search' = true
  // Default is search mode (true)
  const initialMode = routeParams?.mode === 'offer' ? false : true;
  const [mode, setMode] = useState(initialMode);

  // Post menu hook
  const {
    handleMorePress,
    optionsModalVisible,
    setOptionsModalVisible,
    modalOptions,
    modalPosition,
    reportModalVisible,
    setReportModalVisible,
    selectedPostForReport,
    setSelectedPostForReport
  } = usePostMenu();

  // Report submit handler
  const handleReportSubmit = async (_reason: string) => {
    if (!selectedPostForReport) return;
    // Report functionality can be implemented here if needed
    setReportModalVisible(false);
    setSelectedPostForReport(null);
  };

  // Ref to prevent infinite loop: setParams triggers re-render; navigation ref can change before params propagate
  const hasSetInitialModeRef = useRef(false);
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  // Update mode when route params change (e.g., from deep link)
  useEffect(() => {
    if (routeParams?.mode && routeParams.mode !== 'undefined' && routeParams.mode !== 'null') {
      const newMode = routeParams.mode === 'search';
      if (newMode !== mode) {
        setMode(newMode);
      }
    }
  }, [routeParams?.mode, mode]);

  // Update URL when mode changes (toggle button pressed) or when screen loads without mode
  // NOTE: navigation excluded from deps - it can change on every nav state update, causing
  // effect loops. We use a ref to always have the latest navigation.
  useEffect(() => {
    const nav = navigationRef.current;
    const newMode = mode ? 'search' : 'offer';
    const currentMode = routeParams?.mode;

    // If no mode in URL, set it to search (default) - only once to avoid infinite loop
    if (!currentMode || currentMode === 'undefined' || currentMode === 'null') {
      if (!hasSetInitialModeRef.current) {
        hasSetInitialModeRef.current = true;
        nav.setParams?.({ mode: 'search' });
      }
      return;
    }

    // Only update URL if mode actually changed
    if (newMode !== currentMode) {
      nav.setParams?.({ mode: newMode });
    }
  }, [mode, routeParams?.mode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<DonationItem[]>([]);
  // Records of all items for both modes
  const [allPosts, setAllPosts] = useState<FeedItem[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<FeedItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<FeedItem[]>([]);

  const titleInputRef = useRef<TextInput | null>(null);
  const loadItemsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string>('');
  const [price, setPrice] = useState('0');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used' | 'for_parts' | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ItemType>('general');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const { selectedUser } = useUser();
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

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
    }, [])
  );

  // Convert image URI to base64 with compression
  const convertImageToBase64 = async (uri: string): Promise<string | null> => {
    try {
      logger.debug('ItemsScreen', 'Converting and compressing image');

      // Fetch the image
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create canvas to compress the image
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;

          // Check size and compress if needed
          const sizeInMB = (base64.length * 0.75) / (1024 * 1024); // Approximate size
          logger.debug('ItemsScreen', 'Image size (MB)', { sizeInMB: sizeInMB.toFixed(2) });

          if (sizeInMB > 5) {
            logger.warn('ItemsScreen', 'Image too large, may fail to upload');
            Alert.alert(
              t('common:error'),
              t('items:imageTooLarge', { defaultValue: 'The image you selected is very large. Consider using a smaller image.' }),
              [
                { text: t('items:continueAnyway', { defaultValue: 'Continue anyway' }), onPress: () => resolve(base64) },
                { text: t('common:cancel'), onPress: () => resolve(null), style: 'cancel' }
              ]
            );
          } else {
            logger.debug('ItemsScreen', 'Image converted to base64');
            resolve(base64);
          }
        };
        reader.onerror = (error) => {
          logger.error('ItemsScreen', 'Error converting image', { error });
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      logger.error('ItemsScreen', 'Error in convertImageToBase64', { error });
      Alert.alert(t('common:error'), t('items:convertImageError', { defaultValue: 'Failed to convert the image' }));
      return null;
    }
  };

  const filterOptions = useMemo(() => {
    const allCategories = ITEM_CATEGORY_IDS.map(id => t(`items:categories.${id}`));
    const typeSpecific = itemType === 'furniture'
      ? [t('items:typeSpecific.sofas'), t('items:typeSpecific.wardrobes'), t('items:typeSpecific.beds')]
      : itemType === 'clothes'
        ? [t('items:typeSpecific.men'), t('items:typeSpecific.women'), t('items:typeSpecific.kids')]
        : [t('items:categories.kitchen'), t('items:categories.electronics'), t('items:categories.toys')];
    const filterLabels = ITEM_FILTER_KEYS.map(k => t(`items:filterOptions.${k}`));
    return [...allCategories, ...typeSpecific, ...filterLabels];
  }, [itemType, t]);

  // Author shape from API (may be empty object or full)
  type AuthorLike = { id?: unknown; name?: string | null; avatar_url?: string | null };
  // Helper to map API post to FeedItem (same as useFeedData.mapPostToItem)
  const mapPostToFeedItem = useCallback((post: Record<string, unknown>): FeedItem | null => {
    if (!post || post.id == null) {
      logger.warn('ItemsScreen', 'mapPostToFeedItem: post is null or missing id', { post });
      return null;
    }

    const itemData = (post.item_data as Record<string, unknown> | undefined) || {};
    let _metadata: Record<string, unknown> = {};
    try {
      _metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : (post.metadata as Record<string, unknown>) || {};
    } catch (e) {
      logger.warn('ItemsScreen', 'Failed to parse metadata', { error: e });
    }

    let author: AuthorLike | null = null;
    if (post.author && typeof post.author === 'object' && 'id' in (post.author as object)) {
      author = post.author as AuthorLike;
    } else if (post.author_id != null) {
      author = { id: post.author_id, name: null, avatar_url: null };
    }

    const userId = author?.id != null ? String(author.id) : (post.author_id != null ? String(post.author_id) : 'unknown');
    const userName = (author?.name != null && author.name !== '') ? String(author.name) : t('common:unknownUser');
    const userAvatar = author?.avatar_url != null && author.avatar_url !== '' ? String(author.avatar_url) : undefined;

    if (!userId || userId === 'unknown') {
      logger.warn('ItemsScreen', 'mapPostToFeedItem: post without valid user', { postId: post.id, author_id: post.author_id });
    }

    const itemDataObj = post.item_data as Record<string, unknown> | undefined;
    const rideDataObj = post.ride_data as Record<string, unknown> | undefined;
    const itemStatus: string | undefined = itemDataObj?.status != null ? String(itemDataObj.status) : (rideDataObj?.status != null ? String(rideDataObj.status) : undefined);

    const postId = String(post.id);
    const postType = (post.post_type as FeedItem['type']) || 'post';
    const title = post.title != null ? String(post.title) : t('common:post.noTitle');
    const desc = post.description != null ? String(post.description) : '';
    const images = post.images as unknown[] | undefined;
    const thumb = images && images.length > 0 && images[0] != null ? String(images[0]) : null;
    const likesVal = post.likes != null ? String(post.likes) : '0';
    const commentsVal = post.comments != null ? String(post.comments) : '0';
    const createdAt = post.created_at;
    const createdTime = (typeof createdAt === 'string' || typeof createdAt === 'number') && !isNaN(new Date(createdAt).getTime())
      ? new Date(createdAt).toISOString()
      : new Date().toISOString();
    const categoryVal = (itemData?.category != null ? String(itemData.category) : undefined) ?? ((_metadata?.category != null) ? String(_metadata.category) : undefined);
    const itemId = itemDataObj?.id != null
      ? String(itemDataObj.id)
      : (post.item_id != null && !/^\d{10,13}$/.test(String(post.item_id)) ? String(post.item_id) : undefined);
    const rideId = (post.ride_id != null ? String(post.ride_id) : undefined) ?? (rideDataObj?.id != null ? String(rideDataObj.id) : undefined);
    const taskObj = post.task as Record<string, unknown> | undefined;
    const taskId = (post.task_id != null ? String(post.task_id) : undefined) ?? (taskObj?.id != null ? String(taskObj.id) : undefined);

    return {
      id: postId,
      type: postType,
      subtype: post.post_type as FeedItem['subtype'],
      title,
      description: desc,
      thumbnail: thumb,
      user: {
        id: userId,
        name: userName,
        avatar: userAvatar,
      },
      likes: parseInt(likesVal, 10),
      comments: parseInt(commentsVal, 10),
      isLiked: Boolean(post.is_liked),
      timestamp: createdTime,
      category: categoryVal,
      status: itemStatus,
      itemId,
      rideId,
      taskId,
    };
  }, [t]);

  // Dedicated loader for items/posts, callable after save
  const loadItems = useCallback(async () => {
    try {
      logger.debug('ItemsScreen', 'Loading items/posts from server', { mode, itemType });
      const uid = selectedUser?.id || 'guest';

      if (mode) {
        logger.debug('ItemsScreen', 'Seeker mode: loading item posts');
        try {
          // Load all posts then filter by post_type
          const postsResponse = await postsService.getPosts(200, 0, uid);
          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            const posts = postsResponse.data as Record<string, unknown>[];
            const itemPosts = posts.filter((post) =>
              post.post_type === 'item' || post.post_type === 'donation' || post.item_id
            );

            logger.debug('ItemsScreen', 'Posts loaded', { total: posts.length, itemPosts: itemPosts.length });

            const mappedPosts = itemPosts
              .map(mapPostToFeedItem)
              .filter((post): post is FeedItem =>
                post !== null && post !== undefined && !!post.user && !!post.user.id && !!post.user.name
              );

            setAllPosts(mappedPosts);
            setFilteredPosts(mappedPosts);
            logger.debug('ItemsScreen', 'Item posts loaded successfully', { count: mappedPosts.length });

            if (mappedPosts.length === 0 && itemPosts.length > 0) {
              logger.warn('ItemsScreen', 'Posts exist but mapping failed', { sample: itemPosts[0] });
            }
          } else {
            logger.warn('ItemsScreen', 'Loading posts failed', { error: postsResponse.error });
            setAllPosts([]);
            setFilteredPosts([]);
          }
        } catch (error) {
          logger.error('ItemsScreen', 'Error loading posts', { error });
          setAllPosts([]);
          setFilteredPosts([]);
        }
        return;
      } else {
        logger.debug('ItemsScreen', 'Offerer mode: loading user posts for history', { uid });
        try {
          // Load user's posts
          const { apiService } = await import('../src/api/api.service');
          const postsResponse = await apiService.getUserPosts(uid, 50, uid);

          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            const posts = postsResponse.data as Record<string, unknown>[];
            const itemPosts = posts.filter((post) =>
              post.post_type === 'item' || post.post_type === 'donation' || post.item_id
            );

            const mappedPosts = itemPosts
              .map(mapPostToFeedItem)
              .filter((post): post is FeedItem =>
                post !== null && post !== undefined && !!post.user && !!post.user.id && !!post.user.name
              );

            setRecentPosts(mappedPosts);
            logger.debug('ItemsScreen', 'User posts for history loaded', { count: mappedPosts.length });
          } else {
            logger.warn('ItemsScreen', 'Loading user posts for history failed', { error: postsResponse.error });
            setRecentPosts([]);
          }
        } catch (error) {
          logger.error('ItemsScreen', 'Error loading user posts for history', { error });
          setRecentPosts([]);
        }

        // Still loading items for create/edit if needed
        const serverItems = await db.getDedicatedItemsByOwner(uid);
        type ServerItem = Record<string, unknown>;
        type LocationLike = Record<string, unknown>;
        const displayItems: DonationItem[] = (serverItems || [])
          .filter((item: ServerItem) => {
            const isDeleted = item.is_deleted || item.isDeleted;
            return !isDeleted;
          })
          .map((item: ServerItem) => {
            const loc = item.location && typeof item.location === 'object' ? (item.location as LocationLike) : null;
            return {
              id: String(item.id),
              ownerId: String(item.owner_id ?? item.ownerId ?? ''),
              title: String(item.title ?? ''),
              description: item.description != null ? String(item.description) : undefined,
              category: (item.category as ItemType) ?? itemType,
              condition: item.condition as DonationItem['condition'],
              city: (item.city != null ? String(item.city) : undefined) ?? (loc?.city != null ? String(loc.city) : undefined),
              address: (item.address != null ? String(item.address) : undefined) ?? (loc?.address != null ? String(loc.address) : undefined),
              coordinates: (item.coordinates != null ? String(item.coordinates) : undefined) ?? (loc?.coordinates != null ? String(loc.coordinates) : undefined),
              price: typeof item.price === 'number' ? item.price : undefined,
              image_base64: item.image_base64 != null ? String(item.image_base64) : undefined,
              rating: typeof item.rating === 'number' ? item.rating : undefined,
              timestamp: String(item.created_at ?? item.timestamp ?? ''),
              tags: item.tags != null ? String(item.tags) : undefined,
              qty: typeof item.quantity === 'number' ? item.quantity : (typeof item.qty === 'number' ? item.qty : undefined),
              delivery_method: item.delivery_method != null ? String(item.delivery_method) : undefined,
              status: item.status != null ? String(item.status) : undefined,
              isDeleted: Boolean(item.is_deleted || item.isDeleted),
              deletedAt: item.deleted_at != null ? String(item.deleted_at) : (item.deletedAt != null ? String(item.deletedAt) : undefined),
            };
          });

        const forType = displayItems.filter(i => itemType === 'general' ? true : i.category === itemType);
        setAllItems(forType);
      }

    } catch (error) {
      logger.error('ItemsScreen', 'Error loading items', { error });
      Alert.alert(t('common:error'), t('items:loadItemsError', { defaultValue: 'Failed to load items' }));
      setAllItems([]);
    }
  }, [mode, itemType, selectedUser?.id, mapPostToFeedItem, t]);

  // Store loadItems in ref so it can be used in callbacks without dependency issues
  useEffect(() => {
    loadItemsRef.current = loadItems;
  }, [loadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const getFilteredItems = useCallback(() => {
    // In search mode, filter posts instead of items
    if (mode) {
      let filtered = [...allPosts];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.user?.name || '').toLowerCase().includes(q)
        );
      }

      // Apply filters (category, etc.)
      if (selectedFilters.length > 0) {
        selectedFilters.forEach(f => {
          // Filter by category
          const matchingCategoryId = ITEM_CATEGORY_IDS.find(id => t(`items:categories.${id}`) === f);
          if (matchingCategoryId) {
            filtered = filtered.filter(post => post.category === matchingCategoryId);
          }
        });
      }

      // Sorting
      const selectedSort = selectedSorts[0];
      switch (selectedSort) {
        case t('items:sortOptions.alphabetical'):
          filtered.sort((a, b) => a.title.localeCompare(b.title, 'he'));
          break;
        case t('items:sortOptions.byDate'):
          filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          break;
        case t('items:sortOptions.byRating'):
          filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
        case t('items:sortOptions.byRelevance'):
          filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
      }

      return filtered;
    }

    return []; // Return empty in offer mode as we don't use filteredItems state anymore
  }, [mode, allPosts, searchQuery, selectedFilters, selectedSorts, t]);

  // Update filtered items/posts whenever search/filter/sort changes
  useEffect(() => {
    if (mode) {
      setFilteredPosts(getFilteredItems() as FeedItem[]);
    }
  }, [getFilteredItems, mode]);

  // Calculate grid layout for search mode
  const { width } = Dimensions.get('window');
  const { isTablet, isDesktop } = getScreenInfo();
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;
  const isMobile = isMobileWeb();

  // Initialize with appropriate default, but allow user control via slider
  const [numColumns, setNumColumns] = useState(() => (isTablet || isDesktop || isDesktopWeb) ? 3 : 2);

  // Use same padding values as PostsReelsScreen for consistency
  const HORIZONTAL_PADDING = isMobile ? SPACING.SM : SPACING.MD;
  const _COLUMN_GAP = isMobile ? SPACING.SM : SPACING.MD;
  const screenPadding = HORIZONTAL_PADDING;

  const handleSearch = useCallback((query: string, filters: string[] = [], sorts: string[] = [], _results?: unknown[]) => {
    setSearchQuery(query);
    setSelectedFilters(filters);
    setSelectedSorts(sorts);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedFilters([]);
    setSelectedSorts([]);
  }, []);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('items:permissionDenied'), t('items:galleryPermissionRequired'));
        return;
      }

      // Open gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        logger.debug('ItemsScreen', 'Image selected', { uri: result.assets[0].uri });
      }
    } catch (e) {
      logger.error('ItemsScreen', 'Error selecting image', { error: e });
      Alert.alert(t('common:error'), t('items:convertImageError'));
    }
  };

  const handleDeleteItem = async (item: DonationItem) => {
    logger.warn('ItemsScreen', 'Soft delete item', { itemId: item.id, title: item.title });

    Alert.alert(
      t('items:deleteConfirmTitle'),
      t('items:deleteConfirmMessage', { title: item.title }),
      [
        {
          text: t('common:cancel'),
          style: 'cancel'
        },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('ItemsScreen', 'Deleting item', { itemId: item.id });

              // Soft delete via API
              await db.deleteDedicatedItem(item.id);

              logger.debug('ItemsScreen', 'Item deleted on server');

              // Remove from UI
              setAllItems((prev: DonationItem[]) => prev.filter(i => i.id !== item.id));

              Alert.alert(t('common:success'), t('items:itemDeleted'));
            } catch (error: unknown) {
              logger.error('ItemsScreen', 'Error deleting item', { error });
              const msg = error instanceof Error ? error.message : t('items:unknownError');
              Alert.alert(t('common:error'), `${t('items:deleteError')}\n${msg}`);
            }
          }
        }
      ]
    );
  };

  const handleCreateItem = async () => {
    try {
      if (!title.trim()) {
        Alert.alert(t('common:error'), t('items:fillTitleRequired'));
        titleInputRef.current?.focus();
        return;
      }

      logger.debug('ItemsScreen', 'Starting save item flow');

      // Ensure we have a valid UUID - guests cannot create items
      if (!selectedUser?.id) {
        Alert.alert(t('common:error'), t('items:loginRequiredToCreate'));
        return;
      }
      const uid = selectedUser.id; // This is already a UUID from the server
      // Note: We don't send 'id' to the server - the backend will generate it
      // This is similar to how rides work - the backend creates the ID

      // Convert image to base64
      let imageBase64 = null;
      if (imageUri) {
        logger.debug('ItemsScreen', 'Converting image to base64');
        imageBase64 = await convertImageToBase64(imageUri);
        if (imageBase64) {
          logger.debug('ItemsScreen', 'Image converted to base64', { length: imageBase64.length });
        }
      }

      // Build payload with all fields
      // Note: We don't include 'id' - the backend will generate it
      // For optional fields, send undefined instead of empty string to avoid validation issues
      const itemData: Record<string, unknown> = {
        owner_id: uid,
        title: title.trim(),
        category: selectedCategory || itemType,
      };

      // Add optional fields only if they have values
      if (description.trim()) {
        itemData.description = description.trim();
      }
      if (condition) {
        itemData.condition = condition;
      }
      if (city.trim()) {
        itemData.city = city.trim();
      }
      if (address.trim()) {
        itemData.address = address.trim();
      }
      // Note: coordinates is not currently supported in the UI
      // If needed in the future, add a coordinates state variable and input field
      if (price && Number(price) > 0) {
        itemData.price = Number(price);
      }
      if (imageBase64) {
        itemData.image_base64 = imageBase64;
      }
      if (selectedFilters.length > 0) {
        itemData.tags = selectedFilters.join(',');
      }
      if (qty && qty > 1) {
        itemData.quantity = qty;
      }
      // Note: delivery_method and status are optional
      // Backend will use defaults: 'pickup' for delivery_method and 'available' for status
      // If you want to customize these, add state variables and UI inputs for them

      logger.debug('ItemsScreen', 'Sending to server', {
        title: itemData.title,
        city: itemData.city,
        address: itemData.address,
        hasImage: !!itemData.image_base64,
        tagsCount: selectedFilters.length,
      });

      // Send to server via API
      const savedItem = await db.createDedicatedItem(itemData);

      logger.debug('ItemsScreen', 'Item saved successfully on server', { savedItem });

      const saved = savedItem as Record<string, unknown>;
      const savedData = saved?.data as Record<string, unknown> | undefined;
      const savedId = saved?.id ?? savedData?.id;
      const newItemForState: DonationItem = {
        id: savedId != null ? String(savedId) : '',
        ownerId: itemData.owner_id != null ? String(itemData.owner_id) : '',
        title: itemData.title != null ? String(itemData.title) : '',
        description: itemData.description != null ? String(itemData.description) : undefined,
        category: (itemData.category as ItemType) ?? 'general',
        condition: (itemData.condition as DonationItem['condition']) ?? undefined,
        city: itemData.city != null ? String(itemData.city) : undefined,
        address: itemData.address != null ? String(itemData.address) : undefined,
        coordinates: itemData.coordinates != null ? String(itemData.coordinates) : undefined,
        price: typeof itemData.price === 'number' ? itemData.price : undefined,
        image_base64: itemData.image_base64 != null ? String(itemData.image_base64) : undefined,
        rating: typeof itemData.rating === 'number' ? itemData.rating : undefined,
        timestamp: new Date().toISOString(),
        tags: itemData.tags != null ? String(itemData.tags) : undefined,
        qty: typeof itemData.quantity === 'number' ? itemData.quantity : undefined,
        delivery_method: itemData.delivery_method != null ? String(itemData.delivery_method) : undefined,
        status: itemData.status != null ? String(itemData.status) : undefined,
        isDeleted: false,
      };

      setAllItems((prev: DonationItem[]) => [newItemForState, ...prev]);
      // Filter logic will run via useEffect but we can also update explicitly if needed
      // With optimistic update, we don't strictly need to await loadItems
      // But we can trigger it in background
      loadItems();

      // Reset all fields
      setTitle('');
      setDescription('');
      setPrice('0');
      setCity('');
      setAddress('');
      setQty(1);
      setCondition('');
      setImageUri('');
      setSelectedCategory('general');
      setSelectedFilters([]);

      Alert.alert(
        t('items:saveSuccessTitle', { defaultValue: 'Saved successfully!' }),
        t('items:saveSuccessBody', { defaultValue: 'Item "{{title}}" was saved.', title: (savedData?.title as string) ?? (itemData.title as string) ?? '' }),
        [{ text: t('common:confirm'), style: 'default' }]
      );

    } catch (error: unknown) {
      const err = error as { message?: string; response?: { status?: number; data?: { error?: string; message?: string } } };
      logger.error('ItemsScreen', 'Error saving item', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || t('items:unknownError', { defaultValue: 'Unknown error' });
      Alert.alert(
        t('common:error'),
        t('items:saveErrorBody', { defaultValue: 'Failed to save item', errorMessage }),
        [{ text: t('common:close', { defaultValue: 'Close' }), style: 'cancel' }]
      );
    }
  };

  const menuOptions = [t('items:menuHistory'), t('items:menuSettings'), t('items:menuHelp'), t('items:menuContact')];

  const handleItemPress = (item: DonationItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const handleCloseModal = () => {
    setShowItemModal(false);
    setSelectedItem(null);
  };

  // Handle post closed - immediately update UI for fast responsiveness
  const handlePostClosed = useCallback((postId: string) => {
    // Optimistic update: remove post from lists immediately for instant UI feedback
    setAllPosts(prev => prev.filter(p => p.id !== postId));
    setFilteredPosts(prev => prev.filter(p => p.id !== postId));
    setRecentPosts(prev => prev.filter(p => p.id !== postId));

    // Background reload to ensure consistency (non-blocking)
    // The UI is already updated, so this is just for data sync
    setTimeout(() => {
      if (loadItemsRef.current) {
        loadItemsRef.current().catch(err => {
          logger.error('ItemsScreen', 'Error reloading items after close', { error: err });
        });
      }
    }, 100);
  }, []);

  // Render item callback for FlatList (search mode)
  const renderPostItem = useCallback(({ item }: { item: FeedItem }) => {
    // Calculate available width: screen width minus horizontal padding on both sides
    const availableWidth = width - (screenPadding * 2);

    // For grid view: with justifyContent: 'space-between', FlatList distributes items automatically
    // So each item gets availableWidth / numColumns (no need to account for gaps)
    const itemWidth = numColumns > 1
      ? availableWidth / numColumns
      : availableWidth; // Full available width for list view

    return (
      <PostReelItem
        item={item}
        cardWidth={itemWidth}
        numColumns={numColumns}
        onPress={(item) => {
          logger.debug('ItemsScreen', 'Post pressed', { postId: item.id });
        }}
        onCommentPress={(item) => {
          logger.debug('ItemsScreen', 'Comment pressed', { postId: item.id });
        }}
        onMorePress={handleMorePress}
        onPostClosed={handlePostClosed}
      />
    );
  }, [numColumns, screenPadding, width, handleMorePress, handlePostClosed]);

  // Empty component for FlatList
  const renderEmptyPosts = useCallback(() => (
    <View style={localStyles.emptyState}>
      <Icon name="search-outline" size={48} color={colors.textSecondary} />
      <Text style={localStyles.emptyStateTitle}>{t('items:noPostsFound')}</Text>
      <Text style={localStyles.emptyStateText}>{t('items:tryChangeFilters')}</Text>
      {(searchQuery || selectedFilters.length > 0 || selectedSorts.length > 0) && (
        <TouchableOpacity style={localStyles.emptyStateClearButton} onPress={handleClearAll}>
          <Text style={localStyles.emptyStateClearButtonText}>{t('items:clearAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, selectedFilters, selectedSorts, handleClearAll, t]);

  const _renderItemCard = ({ item }: { item: DonationItem }) => (
    <TouchableOpacity style={localStyles.itemCard} onPress={() => handleItemPress(item)}>
      {/* Base64 image */}
      {item.image_base64 && (
        <Image
          source={{ uri: item.image_base64 }}
          style={{ width: '100%', height: ITEM_CARD_IMAGE_HEIGHT, borderRadius: BORDER_RADIUS.SMALL, marginBottom: SPACING.SM }}
          resizeMode="cover"
        />
      )}

      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <View style={localStyles.itemBadge}>
          <Text style={localStyles.itemBadgeText}>
            {item.category ? t(`items:categories.${item.category}`) : t('items:categories.general')}
          </Text>
        </View>
      </View>

      {/* Location row */}
      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemMeta} numberOfLines={1}>
          📍 {item.city || t('items:locationNotAvailable')}{item.address ? `, ${item.address}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const _renderRecentCard = ({ item }: { item: DonationItem }) => (
    <View style={localStyles.itemCard}>
      {/* Base64 image */}
      {item.image_base64 && (
        <Image
          source={{ uri: item.image_base64 }}
          style={{ width: '100%', height: ITEM_CARD_IMAGE_HEIGHT, borderRadius: BORDER_RADIUS.SMALL, marginBottom: SPACING.SM }}
          resizeMode="cover"
        />
      )}

      <View style={localStyles.itemRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={localStyles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteItem(item)}
            style={localStyles.deleteButton}
            hitSlop={{ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP }}
          >
            <Icon name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={localStyles.itemMeta}>📅 {new Date(item.timestamp).toLocaleDateString('he-IL')} {new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      {/* Condition and quantity row */}
      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemMeta}>
          {item.condition === 'new' ? `🆕 ${t('items:conditionNew')}` :
            item.condition === 'like_new' ? `✨ ${t('items:conditionLikeNew')}` :
              item.condition === 'used' ? `📦 ${t('items:conditionUsed')}` : `🔧 ${t('items:conditionForParts')}`}
          {' • '}
          {t('items:quantityLabel')}: {item.qty || 1}
        </Text>
      </View>

      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemMeta} numberOfLines={1}>
          📍 {item.city || t('items:locationNotAvailable')}{item.address ? `, ${item.address}` : ''}
        </Text>
        <View style={localStyles.itemBadge}>
          <Text style={localStyles.itemBadgeText}>
            {item.category ? t(`items:categories.${item.category}`) : t('items:categories.general')}
          </Text>
        </View>
        <TouchableOpacity
          style={localStyles.restoreChip}
          onPress={() => {
            setTitle(item.title);
            setDescription(item.description || '');
            setCity(item.city || '');
            setAddress(item.address || '');
            setPrice(String(item.price ?? 0));
            setQty(item.qty || 1);
            setCondition(item.condition || '');
            if (item.image_base64) {
              setImageUri(item.image_base64);
            }
          }}
        >
          <Text style={localStyles.restoreChipText}>{t('items:restored')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <HeaderComp
        mode={mode}
        menuOptions={menuOptions}
        onToggleMode={() => setMode(!mode)}
        onSelectMenuItem={(o) => Alert.alert(t('items:menuTitle'), `${t('items:menuSelected')}: ${o}`)}
        title=""
        placeholder={mode ? t('items:searchPlaceholder') : t('items:itemNamePlaceholder')}
        filterOptions={filterOptions}
        sortOptions={ITEM_SORT_KEYS.map(k => t(`items:sortOptions.${k}`))}
        searchData={allItems as unknown as SearchableItem[]}
        onSearch={handleSearch}
      />

      {mode ? (
        <View style={{ flex: 1 }}>
          <VerticalGridSlider
            numColumns={numColumns}
            onNumColumnsChange={setNumColumns}
            style={{
              top: TAG_PADDING_H,
              left: SPACING.XS,
            }}
          />
          <ScrollContainer
            style={localStyles.container}
            contentStyle={[
              localStyles.scrollContent,
              isLandscape() && { paddingHorizontal: SPACING.XL }
            ]}
          >
            {/* Header */}
            <View style={localStyles.headerRow}>
              <Text style={localStyles.sectionTitle}>
                {searchQuery || selectedFilters.length > 0 ? t('items:availableItems') : t('items:recommendedItems')}
              </Text>
              {(searchQuery || selectedFilters.length > 0 || selectedSorts.length > 0) && (
                <TouchableOpacity style={localStyles.clearButton} onPress={handleClearAll}>
                  <Text style={localStyles.clearButtonText}>{t('items:clearAll')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Posts List (in search mode) */}
            <FlatList
              data={filteredPosts}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id}
              key={numColumns} // Force re-render on column change
              numColumns={numColumns}
              columnWrapperStyle={numColumns > 1 ? localStyles.columnWrapper : undefined}
              contentContainerStyle={{ paddingHorizontal: screenPadding }}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              ListEmptyComponent={renderEmptyPosts}
              showsVerticalScrollIndicator={false}
            />

            {/* Footer Stats */}
            <View style={localStyles.section}>
              <DonationStatsFooter
                stats={[
                  { label: t('items:postsPublished'), value: filteredPosts.length, icon: 'cube-outline' },
                  { label: t('items:likes'), value: filteredPosts.reduce((sum, p) => sum + (p.likes || 0), 0), icon: 'heart-outline' },
                  { label: t('items:comments'), value: filteredPosts.reduce((sum, p) => sum + (p.comments || 0), 0), icon: 'chatbubble-outline' },
                ]}
              />
            </View>

            {/* Add Links Section */}
            <View style={localStyles.section}>
              <Text style={localStyles.sectionTitle}>{t('items:usefulLinks')}</Text>
              <AddLinkComponent category="items" />
            </View>
          </ScrollContainer>
        </View>
      ) : (
        <ScrollContainer
          style={localStyles.container}
          contentStyle={localStyles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.formContainer}>
            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <Text style={localStyles.label}>{t('items:itemTitleLabel')}</Text>
                <TextInput ref={titleInputRef} style={localStyles.input} value={title} onChangeText={setTitle} placeholder={t('items:titlePlaceholder')} />
              </View>
            </View>

            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <Text style={localStyles.label}>{t('items:descriptionLabel')}</Text>
                <TextInput style={[localStyles.input, { height: COMPONENT_SIZES.AVATAR.LARGE }]} value={description} onChangeText={setDescription} placeholder={t('items:descriptionPlaceholder')} multiline />
              </View>
            </View>

            {/* Category dropdown */}
            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <Text style={localStyles.label}>{t('items:categoryLabel')}</Text>
                <TouchableOpacity
                  style={localStyles.dropdownButton}
                  onPress={() => setShowCategoryDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    localStyles.dropdownButtonText,
                    !selectedCategory && localStyles.dropdownPlaceholder
                  ]}>
                    {selectedCategory ? t(`items:categories.${selectedCategory}`) : t('items:selectCategory')}
                  </Text>
                  <Icon
                    name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category selection modal */}
            <Modal
              visible={showCategoryDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setShowCategoryDropdown(false)}
            >
              <TouchableOpacity
                style={localStyles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowCategoryDropdown(false)}
              >
                <View style={localStyles.modalContent} onStartShouldSetResponder={() => true}>
                  <View style={localStyles.modalHeader}>
                    <Text style={localStyles.modalTitle}>{t('items:selectCategory')}</Text>
                    <TouchableOpacity
                      onPress={() => setShowCategoryDropdown(false)}
                      style={localStyles.modalCloseButton}
                    >
                      <Icon name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={ITEM_CATEGORY_IDS}
                    keyExtractor={(id) => id}
                    renderItem={({ item: catId }) => (
                      <TouchableOpacity
                        style={[
                          localStyles.dropdownItem,
                          selectedCategory === catId && localStyles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedCategory(catId as ItemType);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Icon
                          name={(ITEM_CATEGORY_ICONS[catId] ?? 'cube-outline') as React.ComponentProps<typeof Icon>['name']}
                          size={20}
                          color={selectedCategory === catId ? colors.primary : colors.textSecondary}
                          style={localStyles.dropdownItemIcon}
                        />
                        <Text style={[
                          localStyles.dropdownItemText,
                          selectedCategory === catId && localStyles.dropdownItemTextSelected
                        ]}>
                          {t(`items:categories.${catId}`)}
                        </Text>
                        {selectedCategory === catId && (
                          <Icon name="checkmark" size={20} color={colors.success} />
                        )}
                      </TouchableOpacity>
                    )}
                    style={localStyles.dropdownList}
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Location fields - split into city and address */}
            <View style={localStyles.row}>
              <View style={localStyles.fieldSmall}>
                <Text style={localStyles.label}>{t('items:cityLabel')}</Text>
                <TextInput
                  style={localStyles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder={t('items:cityPlaceholder')}
                />
              </View>
              <View style={localStyles.fieldSmall}>
                <Text style={localStyles.label}>{t('items:addressLabel')}</Text>
                <TextInput
                  style={localStyles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t('items:addressPlaceholder')}
                />
              </View>
            </View>

            {/* Quantity field */}
            <View style={localStyles.row}>
              <View style={localStyles.fieldSmall}>
                <Text style={localStyles.label}>{t('items:quantityLabel')}</Text>
                <View style={localStyles.counterRow}>
                  <TouchableOpacity style={localStyles.counterBtn} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={localStyles.counterText}>-</Text></TouchableOpacity>
                  <Text style={localStyles.counterValue}>{qty}</Text>
                  <TouchableOpacity style={localStyles.counterBtn} onPress={() => setQty(qty + 1)}><Text style={localStyles.counterText}>+</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={localStyles.labelInline}>{t('items:conditionLabel')}</Text>
            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <View style={localStyles.tagsRow}>
                  {[
                    { key: 'new', label: t('items:conditionNew') },
                    { key: 'like_new', label: t('items:conditionLikeNew') },
                    { key: 'used', label: t('items:conditionUsed') },
                    { key: 'for_parts', label: t('items:conditionForParts') },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        localStyles.tag,
                        localStyles.tagSmall,
                        condition === (opt.key as DonationItem['condition']) && localStyles.tagSelected,
                      ]}
                      onPress={() => setCondition(opt.key as '' | 'new' | 'like_new' | 'used' | 'for_parts')}
                    >
                      <Text
                        style={[
                          localStyles.tagText,
                          localStyles.tagTextSm,
                          condition === (opt.key as DonationItem['condition']) && localStyles.tagTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Image upload button */}
            <View style={localStyles.imageSection}>
              <Text style={localStyles.labelInline}>{t('items:imageOptional')}</Text>
              <TouchableOpacity
                style={localStyles.imagePickerButton}
                onPress={pickImage}
              >
                <Icon name="image-outline" size={24} color={colors.primary} />
                <Text style={localStyles.imagePickerText}>
                  {imageUri ? t('items:imageSelected') : t('items:selectImage')}
                </Text>
              </TouchableOpacity>

              {/* Image preview */}
              {imageUri && (
                <View style={localStyles.imagePreview}>
                  <Image source={{ uri: imageUri }} style={localStyles.previewImage} />
                  <View style={localStyles.imageInfo}>
                    <Text style={localStyles.imageInfoText}>✅ {t('items:imageReady')}</Text>
                    <Text style={localStyles.imageInfoSubtext}>{t('items:pixelsSize')}</Text>
                  </View>
                  <TouchableOpacity
                    style={localStyles.removeImageButton}
                    onPress={() => setImageUri('')}
                  >
                    <Icon name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity style={[localStyles.offerButton, !title && { opacity: 0.5 }]} onPress={handleCreateItem} disabled={!title}>
              <Text style={localStyles.offerButtonText}>{t('items:publishItem')}</Text>
            </TouchableOpacity>
          </View>

          <View style={localStyles.section}>
            <Text style={localStyles.sectionTitle}>{t('items:sectionRecentItems')}</Text>
            {recentPosts.length === 0 ? (
              <Text style={localStyles.emptyStateText}>{t('items:noPostsPublished')}</Text>
            ) : (
              <View style={localStyles.recentContainer}>
                {recentPosts.map((post) => {
                  // Container has paddingHorizontal: 16, scrollContent has paddingHorizontal: 16, 
                  // and recentContainer has paddingHorizontal: 8
                  // Total padding is 16 + 16 + 8 = 40 on each side
                  const totalPadding = SPACING.MD + SPACING.MD + SPACING.SM;
                  const recentCardWidth = width - (totalPadding * 2);
                  return (
                    <View key={post.id} style={localStyles.recentItemWrapper}>
                      <PostReelItem
                        item={post}
                        cardWidth={recentCardWidth}
                        numColumns={1}
                        onPress={(item) => {
                          logger.debug('ItemsScreen', 'Post pressed', { postId: item.id });
                        }}
                        onCommentPress={(item) => {
                          logger.debug('ItemsScreen', 'Comment pressed', { postId: item.id });
                        }}
                        onMorePress={handleMorePress}
                        onPostClosed={handlePostClosed}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Add Links Section */}
          <View style={localStyles.section}>
            <Text style={localStyles.sectionTitle}>{t('items:usefulLinks')}</Text>
            <AddLinkComponent category="items" />
          </View>
        </ScrollContainer>
      )}

      {/* Item Details Modal */}
      <ItemDetailsModal
        visible={showItemModal}
        onClose={handleCloseModal}
        item={selectedItem}
        type="item"
        navigation={navigation}
      />

      {/* Post Menu Modals */}
      <OptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        options={modalOptions}
        title={t('common:options')}
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

const localStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.backgroundTertiary },
  container: { flex: 1, paddingHorizontal: SPACING.MD, paddingTop: SPACING.XS },
  scrollContent: { paddingHorizontal: SPACING.MD, paddingTop: SPACING.XS, paddingBottom: SCROLL_BOTTOM_PADDING, flexGrow: 1 },
  formContainer: { padding: SPACING.XS, alignItems: 'center', borderRadius: BORDER_RADIUS.MEDIUM, marginBottom: BORDER_RADIUS.MEDIUM },
  row: { flexDirection: rowDirection('row-reverse'), gap: TAG_PADDING_H, width: '100%', paddingHorizontal: SPACING.SM },
  field: { flex: 1 },
  fieldSmall: { flex: 0.5 },
  label: { fontSize: FontSizes.medium, fontWeight: '600', color: colors.textPrimary, marginBottom: TAG_PADDING_H, textAlign: 'center' },
  labelInline: { marginTop: 3, flex: 1, fontSize: FontSizes.medium, fontWeight: '600', color: colors.textPrimary, ...marginStartEnd(SPACING.SM - 2, 0) },
  input: { backgroundColor: colors.white, borderRadius: BORDER_RADIUS.MEDIUM - 5, padding: INPUT_PADDING, fontSize: FontSizes.body, textAlign: biDiTextAlign('right'), color: colors.textPrimary, borderWidth: 1, borderColor: colors.secondary },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputWithAdornment: { paddingRight: INPUT_ADORNMENT_OFFSET },
  inputAdornment: { position: 'absolute', right: TAG_PADDING_H, color: colors.textSecondary, fontSize: FontSizes.body },
  counterRow: { flexDirection: rowDirection('row'), alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: BORDER_RADIUS.MEDIUM - 5, borderWidth: 1, borderColor: colors.secondary, paddingHorizontal: SPACING.SM, paddingVertical: TAG_PADDING_V },
  counterBtn: { backgroundColor: colors.pinkLight, paddingHorizontal: TAG_PADDING_H, paddingVertical: TAG_PADDING_V, borderRadius: BORDER_RADIUS.SMALL },
  counterText: { fontSize: FontSizes.medium, fontWeight: 'bold', color: colors.textPrimary },
  counterValue: { fontSize: FontSizes.medium, fontWeight: 'bold', color: colors.textPrimary, minWidth: 30, textAlign: 'center' },
  tagsRow: { marginTop: TAG_PADDING_H, alignItems: 'stretch', flexDirection: rowDirection('row-reverse'), flexWrap: 'wrap', gap: TAGS_GAP },
  tag: { backgroundColor: colors.pinkLight, borderWidth: 1, borderColor: colors.secondary, borderRadius: PILL_BORDER_RADIUS, paddingHorizontal: TAG_PADDING_H, paddingVertical: TAG_PADDING_V },
  tagSmall: { paddingHorizontal: SPACING.SM, marginHorizontal: '4%', paddingVertical: SPACING.XS },
  tagSelected: { backgroundColor: colors.backgroundSecondary, borderColor: colors.success },
  tagText: { fontSize: FontSizes.small, color: colors.textPrimary },
  tagTextSm: { fontSize: FontSizes.caption },
  tagTextSelected: { color: colors.success, fontWeight: '600' },
  offerButton: { backgroundColor: colors.accent, padding: BUTTON_PADDING_V, borderRadius: BORDER_RADIUS.MEDIUM - 3, alignItems: 'center', marginTop: TAG_PADDING_H },
  offerButtonText: { color: colors.background, fontSize: FontSizes.medium, fontWeight: 'bold' },
  section: { marginBottom: TAG_PADDING_H },
  sectionTitle: { fontSize: FontSizes.body, fontWeight: 'bold', alignSelf: 'center', color: colors.textPrimary, textAlign: 'center' },
  headerRow: { flexDirection: rowDirection('row-reverse'), justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.SM, paddingHorizontal: SPACING.XS },
  clearButton: { backgroundColor: colors.pinkLight, borderWidth: 1, borderColor: colors.secondary, borderRadius: BORDER_RADIUS.SMALL, paddingHorizontal: INPUT_PADDING, paddingVertical: TAG_PADDING_V },
  clearButtonText: { fontSize: FontSizes.small, color: colors.textPrimary, fontWeight: '600' },
  noOuterScrollContainer: { flex: 1 },
  sectionWithScroller: { flex: 1, backgroundColor: colors.pinkLight, borderRadius: INPUT_PADDING, borderWidth: 1, borderColor: colors.secondary, paddingVertical: SPACING.SM, paddingHorizontal: SPACING.SM },
  innerScroll: { flex: 1 },
  itemsGridContainer: {},
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: EMPTY_STATE_PADDING },
  emptyStateTitle: { fontSize: FontSizes.body, fontWeight: 'bold', color: colors.textPrimary, marginTop: SPACING.MD, marginBottom: SPACING.SM },
  emptyStateText: { fontSize: FontSizes.small, color: colors.textSecondary, textAlign: 'center', marginBottom: SPACING.MD },
  emptyStateClearButton: { backgroundColor: colors.accent, paddingHorizontal: CLEAR_BUTTON_PADDING_H, paddingVertical: TAG_PADDING_H, borderRadius: BORDER_RADIUS.SMALL, marginTop: SPACING.SM },
  emptyStateClearButtonText: { fontSize: FontSizes.small, color: colors.background, fontWeight: '600' },
  itemCardWrapper: { marginBottom: SPACING.SM, width: '100%' },
  itemCard: { backgroundColor: colors.pinkLight, borderRadius: BORDER_RADIUS.MEDIUM - 5, padding: SPACING.SM, borderWidth: 1, borderColor: colors.secondary },
  itemRow: { flexDirection: rowDirection('row-reverse'), justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.XS },
  itemTitle: { fontSize: FontSizes.small, fontWeight: 'bold', color: colors.textPrimary, textAlign: biDiTextAlign('right'), flex: 1, marginLeft: SPACING.SM - 2 },
  itemMeta: { fontSize: FontSizes.small, color: colors.textSecondary },
  itemBadge: { backgroundColor: colors.backgroundSecondary, paddingHorizontal: SPACING.SM - 2, paddingVertical: 2, borderRadius: SPACING.SM - 2, marginLeft: SPACING.SM - 2 },
  itemBadgeText: { fontSize: FontSizes.small, color: colors.success, fontWeight: 'bold' },
  recentContainer: { paddingHorizontal: SPACING.SM, paddingVertical: SPACING.SM },
  recentItemWrapper: { marginBottom: SPACING.SM, width: '100%' },
  restoreChip: { backgroundColor: colors.pinkLight, borderWidth: 1, borderColor: colors.secondary, borderRadius: PILL_BORDER_RADIUS, paddingHorizontal: TAG_PADDING_H, paddingVertical: SPACING.XS },
  restoreChipText: { fontSize: FontSizes.small, color: colors.textPrimary, fontWeight: '600' },
  deleteButton: {
    padding: TAG_PADDING_V,
    marginLeft: INPUT_PADDING,
    backgroundColor: colors.pinkLight,
    borderRadius: BORDER_RADIUS.SMALL,
    borderWidth: 1,
    borderColor: colors.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: SPACING.XL,
    minHeight: SPACING.XL,
  },
  itemImageContainer: {
    padding: SPACING.XS,
    marginBottom: SPACING.XS,
  },
  itemImageIndicator: {
    fontSize: FontSizes.small,
    color: colors.primary,
    fontWeight: '600',
  },
  imageSection: {
    width: '100%',
    marginTop: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: BORDER_RADIUS.MEDIUM - 3,
    padding: SPACING.MD,
    gap: SPACING.SM,
    marginTop: SPACING.XS,
  },
  imagePickerText: {
    color: colors.primary,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: PREVIEW_IMAGE_SIZE,
    height: PREVIEW_IMAGE_SIZE,
    borderRadius: BORDER_RADIUS.SMALL,
    resizeMode: 'cover',
  },
  removeImageButton: {
    marginLeft: 'auto',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BORDER_RADIUS.LARGE,
    padding: SPACING.XS,
  },
  imageInfo: {
    flex: 1,
    marginLeft: INPUT_PADDING,
    justifyContent: 'center',
  },
  imageInfoText: {
    fontSize: FontSizes.medium,
    color: colors.success,
    fontWeight: '600',
  },
  imageInfoSubtext: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dropdownButton: {
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.MEDIUM - 5,
    padding: INPUT_PADDING,
    borderWidth: 1,
    borderColor: colors.secondary,
    flexDirection: rowDirection('row-reverse'),
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: COMPONENT_SIZES.INPUT_HEIGHT.MEDIUM,
  },
  dropdownButtonText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    textAlign: biDiTextAlign('right'),
    flex: 1,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: SPACING.MD,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: rowDirection('row-reverse'),
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: SPACING.XS,
  },
  dropdownList: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },
  dropdownItem: {
    flexDirection: rowDirection('row-reverse'),
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: BUTTON_PADDING_V,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.pinkLight,
  },
  dropdownItemIcon: {
    marginLeft: INPUT_PADDING,
  },
  dropdownItemText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: biDiTextAlign('right'),
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});


