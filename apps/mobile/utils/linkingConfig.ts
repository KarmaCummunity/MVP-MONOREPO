// File overview:
// - Purpose: Deep linking configuration for all app routes
// - Provides: URL routes mapping to navigation screens
// - Used by: NavigationContainer in App.tsx
// - Domain: karma-community-kc.com

import { LinkingOptions } from '@react-navigation/native';
import { getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import { RootStackParamList } from '../globals/types';

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
    // Remove query string and hash for matching
    const cleanPath = path.split('?')[0].split('#')[0];
    
    // Handle paths without mode - redirect to /search
    const categoryMatch = cleanPath.match(/^\/donations\/(money|time|knowledge|rides|items)$/);
    if (categoryMatch) {
      const category = categoryMatch[1];
      const pathWithMode = `/donations/${category}/search`;
      // Use default getStateFromPath with the modified path
      // Don't pass config in options - it's already in linking.config
      return defaultGetStateFromPath(pathWithMode, options);
    }
    // Use default behavior for other paths
    return defaultGetStateFromPath(path, options);
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
              
              // Main donation categories with mode support (offer/search)
              // 4 main categories: money, time, knowledge, rides (trump), items
              // Default mode is 'search' (מחפש)
              // Paths work with or without mode - if no mode, defaults to 'search'
              MoneyScreen: {
                path: 'donations/money/:mode?',
                parse: {
                  mode: (mode: string) => {
                    // If mode is missing, undefined, null, or 'undefined', default to 'search'
                    if (!mode || mode === 'undefined' || mode === 'null' || mode === '') return 'search';
                    return mode === 'offer' ? 'offer' : 'search';
                  },
                },
              },
              TimeScreen: {
                path: 'donations/time/:mode?',
                parse: {
                  mode: (mode: string) => {
                    if (!mode || mode === 'undefined' || mode === 'null' || mode === '') return 'search';
                    return mode === 'offer' ? 'offer' : 'search';
                  },
                },
              },
              KnowledgeScreen: {
                path: 'donations/knowledge/:mode?',
                parse: {
                  mode: (mode: string) => {
                    if (!mode || mode === 'undefined' || mode === 'null' || mode === '') return 'search';
                    return mode === 'offer' ? 'offer' : 'search';
                  },
                },
              },
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
              
              // Item categories with mode support
              FoodScreen: {
                path: 'donations/food/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              ClothesScreen: {
                path: 'donations/clothes/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              BooksScreen: {
                path: 'donations/books/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              FurnitureScreen: {
                path: 'donations/furniture/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              MedicalScreen: {
                path: 'donations/medical/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              AnimalsScreen: {
                path: 'donations/animals/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              HousingScreen: {
                path: 'donations/housing/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              SupportScreen: {
                path: 'donations/support/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              EducationScreen: {
                path: 'donations/education/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              EnvironmentScreen: {
                path: 'donations/environment/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              TechnologyScreen: {
                path: 'donations/technology/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              MusicScreen: {
                path: 'donations/music/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              GamesScreen: {
                path: 'donations/games/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              RiddlesScreen: {
                path: 'donations/riddles/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              RecipesScreen: {
                path: 'donations/recipes/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              PlantsScreen: {
                path: 'donations/plants/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              WasteScreen: {
                path: 'donations/waste/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              ArtScreen: {
                path: 'donations/art/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              SportsScreen: {
                path: 'donations/sports/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              
              // Special categories with mode support
              DreamsScreen: {
                path: 'donations/dreams/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              FertilityScreen: {
                path: 'donations/fertility/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              JobsScreen: {
                path: 'donations/jobs/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              MatchmakingScreen: {
                path: 'donations/matchmaking/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              MentalHealthScreen: {
                path: 'donations/mental-health/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              GoldenAgeScreen: {
                path: 'donations/golden-age/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              LanguagesScreen: {
                path: 'donations/languages/:mode?',
                parse: {
                  mode: (mode: string) => mode || 'offer',
                },
              },
              CategoryScreen: {
                path: 'donations/category/:categoryId/:mode?',
                parse: {
                  categoryId: (categoryId: string) => categoryId,
                  mode: (mode: string) => mode || 'offer',
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
      
      // Notifications Screen
      NotificationsScreen: 'notifications',
      
      // Settings Screen
      SettingsScreen: 'settings',
      
      // Chat List Screen
      ChatListScreen: 'chat',
      
      // About Screen
      AboutKarmaCommunityScreen: 'about',
      
      // Bookmarks Screen
      BookmarksScreen: 'bookmarks',
      
      // Discover People Screen
      DiscoverPeopleScreen: 'discover',
      
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
      
      // Org Onboarding (part of sign-up flow - accessible from unauthenticated stack)
      OrgOnboardingScreen: 'org/onboarding',
      
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
