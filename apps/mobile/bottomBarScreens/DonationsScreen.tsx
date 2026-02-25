// File overview:
// - Purpose: Entry screen for the Donations tab, surfacing category shortcuts (Popular/For You/All) and quick actions.
// - Reached from: `DonationsStack` -> initial route 'DonationsScreen'.
// - Provides: Navigation to category screens, tracks category analytics, persists recent categories, shows footer stats.
// - Reads from context: `useUser()` -> isGuestMode, isRealAuth for behaviour and analytics source.
// - Storage/services: AsyncStorage for recents; `EnhancedStatsService` or legacy `restAdapter` for analytics, `USE_BACKEND` switch.
// - Params: None required; navigation uses route names listed in `BASE_CATEGORIES` mapping.

// TODO: CRITICAL - This file is extremely long (871 lines). Split into smaller components:
//   - CategoryGrid component for category layout
//   - CategoryCard component for individual categories  
//   - RecentCategoriesSection component
//   - PopularCategoriesSection component
//   - CategoryAnalytics service for tracking
// TODO: Remove hardcoded category data - move to configuration service
// TODO: Add comprehensive error handling for all async operations
// TODO: Implement proper loading states and skeleton screens
// TODO: Add comprehensive TypeScript interfaces instead of basic types
// TODO: Replace fake data with real backend integration
// TODO: Add proper caching mechanism for categories and analytics
// TODO: Implement proper accessibility for all interactive elements
// TODO: Add comprehensive unit tests for all category logic
import { logger } from '../utils/loggerService';
// Removed console.log statements - using proper logging service
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import ScrollContainer from '../components/ScrollContainer';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DonationsStackParamList } from '../globals/types';
import colors from '../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../globals/constants';
import { useUser } from '../stores/userStore';
import GuestModeNotice from '../components/GuestModeNotice';
import DonationStatsFooter from '../components/DonationStatsFooter';
import { useTranslation } from 'react-i18next';
import { getScreenInfo, isLandscape, responsiveSpacing, scaleSize } from '../globals/responsive';
import { createShadowStyle } from '../globals/styles';
import { restAdapter } from '../utils/restAdapter';
import { EnhancedStatsService } from '../utils/statsService';
import { USE_BACKEND } from '../utils/dbConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Placeholder datasets (purged demo) – replace with real API data
const donations: any[] = [];
const charities: any[] = [];

interface DonationsScreenProps {
  navigation: NavigationProp<DonationsStackParamList>;
}

const ANALYTICS_USER_ID = 'global';
const ANALYTICS_COLLECTION = 'analytics';
const ANALYTICS_ITEM_PREFIX = 'category:';

