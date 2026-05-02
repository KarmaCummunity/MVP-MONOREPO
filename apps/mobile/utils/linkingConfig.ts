// File overview:
// - Purpose: Deep linking configuration for all app routes
// - Provides: URL routes mapping to navigation screens
// - Used by: NavigationContainer in App.tsx
// - Domain: karma-community-kc.com

import { LinkingOptions, getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import { RootStackParamList } from '../globals/types';
import { mergeOverlayNavigationStateWithHomeStack } from './linkingHomeStackOverlay';
import { useUserStore } from '../stores/userStore';

/**
 * Deep linking configuration for the entire app
 * Maps URL paths to navigation screens with proper parameter handling
 */
export const linking: LinkingOptions<RootStackParamList> = {
  // URL prefixes that the app will respond to (localhost for dev)
  prefixes: [
    'karma-community://',
    'https://karma-community-kc.com',
    'https://www.karma-community-kc.com',
    'https://dev.karma-community-kc.com',
    'http://dev.karma-community-kc.com',
    'http://karma-community-kc.com',
    'http://www.karma-community-kc.com',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:19006',
  ],
  
  // Custom function to handle paths that don't match exactly
  // Redirects paths without mode to include /search
  getStateFromPath: (path: string, options?: any) => {
    const [pathnamePart, queryPartRaw = ''] = path.split('?');
    const queryPart = queryPartRaw.split('#')[0];
    const cleanPath = pathnamePart.split('#')[0];
    const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

    let resolved: ReturnType<typeof defaultGetStateFromPath>;

    // Legacy web URLs: /CommunityChallengesScreen?mode=search|offer
    if (/^\/CommunityChallengesScreen\/?$/i.test(normalized)) {
      const params = new URLSearchParams(queryPart);
      const mode = params.get('mode') === 'offer' ? 'offer' : 'search';
      resolved = defaultGetStateFromPath(
        `/donations/community-challenges/${mode}`,
        options,
      );
    } else {
      // Handle paths without mode - redirect to /search
      const categoryMatch = /^\/donations\/(money|time|knowledge|rides|items)$/.exec(
        normalized,
      );
      if (categoryMatch) {
        const category = categoryMatch[1];
        const pathWithMode = `/donations/${category}/search`;
        resolved = defaultGetStateFromPath(pathWithMode, options);
      } else {
        resolved = defaultGetStateFromPath(path, options);
      }
    }

    const { isAuthenticated, isGuestMode } = useUserStore.getState();
    const allowsHomeStack = isAuthenticated || isGuestMode;
    return mergeOverlayNavigationStateWithHomeStack(resolved, options, allowsHomeStack);
  },
  
  config: {
    screens: {
      // ==================================================================
      // ROOT LEVEL SCREENS (MainNavigator)
      // ==================================================================
      
      // Home Stack - contains BottomNavigator with all tabs
      HomeStack: {
        screens: {
          // Home Tab
          HomeScreen: {
            screens: {
              HomeMain: 'home',
              /** In-app marketing landing (authenticated); unauth site entry remains root `LandingSiteScreen: 'about-site'`. */
              LandingSiteScreen: 'about-site/app',
              /** Same paths as previous root entries — nested here so refresh keeps BottomNavigator visible. */
              SettingsScreen: 'settings',
              NotificationsScreen: 'notifications',
              ChatListScreen: 'chat',
              AboutKarmaCommunityScreen: 'about',
              BookmarksScreen: 'bookmarks',
              DiscoverPeopleScreen: 'discover',
            },
          },
          
          // Search Tab
          SearchTab: {
            screens: {
              SearchScreen: {
                path: 'search',
                parse: {
                  q: (q: string) => decodeURIComponent(q || ''),
                },
              },
            },
          },
          
          // Profile Tab
          // Note: ProfileScreen doesn't have a URL path - it's accessible only via tab navigation
          // User profiles (including own profile) are accessible via /profile/:userId (UserProfileScreen)
          ProfileScreen: {
            screens: {
              // ProfileScreen is accessible via tab navigation only
              // To access a user's profile via URL, use /profile/:userId which goes to UserProfileScreen
            },
          },
          
          // Donations Tab
          DonationsTab: {
            screens: {
              DonationsScreen: 'donations',
              MyChallengesScreen: 'donations/challenges',
              CommunityChallengesScreen: {
                path: 'donations/community-challenges/:mode?',
                parse: {
                  mode: (mode: string | undefined) => {
                    if (!mode || mode === 'undefined' || mode === 'null' || mode === '') {
                      return 'search';
                    }
                    return mode === 'offer' ? 'offer' : 'search';
                  },
                },
              },

              // Donation category screens with mode support (offer/search); default 'search'
              TrumpScreen: {
                path: 'donations/rides/:mode?',
                parse: {
                  mode: (mode: string) => {
                    if (!mode || mode === 'undefined' || mode === 'null' || mode === '') return 'search';
                    return mode === 'offer' ? 'offer' : 'search';
                  },
                },
              },
              ItemsScreen: {
                path: 'donations/items/:mode?',
                parse: {
                  mode: (mode: string) => {
                    if (!mode || mode === 'undefined' || mode === 'null' || mode === '') return 'search';
                    return mode === 'offer' ? 'offer' : 'search';
                  },
                },
              },
            },
          },
          
          // Admin Tab (only visible to admins)
          AdminTab: {
            screens: {
              AdminDashboard: 'admin',
              AdminMoney: 'admin/money',
              AdminTasks: 'admin/tasks',
              AdminPeople: 'admin/people',
              AdminReview: 'admin/review',
            },
          },
        },
      },
      
      // ==================================================================
      // STANDALONE SCREENS (accessible from anywhere in MainNavigator)
      // These screens are defined at the root level of MainNavigator
      // ==================================================================
      
      // User Profile Screen (for viewing other users' profiles)
      // Note: This is accessible from MainNavigator, not from tabs
      UserProfileScreen: {
        path: 'profile/:userId',
        parse: {
          userId: (userId: string) => userId,
          userName: (userName: string) => userName || '',
          userAvatar: (userAvatar: string) => userAvatar || '',
        },
      },
      
      // Followers/Following Screen
      FollowersScreen: {
        path: 'followers/:userId',
        parse: {
          userId: (userId: string) => userId,
          type: (type: string) => type || 'followers',
          title: (title: string) => title || '',
        },
      },
      
      // Chat Detail Screen
      ChatDetailScreen: {
        path: 'chat/:conversationId',
        parse: {
          conversationId: (conversationId: string) => conversationId,
          userName: (userName: string) => userName || '',
          userAvatar: (userAvatar: string) => userAvatar || '',
          otherUserId: (otherUserId: string) => otherUserId || '',
        },
      },
      
      // New Chat Screen
      NewChatScreen: 'chat/new',

      // Notifications / Settings / Chat list / About / Bookmarks / Discover — mapped under HomeStack → HomeScreen → HomeTabStack (see above).
      
      // Edit Profile Screen
      EditProfileScreen: 'profile/edit',
      
      // Org Screens
      AdminOrgApprovalsScreen: 'admin/org-approvals',
      OrgDashboardScreen: 'org/dashboard',
      
      // Web View Screen
      WebViewScreen: {
        path: 'webview',
        parse: {
          url: (url: string) => url || '',
        },
      },
      
      // Posts/Reels Screen
      PostsReelsScreen: 'posts',
      
      // ==================================================================
      // UNAUTHENTICATED SCREENS
      // ==================================================================
      
      // Landing Site Screen (for unauthenticated users in site mode)
      LandingSiteScreen: 'about-site',
      
      // Login Screen
      LoginScreen: 'login',
      
      // Legacy/Inactive Screen
      InactiveScreen: 'inactive',
    },
  },
};

/**
 * Helper function to generate profile URL for a specific user
 * @param userId - The user ID
 * @returns Full URL to the user's profile
 */
export const getProfileUrl = (userId: string): string => {
  return `https://karma-community-kc.com/profile/${userId}`;
};

/**
 * Helper function to generate search URL with query
 * @param query - The search query
 * @returns Full URL to search with the query
 */
export const getSearchUrl = (query: string): string => {
  const encodedQuery = encodeURIComponent(query);
  return `https://karma-community-kc.com/search?q=${encodedQuery}`;
};

/**
 * Helper function to generate chat URL
 * @param conversationId - The conversation ID
 * @returns Full URL to the chat
 */
export const getChatUrl = (conversationId: string): string => {
  return `https://karma-community-kc.com/chat/${conversationId}`;
};

/**
 * Helper function to generate donation category URL
 * @param categoryId - The category ID (e.g., 'money', 'time', 'knowledge', 'rides')
 * @param mode - The mode: 'offer' (מציע) or 'search' (מחפש). Defaults to 'offer'
 * @returns Full URL to the donation category
 */
export const getDonationCategoryUrl = (categoryId: string, mode: 'offer' | 'search' = 'offer'): string => {
  return `https://karma-community-kc.com/donations/${categoryId}/${mode}`;
};
