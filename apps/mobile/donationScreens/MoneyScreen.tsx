import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, useRoute } from '@react-navigation/native';
import { FontSizes } from '../globals/constants';
// Empty arrays - replace with real data from API
const charityNames: string[] = [];
const charities: any[] = [];
const donations: any[] = [];
import { charitiesStore } from '../utils/charitiesStore';
import { donationResources } from '../utils/donationResources';
import { useUser } from '../stores/userStore';
import ScrollContainer from '../components/ScrollContainer';

// Convert new charity format to old dummy format for compatibility
const dummyCharitiesBase = charities.map((charity, index) => ({
  id: index + 1,
  name: charity.name,
  category: charity.tags[0] || "כללי",
  location: charity.location.city,
  rating: charity.rating,
  donors: charity.volunteersCount + charity.beneficiariesCount,
  description: charity.description.substring(0, 100) + "...",
  image: charity.tags[0] === "קשישים" ? "👴" :
    charity.tags[0] === "חינוך" ? "📚" :
      charity.tags[0] === "בעלי חיים" ? "🐕" :
        charity.tags[0] === "בריאות" ? "🏥" : "💝",
  minDonation: 20 + (index * 10)
}));

// Convert donations to old format for recent donations
const dummyRecentDonationsBase = donations.slice(0, 5).map((donation, index) => ({
  id: index + 1,
  charityName: charities[index % charities.length]?.name || "עמותה לא ידועה",
  amount: donation.amount || 100,
  date: new Date(donation.createdAt).toLocaleDateString('he-IL'),
  status: "הושלמה",
  category: donation.category || "כללי"
}));
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { Slider } from '@miblanchard/react-native-slider';
import HeaderComp from '../components/HeaderComp';
import DonationStatsFooter from '../components/DonationStatsFooter';
import AddLinkComponent from '../components/AddLinkComponent';

// Slider component using @miblanchard/react-native-slider
const DonationAmountSlider: React.FC<{
  value: number;
  onChange: (nextValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ value, onChange, min = 0, max = 1000, step = 5 }) => {
  const toNumber = (v: number | number[]) => (Array.isArray(v) ? v[0] : v);
  return (
    <View style={localStyles.amountSliderContainer}>
      <Slider
        value={value}
        onValueChange={(v: number | number[]) => onChange(toNumber(v))}
        minimumValue={min}
        maximumValue={max}
        step={step}
        trackClickable
        containerStyle={{ paddingHorizontal: 0 }}
        trackStyle={localStyles.sliderTrack}
        minimumTrackTintColor={colors.secondary}
        maximumTrackTintColor="transparent"
        thumbStyle={localStyles.sliderThumb}
        renderThumbComponent={() => <View style={localStyles.sliderThumbInner} />}
      />
      <View style={localStyles.amountRangeRow}>
        <Text style={localStyles.amountRangeText}>₪{min}</Text>
        <Text style={localStyles.amountDisplayText}>₪{value}</Text>
        <Text style={localStyles.amountRangeText}>₪{max}</Text>
      </View>
    </View>
  );
};

