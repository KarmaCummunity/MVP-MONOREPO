// types/navigation.ts
// TypeScript types for navigation system
// This file provides comprehensive type definitions for the navigation queue, guards, and state management

import { NavigationState, NavigationAction } from '@react-navigation/native';
import { RootStackParamList, BottomTabNavigatorParamList, HomeTabStackParamList, SearchTabStackParamList, ProfileTabStackParamList, DonationsStackParamList, AdminStackParamList } from '../globals/types';

// Navigation Queue Types
export type NavigationActionType = 'navigate' | 'reset' | 'replace' | 'goBack' | 'setParams';

export interface NavigateAction {
  type: 'navigate';
  routeName: string;
  params?: Record<string, any>;
  key?: string;
}

export interface ResetAction {
  type: 'reset';
  index: number;
  routes: Array<{ name: string; params?: Record<string, any>; key?: string }>;
}

export interface ReplaceAction {
  type: 'replace';
  routeName: string;
  params?: Record<string, any>;
  key?: string;
}

export interface GoBackAction {
  type: 'goBack';
  key?: string;
}

export interface SetParamsAction {
  type: 'setParams';
  params: Record<string, any>;
  key?: string;
}

export type QueuedNavigationAction = NavigateAction | ResetAction | ReplaceAction | GoBackAction | SetParamsAction;

export interface NavigationQueueItem {
  id: string;
  action: QueuedNavigationAction;
  priority: number; // Higher priority = executed first
  timestamp: number;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

// Navigation Guard Types
export type GuardResult = 
  | { allowed: true }
  | { allowed: false; reason: string; redirectTo?: string };

export interface NavigationGuard {
  name: string;
  check: (action: QueuedNavigationAction, context: NavigationGuardContext) => Promise<GuardResult> | GuardResult;
  priority: number; // Higher priority = checked first
}

export interface NavigationGuardContext {
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isAdmin: boolean;
  currentRoute?: string;
  navigationState?: NavigationState;
  mode?: 'site' | 'app';
}

// Navigation State Validator Types
export interface NavigationStateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NavigationStateVersion {
  major: number;
  minor: number;
  patch: number;
}

export const CURRENT_NAVIGATION_STATE_VERSION: NavigationStateVersion = {
  major: 1,
  minor: 0,
  patch: 0,
};

// Route definitions for validation
export const VALID_ROOT_ROUTES: string[] = [
  'HomeStack',
  'LoginScreen',
  'LandingSiteScreen',
  'WebViewScreen',
  'PostsReelsScreen',
  'BookmarksScreen',
  'UserProfileScreen',
  'FollowersScreen',
  'DiscoverPeopleScreen',
  'SettingsScreen',
  'ChatListScreen',
  'NewChatScreen',
  'ChatDetailScreen',
  'NotificationsScreen',
  'AboutKarmaCommunityScreen',
  'OrgOnboardingScreen',
  'AdminOrgApprovalsScreen',
  'OrgDashboardScreen',
  'EditProfileScreen',
  'InactiveScreen',
];

export const VALID_BOTTOM_TAB_ROUTES: string[] = [
  'HomeScreen',
  'SearchTab',
  'DonationsTab',
  'ProfileScreen',
  'AdminTab',
];

export const VALID_HOME_TAB_STACK_ROUTES: string[] = [
  'HomeMain',
  'LandingSiteScreen',
  'ChatListScreen',
  'ChatDetailScreen',
  'NewChatScreen',
  'NotificationsScreen',
  'AboutKarmaCommunityScreen',
  'SettingsScreen',
  'BookmarksScreen',
  'UserProfileScreen',
  'FollowersScreen',
  'DiscoverPeopleScreen',
  'PostsReelsScreen',
  'WebViewScreen',
];

export const VALID_SEARCH_TAB_STACK_ROUTES: string[] = [
  'SearchScreen',
  'UserProfileScreen',
  'FollowersScreen',
  'DiscoverPeopleScreen',
  'ChatListScreen',
  'ChatDetailScreen',
  'NewChatScreen',
  'NotificationsScreen',
  'AboutKarmaCommunityScreen',
  'SettingsScreen',
];

export const VALID_PROFILE_TAB_STACK_ROUTES: string[] = [
  'ProfileScreen',
  'SettingsScreen',
  'ChatListScreen',
  'ChatDetailScreen',
  'NewChatScreen',
  'NotificationsScreen',
  'AboutKarmaCommunityScreen',
  'DiscoverPeopleScreen',
  'EditProfileScreen',
];

export const VALID_DONATIONS_STACK_ROUTES: string[] = [
  'DonationsScreen',
  'MyChallengesScreen',
  'CommunityChallengesScreen',
  'ChallengeDetailsScreen',
  'ChallengeStatisticsScreen',
  'MyCreatedChallengesScreen',
  'MoneyScreen',
  'ItemsScreen',
  'TimeScreen',
  'KnowledgeScreen',
  'TrumpScreen',
  'CategoryScreen',
  'DreamsScreen',
  'FertilityScreen',
  'JobsScreen',
  'MatchmakingScreen',
  'MentalHealthScreen',
  'GoldenAgeScreen',
  'LanguagesScreen',
  'FoodScreen',
  'ClothesScreen',
  'BooksScreen',
  'FurnitureScreen',
  'MedicalScreen',
  'AnimalsScreen',
  'HousingScreen',
  'SupportScreen',
  'EducationScreen',
  'EnvironmentScreen',
  'TechnologyScreen',
  'MusicScreen',
  'GamesScreen',
  'RiddlesScreen',
  'RecipesScreen',
  'PlantsScreen',
  'WasteScreen',
  'ArtScreen',
  'SportsScreen',
  'ChatListScreen',
  'ChatDetailScreen',
  'NewChatScreen',
  'NotificationsScreen',
  'AboutKarmaCommunityScreen',
  'SettingsScreen',
  'DiscoverPeopleScreen',
];

export const VALID_ADMIN_STACK_ROUTES: string[] = [
  'AdminDashboard',
  'AdminMoney',
  'AdminPeople',
  'AdminReview',
  'AdminTasks',
  'AdminTimeManagement',
  'SettingsScreen',
  'ChatListScreen',
  'ChatDetailScreen',
  'NewChatScreen',
  'NotificationsScreen',
  'AboutKarmaCommunityScreen',
];

// Combined route map for quick lookup
export const VALID_ROUTES_MAP: Record<string, string[]> = {
  RootStack: VALID_ROOT_ROUTES,
  BottomTab: VALID_BOTTOM_TAB_ROUTES,
  HomeTabStack: VALID_HOME_TAB_STACK_ROUTES,
  SearchTabStack: VALID_SEARCH_TAB_STACK_ROUTES,
  ProfileTabStack: VALID_PROFILE_TAB_STACK_ROUTES,
  DonationsStack: VALID_DONATIONS_STACK_ROUTES,
  AdminStack: VALID_ADMIN_STACK_ROUTES,
};

// Navigation params types for common routes
export interface CommonNavigationParams {
  hideTopBar?: boolean;
  hideBottomBar?: boolean;
  showPosts?: boolean;
}

// Type helpers
export type AllRouteNames = 
  | keyof RootStackParamList
  | keyof BottomTabNavigatorParamList
  | keyof HomeTabStackParamList
  | keyof SearchTabStackParamList
  | keyof ProfileTabStackParamList
  | keyof DonationsStackParamList
  | keyof AdminStackParamList;








