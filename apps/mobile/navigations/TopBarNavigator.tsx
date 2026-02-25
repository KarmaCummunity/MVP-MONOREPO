// File overview:
// - Purpose: Shared top navigation bar component for stacks; shows title and quick actions (Settings, Notifications, Chat/About).
// - Reached from: `HomeTabStack`, `SearchTabStack`, `ProfileTabStack`, `DonationsStack` as a custom header.
// - Inputs: Props `hideTopBar` and `showPosts`; also reads `route.params.hideTopBar`. Title resolves by current route with i18n.
// - Reads from context: `useUser()` for guest mode to toggle Chat/About icon.
// - Side effects: Logs focus and state changes via `logger`; animates show/hide with Reanimated.
import React from 'react';
import styles from '../globals/styles'; // your styles file
import { Ionicons as Icon } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, ParamListBase, StackActions } from '@react-navigation/native';
import { useRoute, useFocusEffect, useNavigationState } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import colors from '../globals/colors';
import { useUser } from '../stores/userStore';
import { logger } from '../utils/loggerService';
import { rowDirection } from '../globals/responsive';
import { useTranslation } from 'react-i18next';
import AboutButton from '../components/AboutButton';
import { useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';


interface TopBarNavigatorProps {
  navigation: NavigationProp<ParamListBase>;
  hideTopBar?: boolean;
  showPosts?: boolean;
}

function TopBarNavigator({ navigation, hideTopBar = false, showPosts = false }: TopBarNavigatorProps) {
  const { t } = useTranslation(['home', 'common', 'settings', 'donations', 'notifications', 'profile']);

  const route = useRoute();
  const { isGuestMode } = useUser();
  const unreadCount = useUnreadNotificationsCount();
  const translateY = useSharedValue(0);
  const [measuredHeight, setMeasuredHeight] = React.useState(56);

  // Get the current active route name from navigation state
  const activeRouteName = useNavigationState(state => {
    if (!state) return 'HomeMain';

    const findActiveRoute = (routes: any[], index: number): string => {
      const currentRoute = routes[index];
      if (currentRoute?.state?.routes) {
        // This route has nested navigation, go deeper
        return findActiveRoute(currentRoute.state.routes, currentRoute.state.index || 0);
      }
      return currentRoute?.name || 'HomeMain';
    };

    return findActiveRoute(state.routes, state.index || 0);
  });

  // List of top bar screens that should be mutually exclusive
  const topBarScreens = ['SettingsScreen', 'NotificationsScreen', 'ChatListScreen', 'LandingSiteScreen'];

  // Handler for toggling screens (open if closed, close if open)
  // Only one top bar screen can be open at a time
  const handleScreenToggle = (screenName: string) => {
    // Get current route name for comparison
    const currentRoute = activeRouteName || route.name;

    if (currentRoute === screenName) {
      // Screen is open, close it by going back
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } else {
      // Check if any other top bar screen is currently open
      const otherTopBarScreenOpen = topBarScreens.find(
        screen => screen !== screenName && currentRoute === screen
      );

      if (otherTopBarScreenOpen) {
        // Another top bar screen is open, replace it with the new screen
        // This ensures only one top bar screen is open at a time
        navigation.dispatch(
          StackActions.replace(screenName, {})
        );
      } else {
        // No other top bar screen is open, navigate to the new screen
        navigation.navigate(screenName as never);
      }
    }
  };

  // Log render for debugging
  React.useEffect(() => {
    logger.debug('TopBarNavigator', 'Component rendered', {
      routeName: route.name,
      isGuestMode,
    });
  }, [route.name, isGuestMode]);

  // Refresh data when navigator comes into focus
  useFocusEffect(
    React.useCallback(() => {
      logger.debug('TopBarNavigator', 'Navigator focused', { routeName: route.name });
    }, [route.name])
  );

  ////console.log('🔝 TopBarNavigator - hideTopBar prop:', hideTopBar);

  const shouldHideTopBar = hideTopBar || (route?.params as any)?.hideTopBar === true;

  React.useEffect(() => {
    translateY.value = withTiming(shouldHideTopBar ? -measuredHeight : 0, { duration: 200 });
  }, [shouldHideTopBar, measuredHeight]);



  const animatedStyle = useAnimatedStyle(() => {
    //console.log('🔝 TopBarNavigator - translateY value:', translateY.value);
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Debug logs
  //console.log('🔍 TopBarNavigator - Current route name:', route.name);
  //console.log('🔍 TopBarNavigator - Route params:', route.params);
  //console.log('🔍 TopBarNavigator - Route key:', route.key);
  //console.log('🔍 TopBarNavigator - Full route object:', JSON.stringify(route, null, 2));

  // Map route names to titles using translations
  const routeTitles: Record<string, string> = {
    SearchTab: t('common:search'),
    SearchScreen: t('common:search'),
    DonationsTab: t('donations:title'),
    DonationsScreen: t('donations:title'),
    ProfileScreen: t('profile:title'),
    LandingSiteScreen: 'אודות הקהילה',

    MoneyScreen: t('donations:categories.money.title'),
    TrumpScreen: t('donations:categories.trump.title'),
    KnowledgeScreen: t('donations:categories.knowledge.title'),
    TimeScreen: t('donations:categories.time.title'),
    CategoryScreen: t('donations:categoriesTitle'),
    ItemsScreen: t('donations:categories.items.title'),
    FoodScreen: t('donations:categories.food.title'),
    ClothesScreen: t('donations:categories.clothes.title'),
    BooksScreen: t('donations:categories.books.title'),
    FurnitureScreen: t('donations:categories.furniture.title'),
    MedicalScreen: t('donations:categories.medical.title'),
    AnimalsScreen: t('donations:categories.animals.title'),
    HousingScreen: t('donations:categories.housing.title'),
    SupportScreen: t('donations:categories.support.title'),
    EducationScreen: t('donations:categories.education.title'),
    EnvironmentScreen: t('donations:categories.environment.title'),
    TechnologyScreen: t('donations:categories.technology.title'),
    MusicScreen: t('donations:categories.music.title'),
    GamesScreen: t('donations:categories.games.title'),
    RiddlesScreen: t('donations:categories.riddles.title'),
    RecipesScreen: t('donations:categories.recipes.title'),
    PlantsScreen: t('donations:categories.plants.title'),
    WasteScreen: t('donations:categories.waste.title'),
    ArtScreen: t('donations:categories.art.title'),
    SportsScreen: t('donations:categories.sports.title'),
    DreamsScreen: t('donations:categories.dreams.title'),
    FertilityScreen: t('donations:categories.fertility.title'),
    JobsScreen: t('donations:categories.jobs.title'),
    DiscoverPeopleScreen: t('profile:discover'),
    NewChatScreen: t('common:newChat'),
    SettingsScreen: t('settings:title'),
    ChatListScreen: t('chat:title'),
    NotificationsScreen: t('notifications:title'),
    AboutKarmaCommunityScreen: t('settings:about'),

    UserProfileScreen: t('profile:title'),
    FollowersScreen: t('profile:followers'),
    ChatDetailScreen: t('common:chat'),
    BookmarksScreen: t('common:favorites'),
    PostsReelsScreen: t('common:posts'),
    InactiveScreen: t('common:inactive'),
    WebViewScreen: t('common:web'),
    LoginScreen: t('auth:login'),
  };

  // Get current route name
  const currentRouteName = activeRouteName || route.name;

  // Determine title based on current route
  let title = 'KC';

  if (currentRouteName === 'HomeScreen' || currentRouteName === 'HomeMain') {
    title = showPosts ? t('home:newsTitle') : t('home:numbersTitle');
  } else {
    // Use the routeTitles mapping for all other screens
    title = routeTitles[currentRouteName] ?? 'KC';
  }

  // Log important state changes
  React.useEffect(() => {
    logger.logUserAction('state-change', 'TopBarNavigator', {
      currentRouteName,
      activeRouteName,
      title,
      isGuestMode,
      hideTopBar,
      showPosts
    });
  }, [title, currentRouteName, activeRouteName, showPosts, hideTopBar, isGuestMode]);


  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
      <Animated.View
        style={[styles.container_top_bar as StyleProp<ViewStyle>, animatedStyle]}
        onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}
      >

        <View style={styles.topBarIconsRow as StyleProp<ViewStyle>}>
          <TouchableOpacity onPress={() => handleScreenToggle('SettingsScreen')} style={styles.topBarIconButton as StyleProp<ViewStyle>}>
            <Icon name="settings-outline" size={24} color={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleScreenToggle('NotificationsScreen')} style={styles.topBarIconButton as StyleProp<ViewStyle>}>
            <View style={{ position: 'relative' }}>
              <Icon name="notifications-circle-outline" size={24} color={colors.black} />
              {unreadCount > 0 && (
                <View style={(styles as any).notificationBadge as StyleProp<ViewStyle>}>
                  <Text style={(styles as any).notificationBadgeText as StyleProp<TextStyle>}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.topBarTitleContainer as StyleProp<ViewStyle>}>
          <Text style={styles.topBarTitle as StyleProp<TextStyle>}>{title}</Text>
        </View>
        {/* Left Icons Group: Notifications + Settings */}

        {/* Right Icons Group: Chat + About (for authenticated users) OR About only (for guests) */}
        {/* 
        About button is now available in both guest and authenticated modes:
        - Guest mode: Shows only About button (replaces Chat button)
        - Authenticated mode: Shows both Chat and About buttons
        This provides consistent access to About information across all user states.
      */}
        <View style={styles.topBarIconsRow as StyleProp<ViewStyle>}>
          {isGuestMode ? (
            // Guest mode: Show only About button
            <AboutButton
              style={styles.topBarIconButton as StyleProp<ViewStyle>}
              onPress={() => handleScreenToggle('LandingSiteScreen')}
              iconColor={colors.black}
            />
          ) : (
            // Authenticated mode: Show both Chat and About buttons
            <>
              <TouchableOpacity onPress={() => handleScreenToggle('ChatListScreen')} style={styles.topBarIconButton as StyleProp<ViewStyle>}>
                <Icon name="chatbubbles-outline" size={24} color={colors.black} />
              </TouchableOpacity>
              <AboutButton
                style={styles.topBarIconButton as StyleProp<ViewStyle>}
                onPress={() => handleScreenToggle('LandingSiteScreen')}
                iconColor={colors.black}
              />
            </>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

export default TopBarNavigator;
