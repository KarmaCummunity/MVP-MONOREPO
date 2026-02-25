import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, useRoute } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import HeaderComp from '../components/HeaderComp';
import DonationStatsFooter from '../components/DonationStatsFooter';
import ItemDetailsModal from '../components/ItemDetailsModal';
import { db } from '../utils/databaseService';
import { useUser } from '../stores/userStore';
import ScrollContainer from '../components/ScrollContainer';
import AddLinkComponent from '../components/AddLinkComponent';
import { useToast } from '../utils/toastService';
import { getScreenInfo, BREAKPOINTS, isMobileWeb } from '../globals/responsive';

// New Modular Components
import RideCard from '../components/rides/RideCard';
import RideHistoryCard from '../components/rides/RideHistoryCard';
import RideOfferForm from '../components/rides/RideOfferForm';
import VerticalGridSlider from '../components/VerticalGridSlider';
import { postsService } from '../utils/postsService';
import PostReelItem from '../components/Feed/PostReelItem';
import { usePostMenu } from '../hooks/usePostMenu';
import OptionsModal from '../components/Feed/OptionsModal';
import ReportPostModal from '../components/Feed/ReportPostModal';
import { FeedItem } from '../types/feed';

export default function TrumpScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  console.log('🚗 TrumpScreen - Refactored Component Rendered');

  const { ToastComponent } = useToast();
  const route = useRoute();
  const routeParams = route.params as { mode?: string } | undefined;

  // Get initial mode from URL (deep link) or default to search mode (מחפש)
  // mode: false = Offer Mode (Driver/פרסום), true = Search Mode (Passenger/חיפוש)
  // URL mode: 'offer' = false, 'search' = true
  // Default is search mode (true)
  const initialMode = routeParams?.mode === 'offer' ? false : true;

  const [mode, setMode] = useState(initialMode); // false = Offer Mode (Driver/פרסום), true = Search Mode (Passenger/חיפוש)
  const { t } = useTranslation(['donations', 'common', 'trump', 'search']);

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
  const handleReportSubmit = async (reason: string) => {
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
  }, [routeParams?.mode]);

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

  // === Shared State ===
  const { selectedUser } = useUser();
  const tabBarHeight = useBottomTabBarHeight() || 0;
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // === Data State ===
  const [allRides, setAllRides] = useState<any[]>([]); // Active rides for search (legacy, for offer mode)
  const [filteredRides, setFilteredRides] = useState<any[]>([]); // Filtered active rides (legacy, for offer mode)
  const [recentRides, setRecentRides] = useState<any[]>([]); // User's Published History (legacy)
  // Posts state for search mode
  const [allPosts, setAllPosts] = useState<FeedItem[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<FeedItem[]>([]);
  // Posts state for offer mode history
  const [recentPosts, setRecentPosts] = useState<FeedItem[]>([]);

  // === Modal State ===
  const [selectedRide, setSelectedRide] = useState<any | null>(null);
  const [showRideModal, setShowRideModal] = useState(false);

  // === Search Mode State ===
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);

  // === Offer Mode Form State ===
  const [toLocation, setToLocation] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [detectedAddress, setDetectedAddress] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationError, setIsLocationError] = useState(false);

  // Location Fetching Effect - Only run if mounted
  useEffect(() => {
    if (!isMounted) return;

    let isMountedLocal = true;

    const getLocation = async () => {
      if (!useCurrentLocation) {
        setDetectedAddress("");
        setIsLocationError(false);
        return;
      }

      setIsLocating(true);
      setIsLocationError(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMountedLocal) {
            setDetectedAddress(t('trump:errors.locationPermissionDenied') || "Permission denied");
            setIsLocationError(true);
            setIsLocating(false);
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });

        console.log('📍 Reverse Geocode Result:', JSON.stringify(reverseGeocode, null, 2));

        if (isMountedLocal && reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];

          // Construct a robust address string
          // 1. Street + Number
          const streetPart = [addr.street, addr.streetNumber].filter(Boolean).join(' ');

          // 2. Fallback to 'name' if street is missing (often 'name' contains the PoI or street equivalent)
          const firstPart = streetPart || addr.name || '';

          // 3. City hierarchy: City -> Subregion -> District -> Region
          const cityPart = addr.city || addr.subregion || addr.district || addr.region || '';

          // 4. Combine
          let formattedAddress = [firstPart, cityPart].filter(Boolean).join(', ');

          // 5. Final fallback if empty
          if (!formattedAddress.trim()) {
            formattedAddress = `${t('trump:near')} ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
          }

          setDetectedAddress(formattedAddress);
          setIsLocationError(false);
        } else {
          if (isMountedLocal) {
            setDetectedAddress(t('trump:errors.locationFetchFailed') || "Address not found");
            setIsLocationError(true);
          }
        }
      } catch (error) {
        console.error("Error fetching location:", error);
        if (isMountedLocal) {
          setDetectedAddress(t('trump:errors.locationFetchFailed') || "Location unavailable");
          setIsLocationError(true);
        }
      } finally {
        if (isMountedLocal) setIsLocating(false);
      }
    };

    if (useCurrentLocation) {
      getLocation();
    }

    return () => { isMountedLocal = false; };
  }, [useCurrentLocation, t, isMounted]);

  // Advanced Scheduling State
  const [immediateDeparture, setImmediateDeparture] = useState(true); // 1. Immediate?
  const [departureTime, setDepartureTime] = useState("");           // 2. If not, what time?
  const [leavingToday, setLeavingToday] = useState(true);           // 3. If time set, is it today?
  const [rideDate, setRideDate] = useState<Date>(new Date());       // 4. If not today, what date?
  const [isRecurring, setIsRecurring] = useState(false);            // 5. Recurring?
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'day' | 'week' | 'month' | null>(null);

  // Ensure rideDate is always valid
  const handleDateChange = (date: Date) => {
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      setRideDate(date);
    } else {
      setRideDate(new Date());
    }
  };

  // Other Offer Details
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState("0");
  const [needToPay, setNeedToPay] = useState(false);
  const [selectedFormTags, setSelectedFormTags] = useState<string[]>([]);

  // Static Options (Now Translated Keys mapped to Labels)
  // trump:filters is now an object with keys like {noCostSharing: "...", noSmoking: "...", ...}
  const filtersObj = (t('trump:filters', { returnObjects: true }) as Record<string, string>) || {};
  // Use keys instead of values so SearchBar can translate them properly
  const trumpFilterOptions = Object.keys(filtersObj);

  const trumpSortOptions = (t('trump:sorts', { returnObjects: true }) as unknown as string[]) || [];

  // Inside render / HeaderComp prop:
  // placeholder={mode ? t('trump:ui.searchPlaceholder.offer') : t('trump:ui.searchPlaceholder.seek')}

  // Helper to map API post to FeedItem (same as useFeedData.mapPostToItem)
  const mapPostToFeedItem = (post: any): FeedItem => {
    // For ride posts, extract ride-specific data (same logic as useFeedData)
    let rideData: any = {};
    const formatRideTime = (dateIso: string) => {
      if (!dateIso) return { time: '', date: '' };
      const dep = new Date(dateIso);
      if (isNaN(dep.getTime())) return { time: '', date: '' };

      const hours = dep.getHours().toString().padStart(2, '0');
      const minutes = dep.getMinutes().toString().padStart(2, '0');

      const day = dep.getDate().toString().padStart(2, '0');
      const month = (dep.getMonth() + 1).toString().padStart(2, '0');
      const year = dep.getFullYear();

      return {
        time: `${hours}:${minutes}`,
        date: `${day}.${month}.${year}`
      };
    };

    // 1. Try ride_data from DB Join (same as useFeedData)
    if (post.ride_data) {
      const rd = post.ride_data;
      const { time, date } = formatRideTime(rd.departure_time);

      rideData = {
        from: typeof rd.from_location === 'string' ? rd.from_location : (rd.from_location?.name || rd.from_location?.city || ''),
        to: typeof rd.to_location === 'string' ? rd.to_location : (rd.to_location?.name || rd.to_location?.city || ''),
        seats: rd.available_seats || 0,
        price: rd.price_per_seat || 0,
        time,
        date
      };
    }
    // 2. Fallback to metadata (same as useFeedData)
    else if ((post.post_type === 'ride' || post.post_type === 'ride_offered') && post.metadata) {
      const meta = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
      const r = meta.ride || meta;

      // Check departure_time (schema) or time/date (legacy/manual)
      let timeStr = r.time || '';
      let dateStr = r.date || '';

      if (r.departure_time) {
        const formatted = formatRideTime(r.departure_time);
        if (formatted.time) timeStr = formatted.time;
        if (formatted.date) dateStr = formatted.date;
      }

      rideData = {
        from: typeof r.from_location === 'string' ? r.from_location : (r.from_location?.name || r.from_location?.city || r.from || ''),
        to: typeof r.to_location === 'string' ? r.to_location : (r.to_location?.name || r.to_location?.city || r.to || ''),
        seats: r.available_seats || r.seats || 0,
        price: r.price_per_seat || r.price || 0,
        time: timeStr,
        date: dateStr
      };
    }

    // Ensure user is always defined (same format as useFeedData)
    const author = post.author || {};
    const userId = author.id || post.author_id || 'unknown';
    const userName = author.name || 'common.unknownUser';
    const userAvatar = author.avatar_url || undefined;

    return {
      id: post.id,
      type: post.post_type || 'post',
      subtype: post.post_type, // Same as useFeedData - e.g. 'ride', 'ride_offered'
      title: post.title || 'post.noTitle', // Same as useFeedData
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
      // Add ride-specific fields if this is a ride post (same as useFeedData)
      ...rideData
    };
  };

  // --- 1. Data Loading ---
  const loadRides = useCallback(async (includePastOverride?: boolean) => {
    try {
      const uid = selectedUser?.id || 'guest';
      console.log('🔄 Loading rides/posts for user:', uid, 'mode:', mode);

      if (mode) {
        // Search mode - load posts
        console.log('🔍 מצב מחפש - טוען פוסטים של טרמפים');
        try {
          const postsResponse = await postsService.getPosts(100, 0, uid, 'ride');
          if (postsResponse.success && Array.isArray(postsResponse.data)) {
            const mappedPosts = postsResponse.data.map(mapPostToFeedItem);
            setAllPosts(mappedPosts);
            setFilteredPosts(mappedPosts);
            console.log('✅ טעינת פוסטים הצליחה:', mappedPosts.length, 'פוסטים');
          } else {
            console.warn('⚠️ טעינת פוסטים נכשלה:', postsResponse.error);
            setAllPosts([]);
            setFilteredPosts([]);
          }
        } catch (error) {
          console.error('❌ שגיאה בטעינת פוסטים:', error);
          setAllPosts([]);
          setFilteredPosts([]);
        }
        return; // Don't load rides in search mode
      }

      // Offer mode - load posts for history
      console.log('🔵 מצב מציע - טוען פוסטים של המשתמש להיסטוריה:', uid);
      try {
        // טוען את הפוסטים של המשתמש
        const { apiService } = await import('../utils/apiService');
        const postsResponse = await apiService.getUserPosts(uid, 50, uid);
        
        if (postsResponse.success && Array.isArray(postsResponse.data)) {
          // מסנן רק פוסטים של טרמפים
          const ridePosts = postsResponse.data.filter((post: any) => 
            post.post_type === 'ride' || post.post_type === 'ride_offered' || post.ride_id
          );
          
          // ממפה את הפוסטים
          const mappedPosts = ridePosts
            .map(mapPostToFeedItem)
            .filter((post: FeedItem | null): post is FeedItem => 
              post !== null && post !== undefined && post.user && post.user.id && post.user.name
            );
          
          setRecentPosts(mappedPosts);
          console.log('✅ טעינת פוסטים להיסטוריה הצליחה:', mappedPosts.length, 'פוסטים');
        } else {
          console.warn('⚠️ טעינת פוסטים להיסטוריה נכשלה:', postsResponse.error);
          setRecentPosts([]);
        }
      } catch (error) {
        console.error('❌ שגיאה בטעינת פוסטים להיסטוריה:', error);
        setRecentPosts([]);
      }

      // עדיין טוען rides לצורך history (legacy support)
      const shouldIncludePast = includePastOverride !== undefined
        ? includePastOverride
        : selectedFilters.includes('includePast');

      const [activeRides, myHistory] = await Promise.all([
        db.listRides(uid, { includePast: shouldIncludePast }),
        selectedUser?.id ? db.getUserRides(selectedUser.id, 'driver') : Promise.resolve([])
      ]);

      // Enrich activeRides with real user names
      const enrichedRides = await Promise.all((activeRides || []).map(async (ride: any) => {
        const driverId = ride.driverId;
        const needsFetch = !ride.driverName || ride.driverName === driverId || ride.driverName === 'Driver';

        if (needsFetch && driverId) {
          try {
            const user = await db.getUser(driverId) as any;
            if (user && user.name && user.name !== driverId) {
              return { ...ride, driverName: user.name };
            }
          } catch (e) {
            // Ignore error
          }
        }
        return ride;
      }));

      setAllRides(enrichedRides);

      // Map history to UI format (legacy)
      const userRecent = (myHistory || []).map((r: any) => ({
        ...r,
        status: r.status || 'active',
        price: r.price || 0,
      }));
      setRecentRides(userRecent);
    } catch (e) {
      console.error("❌ Failed to load rides", e);
      setAllRides([]);
      setRecentRides([]);
    }
  }, [selectedUser?.id, t, selectedFilters]);

  // Reload rides when includePast filter changes
  useEffect(() => {
    if (mode) { // Only in search mode
      const shouldIncludePast = selectedFilters.includes('includePast');
      loadRides(shouldIncludePast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters, mode]); // Reload when filters change

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 useFocusEffect triggered, refreshKey:', refreshKey);
      loadRides();
    }, [loadRides, refreshKey])
  );

  // --- 2. Search Logic (Search Mode) ---
  const getFilteredRides = useCallback(() => {
    // In search mode, filter posts instead of rides
    if (mode) {
      let filtered = [...allPosts];

      console.log('🔍 Filtering posts - Total:', allPosts.length, 'Search query:', searchQuery, 'Filters:', selectedFilters.length);

      // Filter by text
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(post =>
          (post.user?.name?.toLowerCase()?.includes(q) ?? false) ||
          (post.from?.toLowerCase()?.includes(q) ?? false) ||
          (post.to?.toLowerCase()?.includes(q) ?? false) ||
          (post.title?.toLowerCase()?.includes(q) ?? false) ||
          (post.description?.toLowerCase()?.includes(q) ?? false)
        );
        console.log('🔍 After text filter:', filtered.length);
      }

      // Apply Filters
      if (selectedFilters.length > 0) {
        selectedFilters.forEach(f => {
          if (f === 'noCostSharing') filtered = filtered.filter(p => (p.price ?? 0) === 0);
          // Add other filters as needed
        });
        console.log('🔍 After tag filters:', filtered.length);
      }

      // Sorting
      const selectedSort = selectedSorts[0];
      if (selectedSort) {
        if (selectedSort === t('trump:sort.byPrice')) filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        else if (selectedSort === t('trump:sort.byDate')) filtered.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
      }

      console.log('✅ Final filtered posts:', filtered.length);
      return filtered;
    }

    // In offer mode, filter rides as before
    let filtered = [...allRides];

    console.log('🔍 Filtering rides - Total:', allRides.length, 'Search query:', searchQuery, 'Filters:', selectedFilters.length);

    // Filter by text
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ride =>
        (ride.driverName?.toLowerCase()?.includes(q) ?? false) ||
        (ride.from?.toLowerCase()?.includes(q) ?? false) ||
        (ride.to?.toLowerCase()?.includes(q) ?? false) ||
        (ride.category?.toLowerCase()?.includes(q) ?? false)
      );
      console.log('🔍 After text filter:', filtered.length);
    }

    // Apply Filters (Search Mode Tags)
    if (selectedFilters.length > 0) {
      selectedFilters.forEach(f => {
        // f is now a key like 'noCostSharing', not the translated value
        if (f === 'noCostSharing') filtered = filtered.filter(r => (r.price ?? 0) === 0);
        if (f === 'noSmoking') filtered = filtered.filter(r => r.noSmoking);
        if (f === 'withPets') filtered = filtered.filter(r => r.petsAllowed);
        if (f === 'withKids') filtered = filtered.filter(r => r.kidsFriendly);
        if (f === 'includePast') {
          // Include past rides - don't filter them out
          // This filter is handled by the server, so we don't need to filter here
          // But we can add a visual indicator if needed
        }
      });
      console.log('🔍 After tag filters:', filtered.length);
    }

    // Sorting
    const selectedSort = selectedSorts[0];
    if (selectedSort) {
      if (selectedSort === t('trump:sort.byPrice')) filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      else if (selectedSort === t('trump:sort.byDate')) filtered.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
      // Add other sorts as needed
    }

    console.log('✅ Final filtered rides:', filtered.length);
    return filtered;
  }, [allRides, searchQuery, selectedFilters, selectedSorts, t]);

  useEffect(() => {
    if (mode) {
      setFilteredPosts(getFilteredRides() as FeedItem[]);
    } else {
      setFilteredRides(getFilteredRides() as any[]);
    }
  }, [getFilteredRides, mode]);

  const handleSearch = (query: string, filters?: string[], sorts?: string[]) => {
    if (!mode) {
      // Offer Mode: Header search input acts as "Destination"
      setToLocation(query);
    } else {
      // Search Mode: Standard search
      setSearchQuery(query);
      setSelectedFilters(filters || []);
      setSelectedSorts(sorts || []);
    }
  };

  // --- 3. Offer Logic (Create Ride) ---
  const isFormValid = (): boolean => {
    const hasDest = Boolean(toLocation && toLocation.trim().length > 0);
    // Origin validity:
    // If using current location, we MUST have a detected address.
    // Otherwise, we need a manual fromLocation.
    const hasOrigin = useCurrentLocation
      ? Boolean(detectedAddress && detectedAddress.length > 0 && !isLocationError)
      : Boolean(fromLocation && fromLocation.trim().length > 0);

    // Time validity:
    // If immediate, valid.
    // If not immediate, must have time.
    // If not immediate and not today, Date is technically always present (default), but conceptually checked.
    const hasTime = immediateDeparture || Boolean(departureTime && departureTime.trim().length > 0);

    // If recurring is selected, recurrence unit must be selected
    const hasRecurrenceUnit = !isRecurring || Boolean(recurrenceUnit);

    return Boolean(hasDest && hasOrigin && hasTime && hasRecurrenceUnit);
  };

  const handleCreateRide = async () => {
    if (!isFormValid()) {
      // Provide detailed error messages
      const errors: string[] = [];

      if (!toLocation || !toLocation.trim()) {
        errors.push('יש להזין יעד');
      }

      if (useCurrentLocation) {
        if (!detectedAddress || isLocationError) {
          errors.push('אנא המתן לזיהוי המיקום או הזן כתובת ידנית');
        }
      } else {
        if (!fromLocation || !fromLocation.trim()) {
          errors.push('יש להזין כתובת יציאה');
        }
      }

      if (!immediateDeparture && (!departureTime || !departureTime.trim())) {
        errors.push('יש להזין שעת יציאה');
      }

      if (isRecurring && !recurrenceUnit) {
        errors.push('יש לבחור תדירות לנסיעה חוזרת');
      }

      Alert.alert(
        t('common:errorTitle') || 'שגיאה',
        errors.length > 0 ? errors.join('\n') : (t('trump:errors.formInvalid') || 'יש למלא את כל השדות הנדרשים')
      );
      return;
    }

    try {
      const uid = selectedUser?.id || 'guest';
      const rideId = `${Date.now()}`; // Or DB generated

      // --- Calculate Final Date ---
      let dateToSave: string;
      if (immediateDeparture || leavingToday) {
        dateToSave = new Date().toISOString().split('T')[0]; // Current date YYYY-MM-DD
      } else {
        // Ensure rideDate is valid before using toISOString
        const validDate = rideDate && rideDate instanceof Date && !isNaN(rideDate.getTime())
          ? rideDate
          : new Date();
        dateToSave = validDate.toISOString().split('T')[0]; // Selected date YYYY-MM-DD
      }

      // --- Calculate Final Time ---
      let timeToSave: string;
      if (immediateDeparture) {
        // Current time HH:MM in local timezone (not UTC)
        const now = new Date();
        // Use local time, not UTC
        const localHours = now.getHours();
        const localMinutes = now.getMinutes();
        timeToSave = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`;
        console.log('⏰ Immediate departure time (local):', timeToSave);
      } else {
        timeToSave = departureTime; // Selected HH:MM
        console.log('⏰ Selected departure time:', timeToSave);
      }

      const baseRideData = {
        driverId: uid,
        driverName: selectedUser?.name || 'Me', // Fallback name
        from: useCurrentLocation ? (detectedAddress || (t('trump:currentLocation') as string)) : fromLocation,
        to: toLocation,
        date: dateToSave,
        time: timeToSave,
        seats: seats,
        price: Number(price) || 0,
        noSmoking: selectedFormTags.includes('noSmoking') || selectedFormTags.includes(t('trump:filters.noSmoking') as string),
        petsAllowed: selectedFormTags.includes('withPets') || selectedFormTags.includes(t('trump:filters.withPets') as string),
        kidsFriendly: selectedFormTags.includes('withKids') || selectedFormTags.includes(t('trump:filters.withKids') as string),
        isRecurring: isRecurring,
        recurrenceFrequency: recurrenceFrequency,
        recurrenceUnit: recurrenceUnit,
        status: 'active' // Changed from 'published' to 'active' to match server filter
      };

      // Calculate base departure datetime for recurring rides
      // Use local timezone, not UTC
      const [hours, minutes] = timeToSave.split(':').map(Number);
      const baseDate = new Date(dateToSave + 'T00:00:00'); // Create date in local timezone
      baseDate.setHours(hours, minutes, 0, 0);
      console.log('📅 Base date calculated:', baseDate.toISOString(), 'Local:', baseDate.toLocaleString('he-IL'));

      // Create the first ride
      console.log('🚗 Creating ride with data:', JSON.stringify(baseRideData, null, 2));
      await db.createRide(uid, rideId, baseRideData);
      console.log('✅ Ride created successfully');

      // If recurring, create 5 future instances
      if (isRecurring && recurrenceUnit) {
        const instancesToCreate = 5;
        for (let i = 1; i <= instancesToCreate; i++) {
          const nextDate = new Date(baseDate);

          // Calculate next occurrence based on frequency and unit
          switch (recurrenceUnit) {
            case 'day':
              // Every X days
              nextDate.setDate(nextDate.getDate() + (recurrenceFrequency * i));
              break;
            case 'week':
              // Every X weeks
              nextDate.setDate(nextDate.getDate() + (recurrenceFrequency * 7 * i));
              break;
            case 'month':
              // Every X months
              nextDate.setMonth(nextDate.getMonth() + (recurrenceFrequency * i));
              break;
          }

          const nextDateStr = nextDate.toISOString().split('T')[0];
          const nextTimeStr = `${String(nextDate.getHours()).padStart(2, '0')}:${String(nextDate.getMinutes()).padStart(2, '0')}`;

          const recurringRideData = {
            ...baseRideData,
            date: nextDateStr,
            time: nextTimeStr,
          };

          const recurringRideId = `${Date.now()}_${i}`;
          await db.createRide(uid, recurringRideId, recurringRideData);
        }
      }

      // Reset Form
      setToLocation('');
      setFromLocation('');
      setDepartureTime('');
      setImmediateDeparture(true); // Default back to immediate
      setLeavingToday(true);         // Default back to today
      setRideDate(new Date());       // Reset date
      setIsRecurring(false);         // Reset recurring
      setRecurrenceFrequency(1);     // Reset recurrence frequency
      setRecurrenceUnit(null);       // Reset recurrence unit
      setUseCurrentLocation(true);
      setSeats(3);
      setPrice('0');
      setSelectedFormTags([]);

      // Also clear header search if possible via searchQuery state if it was bound
      if (!mode) setSearchQuery('');

      Alert.alert(t('trump:success.title') as string, t('trump:success.ridePublished') as string);

      // Refresh Data - wait a bit for backend to update cache
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1500);

    } catch (e) {
      console.error("Failed to create ride", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      Alert.alert(
        t('common:errorTitle') as string,
        `${t('trump:errors.saveFailed') as string}\n${errorMessage}`
      );
    }
  };

  // --- 4. History Actions ---
  const handleDeleteRide = async (ride: any) => {
    Alert.alert(
      t('trump:alerts.deleteRideTitle') || 'מחיקת טרמפ',
      t('trump:alerts.deleteRideBody') || 'האם למחוק טרמפ זה?',
      [
        { text: t('common:cancel') as string, style: 'cancel' },
        {
          text: t('common:delete') as string,
          style: 'destructive',
          onPress: async () => {
            try {
              await db.updateRide(selectedUser?.id || 'guest', ride.id, { status: 'cancelled' });
              // Optimistic UI Update
              setRecentRides(prev => prev.map(r => r.id === ride.id ? { ...r, status: 'cancelled' } : r));
            } catch (e) {
              console.error('Delete ride failed', e);
              Alert.alert('Error', 'Failed to delete ride');
            }
          }
        }
      ]
    );
  };

  const handleRestoreRide = (ride: any) => {
    // Populate form with ride data
    setToLocation(ride.to || '');
    setFromLocation(ride.from || '');
    setUseCurrentLocation(ride.from === t('trump:currentLocation'));
    setDepartureTime(ride.time || '');

    // Logic for restoring specific time vs immediate is tricky, default to explicit time
    setImmediateDeparture(false);
    setSeats(ride.seats || 3);
    setPrice(String(ride.price || 0));
    // If date is in future, we set it, otherwise default to today logic or keep it old? 
    // Usually restore is for convenience, so let's default to logic that user can adjust.
    // Let's assume user wants to repost for today or same settings
    setLeavingToday(true);
    setRideDate(new Date());

    Alert.alert(t('trump:alerts.restoreDoneTitle') || 'שוחזר', 'פרטי הטרמפ הועתקו לטופס');
  };

  // --- Render Helpers ---
  const handleToggleMode = () => setMode(!mode);

  const handleSelectRide = (ride: any) => {
    setSelectedRide(ride);
    setShowRideModal(true);
  };

  // Calculate grid layout for search mode
  const { width } = Dimensions.get('window');
  const { isTablet, isDesktop } = getScreenInfo();
  const isDesktopWeb = Platform.OS === 'web' && width > BREAKPOINTS.TABLET;
  const isMobile = isMobileWeb();

  // Initialize with appropriate default, but allow user control via slider
  const [numColumns, setNumColumns] = useState(() => (isTablet || isDesktop || isDesktopWeb) ? 3 : 2);

  // Use same padding values as PostsReelsScreen for consistency
  const HORIZONTAL_PADDING = isMobile ? 8 : 16;
  const COLUMN_GAP = isMobile ? 8 : 16;
  const screenPadding = HORIZONTAL_PADDING;
  const cardGap = COLUMN_GAP;
  // Calculate card width: full width minus padding on both sides, minus gaps between columns
  const cardWidth = numColumns === 1 
    ? width - (screenPadding * 2) 
    : (width - (screenPadding * 2) - (cardGap * (numColumns - 1))) / numColumns;

  const handleCloseRideModal = () => {
    setShowRideModal(false);
    setSelectedRide(null);
  };

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
          // Navigate to post details or open modal
          console.log('Post pressed:', item.id);
        }}
        onCommentPress={(item) => {
          // Handle comment press
          console.log('Comment pressed:', item.id);
        }}
        onMorePress={handleMorePress}
      />
    );
  }, [numColumns, screenPadding, width, handleMorePress]);

  // Empty component for FlatList
  const renderEmptyPosts = useCallback(() => (
    <View style={localStyles.emptyState}>
      <Text style={localStyles.emptyStateTitle}>{t('trump:ui.noRidesFoundTitle')}</Text>
      <Text style={localStyles.emptyStateText}>{t('trump:ui.noRidesFoundBody')}</Text>
    </View>
  ), [t]);

  const handleSelectRideOld = (ride: any) => {
    // In Search Mode: Show join details/contact
    Alert.alert(
      t('trump:rideOf', { name: ride.driverName }) as string,
      `${ride.from} ➝ ${ride.to}\n⏰ ${ride.time}\n💰 ₪${ride.price}\n\n${t('trump:joinQuestion')}`,
      [
        { text: t('common:cancel') as string, style: 'cancel' },
        { text: t('trump:joinRide') as string, onPress: () => Alert.alert('בקשה נשלחה') }
      ]
    );
  };

  if (!isMounted) {
    return <View style={localStyles.safeArea} />;
  }

  return (
    <SafeAreaView style={localStyles.safeArea}>
      {/* Header handles Search Mode inputs & Mode Toggle */}
      <HeaderComp
        mode={mode}
        menuOptions={['היסטוריה', 'הגדרות']}
        onToggleMode={handleToggleMode}
        onSelectMenuItem={() => { }}
        title=""
        // Dynamic placeholder based on mode
        placeholder={mode ? t('trump:ui.searchPlaceholder.seek') : t('trump:ui.searchPlaceholder.offer')}
        filterOptions={trumpFilterOptions}
        sortOptions={trumpSortOptions}
        searchData={allRides}
        onSearch={handleSearch}
        // Hide sort button in offer mode (mode === false)
        hideSortButton={!mode}
      />

      {!mode ? (
        // === OFFER MODE (Driver) - Show Form ===
        <ScrollContainer
          style={localStyles.container}
          contentStyle={localStyles.scrollContent}
          keyboardShouldPersistTaps="always"
        >
          {/* 1. Form */}
          <RideOfferForm
            destination={toLocation}
            onDestinationChange={setToLocation}

            fromLocation={fromLocation}
            onFromLocationChange={setFromLocation}
            useCurrentLocation={useCurrentLocation}
            onToggleCurrentLocation={setUseCurrentLocation}
            detectedAddress={detectedAddress}
            isLocating={isLocating}
            isLocationError={isLocationError}

            // Scheduling
            departureTime={departureTime}
            onDepartureTimeChange={setDepartureTime}
            immediateDeparture={immediateDeparture}
            onToggleImmediateDeparture={setImmediateDeparture}
            leavingToday={leavingToday}
            onToggleLeavingToday={setLeavingToday}
            rideDate={rideDate}
            onDateChange={handleDateChange}
            isRecurring={isRecurring}
            onToggleRecurring={setIsRecurring}
            recurrenceFrequency={recurrenceFrequency}
            onRecurrenceFrequencyChange={setRecurrenceFrequency}
            recurrenceUnit={recurrenceUnit}
            onRecurrenceUnitChange={setRecurrenceUnit}

            seats={seats}
            onSeatsChange={setSeats}
            price={price}
            onPriceChange={setPrice}

            selectedTags={selectedFormTags}
            onToggleTag={(tag) => {
              setSelectedFormTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
            }}
            availableTags={trumpFilterOptions}

            onSubmit={handleCreateRide}
            isValid={isFormValid()}
            hideDestinationInput={true} // New prop to hide internal input
          />

          {/* 2. History */}
          <View style={localStyles.section}>
            <Text style={localStyles.sectionTitle}>{t('trump:ui.yourRecentRides')}</Text>
            {recentPosts.length === 0 ? (
              <Text style={localStyles.emptyStateText}>{t('trump:ui.noRecentRides')}</Text>
            ) : (
              recentPosts.map((post) => {
                // Container has paddingHorizontal: 16, so card width should account for that
                const containerPadding = 16;
                const historyCardWidth = width - (containerPadding * 2);
                return (
                  <View key={post.id} style={{ marginBottom: 16, width: '100%' }}>
                    <PostReelItem
                      item={post}
                      cardWidth={historyCardWidth}
                      numColumns={1}
                      onPress={(item) => {
                        console.log('Post pressed:', item.id);
                      }}
                      onCommentPress={(item) => {
                        console.log('Comment pressed:', item.id);
                      }}
                      onMorePress={handleMorePress}
                    />
                  </View>
                );
              })
            )}
          </View>

          {/* 3. Groups Section */}
          <View style={[localStyles.section, { marginTop: 30, paddingBottom: 20 }]}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={localStyles.sectionTitle}>{t('trump:ui.whatsappGroups')}</Text>
            </View>
            <AddLinkComponent category="trump" />
          </View>
        </ScrollContainer>
      ) : (
        // === SEARCH MODE (Passenger) - Show Search Results ===
        <View style={localStyles.searchContainer}>
          <VerticalGridSlider
            numColumns={numColumns}
            onNumColumnsChange={setNumColumns}
            style={{
              top: 10, // Relative to searchContainer
              left: 4,
              height: 160 // Pass height if needed by style? No, it's defined inside.
            }}
          />
          <View style={localStyles.resultsHeader}>
            <Text style={localStyles.resultsTitle}>
              {searchQuery ? `${t('trump:ui.searchResultsPrefix')} "${searchQuery}"` : t('trump:ui.availableRides')} ({filteredPosts.length})
            </Text>
          </View>

          <ScrollContainer
            contentStyle={localStyles.resultsList}
            showsVerticalScrollIndicator={false}
          >
            <FlatList
              data={filteredPosts}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id || String(Math.random())}
              key={numColumns} // Force re-render on column change
              numColumns={numColumns}
              columnWrapperStyle={numColumns > 1 ? localStyles.columnWrapper : undefined}
              contentContainerStyle={{ paddingHorizontal: screenPadding }}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              ListEmptyComponent={renderEmptyPosts}
              showsVerticalScrollIndicator={false}
            />

            {/* Groups Section (Restored) */}
            <View style={[localStyles.section, { marginTop: 30, paddingBottom: 40 }]}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={localStyles.sectionTitle}>
                  {t('trump:ui.whatsappGroups')}
                </Text>
              </View>
              <AddLinkComponent category="trump" />
            </View>

          </ScrollContainer>
        </View>
      )}

      {/* Ride Details Modal */}
      <ItemDetailsModal
        visible={showRideModal}
        onClose={handleCloseRideModal}
        item={selectedRide}
        type="ride"
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

      {/* Footer Stats (Visible in Search Mode usually, or always) */}
      {mode && (
        <DonationStatsFooter
          stats={[
            { label: t('trump:stats.availableRides') || 'זמינים', value: filteredPosts.length, icon: 'car-outline' },
            { label: 'לייקים', value: filteredPosts.reduce((sum, p) => sum + (p.likes || 0), 0), icon: 'heart-outline' },
            { label: 'תגובות', value: filteredPosts.reduce((sum, p) => sum + (p.comments || 0), 0), icon: 'chatbubble-outline' },
          ]}
        />
      )}
      {ToastComponent}
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary_2,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 20,
  },
  // Search Mode Styles
  searchContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    // paddingBottom: 80, // Removed to allow full usage of space; footer is in-flow
  },
  resultsHeader: {
    marginBottom: 10,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resultsList: {
    paddingBottom: 20,
    flexGrow: 1, // ensure it fills space if needed
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});