// TODO: URGENT - Move this hardcoded configuration to proper data service
// TODO: Implement proper category management system with backend sync
// TODO: Add internationalization for category names and descriptions
// TODO: Create proper category icon management system
// TODO: Add category access control and permissions
const BASE_CATEGORIES = [
  { id: 'money',      icon: 'card-outline',        color: colors.success, bgColor: colors.successLight, screen: 'MoneyScreen' },
  { id: 'trump',      icon: 'car-outline',         color: colors.primary,    bgColor: colors.infoLight,    screen: 'TrumpScreen' },
  { id: 'knowledge',  icon: 'school-outline',      color: colors.warning, bgColor: colors.warning, screen: 'KnowledgeScreen' },
  { id: 'challenges', icon: 'trophy-outline',      color: colors.warning, bgColor: colors.warning, screen: 'MyChallengesScreen' },
  { id: 'time',       icon: 'time-outline',        color: colors.secondary,  bgColor: colors.pinkLight, screen: 'TimeScreen' },
  { id: 'food',       icon: 'restaurant-outline',  color: colors.success, bgColor: colors.successLight, screen: 'FoodScreen' },
  { id: 'clothes',    icon: 'shirt-outline',       color: colors.secondary,    bgColor: colors.pinkLight,    screen: 'ClothesScreen' },
  { id: 'books',      icon: 'library-outline',     color: colors.primary, bgColor: colors.infoLight, screen: 'BooksScreen' },
  { id: 'items',      icon: 'cube-outline',        color: colors.secondary, bgColor: colors.pinkLight, screen: 'ItemsScreen' },
  { id: 'furniture',  icon: 'bed-outline',         color: colors.secondary, bgColor: colors.pinkLight, screen: 'FurnitureScreen' },
  { id: 'medical',    icon: 'medical-outline',     color: colors.error,   bgColor: colors.errorLight,   screen: 'MedicalScreen' },
  { id: 'animals',    icon: 'paw-outline',         color: colors.success, bgColor: colors.successLight, screen: 'AnimalsScreen' },
  { id: 'housing',    icon: 'home-outline',        color: colors.primary,    bgColor: colors.infoLight,    screen: 'HousingScreen' },
  { id: 'support',    icon: 'heart-outline',       color: colors.secondary, bgColor: colors.pinkLight,   screen: 'SupportScreen' },
  { id: 'education',  icon: 'book-outline',        color: colors.primary,    bgColor: colors.infoLight,    screen: 'EducationScreen' },
  { id: 'environment',icon: 'leaf-outline',        color: colors.success, bgColor: colors.successLight, screen: 'EnvironmentScreen' },
  { id: 'technology', icon: 'laptop-outline',      color: colors.primary,    bgColor: colors.infoLight,    screen: 'TechnologyScreen' },
  { id: 'music',      icon: 'musical-notes-outline', color: colors.secondary,  bgColor: colors.pinkLight,    screen: 'MusicScreen' },
  { id: 'games',      icon: 'game-controller-outline', color: colors.primary, bgColor: colors.infoLight, screen: 'GamesScreen' },
  { id: 'riddles',    icon: 'help-circle-outline', color: colors.secondary,    bgColor: colors.pinkLight,    screen: 'RiddlesScreen' },
  { id: 'recipes',    icon: 'fast-food-outline',   color: colors.success, bgColor: colors.successLight, screen: 'RecipesScreen' },
  { id: 'plants',     icon: 'flower-outline',      color: colors.success, bgColor: colors.successLight, screen: 'PlantsScreen' },
  { id: 'waste',      icon: 'trash-outline',       color: colors.warning, bgColor: colors.warning, screen: 'WasteScreen' },
  { id: 'art',        icon: 'color-palette-outline', color: colors.secondary,  bgColor: colors.pinkLight,    screen: 'ArtScreen' },
  { id: 'sports',     icon: 'football-outline',    color: colors.primary,  bgColor: colors.infoLight,  screen: 'SportsScreen' },
  { id: 'dreams',     icon: 'star-outline',        color: colors.secondary,    bgColor: colors.pinkLight,    screen: 'DreamsScreen' },
  { id: 'fertility',  icon: 'medkit-outline',      color: colors.error,   bgColor: colors.errorLight,   screen: 'FertilityScreen' },
  { id: 'jobs',       icon: 'briefcase-outline',   color: colors.primary,    bgColor: colors.infoLight,    screen: 'JobsScreen' },
  { id: 'matchmaking', icon: 'people-outline',     color: colors.secondary,    bgColor: colors.pinkLight,    screen: 'MatchmakingScreen' },
  { id: 'mentalHealth', icon: 'pulse-outline',     color: colors.secondary,  bgColor: colors.pinkLight,  screen: 'MentalHealthScreen' },
  { id: 'goldenAge',   icon: 'person-outline',     color: colors.warning, bgColor: colors.warning, screen: 'GoldenAgeScreen' },
  { id: 'languages',   icon: 'language-outline',   color: colors.primary,    bgColor: colors.infoLight,    screen: 'LanguagesScreen' },
] as const;

