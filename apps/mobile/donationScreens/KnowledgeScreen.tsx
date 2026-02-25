import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../globals/colors';
import { logger } from '../utils/loggerService';
import { FontSizes } from '../globals/constants';
import { useUser } from '../stores/userStore';
import HeaderComp from '../components/HeaderComp';
import { SearchableItem } from '../components/SearchBar';
import { donationResources } from '../utils/donationResources';
import AddLinkComponent from '../components/AddLinkComponent';
import ScrollContainer from '../components/ScrollContainer';
import { useTranslation } from 'react-i18next';

// Mock data for educational content
const educationalLinks = [
  {
    id: '1',
    title: 'קורס מתמטיקה בסיסי',
    description: 'לימוד מתמטיקה בסיסית לכיתות א-ו',
    url: 'https://www.khanacademy.org/math',
    icon: 'calculator-outline',
    color: colors.success,
    category: 'מתמטיקה',
  },
  {
    id: '2',
    title: 'לימוד אנגלית',
    description: 'קורס אנגלית למתחילים ומתקדמים',
    url: 'https://www.duolingo.com',
    icon: 'language-outline',
    color: colors.info,
    category: 'שפות',
  },
  {
    id: '3',
    title: 'תכנות בסיסי',
    description: 'לימוד תכנות עם Python ו-JavaScript',
    url: 'https://www.codecademy.com',
    icon: 'code-outline',
    color: colors.donationItems,
    category: 'תכנות',
  },
  {
    id: '4',
    title: 'מדעים וטבע',
    description: 'סרטונים חינוכיים על מדע וטבע',
    url: 'https://www.youtube.com/c/Kurzgesagt',
    icon: 'flask-outline',
    color: colors.warning,
    category: 'מדעים',
  },
  {
    id: '5',
    title: 'היסטוריה יהודית',
    description: 'קורס היסטוריה יהודית וישראלית',
    url: 'https://www.youtube.com/c/JewishHistory',
    icon: 'library-outline',
    color: colors.textPrimary,
    category: 'היסטוריה',
  },
  {
    id: '6',
    title: 'אמנות ויצירה',
    description: 'שיעורי אמנות ויצירה לכל הגילאים',
    url: 'https://www.youtube.com/c/ArtForKidsHub',
    icon: 'brush-outline',
    color: colors.pinkDeep,
    category: 'אמנות',
  },
];

const communityContent = [
  {
    id: '1',
    title: 'שיעור פרטי במתמטיקה',
    teacher: 'שרה כהן',
    subject: 'מתמטיקה - כיתה י"א',
    description: 'שיעור פרטי במתמטיקה לכיתה י"א, כולל הכנה לבגרות',
    rating: 4.8,
    students: 15,
    price: '₪80 לשעה',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
  },
  {
    id: '2',
    title: 'קורס אנגלית למבוגרים',
    teacher: 'דוד לוי',
    subject: 'אנגלית - מתחילים',
    description: 'קורס אנגלית למבוגרים מתחילים, שיעורים קבוצתיים',
    rating: 4.9,
    students: 8,
    price: '₪120 לשיעור',
    image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400',
  },
  {
    id: '3',
    title: 'שיעור מוזיקה - פסנתר',
    teacher: 'מיכל רוזן',
    subject: 'מוזיקה - פסנתר',
    description: 'שיעורי פסנתר למתחילים ומתקדמים, כולל תיאוריה',
    rating: 4.7,
    students: 12,
    price: '₪100 לשעה',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400',
  },
  {
    id: '4',
    title: 'קורס תכנות לילדים',
    teacher: 'יוסי גולדברג',
    subject: 'תכנות - Scratch',
    description: 'קורס תכנות לילדים עם Scratch, לימוד משחק',
    rating: 4.6,
    students: 20,
    price: '₪90 לשיעור',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
  },
];