export default function MoneyScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const route = useRoute();
  const routeParams = route.params as { mode?: string } | undefined;

  const { isRealAuth } = useUser();
  const { t } = useTranslation(['donations', 'common']);
  // Debug log for MoneyScreen
  // console.log('💰 MoneyScreen - Component rendered');
  // console.log('💰 MoneyScreen - Navigation object:', navigation);
  // console.log('💰 MoneyScreen - Navigation state:', JSON.stringify(navigation.getState(), null, 2));
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('50');

  // Get initial mode from URL (deep link) or default to search mode (מחפש)
  // mode: true = offerer (wants to donate), false = seeker (needs help)
  // URL mode: 'offer' = true, 'search' = false
  // Default is search mode (false)
  const initialMode = routeParams?.mode === 'offer' ? true : false;
  const [mode, setMode] = useState(initialMode);

  // Update mode when route params change (e.g., from deep link)
  useEffect(() => {
    if (routeParams?.mode && routeParams.mode !== 'undefined' && routeParams.mode !== 'null') {
      const newMode = routeParams.mode === 'offer' ? true : false;
      if (newMode !== mode) {
        setMode(newMode);
      }
    }
  }, [routeParams?.mode]);

  // Update URL when mode changes (toggle button pressed) or when screen loads without mode
  useEffect(() => {
    const newMode = mode ? 'offer' : 'search';
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Build external charities from donationResources to appear as donation cards
  const externalCharities = React.useMemo(() => {
    const categoryIds = Object.keys(donationResources || {}) as string[];
    const toEmoji = (id: string): string => {
      switch (id) {
        case 'food': return '🍞';
        case 'clothes': return '👕';
        case 'books': return '📚';
        case 'furniture': return '🛋️';
        case 'medical': return '🏥';
        case 'animals': return '🐾';
        case 'housing': return '🏠';
        case 'support': return '💟';
        case 'education': return '🎓';
        case 'environment': return '🌿';
        case 'technology': return '💻';
        case 'knowledge': return '🧠';
        default: return '💝';
      }
    };
    const list: any[] = [];
    categoryIds.forEach((catId) => {
      const resources = (donationResources as any)[catId] || [];
      const categoryTitle = (t(`donations:categories.${catId}.title`) as string) || catId;
      resources.forEach((res: any, index: number) => {
        list.push({
          id: `ext_${catId}_${index}`,
          name: res.name,
          category: categoryTitle,
          location: 'כל הארץ',
          rating: 4.7,
          donors: 500 + (index * 7),
          description: res.description || categoryTitle,
          image: toEmoji(catId),
          minDonation: 20,
          _extUrl: res.url,
        });
      });
    });
    // Deduplicate by name
    const seen = new Set<string>();
    return list.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
  }, [t]);

  const combinedCharities = React.useMemo(() => {
    const mapFromStore = charitiesStore.map((c, index) => ({
      id: `store_${c.id}`,
      name: c.name,
      category: (c.categories && c.categories[0]) ? String(c.categories[0]) : 'כללי',
      location: c.location?.city || 'כל הארץ',
      rating: 4.8,
      donors: 100 + index * 5,
      description: c.description || '',
      image: '💝',
      minDonation: 20,
      _extUrl: c.url,
    }));
    const dummies = isRealAuth ? [] : dummyCharitiesBase;
    return [...mapFromStore, ...dummies, ...externalCharities];
  }, [externalCharities]);

  const [filteredCharities, setFilteredCharities] = useState(combinedCharities); // Search results

  // Menu modals state
  const [isSavingsModalVisible, setIsSavingsModalVisible] = useState(false);
  const [isRecurringModalVisible, setIsRecurringModalVisible] = useState(false);
  const [isReceiptsModalVisible, setIsReceiptsModalVisible] = useState(false);

  // Charity modal state
  const [isCharityModalVisible, setIsCharityModalVisible] = useState(false);
  const [selectedCharityForModal, setSelectedCharityForModal] = useState<any | null>(null);
  const [charityModalIsOfferMode, setCharityModalIsOfferMode] = useState<boolean>(true);
  const [charityModalAmount, setCharityModalAmount] = useState<string>('50');

  // Quick donate preferred charity (fallback to top rated)
  const preferredCharity = filteredCharities.length > 0
    ? filteredCharities[0]
    : (isRealAuth ? (charitiesStore[0] ? {
      id: `store_${charitiesStore[0].id}`,
      name: charitiesStore[0].name,
      category: (charitiesStore[0].categories && charitiesStore[0].categories[0]) ? String(charitiesStore[0].categories[0]) : 'כללי',
      location: charitiesStore[0].location?.city || 'כל הארץ',
      rating: 4.8,
      donors: 100,
      description: charitiesStore[0].description || '',
      image: '💝',
      minDonation: 20,
      _extUrl: charitiesStore[0].url,
    } : null) : (dummyCharitiesBase[0] || null));

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('💰 MoneyScreen - Screen focused, refreshing data...');
      // Reset form when returning to screen
      setAmount('');
      setSelectedRecipient('');
      // Force re-render by updating refresh key
      setRefreshKey(prev => prev + 1);
    }, [])
  );
  const PAYBOX_WEB_URL = 'https://payboxapp.com/transfer?phone=0528616878&amount={AMOUNT}&note=תרומה%20לקהילה';
  const PAYBOX_GROUP_LINK: string | null = 'https://payboxapp.page.link/tfzsUhNpZzRqqe1g8';
  const BIT_GROUP_LINK: string | null = 'https://www.bitpay.co.il/app/share-info?i=192485429007_19klqS2v';

  const openPaymentApp = async (amount: number) => {
    const encodedReason = encodeURIComponent('תרומה לקהילה');
    const payboxGroupLink: string = (PAYBOX_GROUP_LINK ?? '').trim();
    const bitGroupLink: string = (BIT_GROUP_LINK ?? '').trim();
    const bitUrl = `bit://pay?phone=0528616878&amount=${amount}&reason=${encodedReason}`;

    try {
      // 1) עדיפות: פתיחה ישירה של קבוצת PayBox "Karma Community" אם סופק קישור (ננסה לפתוח ישר)
      if (payboxGroupLink.length > 0) {
        try {
          if (Platform.OS === 'web') {
            (window as any).open(payboxGroupLink, '_blank');
            return;
          }
          await Linking.openURL(payboxGroupLink);
          return;
        } catch { }
      }

      // 1b) עדיפות שנייה: פתיחה ישירה של קבוצת Bit אם יש קישור
      if (bitGroupLink.length > 0) {
        try {
          if (Platform.OS === 'web') {
            (window as any).open(bitGroupLink, '_blank');
            return;
          }
          await Linking.openURL(bitGroupLink);
          return;
        } catch { }
      }

      // 2) אם לא נפתח קישור קבוצה: נוודא שיש סכום חיובי לפני מסלולי סכום ישירים
      if (!amount || amount <= 0) {
        Alert.alert('שגיאה', 'אנא בחר סכום חיובי לפני פתיחת התשלום.');
        return;
      }

      // 3) ניסיון לפתוח PayBox עם סכום והערה (אפליקציה)
      const payboxScheme = `paybox://transfer?phone=0528616878&amount=${amount}&note=${encodedReason}`;
      const supportedPb = await Linking.canOpenURL(payboxScheme);
      if (supportedPb) {
        await Linking.openURL(payboxScheme);
        return;
      }

      // 4) ניסיון דרך דפדפן: אם יש קישור קבוצה — נשתמש בו; אחרת קישור העברה רגיל
      const webUrl = payboxGroupLink.length > 0
        ? payboxGroupLink
        : PAYBOX_WEB_URL.replace('{AMOUNT}', String(amount));
      try {
        if (Platform.OS === 'web') {
          (window as any).open(webUrl, '_blank');
          return;
        }
        await Linking.openURL(webUrl);
        return;
      } catch { }

      // 5) Fallback אחרון: Bit
      const bitSupported = await Linking.canOpenURL(bitUrl);
      if (bitSupported) {
        await Linking.openURL(bitUrl);
        return;
      }
    } catch (error) {
      console.error('Error opening payment link:', error);
    }
    Alert.alert('שגיאה', 'לא ניתן לפתוח את קישור התשלום במכשיר זה.');
  };

  // Function to filter charities by search and filter
  const getFilteredCharities = () => {
    let filtered = [...combinedCharities];

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(charity =>
        charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charity.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedFilter) {
      filtered = filtered.filter(charity => charity.category === selectedFilter);
    }

    // Sorting
    switch (selectedSort) {
      case "אלפביתי":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "לפי מיקום":
        filtered.sort((a, b) => a.location.localeCompare(b.location));
        break;
      case "לפי תחום":
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "לפי מספר תורמים":
        filtered.sort((a, b) => b.donors - a.donors);
        break;
      case "לפי דירוג":
        filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        break;
      case "לפי רלוונטיות":
        // Default - by rating
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    return filtered;
  };

  // Function to filter recent donations
  const getFilteredRecentDonations = () => {
    const base = isRealAuth ? [] : dummyRecentDonationsBase;
    let filtered = [...base];

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(donation =>
        donation.charityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedFilter) {
      filtered = filtered.filter(donation => donation.category === selectedFilter);
    }

    return filtered;
  };

  // Function to show charity details in search mode
  const showCharityDetailsModal = (charity: any) => {
    Alert.alert(
      charity.name,
      `${charity.description}\n\n📞 צור קשר: 03-1234567\n📧 אימייל: info@${charity.name.replace(/\s+/g, '').toLowerCase()}.org.il\n\nהאם תרצה לתרום לעמותה זו?`,
      [
        {
          text: 'לא עכשיו',
          style: 'cancel',
        },
        {
          text: 'תרום עכשיו',
          onPress: () => showDonationAmountModal(charity),
        },
      ]
    );
  };

  // Function to select donation amount
  const showDonationAmountModal = (charity: any) => {
    Alert.prompt(
      'בחר סכום לתרומה',
      `לתרומה ל: ${charity.name}\n\nהכנס סכום:`,
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'תרום',
          onPress: (amount?: string) => {
            if (amount && !isNaN(Number(amount))) {
              Alert.alert(
                'תרומה בוצעה',
                `תודה על תרומתך בסך ₪${amount} ל-${charity.name}!`
              );
            } else {
              Alert.alert('שגיאה', 'אנא הכנס סכום תקין');
            }
          },
        },
      ],
      'plain-text',
      '50'
    );
  };


  const menuOptions = [
    'חיסכון לתרומה',
    'הוראות קבע',
    'קבלות ודוחות',
    'היסטוריית תרומות',
    'הגדרות תשלום',
    'עזרה',
    'צור קשר'
  ];

  // Specific filter and sort options for money screen
  const moneyFilterOptions = [
    "חינוך",
    "בריאות",
    "רווחה",
    "סביבה",
    "בעלי חיים",
    "נוער בסיכון",
    "קשישים",
    "נכים",
    "חולים",
    "משפחות במצוקה",
    "עולים חדשים",
    "קהילה",
  ];

  const moneySortOptions = [
    "אלפביתי",
    "לפי מיקום",
    "לפי תחום",
    "לפי תאריך הקמה",
    "לפי מספר תורמים",
    "לפי דירוג",
    "לפי רלוונטיות",
  ];

  // Function to handle search results from HeaderComp
  const handleSearch = (query: string, filters?: string[], sorts?: string[], results?: any[]) => {
    console.log('💰 MoneyScreen - Search received:', {
      query,
      filters: filters || [],
      sorts: sorts || [],
      resultsCount: results?.length || 0
    });

    // Update state with search results
    setSearchQuery(query);
    setSelectedFilter(filters?.[0] || ""); // Only first filter
    setSelectedSort(sorts?.[0] || ""); // Only first sort

    // If results are provided from SearchBar, use them
    if (results && results.length > 0) {
      setFilteredCharities(results);
    } else {
      // Otherwise, perform local filtering
      const filtered = getFilteredCharities();
      setFilteredCharities(filtered);
    }
  };

  const handleDonate = () => {
    if (!selectedRecipient || !amount) {
      Alert.alert('שגיאה', 'אנא בחר נמען וסכום לפני התרומה.');
    } else {
      Alert.alert(
        'תרומה בוצעה',
        `תודה על תרומתך בסך ₪${amount} ל-${selectedRecipient}!`
      );
    }
  };

  // Open Bit app to donate to a specific phone with optional amount and note
  const openBitDonation = async (phone: string, amountValue: number, note: string = 'תרומה לקהילה') => {
    try {
      // Deep link patterns used by Bit app; try multiple known schemes
      const encodedNote = encodeURIComponent(note);
      const attempts = [
        // iOS modern
        `bit://send?phone=${phone}&amount=${amountValue}&note=${encodedNote}`,
        // Android possible
        `com.poalim.bit://send?phone=${phone}&amount=${amountValue}&note=${encodedNote}`,
        // Generic
        `bitapp://send?phone=${phone}&amount=${amountValue}&note=${encodedNote}`,
      ];

      for (const url of attempts) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }

      // Fallbacks: try to open Bit app page or provide instruction
      const appStoreLink = Platform.OS === 'ios'
        ? 'https://apps.apple.com/il/app/bit/id1148052748'
        : 'https://play.google.com/store/apps/details?id=com.poalim.bit';
      await Linking.openURL(appStoreLink);
    } catch (e) {
      Alert.alert('Bit', 'לא ניתן לפתוח את Bit במכשיר זה כרגע.');
    }
  };

  const handleToggleMode = useCallback(() => {
    setMode(!mode);
    console.log('Mode toggled:', !mode ? 'נזקק' : 'תורם');
  }, [mode]);

  const handleSelectMenuItem = useCallback((option: string) => {
    if (option === 'חיסכון לתרומה') {
      setIsSavingsModalVisible(true);
      return;
    }
    if (option === 'הוראות קבע') {
      setIsRecurringModalVisible(true);
      return;
    }
    if (option === 'קבלות ודוחות') {
      setIsReceiptsModalVisible(true);
      return;
    }
    // Default fallback
    Alert.alert('תפריט', `נבחר: ${option}`);
  }, []);

  const openCharityModal = (charity: any, isOfferMode: boolean) => {
    setSelectedCharityForModal(charity);
    setCharityModalIsOfferMode(isOfferMode);
    setCharityModalAmount(String(charity.minDonation || 50));
    setIsCharityModalVisible(true);
  };

  const renderCharityCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={localStyles.charityCard}
      onPress={() => {
        if (item._extUrl && typeof item._extUrl === 'string') {
          Linking.openURL(item._extUrl).catch(() => Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור'));
          return;
        }
        openCharityModal(item, !!mode);
      }}
    >
      <View style={localStyles.charityCardHeader}>
        <Text style={localStyles.charityEmoji}>{item.image}</Text>
        <View style={localStyles.charityRating}>
          <Text style={localStyles.ratingText}>⭐ {item.rating}</Text>
        </View>
      </View>
      <Text style={localStyles.charityName}>{item.name}</Text>
      <Text style={[localStyles.charityDescription, mode && localStyles.charityDescriptionCompact]} numberOfLines={mode ? 2 : 3}>
        {item.description}
      </Text>
      <View style={localStyles.charityDetails}>
        <Text style={localStyles.charityLocation}>📍 {item.location}</Text>
        <Text style={localStyles.charityCategory}>🏷️ {item.category}</Text>
      </View>
      <View style={localStyles.charityStats}>
        <Text style={localStyles.charityDonors}>👥 {item.donors} תורמים</Text>
        <Text style={localStyles.charityMinDonation}>💰 מ-₪{item.minDonation}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentDonationCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={localStyles.recentDonationCard}>
      <View style={localStyles.recentDonationHeader}>
        <Text style={localStyles.recentDonationCharity}>{item.charityName}</Text>
        <Text style={localStyles.recentDonationAmount}>₪{item.amount}</Text>
      </View>
      <View style={localStyles.recentDonationDetails}>
        <Text style={localStyles.recentDonationDate}>📅 {item.date}</Text>
        <Text style={localStyles.recentDonationCategory}>🏷️ {item.category}</Text>
      </View>
      <View style={localStyles.recentDonationStatus}>
        <Text style={localStyles.recentDonationStatusText}>✅ {item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  const FormHeader = () => (
    <View>
      {/* Mode toggle is now handled by HeaderComp */}

      {mode ? (
        <></>
      ) : (
        <View style={localStyles.formContainer}>
          {/* Beneficiary mode - help search message */}
          <View style={localStyles.searchHelpContainer}>
            <Text style={localStyles.searchHelpTitle}>מחפש עזרה כספית?</Text>
            <Text style={localStyles.searchHelpText}>
              השתמש בסרגל החיפוש למעלה כדי למצוא עמותות שיכולות לעזור לך מבחינה כספית
            </Text>
            <View style={localStyles.searchHelpTipsContainer}>
              <Text style={localStyles.searchHelpTipsTitle}>איך למצוא עזרה:</Text>
              <Text style={localStyles.searchHelpTip}>• חפש לפי תחום: חינוך, בריאות, רווחה</Text>
              <Text style={localStyles.searchHelpTip}>• חפש לפי מיקום: עיר, אזור</Text>
              <Text style={localStyles.searchHelpTip}>• חפש לפי סוג עזרה: מזון, ביגוד, טיפול רפואי</Text>
              <Text style={localStyles.searchHelpTip}>• פנה ישירות לעמותה דרך פרטי הקשר</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <HeaderComp
        mode={mode}
        menuOptions={menuOptions}
        onToggleMode={handleToggleMode}
        onSelectMenuItem={handleSelectMenuItem}
        title=""
        placeholder={mode ? (t('donations:searchCharitiesForDonation') as string) : (t('donations:searchCharitiesForHelp') as string)}
        filterOptions={moneyFilterOptions}
        sortOptions={moneySortOptions}
        searchData={combinedCharities}
        onSearch={handleSearch}
      />

      {/* Quick Donate Section */}

      <ScrollContainer
        style={localStyles.container}
        contentStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FormHeader />

        {mode ? (
          // Donor mode - show charities for donation and donation history
          <View style={localStyles.sectionsContainer}>
            <View style={localStyles.quickDonatePanel}>
              <Text style={localStyles.quickDonateTitle}>תרומה לקהילה</Text>
              {(() => {
                const numericAmount = Number(amount) || 0;
                const isZeroAmount = numericAmount <= 0;
                return (
                  <>
                    <DonationAmountSlider
                      value={numericAmount}
                      min={0}
                      max={1000}
                      step={5}
                      onChange={(v) => setAmount(String(v))}
                    />
                    <View style={localStyles.quickDonateActionsRow}>
                      <TouchableOpacity
                        disabled={isZeroAmount}
                        style={[localStyles.donateMainButton, isZeroAmount ? localStyles.donateMainButtonDisabled : localStyles.donateMainButtonActive]}
                        onPress={() => Alert.alert('תרומה בוצעה', `תרומה בסך ₪${numericAmount} למען הקהילה`)}
                      >
                        <Text style={[localStyles.donateMainButtonText, isZeroAmount ? localStyles.donateMainButtonTextDisabled : localStyles.donateMainButtonTextActive]}>תרום</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={localStyles.bitCornerButton}
                        onPress={() => openPaymentApp(numericAmount)}
                      >
                        <Text style={localStyles.bitCornerButtonText}>bit</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </View>


            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <Text style={localStyles.sectionTitle}>
                {searchQuery || selectedFilter ? 'תוצאות חיפוש' : 'עמותות מומלצות לתרומה'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={localStyles.charitiesScrollContainer}
              >
                {filteredCharities.map((charity) => (
                  <View key={charity.id} style={[localStyles.charityCardWrapper, mode && localStyles.charityCardWrapperCompact]}>
                    {renderCharityCard({ item: charity })}
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <Text style={localStyles.sectionTitle}>היסטוריית תרומות שלך</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={localStyles.recentDonationsScrollContainer}
              >
                {getFilteredRecentDonations().map((donation) => (
                  <View key={donation.id} style={localStyles.recentDonationCardWrapper}>
                    {renderRecentDonationCard({ item: donation })}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Bottom small stats */}
            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <DonationStatsFooter
                stats={[
                  { label: 'תרמת עד עכשיו', value: `₪${getFilteredRecentDonations().reduce((s, d) => s + (Number(d.amount) || 0), 0)}`, icon: 'cash-outline' },
                  { label: 'נתרם באפליקציה', value: `₪${getFilteredRecentDonations().reduce((s, d) => s + (Number(d.amount) || 0), 0)}`, icon: 'trending-up-outline' },
                  { label: 'עמותות שנתמכו', value: new Set(getFilteredRecentDonations().map(d => d.charityName)).size, icon: 'business-outline' },
                ]}
              />
            </View>

            {/* Add Links Section */}
            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <Text style={localStyles.sectionTitle}>קישורים שימושיים</Text>
              <AddLinkComponent category="money" />
            </View>
          </View>
        ) : (
          // Beneficiary mode - show charities that can help
          <View style={localStyles.sectionsContainer}>
            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <Text style={localStyles.sectionTitle}>
                {searchQuery || selectedFilter ? 'עמותות שיכולות לעזור' : 'עמותות מומלצות לעזרה'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={localStyles.charitiesScrollContainer}
              >
                {getFilteredCharities().map((charity) => (
                  <View key={charity.id} style={localStyles.charityCardWrapper}>
                    {renderCharityCard({ item: charity })}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Bottom small stats */}
            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <DonationStatsFooter
                stats={[
                  { label: 'תרמת עד עכשיו', value: `₪${getFilteredRecentDonations().reduce((s, d) => s + (Number(d.amount) || 0), 0)}`, icon: 'cash-outline' },
                  { label: 'נתרם באפליקציה', value: `₪${getFilteredRecentDonations().reduce((s, d) => s + (Number(d.amount) || 0), 0)}`, icon: 'trending-up-outline' },
                  { label: 'עמותות שנתמכו', value: new Set(getFilteredRecentDonations().map(d => d.charityName)).size, icon: 'business-outline' },
                ]}
              />
            </View>

            {/* Add Links Section */}
            <View style={[localStyles.section, localStyles.sectionPanel]}>
              <Text style={localStyles.sectionTitle}>קישורים שימושיים</Text>
              <AddLinkComponent category="money" />
            </View>
          </View>
        )}
      </ScrollContainer>

      {/* Charity Details Modal (centered, not full screen) */}
      <Modal
        animationType="fade"
        transparent
        visible={isCharityModalVisible}
        onRequestClose={() => setIsCharityModalVisible(false)}
      >
        <TouchableOpacity style={localStyles.modalOverlay} activeOpacity={1} onPressOut={() => setIsCharityModalVisible(false)}>
          <View style={localStyles.centerModalContent}>
            {selectedCharityForModal && (
              <>
                <Text style={localStyles.modalTitle}>{selectedCharityForModal.name}</Text>
                <Text style={localStyles.modalSubtitle}>📍 {selectedCharityForModal.location}   ·   🏷️ {selectedCharityForModal.category}</Text>
                <Text style={localStyles.modalDescription} numberOfLines={6}>{selectedCharityForModal.description}</Text>
                {charityModalIsOfferMode ? (
                  <>
                    <Text style={localStyles.modalFieldLabel}>בחר סכום לתרומה</Text>
                    <TextInput
                      style={[localStyles.input, localStyles.modalAmountInput]}
                      keyboardType="number-pad"
                      value={charityModalAmount}
                      onChangeText={(t) => setCharityModalAmount(t.replace(/[^0-9]/g, ''))}
                      placeholder="50"
                    />
                    <View style={localStyles.modalActionsRow}>
                      <TouchableOpacity style={localStyles.modalPrimaryButton} onPress={() => {
                        setIsCharityModalVisible(false);
                        Alert.alert('תרומה בוצעה', `תודה על תרומתך בסך ₪${charityModalAmount} ל-${selectedCharityForModal.name}!`);
                      }}>
                        <Text style={localStyles.modalPrimaryButtonText}>תרום עכשיו</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={localStyles.bitButton}
                        onPress={() => openPaymentApp(Number(charityModalAmount) || 0)}
                      >
                        <Text style={localStyles.bitButtonText}>תרום עם Bit</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={localStyles.contactButton} onPress={() => Alert.alert('יצירת קשר', 'פרטי קשר: 03-1234567 · info@example.org')}>
                      <Text style={localStyles.contactButtonText}>יצירת קשר</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={localStyles.contactButton} onPress={() => Alert.alert('יצירת קשר', 'פרטי קשר: 03-1234567 · info@example.org')}>
                      <Text style={localStyles.contactButtonText}>יצירת קשר</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Savings Modal */}
      <Modal animationType="fade" transparent visible={isSavingsModalVisible} onRequestClose={() => setIsSavingsModalVisible(false)}>
        <TouchableOpacity style={localStyles.modalOverlay} activeOpacity={1} onPressOut={() => setIsSavingsModalVisible(false)}>
          <View style={localStyles.centerModalContent}>
            <Text style={localStyles.modalTitle}>חיסכון לתרומה</Text>
            <Text style={localStyles.modalDescription}>קבע יעד חיסכון חודשי לתרומה עתידית. בכל חודש נוסיף את הסכום לקופת חיסכון ייעודית.</Text>
            <Text style={localStyles.modalFieldLabel}>סכום חודשי (₪)</Text>
            <TextInput style={[localStyles.input, localStyles.modalAmountInput]} keyboardType="number-pad" placeholder="50" />
            <Text style={localStyles.modalFieldLabel}>יעד (עמותה/קטגוריה)</Text>
            <TextInput style={[localStyles.input]} placeholder="לדוגמה: חינוך" />
            <TouchableOpacity style={localStyles.modalPrimaryButton} onPress={() => { setIsSavingsModalVisible(false); Alert.alert('נשמר', 'תוכנית חיסכון לתרומה נשמרה'); }}>
              <Text style={localStyles.modalPrimaryButtonText}>שמור חיסכון</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Recurring Donations Modal */}
      <Modal animationType="fade" transparent visible={isRecurringModalVisible} onRequestClose={() => setIsRecurringModalVisible(false)}>
        <TouchableOpacity style={localStyles.modalOverlay} activeOpacity={1} onPressOut={() => setIsRecurringModalVisible(false)}>
          <View style={localStyles.centerModalContent}>
            <Text style={localStyles.modalTitle}>הוראות קבע</Text>
            <Text style={localStyles.modalDescription}>קבע תרומה קבועה (חודשית/שבועית) לעמותה שבחרת.</Text>
            <Text style={localStyles.modalFieldLabel}>סכום קבוע (₪)</Text>
            <TextInput style={[localStyles.input, localStyles.modalAmountInput]} keyboardType="number-pad" placeholder="36" />
            <Text style={localStyles.modalFieldLabel}>תדירות</Text>
            <View style={localStyles.modalActionsRow}>
              <TouchableOpacity style={localStyles.quickAmountButton}><Text style={localStyles.quickAmountButtonText}>חודשי</Text></TouchableOpacity>
              <TouchableOpacity style={localStyles.quickAmountButton}><Text style={localStyles.quickAmountButtonText}>שבועי</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={localStyles.modalPrimaryButton} onPress={() => { setIsRecurringModalVisible(false); Alert.alert('נשמר', 'הוראת הקבע נשמרה'); }}>
              <Text style={localStyles.modalPrimaryButtonText}>שמור הוראה</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Receipts/Reports Modal */}
      <Modal animationType="fade" transparent visible={isReceiptsModalVisible} onRequestClose={() => setIsReceiptsModalVisible(false)}>
        <TouchableOpacity style={localStyles.modalOverlay} activeOpacity={1} onPressOut={() => setIsReceiptsModalVisible(false)}>
          <View style={localStyles.centerModalContent}>
            <Text style={localStyles.modalTitle}>קבלות ודוחות</Text>
            <Text style={localStyles.modalDescription}>ייצוא קבלות שנתיות, צפייה בסיכום חודשי והשוואת תרומות.</Text>
            <View style={localStyles.modalActionsRow}>
              <TouchableOpacity style={localStyles.modalPrimaryButton} onPress={() => Alert.alert('קבלות', 'קובץ קבלות ירוכז כאן')}>
                <Text style={localStyles.modalPrimaryButtonText}>ייצא קבלות</Text>
              </TouchableOpacity>
              <TouchableOpacity style={localStyles.bitButton} onPress={() => Alert.alert('דוח חודשי', 'נסכם עבורך את החודש האחרון')}>
                <Text style={localStyles.bitButtonText}>דוח חודשי</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  scrollContent: {
    paddingBottom: 100, // Bottom margin for screen
  },
  formContainer: {
    backgroundColor: colors.pinkLight,
    padding: 16,
    borderRadius: 15,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    fontSize: FontSizes.body,
    textAlign: 'right',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  amountContainer: {
    marginBottom: 25,
  },
  suggestedAmountsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  amountButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  selectedAmount: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  amountButtonText: {
    fontSize: FontSizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedAmountText: {
    color: colors.background,
  },
  customAmountInput: {
    textAlign: 'center',
  },
  donateButton: {
    // backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  donateButtonText: {
    color: colors.background,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionsContainer: {
    flex: 1,
    gap: 5,
  },
  sectionPanel: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  recommendationCard: {
    backgroundColor: colors.pinkLight,
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    width: 150,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  cardDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  historyAmount: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  historyStatus: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: FontSizes.small,
    color: colors.success,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    marginBottom: 15,
  },
  searchButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  searchButtonText: {
    color: colors.background,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
  recommendationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  historyContainer: {
    paddingVertical: 5,
  },
  searchInfoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchInfoTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  searchInfoText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  searchTipsContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  searchTipsTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  searchTip: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'right',
  },
  // Charity Cards Styles
  charitiesScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  charityCardWrapper: {
    marginRight: 12,
    width: 280,
  },
  charityCardWrapperCompact: {
    width: 220,
  },
  charityCard: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
    minHeight: 200,
  },
  charityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charityEmoji: {
    fontSize: FontSizes.displayLarge,
  },
  charityRating: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: FontSizes.small,
    color: colors.success,
    fontWeight: 'bold',
  },
  charityName: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'right',
  },
  charityDescription: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
    lineHeight: 18,
  },
  charityDescriptionCompact: {
    fontSize: FontSizes.small,
    lineHeight: 16,
  },
  charityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  charityLocation: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  charityCategory: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  charityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  charityDonors: {
    fontSize: FontSizes.small,
    color: colors.accent,
    fontWeight: '600',
  },
  charityMinDonation: {
    fontSize: FontSizes.small,
    color: colors.accent,
    fontWeight: '600',
  },
  // Recent Donations Styles
  recentDonationsScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recentDonationCardWrapper: {
    marginRight: 12,
    width: 200,
  },
  recentDonationCard: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    minHeight: 120,
  },
  recentDonationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentDonationCharity: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  recentDonationAmount: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.accent,
  },
  recentDonationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentDonationDate: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  recentDonationCategory: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  recentDonationStatus: {
    alignItems: 'flex-end',
  },
  recentDonationStatusText: {
    fontSize: FontSizes.small,
    color: colors.success,
    fontWeight: '600',
  },
  // Quick Donate Panel
  quickDonatePanel: {
    backgroundColor: colors.pinkLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,

    marginHorizontal: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bitCornerButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.35)',
    zIndex: 2,
  },
  bitCornerButtonText: {
    color: 'rgba(33, 150, 243, 0.9)',
    fontSize: FontSizes.small,
    fontWeight: '700',
  },
  quickDonateTitle: {
    fontSize: FontSizes.body,
    fontWeight: '700',
    color: 'rgba(44,44,44,0.85)',
    textAlign: 'center',
  },
  quickDonateSubtitle: {
    fontSize: FontSizes.small,
    color: 'rgba(102,102,102,0.75)',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  quickDonateAmountsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quickAmountButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickAmountButtonText: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickDonateActionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  // Slider styles (modern, subtle)
  amountSliderContainer: {
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  sliderTrack: {
    height: "20%",
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sliderFill: {
    backgroundColor: colors.secondary,
  },
  sliderThumb: {
    // height: 30,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sliderThumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.pinkLight,
    alignSelf: 'center',
    // marginTop: 7,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  amountDisplayText: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    color: 'rgba(44,44,44,0.9)',
  },
  amountRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amountRangeText: {
    fontSize: FontSizes.caption,
    color: 'rgba(102,102,102,0.7)',
  },
  // Donate CTA styles
  donateMainButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  donateMainButtonActive: {
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.4)',
  },
  donateMainButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  donateMainButtonText: {
    fontSize: FontSizes.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  donateMainButtonTextActive: {
    color: 'rgba(44,44,44,0.9)',
  },
  donateMainButtonTextDisabled: {
    color: 'rgba(0,0,0,0.3)',
  },
  // removed inline bitSmallButton in favor of corner button
  // Search Help Styles
  searchHelpContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchHelpTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchHelpText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  searchHelpTipsContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
    width: '100%',
  },
  searchHelpTipsTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    writingDirection: 'rtl',
  },
  searchHelpTip: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 6,
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  // Bottom small stats
  bottomStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 6,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },

  // Modal shared styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  centerModalContent: {
    width: '85%',
    maxHeight: '75%',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: 14,
  },
  modalTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 20,
  },
  modalFieldLabel: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 4,
  },
  modalAmountInput: {
    textAlign: 'center',
    marginBottom: 10,
  },
  modalActionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  // Dedicated modal primary button styles to avoid duplicate keys
  modalPrimaryButton: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  modalPrimaryButtonText: {
    color: colors.background,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
  bitButton: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bitButtonText: {
    color: 'rgba(44,44,44,0.85)',
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
  contactButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  contactButtonText: {
    color: colors.textPrimary,
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
  },
});
