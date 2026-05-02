> **SRS shard:** `SRS/04-frontend-architecture.md` — part of [SRS index](README.md). References § refer to the full document.

## 4. Frontend Architecture

### 4.1 Framework and Libraries

- **Framework:** React Native with Expo SDK
- **Web support:** Expo for Web (metro bundler)
- **Navigation:** `@react-navigation/native` + `@react-navigation/stack` + `@react-navigation/bottom-tabs`
  - Expo Router exists but is **deprecated** (returns null) — kept to avoid import errors
- **State management:** Zustand (3 stores)
- **HTTP client:** Axios (via `apiService`)
- **Auth:** Firebase Auth + Google OAuth (`expo-auth-session`)
- **Animations:** `react-native-reanimated`, `@shopify/react-native-skia`
- **Charts:** `react-native-chart-kit`
- **i18n:** `i18next` + `react-i18next` (Hebrew default, English fallback)
- **Storage:** `@react-native-async-storage/async-storage`, `expo-secure-store`
- **Other:** `expo-notifications`, `expo-image-picker`, `expo-location`, `expo-haptics`, `expo-document-picker`, `expo-file-system`

### 4.2 Component Structure

```
apps/mobile/
├── App.tsx # Root shell (ErrorBoundary, Navigation, StatusBar)
├── app/ # Expo Router (deprecated, returns null)
│ ├── _layout.tsx
│ ├── i18n.ts # i18next initialization
│ └── oauthredirect.tsx # OAuth callback handler
├── navigations/ # React Navigation configuration
│ ├── MainNavigator.tsx # Root stack (auth/unauth routing)
│ ├── BottomNavigator.tsx # Tab bar (Home, Search, Donations, Profile, Admin)
│ ├── HomeTabStack.tsx # Home tab nested screens
│ ├── SearchTabStack.tsx # Search tab nested screens
│ ├── ProfileTabStack.tsx # Profile tab nested screens
│ ├── DonationsStack.tsx # Donations tab (30+ category screens + Shiduchim Tov)
│ ├── AdminStack.tsx # Admin tab nested screens
│ └── TopBarNavigator.tsx # Shared top bar (settings, notifications, chat)
├── screens/ # 63+ screen components
├── donationScreens/ # 33+ donation category screens
├── bottomBarScreens/ # Tab bar root screens
├── topBarScreens/ # Shared top bar screens
├── components/ # 73+ reusable UI components
├── stores/ # Zustand stores
├── context/ # React Context (legacy, parallel to stores)
├── hooks/ # Custom React hooks
├── globals/ # Design tokens, constants, types
├── locales/ # i18n translations (en/ + he/)
├── google_auth/ # Google OAuth implementation
├── src/ # Services and infrastructure
│ ├── api/api.service.ts # Central API client
│ ├── services/ # Domain services
│ ├── infrastructure/ # Config, database, storage
│ └── utils/ # Helpers and validators
└── utils/ # Adapters, Firebase client, linking config
```

### 4.3 State Management

**Zustand stores (primary):**

| | File | Responsibilities |
|-------|------|------------------|
| `userStore` | `stores/userStore.ts` | User session, authentication state, guest mode, Firebase auth listener, JWT storage (AsyncStorage), role management |
| `webModeStore` | `stores/webModeStore.ts` | Web `site` vs `app` mode toggle, persisted to `localStorage` (key: `kc_web_mode`) |
| `appLoadingStore` | `stores/appLoadingStore.ts` | Feature-level loading states, errors, `markAppReady` |

**Legacy Context providers (parallel to stores, not actively wrapped in App.tsx):**
- `WebModeContext` — same semantics as `webModeStore`
- `AppLoadingContext` — reducer-based loading (parallel to `appLoadingStore`)

### 4.4 Routing / Navigation

**Authentication-based routing:**