export default function KnowledgeScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const route = useRoute();
  const routeParams = route.params as { mode?: string } | undefined;
  const { t } = useTranslation(['donations', 'common']);
  const { isRealAuth } = useUser();

  // Get initial mode from URL (deep link) or default to search mode (מחפש)
  // mode: true = offerer (wants to teach/share), false = seeker (needs learning)
  // URL mode: 'offer' = true, 'search' = false or undefined = search
  // Default is search mode (false)
  const initialMode = routeParams?.mode === 'offer' ? true : false;
  const [mode, setMode] = useState(initialMode);

  type CommunityContentItem = (typeof communityContent)[number];
  const [_searchQuery, setSearchQuery] = useState("");
  const [_selectedFilter, setSelectedFilter] = useState("");
  const [_selectedSort, setSelectedSort] = useState("");
  const [filteredEducationalLinks, setFilteredEducationalLinks] = useState(educationalLinks);
  const [filteredCommunityContent, setFilteredCommunityContent] = useState(communityContent);
  const [_selectedMentorship, setSelectedMentorship] = useState<CommunityContentItem | null>(null);
  const [_refreshKey, setRefreshKey] = useState(0);

  // Ref to prevent infinite loop: setParams triggers re-render; navigation ref can change before params propagate
  const hasSetInitialModeRef = useRef(false);

  // If no mode in URL, set it to search (default) and update URL; sync local mode without synchronous setState in effect
  useEffect(() => {
    if (!routeParams?.mode || routeParams.mode === 'undefined' || routeParams.mode === 'null' || routeParams.mode === '') {
      if (!hasSetInitialModeRef.current) {
        hasSetInitialModeRef.current = true;
        (navigation as NavigationProp<{ KnowledgeScreen: { mode?: string } }, 'KnowledgeScreen'>).setParams({ mode: 'search' });
      }
      queueMicrotask(() => {
        if (mode !== false) setMode(false);
      });
    }
  }, [routeParams?.mode, mode, navigation]);

  // Update mode when route params change (e.g., from deep link)
  useEffect(() => {
    if (routeParams?.mode && routeParams.mode !== 'undefined' && routeParams.mode !== 'null') {
      const newMode = routeParams.mode === 'offer' ? true : false;
      if (newMode !== mode) {
        queueMicrotask(() => setMode(newMode));
      }
    }
  }, [routeParams?.mode, mode]);

  // Update URL when mode changes (toggle button pressed) or when screen loads without mode
  useEffect(() => {
    const newMode = mode ? 'offer' : 'search';
    const currentMode = routeParams?.mode;
    const nav = navigation as NavigationProp<{ KnowledgeScreen: { mode?: string } }, 'KnowledgeScreen'>;

    if (!currentMode || currentMode === 'undefined' || currentMode === 'null') {
      if (!hasSetInitialModeRef.current) {
        hasSetInitialModeRef.current = true;
        nav.setParams({ mode: 'search' });
      }
      return;
    }
    if (newMode !== currentMode) {
      nav.setParams({ mode: newMode });
    }
  }, [mode, navigation, routeParams?.mode]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      logger.debug('KnowledgeScreen', 'Screen focused, refreshing data');
      setSelectedMentorship(null);
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // Filter and sort options for knowledge screen
  const knowledgeFilterOptions = [
    "מתמטיקה",
    "שפות",
    "תכנות",
    "מדעים",
    "היסטוריה",
    "אמנות",
    "מוזיקה",
    "ספורט",
    "בישול",
    "טכנולוגיה",
    "פסיכולוגיה",
    "כלכלה"
  ];

  const knowledgeSortOptions = [
    "אלפביתי",
    "לפי קטגוריה",
    "לפי דירוג",
    "לפי מספר תלמידים",
    "לפי רלוונטיות",
  ];
  const handleLinkPress = async (url: string, title: string) => {
    logger.debug('KnowledgeScreen', 'Opening educational link', { title });
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור');
      }
    } catch (error) {
      logger.error('KnowledgeScreen', 'Error opening link', { error });
      Alert.alert('שגיאה', 'שגיאה בפתיחת הקישור');
    }
  };

  const handleCommunityContentPress = (content: CommunityContentItem) => {
    logger.debug('KnowledgeScreen', 'Community content pressed', { title: content.title });
    Alert.alert(
      'הצטרפות לקורס',
      `האם תרצה להצטרף לקורס "${content.title}" עם ${content.teacher}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הצטרף', onPress: () => Alert.alert('הצלחה', 'הצטרפת לקורס בהצלחה!') }
      ]
    );
  };

  type EducationalLinkItem = (typeof educationalLinks)[number];
  type SearchResultItem = EducationalLinkItem | CommunityContentItem;

  // Function to handle search results from HeaderComp
  const handleSearch = (query: string, filters?: string[], sorts?: string[], results?: SearchableItem[]) => {
    logger.debug('KnowledgeScreen', 'Search received', {
      query,
      filters: filters ?? [],
      sorts: sorts ?? [],
      resultsCount: results?.length ?? 0,
    });

    // Update state with search results
    setSearchQuery(query);
    setSelectedFilter(filters?.[0] || "");
    setSelectedSort(sorts?.[0] || "");

    // If results are provided from SearchBar, use them
    if (results && results.length > 0) {
      const typedResults = results as SearchResultItem[];
      // Split results between educational links and community content (type guards for union)
      const educationalResults = typedResults.filter((item): item is EducationalLinkItem => 'url' in item);
      const communityResults = typedResults.filter((item): item is CommunityContentItem => 'teacher' in item);

      setFilteredEducationalLinks(educationalResults);
      setFilteredCommunityContent(communityResults);
    } else {
      // Otherwise, perform local filtering
      let filteredEducational = [...educationalLinks];
      let filteredCommunity = [...communityContent];

      // Filter by search query
      if (query.trim() !== "") {
        filteredEducational = filteredEducational.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        );

        filteredCommunity = filteredCommunity.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subject.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.teacher.toLowerCase().includes(query.toLowerCase())
        );
      }

      setFilteredEducationalLinks(filteredEducational);
      setFilteredCommunityContent(filteredCommunity);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <HeaderComp
        mode={mode}
        menuOptions={[]}
        onToggleMode={() => setMode(!mode)}
        onSelectMenuItem={() => { }}
        title=""
        placeholder="חפש קורסים ושיעורים..."
        filterOptions={knowledgeFilterOptions}
        sortOptions={knowledgeSortOptions}
        searchData={isRealAuth ? [] : [...educationalLinks, ...communityContent]}
        onSearch={handleSearch}
      />

      <ScrollContainer
        style={styles.scrollView}
        contentStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Educational Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>קישורים חינוכיים</Text>
          <Text style={styles.sectionDescription}>
            קישורים לאתרי לימוד מומלצים בחינם
          </Text>

          <View style={styles.linksGrid}>
            {(isRealAuth ? [] : filteredEducationalLinks).map((link) => (
              <TouchableOpacity
                key={link.id}
                style={styles.linkCard}
                onPress={() => handleLinkPress(link.url, link.title)}
              >
                <View style={styles.linkHeader}>
                  <View style={[styles.linkIcon, { backgroundColor: link.color }]}>
                    <Ionicons name={link.icon as keyof typeof Ionicons.glyphMap} size={20} color="white" />
                  </View>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.linkContent}>
                  <Text style={styles.linkCategory}>{link.category}</Text>
                  <Text style={styles.linkDescription}>{link.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommended Organizations Section */}
        {!!donationResources.knowledge && donationResources.knowledge.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('donations:categories.knowledge.recommendedOrgs')}</Text>
            <Text style={styles.sectionDescription}>
              {t('donations:categories.knowledge.recommendedOrgsDesc')}
            </Text>
            <View style={styles.linksGrid}>
              {donationResources.knowledge.map((org) => (
                <TouchableOpacity
                  key={`knowledge-${org.url}`}
                  style={styles.linkCard}
                  onPress={() => handleLinkPress(org.url, t(org.nameKey))}
                >
                  <View style={styles.linkHeader}>
                    <View style={[styles.linkIcon, { backgroundColor: colors.info }]}>
                      <Ionicons name="school-outline" size={20} color="white" />
                    </View>
                    <Text style={styles.linkTitle}>{t(org.nameKey)}</Text>
                    <View style={{ borderWidth: 1, borderColor: colors.info, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ color: colors.info, fontSize: FontSizes.caption }}>{t('donations:visitWebsite')}</Text>
                    </View>
                  </View>
                  <View style={styles.linkContent}>
                    {!!org.descriptionKey && (
                      <Text style={styles.linkDescription}>{t(org.descriptionKey)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Community Content Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>תוכן קהילתי</Text>
          <Text style={styles.sectionDescription}>
            שיעורים פרטיים וקורסים מהקהילה
          </Text>

          <View style={styles.communityGrid}>
            {(isRealAuth ? [] : filteredCommunityContent).map((content) => (
              <TouchableOpacity
                key={content.id}
                style={styles.communityCard}
                onPress={() => handleCommunityContentPress(content)}
              >
                <Image source={{ uri: content.image }} style={styles.communityImage} />
                <View style={styles.communityContent}>
                  <View style={styles.communityHeader}>
                    <Text style={styles.communityTitle}>{content.title}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color={colors.warning} />
                      <Text style={styles.ratingText}>{content.rating}</Text>
                    </View>
                  </View>

                  <Text style={styles.communitySubject}>{content.subject}</Text>
                  <Text style={styles.communityDescription}>{content.description}</Text>

                  <View style={styles.communityFooter}>
                    <View style={styles.communityStats}>
                      <Ionicons name="people" size={16} color={colors.textSecondary} />
                      <Text style={styles.communityStatsText}>{content.students} תלמידים</Text>
                    </View>
                    <Text style={styles.communityPrice}>{content.price}</Text>
                  </View>

                  <View style={styles.communityTeacher}>
                    <Ionicons name="person" size={16} color={colors.secondary} />
                    <Text style={styles.communityTeacherText}>{content.teacher}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>


        {/* Add Links Section */}
        <View style={styles.sectionLinks}>
          <Text style={styles.sectionTitle}>קישורים שימושיים</Text>
          <AddLinkComponent category="knowledge" />
        </View>
      </ScrollContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    backgroundColor: colors.background,
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 60,
  },
  sectionLinks: {
    marginTop: 20,
    marginBottom: 130,
    paddingHorizontal: 60,
  },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  linksGrid: {
    gap: 15,
  },
  linkCard: {
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkCategory: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  linkTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  linkDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  communityGrid: {
    gap: 15,
  },
  communityCard: {
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  communityImage: {
    width: '100%',
    height: 150,
  },
  communityContent: {
    padding: 15,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  communityTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: FontSizes.small,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  communitySubject: {
    fontSize: FontSizes.small,
    color: colors.secondary,
    marginBottom: 6,
  },
  communityDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  communityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityStatsText: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  communityPrice: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.secondary,
  },
  communityTeacher: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityTeacherText: {
    fontSize: FontSizes.small,
    color: colors.secondary,
    marginLeft: 4,
  },
  statsSection: {
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.secondary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 