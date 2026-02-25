import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  NavigationProp,
  NavigatorScreenParams,
  ParamListBase,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ImageSourcePropType } from "react-native";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  priority: "Low" | "Medium" | "High";
  createdAt: Date;
  category?: string;
  location?: string;
  tags?: string[];
}

export type Filter = "All" | "Pending" | "Completed";
export type SortBy = "createdAt" | "dueDate" | "priority";
export type SortOrder = "asc" | "desc";

// Interface for defining the structure of bubble data
export interface BubbleData {
  id: string;
  size: number;
  x: number;
  y: number;
  value: number | null;
  name: string | null;
  directionX: number;
  directionY: number;
  delay: number;
  isBackground: boolean;
}

export type DonationsStackParamList = {
  DonationsScreen: undefined;
  MoneyScreen: undefined;
  TrumpScreen: undefined;
  KnowledgeScreen: undefined;
  TimeScreen: undefined;
  ItemsScreen: undefined;
  CategoryScreen: undefined;
  CommunityChallengesScreen: { mode?: 'search' | 'offer' } | undefined;
  ChallengeDetailsScreen: { challengeId: string; openEntryForm?: boolean } | undefined;
  ChallengeStatisticsScreen: undefined;
  MyChallengesScreen: undefined;
  MyCreatedChallengesScreen: undefined;
  // Top bar accessible screens that are also used inside the Donations stack
  ChatListScreen: undefined;
  ChatDetailScreen: { chatId?: string } | undefined;
  NewChatScreen: undefined;
  NotificationsScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  LandingSiteScreen: undefined;
  SettingsScreen: undefined;
  DiscoverPeopleScreen: undefined;
  // Category screens
  FoodScreen: undefined;
  ClothesScreen: undefined;
  BooksScreen: undefined;
  FurnitureScreen: undefined;
  MedicalScreen: undefined;
  AnimalsScreen: undefined;
  HousingScreen: undefined;
  SupportScreen: undefined;
  EducationScreen: undefined;
  EnvironmentScreen: undefined;
  TechnologyScreen: undefined;
  MusicScreen: undefined;
  GamesScreen: undefined;
  RiddlesScreen: undefined;
  RecipesScreen: undefined;
  PlantsScreen: undefined;
  WasteScreen: undefined;
  ArtScreen: undefined;
  SportsScreen: undefined;
  DreamsScreen: undefined;
  FertilityScreen: undefined;
  JobsScreen: undefined;
  MatchmakingScreen: undefined;
  MentalHealthScreen: undefined;
  GoldenAgeScreen: undefined;
  LanguagesScreen: undefined;
  UserProfileScreen: { userId: string; userName?: string; characterData?: any } | undefined;
  FollowersScreen: { userId: string; type: 'followers' | 'following'; title: string } | undefined;
};

export type SettingItemType = "navigate" | "toggle" | "button" | "value";

