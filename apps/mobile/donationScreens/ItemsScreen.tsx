import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, Image, Modal, FlatList, Dimensions, Platform } from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import DonationStatsFooter from '../components/DonationStatsFooter';
import ScrollContainer from '../components/ScrollContainer';
import ItemDetailsModal from '../components/ItemDetailsModal';
import AddLinkComponent from '../components/AddLinkComponent';
import { Ionicons as Icon } from '@expo/vector-icons';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import { biDiTextAlign, rowDirection, isLandscape, marginStartEnd, getScreenInfo, BREAKPOINTS, isMobileWeb } from '../globals/responsive';
import { getCategoryLabel } from '../utils/itemCategoryUtils';
import { useToast } from '../utils/toastService';
import VerticalGridSlider from '../components/VerticalGridSlider';
import { postsService } from '../utils/postsService';
import PostReelItem from '../components/Feed/PostReelItem';
import { FeedItem } from '../types/feed';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/loggerService';

type ItemType = 'furniture' | 'clothes' | 'general' | 'books' | 'dry_food' | 'games' | 'electronics' | 'toys' | 'sports' | 'art' | 'kitchen' | 'bathroom' | 'garden' | 'tools' | 'baby' | 'pet' | 'other';

// רשימת קטגוריות לפרסום פריטים
const ITEM_CATEGORIES = [
  { id: 'clothes', label: 'בגדים', icon: 'shirt-outline' },
  { id: 'books', label: 'ספרים', icon: 'library-outline' },
  { id: 'furniture', label: 'רהיטים', icon: 'bed-outline' },
  { id: 'dry_food', label: 'אוכל יבש', icon: 'restaurant-outline' },
  { id: 'games', label: 'משחקים', icon: 'game-controller-outline' },
  { id: 'electronics', label: 'חשמל ואלקטרוניקה', icon: 'phone-portrait-outline' },
  { id: 'toys', label: 'צעצועים', icon: 'happy-outline' },
  { id: 'sports', label: 'ספורט', icon: 'football-outline' },
  { id: 'art', label: 'אמנות', icon: 'color-palette-outline' },
  { id: 'kitchen', label: 'מטבח', icon: 'cafe-outline' },
  { id: 'bathroom', label: 'אמבטיה', icon: 'water-outline' },
  { id: 'garden', label: 'גינה', icon: 'leaf-outline' },
  { id: 'tools', label: 'כלים', icon: 'construct-outline' },
  { id: 'baby', label: 'תינוקות', icon: 'baby-outline' },
  { id: 'pet', label: 'חיות מחמד', icon: 'paw-outline' },
  { id: 'other', label: 'אחר', icon: 'cube-outline' },
] as const;

export interface ItemsScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route?: any;
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

const itemsFilterOptionsBase = [
  'בחינם',
  'כמו חדש',
  'משומש',
  'לחלפים',
  'עם איסוף עצמי',
  'משלוח בתשלום',
  'נגישות',
];

const itemsSortOptions = [
  'אלפביתי',
  'לפי מיקום',
  'לפי תאריך',
  'לפי דירוג',
  'לפי רלוונטיות',
];