type CategoryId = typeof BASE_CATEGORIES[number]['id'];

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const DonationsScreen: React.FC<DonationsScreenProps> = ({ navigation }) => {
  // TODO: Extract state management to custom hooks (useDonationsState, useCategoryAnalytics)
  // TODO: Implement proper state validation and error boundaries
  // TODO: Add comprehensive performance optimization with React.memo and useMemo
  // TODO: Remove Hebrew comment - implement proper internationalization
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { isGuestMode, isRealAuth } = useUser();
  const { t } = useTranslation(['donations','common']);

  // חישוב מידות responsive לכרטיסים
  const { isTablet: isTabletScreen, isDesktop: isDesktopScreen } = getScreenInfo();
  const landscapeMode = isLandscape();
  
  // Simplified responsive sizing for mobile web
  const availableHeight = SCREEN_HEIGHT - (insets?.top ?? 0) - (insets?.bottom ?? 0) - (tabBarHeight ?? 0) - (headerHeight ?? 0);
  const isMobileWebView = Platform.OS === 'web' && SCREEN_WIDTH <= 768;
  const isCompact = availableHeight < 600;

  useFocusEffect(
    useCallback(() => {
      // Analytics tracking if needed
      logger.info('DonationsScreen', 'Screen focused');
    }, [])
  );

  const getCategoryText = (id: CategoryId) => ({
    title: t(`donations:categories.${id}.title`),
    subtitle: t(`donations:categories.${id}.subtitle`),
    description: t(`donations:categories.${id}.description`),
  });

  const incrementCategoryCounter = async (categoryId: string) => {
    try {
      if (USE_BACKEND && isRealAuth) {
        // Use enhanced stats service with user tracking
        await EnhancedStatsService.trackCategoryView(categoryId);
      } else {
        // Fallback to legacy analytics
        const itemId = `${ANALYTICS_ITEM_PREFIX}${categoryId}`;
        const existing = await restAdapter.read<any>(ANALYTICS_COLLECTION, ANALYTICS_USER_ID, itemId).catch(() => null);
        const next = { id: itemId, categoryId, count: Number(existing?.count ?? 0) + 1, updatedAt: new Date().toISOString() };
        if (!existing) {
          await restAdapter.create(ANALYTICS_COLLECTION, ANALYTICS_USER_ID, itemId, next);
        } else {
          await restAdapter.update(ANALYTICS_COLLECTION, ANALYTICS_USER_ID, itemId, next);
        }
      }
    } catch (e) {
      logger.warn('DonationsScreen', 'Failed to track category view', { error: e });
    }
  };

  const handleCategoryPress = (category: { id: CategoryId; screen?: string }) => {
    // Fire-and-forget analytics increment  
    incrementCategoryCounter(category.id).catch(() => {});
    
    logger.info('DonationsScreen', 'Category pressed', {
      id: category.id,
      title: getCategoryText(category.id).title,
      screen: category.screen
    });

    if (category.screen) {
      (navigation as any).navigate(category.screen);
    } else {
      Alert.alert(
        t('donations:comingSoonTitle'),
        t('donations:comingSoonMessage'),
        [{ text: t('common:confirm'), style: 'default' }]
      );
    }
  };

  // קביעת הקטגוריות לסעיף הראשון - 4 קטגוריות מועדפות
  const primaryCategoryIds: CategoryId[] = ['money', 'items', 'trump', 'knowledge'];
  const primaryCategories = primaryCategoryIds
    .map((id) => BASE_CATEGORIES.find((c) => c.id === id))
    .filter((c): c is typeof BASE_CATEGORIES[number] => Boolean(c));

  // כל הקטגוריות האחרות לסעיף השני
  const otherCategories = BASE_CATEGORIES.filter(
    (c) => !primaryCategoryIds.includes(c.id as CategoryId)
  );
  
  logger.info('DonationsScreen', 'Categories organized', {
    primary: primaryCategories.map((c) => c.id),
    other: otherCategories.length,
  });

  // חישוב מידות responsive לכרטיסים
  const cardPadding = responsiveSpacing(12, 16, 20);
  const iconSize = responsiveSpacing(48, 56, 64);
  const iconInnerSize = responsiveSpacing(32, 40, 48);
  const cardGap = responsiveSpacing(12, 16, 24);
  const sectionPadding = responsiveSpacing(20, 28, 36);
  // ריווח responsive לסעיף השני - גדל עם המסך
  const otherCategoriesGap = responsiveSpacing(12, 20, 28);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundSecondary} />
      {isGuestMode && <GuestModeNotice showLoginButton={false} />}
      
      <ScrollContainer style={styles.scrollContainer} contentStyle={styles.scrollContent}>
        {/* סעיף ראשון - 4 קטגוריות מועדפות */}
        <View style={[styles.modernSection, { padding: sectionPadding }]}>
          <View style={[styles.modernGrid, { gap: cardGap }]}>
            {primaryCategories.map((category) => {
              const { title, subtitle } = getCategoryText(category.id);
              // חישוב רוחב responsive לכרטיס
              const cardWidth = Platform.OS === 'web'
                ? isDesktopScreen
                  ? '22%'
                  : isTabletScreen
                    ? '30%'
                    : '45%'
                : isTabletScreen || landscapeMode
                  ? '30%'
                  : '45%';
              return (
                <TouchableOpacity
                  key={`primary-${category.id}`}
                  style={[
                    styles.modernCard,
                    { 
                      gap: cardGap,
                      width: cardWidth,
                      minWidth: cardWidth,
                      maxWidth: cardWidth,
                      backgroundColor: colors.infoLight, // רקע אחיד כמו הטרמפים
                    },
                  ]}
                  onPress={() => handleCategoryPress(category)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.modernIconContainer,
                      {
                        width: iconSize,
                        height: iconSize,
                        backgroundColor: category.color + '15', // 15% opacity
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.modernIcon,
                        {
                          width: iconInnerSize,
                          height: iconInnerSize,
                          backgroundColor: category.color,
                        },
                      ]}
                    >
                      <Ionicons 
                        name={category.icon as any} 
                        size={iconInnerSize * 0.6} 
                        color="white" 
                      />
                    </View>
                  </View>
                  <View style={styles.modernCardContent}>
                    <Text style={styles.modernCardTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.modernCardSubtitle} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* סעיף שני - כל הקטגוריות הנוספות */}
        <View style={[styles.modernSection, { padding: sectionPadding }]}>
          <Text style={styles.modernSectionTitle}>
            מסכים בבניה, כרגע מכילים קישורים רלוונטים
          </Text>
          <View style={[styles.modernOtherGrid, { gap: otherCategoriesGap }]}>
            {otherCategories.map((category) => {
              const { title, subtitle } = getCategoryText(category.id as CategoryId);
              // חישוב רוחב responsive לכרטיס קטן - 3 בשורה
              const smallCardWidth = "25%";
              return (
                <TouchableOpacity
                  key={`other-${category.id}`}
                  style={[
                    styles.modernSmallCard,
                    {
                      width: smallCardWidth,
                      minWidth: smallCardWidth,
                      maxWidth: smallCardWidth,
                      backgroundColor: colors.infoLight, // רקע אחיד כמו הטרמפים
                      paddingVertical: responsiveSpacing(12, 14, 16),
                      paddingHorizontal: responsiveSpacing(8, 10, 12),
                    },
                  ]}
                  onPress={() => handleCategoryPress(category as any)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.modernSmallIcon,
                      {
                        backgroundColor: category.color,
                        width: iconInnerSize * 0.7,
                        height: iconInnerSize * 0.7,
                        marginBottom: responsiveSpacing(6, 8, 10),
                        ...createShadowStyle(category.color, { width: 0, height: 2 }, 0.25, 6),
                      },
                    ]}
                  >
                    <Ionicons 
                      name={category.icon as any} 
                      size={iconInnerSize * 0.4} 
                      color="white" 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.modernSmallCardTitle,
                      { 
                        color: category.color,
                        marginBottom: responsiveSpacing(2, 3, 4),
                      }
                    ]} 
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Text 
                    style={[
                      styles.modernSmallCardSubtitle,
                      { color: category.color + 'AA' }
                    ]} 
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      {/* Stats Section */}
      {(() => {
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const weeklyDonations = donations.filter((d: any) => {
          const t = new Date(d.createdAt || Date.now()).getTime();
          return t >= weekAgo;
        }).length;
        const activeDonors = new Set(donations.map((d: any) => d.createdBy).filter(Boolean)).size;
        const activeCharities = charities.length;
        return (
            <DonationStatsFooter
              compact={isCompact}
              stats={[
                { label: t('donations:activeDonors'), value: activeDonors, icon: 'people-outline' },
                { label: t('donations:weeklyDonations'), value: weeklyDonations, icon: 'heart-outline' },
                { label: t('donations:activeCharities'), value: activeCharities, icon: 'business-outline' },
              ]}
            />
        );
      })()}
      </ScrollContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary, // עודכן לכחול בהיר
  },
  scrollContainer: {
    backgroundColor: colors.backgroundTertiary, // עודכן לכחול בהיר
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Web-specific scroll wrappers
  webScrollContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && { 
      overflow: 'auto' as any,
      WebkitOverflowScrolling: 'touch' as any,
      overscrollBehavior: 'contain' as any,
      height: SCREEN_HEIGHT as any,
      maxHeight: SCREEN_HEIGHT as any,
      width: '100%' as any,
      touchAction: 'auto' as any,
    }),
  } as any,
  webScrollContent: {
    minHeight: SCREEN_HEIGHT * 1.2,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.XS,
    paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
  },
  header: {
    backgroundColor: colors.background,
    paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
    paddingBottom: LAYOUT_CONSTANTS.SPACING.MD,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
    borderBottomLeftRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    borderBottomRightRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 4),
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
    width: scaleSize(45),
    height: scaleSize(45),
    borderRadius: scaleSize(45) / 2,
    marginRight: LAYOUT_CONSTANTS.SPACING.SM,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: FontSizes.body,
    color: colors.textSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  userName: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  settingsButton: {
    padding: LAYOUT_CONSTANTS.SPACING.SM,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.XS,
    paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL + LAYOUT_CONSTANTS.SPACING.MD,
    paddingBottom: LAYOUT_CONSTANTS.SPACING.XL * 6,
  },
  quickActionsSection: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
    alignItems: 'center',

  },
  sectionTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: '800', // פונט עבה יותר
    color: colors.secondary, // צבע ורוד מהלוגו החדש
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'center', // מרכוז הכותרת
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: LAYOUT_CONSTANTS.SPACING.LG,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 4),
  },
  quickActionText: {
    color: colors.white,
    fontSize: FontSizes.button,
    fontWeight: '600',
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
  },
  categoriesSection: {
    backgroundColor: colors.background, // רקע לבן נקי לקטגוריות
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE, // עיגול גדול יותר
    borderWidth: 1,
    borderColor: colors.border, // גבול עדין
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    marginBottom: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.SM : LAYOUT_CONSTANTS.SPACING.MD, // Less margin on web
    marginHorizontal: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.XS : LAYOUT_CONSTANTS.SPACING.SM, // Less margin on web
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.MD : LAYOUT_CONSTANTS.SPACING.LG, // Less padding on web
    paddingHorizontal: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.SM : LAYOUT_CONSTANTS.SPACING.MD, // Less padding on web
    ...createShadowStyle(colors.secondary, { width: 0, height: 4 }, 0.15, 8), // צל צבעוני
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  horizontalScrollContainer: {
    height: Math.max(120, scaleSize(140)), // גובה קבוע
    width: '100%',
  },
  horizontalScrollView: {
    flex: 1,
    height: '100%',
    ...(Platform.OS === 'web' && {
      overflowX: 'auto' as any,
      overflowY: 'hidden' as any,
      WebkitOverflowScrolling: 'touch' as any,
    }),
  } as any,
  horizontalScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.XS,
    height: '100%',
  },
  horizontalList: {
    paddingVertical: LAYOUT_CONSTANTS.SPACING.XS,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.XS,
    flexDirection: 'row',
    ...(Platform.OS === 'web' && {
      display: 'flex' as any,
      flexWrap: 'nowrap' as any,
    }),
  },
  othersSection: {
    alignSelf: 'stretch',
    width: '100%',
  },
  verticalScrollNative: {
    alignSelf: 'stretch',
    width: '100%',
  },
  verticalScrollContent: {
    paddingBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  verticalScrollWeb: {
    width: '100%',
  },
  activeCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  categoryCard: {
    width: '31.5%',
    paddingVertical: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.SM : LAYOUT_CONSTANTS.SPACING.MD, // Less padding on web
    paddingHorizontal: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.XS : LAYOUT_CONSTANTS.SPACING.SM, // Less padding on web
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM, // עיגול יותר מעוגל
    alignItems: 'center',
    ...createShadowStyle(colors.secondary, { width: 0, height: 2 }, 0.12, 4), // צל צבעוני
    backgroundColor: colors.background, // רקע לבן נקי
    borderWidth: 1,
    borderColor: colors.border, // גבול עדין יותר
  },
  categoryCardHorizontal: {
    width: Platform.OS === 'web' ? scaleSize(120) : scaleSize(140), // Smaller on web
    paddingVertical: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.SM : LAYOUT_CONSTANTS.SPACING.MD, // Less padding on web
    paddingHorizontal: Platform.OS === 'web' ? LAYOUT_CONSTANTS.SPACING.XS : LAYOUT_CONSTANTS.SPACING.SM, // Less padding on web
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM, // עיגול יותר מעוגל
    alignItems: 'center',
    ...createShadowStyle(colors.secondary, { width: 0, height: 2 }, 0.12, 4), // צל צבעוני
    backgroundColor: colors.background, // רקע לבן נקי
    borderWidth: 1,
    borderColor: colors.border, // גבול עדין יותר
    marginRight: LAYOUT_CONSTANTS.SPACING.XS,
  },
  activeCategoryCard: {
    width: '45%',
    padding: LAYOUT_CONSTANTS.SPACING.MD,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    ...createShadowStyle(colors.shadow, { width: 0, height: 3 }, 0.15, 6),
    minHeight: scaleSize(140),
    backgroundColor: colors.categoryCardBackground,
    borderWidth: 1,
    borderColor: colors.categoryBorder,
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: colors.categoryIconBackground,
  },
  categoryIcon: {
    width: scaleSize(35),
    height: scaleSize(35),
    borderRadius: scaleSize(35) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM, // מרווח גדול יותר מתחת לאיקון
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.3, 4), // צל לאיקון
  },
  categoryIconWrapper: {
    position: 'relative',
  },
  pinOverlay: {
    position: 'absolute',
    top: -scaleSize(6),
    right: -scaleSize(6),
  },
  activeCategoryIcon: {
    width: scaleSize(45),
    height: scaleSize(45),
    borderRadius: scaleSize(45) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  categoryTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '700', // פונט עבה יותר
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: LAYOUT_CONSTANTS.SPACING.XS, // מרווח קטן מעל הכותרת
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  categorySubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryDescription: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Math.round(FontSizes.small * 1.2),
  },
  activeCategoryTitle: {
    fontSize: FontSizes.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
    textAlign: 'center',
  },
  activeCategorySubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
    textAlign: 'center',
  },
  activeCategoryDescription: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Math.round(FontSizes.caption * 1.4),
  },
  statsSection: {
    marginBottom: LAYOUT_CONSTANTS.SPACING.XL,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    marginHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
    ...createShadowStyle(colors.shadow, { width: 0, height: 4 }, 0.1, 8),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT_CONSTANTS.SPACING.SM,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.1, 4),
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
  },
  statNumber: {
    fontSize: FontSizes.heading1,
    fontWeight: 'bold',
    color: colors.secondary,
    marginTop: LAYOUT_CONSTANTS.SPACING.SM,
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  statLabel: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Modern Design Styles
  modernSection: {
    marginTop: LAYOUT_CONSTANTS.SPACING.LG,
    backgroundColor: colors.background,
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    marginHorizontal: LAYOUT_CONSTANTS.SPACING.MD,
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
    ...createShadowStyle(colors.shadow, { width: 0, height: 2 }, 0.08, 12),
  },
  modernGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: LAYOUT_CONSTANTS.SPACING.MD, // gap מוגדר inline ב-component
  },
  modernCard: {
    // backgroundColor מוגדר באופן דינמי בקומפוננטה לפי category.bgColor
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    padding: LAYOUT_CONSTANTS.SPACING.LG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...createShadowStyle(colors.shadow, { width: 0, height: 4 }, 0.1, 8),
  },
  modernIconContainer: {
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.SM,
  },
  modernIcon: {
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
    ...createShadowStyle(colors.shadow, { width: 0, height: 3 }, 0.2, 6),
  },
  modernCardContent: {
    alignItems: 'center',
    width: '100%',
  },
  modernCardTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  modernCardSubtitle: {
    fontSize: FontSizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSizes.body,
  },
  modernSectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: LAYOUT_CONSTANTS.SPACING.LG,
    paddingHorizontal: LAYOUT_CONSTANTS.SPACING.SM,
  },
  modernOtherGrid: {
    
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // יישור לאמצע
    alignItems: 'flex-start',
  },
  modernSmallCard: {
    // backgroundColor מוגדר באופן דינמי בקומפוננטה לפי category.bgColor
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...createShadowStyle(colors.shadow, { width: 0, height: 3 }, 0.1, 10),
  },
  modernSmallIconContainer: {
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: LAYOUT_CONSTANTS.SPACING.XS,
  },
  modernSmallIcon: {
    borderRadius: LAYOUT_CONSTANTS.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernSmallCardTitle: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
  },
  modernSmallCardSubtitle: {
    fontSize: FontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },

});

export default DonationsScreen;