```
MainNavigator (Stack)
├── Authenticated / Guest Mode:
│   ├── HomeStack → BottomNavigator (Tabs)
│   │   ├── HomeScreen (HomeTabStack)
│   │   │   ├── HomeMain (Feed)
│   │   │   ├── LandingSiteScreen (authenticated marketing / site content — **Home tab only**; deep link `about-site/app`; use `navigateToAuthenticatedLandingSite` from other tabs)
│   │   │   ├── CommunityStatsScreen
│   │   │   ├── PostsReelsScreen (transparent modal)
│   │   │   └── ... shared screens
│   │   ├── SearchScreen (SearchTabStack)
│   │   ├── DonationsScreen (DonationsStack)
│   │   │   ├── ItemsScreen, TrumpScreen
│   │   │   ├── CommunityChallengesScreen; ChallengeDetailsScreen, ChallengeStatisticsScreen; MyChallengesScreen, MyCreatedChallengesScreen
│   │   │   ├── Additional `donationScreens/*` files exist in the repo but are not registered on this stack (see tech-debt-log)
│   │   │   ├── MatchmakingScreen (existing — romantic/singles, see §2.3.3)
│   │   │   ├── ShiduchimTovScreen (NEW — Good Matching entry, see §2.15)
│   │   │   │   ├── [non-operator] ExplainerView
│   │   │   │   └── [operator] OperatorWorkspace
│   │   │   │       ├── OperatorQueueScreen
│   │   │   │       ├── OperatorCaseDetailScreen
│   │   │   │       ├── OperatorCaseListScreen
│   │   │   │       └── OperatorAuditScreen
│   │   │   ├── CommunityChallengesScreen
│   │   │   ├── ChallengeDetailsScreen, ChallengeStatisticsScreen
│   │   │   └── MyChallengesScreen, MyCreatedChallengesScreen
│   │   ├── ProfileScreen (ProfileTabStack) [hidden in guest mode]
│   │   └── AdminDashboard (AdminStack) [admin only]
│   │       ├── AdminMoney, AdminPeople, AdminReview
│   │       ├── AdminTasks, AdminCRM, AdminFiles
│   │       └── AdminTimeManagement
│   ├── NewChatScreen, ChatDetailScreen
│   ├── BookmarksScreen, FollowersScreen, DiscoverPeopleScreen
│   ├── UserProfileScreen, EditProfileScreen, SettingsScreen
│   ├── NotificationsScreen, WebViewScreen
│   └── AboutKarmaCommunityScreen
└── Unauthenticated:
    ├── LandingSiteScreen (web + site mode only)
    ├── LoginScreen
    └── OrgOnboardingScreen
```

**New screens required for Shiduchim Tov / Operator Matching (§2.15):**

| Screen | File (proposed) | Guard | Description |
|--------|-----------------|-------|-------------|
| `ShiduchimTovScreen` | `donationScreens/ShiduchimTovScreen.tsx` | Auth required | Entry point — renders ExplainerView or OperatorWorkspace based on `roles` |
| `OperatorQueueScreen` | `screens/operator/OperatorQueueScreen.tsx` | `operator` role | Matching queue list with filters and claim action |
| `OperatorCaseDetailScreen` | `screens/operator/OperatorCaseDetailScreen.tsx` | `operator` role | Case detail with candidate search and propose-match flow |
| `OperatorCaseListScreen` | `screens/operator/OperatorCaseListScreen.tsx` | `operator` role | Operator's assigned cases dashboard |
| `OperatorAuditScreen` | `screens/operator/OperatorAuditScreen.tsx` | `operator` role | Read-only audit log for a case |

**Post creation enhancement:** The existing post-creation flow (verify location in codebase — likely in `PostsReelsScreen` or a modal) SHALL be extended with an `anonymity_level` selector (§2.5.7). This is a UI-only addition (dropdown/segmented control) that maps to the new DTO field.

### 4.5 UI Patterns and Reusable Components

**Design system (`globals/`):**
- `colors.tsx` — semantic color tokens (primary, backgrounds, text, navigation, status)
- `constants.tsx` — `IconSizes`, `FontSizes`, `filterOptions`, `sortOptions`, `LAYOUT_CONSTANTS`
- `responsive.ts` — `vw`, `vh`, `scaleSize`, RTL helpers (`rowDirection`, `biDiTextAlign`)
- `styles.tsx` — shared `StyleSheet` styles

**Key reusable components (73+ total):**
- **Feed:** unified `PostCard` implementations (`ItemFeedCard`, `RideCard`, `TaskFeedCard`), plus `CommunityChallengeFeedCard`, `FeedHeader`, `PostReelItem`, `CommentsModal`, `EditPostModal`, `OptionsModal`, `QuickMessageModal`, `ReportPostModal`
- **Challenges:** `DailyHabitsQuickView`, `EditChallengeModal`, `EditEntryModal`, `HabitsStatsCard`, `HabitsTrackerTable`, `HabitsTrackerCell`, `ViewToggleButtons`
- **Chat:** `ChatListItem`, `ChatMessageBubble`
- **Forms/Input:** `SearchBar`, `FilterSortOptions`, `DatePicker`, `TimePicker`, `TimeInput`, `LocationSearchComp`, `AutocompleteDropdownComp`, `UserSelector`, `LanguageSelector`
- **Profile:** `ProfileOpenTab`, `ProfileClosedTab`, `ProfileTaggedTab`, `ProfileCompletionBanner`, `AdminHierarchyTree`
- **Stats:** `CommunityStatsGrid`, `CommunityStatsPanel`, `StatDetailsModal`, `StatMiniCharts`, `DonationStatsFooter`, `DonationStatsScreen`
- **Auth:** `EmailLoginForm`, `FirebaseGoogleButton`, `OrganizationLoginForm`, `LoginSidePanel`, `GuestModeNotice`
- **Layout:** `ScreenWrapper`, `ScrollContainer`, `HeaderComp`, `MenuComp`, `Toast`, `ErrorBoundary`
- **Visual:** `FloatingBubblesOverlay`, `FloatingBubblesSkia`, `VerticalGridSlider`, `DevEnvironmentBanner`, `WebModeToggleOverlay`
- **Operator (NEW — required):** `OperatorQueueItem`, `CaseStatusTimeline`, `CandidateCard`, `MatchProposalModal`, `AnonymityLevelSelector` (reusable in post creation), `OperatorNoteEditor`

### 4.6 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useFeedData` | Feed data loading and pagination (SHOULD incorporate filter/sort state per §2.5.6 and anonymity-aware filtering per §2.5.7) |
| `usePostDeletion` | Post deletion with confirmation |
| `usePostInteractions` | Like, comment, share interactions |
| `usePostMenu` | Post context menu options |
| `useProfileNavigation` | Navigate to user profiles |
| `useAdminProtection` | Admin route guard |
| `useOperatorProtection` | **NEW (required):** Operator route guard — checks `roles.includes('operator')` and redirects to explainer if not authorized |
| `useUnreadNotificationsCount` | Notification badge count |
| `useScrollPosition` | Scroll position tracking |

### 4.7 Internationalization

- **Engine:** i18next with `react-i18next` bindings
- **Default language:** Hebrew (`he`)
- **Fallback language:** English (`en`)
- **27+ namespaces:** `common`, `home`, `profile`, `donations`, `donationResources`, `discover`, `notifications`, `auth`, `errors`, `buttons`, `labels`, `settings`, `comments`, `search`, `bookmarks`, `trump`, `chat`, `landing`, `quickMessage`, `challenges`, `admin`, `errorBoundary`, `dropdown`, `items`, `newChatScreen`, `rides`, `webOverlay`, **`operator`** (NEW — required for Shiduchim Tov / operator workspace strings)
- **RTL support:** Full RTL via responsive helpers, `I18nManager`, and `biDiTextAlign`
- **Persistence:** Language stored in AsyncStorage (`app_language`)

### 4.8 Responsive layout, orientation, and platform-specific behavior

**Change gate (SHALL):** Any change to a user-facing front-end artifact (screens, shared UI components, or their styles) **SHALL** be verified for layout and usability across:

- **Viewport range:** small phones through large tablets / desktop web (see breakpoints in `globals/responsive.ts`).
- **Orientation:** portrait and landscape where the platform allows rotation (native) or window resize (web).
- **Targets:** `ios`, `android`, and **web** (Expo for Web), using **platform-appropriate** behavior and layout (e.g. safe areas, web max-width, scroll vs fixed chrome).

**Project helpers (SHOULD use; do not re-invent for each feature):**

| Concern | Location / API |
|--------|----------------|
| Breakpoints, scaled sizing, `vw` / `vh` | `globals/responsive.ts` — `BREAKPOINTS`, `getScreenInfo`, `scaleSize`, `vw`, `vh`, `responsiveWidth` |
| Orientation | `getOrientation`, `isPortrait`, `isLandscape` in `globals/responsive.ts` — note: one-off `Dimensions.get('window')` does not subscribe to changes; for **reactive** layout on rotation or browser resize, prefer `useWindowDimensions` from `react-native` (or an equivalent pattern that updates when window dimensions change). |
| Web layout buckets | `isMobileWeb`, `isTabletWeb`, `isDesktopWeb` in `globals/responsive.ts` (web-only; guard with `Platform.OS === 'web'` or `isWeb` where needed). |
| Site vs in-app experience on web | `webModeStore` (`stores/webModeStore.ts`) — when product rules require different chrome or navigation between “site” and “app” modes on web. |
| OS branching | `Platform.OS` from `react-native` (`'ios' \| 'android' \| 'web'`) and helpers `isWeb` / `isIOS` / `isAndroid` from `globals/responsive.ts` when applicable. |
| Layout primitives | Favor flex layouts, `ScrollView` / shared wrappers (e.g. `ScreenWrapper`, `ScrollContainer` per §4.5) over fixed pixel widths except via responsive helpers. |

**Traceability:** Non-functional summary in §3.6; product-specific acceptance still follows functional SRS shards.

---


### 4.9 Unified composer infrastructure (Give / Request)

- `BottomNavigator` now hosts a centered create action in the tab bar and mounts a shared composer modal.
- `postComposerStore` (Zustand) provides a single entrypoint for opening the modal from multiple surfaces.
- Current integrated entrypoints:
  - Bottom centered `+`
  - Receive/search-mode CTA in item category flow
- Composer capabilities:
  - Intent toggle: `give` / `request`
  - Category selection
  - Dynamic field rendering by category (shared fields + category-specific fields)
- Feed UI contract:
  - `FeedItem.intent` is mapped from backend `posts.metadata.intent`
  - Post cards render intent badges/chips for clear request-vs-give differentiation.