export default function ItemsScreen({ navigation, route }: ItemsScreenProps) {
  const { ToastComponent } = useToast();
  const { t } = useTranslation(['donations', 'common', 'items']);
  const itemType: ItemType = (route?.params?.itemType as ItemType) || 'general';
  const routeParams = route?.params as { mode?: string } | undefined;

  // Get initial mode from URL (deep link) or default to search mode (מחפש)
  // mode: false = מציע, true = מחפש
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
  useEffect(() => {
    const newMode = mode ? 'search' : 'offer';
    const currentMode = routeParams?.mode;

    // If no mode in URL, set it to search (default)
    if (!currentMode || currentMode === 'undefined' || currentMode === 'null') {
      // Set initial mode to search in URL
      (navigation as any).setParams({ mode: 'search' });
      return;
    }

    // Only update URL if mode actually changed
    if (newMode !== currentMode) {
      (navigation as any).setParams({ mode: newMode });
    }
  }, [mode, navigation, routeParams?.mode]);

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
    // כל הקטגוריות האפשריות לפריטים
    const allCategories = ITEM_CATEGORIES.map(cat => cat.label);

    const typeSpecific = itemType === 'furniture' ? ['ספות', 'ארונות', 'מיטות']
      : itemType === 'clothes' ? ['גברים', 'נשים', 'ילדים']
        : ['מטבח', 'חשמל', 'צעצועים'];

    // מחזיר: קטגוריות כלליות + פילטרים ספציפיים לסוג + פילטרים בסיסיים
    return [...allCategories, ...typeSpecific, ...itemsFilterOptionsBase];
  }, [itemType]);

  // Helper to map API post to FeedItem (same as useFeedData.mapPostToItem)
  const mapPostToFeedItem = useCallback((post: any): FeedItem | null => {
    // הגנה מפני post null/undefined
    if (!post || !post.id) {
      logger.warn('ItemsScreen', 'mapPostToFeedItem: post is null or missing id', { post });
      return null;
    }

    // Extract item data if available
    const itemData = post.item_data || {};
    let _metadata = {};
    try {
      _metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : (post.metadata || {});
    } catch (e) {
      logger.warn('ItemsScreen', 'Failed to parse metadata', { error: e });
    }

    // Ensure user is always defined (same format as useFeedData)
    // בדיקה מפורטת יותר
    let author = null;
    if (post.author) {
      author = post.author;
    } else if (post.author_id) {
      // אם אין author object, ניצור אחד בסיסי
      author = { id: post.author_id, name: null, avatar_url: null };
    }

    const userId = author?.id || post.author_id || 'unknown';
    const userName = author?.name || t('common.unknownUser') || 'משתמש';
    const userAvatar = author?.avatar_url || undefined;

    // וידוא שה-user תמיד מוגדר
    if (!userId || userId === 'unknown') {
      logger.warn('ItemsScreen', 'mapPostToFeedItem: post without valid user', { postId: post.id, author_id: post.author_id });
    }

    // Get status from item_data or ride_data
    let itemStatus: string | undefined;
    if (post.item_data) {
      itemStatus = post.item_data.status;
    } else if (post.ride_data) {
      itemStatus = post.ride_data.status;
    }

    return {
      id: post.id,
      type: post.post_type || 'post',
      subtype: post.post_type, // Same as useFeedData - e.g. 'item', 'donation', 'ride'
      title: post.title || t('common.post.noTitle') || 'פוסט ללא כותרת', // Same as useFeedData
      description: post.description || '',
      thumbnail: post.images && post.images.length > 0 ? post.images[0] : null, // Same as useFeedData
      user: {
        id: userId,
        name: userName,
        avatar: userAvatar,
      },
      likes: parseInt(post.likes || '0'),
      comments: parseInt(post.comments || '0'),
      isLiked: post.is_liked || false,
      timestamp: (post.created_at && !isNaN(new Date(post.created_at).getTime()))
        ? new Date(post.created_at).toISOString()
        : new Date().toISOString(),
      // Item-specific fields
      category: itemData?.category || (_metadata as any)?.category,
      // Add status for items and donations
      status: itemStatus,
      // Add IDs for updating posts
      // IMPORTANT: For items, ALWAYS prefer item_data.id (from JOIN) - this is the most reliable source
      // item_id column might be a timestamp if post was created incorrectly
      itemId: post.item_data?.id || (post.item_id && !/^\d{10,13}$/.test(post.item_id) ? post.item_id : undefined),
      rideId: post.ride_id || post.ride_data?.id,
      taskId: post.task_id || post.task?.id,
    };
  }, [t]);

  // פונקציה נפרדת לטעינת פריטים/פוסטים שנוכל לקרוא לה גם אחרי שמירה
  const loadItems = useCallback(async () => {
    try {
      logger.debug('ItemsScreen', 'Loading items/posts from server', { mode, itemType });
      const uid = selectedUser?.id || 'guest';

      if (mode) {
        logger.debug('ItemsScreen', 'Seeker mode: loading item posts');
        try {
          // טוען את כל הפוסטים ואז מסנן לפי post_type
          const postsResponse = await postsService.getPosts(200, 0, uid);
          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            // מסנן רק פוסטים של פריטים (item או donation)
            const itemPosts = postsResponse.data.filter((post: any) =>
              post.post_type === 'item' || post.post_type === 'donation' || post.item_id
            );

            logger.debug('ItemsScreen', 'Posts loaded', { total: postsResponse.data.length, itemPosts: itemPosts.length });

            // ממפה את הפוסטים עם הגנה מפני user undefined
            const mappedPosts = itemPosts
              .map(mapPostToFeedItem)
              .filter((post: FeedItem | null): post is FeedItem =>
                post !== null && post !== undefined && !!post.user && !!post.user.id && !!post.user.name
              ); // מסנן פוסטים ללא user תקין

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
          // טוען את הפוסטים של המשתמש
          const { apiService } = await import('../utils/apiService');
          const postsResponse = await apiService.getUserPosts(uid, 50, uid);

          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            // מסנן רק פוסטים של פריטים (item או donation)
            const itemPosts = postsResponse.data.filter((post: any) =>
              post.post_type === 'item' || post.post_type === 'donation' || post.item_id
            );

            // ממפה את הפוסטים
            const mappedPosts = itemPosts
              .map(mapPostToFeedItem)
              .filter((post: FeedItem | null): post is FeedItem =>
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

        // עדיין טוען פריטים לצורך יצירה/עריכה (אם צריך)
        const serverItems = await db.getDedicatedItemsByOwner(uid);
        const displayItems: DonationItem[] = (serverItems || [])
          .filter((item: any) => {
            const isDeleted = item.is_deleted || item.isDeleted;
            return !isDeleted;
          })
          .map((item: any) => ({
            id: item.id,
            ownerId: item.owner_id || item.ownerId,
            title: item.title,
            description: item.description,
            category: item.category,
            condition: item.condition,
            city: item.city || (item.location && typeof item.location === 'object' ? item.location.city : null),
            address: item.address || (item.location && typeof item.location === 'object' ? item.location.address : null),
            coordinates: item.coordinates || (item.location && typeof item.location === 'object' ? item.location.coordinates : null),
            price: item.price,
            image_base64: item.image_base64,
            rating: item.rating,
            timestamp: item.created_at || item.timestamp,
            tags: item.tags,
            qty: item.quantity || item.qty,
            delivery_method: item.delivery_method,
            status: item.status,
            isDeleted: item.is_deleted || item.isDeleted,
            deletedAt: item.deleted_at || item.deletedAt,
          }));

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
          const matchingCategory = ITEM_CATEGORIES.find(cat => cat.label === f);
          if (matchingCategory) {
            filtered = filtered.filter(post => post.category === matchingCategory.id);
          }
        });
      }

      // Sorting
      const selectedSort = selectedSorts[0];
      switch (selectedSort) {
        case 'אלפביתי':
          filtered.sort((a, b) => a.title.localeCompare(b.title, 'he'));
          break;
        case 'לפי תאריך':
          filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          break;
        case 'לפי דירוג':
          filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
        case 'לפי רלוונטיות':
          filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
      }

      return filtered;
    }

    return []; // Return empty in offer mode as we don't use filteredItems state anymore
  }, [mode, allPosts, searchQuery, selectedFilters, selectedSorts]);

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
  const HORIZONTAL_PADDING = isMobile ? 8 : 16;
  const _COLUMN_GAP = isMobile ? 8 : 16;
  const screenPadding = HORIZONTAL_PADDING;

  const handleSearch = useCallback((query: string, filters: string[] = [], sorts: string[] = [], _results?: any[]) => {
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
      // בקשת הרשאה
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('אין הרשאה', 'נדרשת הרשאה לגשת לגלריה');
        return;
      }

      // פתיחת הגלריה
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
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את התמונה');
    }
  };

  const handleDeleteItem = async (item: DonationItem) => {
    logger.warn('ItemsScreen', 'Soft delete item', { itemId: item.id, title: item.title });

    Alert.alert(
      '🗑️ מחיקת פריט',
      `האם אתה בטוח שברצונך למחוק את:\n"${item.title}"?`,
      [
        {
          text: 'ביטול',
          style: 'cancel'
        },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('ItemsScreen', 'Deleting item', { itemId: item.id });

              // Soft Delete דרך ה-API החדש
              await db.deleteDedicatedItem(item.id);

              logger.debug('ItemsScreen', 'Item deleted on server');

              // הסרה מה-UI
              setAllItems((prev: DonationItem[]) => prev.filter(i => i.id !== item.id));

              Alert.alert('✅ הצלחה', 'הפריט נמחק!');
            } catch (error: any) {
              logger.error('ItemsScreen', 'Error deleting item', { error });
              Alert.alert('שגיאה', `לא הצלחנו למחוק את הפריט:\n${error.message || 'שגיאה לא ידועה'}`);
            }
          }
        }
      ]
    );
  };

  const handleCreateItem = async () => {
    try {
      if (!title.trim()) {
        Alert.alert('שגיאה', 'נא למלא כותרת');
        titleInputRef.current?.focus();
        return;
      }

      logger.debug('ItemsScreen', 'Starting save item flow');

      // Ensure we have a valid UUID - guests cannot create items
      if (!selectedUser?.id) {
        Alert.alert('שגיאה', 'נא להתחבר כדי ליצור פריט');
        return;
      }
      const uid = selectedUser.id; // This is already a UUID from the server
      // Note: We don't send 'id' to the server - the backend will generate it
      // This is similar to how rides work - the backend creates the ID

      // המרת תמונה ל-base64
      let imageBase64 = null;
      if (imageUri) {
        logger.debug('ItemsScreen', 'Converting image to base64');
        imageBase64 = await convertImageToBase64(imageUri);
        if (imageBase64) {
          logger.debug('ItemsScreen', 'Image converted to base64', { length: imageBase64.length });
        }
      }

      // הכנת אובייקט עם כל השדות הנפרדים
      // Note: We don't include 'id' - the backend will generate it
      // For optional fields, send undefined instead of empty string to avoid validation issues
      const itemData: any = {
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

      // שליחה לשרת דרך API החדש
      const savedItem = await db.createDedicatedItem(itemData);

      logger.debug('ItemsScreen', 'Item saved successfully on server', { savedItem });

      // Optimistic Update: Add to local state immediately
      // Use the ID returned from the server (savedItem.id) - this is the proper ID generated by backend
      const newItemForState: DonationItem = {
        id: savedItem.id || savedItem.data?.id,
        ownerId: itemData.owner_id,
        title: itemData.title,
        description: itemData.description,
        category: itemData.category,
        condition: itemData.condition as any,
        city: itemData.city,
        address: itemData.address,
        coordinates: itemData.coordinates,
        price: itemData.price,
        image_base64: itemData.image_base64 || undefined,
        rating: itemData.rating,
        timestamp: new Date().toISOString(),
        tags: itemData.tags,
        qty: itemData.quantity,
        delivery_method: itemData.delivery_method,
        status: itemData.status,
        isDeleted: false,
      };

      setAllItems((prev: DonationItem[]) => [newItemForState, ...prev]);
      // Filter logic will run via useEffect but we can also update explicitly if needed
      // With optimistic update, we don't strictly need to await loadItems
      // But we can trigger it in background
      loadItems();

      // איפוס כל השדות
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
        t('items:saveSuccessBody', { defaultValue: 'Item "{{title}}" was saved.', title: savedItem.title }),
        [{ text: t('common:confirm'), style: 'default' }]
      );

    } catch (error: any) {
      logger.error('ItemsScreen', 'Error saving item', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || t('items:unknownError', { defaultValue: 'Unknown error' });
      Alert.alert(
        t('common:error'),
        t('items:saveErrorBody', { defaultValue: 'Failed to save item', errorMessage }),
        [{ text: t('common:close', { defaultValue: 'Close' }), style: 'cancel' }]
      );
    }
  };

  const menuOptions = ['היסטוריית פריטים', 'הגדרות', 'עזרה', 'צור קשר'];

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
      <Text style={localStyles.emptyStateTitle}>לא נמצאו פוסטים</Text>
      <Text style={localStyles.emptyStateText}>נסה לשנות את הפילטרים או החיפוש</Text>
      {(searchQuery || selectedFilters.length > 0 || selectedSorts.length > 0) && (
        <TouchableOpacity style={localStyles.emptyStateClearButton} onPress={handleClearAll}>
          <Text style={localStyles.emptyStateClearButtonText}>נקה הכל</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, selectedFilters, selectedSorts, handleClearAll]);

  const _renderItemCard = ({ item }: { item: DonationItem }) => (
    <TouchableOpacity style={localStyles.itemCard} onPress={() => handleItemPress(item)}>
      {/* תמונה base64 */}
      {item.image_base64 && (
        <Image
          source={{ uri: item.image_base64 }}
          style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }}
          resizeMode="cover"
        />
      )}

      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <View style={localStyles.itemBadge}>
          <Text style={localStyles.itemBadgeText}>
            {getCategoryLabel(item.category)}
          </Text>
        </View>
      </View>

      {/* מיקום מפוצל */}
      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemMeta} numberOfLines={1}>
          📍 {item.city || 'מיקום לא זמין'}{item.address ? `, ${item.address}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const _renderRecentCard = ({ item }: { item: DonationItem }) => (
    <View style={localStyles.itemCard}>
      {/* תמונה base64 */}
      {item.image_base64 && (
        <Image
          source={{ uri: item.image_base64 }}
          style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }}
          resizeMode="cover"
        />
      )}

      <View style={localStyles.itemRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={localStyles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteItem(item)}
            style={localStyles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={localStyles.itemMeta}>📅 {new Date(item.timestamp).toLocaleDateString('he-IL')} {new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      {/* שורה נוספת עם מצב + כמות */}
      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemMeta}>
          {item.condition === 'new' ? '🆕 חדש' :
            item.condition === 'like_new' ? '✨ כמו חדש' :
              item.condition === 'used' ? '📦 משומש' : '🔧 לחלפים'}
          {' • '}
          כמות: {item.qty || 1}
        </Text>
      </View>

      <View style={localStyles.itemRow}>
        <Text style={localStyles.itemMeta} numberOfLines={1}>
          📍 {item.city || 'מיקום לא זמין'}{item.address ? `, ${item.address}` : ''}
        </Text>
        <View style={localStyles.itemBadge}>
          <Text style={localStyles.itemBadgeText}>
            {getCategoryLabel(item.category)}
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
          <Text style={localStyles.restoreChipText}>שחזר</Text>
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
        onSelectMenuItem={(o) => Alert.alert('תפריט', `נבחר: ${o}`)}
        title=""
        placeholder={mode ? 'חפש פריטים זמינים' : 'שם הפריט'}
        filterOptions={filterOptions}
        sortOptions={itemsSortOptions}
        searchData={allItems}
        onSearch={handleSearch}
      />

      {mode ? (
        <View style={{ flex: 1 }}>
          <VerticalGridSlider
            numColumns={numColumns}
            onNumColumnsChange={setNumColumns}
            style={{
              top: 10, // Relative to container below header
              left: 4,
            }}
          />
          <ScrollContainer
            style={localStyles.container}
            contentStyle={[
              localStyles.scrollContent,
              isLandscape() && { paddingHorizontal: 32 }
            ]}
          >
            {/* Header */}
            <View style={localStyles.headerRow}>
              <Text style={localStyles.sectionTitle}>
                {searchQuery || selectedFilters.length > 0 ? 'פריטים זמינים' : 'פריטים מומלצים'}
              </Text>
              {(searchQuery || selectedFilters.length > 0 || selectedSorts.length > 0) && (
                <TouchableOpacity style={localStyles.clearButton} onPress={handleClearAll}>
                  <Text style={localStyles.clearButtonText}>נקה הכל</Text>
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
                  { label: 'פוסטים שפורסמו', value: filteredPosts.length, icon: 'cube-outline' },
                  { label: 'לייקים', value: filteredPosts.reduce((sum, p) => sum + (p.likes || 0), 0), icon: 'heart-outline' },
                  { label: 'תגובות', value: filteredPosts.reduce((sum, p) => sum + (p.comments || 0), 0), icon: 'chatbubble-outline' },
                ]}
              />
            </View>

            {/* Add Links Section */}
            <View style={localStyles.section}>
              <Text style={localStyles.sectionTitle}>קישורים שימושיים</Text>
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
                <Text style={localStyles.label}>כותרת הפריט</Text>
                <TextInput ref={titleInputRef} style={localStyles.input} value={title} onChangeText={setTitle} placeholder="לדוגמה: ספה 3 מושבים" />
              </View>
            </View>

            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <Text style={localStyles.label}>תיאור</Text>
                <TextInput style={[localStyles.input, { height: 80 }]} value={description} onChangeText={setDescription} placeholder="מצב הפריט, מידות, הערות" multiline />
              </View>
            </View>

            {/* בחירת קטגוריה - דרופדאון */}
            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <Text style={localStyles.label}>קטגוריה</Text>
                <TouchableOpacity
                  style={localStyles.dropdownButton}
                  onPress={() => setShowCategoryDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    localStyles.dropdownButtonText,
                    !selectedCategory && localStyles.dropdownPlaceholder
                  ]}>
                    {ITEM_CATEGORIES.find(c => c.id === selectedCategory)?.label || 'בחר קטגוריה'}
                  </Text>
                  <Icon
                    name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal לבחירת קטגוריה */}
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
                    <Text style={localStyles.modalTitle}>בחר קטגוריה</Text>
                    <TouchableOpacity
                      onPress={() => setShowCategoryDropdown(false)}
                      style={localStyles.modalCloseButton}
                    >
                      <Icon name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={ITEM_CATEGORIES}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          localStyles.dropdownItem,
                          selectedCategory === item.id && localStyles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedCategory(item.id as ItemType);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Icon
                          name={item.icon as any}
                          size={20}
                          color={selectedCategory === item.id ? colors.primary : colors.textSecondary}
                          style={localStyles.dropdownItemIcon}
                        />
                        <Text style={[
                          localStyles.dropdownItemText,
                          selectedCategory === item.id && localStyles.dropdownItemTextSelected
                        ]}>
                          {item.label}
                        </Text>
                        {selectedCategory === item.id && (
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
                <Text style={localStyles.label}>עיר</Text>
                <TextInput
                  style={localStyles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="תל אביב"
                />
              </View>
              <View style={localStyles.fieldSmall}>
                <Text style={localStyles.label}>כתובת</Text>
                <TextInput
                  style={localStyles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="רחוב 123"
                />
              </View>
            </View>

            {/* Quantity field */}
            <View style={localStyles.row}>
              <View style={localStyles.fieldSmall}>
                <Text style={localStyles.label}>כמות</Text>
                <View style={localStyles.counterRow}>
                  <TouchableOpacity style={localStyles.counterBtn} onPress={() => setQty(Math.max(1, qty - 1))}><Text style={localStyles.counterText}>-</Text></TouchableOpacity>
                  <Text style={localStyles.counterValue}>{qty}</Text>
                  <TouchableOpacity style={localStyles.counterBtn} onPress={() => setQty(qty + 1)}><Text style={localStyles.counterText}>+</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={localStyles.labelInline}>מצב</Text>
            <View style={localStyles.row}>
              <View style={localStyles.field}>
                <View style={localStyles.tagsRow}>
                  {[
                    { key: 'new', label: 'חדש' },
                    { key: 'like_new', label: 'כמו חדש' },
                    { key: 'used', label: 'משומש' },
                    { key: 'for_parts', label: 'לחלפים' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        localStyles.tag,
                        localStyles.tagSmall,
                        condition === (opt.key as any) && localStyles.tagSelected,
                      ]}
                      onPress={() => setCondition(opt.key as any)}
                    >
                      <Text
                        style={[
                          localStyles.tagText,
                          localStyles.tagTextSm,
                          condition === (opt.key as any) && localStyles.tagTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* כפתור העלאת תמונה */}
            <View style={localStyles.imageSection}>
              <Text style={localStyles.labelInline}>תמונה (אופציונלי)</Text>
              <TouchableOpacity
                style={localStyles.imagePickerButton}
                onPress={pickImage}
              >
                <Icon name="image-outline" size={24} color={colors.primary} />
                <Text style={localStyles.imagePickerText}>
                  {imageUri ? '✅ תמונה נבחרה' : 'בחר תמונה מהגלריה'}
                </Text>
              </TouchableOpacity>

              {/* תצוגה מקדימה של התמונה */}
              {imageUri && (
                <View style={localStyles.imagePreview}>
                  <Image source={{ uri: imageUri }} style={localStyles.previewImage} />
                  <View style={localStyles.imageInfo}>
                    <Text style={localStyles.imageInfoText}>✅ תמונה מוכנה</Text>
                    <Text style={localStyles.imageInfoSubtext}>80×80 פיקסלים</Text>
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
              <Text style={localStyles.offerButtonText}>פרסם פריט</Text>
            </TouchableOpacity>
          </View>

          <View style={localStyles.section}>
            <Text style={localStyles.sectionTitle}>פריטים שפרסמת לאחרונה</Text>
            {recentPosts.length === 0 ? (
              <Text style={localStyles.emptyStateText}>אין פוסטים שפורסמו עדיין</Text>
            ) : (
              <View style={localStyles.recentContainer}>
                {recentPosts.map((post) => {
                  // Container has paddingHorizontal: 16, scrollContent has paddingHorizontal: 16, 
                  // and recentContainer has paddingHorizontal: 8
                  // Total padding is 16 + 16 + 8 = 40 on each side
                  const totalPadding = 16 + 16 + 8;
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
            <Text style={localStyles.sectionTitle}>קישורים שימושיים</Text>
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
        title={t('common.options') || 'Options'}
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
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120, flexGrow: 1 },
  formContainer: { padding: 5, alignItems: 'center', borderRadius: 15, marginBottom: 15 },
  row: { flexDirection: rowDirection('row-reverse'), gap: 10, width: '100%', paddingHorizontal: 8 },
  field: { flex: 1 },
  fieldSmall: { flex: 0.5 },
  label: { fontSize: FontSizes.medium, fontWeight: '600', color: colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  labelInline: { marginTop: 3, flex: 1, fontSize: FontSizes.medium, fontWeight: '600', color: colors.textPrimary, ...marginStartEnd(6, 0) },
  input: { backgroundColor: colors.white, borderRadius: 10, padding: 12, fontSize: FontSizes.body, textAlign: biDiTextAlign('right'), color: colors.textPrimary, borderWidth: 1, borderColor: colors.secondary },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputWithAdornment: { paddingRight: 30 },
  inputAdornment: { position: 'absolute', right: 10, color: colors.textSecondary, fontSize: FontSizes.body },
  counterRow: { flexDirection: rowDirection('row'), alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.secondary, paddingHorizontal: 8, paddingVertical: 6 },
  counterBtn: { backgroundColor: colors.pinkLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  counterText: { fontSize: FontSizes.medium, fontWeight: 'bold', color: colors.textPrimary },
  counterValue: { fontSize: FontSizes.medium, fontWeight: 'bold', color: colors.textPrimary, minWidth: 30, textAlign: 'center' },
  tagsRow: { marginTop: 10, alignItems: 'stretch', flexDirection: rowDirection('row-reverse'), flexWrap: 'wrap', gap: 3 },
  tag: { backgroundColor: colors.pinkLight, borderWidth: 1, borderColor: colors.secondary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagSmall: { paddingHorizontal: 8, marginHorizontal: "4%", paddingVertical: 4 },
  tagSelected: { backgroundColor: colors.backgroundSecondary, borderColor: colors.success },
  tagText: { fontSize: FontSizes.small, color: colors.textPrimary },
  tagTextSm: { fontSize: FontSizes.caption },
  tagTextSelected: { color: colors.success, fontWeight: '600' },
  offerButton: { backgroundColor: colors.accent, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  offerButtonText: { color: colors.background, fontSize: FontSizes.medium, fontWeight: 'bold' },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: FontSizes.body, fontWeight: 'bold', alignSelf: 'center', color: colors.textPrimary, textAlign: 'center' },
  headerRow: { flexDirection: rowDirection('row-reverse'), justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  clearButton: { backgroundColor: colors.pinkLight, borderWidth: 1, borderColor: colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  clearButtonText: { fontSize: FontSizes.small, color: colors.textPrimary, fontWeight: '600' },
  noOuterScrollContainer: { flex: 1 },
  sectionWithScroller: { flex: 1, backgroundColor: colors.pinkLight, borderRadius: 12, borderWidth: 1, borderColor: colors.secondary, paddingVertical: 8, paddingHorizontal: 8 },
  innerScroll: { flex: 1 },
  itemsGridContainer: {},
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyStateTitle: { fontSize: FontSizes.body, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: FontSizes.small, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  emptyStateClearButton: { backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  emptyStateClearButtonText: { fontSize: FontSizes.small, color: colors.background, fontWeight: '600' },
  itemCardWrapper: { marginBottom: 8, width: '100%' },
  itemCard: { backgroundColor: colors.pinkLight, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: colors.secondary },
  itemRow: { flexDirection: rowDirection('row-reverse'), justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { fontSize: FontSizes.small, fontWeight: 'bold', color: colors.textPrimary, textAlign: biDiTextAlign('right'), flex: 1, marginLeft: 6 },
  itemMeta: { fontSize: FontSizes.small, color: colors.textSecondary },
  itemBadge: { backgroundColor: colors.backgroundSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  itemBadgeText: { fontSize: FontSizes.small, color: colors.success, fontWeight: 'bold' },
  recentContainer: { paddingHorizontal: 8, paddingVertical: 8 },
  recentItemWrapper: { marginBottom: 8, width: '100%' },
  restoreChip: { backgroundColor: colors.pinkLight, borderWidth: 1, borderColor: colors.secondary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  restoreChipText: { fontSize: FontSizes.small, color: colors.textPrimary, fontWeight: '600' },
  deleteButton: {
    padding: 6,
    marginLeft: 12,
    backgroundColor: colors.pinkLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  itemImageContainer: {
    padding: 4,
    marginBottom: 4,
  },
  itemImageIndicator: {
    fontSize: FontSizes.small,
    color: colors.primary,
    fontWeight: '600',
  },
  imageSection: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  imagePickerText: {
    color: colors.primary,
    fontSize: FontSizes.medium,
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    marginLeft: 'auto',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    padding: 4,
  },
  imageInfo: {
    flex: 1,
    marginLeft: 12,
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
  // Dropdown styles
  dropdownButton: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    flexDirection: rowDirection('row-reverse'),
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: rowDirection('row-reverse'),
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: rowDirection('row-reverse'),
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.pinkLight,
  },
  dropdownItemIcon: {
    marginLeft: 12,
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