export interface SettingsItemProps {
  title: string;
  description?: string;
  iconName?: string;
  type: SettingItemType;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (newValue: boolean) => void;
  displayValue?: string;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

export interface SectionHeaderItem {
  type: "sectionHeader";
  title?: string;
}

export type SettingsDataItem = SettingsItemProps | SectionHeaderItem;

export interface WhatsAppGroup {
  name: string;
  link: string;
  image: ImageSourcePropType;
}

export interface Filters {
  to: string;
  from: string;
  when: string;
}

export interface TrumpResult {
  id: string;
  name: string;
  from: string;
  to: string;
  date: string;
  time: string;
}

export type ListItem =
  | { type: "form"; key: string }
  | { type: "results-header"; key: string }
  | { type: "result"; key: string; data: TrumpResult }
  | { type: "groups-header"; key: string }
  | { type: "group"; key: string; data: WhatsAppGroup }
  | { type: "thank-you"; key: string };

export interface TrumpScreenProps {
  navigation: NavigationProp<ParamListBase>;
}
// --- Root Stack Navigator (MainNavigator) Parameter List ---
// This lists all the screens directly in your MainNavigator.tsx
export type RootStackParamList = {
  HomeStack: NavigatorScreenParams<BottomTabNavigatorParamList>;
  FirstScreen: undefined;
  LoginScreen: undefined;
  LandingSiteScreen: undefined;
  SettingsScreen: undefined;
  ChatListScreen: undefined;
  NewChatScreen: undefined;
  ChatDetailScreen: {
    conversationId: string;
    userName: string;
    userAvatar: string;
    otherUserId: string;
  };
  NotificationsScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  InactiveScreen: undefined;
  WebViewScreen: undefined;
  PostsReelsScreen: undefined; // ADD THIS LINE - this was probably missing
  BookmarksScreen: undefined;
  UserProfileScreen: {
    userId: string;
    userName: string;
    userAvatar?: string;
  };
  FollowersScreen: {
    userId: string;
    type: 'followers' | 'following';
    title: string;
  };
  DiscoverPeopleScreen: undefined;
  OrgOnboardingScreen: undefined;
  AdminOrgApprovalsScreen: undefined;
  OrgDashboardScreen: undefined;
  EditProfileScreen: undefined;
  AdminDashboard: { viewOnly?: boolean; hideTopBar?: boolean; hideBottomBar?: boolean };
};

// --- Bottom Tab Navigator (BottomNavigator) Parameter List ---
// This lists all the screens within your BottomNavigator.tsx
export type BottomTabNavigatorParamList = {
  DonationsTab: undefined; // Renamed to avoid nested name collision with DonationsStack's DonationsScreen
  HomeScreen: undefined; // This is the HomeScreen with the drag handle
  SearchTab: undefined; // Renamed to avoid nested name collision with SearchTabStack's SearchScreen
  ProfileScreen: undefined;
  AdminTab: undefined; // Admin management tab (only visible to admins)
  SettingsScreen: undefined;
  ChatListScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  NotificationsScreen: undefined;
};

// --- Donations Stack (Example - adjust if you have internal screens) ---
// If DonationsStack is just one screen, you might not need this,
// but if it has multiple internal screens, define its own param list.
// export type DonationsStackParamList = {
//   DonationsMain: undefined;
//   DonationDetails: { itemId: string };
// };

// Define the screens that will appear *inside* your PostsReelsScreen modal
export type PostsReelsStackParamList = {
  PostsReels: undefined; // The content screen you want to show
  SomeOtherContent: undefined; // Example of another screen within the modal
  // Add any other screens that can be displayed inside the PostsReelsScreen modal
};

export type AdminStackParamList = {
  AdminDashboard: { viewOnly?: boolean; hideTopBar?: boolean; hideBottomBar?: boolean } | undefined;
  AdminMoney: undefined;
  AdminTasks: undefined;
  AdminPeople: undefined;
  AdminAdmins: undefined;
  AdminReview: undefined;
  AdminFiles: undefined;
  AdminCRM: undefined;
  AdminTimeManagement: undefined;
  AdminTables: undefined;
  AdminTableRows: {
    tableId: string;
    tableName: string;
  };
  ChatListScreen: undefined;
  ChatDetailScreen: {
    conversationId: string;
    userName: string;
    userAvatar: string;
    otherUserId: string;
  };
  NewChatScreen: undefined;
  SettingsScreen: undefined;
  NotificationsScreen: undefined;
  AboutKarmaCommunityScreen: undefined;
  DiscoverPeopleScreen: undefined;
  LandingSiteScreen: undefined;
};

// --- Helper Types for Navigation Props ---

// For use with `useNavigation()` within screens that are part of the RootStack
export type RootStackNavigationProp<
  RouteName extends keyof RootStackParamList
> = StackNavigationProp<RootStackParamList, RouteName>;

// For use with `useNavigation()` within screens that are part of the BottomTabNavigator
export type BottomTabNavigationPropType<
  RouteName extends keyof BottomTabNavigatorParamList
> = BottomTabNavigationProp<BottomTabNavigatorParamList, RouteName>;

// You might also need a type for the 'route' prop if you're accessing params:
// import { RouteProp } from '@react-navigation/native';
// export type PostsReelsScreenRouteProp = RouteProp<RootStackParamList, 'PostsReelsScreen'>;

// --- Shared app user preview type (lightweight, nullable fields allowed) ---
export interface UserPreview {
  id: string;
  name: string;
  email?: string; // Added for filtering current user by email
  avatar?: string;
  bio?: string;
  karmaPoints?: number;
  completedTasks?: number;
  followersCount?: number;
  roles?: string[];
  isVerified?: boolean;
  isActive?: boolean;
  location?: {
    city: string;
    country: string;
  };
  joinDate?: string;
  interests?: string[];
  parentManagerId?: string | null;
  hierarchyLevel?: number | null; // דרגה בהיררכיה: 0 = מנהל ראשי, 1 = סופר מנהל, 2+ = מנהלים/מתנדבים, null = משתמש רגיל
}

// --- Community Challenges Types ---
export type ChallengeType = 'BOOLEAN' | 'NUMERIC' | 'DURATION';
export type ChallengeFrequency = 'DAILY' | 'WEEKLY' | 'FLEXIBLE';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GoalDirection = 'maximize' | 'minimize' | null;

export interface CommunityChallenge {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  image_url?: string;
  type: ChallengeType;
  frequency: ChallengeFrequency;
  goal_value?: number;
  goal_direction?: GoalDirection;
  deadline?: string;
  difficulty?: ChallengeDifficulty;
  category?: string;
  is_active: boolean;
  participants_count: number;
  created_at: string;
  updated_at: string;
  // Extended fields from JOIN
  creator_name?: string;
  creator_avatar?: string;
  post_id?: string;
  participants?: ChallengeParticipant[];
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  current_streak: number;
  best_streak: number;
  total_entries: number;
  last_entry_date?: string;
  // Extended fields from JOIN
  user_name?: string;
  user_avatar?: string;
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  entry_date: string;
  value: number;
  notes?: string;
  created_at: string;
}

export interface ChallengeStatistics {
  overall: {
    active_challenges: number;
    total_entries: number;
    best_streak_overall: number;
    avg_current_streak: number;
  };
  challenges: Array<ChallengeParticipant & {
    title: string;
    type: ChallengeType;
    frequency: ChallengeFrequency;
    difficulty?: ChallengeDifficulty;
    category?: string;
    goal_value?: number;
    deadline?: string;
  }>;
}

// New types for Daily Habits Tracker
export type EntryStatus = 'success' | 'failed' | 'neutral' | 'empty';

export interface ChallengeEntryWithStatus extends ChallengeEntry {
  status: EntryStatus;
}

export interface DailyTrackerChallenge extends CommunityChallenge {
  participant_data: ChallengeParticipant;
}

export interface DailyTrackerData {
  challenges: DailyTrackerChallenge[];
  entries_by_date: {
    [date: string]: {
      [challengeId: string]: ChallengeEntryWithStatus;
    };
  };
  stats: {
    total_success_rate: number | null;
    total_days_tracked: number;
  };
}

export type ViewMode = 'day' | 'week' | 'month';
