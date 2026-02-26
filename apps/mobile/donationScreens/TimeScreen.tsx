import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { NavigationProp, ParamListBase, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import colors from '../globals/colors';
import { FontSizes } from '../globals/constants';
import { createShadowStyle } from '../globals/styles';
import { useUser } from '../stores/userStore';
import HeaderComp from '../components/HeaderComp';
import { SearchableItem } from '../components/SearchBar';
import DonationStatsFooter from '../components/DonationStatsFooter';
import AddLinkComponent from '../components/AddLinkComponent';
import { logger } from '../utils/loggerService';
import { WHATSAPP_URL } from '../screens/Landing/constants';

// Mock data for volunteer opportunities (category keys match donations.timeScreen.categories)
const volunteerOpportunities = [
  {
    id: '1',
    title: 'התנדבות בבית אבות',
    organization: 'בית אבות "בית חם"',
    description: 'עזרה לקשישים, שיחה, ליווי לטיולים ופעילויות',
    location: 'תל אביב',
    duration: '2-4 שעות',
    frequency: 'פעם בשבוע',
    volunteers: 8,
    needed: 12,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400',
    category: 'elderly',
  },
  {
    id: '2',
    title: 'עזרה בשיעורי בית',
    organization: 'מרכז למידה קהילתי',
    description: 'עזרה לילדים בשיעורי בית במתמטיקה ואנגלית',
    location: 'ירושלים',
    duration: '1-2 שעות',
    frequency: 'פעמיים בשבוע',
    volunteers: 15,
    needed: 20,
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    category: 'education',
  },
  {
    id: '3',
    title: 'איסוף מזון לנזקקים',
    organization: 'לקט ישראל',
    description: 'איסוף מזון עודף מחנויות וחלוקה לנזקקים',
    location: 'חיפה',
    duration: '3-5 שעות',
    frequency: 'פעם בשבוע',
    volunteers: 25,
    needed: 30,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    category: 'welfare',
  },
  {
    id: '4',
    title: 'טיפול בחיות מחמד',
    organization: 'מקלט חיות "לב זהב"',
    description: 'טיפול בחיות מחמד, טיולים, האכלה וניקיון',
    location: 'באר שבע',
    duration: '2-3 שעות',
    frequency: 'פעם בשבוע',
    volunteers: 12,
    needed: 18,
    image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400',
    category: 'animals',
  },
  {
    id: '5',
    title: 'עזרה בפרויקטים קהילתיים',
    organization: 'קהילה ירוקה',
    description: 'עזרה בפרויקטים ירוקים, נטיעות וניקיון',
    location: 'אריאל',
    duration: '4-6 שעות',
    frequency: 'פעם בחודש',
    volunteers: 40,
    needed: 50,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
    category: 'environment',
  },
  {
    id: '6',
    title: 'ליווי חולים',
    organization: 'בית חולים "שערי צדק"',
    description: 'ליווי חולים לבדיקות, שיחה ועזרה כללית',
    location: 'ירושלים',
    duration: '3-4 שעות',
    frequency: 'פעמיים בשבוע',
    volunteers: 20,
    needed: 25,
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
    category: 'health',
  },
];

export default function TimeScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const route = useRoute();
  const routeParams = route.params as { mode?: string } | undefined;
  const { t } = useTranslation(['donations', 'common']);
  const { selectedUser: _selectedUser, isRealAuth } = useUser();

  // mode: true = offerer (מציע), false = seeker (מחפש). Derive from route when valid to avoid setState in effects.
  const initialMode = routeParams?.mode === 'offer';
  const [mode, setMode] = useState(initialMode);
  const effectiveMode =
    routeParams?.mode === 'offer' ? true
    : routeParams?.mode === 'search' ? false
    : mode;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [_searchQuery, setSearchQuery] = useState("");
  const [_selectedFilter, setSelectedFilter] = useState("");
  const [_selectedSort, setSelectedSort] = useState("");
  const [filteredOpportunities, setFilteredOpportunities] = useState(volunteerOpportunities);
  type VolunteerOpportunity = (typeof volunteerOpportunities)[number];
  const [_selectedTask, setSelectedTask] = useState<VolunteerOpportunity | null>(null);
  const [_refreshKey, setRefreshKey] = useState(0);

  type TimeScreenParams = { TimeScreen: { mode?: string } };
  const hasSetInitialModeRef = useRef(false);
  const navRef = useRef(navigation);

  useEffect(() => {
    navRef.current = navigation;
  }, [navigation]);

  // If no mode in URL on first load only: set URL to search. Do NOT set state here (avoids set-state-in-effect).
  useEffect(() => {
    const currentMode = routeParams?.mode;
    const missingOrInvalid =
      !currentMode || currentMode === 'undefined' || currentMode === 'null' || currentMode === '';

    if (!missingOrInvalid) return;

    if (!hasSetInitialModeRef.current) {
      hasSetInitialModeRef.current = true;
      (navRef.current as NavigationProp<ParamListBase & TimeScreenParams, 'TimeScreen'>).setParams?.({ mode: 'search' });
    }
  }, [routeParams?.mode]);

  // Sync URL when mode changes (toggle). When params are briefly missing after setParams, re-apply once.
  useEffect(() => {
    const nav = navRef.current as NavigationProp<ParamListBase & TimeScreenParams, 'TimeScreen'>;
    if (!nav.setParams) return;
    const newMode = effectiveMode ? 'offer' : 'search';
    const currentMode = routeParams?.mode;
    const missingOrInvalid =
      !currentMode || currentMode === 'undefined' || currentMode === 'null' || currentMode === '';

    if (missingOrInvalid) {
      if (hasSetInitialModeRef.current) {
        nav.setParams({ mode: newMode });
      }
      return;
    }
    if (newMode !== currentMode) {
      nav.setParams({ mode: newMode });
    }
  }, [effectiveMode, routeParams?.mode]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      logger.debug('TimeScreen', 'Screen focused, refreshing data');
      setSelectedTask(null);
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  const categoryKeys = ['all', 'elderly', 'education', 'welfare', 'animals', 'environment', 'health'] as const;
  const categories = categoryKeys.map(key => ({
    key,
    label: key === 'all' ? t('donations:timeScreen.allCategories') : t(`donations:timeScreen.categories.${key}`),
  }));

  const timeFilterOptions = [
    t('donations:timeScreen.filterOptions.elderly'),
    t('donations:timeScreen.filterOptions.education'),
    t('donations:timeScreen.filterOptions.welfare'),
    t('donations:timeScreen.filterOptions.animals'),
    t('donations:timeScreen.filterOptions.environment'),
    t('donations:timeScreen.filterOptions.health'),
    t('donations:timeScreen.filterOptions.youth'),
    t('donations:timeScreen.filterOptions.community'),
    t('donations:timeScreen.filterOptions.sports'),
    t('donations:timeScreen.filterOptions.culture'),
    t('donations:timeScreen.filterOptions.food'),
    t('donations:timeScreen.filterOptions.clothing'),
  ];

  const timeSortOptions = [
    t('donations:timeScreen.sortOptions.alphabetical'),
    t('donations:timeScreen.sortOptions.byLocation'),
    t('donations:timeScreen.sortOptions.byField'),
    t('donations:timeScreen.sortOptions.byDuration'),
    t('donations:timeScreen.sortOptions.byFrequency'),
    t('donations:timeScreen.sortOptions.byVolunteersNeeded'),
    t('donations:timeScreen.sortOptions.byRelevance'),
  ];

  const effectiveCategoryKey = selectedCategory ?? 'all';

  const handleVolunteerPress = (opportunity: VolunteerOpportunity) => {
    logger.debug('TimeScreen', 'Volunteer opportunity pressed', { title: opportunity.title });
    Alert.alert(
      t('donations:timeScreen.joinVolunteerTitle'),
      t('donations:timeScreen.joinVolunteerConfirm', { title: opportunity.title }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('donations:timeScreen.join'),
          onPress: () => {
            Alert.alert(
              t('donations:timeScreen.joinSuccessTitle'),
              t('donations:timeScreen.joinSuccessBody'),
              [{ text: t('common:confirm'), style: 'default' }]
            );
          }
        }
      ]
    );
  };

  const handleEmergencyLink = async () => {
    logger.debug('TimeScreen', 'Emergency volunteer link pressed');
    const url = 'https://www.volunteer.gov.il';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('donations:timeScreen.error'), t('donations:timeScreen.cannotOpenLink'));
      }
    } catch (error) {
      logger.error('TimeScreen', 'Error opening link', { error });
      Alert.alert(t('donations:timeScreen.error'), t('donations:timeScreen.linkError'));
    }
  };

  // Function to handle search results from HeaderComp
  const handleSearch = (query: string, filters?: string[], sorts?: string[], results?: SearchableItem[]) => {
    logger.debug('TimeScreen', 'Search received', {
      query,
      filters: filters || [],
      sorts: sorts || [],
      resultsCount: results?.length || 0
    });

    // Update state with search results
    setSearchQuery(query);
    setSelectedFilter(filters?.[0] || "");
    setSelectedSort(sorts?.[0] || "");

    // If results are provided from SearchBar, use them
    if (results && results.length > 0) {
      setFilteredOpportunities(results as VolunteerOpportunity[]);
    } else {
      // Otherwise, perform local filtering
      let filtered = [...volunteerOpportunities];

      // Filter by search query
      if (query.trim() !== "") {
        filtered = filtered.filter(opp =>
          opp.title.toLowerCase().includes(query.toLowerCase()) ||
          opp.organization.toLowerCase().includes(query.toLowerCase()) ||
          opp.description.toLowerCase().includes(query.toLowerCase()) ||
          opp.location.toLowerCase().includes(query.toLowerCase()) ||
          opp.category.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Filter by category
      if (effectiveCategoryKey !== 'all') {
        filtered = filtered.filter(opp => opp.category === effectiveCategoryKey);
      }

      setFilteredOpportunities(filtered);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <HeaderComp
        mode={effectiveMode}
        menuOptions={[t('donations:timeScreen.menuSettings'), t('donations:timeScreen.menuHelp'), t('donations:timeScreen.menuContact')]}
        onToggleMode={() => {
          const next = !effectiveMode;
          setMode(next);
          (navRef.current as NavigationProp<ParamListBase & TimeScreenParams, 'TimeScreen'>).setParams?.({ mode: next ? 'offer' : 'search' });
        }}
        onSelectMenuItem={(option: string) => logger.debug('TimeScreen', 'Menu selected', { option })}
        title=""
        placeholder={t('donations:timeScreen.placeholder')}
        filterOptions={timeFilterOptions}
        sortOptions={timeSortOptions}
        searchData={isRealAuth ? [] : volunteerOpportunities}
        onSearch={handleSearch}
      />

      {!effectiveMode ? (
        <View style={styles.offerPlaceholder}>
          <Ionicons name="time-outline" size={48} color={colors.accent} style={styles.offerIcon} />
          <Text style={styles.offerTitle}>{t('donations:offerScreen.time.title')}</Text>
          <Text style={styles.offerMessage}>{t('donations:offerScreen.time.message')}</Text>
          <TouchableOpacity
            style={styles.offerCta}
            onPress={() => Linking.openURL(WHATSAPP_URL).catch(() => {})}
          >
            <Text style={styles.offerCtaText}>{t('donations:offerScreen.time.cta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* Emergency Volunteer Link */}
        <View style={styles.emergencySection}>
          <TouchableOpacity
            style={styles.emergencyCard}
            onPress={handleEmergencyLink}
          >
            <View style={styles.emergencyContent}>
              <Ionicons name="flash" size={32} color={colors.accent} />
              <View style={styles.emergencyText}>
                <Text style={styles.emergencyTitle}>{t('donations:timeScreen.emergencyTitle')}</Text>
                <Text style={styles.emergencyDescription}>
                  {t('donations:timeScreen.emergencyDescription')}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={colors.accent} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories Filter */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>{t('donations:timeScreen.categoriesTitle')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryButton,
                  effectiveCategoryKey === key && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(key)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  effectiveCategoryKey === key && styles.categoryButtonTextActive
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Volunteer Opportunities */}
        <View style={styles.opportunitiesSection}>
          <Text style={styles.sectionTitle}>{t('donations:timeScreen.opportunitiesTitle')}</Text>
          <Text style={styles.sectionDescription}>
            {t('donations:timeScreen.opportunitiesDescription')}
          </Text>

          <View style={styles.opportunitiesGrid}>
            {(isRealAuth ? [] : filteredOpportunities).map((opportunity) => (
              <TouchableOpacity
                key={opportunity.id}
                style={styles.opportunityCard}
                onPress={() => handleVolunteerPress(opportunity)}
              >
                <Image source={{ uri: opportunity.image }} style={styles.opportunityImage} />
                <View style={styles.opportunityContent}>
                  <View style={styles.opportunityHeader}>
                    <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
                    <View style={styles.opportunityCategory}>
                      <Text style={styles.opportunityCategoryText}>
                        {opportunity.category === 'all' ? t('donations:timeScreen.allCategories') : t(`donations:timeScreen.categories.${opportunity.category}`)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.opportunityOrganization}>{opportunity.organization}</Text>
                  <Text style={styles.opportunityDescription}>{opportunity.description}</Text>
                  <TouchableOpacity
                    style={styles.visitButton}
                    onPress={() => Linking.openURL('https://www.ruachtova.org.il/').catch(() => Alert.alert(t('donations:timeScreen.error'), t('donations:timeScreen.cannotOpenLink')))}
                  >
                    <Text style={styles.visitButtonText}>{t('donations:timeScreen.findSimilar')}</Text>
                  </TouchableOpacity>

                  <View style={styles.opportunityDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{opportunity.location}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{opportunity.duration}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{opportunity.frequency}</Text>
                    </View>
                  </View>

                  <View style={styles.volunteersInfo}>
                    <View style={styles.volunteersProgress}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${(opportunity.volunteers / opportunity.needed) * 100}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.volunteersText}>
                        {t('donations:timeScreen.volunteersCount', { current: opportunity.volunteers, needed: opportunity.needed })}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.joinButton}>
                      <Text style={styles.joinButtonText}>{t('donations:timeScreen.join')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <DonationStatsFooter
            stats={[
              { label: t('donations:timeScreen.statActiveVolunteers'), value: 2847, icon: 'people-outline' },
              { label: t('donations:timeScreen.statVolunteerHours'), value: 15234, icon: 'time-outline' },
              { label: t('donations:timeScreen.statActiveOrgs'), value: 156, icon: 'heart-outline' },
            ]}
          />
        </View>

        {/* Add Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('donations:timeScreen.usefulLinks')}</Text>
          <AddLinkComponent category="time" />
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  emergencySection: {
    marginTop: 20,
    marginBottom: 20,
  },
  emergencyCard: {
    backgroundColor: colors.warningLight,
    borderRadius: 15,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.pinkDeep,
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyText: {
    flex: 1,
    marginLeft: 15,
  },
  emergencyTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 4,
  },
  emergencyDescription: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
  },
  categoriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  categoriesScroll: {
    paddingRight: 20,
  },
  categoryButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  categoryButtonText: {
    fontSize: FontSizes.body,
    color: colors.textPrimary,
  },
  categoryButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  opportunitiesSection: {
    marginBottom: 30,
  },
  sectionDescription: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  opportunitiesGrid: {
    gap: 15,
  },
  opportunityCard: {
    backgroundColor: colors.background,
    borderRadius: 15,
    overflow: 'hidden',
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 4),
    elevation: 3,
  },
  opportunityImage: {
    width: '100%',
    height: 150,
  },
  opportunityContent: {
    padding: 15,
  },
  visitButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  visitButtonText: {
    color: colors.textPrimary,
    fontSize: FontSizes.caption,
    fontWeight: '600',
  },
  opportunityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  opportunityTitle: {
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  opportunityCategory: {
    backgroundColor: colors.pinkLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  opportunityCategoryText: {
    color: colors.pinkDeep,
    fontSize: FontSizes.small,
    fontWeight: '600',
  },
  opportunityOrganization: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  opportunityDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  opportunityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: FontSizes.small,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  volunteersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  volunteersProgress: {
    flex: 1,
    marginRight: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  volunteersText: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
  },
  joinButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    color: colors.white,
    fontSize: FontSizes.body,
    fontWeight: '600',
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
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 4),
    elevation: 2,
  },
  statNumber: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.accent,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  offerPlaceholder: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerIcon: {
    marginBottom: 16,
  },
  offerTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  offerMessage: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  offerCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  offerCtaText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: colors.background,
  },
}); 